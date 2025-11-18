````markdown
# Social Login + Books API

This project is a full-stack app that combines:

- **Local + Google login** (users + sessions in SQLite via Prisma and connect-sqlite3)
- A **Books API** (MongoDB / Atlas via Mongoose) with full CRUD
- A **React** frontend that:
  - Handles login/registration
  - Lets authenticated users manage books

---

## High-Level Structure

```text
frontend/
  package.json
  vite.config.js
  src/
    App.jsx

backend/
  package.json
  prisma/
    schema.prisma
  src/
    index.js
    passport.js
    books/
      Book.js
      bookRoutes.js
      openLibraryService.js
      validation.js
      importBooks.js
````

---

## Frontend

### `frontend/package.json`

**Primary role:** Defines the frontend project and tooling.

* Declares dependencies like `react`, `react-dom`, `axios`.
* Scripts:

  * `dev` – run Vite dev server.
  * `build` – build production bundle.
  * `preview` – preview local production build.

---

### `frontend/vite.config.js`

**Primary role:** Vite config for dev + production.

* Uses React plugin.
* **Dev proxy**:

  * Proxies `/api` and `/auth` to `http://localhost:4000` so the frontend can call the backend without CORS issues.
* **Build output**:

  * Builds the React app into `../backend/public` so Express can serve the static files in production.

---

### `frontend/src/App.jsx`

**Primary role:** All main UI components and frontend logic.

#### Components & main functions

* **`App` (default export)**
  Top-level component that decides whether to show the login screen or the books dashboard.

  State:

  * `user`, `loading`, `err` – auth state.
  * `email`, `password`, `name` – login/registration form values.

  Important functions:

  * `fetchUser()`

    * `GET /api/me` to check if the user is logged in (runs on mount).
  * `register(e)`

    * Submits `{ email, password, name }` to `POST /auth/local/register`.
  * `login(e)`

    * Submits `{ email, password }` to `POST /auth/local/login`.
  * `logout()`

    * Calls `POST /auth/logout`, then clears `user`.
  * `loginGoogle()`

    * Redirects browser to `/auth/google` to start Google OAuth.

  Render logic:

  * If `loading` → shows a loading card.
  * If `user === null` → shows **Login UI**.
  * If `user` exists → shows `<BooksPage user={user} onLogout={logout} />`.

* **`BooksPage({ user, onLogout })`**
  Authenticated home page where the user manages books.

  State:

  * `books`, `loadingBooks`, `error`.
  * `editingId` – which book is being edited, or `null`.
  * `form` – fields for `ol_key`, `title`, `author`, `first_publish_year`, `isbn`.

  Important functions:

  * `loadBooks()`

    * `GET /api/books` to load all books.
  * `handleSubmit(e)`

    * If `editingId` is set → `PUT /api/books/:id`.
    * Else → `POST /api/books`.
    * Uses `form` values, including `ol_key` and `title` as required fields.
  * `handleEdit(book)`

    * Fills `form` with a book’s data and sets `editingId`.
  * `handleDelete(id)`

    * `DELETE /api/books/:id`, then removes it from local state.
  * `handleImport()`

    * `POST /api/books/import` with a query (e.g. `"javascript"`).
    * Triggers a book import from Open Library via the backend.

  UI:

  * Shows user info (name, email, avatar) and a **Log Out** button.
  * Left side: book form for create/update.
  * Right side: `<BooksList />` with current books.

* **`BooksList({ books, loading, onEdit, onDelete })`**
  Presentation component for the list of books (often memoized).

  * Shows:

    * “Loading…” while `loading` is true.
    * Message if there are no books.
    * Otherwise, a list of book cards with:

      * Title
      * `ol_key` (Open Library key)
      * Author / year / ISBN
      * “Edit” and “Delete” buttons calling `onEdit` / `onDelete`.

---

## Backend

### `backend/package.json`

**Primary role:** Defines the backend Node/Express server.

* Dependencies:

  * `express`, `morgan`, `express-session`, `connect-sqlite3`
  * `passport`, `passport-local`, `passport-google-oauth20`
  * `@prisma/client`, `prisma`, `bcryptjs`
  * `mongoose`, `axios`, `joi`, `swagger-ui-express` (for books API and validation)
* Scripts:

  * `start` – `node ./src/index.js` (server entry point).
  * `postinstall` – runs Prisma client generation.

---

### `backend/prisma/schema.prisma`

**Primary role:** Defines the **User** model and SQLite DB for auth.

* Uses SQLite with `DATABASE_URL` from env.
* `User` model fields (simplified):

  * `id` – primary key.
  * `provider` – e.g. `'local'` or `'google'`.
  * `providerId` – unique external ID like `'google:12345'`.
  * `email`, `name`, `avatarUrl` – optional profile info.
  * `passwordHash` – only for local accounts.
  * `createdAt`, `updatedAt` – timestamps.

Prisma generates a JS client from this, used in auth logic and Passport.

---

### `backend/src/index.js`

**Primary role:** Main Express server setup and route wiring.

Key responsibilities:

* Load env vars (`dotenv/config`).
* Instantiate:

  * `PrismaClient` (for user DB via SQLite).
  * Mongoose connection to `MONGODB_URI` (for books DB in Mongo/Atlas).
* Configure middleware:

  * `morgan('dev')` – request logging.
  * `express.json()` – JSON body parsing.
  * `express-session` + `connect-sqlite3` – server-side sessions stored in SQLite.
  * `passport.initialize()` and `passport.session()` – enable Passport.

Important pieces:

