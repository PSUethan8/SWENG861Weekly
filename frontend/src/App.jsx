import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import './App.css';

const api = axios.create({
  //baseURL: import.meta.env.VITE_BACKEND_URL,
  baseURL: '',
  withCredentials: true,
});

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const fetchUser = useCallback(async () => {
    try {
      const res = await api.get('/api/me');
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const register = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const res = await api.post('/auth/local/register', { email, password, name });
      setUser(res.data.user);
      setPassword('');
    } catch (e) {
      setErr(e?.response?.data?.error || 'Registration failed');
    }
  };

  const login = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const res = await api.post('/auth/local/login', { email, password });
      setUser(res.data.user);
      setPassword('');
    } catch (e) {
      setErr(e?.response?.data?.error || 'Login failed');
    }
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  const loginGoogle = () => {
    window.location.href = `${import.meta.env.VITE_BACKEND_URL}/auth/google`;
  };

  if (loading) {
    return <div className="page"><div className="card">Loading…</div></div>;
  }

  return (
    <div className="page">
      <main className="card">
        <h1 className="title">Login</h1>
        <p className="subtitle">Use email/password or continue with Google</p>

        {err && <div className="alert" role="alert">{err}</div>}

        {!user ? (
          <>
            {/* Local account form */}
            <form className="form" onSubmit={login}>
              <label className="label">
                <span>Email</span>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>

              <label className="label">
                <span>Password</span>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  minLength={8}
                />
              </label>

              <div className="actions">
                <button className="btn primary" type="submit">Log In</button>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={register}
                  title="Create a new account"
                >
                  Create Account
                </button>
              </div>
            </form>

            <div className="divider"><span>or</span></div>

            {/* Google SSO */}
            <div className="actions">
              <button onClick={loginGoogle} className="btn primary">
                Continue with Google
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="user-info">
              {user.avatarUrl && <img className="avatar" src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />}
              <div>
                <div className="user-name">{user.name ?? 'Account'}</div>
                <div className="user-email">{user.email ?? 'No email'}</div>
              </div>
            </div>
            <div className="actions">
              <button onClick={logout} className="btn danger">Log Out</button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
