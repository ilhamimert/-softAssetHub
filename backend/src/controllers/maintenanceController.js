const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// GET /assets/:assetId/maintenance
const getByAsset = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const result = await query(
      `SELECT * FROM MaintenanceRecords WHERE AssetID = @assetId ORDER BY MaintenanceDate DESC`,
      { assetId: parseInt(assetId) }
    );
    res.json({ success: true, data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
};

// GET /maintenance/:id
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT m.*, a.AssetName, a.AssetCode FROM MaintenanceRecords m
       JOIN Assets a ON m.AssetID = a.AssetID
       WHERE m.MaintenanceID = @id`,
      { id: parseInt(id) }
    );
    const record = result.recordset[0];
    if (!record) return next(createError('Bakım kaydı bulunamadı.', 404, 'NOT_FOUND'));
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
};

// POST /maintenance
const create = async (req, res, next) => {
  try {
    const {
      assetId, maintenanceDate, maintenanceType, description,
      technicianName, technicianEmail, costAmount, status,
      nextMaintenanceDate, maintenanceInterval, documentURL, notes
    } = req.body;

    if (!assetId || !maintenanceDate) {
      return next(createError('AssetID ve bakım tarihi gerekli.', 400));
    }

    const result = await query(
      `INSERT INTO MaintenanceRecords (AssetID, MaintenanceDate, MaintenanceType, Description,
        TechnicianName, TechnicianEmail, CostAmount, Status,
        NextMaintenanceDate, MaintenanceInterval, DocumentURL, Notes)
       OUTPUT INSERTED.*
       VALUES (@assetId, @maintenanceDate, @maintenanceType, @description,
        @technicianName, @technicianEmail, @costAmount, @status,
        @nextMaintenanceDate, @maintenanceInterval, @documentURL, @notes)`,
      {
        assetId: parseInt(assetId), maintenanceDate, maintenanceType, description,
        technicianName, technicianEmail, costAmount, status: status || 'Completed',
        nextMaintenanceDate, maintenanceInterval, documentURL, notes
      }
    );

    // Varlık durumunu güncelle (Bakım tamamlandıysa Active'e al)
    if (status === 'Completed') {
      await query(`UPDATE Assets SET Status = 'Active', UpdatedDate = GETDATE() WHERE AssetID = @assetId AND Status = 'Maintenance'`, { assetId: parseInt(assetId) });
    } else if (status === 'Scheduled' || status === 'Pending') {
      await query(`UPDATE Assets SET Status = 'Maintenance', UpdatedDate = GETDATE() WHERE AssetID = @assetId`, { assetId: parseInt(assetId) });
    }

    res.status(201).json({ success: true, message: 'Bakım kaydı oluşturuldu.', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /maintenance/:id
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      maintenanceDate, maintenanceType, description, technicianName,
      technicianEmail, costAmount, status, nextMaintenanceDate,
      maintenanceInterval, documentURL, notes
    } = req.body;

    const result = await query(
      `UPDATE MaintenanceRecords SET
        MaintenanceDate = COALESCE(@maintenanceDate, MaintenanceDate),
        MaintenanceType = COALESCE(@maintenanceType, MaintenanceType),
        Description = COALESCE(@description, Description),
        TechnicianName = COALESCE(@technicianName, TechnicianName),
        TechnicianEmail = COALESCE(@technicianEmail, TechnicianEmail),
        CostAmount = COALESCE(@costAmount, CostAmount),
        Status = COALESCE(@status, Status),
        NextMaintenanceDate = COALESCE(@nextMaintenanceDate, NextMaintenanceDate),
        MaintenanceInterval = COALESCE(@maintenanceInterval, MaintenanceInterval),
        DocumentURL = COALESCE(@documentURL, DocumentURL),
        Notes = COALESCE(@notes, Notes),
        UpdatedDate = GETDATE()
       OUTPUT INSERTED.*
       WHERE MaintenanceID = @id`,
      { id: parseInt(id), maintenanceDate, maintenanceType, description, technicianName, technicianEmail, costAmount, status, nextMaintenanceDate, maintenanceInterval, documentURL, notes }
    );

    if (!result.recordset[0]) return next(createError('Bakım kaydı bulunamadı.', 404, 'NOT_FOUND'));
    res.json({ success: true, message: 'Bakım kaydı güncellendi.', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /maintenance/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM MaintenanceRecords WHERE MaintenanceID = @id`, { id: parseInt(id) });
    res.json({ success: true, message: 'Bakım kaydı silindi.' });
  } catch (err) {
    next(err);
  }
};

// GET /maintenance/scheduled
const getScheduled = async (req, res, next) => {
  try {
    const { days = 30, channelId } = req.query;
    let whereClause = `WHERE m.Status IN ('Scheduled', 'Pending') AND m.NextMaintenanceDate <= DATEADD(DAY, @days, GETDATE())`;
    const params = { days: parseInt(days) };

    if (channelId) {
      whereClause += ' AND c.ChannelID = @channelId';
      params.channelId = parseInt(channelId);
    }

    const result = await query(
      `SELECT m.*, a.AssetName, a.AssetCode, c.ChannelName, ag.GroupName
       FROM MaintenanceRecords m
       JOIN Assets a ON m.AssetID = a.AssetID
       JOIN AssetGroups ag ON a.AssetGroupID = ag.AssetGroupID
       JOIN Channels c ON a.ChannelID = c.ChannelID
       ${whereClause}
       ORDER BY m.NextMaintenanceDate ASC`,
      params
    );
    res.json({ success: true, data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
};

module.exports = { getByAsset, getById, create, update, remove, getScheduled };
