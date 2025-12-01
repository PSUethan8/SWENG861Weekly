# Weekly Assignment Project

Full-stack reference application for SWENG861 that demonstrates a secure reading-list service. The backend exposes an Express 5 API with local + Google authentication, a Prisma/SQLite user store, and a MongoDB-powered books catalog that can import titles from the Open Library API. The frontend is a Vite-powered React 19 SPA that handles login/registration, book CRUD, and Open Library imports against the backend.

## Repository layout

- `backend/` – Express API, Passport authentication, Prisma schema, Mongoose book models, Jest/Supertest suites.
- `frontend/` – React SPA built with Vite, React Testing Library suites, Axios client configured to proxy API calls during development.

## Prerequisites

- Node.js 20+ and npm 10+.
- A running MongoDB instance (local `mongodb://localhost:27017` is fine).
- Google OAuth 2.0 credentials (optional locally, required for testing Google login).
- Git, and (optionally) SQLite tooling if you want to inspect the `prisma/dev.db` file.

## Backend setup

1. `cd backend`
2. Create `.env` (or use any env injection mechanism) with the required settings:

   ```env
   PORT=4000
   SESSION_SECRET=replace-me
   DATABASE_URL="file:./dev.db"
   MONGODB_URI="mongodb://localhost:27017/bookapi"
   FRONTEND_BASE_URL=http://localhost:5173
   BACKEND_BASE_URL=http://localhost:4000
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   SESSION_DIR=./sessions        # optional, defaults to /home/site/data
   ```

3. Install dependencies: `npm install`
4. Apply/generate the Prisma client: `npx prisma migrate deploy` (or `npx prisma db push` for a quick dev sync).  
   > A fresh SQLite database is already seeded by the migrations, but running the command ensures your local client stays in sync.
5. Start the API: `node src/index.js` (keep this terminal running). The server listens on `PORT` and serves both API routes (`/api`, `/auth`) and, in production, the compiled frontend from `backend/public/`.

## Frontend setup

1. Open a second terminal and `cd frontend`
2. Install dependencies: `npm install`
3. Start the Vite dev server: `npm run dev`
   - By default Vite serves on <http://localhost:5173>.
   - The dev server proxies `/api` and `/auth` requests to `http://localhost:4000`, so ensure the backend is running first.
4. (Optional) Build for production: `npm run build`. The compiled assets are written to `backend/public/`, matching the Express static directory.

## Testing

- **Backend:** `cd backend && npm test` (runs Jest + Supertest against the in-memory MongoDB).  
  Use `npm run test:coverage` for coverage reports under `backend/coverage/`.
- **Frontend:** `cd frontend && npm test` (runs React Testing Library in Jest).  
  Coverage is available via `npm run test:coverage` under `frontend/coverage/`.

## Running the full stack locally

1. Ensure MongoDB is running and your `.env` points to it.
2. Start the backend (`node src/index.js`).
3. Start the frontend (`npm run dev` inside `frontend/`).
4. Visit <http://localhost:5173>. Log in with email/password or Google (if credentials are configured) and start managing your reading list.

## Troubleshooting tips

- If authentication fails locally, double-check `SESSION_SECRET`, `BACKEND_BASE_URL`, and `FRONTEND_BASE_URL`.
- Vite’s proxy only runs in dev mode; after `npm run build`, serve the backend only—Express will host the compiled SPA from `backend/public/`.
- Re-run `npx prisma migrate deploy` whenever the Prisma schema changes to stay aligned with the SQLite file.

