# Campus Ticket App

## Tech stack
- Backend: Node.js, Express, PostgreSQL, Socket.io, Nodemailer
- Frontend: React, Vite, Tailwind CSS, Axios, React Router

## Project structure
```
backend/
  server.js           — Express entry point, mounts routes, attaches Socket.io to req.io
  config/db.js        — PostgreSQL pool via DATABASE_URL env var
  routes/
    auth.js           — register, login, forgot/reset password
    tickets.js        — full ticket CRUD + bulk update + history
    notes.js          — add/edit/delete notes on tickets
    admin.js          — user management (list, role change, delete)
  middleware/
    auth.js           — verifyToken, verifyDispatcher, verifyAdmin
    validate.js       — input validation for all routes
  utils/
    email.js          — sendTicketNotification, sendPasswordResetEmail, sendStatusUpdateEmail

frontend/src/
  App.jsx             — routes + ProtectedRoute wrappers
  context/
    AuthContext.jsx   — JWT + user state in localStorage, axios 401 interceptor
    DarkModeContext.jsx
  components/
    Navbar.jsx
    ProtectedRoute.jsx
  pages/
    Login.jsx / Register.jsx / ForgotPassword.jsx / ResetPassword.jsx
    Dashboard.jsx     — student: view own tickets, filter by status + category
    NewTicket.jsx     — student: submit ticket
    Dispatcher.jsx    — dispatcher/admin: all tickets, filters, sort, bulk actions
    TicketDetail.jsx  — any role: view ticket, notes, history timeline
    Admin.jsx         — admin: user management
    AdminReports.jsx  — admin: charts (recharts)
    Profile.jsx       — any role: update name, email, password
```

## User roles & route access
- student — /dashboard, /new-ticket, /ticket, /profile
- dispatcher — /dispatcher, /ticket, /profile
- admin — all of the above + /admin, /admin/reports

## Running locally
- Backend: `cd backend && npm run dev` (port 5000)
- Frontend: `cd frontend && npm run dev` (port 5173)
- Database: PostgreSQL local, db name `test_app`
- API URL is hardcoded as `http://localhost:5000` throughout frontend

## Environment variables (backend .env)
```
DATABASE_URL=postgres://...
JWT_SECRET=...
EMAIL_USER=gmail address
EMAIL_PASS=gmail app password
```

## Test accounts
- Student: test@test.com / password123
- Dispatcher: dispatcher@test.com / password123
- Admin: admin@test.com / password123

## Database tables
- **users** — id, name, email, password (hashed), role, reset_token, reset_token_expiry
- **tickets** — id, title, description, category, priority, status, created_by (FK users), assigned_to (FK users), created_at, updated_at
- **notes** — id, ticket_id, user_id, content, created_at, updated_at
- **ticket_history** — id, ticket_id, changed_by, field, old_value, new_value, changed_at

### Enum values
- category: maintenance, campus_safety, it, cleaning, other
- priority: low, normal, high, urgent
- status: open, in_progress, resolved, closed
- role: student, dispatcher, admin

## API routes summary
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
PUT    /api/auth/profile          — update own name/email/password (verifyToken)

GET    /api/tickets/my-tickets    — student's own tickets (verifyToken)
GET    /api/tickets               — all tickets with submitter+assignee names (verifyDispatcher)
GET    /api/tickets/assignees     — list of dispatchers+admins for assignment (verifyDispatcher)
GET    /api/tickets/:id           — single ticket (verifyToken)
GET    /api/tickets/:id/history   — audit log (verifyToken)
POST   /api/tickets               — create ticket (verifyToken)
PUT    /api/tickets/bulk          — bulk update status/assigned_to (verifyDispatcher)
PUT    /api/tickets/:id           — update status/priority/assigned_to (verifyDispatcher)

GET    /api/notes/:ticketId       — notes for a ticket (verifyToken)
POST   /api/notes/:ticketId       — add note (verifyToken)
PUT    /api/notes/:id             — edit own note (verifyToken)
DELETE /api/notes/:id             — delete own note, admin can delete any (verifyToken)

GET    /api/admin/users           — all users (verifyAdmin)
PUT    /api/admin/users/:id/role  — change role (verifyAdmin)
DELETE /api/admin/users/:id       — delete user (verifyAdmin)
```

## Key patterns & conventions

**Auth:** JWT stored in localStorage. `useAuth()` hook provides `{ user, token, login, logout, updateUser }`. All axios calls pass `Authorization: Bearer ${token}`. A 401 response auto-calls logout and redirects to `/`.

**Real-time:** Socket.io emits `ticket_created` and `ticket_updated` from the backend after mutations. Dispatcher.jsx and any page showing live data should connect to `io('http://localhost:5000')` and listen for these events.

**Audit history:** Every status, priority, or assigned_to change on a ticket inserts a row into `ticket_history`. The bulk update endpoint does the same per ticket. The history tab in TicketDetail renders a collapsible timeline.

**Email notifications:**
- New ticket → admin inbox (sendTicketNotification)
- Status changes to in_progress/resolved/closed → submitter email (sendStatusUpdateEmail)
- Password reset → user email with 1-hour token link (sendPasswordResetEmail)
- Bulk status updates fire emails async (fire-and-forget, won't block the response)

**Middleware order matters:** In tickets.js, `PUT /bulk` must stay above `PUT /:id` so Express doesn't treat "bulk" as an ID.

**Filtering (Dispatcher):** All filtering and sorting is done client-side on the full ticket list fetched at mount. Filters preserved across pagination. Page resets to 1 on any filter change. Socket events update the local list in-place.

**Dark mode:** `useDarkMode()` from DarkModeContext. Tailwind `dark:` classes used throughout. Toggle stored in localStorage.

**Validation:** All input validated in `backend/middleware/validate.js` before hitting DB. Frontend also has basic guards on forms.

## Current status
- Auth with JWT and role based routing complete
- Tickets CRUD with real time Socket.io updates complete
- Email notifications with Nodemailer complete
- Notes system with edit/delete and audit timestamps complete
- Tailwind CSS styling complete
- Password reset flow complete
- Auth context and protected routes complete
- Backend input validation complete
- Loading states complete
- Ticket assignment complete
- Pagination complete
- Real time search complete
- Audit log with collapsible history timeline complete
- Rate limiting on auth endpoints complete
- Student ticket detail view with notes complete
- Email notifications to students on status changes complete
- Student dashboard summary stats (Total, Open, In Progress, Resolved) complete
- Dispatcher dashboard summary stats with filter on click complete
- Profile page for all users (name, email, password update) complete
- Dark mode complete
- Mobile responsiveness complete
- recharts installed for charting (react-is peer dep also installed)
- Dispatcher dashboard filter by assigned user (all / unassigned / specific dispatcher) complete
- Dispatcher dashboard column header click-to-sort for ticket #, date submitted, and priority complete
- Dispatcher dashboard bulk actions (select tickets, bulk status update, bulk assign, confirmation modal) complete
- Backend PUT /api/tickets/bulk endpoint with audit history and socket events complete
- Student dashboard category filter (dropdown filter bar below stat cards) complete
