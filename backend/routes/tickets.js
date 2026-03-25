const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all tickets
router.get('/', async (req, res) => {
  try {
    const tickets = await pool.query(
      'SELECT * FROM tickets ORDER BY created_at DESC'
    );
    res.json(tickets.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single ticket
router.get('/:id', async (req, res) => {
  try {
    const ticket = await pool.query(
      'SELECT * FROM tickets WHERE id = $1', [req.params.id]
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

// Create a ticket
router.post('/', async (req, res) => {
  const { title, description, category, priority, created_by } = req.body;
  try {
    const newTicket = await pool.query(
      'INSERT INTO tickets (title, description, category, priority, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, category, priority || 'normal', created_by]
    );
    res.status(201).json(newTicket.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a ticket
router.put('/:id', async (req, res) => {
  const { status, assigned_to, priority } = req.body;
  try {
    const updatedTicket = await pool.query(
      'UPDATE tickets SET status = $1, assigned_to = $2, priority = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [status, assigned_to, priority, req.params.id]
    );
    if (updatedTicket.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.json(updatedTicket.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;