const { query } = require('../config/database');
const createError = require('http-errors');

// GET /channels/:channelId/groups
const getByChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const user = req.user;

    if (user.role !== 'Admin' && user.channelId && user.channelId !== parseInt(channelId)) {
      return next(createError(403, 'Bu kanala erişim yetkiniz yok'));
    }

    const result = await query(
      `SELECT ag.asset_group_id, ag.channel_id, ag.group_name, ag.group_type,
              ag.description, ag.status, ag.created_date, ag.updated_date, ag.is_active,
              c.channel_name,
              COUNT(DISTINCT a.asset_id) AS asset_count,
              COUNT(DISTINCT CASE WHEN a.status = 'Active' THEN a.asset_id END) AS active_count,
              COUNT(DISTINCT CASE WHEN a.status = 'Maintenance' THEN a.asset_id END) AS maintenance_count,
              COUNT(DISTINCT CASE WHEN a.status = 'Faulty' THEN a.asset_id END) AS faulty_count
       FROM asset_groups ag
       JOIN channels c ON c.channel_id = ag.channel_id
       LEFT JOIN assets a ON a.asset_group_id = ag.asset_group_id AND a.is_active = TRUE
       WHERE ag.channel_id = $1 AND ag.is_active = TRUE
       GROUP BY ag.asset_group_id, ag.channel_id, ag.group_name, ag.group_type,
                ag.description, ag.status, ag.created_date, ag.updated_date, ag.is_active, c.channel_name
       ORDER BY ag.group_type, ag.group_name`,
      [parseInt(channelId)]
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

// GET /assetgroups
const getAll = async (req, res, next) => {
  try {
    const user = req.user;
    const { channelId, groupType } = req.query;

    const conditions = ['ag.is_active = TRUE'];
    const params = [];
    let idx = 1;

    if (user.role !== 'Admin' && user.channelId) {
      conditions.push(`ag.channel_id = $${idx++}`);
      params.push(user.channelId);
    } else if (channelId) {
      conditions.push(`ag.channel_id = $${idx++}`);
      params.push(parseInt(channelId));
    }

    if (groupType) {
      conditions.push(`ag.group_type = $${idx++}`);
      params.push(groupType);
    }

    const where = 'WHERE ' + conditions.join(' AND ');

    const result = await query(
      `SELECT ag.asset_group_id, ag.channel_id, ag.group_name, ag.group_type,
              ag.description, ag.status, ag.created_date, ag.is_active,
              c.channel_name,
              COUNT(DISTINCT a.asset_id) AS asset_count
       FROM asset_groups ag
       JOIN channels c ON c.channel_id = ag.channel_id
       LEFT JOIN assets a ON a.asset_group_id = ag.asset_group_id AND a.is_active = TRUE
       ${where}
       GROUP BY ag.asset_group_id, ag.channel_id, ag.group_name, ag.group_type,
                ag.description, ag.status, ag.created_date, ag.is_active, c.channel_name
       ORDER BY c.channel_name, ag.group_type, ag.group_name`,
      params
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

// GET /assetgroups/:id
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT ag.*, c.channel_name,
              COUNT(DISTINCT a.asset_id) AS asset_count,
              COUNT(DISTINCT CASE WHEN a.status = 'Active' THEN a.asset_id END) AS active_count,
              COUNT(DISTINCT CASE WHEN a.status = 'Maintenance' THEN a.asset_id END) AS maintenance_count,
              COUNT(DISTINCT CASE WHEN a.status = 'Faulty' THEN a.asset_id END) AS faulty_count,
              AVG(m.cpu_usage)          AS avg_cpu,
              AVG(m.temperature)        AS avg_temperature,
              AVG(m.power_consumption)  AS avg_power
       FROM asset_groups ag
       JOIN channels c ON c.channel_id = ag.channel_id
       LEFT JOIN assets a ON a.asset_group_id = ag.asset_group_id AND a.is_active = TRUE
       LEFT JOIN LATERAL (
         SELECT cpu_usage, temperature, power_consumption
         FROM asset_monitoring m2
         WHERE m2.asset_id = a.asset_id
         ORDER BY m2.monitoring_time DESC LIMIT 1
       ) m ON true
       WHERE ag.asset_group_id = $1 AND ag.is_active = TRUE
       GROUP BY ag.asset_group_id, ag.channel_id, ag.group_name, ag.group_type,
                ag.description, ag.status, ag.created_date, ag.updated_date, ag.is_active, c.channel_name`,
      [parseInt(id)]
    );
    if (!result.recordset.length) return next(createError(404, 'Varlık Grubu bulunamadı'));
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// POST /assetgroups  (Manager+)
const create = async (req, res, next) => {
  try {
    const { channelId, groupName, groupType, description } = req.body;
    if (!channelId || !groupName || !groupType) {
      return next(createError(400, 'channelId, groupName ve groupType zorunludur'));
    }

    const validTypes = ['Playout', 'Encoding', 'Transmission', 'Archive', 'Storage', 'General'];
    if (!validTypes.includes(groupType)) {
      return next(createError(400, `groupType şunlardan biri olmalı: ${validTypes.join(', ')}`));
    }

    const channelExists = await query(
      `SELECT channel_id FROM channels WHERE channel_id = $1 AND is_active = TRUE`,
      [parseInt(channelId)]
    );
    if (!channelExists.recordset.length) return next(createError(404, 'Kanal bulunamadı'));

    const result = await query(
      `INSERT INTO asset_groups (channel_id, group_name, group_type, description)
       VALUES ($1, $2, $3, $4)
       RETURNING asset_group_id`,
      [parseInt(channelId), groupName, groupType, description || null]
    );
    const newId = result.recordset[0].assetGroupId;
    const newGroup = await query(
      `SELECT ag.*, c.channel_name FROM asset_groups ag
       JOIN channels c ON c.channel_id = ag.channel_id
       WHERE ag.asset_group_id = $1`,
      [newId]
    );
    res.status(201).json({ success: true, data: newGroup.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /assetgroups/:id  (Manager+)
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { groupName, groupType, description, status } = req.body;

    const exists = await query(
      `SELECT asset_group_id FROM asset_groups WHERE asset_group_id = $1 AND is_active = TRUE`,
      [parseInt(id)]
    );
    if (!exists.recordset.length) return next(createError(404, 'Varlık Grubu bulunamadı'));

    await query(
      `UPDATE asset_groups SET
         group_name  = COALESCE($1, group_name),
         group_type  = COALESCE($2, group_type),
         description = COALESCE($3, description),
         status      = COALESCE($4, status),
         updated_date = NOW()
       WHERE asset_group_id = $5`,
      [groupName || null, groupType || null, description || null, status || null, parseInt(id)]
    );
    const updated = await query(
      `SELECT ag.*, c.channel_name FROM asset_groups ag
       JOIN channels c ON c.channel_id = ag.channel_id
       WHERE ag.asset_group_id = $1`,
      [parseInt(id)]
    );
    res.json({ success: true, data: updated.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /assetgroups/:id  (Admin only - soft delete)
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exists = await query(
      `SELECT asset_group_id FROM asset_groups WHERE asset_group_id = $1 AND is_active = TRUE`,
      [parseInt(id)]
    );
    if (!exists.recordset.length) return next(createError(404, 'Varlık Grubu bulunamadı'));

    const assetCheck = await query(
      `SELECT COUNT(*) AS cnt FROM assets WHERE asset_group_id = $1 AND is_active = TRUE`,
      [parseInt(id)]
    );
    if (parseInt(assetCheck.recordset[0].cnt) > 0) {
      return next(createError(400, 'Bu gruba bağlı aktif varlıklar var. Önce varlıkları silin veya taşıyın.'));
    }

    await query(
      `UPDATE asset_groups SET is_active = FALSE, updated_date = NOW() WHERE asset_group_id = $1`,
      [parseInt(id)]
    );
    res.json({ success: true, message: 'Varlık Grubu silindi' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getByChannel, getById, create, update, remove };
