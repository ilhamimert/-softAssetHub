const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

const ALLOWED_SORT = {
  AssetName:       'a.asset_name',
  AssetType:       'a.asset_type',
  Status:          'a.status',
  CreatedDate:     'a.created_date',
  AssetCode:       'a.asset_code',
  SerialNumber:    'a.serial_number',
  Manufacturer:    'a.manufacturer',
  PurchaseDate:    'a.purchase_date',
  WarrantyEndDate: 'a.warranty_end_date',
  PurchaseCost:    'a.purchase_cost',
  CurrentValue:    'a.current_value',
};
const ALLOWED_ORDER = ['ASC', 'DESC'];

// camelCase body → snake_case column eşlemesi (update için)
const UPDATABLE_FIELDS = {
  roomId:          'room_id',
  channelId:       'channel_id',
  assetGroupId:    'asset_group_id',
  assetName:       'asset_name',
  assetType:       'asset_type',
  assetCode:       'asset_code',
  status:          'status',
  model:           'model',
  serialNumber:    'serial_number',
  manufacturer:    'manufacturer',
  supplier:        'supplier',
  purchaseDate:    'purchase_date',
  warrantyEndDate: 'warranty_end_date',
  warrantyMonths:  'warranty_months',
  purchaseCost:    'purchase_cost',
  currentValue:    'current_value',
  depreciationRate:'depreciation_rate',
  rackPosition:    'rack_position',
  ipAddress:       'ip_address',
  macAddress:      'mac_address',
  firmwareVersion: 'firmware_version',
};

