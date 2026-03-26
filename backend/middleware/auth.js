const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

const verifyDispatcher = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === 'dispatcher' || req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Access denied. Dispatchers only.' });
    }
  });
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Access denied. Admins only.' });
    }
  });
};

module.exports = { verifyToken, verifyDispatcher, verifyAdmin };