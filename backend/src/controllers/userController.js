const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// GET /users
const getAll = async (req, res, next) => {
  try {
    const { channelId, role, isActive = '1' } = req.query;

    if (req.user.role === 'Viewer') {
      return next(createError('Kullanıcı listesine erişim yetkiniz yok.', 403, 'FORBIDDEN'));
    }

    const params = [isActive === '0' || isActive === 'false' ? false : true];
    let idx = 2;
    let whereClause = 'WHERE u.is_active = $1';

    if (channelId) { whereClause += ` AND u.channel_id = $${idx++}`; params.push(parseInt(channelId)); }
    if (role)      { whereClause += ` AND u.role = $${idx++}`; params.push(role); }

    if (req.user.role === 'Manager' && req.user.channelId) {
      whereClause += ` AND (u.channel_id = $${idx++} OR u.channel_id IS NULL)`;
      params.push(req.user.channelId);
    }

    const result = await query(
      `SELECT u.user_id, u.username, u.email, u.full_name, u.role, u.channel_id,
        u.phone, u.department, u.is_active, u.last_login, u.created_date, c.channel_name
       FROM users u
       LEFT JOIN channels c ON u.channel_id = c.channel_id
       ${whereClause}
       ORDER BY u.full_name`,
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
      `SELECT u.user_id, u.username, u.email, u.full_name, u.role, u.channel_id,
        u.phone, u.department, u.is_active, u.last_login, u.created_date, c.channel_name
       FROM users u
       LEFT JOIN channels c ON u.channel_id = c.channel_id
       WHERE u.user_id = $1`,
      [parseInt(id)]
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
    if (password.length < 8 || !/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return next(createError('Şifre en az 8 karakter ve bir rakam veya özel karakter içermeli.', 400));
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (username, email, password_hash, full_name, role, channel_id, phone, department)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING user_id, username, email, full_name, role, channel_id, created_date`,
      [username, email, passwordHash, fullName, role, channelId ? parseInt(channelId) : null, phone, department]
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

    if (role && req.user.role !== 'Admin') {
      return next(createError('Rol değiştirme yetkisi yok.', 403, 'FORBIDDEN'));
    }

    if (req.user.role === 'Manager') {
      const targetResult = await query(`SELECT role, channel_id FROM users WHERE user_id = $1`, [parseInt(id)]);
      const targetUser = targetResult.recordset[0];
      if (!targetUser) return next(createError('Kullanıcı bulunamadı.', 404, 'NOT_FOUND'));
      if (targetUser.role === 'Admin') {
        return next(createError('Yöneticiler yetkili Admin hesaplarını düzenleyemez.', 403, 'FORBIDDEN'));
      }
      if (req.user.channelId && targetUser.channel_id !== req.user.channelId) {
        return next(createError('Sadece yetkili olduğunuz kanaldaki kullanıcıları düzenleyebilirsiniz.', 403, 'FORBIDDEN'));
      }
    }

    const result = await query(
      `UPDATE users SET
        full_name  = COALESCE($1, full_name),
        email      = COALESCE($2, email),
        phone      = COALESCE($3, phone),
        department = COALESCE($4, department),
        role       = COALESCE($5, role),
        channel_id = COALESCE($6, channel_id),
        is_active  = COALESCE($7, is_active),
        updated_date = NOW()
       WHERE user_id = $8
       RETURNING user_id, username, email, full_name, role`,
      [fullName, email, phone, department, role, channelId ? parseInt(channelId) : null, isActive, parseInt(id)]
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
    await query(`UPDATE users SET is_active = FALSE, updated_date = NOW() WHERE user_id = $1`, [parseInt(id)]);
    res.json({ success: true, message: 'Kullanıcı devre dışı bırakıldı.' });
  } catch (err) {
    next(err);
  }
};

// GET /logs/activity
const getActivityLog = async (req, res, next) => {
  try {
    const { userId, assetId, entityType, page = 1, limit = 50 } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
    const offset = (parseInt(page) - 1) * safeLimit;
    const params = [];
    let idx = 1;
    let whereClause = 'WHERE 1=1';

    if (userId)     { whereClause += ` AND al.user_id = $${idx++}`; params.push(parseInt(userId)); }
    if (assetId)    { whereClause += ` AND al.entity_id = $${idx++}`; params.push(parseInt(assetId)); }
    if (entityType) { whereClause += ` AND al.entity_type = $${idx++}`; params.push(entityType); }

    params.push(safeLimit, offset);

    const result = await query(
      `SELECT al.*, u.full_name, u.username FROM activity_log al
       LEFT JOIN users u ON al.user_id = u.user_id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

// PUT /users/:id/password
const changePassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (parseInt(id) !== req.user.userId && req.user.role !== 'Admin') {
      return next(createError('Sadece kendi şifrenizi değiştirebilirsiniz.', 403, 'FORBIDDEN'));
    }

    if (!newPassword || newPassword.length < 8 || !/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)) {
      return next(createError('Yeni şifre en az 8 karakter ve bir rakam veya özel karakter içermeli.', 400));
    }

    const userResult = await query(`SELECT password_hash FROM users WHERE user_id = $1`, [parseInt(id)]);
    const user = userResult.recordset[0];
    
    if (!user) return next(createError('Kullanıcı bulunamadı.', 404, 'NOT_FOUND'));

    if (req.user.role !== 'Admin' || parseInt(id) === req.user.userId) {
       if (!currentPassword) return next(createError('Mevcut şifrenizi girmelisiniz.', 400));
       const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
       if (!isValid) return next(createError('Mevcut şifre hatalı.', 400));
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query(`UPDATE users SET password_hash = $1, updated_date = NOW() WHERE user_id = $2`, [newHash, parseInt(id)]);
    
    res.json({ success: true, message: 'Şifre başarıyla güncellendi.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, changePassword, remove, getActivityLog };
