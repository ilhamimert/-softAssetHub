const { query } = require('../config/database');

// GET /analytics/power-consumption
const getPowerConsumption = async (req, res, next) => {
  try {
    const { channelId, from, to, groupBy = 'day' } = req.query;
    const params = {};
    let whereClause = 'WHERE 1=1';

    if (channelId) { whereClause += ' AND a.ChannelID = @channelId'; params.channelId = parseInt(channelId); }
    if (from) { whereClause += ' AND m.MonitoringTime >= @from'; params.from = new Date(from); }
    if (to)   { whereClause += ' AND m.MonitoringTime <= @to';   params.to   = new Date(to);   }

    const dateGroup = groupBy === 'month'
      ? "FORMAT(m.MonitoringTime, 'yyyy-MM')"
      : groupBy === 'hour'
      ? "FORMAT(m.MonitoringTime, 'yyyy-MM-dd HH')"
      : "FORMAT(m.MonitoringTime, 'yyyy-MM-dd')";

    const result = await query(
      `SELECT
         ${dateGroup} AS Period,
         c.ChannelName,
         ag.GroupType,
         AVG(m.PowerConsumption) AS AvgPowerW,
         MAX(m.PowerConsumption) AS MaxPowerW,
         MIN(m.PowerConsumption) AS MinPowerW,
         SUM(m.PowerConsumption) / 1000.0 AS TotalkWh
       FROM AssetMonitoring m
       JOIN Assets      a  ON m.AssetID      = a.AssetID
       JOIN AssetGroups ag ON a.AssetGroupID = ag.AssetGroupID
       JOIN Channels    c  ON a.ChannelID    = c.ChannelID
       ${whereClause}
       GROUP BY ${dateGroup}, c.ChannelID, c.ChannelName, ag.GroupType
       ORDER BY Period DESC, c.ChannelName`,
      params
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

// GET /analytics/asset-health
const getAssetHealth = async (req, res, next) => {
  try {
    const { channelId } = req.query;
    let whereClause = 'WHERE a.IsActive = 1';
    const params = {};
    if (channelId) { whereClause += ' AND a.ChannelID = @channelId'; params.channelId = parseInt(channelId); }

    const result = await query(
      `SELECT
         c.ChannelName,
         ag.GroupName, ag.GroupType,
         a.AssetType,
         COUNT(*) AS TotalAssets,
         SUM(CASE WHEN a.Status = 'Active'      THEN 1 ELSE 0 END) AS ActiveCount,
         SUM(CASE WHEN a.Status = 'Maintenance' THEN 1 ELSE 0 END) AS MaintenanceCount,
         SUM(CASE WHEN a.Status = 'Faulty'      THEN 1 ELSE 0 END) AS FaultyCount,
         SUM(CASE WHEN a.WarrantyEndDate < GETDATE() THEN 1 ELSE 0 END) AS ExpiredWarrantyCount,
         AVG(DATEDIFF(YEAR, a.PurchaseDate, GETDATE())) AS AvgAgeYears,
         AVG(lm.PerformanceScore) AS AvgPerformanceScore,
         SUM(CASE WHEN lm.IsOnline = 0 THEN 1 ELSE 0 END) AS OfflineCount
       FROM Assets a
       JOIN AssetGroups ag ON a.AssetGroupID = ag.AssetGroupID
       JOIN Channels    c  ON a.ChannelID    = c.ChannelID
       LEFT JOIN (
         SELECT AssetID, PerformanceScore, IsOnline,
           ROW_NUMBER() OVER (PARTITION BY AssetID ORDER BY MonitoringTime DESC) AS rn
         FROM AssetMonitoring
       ) lm ON lm.AssetID = a.AssetID AND lm.rn = 1
       ${whereClause}
       GROUP BY c.ChannelID, c.ChannelName, ag.AssetGroupID, ag.GroupName, ag.GroupType, a.AssetType
       ORDER BY c.ChannelName, ag.GroupType, a.AssetType`,
      params
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

// GET /analytics/budget
const getBudget = async (req, res, next) => {
  try {
    const { channelId, year } = req.query;
    const params = {};
    let whereClause = 'WHERE a.IsActive = 1';

    if (channelId) { whereClause += ' AND a.ChannelID = @channelId'; params.channelId = parseInt(channelId); }
    if (year) { whereClause += ' AND YEAR(a.PurchaseDate) = @year'; params.year = parseInt(year); }

    const result = await query(
      `SELECT
         c.ChannelName,
         ag.GroupName, ag.GroupType,
         a.AssetType,
         COUNT(*) AS AssetCount,
         SUM(a.PurchaseCost) AS TotalPurchaseCost,
         SUM(a.CurrentValue) AS TotalCurrentValue,
         SUM(a.PurchaseCost - a.CurrentValue) AS TotalDepreciation,
         AVG(a.DepreciationRate) AS AvgDepreciationRate,
         SUM(mr.CostAmount) AS TotalMaintenanceCost
       FROM Assets a
       JOIN AssetGroups ag ON a.AssetGroupID = ag.AssetGroupID
       JOIN Channels    c  ON a.ChannelID    = c.ChannelID
       LEFT JOIN MaintenanceRecords mr ON a.AssetID = mr.AssetID AND mr.Status = 'Completed'
       ${whereClause}
       GROUP BY c.ChannelID, c.ChannelName, ag.AssetGroupID, ag.GroupName, ag.GroupType, a.AssetType
       ORDER BY c.ChannelName, ag.GroupType`,
      params
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

// GET /analytics/maintenance-forecast
const getMaintenanceForecast = async (req, res, next) => {
  try {
    const { channelId, days = 90 } = req.query;
    const params = { days: parseInt(days) };
    let whereClause = `WHERE (
      mr.NextMaintenanceDate IS NOT NULL AND mr.NextMaintenanceDate <= DATEADD(DAY, @days, GETDATE())
      OR a.WarrantyEndDate <= DATEADD(DAY, @days, GETDATE())
    )`;

    if (channelId) { whereClause += ' AND a.ChannelID = @channelId'; params.channelId = parseInt(channelId); }

    const result = await query(
      `SELECT DISTINCT
         a.AssetID, a.AssetName, a.AssetCode, a.AssetType, a.WarrantyEndDate,
         c.ChannelName,
         ag.GroupName, ag.GroupType,
         mr.NextMaintenanceDate, mr.MaintenanceInterval, mr.MaintenanceType,
         DATEDIFF(DAY, GETDATE(), mr.NextMaintenanceDate) AS DaysUntilMaintenance,
         DATEDIFF(DAY, GETDATE(), a.WarrantyEndDate)      AS DaysUntilWarrantyExpiry
       FROM Assets a
       JOIN AssetGroups ag ON a.AssetGroupID = ag.AssetGroupID
       JOIN Channels    c  ON a.ChannelID    = c.ChannelID
       LEFT JOIN (
         SELECT AssetID, NextMaintenanceDate, MaintenanceInterval, MaintenanceType,
           ROW_NUMBER() OVER (PARTITION BY AssetID ORDER BY NextMaintenanceDate ASC) AS rn
         FROM MaintenanceRecords WHERE Status IN ('Scheduled','Pending') AND NextMaintenanceDate IS NOT NULL
       ) mr ON mr.AssetID = a.AssetID AND mr.rn = 1
       ${whereClause} AND a.IsActive = 1
       ORDER BY mr.NextMaintenanceDate ASC`,
      params
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

// GET /analytics/dashboard-kpi
const getDashboardKPI = async (req, res, next) => {
  try {
    const { channelId } = req.query;
    const params = {};
    const chFilter = channelId ? 'AND a.ChannelID = @channelId' : '';
    if (channelId) params.channelId = parseInt(channelId);

    const result = await query(
      `SELECT
         (SELECT COUNT(*) FROM Assets a WHERE a.IsActive = 1 ${chFilter}) AS TotalAssets,
         (SELECT COUNT(*) FROM Assets a WHERE a.Status = 'Active'      AND a.IsActive = 1 ${chFilter}) AS ActiveAssets,
         (SELECT COUNT(*) FROM Assets a WHERE a.Status = 'Maintenance' AND a.IsActive = 1 ${chFilter}) AS MaintenanceAssets,
         (SELECT COUNT(*) FROM Assets a WHERE a.Status = 'Faulty'      AND a.IsActive = 1 ${chFilter}) AS FaultyAssets,
         (SELECT COUNT(*) FROM Alerts al LEFT JOIN Assets a ON al.AssetID = a.AssetID
          WHERE al.IsResolved = 0 AND al.AlertType = 'Critical' ${chFilter}) AS CriticalAlerts,
         (SELECT COUNT(*) FROM Alerts al LEFT JOIN Assets a ON al.AssetID = a.AssetID
          WHERE al.IsResolved = 0 ${chFilter}) AS TotalAlerts,
         (SELECT COUNT(DISTINCT AssetGroupID) FROM AssetGroups ag WHERE ag.IsActive = 1
          ${channelId ? 'AND ag.ChannelID = @channelId' : ''}) AS TotalGroups`,
      params
    );
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPowerConsumption, getAssetHealth, getBudget, getMaintenanceForecast, getDashboardKPI };
