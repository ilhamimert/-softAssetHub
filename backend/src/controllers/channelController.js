const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// GET /channels
const getAll = async (req, res, next) => {
  try {
    const { isActive = 1 } = req.query;
    const result = await query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM AssetGroups ag WHERE ag.ChannelID = c.ChannelID AND ag.IsActive = 1) AS GroupCount,
        (SELECT COUNT(*) FROM Assets a WHERE a.ChannelID = c.ChannelID AND a.IsActive = 1) AS AssetCount
       FROM Channels c
       WHERE c.IsActive = @isActive
       ORDER BY c.ChannelName`,
      { isActive: parseInt(isActive) }
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
        (SELECT COUNT(*) FROM AssetGroups ag WHERE ag.ChannelID = c.ChannelID AND ag.IsActive = 1) AS GroupCount,
        (SELECT COUNT(*) FROM Assets a WHERE a.ChannelID = c.ChannelID AND a.IsActive = 1) AS AssetCount
       FROM Channels c WHERE c.ChannelID = @id`,
      { id: parseInt(id) }
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
      `INSERT INTO Channels (ChannelName, Description, LogoUrl, EstablishedYear, ContactEmail, ContactPhone, Website)
       OUTPUT INSERTED.*
       VALUES (@channelName, @description, @logoUrl, @establishedYear, @contactEmail, @contactPhone, @website)`,
      { channelName, description, logoUrl, establishedYear, contactEmail, contactPhone, website }
    );

    await logActivity(req, 'CREATE', 'Channel', result.recordset[0].ChannelID);
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

    const existing = await query(`SELECT * FROM Channels WHERE ChannelID = @id`, { id: parseInt(id) });
    if (!existing.recordset[0]) return next(createError('Kanal bulunamadı.', 404, 'NOT_FOUND'));

    const result = await query(
      `UPDATE Channels SET
        ChannelName = COALESCE(@channelName, ChannelName),
        Description = COALESCE(@description, Description),
        LogoUrl = COALESCE(@logoUrl, LogoUrl),
        EstablishedYear = COALESCE(@establishedYear, EstablishedYear),
        ContactEmail = COALESCE(@contactEmail, ContactEmail),
        ContactPhone = COALESCE(@contactPhone, ContactPhone),
        Website = COALESCE(@website, Website),
        IsActive = COALESCE(@isActive, IsActive),
        UpdatedDate = GETDATE()
       OUTPUT INSERTED.*
       WHERE ChannelID = @id`,
      { id: parseInt(id), channelName, description, logoUrl, establishedYear, contactEmail, contactPhone, website, isActive }
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
    const existing = await query(`SELECT * FROM Channels WHERE ChannelID = @id`, { id: parseInt(id) });
    if (!existing.recordset[0]) return next(createError('Kanal bulunamadı.', 404, 'NOT_FOUND'));

    await query(`UPDATE Channels SET IsActive = 0, UpdatedDate = GETDATE() WHERE ChannelID = @id`, { id: parseInt(id) });
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
    `INSERT INTO ActivityLog (UserID, Action, EntityType, EntityID, IPAddress) VALUES (@userId, @action, @entityType, @entityId, @ip)`,
    { userId: req.user.userId, action, entityType, entityId, ip }
  ).catch(() => {});
}

module.exports = { getAll, getById, create, update, remove };
