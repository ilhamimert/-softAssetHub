const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

// GET /monitoring/:assetId/current
const getCurrent = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const result = await query(
      `SELECT TOP 1 m.*, a.AssetName, a.AssetType, a.Status,
              ag.GroupName, ag.GroupType, c.ChannelName
       FROM AssetMonitoring m
       JOIN Assets      a  ON m.AssetID      = a.AssetID
       JOIN AssetGroups ag ON a.AssetGroupID = ag.AssetGroupID
       JOIN Channels    c  ON a.ChannelID    = c.ChannelID
       WHERE m.AssetID = @assetId
       ORDER BY m.MonitoringTime DESC`,
      { assetId: parseInt(assetId) }
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

    let whereClause = 'WHERE m.AssetID = @assetId';
    const params = { assetId: parseInt(assetId), limit: parseInt(limit) };

    if (from) { whereClause += ' AND m.MonitoringTime >= @from'; params.from = new Date(from); }
    if (to)   { whereClause += ' AND m.MonitoringTime <= @to';   params.to   = new Date(to);   }

    const result = await query(
      `SELECT TOP (@limit) m.MonitoringID, m.MonitoringTime, m.CPUUsage, m.RAMUsage, m.DiskUsage,
         m.GPUUsage, m.Temperature, m.PowerConsumption, m.NetworkLatency,
         m.IsOnline, m.PerformanceScore, m.ErrorCount, m.Uptime
       FROM AssetMonitoring m
       ${whereClause}
       ORDER BY m.MonitoringTime DESC`,
      params
    );
    res.json({ success: true, data: result.recordset, total: result.recordset.length });
  } catch (err) {
    next(err);
  }
};

