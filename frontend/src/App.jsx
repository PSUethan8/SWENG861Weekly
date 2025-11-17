// frontend/src/App.jsx
import { useEffect, useState, useCallback, memo } from 'react';
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
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Registration failed');
    }
  };

  const login = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const res = await api.post('/auth/local/login', { email, password });
      setUser(res.data.user);
      setPassword('');
    } catch (e2) {
      setErr(e2?.response?.data?.error || 'Login failed');
    }
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  const loginGoogle = () => {
    window.location.href = '/auth/google';
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card">Loading…</div>
      </div>
    );
  }

  const pageClass = user ? 'page page-app' : 'page page-auth';
  return (

    <div className={pageClass}>
      <main className={user ? 'card card-wide' : 'card'}>
        {!user ? (
          <>
            <h1 className="title">Login</h1>
            <p className="subtitle">Use email/password or continue with Google</p>

            {err && <div className="alert" role="alert">{err}</div>}

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
          <BooksPage user={user} onLogout={logout} />
        )}
      </main>
    </div>
  );
}

/** Logged-in home page: Books CRUD **/
function BooksPage({ user, onLogout }) {
  const [books, setBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    ol_key: '',
    title: '',
    author: '',
    first_publish_year: '',
    isbn: '',
  });

  const loadBooks = useCallback(async () => {
    try {
      setError('');
      setLoadingBooks(true);
      const res = await api.get('/api/books');
      setBooks(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load books');
    } finally {
      setLoadingBooks(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({
      ol_key: '',
      title: '',
      author: '',
      first_publish_year: '',
      isbn: '',
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      ol_key: form.ol_key.trim(),
      title: form.title.trim(),
      author: form.author ? form.author.trim() : undefined,
      first_publish_year: form.first_publish_year
        ? Number(form.first_publish_year)
        : undefined,
      isbn: form.isbn ? form.isbn.trim() : undefined,
    };

    if (!payload.ol_key || !payload.title) {
      setError('OL Key and Title are required');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/api/books/${editingId}`, payload);
      } else {
        await api.post('/api/books', payload);
      }
      resetForm();
      loadBooks();
    } catch (e2) {
      setError(e2?.response?.data?.error || 'Failed to save book');
    }
  };

    const handleEdit = useCallback((book) => {
    setEditingId(book._id);
    setForm({
      ol_key: book.ol_key || '',
      title: book.title || '',
      author: book.author || '',
      first_publish_year: book.first_publish_year || '',
      isbn: book.isbn || '',
    });
  }, []);

  const handleDelete = useCallback(async (id) => {
    setError('');
    try {
      await api.delete(`/api/books/${id}`);
      setBooks((prev) => prev.filter((b) => b._id !== id));
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to delete book');
    }
  }, []);


  const handleImport = async () => {
    setError('');
    try {
      await api.post('/api/books/import', { query: 'javascript' });
      loadBooks();
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to import books');
    }
  };

  return (
    <div className="books-layout">
      <header className="books-header">
        <h1 className="title">Books Home</h1>
        <p className="subtitle">
          Welcome{user?.name ? `, ${user.name}` : ''}! Manage your book list below.
        </p>

        <div className="user-info">
          {user.avatarUrl && (
            <img
              className="avatar"
              src={user.avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
            />
          )}
          <div>
            <div className="user-name">{user.name ?? 'Account'}</div>
            <div className="user-email">{user.email ?? 'No email'}</div>
          </div>
        </div>

        <div className="actions">
          <button onClick={onLogout} className="btn danger">
            Log Out
          </button>
        </div>
      </header>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <section className="books-sections">
        <section className="books-form-card">
          <h2 className="section-title">
            {editingId ? 'Edit Book' : 'Add a Book'}
          </h2>
          <form className="form" onSubmit={handleSubmit}>
            <label className="label">
              <span>Open Library Key (ol_key)</span>
              <input
                className="input"
                name="ol_key"
                value={form.ol_key}
                onChange={handleChange}
                placeholder="/works/OL82563W"
                required
              />
            </label>

            <label className="label">
              <span>Title</span>
              <input
                className="input"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
              />
            </label>

            <label className="label">
              <span>Author</span>
              <input
                className="input"
                name="author"
                value={form.author}
                onChange={handleChange}
              />
            </label>

            <label className="label">
              <span>First Publish Year</span>
              <input
                className="input"
                name="first_publish_year"
                type="number"
                value={form.first_publish_year}
                onChange={handleChange}
              />
            </label>

            <label className="label">
              <span>ISBN</span>
              <input
                className="input"
                name="isbn"
                value={form.isbn}
                onChange={handleChange}
              />
            </label>

            <div className="actions">
              <button className="btn primary" type="submit">
                {editingId ? 'Update Book' : 'Create Book'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={resetForm}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <BooksList
          books={books}
          loading={loadingBooks}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />


      </section>
    </div>
  );
}


const BooksList = memo(function BooksList({ books, loading, onEdit, onDelete }) {
  return (
    <section>
      <h2 className="section-title">Books List</h2>
      {loading ? (
        <p className="info-text">Loading books…</p>
      ) : books.length === 0 ? (
        <p className="info-text">No books yet. Add one above or import some.</p>
      ) : (
        <div className="books-list">
          {books.map((book) => (
            <article key={book._id} className="book-card">
              <div className="book-main">
                <h3 className="book-title">{book.title}</h3>
                <p className="book-meta">
                  {book.ol_key && <span>Key: {book.ol_key}</span>}
                </p>
                <p className="book-meta">
                  {book.author && <span>{book.author}</span>}
                  {book.author && (book.first_publish_year || book.isbn) && ' • '}
                  {book.first_publish_year && (
                    <span>First published: {book.first_publish_year}</span>
                  )}
                  {book.isbn && (
                    <>
                      {book.author || book.first_publish_year ? ' • ' : ''}
                      <span>ISBN: {book.isbn}</span>
                    </>
                  )}
                </p>
              </div>
              <div className="book-actions">
                <button
                  className=".btn secondary small"
                  type="button"
                  onClick={() => onEdit(book)}
                >
                  Edit
                </button>
                <button
                  className="btn danger small"
                  type="button"
                  onClick={() => onDelete(book._id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
});


