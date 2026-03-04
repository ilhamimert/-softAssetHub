const jwt = require('jsonwebtoken');
const { createError } = require('./errorHandler');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return next(createError('Erişim için token gerekli.', 401, 'UNAUTHORIZED'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(createError('Token süresi doldu.', 401, 'TOKEN_EXPIRED'));
    }
    return next(createError('Geçersiz token.', 401, 'INVALID_TOKEN'));
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
