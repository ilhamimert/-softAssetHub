const QRCode = require('qrcode');
const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// GET /assets/:id/qrcode?format=png|svg|dataurl
// Döndürür: asset bilgilerini kodlayan QR (PNG binary veya SVG string)
const getAssetQR = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (!id || id <= 0) return next(createError('Geçersiz ID.', 400));

    const result = await query(
      `SELECT asset_id, asset_name, asset_code, asset_type, serial_number,
              manufacturer, model, ip_address, status
       FROM assets WHERE asset_id = $1 AND is_active = TRUE`,
      [id]
    );
    const asset = result.recordset[0];
    if (!asset) return next(createError('Varlık bulunamadı.', 404));

    // Non-Admin: sadece kendi kanalındaki asset'e erişebilir
    if (req.user.role !== 'Admin' && req.user.channelId) {
      const chk = await query(
        `SELECT channel_id FROM assets WHERE asset_id = $1`,
        [id]
      );
      if (chk.recordset[0]?.channelId !== req.user.channelId) {
        return next(createError('Bu varlığa erişim yetkiniz yok.', 403, 'CHANNEL_ACCESS_DENIED'));
      }
    }

    // QR içeriği: asset özet JSON
    const payload = JSON.stringify({
      id:           asset.assetId,
      name:         asset.assetName,
      code:         asset.assetCode,
      type:         asset.assetType,
      serial:       asset.serialNumber,
      manufacturer: asset.manufacturer,
      model:        asset.model,
      ip:           asset.ipAddress,
      status:       asset.status,
    });

    const format = (req.query.format || 'png').toLowerCase();

    if (format === 'svg') {
      const svg = await QRCode.toString(payload, { type: 'svg', margin: 2 });
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    }

    if (format === 'dataurl') {
      const dataUrl = await QRCode.toDataURL(payload, { margin: 2, scale: 4 });
      return res.json({ success: true, dataUrl, assetName: asset.assetName });
    }

    // Default: PNG buffer
    const buffer = await QRCode.toBuffer(payload, { type: 'png', margin: 2, scale: 4 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="asset-${id}-qr.png"`);
    res.send(buffer);
  } catch (err) { next(err); }
};

module.exports = { getAssetQR };
