const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, verifyDispatcher } = require('../middleware/auth');
const { sendTicketNotification, sendStatusUpdateEmail } = require('../utils/email');
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
  const { title, description, category, priority, photo_filename } = req.body;
  try {
    const newTicket = await pool.query(
      'INSERT INTO tickets (title, description, category, priority, created_by, photo_filename) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, description, category, priority || 'normal', req.user.id, photo_filename || null]
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

// Cancel a ticket — student can cancel their own open/in_progress ticket
router.post('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const ticket = await pool.query('SELECT * FROM tickets WHERE id = $1', [req.params.id]);
    if (ticket.rows.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    const t = ticket.rows[0];

    if (t.created_by !== req.user.id) {
      return res.status(403).json({ message: 'You can only cancel your own tickets' });
    }
    if (['resolved', 'closed'].includes(t.status)) {
      return res.status(400).json({ message: 'This ticket cannot be cancelled' });
    }

    const updated = await pool.query(
      'UPDATE tickets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      ['closed', req.params.id]
    );

    await pool.query(
      'INSERT INTO ticket_history (ticket_id, changed_by, field, old_value, new_value) VALUES ($1, $2, $3, $4, $5)',
      [req.params.id, req.user.id, 'status', t.status, 'closed']
    );

    await pool.query(
      'INSERT INTO notes (ticket_id, user_id, content, internal) VALUES ($1, $2, $3, $4)',
      [req.params.id, req.user.id, 'This request was cancelled by the student.', false]
    );

    req.io.emit('ticket_updated', updated.rows[0]);
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk update tickets - dispatchers and admins only
router.put('/bulk', verifyDispatcher, async (req, res) => {
  const { ids, status, assigned_to } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'No ticket IDs provided' });
  }
  if (ids.length > 100) {
    return res.status(400).json({ message: 'Cannot update more than 100 tickets at once' });
  }

  const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  if (status === undefined && assigned_to === undefined) {
    return res.status(400).json({ message: 'No update fields provided' });
  }

  try {
    let updatedCount = 0;
    for (const id of ids) {
      const current = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
      if (current.rows.length === 0) continue;
      const old = current.rows[0];

      const newStatus = status !== undefined ? status : old.status;
      const newAssigned = assigned_to !== undefined ? assigned_to : old.assigned_to;

      const result = await pool.query(
        'UPDATE tickets SET status = $1, assigned_to = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
        [newStatus, newAssigned, id]
      );
      const updatedTicket = result.rows[0];

      const changes = [];
      if (old.status !== newStatus) changes.push(['status', old.status, newStatus]);
      const oldAssigned = old.assigned_to != null ? String(old.assigned_to) : null;
      const newAssignedStr = newAssigned != null ? String(newAssigned) : null;
      if (oldAssigned !== newAssignedStr) changes.push(['assigned_to', oldAssigned, newAssignedStr]);

      for (const [field, oldVal, newVal] of changes) {
        await pool.query(
          'INSERT INTO ticket_history (ticket_id, changed_by, field, old_value, new_value) VALUES ($1, $2, $3, $4, $5)',
          [id, req.user.id, field, oldVal, newVal]
        );
      }

      if (old.status !== newStatus && ['in_progress', 'resolved', 'closed'].includes(newStatus)) {
        pool.query('SELECT id, name, email FROM users WHERE id = $1', [old.created_by])
          .then((sub) => { if (sub.rows.length > 0) sendStatusUpdateEmail(sub.rows[0], updatedTicket, newStatus); })
          .catch(() => {});
      }

      req.io.emit('ticket_updated', updatedTicket);
      updatedCount++;
    }
    res.json({ updated: updatedCount });
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

    // Email the submitter when status moves to in_progress, resolved, or closed
    if (old.status !== status && ['in_progress', 'resolved', 'closed'].includes(status)) {
      const submitter = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [old.created_by]
      );
      if (submitter.rows.length > 0) {
        sendStatusUpdateEmail(submitter.rows[0], updatedTicket.rows[0], status);
      }
    }

    req.io.emit('ticket_updated', updatedTicket.rows[0]);
    res.json(updatedTicket.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;