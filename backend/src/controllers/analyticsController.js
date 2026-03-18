const { query } = require('../config/database');
const { createError } = require('../middleware/errorHandler');

const VALID_GROUP_BY = ['month', 'hour', '3hour', '12hour', 'day'];

// GET /analytics/power-consumption
const getPowerConsumption = async (req, res, next) => {
  try {
    const { channelId, from, to, groupBy = 'day' } = req.query;

    if (!VALID_GROUP_BY.includes(groupBy)) {
      return next(createError('Geçersiz groupBy parametresi.', 400, 'INVALID_PARAM'));
    }

    const params = [];
    let idx = 1;
    let whereClause = 'WHERE 1=1';

    if (channelId) { whereClause += ` AND a.channel_id = $${idx++}`; params.push(parseInt(channelId)); }
    if (from)      { whereClause += ` AND m.monitoring_time >= $${idx++}`; params.push(new Date(from)); }
    if (to)        { whereClause += ` AND m.monitoring_time <= $${idx++}`; params.push(new Date(to)); }

    const dateGroup = groupBy === 'month'
      ? `TO_CHAR(m.monitoring_time, 'YYYY-MM')`
      : groupBy === 'hour'
      ? `TO_CHAR(m.monitoring_time, 'YYYY-MM-DD HH24')`
      : groupBy === '3hour'
      ? `TO_CHAR(m.monitoring_time, 'YYYY-MM-DD') || ' ' || LPAD((FLOOR(EXTRACT(HOUR FROM m.monitoring_time) / 3) * 3)::TEXT, 2, '0') || ':00'`
      : groupBy === '12hour'
      ? `TO_CHAR(m.monitoring_time, 'YYYY-MM-DD') || ' ' || LPAD((FLOOR(EXTRACT(HOUR FROM m.monitoring_time) / 12) * 12)::TEXT, 2, '0') || ':00'`
      : `TO_CHAR(m.monitoring_time, 'YYYY-MM-DD')`;

    const kwhMultiplier = groupBy === '12hour' ? 12 : groupBy === '3hour' ? 3 : groupBy === 'hour' ? 1 : 24;
    params.push(kwhMultiplier);
    const kwhIdx = idx++;

    const result = await query(
      `SELECT
         ${dateGroup} AS period,
         c.channel_name,
         ag.group_type,
         AVG(m.power_consumption) AS avg_power_w,
         MAX(m.power_consumption) AS max_power_w,
         MIN(m.power_consumption) AS min_power_w,
         (AVG(m.power_consumption) * $${kwhIdx}) / 1000.0 AS total_kwh
       FROM asset_monitoring m
       JOIN assets      a  ON m.asset_id      = a.asset_id
       JOIN asset_groups ag ON a.asset_group_id = ag.asset_group_id
       JOIN channels    c  ON a.channel_id    = c.channel_id
       ${whereClause}
       GROUP BY ${dateGroup}, c.channel_id, c.channel_name, ag.group_type
       ORDER BY period DESC, c.channel_name`,
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
    const params = [];
    let whereClause = 'WHERE a.is_active = TRUE';
    if (channelId) {
      params.push(parseInt(channelId));
      whereClause += ` AND a.channel_id = $1`;
    }

    const result = await query(
      `SELECT
         c.channel_name,
         ag.group_name, ag.group_type,
         a.asset_type,
         COUNT(*)::INT AS total_assets,
         SUM(CASE WHEN a.status = 'Active'      THEN 1 ELSE 0 END)::INT AS active_count,
         SUM(CASE WHEN a.status = 'Maintenance' THEN 1 ELSE 0 END)::INT AS maintenance_count,
         SUM(CASE WHEN a.status = 'Faulty'      THEN 1 ELSE 0 END)::INT AS faulty_count,
         SUM(CASE WHEN a.warranty_end_date < NOW() THEN 1 ELSE 0 END)::INT AS expired_warranty_count,
         AVG(EXTRACT(YEAR FROM AGE(NOW(), a.purchase_date)))::INT AS avg_age_years,
         AVG(lm.performance_score) AS avg_performance_score,
         SUM(CASE WHEN lm.is_online = FALSE THEN 1 ELSE 0 END)::INT AS offline_count
       FROM assets a
       JOIN asset_groups ag ON a.asset_group_id = ag.asset_group_id
       JOIN channels    c  ON a.channel_id    = c.channel_id
       LEFT JOIN LATERAL (
         SELECT performance_score, is_online
         FROM asset_monitoring m2
         WHERE m2.asset_id = a.asset_id
         ORDER BY m2.monitoring_time DESC LIMIT 1
       ) lm ON true
       ${whereClause}
       GROUP BY c.channel_id, c.channel_name, ag.asset_group_id, ag.group_name, ag.group_type, a.asset_type
       ORDER BY c.channel_name, ag.group_type, a.asset_type`,
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
    const params = [];
    let idx = 1;
    let whereClause = 'WHERE a.is_active = TRUE';

    if (channelId) { whereClause += ` AND a.channel_id = $${idx++}`;                       params.push(parseInt(channelId)); }
    if (year)      { whereClause += ` AND EXTRACT(YEAR FROM a.purchase_date) = $${idx++}`; params.push(parseInt(year)); }

    const result = await query(
      `SELECT
         c.channel_name,
         ag.group_name, ag.group_type,
         a.asset_type,
         COUNT(*)::INT AS asset_count,
         SUM(a.purchase_cost) AS total_purchase_cost,
         SUM(a.current_value) AS total_current_value,
         SUM(a.purchase_cost - a.current_value) AS total_depreciation,
         AVG(a.depreciation_rate) AS avg_depreciation_rate,
         SUM(mr.cost_amount) AS total_maintenance_cost
       FROM assets a
       JOIN asset_groups ag ON a.asset_group_id = ag.asset_group_id
       JOIN channels    c  ON a.channel_id    = c.channel_id
       LEFT JOIN maintenance_records mr ON a.asset_id = mr.asset_id AND mr.status = 'Completed'
       ${whereClause}
       GROUP BY c.channel_id, c.channel_name, ag.asset_group_id, ag.group_name, ag.group_type, a.asset_type
       ORDER BY c.channel_name, ag.group_type`,
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
    const params = [parseInt(days)];
    let idx = 2;
    let channelFilter = '';

    if (channelId) {
      channelFilter = ` AND a.channel_id = $${idx++}`;
      params.push(parseInt(channelId));
    }

    const result = await query(
      `SELECT
         a.asset_id, a.asset_name, a.asset_code, a.asset_type, a.warranty_end_date,
         c.channel_name, b.building_name,
         ag.group_name, ag.group_type,
         mr.next_maintenance_date, mr.maintenance_interval, mr.maintenance_type,
         (mr.next_maintenance_date::date - CURRENT_DATE) AS days_until_maintenance,
         (a.warranty_end_date::date - CURRENT_DATE)      AS days_until_warranty_expiry
       FROM assets a
       JOIN asset_groups ag ON a.asset_group_id = ag.asset_group_id
       JOIN channels    c  ON a.channel_id    = c.channel_id
       LEFT JOIN rooms      r  ON a.room_id       = r.room_id
       LEFT JOIN buildings  b  ON r.building_id   = b.building_id
       LEFT JOIN (
         SELECT asset_id, next_maintenance_date, maintenance_interval, maintenance_type
         FROM (
           SELECT asset_id, next_maintenance_date, maintenance_interval, maintenance_type,
                  ROW_NUMBER() OVER (PARTITION BY asset_id ORDER BY next_maintenance_date ASC) AS rn
           FROM maintenance_records
           WHERE status IN ('Scheduled','Pending')
             AND next_maintenance_date IS NOT NULL
         ) ranked
         WHERE rn = 1
       ) mr ON a.asset_id = mr.asset_id
       WHERE (
         (mr.next_maintenance_date IS NOT NULL AND mr.next_maintenance_date <= (CURRENT_DATE + ($1 || ' days')::INTERVAL))
         OR (a.warranty_end_date IS NOT NULL AND a.warranty_end_date BETWEEN (CURRENT_DATE - INTERVAL '30 days') AND (CURRENT_DATE + ($1 || ' days')::INTERVAL))
       )
       AND a.is_active = TRUE
       ${channelFilter}
       ORDER BY mr.next_maintenance_date ASC`,
      params
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

// GET /analytics/dashboard-kpi
// mv_dashboard_kpi artık kanal bazlı (Migration 004).
// channelId varsa → tek kanal satırı, yoksa → tüm kanalların toplamı.
const getDashboardKPI = async (req, res, next) => {
  try {
    const { channelId } = req.query;

    if (channelId) {
      // Belirli kanal → MV'den tek satır
      const result = await query(
        `SELECT * FROM mv_dashboard_kpi WHERE channel_id = $1`,
        [parseInt(channelId)]
      );
      return res.json({ success: true, data: result.recordset[0] || null });
    }

    // Global toplam → tüm kanalları MV'den topla
    const result = await query(
      `SELECT
         SUM(total_assets)::INT       AS total_assets,
         SUM(active_assets)::INT      AS active_assets,
         SUM(maintenance_assets)::INT AS maintenance_assets,
         SUM(faulty_assets)::INT      AS faulty_assets,
         SUM(retired_assets)::INT     AS retired_assets,
         SUM(critical_alerts)::INT    AS critical_alerts,
         SUM(total_alerts)::INT       AS total_alerts,
         SUM(total_groups)::INT       AS total_groups,
         MAX(refreshed_at)            AS refreshed_at
       FROM mv_dashboard_kpi`
    );
    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    next(err);
  }
};

// GET /analytics/dashboard-kpi/channels  — tüm kanalların KPI'larını listeler
const getDashboardKPIByChannel = async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM mv_dashboard_kpi ORDER BY channel_name`);
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

// GET /analytics/physical-node-distribution
// physical_nodes tablosundaki node_type dağılımını döndürür
const getPhysicalNodeDistribution = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         node_type   AS "nodeType",
         COUNT(*)::INT AS "count"
       FROM physical_nodes
       GROUP BY node_type
       ORDER BY count DESC`
    );
    res.json({ success: true, data: result.recordset });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPowerConsumption, getAssetHealth, getBudget, getMaintenanceForecast, getDashboardKPI, getDashboardKPIByChannel, getPhysicalNodeDistribution };
