const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// GET /monitoring/:assetId/current
const getCurrent = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const result = await query(
      `SELECT m.*, a.asset_name, a.asset_type, a.status,
              ag.group_name, ag.group_type, c.channel_name
       FROM asset_monitoring m
       JOIN assets      a  ON m.asset_id      = a.asset_id
       JOIN asset_groups ag ON a.asset_group_id = ag.asset_group_id
       JOIN channels    c  ON a.channel_id    = c.channel_id
       WHERE m.asset_id = $1
       ORDER BY m.monitoring_time DESC
       LIMIT 1`,
      [parseInt(assetId)]
    );
    const data = result.recordset[0];
    if (!data) return next(createError('Monitoring verisi bulunamadı.', 404, 'NOT_FOUND'));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /monitoring/:assetId/history
const getHistory = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { from, to, limit = 100 } = req.query;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 500);

    const params = [parseInt(assetId)];
    let idx = 2;
    let whereClause = 'WHERE m.asset_id = $1';

    if (from) { whereClause += ` AND m.monitoring_time >= $${idx++}`; params.push(new Date(from)); }
    if (to)   { whereClause += ` AND m.monitoring_time <= $${idx++}`; params.push(new Date(to)); }

    params.push(safeLimit);

    const result = await query(
      `SELECT m.monitoring_id, m.monitoring_time, m.cpu_usage, m.ram_usage, m.disk_usage,
         m.gpu_usage, m.temperature, m.power_consumption, m.network_latency,
         m.is_online, m.performance_score, m.error_count, m.uptime
       FROM asset_monitoring m
       ${whereClause}
       ORDER BY m.monitoring_time DESC
       LIMIT $${idx}`,
      params
    );
    res.json({ success: true, data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
};

function clampOrNull(val, min, max) {
  if (val === undefined || val === null) return null;
  const n = Number(val);
  if (!isFinite(n)) return null;
  return Math.min(Math.max(n, min), max);
}

// POST /monitoring/:assetId/data
const pushData = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const parsedId = parseInt(assetId);
    if (!parsedId || parsedId <= 0) {
      return next(createError('Geçersiz assetId.', 400));
    }

    const raw = req.body;

    const cpuUsage         = clampOrNull(raw.cpuUsage,         0,   100);
    const ramUsage         = clampOrNull(raw.ramUsage,         0,   100);
    const diskUsage        = clampOrNull(raw.diskUsage,        0,   100);
    const gpuUsage         = clampOrNull(raw.gpuUsage,         0,   100);
    const temperature      = clampOrNull(raw.temperature,      -40, 200);
    const cpuTemperature   = clampOrNull(raw.cpuTemperature,   -40, 200);
    const powerConsumption = clampOrNull(raw.powerConsumption, 0,   100000);
    const fanSpeed         = clampOrNull(raw.fanSpeed,         0,   30000);
    const memoryUsedGB     = clampOrNull(raw.memoryUsedGB,     0,   10240);
    const memoryTotalGB    = clampOrNull(raw.memoryTotalGB,    0,   10240);
    const networkInMbps    = clampOrNull(raw.networkInMbps,    0,   100000);
    const networkOutMbps   = clampOrNull(raw.networkOutMbps,   0,   100000);
    const networkLatency   = clampOrNull(raw.networkLatency,   0,   60000);
    const performanceScore = clampOrNull(raw.performanceScore, 0,   100);
    const signalStrength   = clampOrNull(raw.signalStrength,   -200, 0);
    const errorCount       = raw.errorCount != null ? Math.max(0, parseInt(raw.errorCount) || 0) : 0;
    const uptime           = raw.uptime != null ? Math.max(0, parseFloat(raw.uptime) || 0) : null;
    const isOnline         = raw.isOnline !== false && raw.isOnline !== 0;

    const result = await query(
      `INSERT INTO asset_monitoring (asset_id, cpu_usage, ram_usage, disk_usage, gpu_usage,
         temperature, cpu_temperature, power_consumption, fan_speed, memory_used_gb, memory_total_gb,
         network_in_mbps, network_out_mbps, network_latency, uptime,
         is_online, error_count, performance_score, signal_strength)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        parsedId, cpuUsage, ramUsage, diskUsage, gpuUsage,
        temperature, cpuTemperature, powerConsumption, fanSpeed, memoryUsedGB, memoryTotalGB,
        networkInMbps, networkOutMbps, networkLatency, uptime,
        isOnline, errorCount, performanceScore, signalStrength
      ]
    );

    await checkAndCreateAlerts(parsedId, { cpuUsage, ramUsage, diskUsage, temperature, isOnline });
    res.status(201).json({ success: true, data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// GET /monitoring/stats/channel/:channelId
const getChannelStats = async (req, res, next) => {
  try {
    const { channelId } = req.params;
    const result = await query(
      `SELECT
         COUNT(DISTINCT a.asset_id) AS total_assets,
         SUM(CASE WHEN a.status = 'Active'      THEN 1 ELSE 0 END) AS active_assets,
         SUM(CASE WHEN a.status = 'Maintenance' THEN 1 ELSE 0 END) AS maintenance_assets,
         AVG(lm.temperature)        AS avg_temperature,
         SUM(lm.power_consumption)  AS total_power_consumption,
         AVG(lm.performance_score)  AS avg_performance_score,
         SUM(CASE WHEN lm.is_online = FALSE THEN 1 ELSE 0 END) AS offline_assets,
         COUNT(DISTINCT ag.asset_group_id) AS total_groups
       FROM assets a
       JOIN asset_groups ag ON a.asset_group_id = ag.asset_group_id
       JOIN channels    c  ON a.channel_id    = c.channel_id
       LEFT JOIN LATERAL (
         SELECT temperature, power_consumption, performance_score, is_online
         FROM asset_monitoring m2
         WHERE m2.asset_id = a.asset_id
         ORDER BY m2.monitoring_time DESC LIMIT 1
       ) lm ON true
       WHERE c.channel_id = $1 AND a.is_active = TRUE`,
      [parseInt(channelId)]
    );
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// GET /monitoring/heatmap
const getHeatmap = async (req, res, next) => {
  try {
    const { channelId } = req.query;
    const params = [];
    let whereClause = 'WHERE a.is_active = TRUE';

    if (channelId) {
      params.push(parseInt(channelId));
      whereClause += ` AND a.channel_id = $1`;
    }

    const result = await query(
      `SELECT
         a.asset_id, a.asset_name, a.asset_code, a.asset_type, a.status,
         c.channel_name, ag.group_name, ag.group_type,
         lm.temperature, lm.power_consumption, lm.cpu_usage, lm.gpu_usage,
         lm.ram_usage, lm.is_online, lm.performance_score, lm.network_latency,
         lm.monitoring_time AS last_monitoring_time
       FROM assets a
       JOIN asset_groups ag ON a.asset_group_id = ag.asset_group_id
       JOIN channels    c  ON a.channel_id    = c.channel_id
       LEFT JOIN LATERAL (
         SELECT temperature, power_consumption, cpu_usage, gpu_usage,
                ram_usage, is_online, performance_score, network_latency, monitoring_time
         FROM asset_monitoring m2
         WHERE m2.asset_id = a.asset_id
         ORDER BY m2.monitoring_time DESC LIMIT 1
       ) lm ON true
       ${whereClause}
       ORDER BY c.channel_name, ag.group_type, a.asset_name
       LIMIT 50`,
      params
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

async function checkAndCreateAlerts(assetId, data) {
  const alerts = [];

  if (data.temperature != null && data.temperature > 90) {
    alerts.push({ type: 'Critical', category: 'Temperature', msg: `Sıcaklık kritik seviyede: ${data.temperature}°C (Eşik: 90°C)`, severity: 5, threshold: 90, current: data.temperature });
  } else if (data.temperature != null && data.temperature > 80) {
    alerts.push({ type: 'Warning', category: 'Temperature', msg: `Sıcaklık yüksek: ${data.temperature}°C (Eşik: 80°C)`, severity: 3, threshold: 80, current: data.temperature });
  }

  if (data.cpuUsage != null && data.cpuUsage > 95) {
    alerts.push({ type: 'Critical', category: 'CPU', msg: `CPU kullanımı kritik: %${data.cpuUsage}`, severity: 4, threshold: 95, current: data.cpuUsage });
  } else if (data.cpuUsage != null && data.cpuUsage > 85) {
    alerts.push({ type: 'Warning', category: 'CPU', msg: `CPU kullanımı yüksek: %${data.cpuUsage}`, severity: 3, threshold: 85, current: data.cpuUsage });
  }

  const ram = data.ramUsage ?? data.memoryUsage;
  if (ram != null && ram > 90) {
    alerts.push({ type: 'Warning', category: 'Memory', msg: `Bellek kullanımı yüksek: %${ram}`, severity: 3, threshold: 90, current: ram });
  }

  if (data.diskUsage != null && data.diskUsage > 90) {
    alerts.push({ type: 'Critical', category: 'Disk', msg: `Disk dolmak üzere: %${data.diskUsage}`, severity: 4, threshold: 90, current: data.diskUsage });
  }

  if (data.isOnline === false || data.isOnline === 0) {
    alerts.push({ type: 'Critical', category: 'Offline', msg: 'Cihaz bağlantısı kesildi - OFFLINE', severity: 5, threshold: null, current: null });
  }

  for (const alert of alerts) {
    await query(
      `INSERT INTO alerts (asset_id, alert_type, alert_category, alert_message, alert_severity, threshold_value, current_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [assetId, alert.type, alert.category, alert.msg, alert.severity, alert.threshold, alert.current]
    ).catch((err) => console.warn('[Alert] Oluşturulamadı:', err.message));
  }
}

module.exports = { getCurrent, getHistory, pushData, getChannelStats, getHeatmap };
