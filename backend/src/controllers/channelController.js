const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// GET /channels
const getAll = async (req, res, next) => {
  try {
    const { isActive = true } = req.query;
    const activeVal = isActive === '0' || isActive === 'false' ? false : true;
    const result = await query(
      `SELECT c.*,
        COALESCE(ag_cnt.cnt, 0) AS group_count,
        COALESCE(a_cnt.cnt,  0) AS asset_count
       FROM channels c
       LEFT JOIN (
         SELECT channel_id, COUNT(*) AS cnt FROM asset_groups WHERE is_active = TRUE GROUP BY channel_id
       ) ag_cnt ON ag_cnt.channel_id = c.channel_id
       LEFT JOIN (
         SELECT channel_id, COUNT(*) AS cnt FROM assets WHERE is_active = TRUE GROUP BY channel_id
       ) a_cnt ON a_cnt.channel_id = c.channel_id
       WHERE c.is_active = $1
       ORDER BY c.channel_name`,
      [activeVal]
    );
    res.json({ success: true, data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
};

// GET /channels/:id
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT c.*,
        COALESCE(ag_cnt.cnt, 0) AS group_count,
        COALESCE(a_cnt.cnt,  0) AS asset_count
       FROM channels c
       LEFT JOIN (
         SELECT channel_id, COUNT(*) AS cnt FROM asset_groups WHERE is_active = TRUE GROUP BY channel_id
       ) ag_cnt ON ag_cnt.channel_id = c.channel_id
       LEFT JOIN (
         SELECT channel_id, COUNT(*) AS cnt FROM assets WHERE is_active = TRUE GROUP BY channel_id
       ) a_cnt ON a_cnt.channel_id = c.channel_id
       WHERE c.channel_id = $1`,
      [parseInt(id)]
    );
    const channel = result.recordset[0];
    if (!channel) return next(createError('Kanal bulunamadı.', 404, 'NOT_FOUND'));
    res.json({ success: true, data: channel });
  } catch (err) {
    next(err);
  }
};

// POST /channels
const create = async (req, res, next) => {
  try {
    const { channelName, description, logoUrl, establishedYear, contactEmail, contactPhone, website } = req.body;
    if (!channelName) return next(createError('Kanal adı gerekli.', 400));

    const result = await query(
      `INSERT INTO channels (channel_name, description, logo_url, established_year, contact_email, contact_phone, website)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [channelName, description, logoUrl, establishedYear, contactEmail, contactPhone, website]
    );

    await logActivity(req, 'CREATE', 'Channel', result.recordset[0].channelId);
    res.status(201).json({ success: true, message: 'Kanal oluşturuldu.', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /channels/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { channelName, description, logoUrl, establishedYear, contactEmail, contactPhone, website, isActive } = req.body;

    const existing = await query(`SELECT * FROM channels WHERE channel_id = $1`, [parseInt(id)]);
    if (!existing.recordset[0]) return next(createError('Kanal bulunamadı.', 404, 'NOT_FOUND'));

    const result = await query(
      `UPDATE channels SET
        channel_name    = COALESCE($1, channel_name),
        description     = COALESCE($2, description),
        logo_url        = COALESCE($3, logo_url),
        established_year = COALESCE($4, established_year),
        contact_email   = COALESCE($5, contact_email),
        contact_phone   = COALESCE($6, contact_phone),
        website         = COALESCE($7, website),
        is_active       = COALESCE($8, is_active),
        updated_date    = NOW()
       WHERE channel_id = $9 RETURNING *`,
      [channelName, description, logoUrl, establishedYear, contactEmail, contactPhone, website, isActive, parseInt(id)]
    );

    await logActivity(req, 'UPDATE', 'Channel', parseInt(id));
    res.json({ success: true, message: 'Kanal güncellendi.', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /channels/:id (soft delete)
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query(`SELECT * FROM channels WHERE channel_id = $1`, [parseInt(id)]);
    if (!existing.recordset[0]) return next(createError('Kanal bulunamadı.', 404, 'NOT_FOUND'));

    await query(`UPDATE channels SET is_active = FALSE, updated_date = NOW() WHERE channel_id = $1`, [parseInt(id)]);
    await logActivity(req, 'DELETE', 'Channel', parseInt(id));
    res.json({ success: true, message: 'Kanal silindi.' });
  } catch (err) {
    next(err);
  }
};

async function logActivity(req, action, entityType, entityId) {
  if (!req.user) return;
  const ip = req.ip || 'unknown';
  await query(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5)`,
    [req.user.userId, action, entityType, entityId, ip]
  ).catch(() => {});
}

module.exports = { getAll, getById, create, update, remove };
