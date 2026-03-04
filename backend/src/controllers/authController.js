const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

const generateTokens = (user) => {
  const payload = {
    userId: user.UserID,
    username: user.Username,
    email: user.Email,
    role: user.Role,
    channelId: user.ChannelID,
    fullName: user.FullName,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

  const refreshToken = jwt.sign(
    { userId: user.UserID },
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
      `SELECT * FROM Users WHERE (Username = @username OR Email = @username) AND IsActive = 1`,
      { username }
    );

    const user = result.recordset[0];
    if (!user) {
      return next(createError('Geçersiz kullanıcı adı veya şifre.', 401, 'INVALID_CREDENTIALS'));
    }

    const isValid = await bcrypt.compare(password, user.PasswordHash);
    if (!isValid) {
      return next(createError('Geçersiz kullanıcı adı veya şifre.', 401, 'INVALID_CREDENTIALS'));
    }

    const { accessToken, refreshToken } = generateTokens(user);

    // Refresh token ve last login güncelle
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    await query(
      `UPDATE Users SET LastLogin = GETDATE(), LastLoginIP = @ip, RefreshToken = @refreshToken WHERE UserID = @userId`,
      { ip, refreshToken, userId: user.UserID }
    );

    // Aktivite logu
    await query(
      `INSERT INTO ActivityLog (UserID, Action, EntityType, IPAddress, UserAgent) VALUES (@userId, 'LOGIN', 'Auth', @ip, @userAgent)`,
      { userId: user.UserID, ip, userAgent: req.headers['user-agent'] || '' }
    );

    res.json({
      success: true,
      message: 'Giriş başarılı.',
      data: {
        accessToken,
        refreshToken,
        user: {
          userId: user.UserID,
          username: user.Username,
          email: user.Email,
          fullName: user.FullName,
          role: user.Role,
          channelId: user.ChannelID,
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
      `SELECT * FROM Users WHERE UserID = @userId AND IsActive = 1 AND RefreshToken = @refreshToken`,
      { userId: decoded.userId, refreshToken }
    );

    const user = result.recordset[0];
    if (!user) {
      return next(createError('Geçersiz refresh token.', 401, 'INVALID_TOKEN'));
    }

    const tokens = generateTokens(user);

    await query(
      `UPDATE Users SET RefreshToken = @refreshToken WHERE UserID = @userId`,
      { refreshToken: tokens.refreshToken, userId: user.UserID }
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
      await query(
        `UPDATE Users SET RefreshToken = NULL WHERE UserID = @userId`,
        { userId }
      );
      const ip = req.ip || 'unknown';
      await query(
        `INSERT INTO ActivityLog (UserID, Action, EntityType, IPAddress) VALUES (@userId, 'LOGOUT', 'Auth', @ip)`,
        { userId, ip }
      );
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

    // Sadece kendi şifresini veya admin başkasınınkini değiştirebilir
    if (parseInt(id) !== requestingUserId && req.user.role !== 'Admin') {
      return next(createError('Bu işlem için yetkiniz yok.', 403, 'FORBIDDEN'));
    }

    const result = await query(`SELECT * FROM Users WHERE UserID = @id`, { id: parseInt(id) });
    const user = result.recordset[0];
    if (!user) return next(createError('Kullanıcı bulunamadı.', 404, 'NOT_FOUND'));

    if (req.user.role !== 'Admin') {
      const isValid = await bcrypt.compare(currentPassword, user.PasswordHash);
      if (!isValid) return next(createError('Mevcut şifre hatalı.', 400, 'INVALID_PASSWORD'));
    }

    if (!newPassword || newPassword.length < 8) {
      return next(createError('Yeni şifre en az 8 karakter olmalı.', 400));
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query(
      `UPDATE Users SET PasswordHash = @hash, UpdatedDate = GETDATE() WHERE UserID = @id`,
      { hash, id: parseInt(id) }
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
      `SELECT UserID, Username, Email, FullName, Role, ChannelID, Phone, Department, Avatar, LastLogin, CreatedDate
       FROM Users WHERE UserID = @userId AND IsActive = 1`,
      { userId: req.user.userId }
    );

    const user = result.recordset[0];
    if (!user) return next(createError('Kullanıcı bulunamadı.', 404, 'NOT_FOUND'));

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, refresh, logout, changePassword, getMe };