* **`requireAuth(req, res, next)`**

  * Checks `req.isAuthenticated()`.
  * If authenticated → `next()`.
  * If not → responds with `401 Unauthorized`.
  * Used to protect the `/api/books` routes and import endpoint.

* **Auth-related routes:**

  * `GET /api/health` – simple health check.
  * `GET /api/me`

    * Returns currently logged-in user from `req.user` (or 401/`user: null`).
  * `POST /auth/logout`

    * Logs out and destroys the session.
  * `POST /auth/local/register`

    * Validates email/password.
    * Hashes password, creates a user via Prisma, logs them in.
  * `POST /auth/local/login`

    * Uses Passport local strategy to authenticate, returns the user.

* **Google OAuth routes:**

  * `GET /auth/google`

    * Starts Google login flow (Passport Google strategy).
  * `GET /auth/google/callback`

    * Handles Google callback:

      * On failure → redirects to `${FRONTEND_BASE_URL}/?error=google`.
      * On success → redirects to `FRONTEND_BASE_URL` (React app root).

* **Books API mount:**

  * `app.use('/api/books', requireAuth, bookRoutes)`

    * Mounts CRUD routes from `books/bookRoutes.js` behind authentication.
  * `POST /api/books/import`

    * Protected route that calls `importBooksFromOpenLibrary` to import books from Open Library and upsert into Mongo.

* **Static frontend serving (production):**

  * Serves built React files from `../public` (Vite output).
  * For unknown non-`/api` and non-`/auth` routes, sends `index.html` to support SPA routing.

---

### `backend/src/passport.js`

**Primary role:** Configures Passport for local + Google login and session handling.

Key parts:

* **`serializeUser(user, done)`**

  * Stores `user.id` in the session.

* **`deserializeUser(id, done)`**

  * Uses Prisma to look up the full user by id.
  * Attaches user to `req.user`.

* **Local strategy (email/password)**

  * Looks up a user in Prisma with:

    * `provider: 'local'`
    * matching `email`.
  * Compares given password to stored `passwordHash` using bcrypt.
  * On success, logs in the user; otherwise fails.

* **Google strategy**

  * Uses `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `BACKEND_BASE_URL`.
  * On successful Google auth:

    * Finds or creates a user with:

      * `provider: 'google'`
      * `providerId: 'google:<google-id>'`
      * `email`, `name`, `avatarUrl`.
    * Passes user to Passport to store in session.

This file is the core of your authentication mechanism.

---

## Books Module (MongoDB / Mongoose)

### `backend/src/books/Book.js`

**Primary role:** Mongoose model for a Book.

Schema fields (simplified):

* `ol_key` – **required**, unique Open Library key (e.g. `/works/OL82563W`).
* `title` – **required** book title.
* `author` – optional author name.
* `first_publish_year` – optional year.
* `isbn` – optional ISBN.
* Timestamps (created/updated) are included.

Used by all book routes and import logic.

---

### `backend/src/books/bookRoutes.js`

**Primary role:** Express router for Books CRUD.

Mounted at `/api/books` (behind `requireAuth`).

Routes:

* `GET /`

  * Returns all books from Mongo.

* `GET /:id`

  * Returns a single book by its Mongo `_id`.
  * Responds 404 if not found.

* `POST /`

  * Creates a new book using data from `req.body` (including `ol_key` and `title`).

* `PUT /:id`

  * Updates a book by `_id` with fields from `req.body`.

* `DELETE /:id`

  * Deletes a book by `_id`.
  * Responds 204 on success, 404 if not found.

---

### `backend/src/books/openLibraryService.js`

**Primary role:** External API helper for Open Library.

* **`searchBooks(query)`**

  * Makes a GET request to `https://openlibrary.org/search.json?q=<query>`.
  * Returns the JSON response with `docs` used for importing.

---

### `backend/src/books/validation.js`

**Primary role:** Validate and transform raw Open Library results.

* **`validateAndTransform(docs)`**

  * Uses Joi to validate each doc shape.
  * For valid docs, returns an array of clean book objects:

    * `ol_key`, `title`, `author`, `first_publish_year`, `isbn`.
  * This ensures what you write into Mongo matches your `Book` schema.

---

### `backend/src/books/importBooks.js`

**Primary role:** Import books from Open Library into Mongo.

* **`importBooksFromOpenLibrary(query = 'javascript')`**

  * Calls `searchBooks(query)` to fetch raw docs.
  * Cleans them with `validateAndTransform(docs)`.
  * For each cleaned book:

    * Performs `updateOne({ ol_key }, { $set: data }, { upsert: true })` to avoid duplicates.
  * Returns the number of books processed.

Used by the protected route `POST /api/books/import` to seed/populate your books collection.

---

## How Everything Fits Together

1. **User opens the app:**

   * React (`App`) loads and calls `/api/me`.
   * If not logged in → shows login/registration + Google SSO button.
   * If logged in → shows `BooksPage`.

2. **Authentication:**

   * Local creds handled by Passport Local + Prisma.
   * Google login handled by Passport Google, creating/finding a user in Prisma.

3. **Sessions:**

   * express-session + connect-sqlite3 store the session in an SQLite file.
   * `serializeUser` / `deserializeUser` read/write user IDs in the session.

4. **Books CRUD:**

   * Only accessible if authenticated (`requireAuth`).
   * Uses Mongoose models (`Book`) and routes (`bookRoutes`).
   * Frontend calls `/api/books` from `BooksPage` to perform CRUD.

5. **Optional importing:**

   * A button in `BooksPage` calls `/api/books/import`.
   * Backend fetches from Open Library, validates, and upserts books into Mongo.


```
::contentReference[oaicite:0]{index=0}
```
