const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// GET /license-requests
const getAll = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit) || 20);
    const safeLimit = Math.min(100, parseInt(limit) || 20);

    const params = [];
    let where = '';

    // Admin/Manager görür hepsini, diğerleri sadece kendi taleplerini
    if (!['Admin', 'Manager'].includes(req.user.role)) {
      params.push(req.user.userId);
      where += `WHERE lr.requested_by = $${params.length}`;
    }

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      params.push(status);
      where += where ? ` AND lr.status = $${params.length}` : `WHERE lr.status = $${params.length}`;
    }

    params.push(safeLimit, offset);

    const result = await query(
      `SELECT lr.*,
              a.asset_name,
              u1.username AS requester_name,
              u2.username AS reviewer_name
       FROM license_requests lr
       JOIN assets a ON lr.asset_id = a.asset_id
       JOIN users  u1 ON lr.requested_by = u1.user_id
       LEFT JOIN users u2 ON lr.reviewed_by = u2.user_id
       ${where}
       ORDER BY lr.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

// POST /license-requests
const create = async (req, res, next) => {
  try {
    const { assetId, licenseType, quantity = 1, reason } = req.body;

    if (!assetId || !licenseType?.trim()) {
      return next(createError('assetId ve licenseType zorunlu.', 400, 'VALIDATION_ERROR'));
    }
    if (quantity < 1) {
      return next(createError('Miktar en az 1 olmalı.', 400, 'VALIDATION_ERROR'));
    }

    const result = await query(
      `INSERT INTO license_requests (asset_id, requested_by, license_type, quantity, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [parseInt(assetId), req.user.userId, licenseType.trim(), parseInt(quantity), reason?.trim() || null]
    );

    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// PATCH /license-requests/:id/review
const review = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reviewNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return next(createError("status 'approved' veya 'rejected' olmalı.", 400, 'VALIDATION_ERROR'));
    }

    const existing = await query(
      'SELECT request_id, status FROM license_requests WHERE request_id = $1',
      [parseInt(id)]
    );
    if (!existing.recordset[0]) {
      return next(createError('Talep bulunamadı.', 404, 'NOT_FOUND'));
    }
    if (existing.recordset[0].status !== 'pending') {
      return next(createError('Sadece bekleyen talepler incelenebilir.', 409, 'CONFLICT'));
    }

    const result = await query(
      `UPDATE license_requests
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_note = $3, updated_at = NOW()
       WHERE request_id = $4
       RETURNING *`,
      [status, req.user.userId, reviewNote?.trim() || null, parseInt(id)]
    );

    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, create, review };
