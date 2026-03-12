const { query } = require('../config/database');
const createError = require('http-errors');

// channel_name artık assets → channels üzerinden join edilir
// (asset_components.channel_id Migration 004'te kaldırıldı)

// GET /assets/:assetId/components
const getByAsset = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const result = await query(
      `SELECT c.*, a.asset_name, ag.group_name, ch.channel_name
       FROM asset_components c
       JOIN assets       a  ON a.asset_id       = c.asset_id
       LEFT JOIN asset_groups ag ON ag.asset_group_id = c.asset_group_id
       JOIN channels     ch ON ch.channel_id    = a.channel_id
       WHERE c.asset_id = $1 AND c.is_active = TRUE
       ORDER BY c.component_type, c.component_name`,
      [parseInt(assetId)]
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

// GET /components/:id
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT c.*, a.asset_name, a.asset_code, ag.group_name, ag.group_type, ch.channel_name
       FROM asset_components c
       JOIN assets       a  ON a.asset_id       = c.asset_id
       LEFT JOIN asset_groups ag ON ag.asset_group_id = c.asset_group_id
       JOIN channels     ch ON ch.channel_id    = a.channel_id
       WHERE c.component_id = $1 AND c.is_active = TRUE`,
      [parseInt(id)]
    );
    if (!result.recordset.length) return next(createError(404, 'Eklenti bulunamadı'));
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// POST /components  (Technician+)
const create = async (req, res, next) => {
  try {
    const {
      assetId, componentName, componentType,
      model, serialNumber, manufacturer, specifications,
      purchaseDate, warrantyEndDate, notes,
    } = req.body;

    if (!assetId || !componentName || !componentType) {
      return next(createError(400, 'assetId, componentName ve componentType zorunludur'));
    }

    const assetResult = await query(
      `SELECT asset_id, asset_group_id FROM assets WHERE asset_id = $1 AND is_active = TRUE`,
      [parseInt(assetId)]
    );
    if (!assetResult.recordset.length) return next(createError(404, 'Varlık bulunamadı'));

    const { assetGroupId } = assetResult.recordset[0];

    const result = await query(
      `INSERT INTO asset_components
         (asset_id, asset_group_id, component_name, component_type,
          model, serial_number, manufacturer, specifications, purchase_date, warranty_end_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING component_id`,
      [
        parseInt(assetId), assetGroupId, componentName, componentType,
        model || null, serialNumber || null, manufacturer || null,
        specifications || null, purchaseDate || null, warrantyEndDate || null, notes || null,
      ]
    );

    const newId = result.recordset[0].componentId;
    const newComp = await query(
      `SELECT c.*, a.asset_name, ag.group_name, ch.channel_name
       FROM asset_components c
       JOIN assets       a  ON a.asset_id       = c.asset_id
       LEFT JOIN asset_groups ag ON ag.asset_group_id = c.asset_group_id
       JOIN channels     ch ON ch.channel_id    = a.channel_id
       WHERE c.component_id = $1`,
      [newId]
    );
    res.status(201).json({ success: true, data: newComp.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /components/:id  (Technician+)
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      componentName, componentType, model, serialNumber,
      manufacturer, specifications, purchaseDate, warrantyEndDate, status, notes,
    } = req.body;

    const exists = await query(
      `SELECT component_id FROM asset_components WHERE component_id = $1 AND is_active = TRUE`,
      [parseInt(id)]
    );
    if (!exists.recordset.length) return next(createError(404, 'Eklenti bulunamadı'));

    await query(
      `UPDATE asset_components SET
         component_name    = COALESCE($1, component_name),
         component_type    = COALESCE($2, component_type),
         model             = COALESCE($3, model),
         serial_number     = COALESCE($4, serial_number),
         manufacturer      = COALESCE($5, manufacturer),
         specifications    = COALESCE($6, specifications),
         purchase_date     = COALESCE($7, purchase_date),
         warranty_end_date = COALESCE($8, warranty_end_date),
         status            = COALESCE($9, status),
         notes             = COALESCE($10, notes)
       WHERE component_id = $11`,
      [
        componentName || null, componentType || null, model || null, serialNumber || null,
        manufacturer || null, specifications || null, purchaseDate || null,
        warrantyEndDate || null, status || null, notes || null, parseInt(id),
      ]
    );
    const updated = await query(
      `SELECT c.*, a.asset_name, ag.group_name, ch.channel_name
       FROM asset_components c
       JOIN assets       a  ON a.asset_id       = c.asset_id
       LEFT JOIN asset_groups ag ON ag.asset_group_id = c.asset_group_id
       JOIN channels     ch ON ch.channel_id    = a.channel_id
       WHERE c.component_id = $1`,
      [parseInt(id)]
    );
    res.json({ success: true, data: updated.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /components/:id  (Manager+)
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exists = await query(
      `SELECT component_id FROM asset_components WHERE component_id = $1 AND is_active = TRUE`,
      [parseInt(id)]
    );
    if (!exists.recordset.length) return next(createError(404, 'Eklenti bulunamadı'));

    await query(
      `UPDATE asset_components SET is_active = FALSE WHERE component_id = $1`,
      [parseInt(id)]
    );
    res.json({ success: true, message: 'Eklenti silindi' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getByAsset, getById, create, update, remove };
