const VALID_CATEGORIES = ['maintenance', 'campus_safety', 'it', 'cleaning', 'other'];
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const VALID_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const VALID_ROLES = ['student', 'dispatcher', 'admin'];

function validateRegister(req, res, next) {
  const { name, email, password } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: 'Name is required' });
  if (!email?.trim()) return res.status(400).json({ message: 'Email is required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: 'Invalid email format' });
  if (!password || password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
  next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body;
  if (!email?.trim()) return res.status(400).json({ message: 'Email is required' });
  if (!password) return res.status(400).json({ message: 'Password is required' });
  next();
}

function validateForgotPassword(req, res, next) {
  const { email } = req.body;
  if (!email?.trim()) return res.status(400).json({ message: 'Email is required' });
  next();
}

function validateResetPassword(req, res, next) {
  const { token, password } = req.body;
  if (!token) return res.status(400).json({ message: 'Reset token is required' });
  if (!password || password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
  next();
}

function validateCreateTicket(req, res, next) {
  const { title, description, category, priority } = req.body;
  if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });
  if (title.trim().length > 200) return res.status(400).json({ message: 'Title must be 200 characters or fewer' });
  if (!description?.trim()) return res.status(400).json({ message: 'Description is required' });
  if (description.trim().length > 2000) return res.status(400).json({ message: 'Description must be 2000 characters or fewer' });
  if (category && !VALID_CATEGORIES.includes(category)) return res.status(400).json({ message: 'Invalid category' });
  if (priority && !VALID_PRIORITIES.includes(priority)) return res.status(400).json({ message: 'Invalid priority' });
  next();
}

function validateUpdateTicket(req, res, next) {
  const { status, priority } = req.body;
  if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  if (priority && !VALID_PRIORITIES.includes(priority)) return res.status(400).json({ message: 'Invalid priority' });
  next();
}

function validateNote(req, res, next) {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ message: 'Note content is required' });
  if (content.trim().length > 5000) return res.status(400).json({ message: 'Note must be 5000 characters or fewer' });
  next();
}

function validateRoleUpdate(req, res, next) {
  const { role } = req.body;
  if (!role) return res.status(400).json({ message: 'Role is required' });
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' });
  next();
}

function validateUpdateProfile(req, res, next) {
  const { preferred_name, student_id, building, room_number, phone } = req.body;
  if (!preferred_name?.trim()) return res.status(400).json({ message: 'Preferred name is required' });
  if (preferred_name.trim().length > 100) return res.status(400).json({ message: 'Preferred name must be 100 characters or fewer' });
  if (!student_id?.trim()) return res.status(400).json({ message: 'Student ID is required' });
  if (student_id.trim().length > 50) return res.status(400).json({ message: 'Student ID must be 50 characters or fewer' });
  if (!building?.trim()) return res.status(400).json({ message: 'Building is required' });
  if (building.trim().length > 150) return res.status(400).json({ message: 'Building must be 150 characters or fewer' });
  if (!room_number?.trim()) return res.status(400).json({ message: 'Room number is required' });
  if (room_number.trim().length > 20) return res.status(400).json({ message: 'Room number must be 20 characters or fewer' });
  if (!phone?.trim()) return res.status(400).json({ message: 'Phone number is required' });
  if (!/^\+?[\d\s\-().]{7,20}$/.test(phone.trim())) return res.status(400).json({ message: 'Invalid phone number format' });
  next();
}

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateCreateTicket,
  validateUpdateTicket,
  validateNote,
  validateRoleUpdate,
  validateUpdateProfile,
};
