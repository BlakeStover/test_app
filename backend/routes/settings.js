const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// GET /api/settings — all settings (any authenticated user, read-only)
router.get('/', verifyToken, async (_req, res) => {
  try {
    const result = await pool.query('SELECT key, value, label FROM system_settings ORDER BY key ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/settings/:key — single setting (any authenticated user)
router.get('/:key', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT key, value, label FROM system_settings WHERE key = $1',
      [req.params.key]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Setting not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
