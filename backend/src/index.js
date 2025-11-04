import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import passport from 'passport';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import prismaPkg from '@prisma/client';
const { PrismaClient } = prismaPkg;
//import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import './passport.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const SQLiteStore = SQLiteStoreFactory(session);

const {
  PORT = process.env.PORT || 4000,
  SESSION_SECRET,
  NODE_ENV = 'development',
} = process.env;

const prod = NODE_ENV === 'production';

app.use(morgan(prod ? 'combined' : 'dev'));
app.use(express.json());

// Same-origin deployment => no CORS needed
app.set('trust proxy', 1);

app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './' }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',     // same-origin is fine
    secure: prod,        // true on Azure (HTTPS)
  }
}));

app.use(passport.initialize());
app.use(passport.session());

/* -------- Health & Me -------- */
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/me', (req, res) => {
  if (!req.user) return res.status(401).json({ user: null });
  res.json({ user: req.user });
});
app.post('/auth/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => res.json({ ok: true }));
  });
});

/* -------- Local: Register -------- */
app.post('/auth/local/register', async (req, res) => {
  try {
    const { email, password, name } = req.body ?? {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const normalized = String(email).toLowerCase().trim();
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const existing = await prisma.user.findFirst({ where: { email: normalized } });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        provider: 'local',
        providerId: `local:${normalized}`,
        email: normalized,
        name: name?.trim() || null,
        passwordHash
      }
    });

    // Auto-login after registration
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Login after register failed' });
      res.status(201).json({ user });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/* -------- Local: Login (custom callback for clean 401s) -------- */
app.post('/auth/local/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal authentication error' });
    }
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }
    req.logIn(user, (err2) => {
      if (err2) {
        console.error('req.logIn error:', err2);
        return res.status(500).json({ error: 'Session creation failed' });
      }
      return res.json({ user });
    });
  })(req, res, next);
});

/* -------- Google (same-origin redirects) -------- */
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=google' }),
  (_req, res) => res.redirect('/')
);

/* -------- Error handler -------- */
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal error' });
});

/* --------- Static serving (React build) ---------- */
// Serve from backend/public
const clientDist = path.join(__dirname, '..', 'public');
console.log('Static path:', clientDist, 'exists:', fs.existsSync(path.join(clientDist, 'index.html')));

if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  // Express 5 compatible SPA fallback (no "*")
  app.get(/^(?!\/api|\/auth).*/, (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  console.warn('⚠️ No frontend build found in', clientDist);
}

// SPA fallback: send index.html for any non-API/auth GET route
app.get(/^(?!\/api|\/auth).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
