// Minimal Express app for testing (without MongoDB connection in index.js)
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { Strategy as LocalStrategy } from 'passport-local';
import bookRoutes from '../books/bookRoutes.js';
import Book from '../books/Book.js';
import { validateAndTransform } from '../books/validation.js';

const app = express();

app.use(express.json());

// Simple in-memory session for testing
app.use(session({
  secret: 'test-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

app.use(passport.initialize());
app.use(passport.session());

// Mock user store for testing
const users = new Map();

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = users.get(id);
  done(null, user || null);
});

passport.use(new LocalStrategy(
  { usernameField: 'email', passwordField: 'password' },
  async (email, password, done) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    
    // Find user by email
    for (const [id, user] of users) {
      if (user.email === normalizedEmail && user.provider === 'local') {
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (ok) return done(null, user);
        return done(null, false, { message: 'Invalid credentials' });
      }
    }
    return done(null, false, { message: 'Invalid credentials' });
  }
));

// Auth middleware
function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// Health endpoint
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Me endpoint
app.get('/api/me', (req, res) => {
  if (!req.user) return res.status(401).json({ user: null });
  res.json({ user: req.user });
});

// Logout
app.post('/auth/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => res.json({ ok: true }));
  });
});

// Register
app.post('/auth/local/register', async (req, res) => {
  try {
    const { email, password, name } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalized = String(email).toLowerCase().trim();
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check existing
    for (const [id, user] of users) {
      if (user.email === normalized) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = {
      id: `user_${Date.now()}`,
      provider: 'local',
      providerId: `local:${normalized}`,
      email: normalized,
      name: name?.trim() || null,
      passwordHash
    };
    
    users.set(user.id, user);

    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Login after register failed' });
      res.status(201).json({ user: { id: user.id, email: user.email, name: user.name } });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/auth/local/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: 'Internal authentication error' });
    }
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }
    req.logIn(user, (err2) => {
      if (err2) {
        return res.status(500).json({ error: 'Session creation failed' });
      }
      return res.json({ user: { id: user.id, email: user.email, name: user.name } });
    });
  })(req, res, next);
});

// Books routes (protected)
app.use('/api/books', requireAuth, bookRoutes);

// Import books endpoint - imports into user's personal list
app.post('/api/books/import', requireAuth, async (req, res, next) => {
  try {
    const { docs } = req.body ?? {};
    if (!docs || !Array.isArray(docs)) {
      return res.status(400).json({ error: 'docs array is required' });
    }
    
    const userId = req.user.id;
    const books = validateAndTransform(docs);
    
    for (const b of books) {
      await Book.updateOne(
        { ol_key: b.ol_key, userId },
        { $set: { ...b, userId } },
        { upsert: true }
      );
    }
    
    res.status(201).json({ imported: books.length });
  } catch (err) {
    next(err);
  }
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal error' });
});

// Export for testing
export { app, users };




