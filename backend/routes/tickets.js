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

// Update a ticket - dispatchers and admins only
router.put('/:id', verifyDispatcher, validateUpdateTicket, async (req, res) => {
  const { status, assigned_to, priority } = req.body;
  try {
    const updatedTicket = await pool.query(
      'UPDATE tickets SET status = $1, assigned_to = $2, priority = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [status, assigned_to, priority, req.params.id]
    );
    if (updatedTicket.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    req.io.emit('ticket_updated', updatedTicket.rows[0]);
    res.json(updatedTicket.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;