const getAll = async (req, res, next) => {
  try {
    const {
      status, assetType, channelId, roomId,
      manufacturer, model,
      page = 1, limit = 25,
    } = req.query;
    const search = req.query.search ? String(req.query.search).slice(0, 100) : '';
    const sortCol   = ALLOWED_SORT[req.query.sortBy] || 'a.asset_name';
    const sortOrder = ALLOWED_ORDER.includes((req.query.sortOrder || '').toUpperCase())
      ? req.query.sortOrder.toUpperCase() : 'ASC';
    const safeLimit = Math.min(Math.max(parseInt(limit) || 25, 1), 200);
    const safePage = Math.max(parseInt(page) || 1, 1);
    const offset = (safePage - 1) * safeLimit;

    // Admin olmayan kullanıcılar yalnızca kendi kanallarını görebilir
    // channelId null olan non-Admin kullanıcıların tüm varlıkları görmesi engellenir
    const isAdmin = req.user.role === 'Admin';
    const effectiveChannelId = isAdmin
      ? (channelId ? parseInt(channelId) : null)
      : req.user.channelId;

    // Non-Admin ve channelId yoksa: erişim sıfır satır döner (güvenli default)
    if (!isAdmin && !effectiveChannelId) {
      return res.json({ success: true, data: [], pagination: { total: 0, page: parseInt(page), limit: safeLimit, totalPages: 0 } });
    }

    const params = [];
    let idx = 1;
    let where = 'WHERE a.is_active = TRUE';

    if (search) {
      where += ` AND (a.asset_name ILIKE $${idx} OR a.asset_code ILIKE $${idx + 1} OR a.serial_number ILIKE $${idx + 2})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      idx += 3;
    }
    if (status)              { where += ` AND a.status = $${idx++}`;         params.push(status); }
    if (assetType)           { where += ` AND a.asset_type = $${idx++}`;     params.push(assetType); }
    if (effectiveChannelId)  { where += ` AND a.channel_id = $${idx++}`;     params.push(effectiveChannelId); }
    if (roomId)              { where += ` AND a.room_id = $${idx++}`;        params.push(parseInt(roomId)); }
    if (manufacturer) { where += ` AND a.manufacturer ILIKE $${idx++}`; params.push(`%${manufacturer}%`); }
    if (model)        { where += ` AND a.model ILIKE $${idx++}`;      params.push(`%${model}%`); }

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM assets a ${where}`,
      [...params]
    );
    const total = parseInt(countResult.recordset[0].total);

    params.push(safeLimit, offset);

    const result = await query(
      `SELECT a.asset_id, a.asset_name, a.asset_code, a.asset_type, a.model, a.manufacturer,
              a.serial_number, a.status, a.ip_address, a.rack_position,
              a.purchase_date, a.warranty_end_date, a.purchase_cost, a.current_value,
              a.created_date,
              c.channel_name, r.room_name, b.building_name, ag.group_name, ag.group_type,
              m.temperature AS last_temperature,
              m.power_consumption AS last_power_consumption,
              m.is_online
       FROM assets a
       LEFT JOIN channels     c  ON a.channel_id    = c.channel_id
       LEFT JOIN rooms        r  ON a.room_id        = r.room_id
       LEFT JOIN buildings    b  ON r.building_id    = b.building_id
       LEFT JOIN asset_groups ag ON a.asset_group_id = ag.asset_group_id
       LEFT JOIN LATERAL (
         SELECT temperature, power_consumption, is_online
         FROM asset_monitoring m2
         WHERE m2.asset_id = a.asset_id
         ORDER BY m2.monitoring_time DESC LIMIT 1
       ) m ON true
       ${where}
       ORDER BY ${sortCol} ${sortOrder}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    res.json({
      success: true,
      data: result.recordset,
      pagination: {
        total,
        page: parseInt(page),
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    });
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || id <= 0) return next(createError('Geçersiz ID.', 400));
    const result = await query(
      `SELECT a.*,
              c.channel_name, r.room_name, b.building_name, ag.group_name, ag.group_type, h.holding_name,
              lm.temperature, lm.cpu_usage, lm.ram_usage, lm.gpu_usage, lm.disk_usage,
              lm.power_consumption, lm.is_online, lm.performance_score, lm.network_latency,
              lm.monitoring_time AS last_monitoring_time
       FROM assets a
       LEFT JOIN channels    c  ON a.channel_id    = c.channel_id
       LEFT JOIN rooms       r  ON a.room_id        = r.room_id
       LEFT JOIN buildings   b  ON r.building_id    = b.building_id
       LEFT JOIN asset_groups ag ON a.asset_group_id = ag.asset_group_id
       LEFT JOIN holdings    h  ON c.holding_id     = h.holding_id
       LEFT JOIN LATERAL (
         SELECT temperature, cpu_usage, ram_usage, gpu_usage, disk_usage,
                power_consumption, is_online, performance_score, network_latency, monitoring_time
         FROM asset_monitoring m2 WHERE m2.asset_id = a.asset_id
         ORDER BY m2.monitoring_time DESC LIMIT 1
       ) lm ON true
       WHERE a.asset_id = $1 AND a.is_active = TRUE`,
      [id]
    );
    if (!result.recordset[0]) return next(createError('Varlık bulunamadı.', 404));
    // Non-Admin: sadece kendi kanalındaki varlığa erişebilir
    if (req.user.role !== 'Admin') {
      if (!req.user.channelId || result.recordset[0].channelId !== req.user.channelId) {
        return next(createError('Bu varlığa erişim yetkiniz yok.', 403, 'CHANNEL_ACCESS_DENIED'));
      }
    }
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const getTree = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT h.holding_id, h.holding_name, c.channel_id, c.channel_name,
              b.building_id, b.building_name, r.room_id, r.room_name,
              a.asset_id, a.asset_name, a.asset_code, a.asset_type, a.status
       FROM assets a
       JOIN rooms r ON a.room_id = r.room_id
       JOIN buildings b ON r.building_id = b.building_id
       JOIN channels c ON a.channel_id = c.channel_id
       LEFT JOIN holdings h ON c.holding_id = h.holding_id
       WHERE a.asset_id = $1`,
      [parseInt(id)]
    );
    if (!result.recordset[0]) return next(createError('Varlık bulunamadı.', 404));

    // Non-Admin kullanıcılar yalnızca kendi kanallarındaki asset'leri görebilir
    // channelId null olan non-Admin kullanıcıları da engelle
    if (req.user.role !== 'Admin') {
      if (!req.user.channelId || result.recordset[0].channelId !== req.user.channelId) {
        return next(createError('Bu varlığa erişim yetkiniz yok.', 403, 'CHANNEL_ACCESS_DENIED'));
      }
    }

    const comps = await query(
      `SELECT * FROM asset_components WHERE asset_id = $1 AND is_active = TRUE`,
      [parseInt(id)]
    );

    const row = result.recordset[0];
    res.json({
      success: true,
      data: {
        holding:    row.holdingId ? { id: row.holdingId, name: row.holdingName } : null,
        channel:    { id: row.channelId, name: row.channelName },
        building:   { id: row.buildingId, name: row.buildingName },
        room:       { id: row.roomId, name: row.roomName },
        asset:      { id: row.assetId, name: row.assetName, code: row.assetCode, type: row.assetType, status: row.status },
        components: comps.recordset,
      },
    });
  } catch (err) { next(err); }
};

