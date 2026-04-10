const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
require('dotenv').config();
const pool = require('./config/db');

// Auto-migrations — safe to run repeatedly (IF NOT EXISTS / idempotent)
pool.query('ALTER TABLE tickets ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5)')
  .catch((err) => console.error('Migration error (rating):', err));

pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS available BOOLEAN NOT NULL DEFAULT true')
  .catch((err) => console.error('Migration error (available):', err));

pool.query(`
  CREATE TABLE IF NOT EXISTS reply_templates (
    id          SERIAL PRIMARY KEY,
    created_by  INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    body        TEXT NOT NULL,
    is_shared   BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch((err) => console.error('Migration error (reply_templates):', err));

const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const adminRoutes = require('./routes/admin');
const noteRoutes = require('./routes/notes');
const buildingRoutes = require('./routes/buildings');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/uploads');
const replyTemplateRoutes = require('./routes/replyTemplates');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/reply-templates', replyTemplateRoutes);

// Serve uploaded photos statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.json({ message: 'Campus Ticket API is running!' });
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});