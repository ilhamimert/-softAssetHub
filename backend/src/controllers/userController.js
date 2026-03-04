const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// GET /users
const getAll = async (req, res, next) => {
  try {
    const { channelId, role, isActive = 1 } = req.query;
    let whereClause = 'WHERE u.IsActive = @isActive';
    const params = { isActive: parseInt(isActive) };

    // Viewer göremez
    if (req.user.role === 'Viewer') {
      return next(createError('Kullanıcı listesine erişim yetkiniz yok.', 403, 'FORBIDDEN'));
    }

    if (channelId) { whereClause += ' AND u.ChannelID = @channelId'; params.channelId = parseInt(channelId); }
    if (role)      { whereClause += ' AND u.Role = @role'; params.role = role; }

    // Manager sadece kendi kanalındaki kullanıcıları görür
    if (req.user.role === 'Manager' && req.user.channelId) {
      whereClause += ' AND (u.ChannelID = @userChannelId OR u.ChannelID IS NULL)';
      params.userChannelId = req.user.channelId;
    }

    const result = await query(
      `SELECT u.UserID, u.Username, u.Email, u.FullName, u.Role, u.ChannelID,
        u.Phone, u.Department, u.IsActive, u.LastLogin, u.CreatedDate, c.ChannelName
       FROM Users u
       LEFT JOIN Channels c ON u.ChannelID = c.ChannelID
       ${whereClause}
       ORDER BY u.FullName`,
      params
    );
    res.json({ success: true, data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
};

// GET /users/:id
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT u.UserID, u.Username, u.Email, u.FullName, u.Role, u.ChannelID,
        u.Phone, u.Department, u.IsActive, u.LastLogin, u.CreatedDate, c.ChannelName
       FROM Users u
       LEFT JOIN Channels c ON u.ChannelID = c.ChannelID
       WHERE u.UserID = @id`,
      { id: parseInt(id) }
    );
    const user = result.recordset[0];
    if (!user) return next(createError('Kullanıcı bulunamadı.', 404, 'NOT_FOUND'));
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// POST /users
const create = async (req, res, next) => {
  try {
    const { username, email, password, fullName, role, channelId, phone, department } = req.body;

    if (!username || !email || !password || !fullName || !role) {
      return next(createError('Username, email, şifre, ad ve rol gerekli.', 400));
    }

    if (password.length < 8) {
      return next(createError('Şifre en az 8 karakter olmalı.', 400));
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO Users (Username, Email, PasswordHash, FullName, Role, ChannelID, Phone, Department)
       OUTPUT INSERTED.UserID, INSERTED.Username, INSERTED.Email, INSERTED.FullName, INSERTED.Role, INSERTED.ChannelID, INSERTED.CreatedDate
       VALUES (@username, @email, @passwordHash, @fullName, @role, @channelId, @phone, @department)`,
      {
        username, email, passwordHash, fullName, role,
        channelId: channelId ? parseInt(channelId) : null,
        phone, department
      }
    );
    res.status(201).json({ success: true, message: 'Kullanıcı oluşturuldu.', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /users/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, department, role, channelId, isActive } = req.body;

    // Sadece admin rol değiştirebilir
    if (role && req.user.role !== 'Admin') {
      return next(createError('Rol değiştirme yetkisi yok.', 403, 'FORBIDDEN'));
    }

    const result = await query(
      `UPDATE Users SET
        FullName = COALESCE(@fullName, FullName),
        Email = COALESCE(@email, Email),
        Phone = COALESCE(@phone, Phone),
        Department = COALESCE(@department, Department),
        Role = COALESCE(@role, Role),
        ChannelID = COALESCE(@channelId, ChannelID),
        IsActive = COALESCE(@isActive, IsActive),
        UpdatedDate = GETDATE()
       OUTPUT INSERTED.UserID, INSERTED.Username, INSERTED.Email, INSERTED.FullName, INSERTED.Role
       WHERE UserID = @id`,
      { id: parseInt(id), fullName, email, phone, department, role, channelId: channelId ? parseInt(channelId) : null, isActive }
    );

    if (!result.recordset[0]) return next(createError('Kullanıcı bulunamadı.', 404, 'NOT_FOUND'));
    res.json({ success: true, message: 'Kullanıcı güncellendi.', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /users/:id (soft delete)
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (parseInt(id) === req.user.userId) {
      return next(createError('Kendi hesabınızı silemezsiniz.', 400));
    }
    await query(`UPDATE Users SET IsActive = 0, UpdatedDate = GETDATE() WHERE UserID = @id`, { id: parseInt(id) });
    res.json({ success: true, message: 'Kullanıcı devre dışı bırakıldı.' });
  } catch (err) {
    next(err);
  }
};

// GET /logs/activity
const getActivityLog = async (req, res, next) => {
  try {
    const { userId, assetId, entityType, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereClause = 'WHERE 1=1';
    const params = { limit: parseInt(limit), offset };

    if (userId)     { whereClause += ' AND al.UserID = @userId'; params.userId = parseInt(userId); }
    if (assetId)    { whereClause += ' AND al.AssetID = @assetId'; params.assetId = parseInt(assetId); }
    if (entityType) { whereClause += ' AND al.EntityType = @entityType'; params.entityType = entityType; }

    const result = await query(
      `SELECT al.*, u.FullName, u.Username FROM ActivityLog al
       LEFT JOIN Users u ON al.UserID = u.UserID
       ${whereClause}
       ORDER BY al.Timestamp DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      params
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove, getActivityLog };