// GET /assets/warranty-expiring?days=90&channelId=1
const getWarrantyExpiring = async (req, res, next) => {
  try {
    const { days = 90, channelId } = req.query;
    const params = [parseInt(days)];
    let channelFilter = '';
    if (channelId) {
      channelFilter = ' AND a.channel_id = $2';
      params.push(parseInt(channelId));
    }

    const result = await query(
      `SELECT a.asset_id, a.asset_name, a.asset_code, a.asset_type,
              a.manufacturer, a.model, a.serial_number,
              a.warranty_end_date, a.status,
              c.channel_name, ag.group_name,
              (a.warranty_end_date::date - CURRENT_DATE) AS days_until_expiry
       FROM assets a
       LEFT JOIN channels     c  ON a.channel_id    = c.channel_id
       LEFT JOIN asset_groups ag ON a.asset_group_id = ag.asset_group_id
       WHERE a.is_active = TRUE
         AND a.warranty_end_date IS NOT NULL
         AND a.warranty_end_date >= CURRENT_DATE
         AND a.warranty_end_date <= (CURRENT_DATE + ($1 || ' days')::INTERVAL)
         ${channelFilter}
       ORDER BY a.warranty_end_date ASC`,
      params
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) { next(err); }
};

// POST /assets/bulk-status  body: { ids: [1,2,3], status: 'Maintenance' }
const bulkUpdateStatus = async (req, res, next) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return next(createError('ids dizisi boş olamaz.', 400));
    const VALID_STATUSES = ['Active', 'Inactive', 'Maintenance', 'Retired', 'Faulty'];
    if (!VALID_STATUSES.includes(status))
      return next(createError(`Geçersiz durum. Geçerli değerler: ${VALID_STATUSES.join(', ')}`, 400));

    const numIds = ids.map(Number);
    const params = [status, numIds];
    let channelFilter = '';
    if (req.user?.role !== 'Admin' && req.user?.channelId) {
      channelFilter = ' AND channel_id = $3';
      params.push(req.user.channelId);
    }

    const result = await query(
      `UPDATE assets SET status = $1
       WHERE asset_id = ANY($2) AND is_active = TRUE${channelFilter}
       RETURNING asset_id, asset_name, status`,
      params
    );
    res.json({ success: true, updated: result.recordset.length, data: result.recordset });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const {
      roomId, channelId, assetGroupId,
      assetName, assetType, assetCode, status = 'Active',
      model, serialNumber, manufacturer, supplier,
      purchaseDate, warrantyEndDate, warrantyMonths,
      purchaseCost, currentValue, depreciationRate,
      rackPosition, ipAddress, macAddress, firmwareVersion,
    } = req.body;

    const result = await query(
      `INSERT INTO assets (
         room_id, channel_id, asset_group_id,
         asset_name, asset_type, asset_code, status,
         model, serial_number, manufacturer, supplier,
         purchase_date, warranty_end_date, warranty_months,
         purchase_cost, current_value, depreciation_rate,
         rack_position, ip_address, mac_address, firmware_version
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
       ) RETURNING *`,
      [
        roomId || null, channelId, assetGroupId || null,
        assetName, assetType, assetCode || null, status,
        model || null, serialNumber || null, manufacturer || null, supplier || null,
        purchaseDate || null, warrantyEndDate || null, warrantyMonths || null,
        purchaseCost || null, currentValue || null, depreciationRate || null,
        rackPosition || null, ipAddress || null, macAddress || null, firmwareVersion || null,
      ]
    );
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

// Dinamik UPDATE — sadece body'de gelen alanlar güncellenir
// null göndererek alanı temizlemek mümkün (COALESCE bug'ı yok)
const update = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || id <= 0) return next(createError('Geçersiz ID.', 400));
    const setClauses = [];
    const params = [];
    let idx = 1;

    for (const [camel, snake] of Object.entries(UPDATABLE_FIELDS)) {
      if (Object.prototype.hasOwnProperty.call(req.body, camel)) {
        setClauses.push(`${snake} = $${idx++}`);
        params.push(req.body[camel] ?? null);
      }
    }

    if (setClauses.length === 0)
      return res.json({ success: true, message: 'Güncellenecek alan yok.' });

    params.push(id);
    const result = await query(
      `UPDATE assets SET ${setClauses.join(', ')}
       WHERE asset_id = $${idx} AND is_active = TRUE
       RETURNING *`,
      params
    );
    if (!result.recordset[0]) return next(createError('Varlık bulunamadı.', 404));
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || id <= 0) return next(createError('Geçersiz ID.', 400));
    const result = await query(
      `UPDATE assets SET is_active = FALSE WHERE asset_id = $1 AND is_active = TRUE RETURNING asset_id`,
      [id]
    );
    if (!result.recordset[0]) return next(createError('Varlık bulunamadı.', 404));
    res.json({ success: true, message: 'Varlık silindi.' });
  } catch (err) { next(err); }
};

