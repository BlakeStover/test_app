const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyAdmin } = require('../middleware/auth');
const { invalidateCache } = require('../utils/settingsCache');
const { validateRoleUpdate } = require('../middleware/validate');

// Get all users
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const users = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(users.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user role
router.put('/users/:id', verifyAdmin, validateRoleUpdate, async (req, res) => {
  const { role } = req.body;
  try {
    const updatedUser = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
      [role, req.params.id]
    );
    if (updatedUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(updatedUser.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
router.delete('/users/:id', verifyAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Buildings ──────────────────────────────────────────────────────────────

// GET /api/admin/buildings — all buildings (including inactive)
router.get('/buildings', verifyAdmin, async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM buildings ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/buildings — create new building
router.post('/buildings', verifyAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required' });
  try {
    const result = await pool.query(
      'INSERT INTO buildings (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Building already exists' });
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/admin/buildings/:id — update name or active status
router.patch('/buildings/:id', verifyAdmin, async (req, res) => {
  const { name, active } = req.body;
  try {
    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push(`name = $${fields.length + 1}`); values.push(name.trim()); }
    if (active !== undefined) { fields.push(`active = $${fields.length + 1}`); values.push(active); }
    if (fields.length === 0) return res.status(400).json({ message: 'Nothing to update' });
    values.push(req.params.id);
    const result = await pool.query(
      `UPDATE buildings SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Building not found' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Building name already exists' });
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/buildings/:id — soft delete (set active = false)
router.delete('/buildings/:id', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE buildings SET active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Building not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Ticket Templates ────────────────────────────────────────────────────────

// GET /api/admin/ticket-templates — all templates (including inactive)
router.get('/ticket-templates', verifyAdmin, async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM ticket_templates ORDER BY category ASC, display_order ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/admin/ticket-templates — create
router.post('/ticket-templates', verifyAdmin, async (req, res) => {
  const { category, title, subtitle, description } = req.body;
  if (!category || !title || !description) {
    return res.status(400).json({ message: 'category, title, and description are required' });
  }
  try {
    const maxOrder = await pool.query(
      'SELECT COALESCE(MAX(display_order), 0) AS max FROM ticket_templates WHERE category = $1',
      [category]
    );
    const display_order = parseInt(maxOrder.rows[0].max) + 1;
    const result = await pool.query(
      `INSERT INTO ticket_templates (category, title, subtitle, description, display_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [category, title.trim(), subtitle?.trim() || null, description.trim(), display_order]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/admin/ticket-templates/:id — update fields
router.patch('/ticket-templates/:id', verifyAdmin, async (req, res) => {
  const { title, subtitle, description, active, display_order } = req.body;
  const fields = [];
  const values = [];
  if (title !== undefined)         { fields.push(`title = $${fields.length + 1}`);         values.push(title.trim()); }
  if (subtitle !== undefined)      { fields.push(`subtitle = $${fields.length + 1}`);      values.push(subtitle?.trim() || null); }
  if (description !== undefined)   { fields.push(`description = $${fields.length + 1}`);   values.push(description.trim()); }
  if (active !== undefined)        { fields.push(`active = $${fields.length + 1}`);        values.push(active); }
  if (display_order !== undefined) { fields.push(`display_order = $${fields.length + 1}`); values.push(display_order); }
  if (fields.length === 0) return res.status(400).json({ message: 'Nothing to update' });
  values.push(req.params.id);
  try {
    const result = await pool.query(
      `UPDATE ticket_templates SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Template not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/admin/ticket-templates/:id — soft delete
router.delete('/ticket-templates/:id', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE ticket_templates SET active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Template not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── System Settings ──────────────────────────────────────────────────────────

// GET /api/admin/settings — all settings
router.get('/settings', verifyAdmin, async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_settings ORDER BY key ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/admin/settings/:key — update a setting value
router.patch('/settings/:key', verifyAdmin, async (req, res) => {
  const { value } = req.body;
  if (value === undefined || value === '') return res.status(400).json({ message: 'value is required' });
  try {
    const result = await pool.query(
      `UPDATE system_settings SET value = $1, updated_at = CURRENT_TIMESTAMP
       WHERE key = $2 RETURNING *`,
      [String(value), req.params.key]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Setting not found' });
    invalidateCache();
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reports data
router.get('/reports', verifyAdmin, async (_req, res) => {
  try {
    const [byCategory, byStatus, avgResolution, perDay] = await Promise.all([
      pool.query(
        'SELECT category, COUNT(*)::int AS count FROM tickets GROUP BY category ORDER BY count DESC'
      ),
      pool.query(
        'SELECT status, COUNT(*)::int AS count FROM tickets GROUP BY status ORDER BY count DESC'
      ),
      pool.query(
        `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600)::numeric, 1) AS avg_hours
         FROM tickets WHERE status IN ('resolved', 'closed')`
      ),
      pool.query(
        `SELECT TO_CHAR(created_at::date, 'YYYY-MM-DD') AS date, COUNT(*)::int AS count
         FROM tickets
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY created_at::date
         ORDER BY date ASC`
      ),
    ]);

    res.json({
      byCategory: byCategory.rows,
      byStatus: byStatus.rows,
      avgResolutionHours: avgResolution.rows[0]?.avg_hours ?? null,
      perDay: perDay.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;