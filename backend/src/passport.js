import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

const {
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
  BACKEND_BASE_URL
} = process.env;

passport.serializeUser((user, done) => {
  done(null, user.id); // store user.id in session
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (e) {
    done(e);
  }
});


/* ---------- Local (email/password) ---------- */
passport.use(new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
    session: true
  },
  async (email, password, done) => {
    try {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const pwd = String(password || '');

      if (!normalizedEmail || !pwd) {
        return done(null, false, { message: 'Email and password are required' });
      }

      const user = await prisma.user.findFirst({
        where: { provider: 'local', email: normalizedEmail }
      });

      if (!user || !user.passwordHash) {
        return done(null, false, { message: 'Invalid credentials' });
      }

      const ok = await bcrypt.compare(pwd, user.passwordHash);
      if (!ok) return done(null, false, { message: 'Invalid credentials' });

      return done(null, user);
    } catch (e) {
      console.error('LocalStrategy error:', e);
      return done(e);
    }
  }
));

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
  callbackURL: `${BACKEND_BASE_URL}/auth/google/callback`
}, async (_accessToken, _refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || null;
    const avatarUrl = profile.photos?.[0]?.value || null;
    const existing = await prisma.user.findUnique({
      where: { providerId: `google:${profile.id}` }
    });
    const user = existing ?? await prisma.user.create({
      data: {
        provider: 'google',
        providerId: `google:${profile.id}`,
        email,
        name: profile.displayName || null,
        avatarUrl
      }
    });
    done(null, user);
  } catch (e) {
    done(e);
  }
}));


