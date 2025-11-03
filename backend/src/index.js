import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import cors from 'cors';
import passport from 'passport';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import './passport.js';

const app = express();
const prisma = new PrismaClient();
const SQLiteStore = SQLiteStoreFactory(session);

const {
  PORT = 4000,
  CLIENT_URL,
  SESSION_SECRET
} = process.env;

app.use(morgan('dev'));
app.use(express.json());

app.use(cors({ origin: CLIENT_URL, credentials: true }));

app.set('trust proxy', 1);

app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: './' }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax', // in prod across domains: 'none' + secure:true
    secure: false
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

/* -------- Local: Login -------- */
app.post('/auth/local/login',
  passport.authenticate('local'),
  (req, res) => {
    res.json({ user: req.user });
  }
);

/* -------- Google (unchanged) -------- */
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${CLIENT_URL}/login?error=google` }),
  (_req, res) => res.redirect(`${CLIENT_URL}/`)
);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal error' });
});

app.listen(PORT, () => console.log(`Backend on ${PORT}`));
