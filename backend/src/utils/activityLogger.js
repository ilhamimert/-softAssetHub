const { query } = require('../config/database');

/**
 * activity_log tablosuna kayıt yazar.
 * @param {object} req         — Express request (user + ip bilgisi için)
 * @param {string} action      — 'create' | 'update' | 'delete' | 'login' | 'logout' vb.
 * @param {string} entityType  — 'asset' | 'maintenance' | 'alert' | 'license' | 'user' | 'building' | 'room' | 'assetgroup'
 * @param {number|null} entityId
 * @param {string|null} oldValue
 * @param {string|null} newValue
 */
async function logActivity(req, action, entityType, entityId = null, oldValue = null, newValue = null) {
  try {
    const userId = req.user?.userId ?? null;
    const ip = req.ip ?? req.headers['x-forwarded-for'] ?? null;
    await query(
      `INSERT INTO activity_log (user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, action, entityType, entityId, oldValue, newValue, ip, req.headers['user-agent'] ?? null]
    );
  } catch {
    // Log yazma hatası ana isteği engellememeli
  }
}

module.exports = { logActivity };