// POST /monitoring/:assetId/data  — Cihazdan gelen veri push
const pushData = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const {
      cpuUsage, ramUsage, diskUsage, gpuUsage, temperature, cpuTemperature,
      powerConsumption, fanSpeed, memoryUsedGB, memoryTotalGB,
      networkInMbps, networkOutMbps, networkLatency, uptime,
      isOnline, errorCount, performanceScore, signalStrength
    } = req.body;

    const result = await query(
      `INSERT INTO AssetMonitoring (AssetID, CPUUsage, RAMUsage, DiskUsage, GPUUsage,
         Temperature, CPUTemperature, PowerConsumption, FanSpeed, MemoryUsedGB, MemoryTotalGB,
         NetworkInMbps, NetworkOutMbps, NetworkLatency, Uptime,
         IsOnline, ErrorCount, PerformanceScore, SignalStrength)
       OUTPUT INSERTED.*
       VALUES (@assetId, @cpuUsage, @ramUsage, @diskUsage, @gpuUsage,
         @temperature, @cpuTemperature, @powerConsumption, @fanSpeed, @memoryUsedGB, @memoryTotalGB,
         @networkInMbps, @networkOutMbps, @networkLatency, @uptime,
         @isOnline, @errorCount, @performanceScore, @signalStrength)`,
      {
        assetId: parseInt(assetId), cpuUsage, ramUsage, diskUsage, gpuUsage,
        temperature, cpuTemperature, powerConsumption, fanSpeed, memoryUsedGB, memoryTotalGB,
        networkInMbps, networkOutMbps, networkLatency: networkLatency || null,
        uptime, isOnline, errorCount, performanceScore, signalStrength
      }
    );

    await checkAndCreateAlerts(parseInt(assetId), req.body);
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
         COUNT(DISTINCT a.AssetID) AS TotalAssets,
         SUM(CASE WHEN a.Status = 'Active'      THEN 1 ELSE 0 END) AS ActiveAssets,
         SUM(CASE WHEN a.Status = 'Maintenance' THEN 1 ELSE 0 END) AS MaintenanceAssets,
         AVG(lm.Temperature)       AS AvgTemperature,
         SUM(lm.PowerConsumption)  AS TotalPowerConsumption,
         AVG(lm.PerformanceScore)  AS AvgPerformanceScore,
         SUM(CASE WHEN lm.IsOnline = 0 THEN 1 ELSE 0 END) AS OfflineAssets,
         COUNT(DISTINCT ag.AssetGroupID) AS TotalGroups
       FROM Assets a
       JOIN AssetGroups ag ON a.AssetGroupID = ag.AssetGroupID
       JOIN Channels    c  ON a.ChannelID    = c.ChannelID
       LEFT JOIN (
         SELECT AssetID, Temperature, PowerConsumption, PerformanceScore, IsOnline,
           ROW_NUMBER() OVER (PARTITION BY AssetID ORDER BY MonitoringTime DESC) AS rn
         FROM AssetMonitoring
       ) lm ON lm.AssetID = a.AssetID AND lm.rn = 1
       WHERE c.ChannelID = @channelId AND a.IsActive = 1`,
      { channelId: parseInt(channelId) }
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
    let whereClause = 'WHERE a.IsActive = 1';
    const params = {};

    if (channelId) {
      whereClause += ' AND a.ChannelID = @channelId';
      params.channelId = parseInt(channelId);
    }

    const result = await query(
      `SELECT TOP 50
         a.AssetID, a.AssetName, a.AssetCode, a.AssetType, a.Status,
         c.ChannelName, ag.GroupName, ag.GroupType,
         lm.Temperature, lm.PowerConsumption, lm.CPUUsage, lm.GPUUsage,
         lm.RAMUsage, lm.IsOnline, lm.PerformanceScore, lm.NetworkLatency
       FROM Assets a
       JOIN AssetGroups ag ON a.AssetGroupID = ag.AssetGroupID
       JOIN Channels    c  ON a.ChannelID    = c.ChannelID
       LEFT JOIN (
         SELECT AssetID, Temperature, PowerConsumption, CPUUsage, GPUUsage,
           RAMUsage, IsOnline, PerformanceScore, NetworkLatency,
           ROW_NUMBER() OVER (PARTITION BY AssetID ORDER BY MonitoringTime DESC) AS rn
         FROM AssetMonitoring
       ) lm ON lm.AssetID = a.AssetID AND lm.rn = 1
       ${whereClause}
       ORDER BY c.ChannelName, ag.GroupType, a.AssetName`,
      params
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

async function checkAndCreateAlerts(assetId, data) {
  const alerts = [];

  if (data.temperature > 90) {
    alerts.push({ type: 'Critical', category: 'Temperature', msg: `Sıcaklık kritik seviyede: ${data.temperature}°C (Eşik: 90°C)`, severity: 5, threshold: 90, current: data.temperature });
  } else if (data.temperature > 80) {
    alerts.push({ type: 'Warning', category: 'Temperature', msg: `Sıcaklık yüksek: ${data.temperature}°C (Eşik: 80°C)`, severity: 3, threshold: 80, current: data.temperature });
  }

  if (data.cpuUsage > 95) {
    alerts.push({ type: 'Critical', category: 'CPU', msg: `CPU kullanımı kritik: %${data.cpuUsage}`, severity: 4, threshold: 95, current: data.cpuUsage });
  } else if (data.cpuUsage > 85) {
    alerts.push({ type: 'Warning', category: 'CPU', msg: `CPU kullanımı yüksek: %${data.cpuUsage}`, severity: 3, threshold: 85, current: data.cpuUsage });
  }

  if (data.memoryUsage > 90 || data.ramUsage > 90) {
    const mem = data.memoryUsage || data.ramUsage;
    alerts.push({ type: 'Warning', category: 'Memory', msg: `Bellek kullanımı yüksek: %${mem}`, severity: 3, threshold: 90, current: mem });
  }

  if (data.diskUsage > 90) {
    alerts.push({ type: 'Critical', category: 'Disk', msg: `Disk dolmak üzere: %${data.diskUsage}`, severity: 4, threshold: 90, current: data.diskUsage });
  }

  if (data.isOnline === false || data.isOnline === 0) {
    alerts.push({ type: 'Critical', category: 'Offline', msg: 'Cihaz bağlantısı kesildi - OFFLINE', severity: 5, threshold: null, current: null });
  }

  for (const alert of alerts) {
    await query(
      `INSERT INTO Alerts (AssetID, AlertType, AlertCategory, AlertMessage, AlertSeverity, ThresholdValue, CurrentValue)
       VALUES (@assetId, @type, @category, @msg, @severity, @threshold, @current)`,
      { assetId, type: alert.type, category: alert.category, msg: alert.msg, severity: alert.severity, threshold: alert.threshold, current: alert.current }
    ).catch(() => {});
  }
}

module.exports = { getCurrent, getHistory, pushData, getChannelStats, getHeatmap };
