const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// GET /licenses?search=&status=&assetId=
const getAll = async (req, res, next) => {
  try {
    const { search, status, assetId } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(l.application_name ILIKE $${idx} OR l.license_key ILIKE $${idx + 1})`);
      params.push(`%${search}%`, `%${search}%`);
      idx += 2;
    }
    if (status === 'active')   { conditions.push('l.is_active = TRUE'); }
    if (status === 'inactive') { conditions.push('l.is_active = FALSE'); }
    if (status === 'expired')  { conditions.push('l.expiry_date < CURRENT_DATE'); }
    if (status === 'expiring') {
      conditions.push(`l.expiry_date >= CURRENT_DATE AND l.expiry_date <= (NOW() + INTERVAL '60 days')`);
    }
    if (assetId) {
      conditions.push(`l.asset_id = $${idx}`);
      params.push(parseInt(assetId));
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT l.*, a.asset_name, a.mac_address AS asset_mac_address,
              (l.expiry_date::date - CURRENT_DATE) AS days_left
       FROM licenses l
       JOIN assets a ON a.asset_id = l.asset_id
       ${where}
       ORDER BY l.expiry_date ASC, l.created_date DESC`,
      params
    );
    res.json({ success: true, data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
};

// GET /assets/:assetId/licenses
const getByAsset = async (req, res, next) => {
  try {
    const assetId = parseInt(req.params.assetId);
    if (!assetId) return next(createError('Geçersiz assetId.', 400));

    const result = await query(
      `SELECT * FROM licenses WHERE asset_id = $1 ORDER BY created_date DESC`,
      [assetId]
    );
    res.json({ success: true, data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
};

// GET /licenses/:id
const getById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const result = await query(
      `SELECT l.*, a.mac_address AS asset_mac_address
       FROM licenses l
       JOIN assets a ON a.asset_id = l.asset_id
       WHERE l.license_id = $1`,
      [id]
    );
    if (!result.recordset[0]) return next(createError('Lisans bulunamadı.', 404, 'NOT_FOUND'));
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// POST /licenses
const create = async (req, res, next) => {
  try {
    const {
      assetId,
      applicationName,
      licenseKey,
      macId,
      expiryDate,
      featureFlags,
      description,
      isActive,
      externalLicenseUrl,
    } = req.body;

    if (!assetId || !applicationName?.trim()) {
      return next(createError('assetId ve applicationName zorunludur.', 400));
    }

    let resolvedMacId = macId || null;
    if (!resolvedMacId) {
      const assetRes = await query(
        `SELECT mac_address FROM assets WHERE asset_id = $1 AND is_active = TRUE`,
        [parseInt(assetId)]
      );
      resolvedMacId = assetRes.recordset[0]?.macAddress || null;
    }

    const flagsJson = Array.isArray(featureFlags) && featureFlags.length > 0
      ? JSON.stringify(featureFlags)
      : null;

    const result = await query(
      `INSERT INTO licenses
         (asset_id, application_name, license_key, mac_id, expiry_date, feature_flags,
          description, is_active, external_license_url, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        parseInt(assetId),
        applicationName.trim(),
        licenseKey?.trim() || null,
        resolvedMacId,
        expiryDate || null,
        flagsJson,
        description?.trim() || null,
        isActive !== undefined ? isActive : true,
        externalLicenseUrl?.trim() || null,
        req.user?.userId || null,
      ]
    );

    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /licenses/:id
const update = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const {
      applicationName,
      licenseKey,
      macId,
      expiryDate,
      featureFlags,
      description,
      isActive,
      externalLicenseUrl,
    } = req.body;

    const flagsJson = Array.isArray(featureFlags)
      ? JSON.stringify(featureFlags)
      : featureFlags !== undefined ? featureFlags : undefined;

    const result = await query(
      `UPDATE licenses SET
         application_name    = COALESCE($1, application_name),
         license_key         = CASE WHEN $2::boolean THEN $3 ELSE license_key END,
         mac_id              = CASE WHEN $4::boolean THEN $5 ELSE mac_id END,
         expiry_date         = CASE WHEN $6::boolean THEN $7 ELSE expiry_date END,
         feature_flags       = CASE WHEN $8::boolean THEN $9 ELSE feature_flags END,
         description         = COALESCE($10, description),
         is_active           = COALESCE($11, is_active),
         external_license_url = COALESCE($12, external_license_url),
         updated_date        = NOW()
       WHERE license_id = $13
       RETURNING *`,
      [
        applicationName?.trim() || null,
        licenseKey !== undefined,      licenseKey?.trim() || null,
        macId !== undefined,           macId?.trim() || null,
        expiryDate !== undefined,      expiryDate || null,
        flagsJson !== undefined,       flagsJson !== undefined ? flagsJson : null,
        description?.trim() || null,
        isActive !== undefined ? isActive : null,
        externalLicenseUrl?.trim() || null,
        id,
      ]
    );

    if (!result.recordset[0]) return next(createError('Lisans bulunamadı.', 404, 'NOT_FOUND'));
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /licenses/:id
const remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const check = await query(
      `SELECT license_id FROM licenses WHERE license_id = $1`,
      [id]
    );
    if (!check.recordset[0]) return next(createError('Lisans bulunamadı.', 404, 'NOT_FOUND'));

    await query(`DELETE FROM licenses WHERE license_id = $1`, [id]);
    res.json({ success: true, message: 'Lisans silindi.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getByAsset, getById, create, update, remove };
