const { query } = require('../config/database');
const createError = require('http-errors');

// GET /channels/:channelId/groups
const getByChannel = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const user = req.user;

    // Channel erişim kontrolü (non-Admin yalnızca kendi kanalını görebilir)
    if (user.role !== 'Admin' && user.channelId && user.channelId !== parseInt(channelId)) {
      return next(createError(403, 'Bu kanala erişim yetkiniz yok'));
    }

    const result = await query(
      `SELECT ag.AssetGroupID, ag.ChannelID, ag.GroupName, ag.GroupType,
              ag.Description, ag.Status, ag.CreatedDate, ag.UpdatedDate, ag.IsActive,
              c.ChannelName,
              COUNT(DISTINCT a.AssetID) AS AssetCount,
              COUNT(DISTINCT CASE WHEN a.Status = 'Active' THEN a.AssetID END) AS ActiveCount,
              COUNT(DISTINCT CASE WHEN a.Status = 'Maintenance' THEN a.AssetID END) AS MaintenanceCount,
              COUNT(DISTINCT CASE WHEN a.Status = 'Faulty' THEN a.AssetID END) AS FaultyCount
       FROM AssetGroups ag
       JOIN Channels c ON c.ChannelID = ag.ChannelID
       LEFT JOIN Assets a ON a.AssetGroupID = ag.AssetGroupID AND a.IsActive = 1
       WHERE ag.ChannelID = @channelId AND ag.IsActive = 1
       GROUP BY ag.AssetGroupID, ag.ChannelID, ag.GroupName, ag.GroupType,
                ag.Description, ag.Status, ag.CreatedDate, ag.UpdatedDate, ag.IsActive, c.ChannelName
       ORDER BY ag.GroupType, ag.GroupName`,
      [{ name: 'channelId', value: parseInt(channelId) }]
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

// GET /assetgroups  (tüm gruplar - admin veya filtreli)
const getAll = async (req, res, next) => {
  try {
    const user = req.user;
    const { channelId, groupType } = req.query;

    let conditions = ['ag.IsActive = 1'];
    let params = [];

    if (user.role !== 'Admin' && user.channelId) {
      conditions.push('ag.ChannelID = @userChannelId');
      params.push({ name: 'userChannelId', value: user.channelId });
    } else if (channelId) {
      conditions.push('ag.ChannelID = @channelId');
      params.push({ name: 'channelId', value: parseInt(channelId) });
    }

    if (groupType) {
      conditions.push('ag.GroupType = @groupType');
      params.push({ name: 'groupType', value: groupType });
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const result = await query(
      `SELECT ag.AssetGroupID, ag.ChannelID, ag.GroupName, ag.GroupType,
              ag.Description, ag.Status, ag.CreatedDate, ag.IsActive,
              c.ChannelName,
              COUNT(DISTINCT a.AssetID) AS AssetCount
       FROM AssetGroups ag
       JOIN Channels c ON c.ChannelID = ag.ChannelID
       LEFT JOIN Assets a ON a.AssetGroupID = ag.AssetGroupID AND a.IsActive = 1
       ${where}
       GROUP BY ag.AssetGroupID, ag.ChannelID, ag.GroupName, ag.GroupType,
                ag.Description, ag.Status, ag.CreatedDate, ag.IsActive, c.ChannelName
       ORDER BY c.ChannelName, ag.GroupType, ag.GroupName`,
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
      `SELECT ag.*, c.ChannelName,
              COUNT(DISTINCT a.AssetID) AS AssetCount,
              COUNT(DISTINCT CASE WHEN a.Status = 'Active' THEN a.AssetID END) AS ActiveCount,
              COUNT(DISTINCT CASE WHEN a.Status = 'Maintenance' THEN a.AssetID END) AS MaintenanceCount,
              COUNT(DISTINCT CASE WHEN a.Status = 'Faulty' THEN a.AssetID END) AS FaultyCount,
              AVG(m.CPUUsage)         AS AvgCPU,
              AVG(m.Temperature)      AS AvgTemperature,
              AVG(m.PowerConsumption) AS AvgPower
       FROM AssetGroups ag
       JOIN Channels c ON c.ChannelID = ag.ChannelID
       LEFT JOIN Assets a ON a.AssetGroupID = ag.AssetGroupID AND a.IsActive = 1
       LEFT JOIN AssetMonitoring m ON m.AssetID = a.AssetID
           AND m.MonitoringID = (
               SELECT TOP 1 MonitoringID FROM AssetMonitoring
               WHERE AssetID = a.AssetID ORDER BY MonitoringTime DESC
           )
       WHERE ag.AssetGroupID = @id AND ag.IsActive = 1
       GROUP BY ag.AssetGroupID, ag.ChannelID, ag.GroupName, ag.GroupType,
                ag.Description, ag.Status, ag.CreatedDate, ag.UpdatedDate, ag.IsActive, c.ChannelName`,
      [{ name: 'id', value: parseInt(id) }]
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
      `SELECT ChannelID FROM Channels WHERE ChannelID = @channelId AND IsActive = 1`,
      [{ name: 'channelId', value: parseInt(channelId) }]
    );
    if (!channelExists.recordset.length) return next(createError(404, 'Kanal bulunamadı'));

    const result = await query(
      `INSERT INTO AssetGroups (ChannelID, GroupName, GroupType, Description)
       OUTPUT INSERTED.AssetGroupID
       VALUES (@channelId, @groupName, @groupType, @description)`,
      [
        { name: 'channelId',   value: parseInt(channelId) },
        { name: 'groupName',   value: groupName },
        { name: 'groupType',   value: groupType },
        { name: 'description', value: description || null },
      ]
    );
    const newId = result.recordset[0].AssetGroupID;
    const newGroup = await query(
      `SELECT ag.*, c.ChannelName FROM AssetGroups ag
       JOIN Channels c ON c.ChannelID = ag.ChannelID
       WHERE ag.AssetGroupID = @id`,
      [{ name: 'id', value: newId }]
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
      `SELECT AssetGroupID FROM AssetGroups WHERE AssetGroupID = @id AND IsActive = 1`,
      [{ name: 'id', value: parseInt(id) }]
    );
    if (!exists.recordset.length) return next(createError(404, 'Varlık Grubu bulunamadı'));

    await query(
      `UPDATE AssetGroups SET
         GroupName   = COALESCE(@groupName, GroupName),
         GroupType   = COALESCE(@groupType, GroupType),
         Description = COALESCE(@description, Description),
         Status      = COALESCE(@status, Status),
         UpdatedDate = GETDATE()
       WHERE AssetGroupID = @id`,
      [
        { name: 'id',          value: parseInt(id) },
        { name: 'groupName',   value: groupName    || null },
        { name: 'groupType',   value: groupType    || null },
        { name: 'description', value: description  || null },
        { name: 'status',      value: status       || null },
      ]
    );
    const updated = await query(
      `SELECT ag.*, c.ChannelName FROM AssetGroups ag
       JOIN Channels c ON c.ChannelID = ag.ChannelID
       WHERE ag.AssetGroupID = @id`,
      [{ name: 'id', value: parseInt(id) }]
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
      `SELECT AssetGroupID FROM AssetGroups WHERE AssetGroupID = @id AND IsActive = 1`,
      [{ name: 'id', value: parseInt(id) }]
    );
    if (!exists.recordset.length) return next(createError(404, 'Varlık Grubu bulunamadı'));

    // Gruba bağlı aktif varlık var mı?
    const assetCheck = await query(
      `SELECT COUNT(*) AS cnt FROM Assets WHERE AssetGroupID = @id AND IsActive = 1`,
      [{ name: 'id', value: parseInt(id) }]
    );
    if (assetCheck.recordset[0].cnt > 0) {
      return next(createError(400, 'Bu gruba bağlı aktif varlıklar var. Önce varlıkları silin veya taşıyın.'));
    }

    await query(
      `UPDATE AssetGroups SET IsActive = 0, UpdatedDate = GETDATE() WHERE AssetGroupID = @id`,
      [{ name: 'id', value: parseInt(id) }]
    );
    res.json({ success: true, message: 'Varlık Grubu silindi' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getByChannel, getById, create, update, remove };
