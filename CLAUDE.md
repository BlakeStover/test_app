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
    uploads.js        — POST /api/uploads (multer, jpeg/png/webp, 5MB max); files saved to backend/uploads/
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
    Onboarding.jsx    — student: required profile setup on first login (preferred name, student ID, building, room, phone)
    Settings.jsx      — student: edit campus profile info (same fields as onboarding, pre-populated)
    TicketWizard.jsx  — student: multi-step ticket submission wizard (/submit); all 4 steps + emergency modal + success screen complete
  constants/
    wizardTemplates.js — hardcoded templates per category, category→DB enum map, label maps
    Dispatcher.jsx    — dispatcher/admin: all tickets, filters, sort, bulk actions
    TicketDetail.jsx  — any role: view ticket, notes, history timeline
    Admin.jsx         — admin: user management
    AdminReports.jsx  — admin: charts (recharts)
    Profile.jsx       — any role: update name, email, password
```

## User roles & route access
- student — /dashboard, /new-ticket, /ticket, /profile, /onboarding, /settings
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
- **users** — id, name, email, password (hashed), role, reset_token, reset_token_expiry, profile_complete (bool default false), preferred_name, student_id, building, room_number, phone
- **tickets** — id, title, description, category, priority, status, created_by (FK users), assigned_to (FK users), created_at, updated_at
- **notes** — id, ticket_id, user_id, content, internal (bool default false), created_at, updated_at
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
POST   /api/tickets/:id/cancel    — student cancels own ticket (verifyToken); sets status closed, adds history + note

GET    /api/notes/:ticketId       — notes for a ticket (verifyToken)
POST   /api/notes/:ticketId       — add note (verifyToken)
PUT    /api/notes/:id             — edit own note (verifyToken)
DELETE /api/notes/:id             — delete own note, admin can delete any (verifyToken)

GET    /api/admin/users           — all users (verifyAdmin)
PUT    /api/admin/users/:id/role  — change role (verifyAdmin)
DELETE /api/admin/users/:id       — delete user (verifyAdmin)

GET    /api/buildings             — hardcoded sorted list of campus building names (public)

PATCH  /api/users/profile         — update preferred_name, student_id, building, room_number, phone; sets profile_complete=true (verifyToken)
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
- Phase 1 mobile UX overhaul — Auth & Onboarding complete:
  - users table extended with profile_complete, preferred_name, student_id, building, room_number, phone columns
  - GET /api/buildings returns hardcoded sorted building list
  - PATCH /api/users/profile saves campus profile fields and sets profile_complete=true
  - Login redirects students with profile_complete=false to /onboarding
  - /onboarding page: required full-screen mobile-first form, no skip, redirects to /dashboard on save
  - /settings page: same form pre-populated from AuthContext, accessible from student nav in Dashboard
- Phase 2 student home screen rebuild complete:
  - Dashboard.jsx replaced with mobile-first app-style layout (max-w-lg, no stats cards, no table)
  - Greeting uses preferred_name from AuthContext, falls back to first name
  - Full-width primary "Submit a request" button + ghost "Track my tickets" button (smooth-scrolls to recent)
  - Recent section shows last 5 tickets: title, time-ago string, color-coded status pill
  - Status pill colors: Open = blue, In Progress = amber, Resolved = green, Closed = gray
  - timeAgo() helper formats relative time (just now / Xm / Xh / Xd / date)
  - Removed: stats cards, filter bar, category dropdown, full ticket list
- Phase 3 ticket submission wizard — Steps 8–10 complete:
  - /submit route added (student-only) → TicketWizard.jsx
  - Shared wizard state: { category, template_id, title, description, building, room_number, notes, photo }
  - building and room_number pre-populated from AuthContext user profile
  - 4-dot progress indicator at top of every step (active dot = blue pill, completed = filled blue, future = gray)
  - Back arrow: returns to /dashboard from step 1, steps back otherwise
  - Step 1: category selector — 6 tappable icon rows (Lockout/Access, Maintenance, Electrical, Plumbing, Pest Control, Safety/Emergency)
  - Safety/Emergency row styled red; tapping opens emergency modal instead of advancing wizard
  - Emergency modal: full-screen overlay, red header, campus safety phone number displayed large, "Call now" (tel: link) + "Go back" button
  - CAMPUS_SAFETY_PHONE is a configurable constant at the top of TicketWizard.jsx
  - "Call now" fires a background POST /api/tickets (category: campus_safety, priority: urgent, status: open, title: "Emergency call placed"); fire-and-forget, modal stays open
  - Note: DB enums have no 'emergency' category or 'critical' priority — campus_safety + urgent used as closest values
- Phase 3 ticket submission wizard — Steps 11–14 complete:
  - frontend/src/constants/wizardTemplates.js — hardcoded templates (4 per category), CATEGORY_DB_MAP, CATEGORY_DEFAULT_TITLE, CATEGORY_LABEL exports
  - Step 2 (template picker): tappable rows with radio indicator, highlights selected template; "Or describe it yourself" textarea clears template selection; Next disabled until template or custom text is present
  - Step 3 (location + photo): building dropdown (GET /api/buildings), pre-filled from profile; room number input, pre-filled from profile; optional notes textarea; "Take photo" (capture="environment") and "Upload image" buttons (hidden inputs via refs); thumbnail preview with remove button; "Skip — no photo needed" text link
  - Step 4 (confirm): read-only summary of category, issue title, building, room, notes, photo; "Edit something" returns to Step 1 preserving all state; "Submit request" uploads photo first (POST /api/uploads), then POSTs ticket with location embedded in description + photo_filename
  - Success screen: checkmark, ticket number, "Back to home" primary button, "Track this ticket" ghost button
  - multer installed in backend; POST /api/uploads — saves to backend/uploads/, returns { filename }; jpeg/png/webp only, 5MB max
  - Uploaded files served statically at GET /uploads/:filename
  - tickets POST updated to accept and store photo_filename; requires DB migration: ALTER TABLE tickets ADD COLUMN IF NOT EXISTS photo_filename VARCHAR(255);
  - Category → DB enum mapping: lockout/emergency → campus_safety, maintenance/electrical/plumbing → maintenance, pest → cleaning
  - Dashboard "Submit a request" button now routes to /submit instead of /new-ticket
- Phase 4 student ticket detail overhaul — Steps 15–16 complete:
  - Step 15: TicketDetail.jsx updated — student view is fully read-only (no note edit/delete, status/assignment controls already gated to dispatcher/admin); photo displayed as tappable thumbnail with fullscreen lightbox overlay; status labels humanized (in_progress → "In Progress"); student layout uses max-w-lg, dispatcher uses max-w-4xl
  - Step 16: notes table migration — ALTER TABLE notes ADD COLUMN IF NOT EXISTS internal BOOLEAN NOT NULL DEFAULT false; GET /api/notes/:ticketId filters out internal=true notes for students, dispatchers/admins see all; POST /api/notes/:ticketId accepts internal field, students are always forced to internal=false regardless of payload
  - Student cancel flow: students cannot add notes; "Cancel this request" button shown when status is open/in_progress; confirmation modal ("Are you sure?"); POST /api/tickets/:id/cancel sets status to closed, inserts ticket_history row, inserts a public note "This request was cancelled by the student.", emits socket event; endpoint verifies ticket belongs to requesting user and is not already resolved/closed
