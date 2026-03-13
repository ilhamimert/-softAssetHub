const jwt = require('jsonwebtoken');
const { createError } = require('./errorHandler');

const DEFAULT_USER = { userId: 1, username: 'admin', email: 'admin@system.local', fullName: 'Admin', role: 'Admin', channelId: null };

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return next(createError('Giriş yapmalısınız.', 401, 'UNAUTHORIZED'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return next(createError('Geçersiz veya süresi dolmuş oturum.', 401, 'INVALID_TOKEN'));
  }
};

// İsteğe bağlı auth — token varsa decode et, yoksa devam et
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      req.user = null;
    }
  }
  next();
};

module.exports = { authenticate, optionalAuth };
