const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/buildings — active buildings sorted alphabetically (public)
router.get('/', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT name FROM buildings WHERE active = true ORDER BY name ASC'
    );
    res.json(result.rows.map((r) => r.name));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
