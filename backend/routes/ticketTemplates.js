const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/ticket-templates?category=X — active templates for a wizard category (public)
router.get('/', async (req, res) => {
  const { category } = req.query;
  if (!category) return res.status(400).json({ message: 'category is required' });
  try {
    const result = await pool.query(
      `SELECT id, category, title, subtitle, description, display_order
       FROM ticket_templates
       WHERE category = $1 AND active = true
       ORDER BY display_order ASC`,
      [category]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
