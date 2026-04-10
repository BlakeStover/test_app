const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyDispatcher } = require('../middleware/auth');

// GET /api/reply-templates — own templates + all shared templates
router.get('/', verifyDispatcher, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rt.*, u.name as created_by_name
       FROM reply_templates rt
       LEFT JOIN users u ON rt.created_by = u.id
       WHERE rt.created_by = $1 OR rt.is_shared = true
       ORDER BY rt.is_shared DESC, rt.title ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/reply-templates — create a template
router.post('/', verifyDispatcher, async (req, res) => {
  const { title, body, is_shared } = req.body;
  if (!title?.trim() || !body?.trim()) {
    return res.status(400).json({ message: 'title and body are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO reply_templates (created_by, title, body, is_shared)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, title.trim(), body.trim(), is_shared === true]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/reply-templates/:id — delete own template; admin can delete any
router.delete('/:id', verifyDispatcher, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM reply_templates WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Template not found' });
    if (result.rows[0].created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete your own templates' });
    }
    await pool.query('DELETE FROM reply_templates WHERE id = $1', [req.params.id]);
    res.json({ message: 'Template deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
