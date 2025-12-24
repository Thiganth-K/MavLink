# STARS — Sona Training Attendance & Recording System

STARS (Sona Training Attendance & Recording System) is a full-stack MERN application (MongoDB, Express, React, Node.js) designed to manage student records, attendance, marks and reporting for training programs. The repo contains a RESTful backend and a React + Vite frontend with role-based UIs for Admin, SuperAdmin and Guest users.

**Key features (expanded):**
- **Multi-role access**
  - Role-specific UIs: Admins, SuperAdmins and Guests see tailored pages and controls to match their permissions.
  - Route protection: Backend middleware enforces role-based access for sensitive routes (e.g., mark entry, backups).
  - Delegation & auditing: SuperAdmin can add/edit admins and review admin activity logs.

- **Batch & student management**
  - Full CRUD: Create, edit and remove batches and students from the admin UI with server-side validation.
  - Bulk operations: Import students, add/remove many students at once, and move students between batches safely.
  - Student view: Per-batch rosters with search, sorting and quick access to marks and attendance history.

- **Attendance**
  - Daily marking: Mark Present / Absent / On-Duty for every student with date-based grouping.
  - Aggregation & percentage: Attendance percentage auto-calculated per student and available in list and student detail views.
  - Export & reporting: Export attendance for selected date ranges or batches to Excel/CSV for record-keeping.

- **Marks tracking**
  - Multiple categories: Track Effort, Presentation, Assessment and Assignment per student and per batch.
  - Bulk mark entry: Marksheet-style page to apply marks to many students at once or edit individual entries.
  - Score calculation: Totals and derived rankings updated automatically and exposed via API for the frontend.

- **Leaderboard & analytics**
  - Ranking: Leaderboard sorted by total marks with attendance percentage used as tie-breaker.
  - Highlights: Top performers receive trophy indicators; filters let you view by batch or time window.
  - Analytics cards: Aggregate stats (averages, participation rates) help track cohort performance trends.

- **Admin logs & time restrictions**
  - Audit trails: Login and logout logs are stored per admin for supervision and compliance.
  - Time windows: Optional restrictions allow SuperAdmin to limit when admins can mark attendance or submit marks.
  - Admin controls: SuperAdmin can view/clear logs and configure time restrictions from the admin panel.

- **Backup & restore**
  - On-demand backups: SuperAdmin can create backups of key collections or export data snapshots.
  - Selective restore: Restore specific datasets or snapshots rather than full DB rollbacks.
  - Backup scripts: Useful utilities live under `backend/src/scripts/` for exports and maintenance.

- **Exporting & reports**
  - Excel/CSV exports: Attendance, marks and placement records are exportable with configurable columns.
  - Filtered exports: Choose date ranges, batches or student groups before exporting.
  - Download endpoints: API routes provide download tokens/URLs for secure export delivery.

## Tech Stack
- **Frontend:** React, TypeScript, Tailwind CSS, Vite, Axios
- **Backend:** Node.js, Express, Mongoose (MongoDB)
- **Database:** MongoDB Atlas

## Repo layout
- **backend/** — Express API, models, controllers, routes and utility scripts
- **frontend/** — React app, components, pages, services and assets

Example important files:
- [backend/src/server.js](backend/src/server.js)
- [frontend/src/App.tsx](frontend/src/App.tsx)

## Getting started

### Development
1. Clone the repository:

   ```bash
   git clone <your-repo-url>
   cd MavLink
   ```

2. Install dependencies (installs both frontend and backend):

   ```bash
   npm install
   ```

3. Configure environment:

   - Create `backend/.env` with:

     ```
     MONGO_URI=your_mongo_connection_string
     PORT=5001
     ```

   - Copy `frontend/.env.development.example` to `frontend/.env` and update as needed.

4. Start development servers (runs both backend and frontend):

   ```bash
   npm run dev
   ```

   - Backend runs on `http://localhost:5001`
   - Frontend runs on `http://localhost:5173`

### Production
1. Build the application:

   ```bash
   npm run build
   ```

2. Configure production environment:

   - Update `backend/.env` with production MongoDB URI and settings:

     ```
     MONGO_URI=your_production_mongo
     PORT=5001
     NODE_ENV=production
     ```

3. Start the production server:

   ```bash
   npm run start
   ```

       - The application runs on `http://localhost:5001`

## Important environment variables
- `backend/.env`:
  - `MONGO_URI` — required (MongoDB connection string)
  - `PORT` — optional (defaults to 5001)
  - `NODE_ENV` — `development` or `production`

- `frontend/.env` (copy from examples):
  - `VITE_API_BASE` — set to the backend URL (e.g., `http://localhost:5001`)

## Scripts

All commands run from the project root:

- **Development:**
  - `npm install` — install dependencies for both frontend and backend
  - `npm run dev` — start development servers for both backend and frontend

- **Production:**
  - `npm run build` — build the application for production
  - `npm run start` — start the production server

## Troubleshooting
- If you get CORS or network errors, confirm `VITE_API_BASE` (frontend) points to the backend and the backend `PORT` is exposed.
- Check backend logs (`backend/src`) for middleware auth or DB connection errors.
- For backup/restore issues, inspect the scripts in `backend/src/scripts/` for expected arguments and DB collection names.

## Contributing
- Fork or branch the repo, implement changes, and open a pull request against `main`.
- Follow existing conventions and run linters/tests where applicable.

