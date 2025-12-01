# Environment Modes

This project supports two runtime modes: development and production.

Overview
- Development: verbose logging, local MongoDB, frontend runs on Vite dev server.
- Production: NODE_ENV=production, backend serves the built frontend from `frontend/dist`.

How to run (backend)
- Development (from `backend` directory):

```powershell
npm install
npm run dev
```

This runs `nodemon` with `NODE_ENV=development` (script uses `cross-env`).

- Production (from `backend` directory):

```powershell
npm install
npm run start
```

This runs `node src/server.js` with `NODE_ENV=production`.

How to run (frontend)
- Development (from `frontend` directory):

```powershell
npm install
npm run dev
```

- Build for production (from `frontend`):

```powershell
npm run build
```

Before building or starting in production, create the appropriate `.env` files:
- `backend/.env.production` (use `backend/.env.production.example` as a template)
- `frontend/.env.production` (use `frontend/.env.production.example` as a template)

Notes
- Do NOT commit `.env.production` files to source control. Use secret managers for production secrets.
- The backend `server.js` will attempt to load `.env.${NODE_ENV}` first, then fallback to `.env` locations. It supports running from the project root or the `backend` folder.
- The backend will serve `frontend/dist` when `NODE_ENV=production` and the dist folder exists.
