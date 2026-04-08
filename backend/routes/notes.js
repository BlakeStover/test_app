const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { validateNote } = require('../middleware/validate');

// Get all notes for a ticket
// Students only see notes where internal = false; dispatchers/admins see all
router.get('/:ticketId', verifyToken, async (req, res) => {
  try {
    const isStudent = req.user.role === 'student';
    const notes = await pool.query(
      `SELECT notes.*, users.name as author_name, users.role as author_role
       FROM notes
       LEFT JOIN users ON notes.user_id = users.id
       WHERE notes.ticket_id = $1
         ${isStudent ? 'AND notes.internal = false' : ''}
       ORDER BY notes.created_at ASC`,
      [req.params.ticketId]
    );
    res.json(notes.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a note to a ticket
router.post('/:ticketId', verifyToken, validateNote, async (req, res) => {
  const { content, internal } = req.body;
  // Students can only post public notes; dispatchers/admins can mark notes internal
  const isInternal = req.user.role !== 'student' && internal === true;
  try {
    const newNote = await pool.query(
      `INSERT INTO notes (ticket_id, user_id, content, internal)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.params.ticketId, req.user.id, content, isInternal]
    );

    const noteWithAuthor = await pool.query(
      `SELECT notes.*, users.name as author_name, users.role as author_role
       FROM notes
       LEFT JOIN users ON notes.user_id = users.id
       WHERE notes.id = $1`,
      [newNote.rows[0].id]
    );

    res.status(201).json(noteWithAuthor.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// Edit a note
router.put('/:noteId', verifyToken, validateNote, async (req, res) => {
  const { content } = req.body;
  try {
    const note = await pool.query(
      'SELECT * FROM notes WHERE id = $1', [req.params.noteId]
    );

    if (note.rows.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own notes' });
    }

    const updated = await pool.query(
        'UPDATE notes SET content = $1, edited_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [content, req.params.noteId]
    );

    const noteWithAuthor = await pool.query(
      `SELECT notes.*, users.name as author_name, users.role as author_role
       FROM notes
       LEFT JOIN users ON notes.user_id = users.id
       WHERE notes.id = $1`,
      [updated.rows[0].id]
    );

    res.json(noteWithAuthor.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a note
router.delete('/:noteId', verifyToken, async (req, res) => {
  try {
    const note = await pool.query(
      'SELECT * FROM notes WHERE id = $1', [req.params.noteId]
    );

    if (note.rows.length === 0) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete your own notes' });
    }

    await pool.query('DELETE FROM notes WHERE id = $1', [req.params.noteId]);
    res.json({ message: 'Note deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;