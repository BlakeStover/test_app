const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { validateUpdateProfile } = require('../middleware/validate');

// PATCH /api/users/profile
// Accepts profile fields, sets profile_complete = true
router.patch('/profile', verifyToken, validateUpdateProfile, async (req, res) => {
  const { preferred_name, student_id, building, room_number, phone } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users
       SET preferred_name  = $1,
           student_id      = $2,
           building        = $3,
           room_number     = $4,
           phone           = $5,
           profile_complete = true
       WHERE id = $6
       RETURNING id, name, email, role, profile_complete,
                 preferred_name, student_id, building, room_number, phone`,
      [
        preferred_name.trim(),
        student_id.trim(),
        building.trim(),
        room_number.trim(),
        phone.trim(),
        req.user.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'Profile updated', user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
