const { query, withTransaction } = require('../config/database');
// Status değişince asset status'unu senkronize eden yardımcı
async function syncAssetStatus(txQuery, assetId, newStatus) {
  if (newStatus === 'Completed' || newStatus === 'Cancelled') {
    await txQuery(
      `UPDATE assets SET status = 'Active', updated_date = NOW()
       WHERE asset_id = $1 AND status = 'Maintenance'`,
      [assetId]
    );
  } else if (newStatus === 'Scheduled' || newStatus === 'Pending') {
    await txQuery(
      `UPDATE assets SET status = 'Maintenance', updated_date = NOW()
       WHERE asset_id = $1`,
      [assetId]
    );
  }
}
const { createError } = require('../middleware/errorHandler');

// GET /assets/:assetId/maintenance
const getByAsset = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const result = await query(
      `SELECT * FROM maintenance_records WHERE asset_id = $1 AND is_active = TRUE ORDER BY maintenance_date DESC LIMIT 500`,
      [parseInt(assetId)]
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
      `SELECT m.*, a.asset_name, a.asset_code FROM maintenance_records m
       JOIN assets a ON m.asset_id = a.asset_id
       WHERE m.maintenance_id = $1 AND m.is_active = TRUE`,
      [parseInt(id)]
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

    const VALID_MAINTENANCE_TYPES = ['Preventive', 'Corrective', 'Predictive', 'Emergency', 'Routine', 'Other'];
    if (maintenanceType && !VALID_MAINTENANCE_TYPES.includes(maintenanceType)) {
      return next(createError(`Geçersiz bakım tipi. Geçerli değerler: ${VALID_MAINTENANCE_TYPES.join(', ')}`, 400));
    }

    const s = status || 'Completed';

    const record = await withTransaction(async (txQuery) => {
      const result = await txQuery(
        `INSERT INTO maintenance_records (asset_id, maintenance_date, maintenance_type, description,
          technician_name, technician_email, cost_amount, status,
          next_maintenance_date, maintenance_interval, document_url, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          parseInt(assetId), maintenanceDate, maintenanceType, description,
          technicianName, technicianEmail, costAmount, s,
          nextMaintenanceDate, maintenanceInterval, documentURL, notes
        ]
      );

      if (s === 'Completed') {
        await txQuery(
          `UPDATE assets SET status = 'Active', updated_date = NOW() WHERE asset_id = $1 AND status = 'Maintenance'`,
          [parseInt(assetId)]
        );
      } else if (s === 'Scheduled' || s === 'Pending') {
        await txQuery(
          `UPDATE assets SET status = 'Maintenance', updated_date = NOW() WHERE asset_id = $1`,
          [parseInt(assetId)]
        );
      }

      return result.recordset[0];
    });

    res.status(201).json({ success: true, message: 'Bakım kaydı oluşturuldu.', data: record });
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

    const record = await withTransaction(async (txQuery) => {
      const result = await txQuery(
        `UPDATE maintenance_records SET
          maintenance_date      = COALESCE($1, maintenance_date),
          maintenance_type      = COALESCE($2, maintenance_type),
          description           = COALESCE($3, description),
          technician_name       = COALESCE($4, technician_name),
          technician_email      = COALESCE($5, technician_email),
          cost_amount           = COALESCE($6, cost_amount),
          status                = COALESCE($7, status),
          next_maintenance_date = COALESCE($8, next_maintenance_date),
          maintenance_interval  = COALESCE($9, maintenance_interval),
          document_url          = COALESCE($10, document_url),
          notes                 = COALESCE($11, notes),
          updated_date          = NOW()
         WHERE maintenance_id = $12
         RETURNING *`,
        [
          maintenanceDate, maintenanceType, description, technicianName,
          technicianEmail, costAmount, status, nextMaintenanceDate,
          maintenanceInterval, documentURL, notes, parseInt(id)
        ]
      );

      const row = result.recordset[0];
      if (!row) return null;

      // Status değiştiyse asset'in durumunu senkronize et
      if (status) {
        await syncAssetStatus(txQuery, row.assetId, status);
      }

      return row;
    });

    if (!record) return next(createError('Bakım kaydı bulunamadı.', 404, 'NOT_FOUND'));
    res.json({ success: true, message: 'Bakım kaydı güncellendi.', data: record });
  } catch (err) {
    next(err);
  }
};

// DELETE /maintenance/:id
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE maintenance_records SET is_active = FALSE WHERE maintenance_id = $1 AND is_active = TRUE RETURNING maintenance_id`,
      [parseInt(id)]
    );
    if (!result.recordset.length) return next(createError('Bakım kaydı bulunamadı.', 404, 'NOT_FOUND'));
    res.json({ success: true, message: 'Bakım kaydı silindi.' });
  } catch (err) {
    next(err);
  }
};

// GET /maintenance/scheduled
const getScheduled = async (req, res, next) => {
  try {
    const { days = 30, channelId } = req.query;
    const params = [parseInt(days)];
    let channelFilter = '';

    if (channelId) {
      params.push(parseInt(channelId));
      channelFilter = `AND c.channel_id = $${params.length}`;
    }

    const result = await query(
      `SELECT m.*, a.asset_name, a.asset_code, c.channel_name, ag.group_name,
        EXTRACT(DAY FROM (COALESCE(m.next_maintenance_date, m.maintenance_date) - CURRENT_DATE))::int AS "daysUntilMaintenance"
       FROM maintenance_records m
       JOIN assets a ON m.asset_id = a.asset_id
       LEFT JOIN asset_groups ag ON a.asset_group_id = ag.asset_group_id
       JOIN channels c ON a.channel_id = c.channel_id
       WHERE m.is_active = TRUE
         AND COALESCE(m.next_maintenance_date, m.maintenance_date) <= (CURRENT_DATE + ($1 || ' days')::INTERVAL)
         AND COALESCE(m.next_maintenance_date, m.maintenance_date) >= (CURRENT_DATE - ($1 || ' days')::INTERVAL)
         ${channelFilter}
       ORDER BY COALESCE(m.next_maintenance_date, m.maintenance_date) ASC`,
      params
    );
    res.json({ success: true, data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
};

module.exports = { getByAsset, getById, create, update, remove, getScheduled };
