const { createError } = require('./errorHandler');

const ROLE_HIERARCHY = {
  Admin: 4,
  Manager: 3,
  Technician: 2,
  Viewer: 1,
};

// En az belirtilen role sahip olmayı gerektirir
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError('Kimlik doğrulama gerekli.', 401, 'UNAUTHORIZED'));
    }

    const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
    const hasAccess = allowedRoles.some(
      (role) => userLevel >= (ROLE_HIERARCHY[role] || 0)
    );

    if (!hasAccess) {
      return next(
        createError(
          `Bu işlem için yetkiniz yok. Gerekli rol: ${allowedRoles.join(' veya ')}`,
          403,
          'FORBIDDEN'
        )
      );
    }
    next();
  };
};

// Admin olmayı gerektirir
const requireAdmin = requireRole('Admin');

// Kanal bazlı erişim kontrolü — Admin tüm kanallara, diğerleri sadece kendi kanalına
const requireChannelAccess = (channelIdParam = 'channelId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError('Kimlik doğrulama gerekli.', 401, 'UNAUTHORIZED'));
    }

    if (req.user.role === 'Admin') {
      return next(); // Admin her şeye erişebilir
    }

    const requestedChannelId = parseInt(
      req.params[channelIdParam] || req.query[channelIdParam] || req.body[channelIdParam]
    );

    if (requestedChannelId && req.user.channelId && requestedChannelId !== req.user.channelId) {
      return next(
        createError('Bu kanala erişim yetkiniz yok.', 403, 'CHANNEL_ACCESS_DENIED')
      );
    }

    next();
  };
};

module.exports = { requireRole, requireAdmin, requireChannelAccess };