// GET /assets/export?format=csv&channelId=&status=&assetType=
const exportCsv = async (req, res, next) => {
  try {
    const { channelId, status, assetType } = req.query;
    const isAdmin = req.user.role === 'Admin';
    const effectiveChannelId = isAdmin
      ? (channelId ? parseInt(channelId) : null)
      : req.user.channelId;

    if (!isAdmin && !effectiveChannelId) {
      return res.status(403).json({ success: false, message: 'Kanal erişimi yok.' });
    }

    const params = [];
    let idx = 1;
    let where = 'WHERE a.is_active = TRUE';
    if (status)             { where += ` AND a.status = $${idx++}`;      params.push(status); }
    if (assetType)          { where += ` AND a.asset_type = $${idx++}`;  params.push(assetType); }
    if (effectiveChannelId) { where += ` AND a.channel_id = $${idx++}`;  params.push(effectiveChannelId); }

    const result = await query(
      `SELECT a.asset_name, a.asset_code, a.asset_type, a.model, a.manufacturer,
              a.serial_number, a.status, a.ip_address, a.mac_address,
              a.purchase_date, a.warranty_end_date, a.purchase_cost, a.current_value,
              a.depreciation_rate, a.rack_position, a.firmware_version,
              c.channel_name, r.room_name, b.building_name, ag.group_name
       FROM assets a
       LEFT JOIN channels     c  ON a.channel_id    = c.channel_id
       LEFT JOIN rooms        r  ON a.room_id        = r.room_id
       LEFT JOIN buildings    b  ON r.building_id    = b.building_id
       LEFT JOIN asset_groups ag ON a.asset_group_id = ag.asset_group_id
       ${where}
       ORDER BY a.asset_name`,
      params
    );

    const COLS = [
      'assetName','assetCode','assetType','model','manufacturer','serialNumber','status',
      'ipAddress','macAddress','purchaseDate','warrantyEndDate','purchaseCost','currentValue',
      'depreciationRate','rackPosition','firmwareVersion','channelName','roomName','buildingName','groupName',
    ];
    const header = COLS.join(',');
    const escape = (v) => {
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = result.recordset.map(r => COLS.map(c => escape(r[c])).join(','));
    const csv = [header, ...rows].join('\r\n');

    const filename = `assets_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM — Excel Türkçe karakter için
  } catch (err) { next(err); }
};

// POST /assets/bulk-import  body: { assets: [ {...}, ... ] }
// Frontend CSV'yi parse edip JSON array olarak gönderir.
const bulkImport = async (req, res, next) => {
  try {
    const { assets } = req.body;
    if (!Array.isArray(assets) || assets.length === 0)
      return next(createError('assets dizisi boş olamaz.', 400));
    if (assets.length > 500)
      return next(createError('Tek seferde en fazla 500 asset import edilebilir.', 400));

    const results = { inserted: 0, errors: [] };

    for (let i = 0; i < assets.length; i++) {
      const a = assets[i];
      if (!a.assetName?.trim() || !a.channelId) {
        results.errors.push({ row: i + 1, message: 'assetName ve channelId zorunludur.' });
        continue;
      }
      try {
        await query(
          `INSERT INTO assets (
             channel_id, asset_group_id, asset_name, asset_type, asset_code, status,
             model, serial_number, manufacturer, supplier,
             purchase_date, warranty_end_date, warranty_months,
             purchase_cost, current_value, depreciation_rate,
             rack_position, ip_address, mac_address, firmware_version
           ) VALUES (
             $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
           )`,
          [
            parseInt(a.channelId), a.assetGroupId ? parseInt(a.assetGroupId) : null,
            a.assetName.trim(), a.assetType || 'Other', a.assetCode || null, a.status || 'Active',
            a.model || null, a.serialNumber || null, a.manufacturer || null, a.supplier || null,
            a.purchaseDate || null, a.warrantyEndDate || null, a.warrantyMonths ? parseInt(a.warrantyMonths) : null,
            a.purchaseCost ? parseFloat(a.purchaseCost) : null,
            a.currentValue ? parseFloat(a.currentValue) : null,
            a.depreciationRate ? parseFloat(a.depreciationRate) : null,
            a.rackPosition || null, a.ipAddress || null, a.macAddress || null,
            a.firmwareVersion || null,
          ]
        );
        results.inserted++;
      } catch (err) {
        results.errors.push({ row: i + 1, message: err.message });
      }
    }

    res.status(201).json({
      success: true,
      message: `${results.inserted} asset eklendi, ${results.errors.length} hata.`,
      inserted: results.inserted,
      errors: results.errors,
    });
  } catch (err) { next(err); }
};

module.exports = {
  getAll, getById, getTree,
  getWarrantyExpiring, bulkUpdateStatus,
  create, update, remove,
  exportCsv, bulkImport,
};
