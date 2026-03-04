const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// GET /alerts
const getAll = async (req, res, next) => {
  try {
    const { severity, alertType, isResolved = 0, channelId, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE 1=1';
    const params = { limit: parseInt(limit), offset };

    if (severity)   { whereClause += ' AND al.AlertSeverity = @severity'; params.severity = parseInt(severity); }
    if (alertType)  { whereClause += ' AND al.AlertType = @alertType'; params.alertType = alertType; }
    if (isResolved !== undefined) { whereClause += ' AND al.IsResolved = @isResolved'; params.isResolved = parseInt(isResolved); }
    if (channelId)  { whereClause += ' AND c.ChannelID = @channelId'; params.channelId = parseInt(channelId); }

    const result = await query(
      `SELECT al.*, a.AssetName, a.AssetCode, c.ChannelName, ag.GroupName
       FROM Alerts al
       LEFT JOIN Assets a ON al.AssetID = a.AssetID
       LEFT JOIN AssetGroups ag ON a.AssetGroupID = ag.AssetGroupID
       LEFT JOIN Channels c ON a.ChannelID = c.ChannelID
       ${whereClause}
       ORDER BY al.TriggeredTime DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      params
    );

    res.json({ success: true, data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
};

// GET /alerts/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const { channelId } = req.query;
    let whereClause = 'WHERE al.IsResolved = 0';
    const params = {};
    if (channelId) { whereClause += ' AND c.ChannelID = @channelId'; params.channelId = parseInt(channelId); }

    const result = await query(
      `SELECT TOP 20 al.*, a.AssetName, a.AssetCode, c.ChannelName, ag.GroupName
       FROM Alerts al
       LEFT JOIN Assets a ON al.AssetID = a.AssetID
       LEFT JOIN AssetGroups ag ON a.AssetGroupID = ag.AssetGroupID
       LEFT JOIN Channels c ON a.ChannelID = c.ChannelID
       ${whereClause}
       ORDER BY al.AlertSeverity DESC, al.TriggeredTime DESC`,
      params
    );

    const countResult = await query(
      `SELECT
        SUM(CASE WHEN al.AlertType = 'Critical' AND al.IsResolved = 0 THEN 1 ELSE 0 END) AS CriticalCount,
        SUM(CASE WHEN al.AlertType = 'Warning' AND al.IsResolved = 0 THEN 1 ELSE 0 END) AS WarningCount,
        SUM(CASE WHEN al.AlertType = 'Info' AND al.IsResolved = 0 THEN 1 ELSE 0 END) AS InfoCount,
        COUNT(CASE WHEN al.IsResolved = 0 THEN 1 END) AS TotalUnresolved
       FROM Alerts al
       LEFT JOIN Assets a ON al.AssetID = a.AssetID
       LEFT JOIN Channels c ON a.ChannelID = c.ChannelID
       ${channelId ? 'WHERE c.ChannelID = @channelId' : ''}`,
      channelId ? params : {}
    );

    res.json({ success: true, data: result.recordset, stats: countResult.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// POST /alerts
const create = async (req, res, next) => {
  try {
    const { assetId, alertType, alertCategory, alertMessage, alertSeverity, thresholdValue, currentValue } = req.body;
    if (!alertType || !alertMessage || !alertSeverity) {
      return next(createError('AlertType, alertMessage ve alertSeverity gerekli.', 400));
    }

    const result = await query(
      `INSERT INTO Alerts (AssetID, AlertType, AlertCategory, AlertMessage, AlertSeverity, ThresholdValue, CurrentValue, CreatedBy)
       OUTPUT INSERTED.*
       VALUES (@assetId, @alertType, @alertCategory, @alertMessage, @alertSeverity, @thresholdValue, @currentValue, @createdBy)`,
      {
        assetId: assetId ? parseInt(assetId) : null,
        alertType, alertCategory, alertMessage,
        alertSeverity: parseInt(alertSeverity),
        thresholdValue, currentValue,
        createdBy: req.user?.username || 'system'
      }
    );
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /alerts/:id/resolve
const resolve = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    const result = await query(
      `UPDATE Alerts SET IsResolved = 1, ResolvedTime = GETDATE(), ResolutionNotes = @resolutionNotes, ResolvedByUserID = @userId
       OUTPUT INSERTED.*
       WHERE AlertID = @id`,
      { id: parseInt(id), resolutionNotes, userId: req.user?.userId || null }
    );

    if (!result.recordset[0]) return next(createError('Uyarı bulunamadı.', 404, 'NOT_FOUND'));
    res.json({ success: true, message: 'Uyarı çözüldü.', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /alerts/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM Alerts WHERE AlertID = @id`, { id: parseInt(id) });
    res.json({ success: true, message: 'Uyarı silindi.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getDashboard, create, resolve, remove };
