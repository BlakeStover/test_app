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
- **users** — id, name, email, password (hashed), role, reset_token, reset_token_expiry, profile_complete (bool default false), preferred_name, student_id, building, room_number, phone, available (bool default true)
- **tickets** — id, title, description, category, priority, status, created_by (FK users), assigned_to (FK users), created_at, updated_at, photo_filename, rating
- **notes** — id, ticket_id, user_id, content, internal (bool default false), created_at, updated_at
- **ticket_history** — id, ticket_id, changed_by, field, old_value, new_value, changed_at
- **reply_templates** — id, created_by (FK users), title, body, is_shared (bool), created_at

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
GET    /api/users/availability    — get current user's available boolean (verifyToken)
PATCH  /api/users/availability    — set available: true/false (verifyToken)

GET    /api/reply-templates       — own + shared templates with created_by_name (verifyDispatcher)
POST   /api/reply-templates       — create template { title, body, is_shared } (verifyDispatcher)
DELETE /api/reply-templates/:id   — delete own template; admin can delete any (verifyDispatcher)
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
  - tickets POST updated to accept and store photo_filename; DB migration applied: ALTER TABLE tickets ADD COLUMN IF NOT EXISTS photo_filename VARCHAR(255);
  - Category → DB enum mapping: lockout/emergency → campus_safety, maintenance/electrical/plumbing → maintenance, pest → cleaning
  - Dashboard "Submit a request" button now routes to /submit instead of /new-ticket
- Phase 4 student ticket detail overhaul — Steps 15–16 complete:
  - Step 15: TicketDetail.jsx updated — student view is fully read-only (no note edit/delete, status/assignment controls already gated to dispatcher/admin); photo displayed as tappable thumbnail with fullscreen lightbox overlay; status labels humanized (in_progress → "In Progress"); student layout uses max-w-lg, dispatcher uses max-w-4xl
  - Step 16: notes table migration — ALTER TABLE notes ADD COLUMN IF NOT EXISTS internal BOOLEAN NOT NULL DEFAULT false; GET /api/notes/:ticketId filters out internal=true notes for students, dispatchers/admins see all; POST /api/notes/:ticketId accepts internal field, students are always forced to internal=false regardless of payload
  - Student cancel flow: students cannot add notes; "Cancel this request" button shown when status is open/in_progress; confirmation modal ("Are you sure?"); POST /api/tickets/:id/cancel sets status to closed, inserts ticket_history row, inserts a public note "This request was cancelled by the student.", emits socket event; endpoint verifies ticket belongs to requesting user and is not already resolved/closed
- Phase 4 student ticket detail overhaul — Steps 17–18 complete:
  - Step 17: Student notes section reframed as a message thread ("Messages" heading); dispatcher/admin notes appear as left-aligned gray bubbles, student notes as right-aligned blue bubbles; timestamp + author shown below each bubble; student reply textarea at bottom with placeholder "Reply to dispatcher…"; Enter sends (Shift+Enter for newline); Send button disabled when empty; students cannot edit or delete any notes; dispatcher/admin view unchanged (table-style with edit/delete/internal badge)
  - Step 18: Backend (backend/routes/notes.js) triggers sendDispatcherReplyEmail (fire-and-forget) when a dispatcher or admin posts a public (internal=false) note on a ticket; looks up the ticket's student submitter, emails them with subject "A dispatcher replied to your request #[id]", includes the note content in a blockquote, and a direct link to the ticket; sendDispatcherReplyEmail added to backend/utils/email.js
- Bug fixes (post Phase 4):
  - DB migration for photo_filename was never applied — ALTER TABLE tickets ADD COLUMN IF NOT EXISTS photo_filename VARCHAR(255) now run; was causing 500 on every ticket submission
  - TicketWizard.jsx photo upload was manually setting Content-Type: 'multipart/form-data' without the boundary string, breaking multer's ability to parse the file; fixed by removing the manual header and letting axios set it automatically with the correct boundary
- Phase 5 dispatcher notes + student portal UI — Steps 19–21 complete:
  - Step 19: Dispatcher/admin note form in TicketDetail.jsx now has an "Internal note" toggle (custom pill switch) above the textarea; when on, note is submitted with internal: true and placeholder changes to "Internal note (not visible to student)…"; toggle resets to off after submit; internal badge already shown in note list (from Step 16)
  - Step 20: Change history section in TicketDetail.jsx is now wrapped in {isDispatcherOrAdmin && ...} — students can no longer see the change history collapsible at the bottom of the ticket detail page
  - Step 21: Dashboard.jsx "Recent" section removed; "Track my tickets" button now navigates to /my-tickets; new MyTickets.jsx page (student-only, /my-tickets route) shows all tickets split into two collapsible sections — "Active" (open/in_progress) and "Closed" (resolved/closed); each section shows count, defaults open for Active and collapsed for Closed; each ticket row is tappable and links to /ticket?id=...
