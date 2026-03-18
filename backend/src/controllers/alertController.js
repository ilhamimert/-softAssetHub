const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// GET /alerts
const getAll = async (req, res, next) => {
  try {
    const { severity, alertType, isResolved, channelId, assetId, page = 1, limit = 50 } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
    const offset = (parseInt(page) - 1) * safeLimit;
    const params = [];
    let idx = 1;
    let whereClause = 'WHERE 1=1';

    if (severity !== undefined) {
      whereClause += ` AND al.alert_severity = $${idx++}`;
      params.push(parseInt(severity));
    }
    if (alertType) {
      whereClause += ` AND al.alert_type = $${idx++}`;
      params.push(alertType);
    }
    if (isResolved !== undefined) {
      whereClause += ` AND al.is_resolved = $${idx++}`;
      params.push(isResolved === '1' || isResolved === 'true');
    }
    if (channelId) {
      whereClause += ` AND c.channel_id = $${idx++}`;
      params.push(parseInt(channelId));
    }
    if (assetId) {
      whereClause += ` AND al.asset_id = $${idx++}`;
      params.push(parseInt(assetId));
    }

    params.push(safeLimit, offset);

    const result = await query(
      `SELECT al.*, a.asset_name, a.asset_code, c.channel_name, ag.group_name
       FROM alerts al
       LEFT JOIN assets a ON al.asset_id = a.asset_id
       LEFT JOIN asset_groups ag ON a.asset_group_id = ag.asset_group_id
       LEFT JOIN channels c ON a.channel_id = c.channel_id
       ${whereClause}
       ORDER BY al.triggered_time DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    const countParams = params.slice(0, params.length - 2); // remove limit and offset
    const countResult = await query(
      `SELECT COUNT(*) as total FROM alerts al
       LEFT JOIN assets a ON al.asset_id = a.asset_id
       LEFT JOIN channels c ON a.channel_id = c.channel_id
       ${whereClause}`,
      countParams
    );
    const total = parseInt(countResult.recordset[0].total);

    res.json({
      success: true,
      data: result.recordset,
      pagination: {
        total,
        page: parseInt(page),
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit)
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /alerts/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const { channelId, limit = 20 } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const params = [];
    let whereClause = 'WHERE al.is_resolved = FALSE';

    if (channelId) {
      params.push(parseInt(channelId));
      whereClause += ` AND c.channel_id = $1`;
    }

    const result = await query(
      `SELECT al.*, a.asset_name, a.asset_code, c.channel_name, ag.group_name
       FROM alerts al
       LEFT JOIN assets a ON al.asset_id = a.asset_id
       LEFT JOIN asset_groups ag ON a.asset_group_id = ag.asset_group_id
       LEFT JOIN channels c ON a.channel_id = c.channel_id
       ${whereClause}
       ORDER BY al.alert_severity DESC, al.triggered_time DESC
       LIMIT ${safeLimit}`,
      params
    );

    const countResult = await query(
      `SELECT
        SUM(CASE WHEN al.alert_type = 'Critical' AND al.is_resolved = FALSE THEN 1 ELSE 0 END) AS critical_count,
        SUM(CASE WHEN al.alert_type = 'Warning'  AND al.is_resolved = FALSE THEN 1 ELSE 0 END) AS warning_count,
        SUM(CASE WHEN al.alert_type = 'Info'     AND al.is_resolved = FALSE THEN 1 ELSE 0 END) AS info_count,
        COUNT(CASE WHEN al.is_resolved = FALSE THEN 1 END) AS total_unresolved
       FROM alerts al
       LEFT JOIN assets a ON al.asset_id = a.asset_id
       LEFT JOIN channels c ON a.channel_id = c.channel_id
       ${channelId ? 'WHERE c.channel_id = $1' : ''}`,
      channelId ? [parseInt(channelId)] : []
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
      `INSERT INTO alerts (asset_id, alert_type, alert_category, alert_message, alert_severity, threshold_value, current_value, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        assetId ? parseInt(assetId) : null,
        alertType, alertCategory, alertMessage,
        parseInt(alertSeverity),
        thresholdValue, currentValue,
        req.user?.username || 'system'
      ]
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
      `UPDATE alerts SET is_resolved = TRUE, resolved_time = NOW(),
         resolution_notes = $1, resolved_by_user_id = $2
       WHERE alert_id = $3
       RETURNING *`,
      [resolutionNotes, req.user?.userId || null, parseInt(id)]
    );

    if (!result.recordset[0]) return next(createError('Uyarı bulunamadı.', 404, 'NOT_FOUND'));
    res.json({ success: true, message: 'Uyarı çözüldü.', data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// POST /alerts/bulk-resolve
const bulkResolve = async (req, res, next) => {
  try {
    const { ids, resolutionNotes = 'Toplu çözüm' } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return next(createError('ids dizisi gerekli.', 400));

    await query(
      `UPDATE alerts SET is_resolved = TRUE, resolved_time = NOW(),
         resolution_notes = $1, resolved_by_user_id = $2
       WHERE alert_id = ANY($3) AND is_resolved = FALSE`,
      [resolutionNotes, req.user?.userId || null, ids.map(Number)]
    );
    res.json({ success: true, message: `${ids.length} uyarı çözüldü.` });
  } catch (err) { next(err); }
};

// DELETE /alerts/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM alerts WHERE alert_id = $1`, [parseInt(id)]);
    res.json({ success: true, message: 'Uyarı silindi.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getDashboard, create, resolve, bulkResolve, remove };
