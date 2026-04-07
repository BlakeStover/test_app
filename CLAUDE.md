# Campus Ticket App

## Tech stack
- Backend: Node.js, Express, PostgreSQL, Socket.io, Nodemailer
- Frontend: React, Vite, Tailwind CSS, Axios, React Router

## Project structure
- /backend — Express server, routes, middleware, utils
- /frontend/src/pages — React pages

## User roles
- student — can submit and view their own tickets
- dispatcher — can view and manage all tickets
- admin — can manage users and all tickets

## Running locally
- Backend: cd backend && npm run dev (port 5000)
- Frontend: cd frontend && npm run dev (port 5173)
- Database: PostgreSQL local, db name test_app

## Test accounts
- Student: test@test.com / password123
- Dispatcher: dispatcher@test.com / password123
- Admin: admin@test.com / password123

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