- Phase 6 student portal trust & visibility — Steps 22–27 complete:
  - Step 22: TicketDetail.jsx connects to Socket.io on mount; listens for ticket_updated (updates ticket state live) and note_added (appends non-internal notes to thread with duplicate guard); backend notes.js emits note_added after every insert
  - Step 23: PushNotificationSetup component added to App.jsx (inside AuthProvider); on first student login requests Notification permission (stored in localStorage as notificationPermissionAsked); connects to Socket.io globally; on note_added event — if non-internal, posted by non-student, and ticket_created_by matches logged-in user — fires a browser Notification with body preview and onclick navigating to the ticket; backend notes.js noteWithAuthor query now joins tickets table to include ticket_created_by in the socket payload
  - Step 24: STUDENT_STATUS_LABELS constant added to frontend/src/constants/wizardTemplates.js: open→"Waiting to be assigned", in_progress→"Someone is on the way", resolved→"Issue closed", closed→"Request closed", cancelled→"Request cancelled"; TicketDetail.jsx statusLabel() uses these for students only (dispatchers/admins still see Open/In Progress/Resolved/Closed); MyTickets.jsx statusPill() uses these labels for all pills
  - Step 25: CATEGORY_SLA constant added at top of TicketDetail.jsx mapping DB category values to plain-language response time strings; shown as muted helper text below the status/priority badges on the student ticket detail view only
  - Step 26: GET /api/tickets/check-duplicate endpoint added to backend (before /:id route) — accepts category + building query params, checks if the student has an open/in_progress ticket with matching category whose description contains the building name; Step4 in TicketWizard.jsx calls this on mount, disables submit while checking ("Checking…"), and if duplicate found shows a yellow warning card with "Yes, submit anyway" / "Go back" buttons; submitting is not blocked, only warned
  - Step 27: ALTER TABLE tickets ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5) runs automatically on server startup (server.js); PATCH /api/tickets/:id/rate endpoint added — validates 1–5, checks ownership, requires resolved status; MyTickets.jsx on load finds the first resolved unrated un-dismissed ticket and shows a bottom sheet rating modal with 5 ★ buttons ("How did we do?") — tapping a star calls the rate endpoint and updates local state; "Skip" stores the ticket ID in localStorage ratingDismissed array; only prompts once per ticket
- Phase 7 dispatcher portal triage & speed — Steps 28–33 complete:
  - Step 28: Triage strip added above the dispatcher ticket table; SLA_HOURS constant defines numeric hour thresholds per category (campus_safety: 0.5h, maintenance: 24h, it/cleaning/other: 48h); buildTriageCards() computes up to one card per active (open/in_progress) ticket that is Emergency (campus_safety category), Overdue (age > SLA threshold), or Unassigned (open + no assignee); cards sorted Emergency > Overdue > Unassigned then oldest-first within tier; horizontally scrollable row with color-coded cards (red = Emergency, orange = Overdue, yellow = Unassigned); each card shows category emoji icon, ticket #, submitter name, and label badge; clicking navigates to /ticket?id=...; strip hidden entirely when no cards qualify
  - Step 29: is_overdue boolean added to GET /api/tickets and GET /api/tickets/:id responses; computed in backend (tickets.js) using SLA_HOURS thresholds per category; active tickets (open/in_progress) past their SLA get is_overdue: true; small red "Overdue" badge shown next to ticket # in dispatcher table rows (both desktop and mobile) and next to status/priority badges at the top of TicketDetail.jsx for dispatcher/admin only
  - Step 30: Quick-action buttons added to each desktop dispatcher table row; row gets Tailwind `group` class; on hover three icon buttons appear (opacity-0 → opacity-100): assign-to-self (person SVG), mark in-progress (play SVG), mark resolved (checkmark SVG); each calls PUT /api/tickets/:id preserving existing priority and other fields; socket.io ticket_updated event updates row in place; button icon turns green for 1.5s on success via rowSuccesses state; assign button title says "Reassign to me" if ticket already has a different assignee; resolved/closed tickets disable the resolved button, in_progress tickets disable the progress button
  - Step 31: "My queue" toggle added to dispatcher filter bar; filters table to tickets assigned to current user; count shown in label ("My queue (4)"); state persisted in localStorage keyed by user.id; clearFilters() also resets myQueueOnly to false
  - Step 32: Reply template system added; reply_templates table created (id, created_by, title, body, is_shared, created_at) via auto-migration in server.js; GET/POST/DELETE /api/reply-templates endpoints in new backend/routes/replyTemplates.js; in TicketDetail.jsx dispatcher/admin note form: "📋 Use template" dropdown above textarea (lists own + shared templates, click to insert body, ✕ to delete own); "Save as template" link appears below textarea when note has content; inline save form shows title input + "Share with all dispatchers" checkbox + Save/Cancel; shared templates show creator name
  - Step 33: On-duty/off-duty availability toggle added; ALTER TABLE users ADD COLUMN IF NOT EXISTS available BOOLEAN NOT NULL DEFAULT true migration runs at startup; GET /api/users/availability and PATCH /api/users/availability endpoints added to routes/users.js; Dispatcher.jsx navbar shows pill toggle (green "On duty" / gray "Off duty") fetched on load; toggle calls PATCH optimistically with revert on error; GET /api/tickets/assignees now only returns dispatchers where available = true (admins always included), so off-duty dispatchers are hidden from all assign dropdowns throughout the app; Admin.jsx Step 38 availability dot deferred to that step
