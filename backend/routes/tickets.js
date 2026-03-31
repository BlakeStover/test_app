const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, verifyDispatcher } = require('../middleware/auth');
const { sendTicketNotification } = require('../utils/email');
const { validateCreateTicket, validateUpdateTicket } = require('../middleware/validate');

// Get tickets for logged in student
router.get('/my-tickets', verifyToken, async (req, res) => {
  try {
    const tickets = await pool.query(
      'SELECT * FROM tickets WHERE created_by = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(tickets.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all tickets with user info - dispatchers and admins only
router.get('/', verifyDispatcher, async (req, res) => {
  try {
    const tickets = await pool.query(
      `SELECT tickets.*,
              submitter.name as submitted_by_name,
              submitter.email as submitted_by_email,
              assignee.name as assigned_to_name
       FROM tickets
       LEFT JOIN users submitter ON tickets.created_by = submitter.id
       LEFT JOIN users assignee ON tickets.assigned_to = assignee.id
       ORDER BY tickets.created_at DESC`
    );
    res.json(tickets.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dispatchers and admins available for assignment
router.get('/assignees', verifyDispatcher, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM users WHERE role IN ('dispatcher', 'admin') ORDER BY name ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single ticket - any logged in user
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const ticket = await pool.query(
      `SELECT tickets.*, assignee.name as assigned_to_name
       FROM tickets
       LEFT JOIN users assignee ON tickets.assigned_to = assignee.id
       WHERE tickets.id = $1`,
      [req.params.id]
    );
    if (ticket.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.json(ticket.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a ticket - any logged in user
router.post('/', verifyToken, validateCreateTicket, async (req, res) => {
  const { title, description, category, priority, created_by } = req.body;
  try {
    const newTicket = await pool.query(
      'INSERT INTO tickets (title, description, category, priority, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, category, priority || 'normal', created_by]
    );
    req.io.emit('ticket_created', newTicket.rows[0]);
    sendTicketNotification(newTicket.rows[0]);
    res.status(201).json(newTicket.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get ticket history - any logged in user
router.get('/:id/history', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         th.*,
         changer.name  AS changed_by_name,
         changer.role  AS changed_by_role,
         old_user.name AS old_assignee_name,
         new_user.name AS new_assignee_name
       FROM ticket_history th
       LEFT JOIN users changer  ON th.changed_by = changer.id
       LEFT JOIN users old_user ON th.field = 'assigned_to' AND th.old_value = old_user.id::text
       LEFT JOIN users new_user ON th.field = 'assigned_to' AND th.new_value = new_user.id::text
       WHERE th.ticket_id = $1
       ORDER BY th.changed_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a ticket - dispatchers and admins only
router.put('/:id', verifyDispatcher, validateUpdateTicket, async (req, res) => {
  const { status, assigned_to, priority } = req.body;
  try {
    // Fetch current values so we can diff
    const current = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    const old = current.rows[0];

    const updatedTicket = await pool.query(
      'UPDATE tickets SET status = $1, assigned_to = $2, priority = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [status, assigned_to, priority, req.params.id]
    );

    // Build list of changed fields and insert one history row per change
    const changes = [];
    if (old.status !== status) {
      changes.push(['status', old.status, status]);
    }
    if (old.priority !== priority) {
      changes.push(['priority', old.priority, priority]);
    }
    // Compare assigned_to as nullable strings to handle null == null correctly
    const oldAssigned = old.assigned_to != null ? String(old.assigned_to) : null;
    const newAssigned = assigned_to  != null ? String(assigned_to)  : null;
    if (oldAssigned !== newAssigned) {
      changes.push(['assigned_to', oldAssigned, newAssigned]);
    }

    for (const [field, oldVal, newVal] of changes) {
      await pool.query(
        'INSERT INTO ticket_history (ticket_id, changed_by, field, old_value, new_value) VALUES ($1, $2, $3, $4, $5)',
        [req.params.id, req.user.id, field, oldVal, newVal]
      );
    }

    req.io.emit('ticket_updated', updatedTicket.rows[0]);
    res.json(updatedTicket.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;