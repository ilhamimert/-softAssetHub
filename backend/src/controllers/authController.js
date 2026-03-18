const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query, withTransaction } = require('../config/database');
const { createError } = require('../middleware/errorHandler');
const { validatePassword } = require('../validators/password');

// Refresh token'ı SHA-256 ile hash'ler — DB'de plaintext saklanmaz
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const generateTokens = (user) => {
  const payload = {
    userId:    user.userId,
    username:  user.username,
    email:     user.email,
    role:      user.role,
    channelId: user.channelId,
    fullName:  user.fullName,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

  const refreshToken = jwt.sign(
    { userId: user.userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

// POST /auth/login
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return next(createError('Kullanıcı adı ve şifre gerekli.', 400));
    }

    const result = await query(
      `SELECT * FROM users WHERE (username = $1 OR email = $1) AND is_active = TRUE`,
      [username]
    );

    const user = result.recordset[0];
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';

    if (!user) {
      await query(
        `INSERT INTO activity_log (user_id, action, entity_type, ip_address, user_agent)
         VALUES (NULL, 'LOGIN_FAILED', 'Auth', $1, $2)`,
        [ip, req.headers['user-agent'] || '']
      ).catch(() => {});
      return next(createError('Geçersiz kullanıcı adı veya şifre.', 401, 'INVALID_CREDENTIALS'));
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      await query(
        `INSERT INTO activity_log (user_id, action, entity_type, ip_address, user_agent)
         VALUES ($1, 'LOGIN_FAILED', 'Auth', $2, $3)`,
        [user.userId, ip, req.headers['user-agent'] || '']
      ).catch(() => {});
      return next(createError('Geçersiz kullanıcı adı veya şifre.', 401, 'INVALID_CREDENTIALS'));
    }

    const { accessToken, refreshToken } = generateTokens(user);

    await withTransaction(async (txQuery) => {
      await txQuery(
        `UPDATE users SET last_login = NOW(), last_login_ip = $1, refresh_token_hash = $2 WHERE user_id = $3`,
        [ip, hashToken(refreshToken), user.userId]
      );
      await txQuery(
        `INSERT INTO activity_log (user_id, action, entity_type, ip_address, user_agent)
         VALUES ($1, 'LOGIN', 'Auth', $2, $3)`,
        [user.userId, ip, req.headers['user-agent'] || '']
      );
    });

    res.json({
      success: true,
      message: 'Giriş başarılı.',
      data: {
        accessToken,
        refreshToken,
        user: {
          userId:    user.userId,
          username:  user.username,
          email:     user.email,
          fullName:  user.fullName,
          role:      user.role,
          channelId: user.channelId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /auth/refresh
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return next(createError('Refresh token gerekli.', 400));
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return next(createError('Geçersiz veya süresi dolmuş refresh token.', 401, 'INVALID_TOKEN'));
    }

    const result = await query(
      `SELECT * FROM users WHERE user_id = $1 AND is_active = TRUE AND refresh_token_hash = $2`,
      [decoded.userId, hashToken(refreshToken)]
    );

    const user = result.recordset[0];
    if (!user) {
      return next(createError('Geçersiz refresh token.', 401, 'INVALID_TOKEN'));
    }

    const tokens = generateTokens(user);

    await query(
      `UPDATE users SET refresh_token_hash = $1 WHERE user_id = $2`,
      [hashToken(tokens.refreshToken), user.userId]
    );

    res.json({
      success: true,
      data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
    });
  } catch (err) {
    next(err);
  }
};

// POST /auth/logout
const logout = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (userId) {
      const ip = req.ip || 'unknown';
      await withTransaction(async (txQuery) => {
        await txQuery(
          `UPDATE users SET refresh_token_hash = NULL WHERE user_id = $1`,
          [userId]
        );
        await txQuery(
          `INSERT INTO activity_log (user_id, action, entity_type, ip_address)
           VALUES ($1, 'LOGOUT', 'Auth', $2)`,
          [userId, ip]
        );
      });
    }
    res.json({ success: true, message: 'Çıkış başarılı.' });
  } catch (err) {
    next(err);
  }
};

// PUT /users/:id/password
const changePassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    const requestingUserId = req.user.userId;

    if (parseInt(id) !== requestingUserId && req.user.role !== 'Admin') {
      return next(createError('Bu işlem için yetkiniz yok.', 403, 'FORBIDDEN'));
    }

    const result = await query(`SELECT * FROM users WHERE user_id = $1`, [parseInt(id)]);
    const user = result.recordset[0];
    if (!user) return next(createError('Kullanıcı bulunamadı.', 404, 'NOT_FOUND'));

    if (req.user.role !== 'Admin') {
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) return next(createError('Mevcut şifre hatalı.', 400, 'INVALID_PASSWORD'));
    }

    const pwdError = validatePassword(newPassword);
    if (pwdError) return next(createError(pwdError, 400));

    const hash = await bcrypt.hash(newPassword, 10);
    await query(
      `UPDATE users SET password_hash = $1, updated_date = NOW() WHERE user_id = $2`,
      [hash, parseInt(id)]
    );

    res.json({ success: true, message: 'Şifre başarıyla değiştirildi.' });
  } catch (err) {
    next(err);
  }
};

// GET /auth/me
const getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT user_id, username, email, full_name, role, channel_id, phone, department, avatar, last_login, created_date
       FROM users WHERE user_id = $1 AND is_active = TRUE`,
      [req.user.userId]
    );

    const u = result.recordset[0];
    if (!u) return next(createError('Kullanıcı bulunamadı.', 404, 'NOT_FOUND'));

    res.json({
      success: true,
      data: {
        userId:     u.userId,
        username:   u.username,
        email:      u.email,
        fullName:   u.fullName,
        role:       u.role,
        channelId:  u.channelId,
        phone:      u.phone,
        department: u.department,
        avatar:     u.avatar,
        lastLogin:  u.lastLogin,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, refresh, logout, changePassword, getMe };
