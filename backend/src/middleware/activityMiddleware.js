const { query } = require('../config/database');

// Endpoint'ten entity_type çıkar
function resolveEntityType(path) {
  if (path.includes('/assets/bulk'))    return 'asset';
  if (path.includes('/assets'))         return 'asset';
  if (path.includes('/components'))     return 'component';
  if (path.includes('/maintenance'))    return 'maintenance';
  if (path.includes('/alerts'))         return 'alert';
  if (path.includes('/licenses'))       return 'license';
  if (path.includes('/buildings'))      return 'building';
  if (path.includes('/rooms'))          return 'room';
  if (path.includes('/assetgroups') || path.includes('/groups')) return 'assetgroup';
  if (path.includes('/channels'))       return 'channel';
  if (path.includes('/holdings'))       return 'holding';
  if (path.includes('/users'))          return 'user';
  if (path.includes('/reports'))        return 'report';
  if (path.includes('/hierarchy'))      return 'hierarchy';
  return 'system';
}

// HTTP method → action
function resolveAction(method, path) {
  if (method === 'DELETE') return 'delete';
  if (method === 'PUT' || method === 'PATCH') {
    if (path.includes('/resolve'))      return 'resolve';
    if (path.includes('/bulk-resolve')) return 'bulk_resolve';
    if (path.includes('/bulk-status'))  return 'status_change';
    if (path.includes('/password'))     return 'password_change';
    return 'update';
  }
  if (method === 'POST') {
    if (path.includes('/bulk-import'))  return 'bulk_import';
    if (path.includes('/bulk-resolve')) return 'bulk_resolve';
    if (path.includes('/logout'))       return 'logout';
    if (path.includes('/login'))        return 'login';
    return 'create';
  }
  return method.toLowerCase();
}

// URL'den entity_id çıkar  (örn: /assets/42 → 42)
function resolveEntityId(path) {
  const match = path.match(/\/(\d+)(?:\/|$)/);
  return match ? parseInt(match[1]) : null;
}

// Loglanmayacak endpoint'ler (derleme zamanı regex — Array.some'dan daha hızlı)
const SKIP_RE = /\/auth\/me|\/auth\/refresh|\/logs\/|\/monitoring\/|\/analytics\/|\/assets\/export|\/assets\/warranty|\/assets\/qrcode|\/maintenance\/scheduled|\/alerts\/dashboard|\/assets\/tree/;

/**
 * Sadece mutating (POST/PUT/PATCH/DELETE) ve başarılı (2xx) istekleri loglar.
 * Auth controller kendi loginini zaten logluyor — burada atlanır.
 */
function activityLogger(req, res, next) {
  const method = req.method;
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next();

  const path = req.path;
  if (SKIP_RE.test(path)) return next();
  // Auth login/logout zaten authController'da loglanıyor
  if (path.includes('/auth/')) return next();

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const entityType = resolveEntityType(path);
      const action     = resolveAction(method, path);
      const entityId   = resolveEntityId(path) ?? body?.data?.id ?? body?.data?.assetId ?? body?.data?.maintenanceId ?? null;
      const userId     = req.user?.userId ?? null;
      const ip         = req.ip ?? req.headers['x-forwarded-for'] ?? null;

      query(
        `INSERT INTO activity_log (user_id, action, entity_type, entity_id, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, action, entityType, entityId, ip, req.headers['user-agent'] ?? null]
      ).catch(() => {}); // hata ana isteği etkilemesin
    }
    return originalJson(body);
  };

  next();
}

module.exports = { activityLogger };
