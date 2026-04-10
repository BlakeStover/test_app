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

pool.query(`
  CREATE TABLE IF NOT EXISTS ticket_templates (
    id            SERIAL PRIMARY KEY,
    category      VARCHAR(50) NOT NULL,
    title         VARCHAR(255) NOT NULL,
    subtitle      VARCHAR(255),
    description   TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    active        BOOLEAN NOT NULL DEFAULT true
  )
`).then(() => pool.query('SELECT COUNT(*) FROM ticket_templates'))
  .then((r) => {
    if (parseInt(r.rows[0].count) > 0) return;
    return pool.query(`
      INSERT INTO ticket_templates (category, title, subtitle, description, display_order) VALUES
        ('lockout', 'Locked out of my room',         'Need access to my dorm room',         'I am locked out of my dorm room and need assistance gaining access.',                              1),
        ('lockout', 'Key card not working',           'Student ID won''t open the door',      'My student ID card is not opening the building or room entry door.',                               2),
        ('lockout', 'Lost room key',                  'Need a replacement key',               'I have lost my room key and need a replacement issued.',                                           3),
        ('lockout', 'Door lock is broken',            'Lock mechanism not functioning',       'The lock on my door is broken and not functioning properly.',                                      4),
        ('maintenance', 'Broken furniture or fixture','Bed, desk, chair, or other item',      'A piece of furniture or fixture in my room is broken and needs repair or replacement.',           1),
        ('maintenance', 'Window or door not closing', 'Won''t latch or seal properly',        'A window or door in my room will not close or latch properly.',                                   2),
        ('maintenance', 'Ceiling or wall damage',     'Crack, hole, or water stain',          'There is damage to the ceiling or walls in my room that needs attention.',                        3),
        ('maintenance', 'Floor damage',               'Damaged tile, carpet, or surface',     'There is damage to the flooring in my room or a common area.',                                    4),
        ('electrical', 'Outlet not working',          'No power from wall outlet',            'One or more electrical outlets in my room are not functioning.',                                  1),
        ('electrical', 'Light fixture out',           'Overhead or bathroom light',           'A light fixture in my room or common area is not working.',                                       2),
        ('electrical', 'Power out in room',           'Possible tripped circuit breaker',     'Power in part of my room or the hallway has gone out, possibly a tripped breaker.',               3),
        ('electrical', 'Heating or cooling not working','HVAC system issue',                  'The heating or air conditioning in my room is not functioning properly.',                         4),
        ('plumbing',  'Leaking faucet or pipe',       'Dripping or water pooling',            'There is a leaking faucet or pipe in my room or bathroom.',                                       1),
        ('plumbing',  'Slow or clogged drain',        'Sink, shower, or toilet',              'The sink, shower, or toilet drain is slow or completely clogged.',                                2),
        ('plumbing',  'Toilet not flushing',          'Running or won''t flush',              'The toilet in my bathroom is not flushing properly or is running continuously.',                  3),
        ('plumbing',  'No hot water',                 'Only cold water available',            'There is no hot water available in my room or bathroom.',                                         4),
        ('pest',      'Cockroach sighting',           'One or more cockroaches seen',         'I have seen cockroaches in my room or common area and need pest control.',                        1),
        ('pest',      'Mouse or rodent sighting',     'Rodent seen or evidence found',        'I have seen a mouse or other rodent, or found evidence of one, in my room or common area.',       2),
        ('pest',      'Ant infestation',              'Ants in room or kitchen area',         'There are ants in my room or kitchen area that need to be addressed.',                            3),
        ('pest',      'Other pest issue',             'Describe what you''ve spotted',        'I have spotted other pests in my room or common area that need attention.',                       4)
    `);
  }).catch((err) => console.error('Migration error (ticket_templates):', err));

pool.query(`
  CREATE TABLE IF NOT EXISTS system_settings (
    key        VARCHAR(100) PRIMARY KEY,
    value      TEXT NOT NULL,
    label      VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).then(() => pool.query(`
  INSERT INTO system_settings (key, value, label) VALUES
    ('emergency_phone',         '555-123-4567', 'Campus safety phone number'),
    ('sla_hours_campus_safety', '0.5',          'Response target: Campus Safety (hours)'),
    ('sla_hours_maintenance',   '24',           'Response target: Maintenance (hours)'),
    ('sla_hours_it',            '48',           'Response target: IT (hours)'),
    ('sla_hours_cleaning',      '48',           'Response target: Cleaning (hours)'),
    ('sla_hours_other',         '48',           'Response target: Other (hours)')
  ON CONFLICT (key) DO NOTHING
`)).catch((err) => console.error('Migration error (system_settings):', err));

pool.query(`
  CREATE TABLE IF NOT EXISTS buildings (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL UNIQUE,
    active     BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).then(() => {
  // Seed default buildings only if table is empty
  return pool.query(`
    INSERT INTO buildings (name) VALUES
      ('Alumni Hall'), ('Baker Science Center'), ('Campbell Library'),
      ('Centennial Hall'), ('Commons Dining Hall'), ('East Residence Hall'),
      ('Engineering Building'), ('Fine Arts Center'), ('Founders Hall'),
      ('Griffin Student Center'), ('Health & Wellness Center'), ('Humanities Building'),
      ('Lincoln Hall'), ('North Residence Hall'), ('Oak Hall'),
      ('Performing Arts Center'), ('Physical Education Complex'),
      ('Science & Technology Building'), ('South Residence Hall'),
      ('University Hall'), ('West Residence Hall')
    ON CONFLICT (name) DO NOTHING
  `);
}).catch((err) => console.error('Migration error (buildings):', err));

const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const adminRoutes = require('./routes/admin');
const noteRoutes = require('./routes/notes');
const buildingRoutes = require('./routes/buildings');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/uploads');
const replyTemplateRoutes = require('./routes/replyTemplates');
const ticketTemplateRoutes = require('./routes/ticketTemplates');
const settingsRoutes = require('./routes/settings');

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
app.use('/api/ticket-templates', ticketTemplateRoutes);
app.use('/api/settings', settingsRoutes);

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