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