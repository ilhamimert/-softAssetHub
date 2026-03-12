const { query } = require('../config/database');
const createError = require('http-errors');

// GET /holdings
const getAll = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT h.holding_id, h.holding_name, h.description, h.website, h.contact_email,
             h.logo_url, h.created_date, h.updated_date, h.is_active,
             COUNT(DISTINCT c.channel_id) AS channel_count,
             COUNT(DISTINCT a.asset_id)   AS total_assets
      FROM holdings h
      LEFT JOIN channels c ON c.holding_id = h.holding_id AND c.is_active = TRUE
      LEFT JOIN assets   a ON a.channel_id = c.channel_id  AND a.is_active = TRUE
      WHERE h.is_active = TRUE
      GROUP BY h.holding_id, h.holding_name, h.description, h.website,
               h.contact_email, h.logo_url, h.created_date, h.updated_date, h.is_active
      ORDER BY h.holding_name
    `);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

// GET /holdings/:id
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT h.*,
              COUNT(DISTINCT c.channel_id) AS channel_count,
              COUNT(DISTINCT a.asset_id)   AS total_assets
       FROM holdings h
       LEFT JOIN channels c ON c.holding_id = h.holding_id AND c.is_active = TRUE
       LEFT JOIN assets   a ON a.channel_id = c.channel_id  AND a.is_active = TRUE
       WHERE h.holding_id = $1 AND h.is_active = TRUE
       GROUP BY h.holding_id, h.holding_name, h.description, h.website,
                h.contact_email, h.logo_url, h.created_date, h.updated_date, h.is_active`,
      [parseInt(id)]
    );
    if (!result.recordset.length) return next(createError(404, 'Holding bulunamadı'));

    const channels = await query(
      `SELECT channel_id, channel_name, is_active FROM channels WHERE holding_id = $1 AND is_active = TRUE`,
      [parseInt(id)]
    );
    const holding = result.recordset[0];
    holding.channels = channels.recordset;
    res.json({ success: true, data: holding });
  } catch (err) {
    next(err);
  }
};

// POST /holdings  (Admin only)
const create = async (req, res, next) => {
  try {
    const { holdingName, description, website, contactEmail, logoUrl } = req.body;
    if (!holdingName) return next(createError(400, 'holdingName zorunludur'));

    const result = await query(
      `INSERT INTO holdings (holding_name, description, website, contact_email, logo_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING holding_id`,
      [holdingName, description || null, website || null, contactEmail || null, logoUrl || null]
    );
    const newId = result.recordset[0].holdingId;
    const newHolding = await query(`SELECT * FROM holdings WHERE holding_id = $1`, [newId]);
    res.status(201).json({ success: true, data: newHolding.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /holdings/:id  (Admin only)
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { holdingName, description, website, contactEmail, logoUrl } = req.body;

    const exists = await query(
      `SELECT holding_id FROM holdings WHERE holding_id = $1 AND is_active = TRUE`,
      [parseInt(id)]
    );
    if (!exists.recordset.length) return next(createError(404, 'Holding bulunamadı'));

    await query(
      `UPDATE holdings SET
         holding_name  = COALESCE($1, holding_name),
         description   = COALESCE($2, description),
         website       = COALESCE($3, website),
         contact_email = COALESCE($4, contact_email),
         logo_url      = COALESCE($5, logo_url),
         updated_date  = NOW()
       WHERE holding_id = $6`,
      [holdingName || null, description || null, website || null, contactEmail || null, logoUrl || null, parseInt(id)]
    );
    const updated = await query(`SELECT * FROM holdings WHERE holding_id = $1`, [parseInt(id)]);
    res.json({ success: true, data: updated.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /holdings/:id  (Admin only - soft delete)
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exists = await query(
      `SELECT holding_id FROM holdings WHERE holding_id = $1 AND is_active = TRUE`,
      [parseInt(id)]
    );
    if (!exists.recordset.length) return next(createError(404, 'Holding bulunamadı'));

    await query(
      `UPDATE holdings SET is_active = FALSE, updated_date = NOW() WHERE holding_id = $1`,
      [parseInt(id)]
    );
    res.json({ success: true, message: 'Holding silindi' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getById, create, update, remove };
