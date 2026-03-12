/**
 * Monitoring Scheduler
 * Her saat başında aktif assetler için monitoring verisi üretir.
 * Sunucu yeniden başlatıldığında bugün eksik kalan saatleri de doldurur.
 */

const { query, withTransaction } = require('../config/database');

function generateMetrics(hour) {
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  let cpuBase, powerBase, gpuBase;

  if (hour >= 5 && hour <= 7) {
    cpuBase   = rand(10, 35);
    powerBase = rand(120, 220);
    gpuBase   = rand(15, 35);
  } else if (hour >= 8 && hour <= 11) {
    cpuBase   = rand(45, 85);
    powerBase = rand(280, 430);
    gpuBase   = rand(50, 85);
  } else if (hour >= 12 && hour <= 13) {
    cpuBase   = rand(30, 55);
    powerBase = rand(220, 320);
    gpuBase   = rand(35, 60);
  } else if (hour >= 14 && hour <= 23) {
    cpuBase   = rand(55, 90);
    powerBase = rand(320, 500);
    gpuBase   = rand(55, 90);
  } else {
    cpuBase   = rand(5, 20);
    powerBase = rand(80, 150);
    gpuBase   = rand(10, 25);
  }

  return {
    temperature:      rand(36, 52),
    cpuUsage:         cpuBase,
    ramUsage:         rand(30, 85),
    diskUsage:        rand(40, 80),
    gpuUsage:         gpuBase,
    powerConsumption: powerBase,
  };
}

async function insertHourlyData(targetTime) {
  try {
    const assetsResult = await query(
      `SELECT asset_id FROM assets WHERE is_active = TRUE`
    );
    const assets = assetsResult.recordset;
    if (assets.length === 0) return;

    const hour = targetTime.getHours();

    // O saatte zaten veri var mı?
    const check = await query(
      `SELECT COUNT(DISTINCT asset_id) AS cnt FROM asset_monitoring WHERE monitoring_time = $1`,
      [targetTime]
    );
    if (parseInt(check.recordset[0].cnt) >= assets.length) {
      console.log(`[Scheduler] ${targetTime.toISOString()} — veri zaten mevcut, atlandı.`);
      return;
    }

    await withTransaction(async (txQuery) => {
      for (const { assetId } of assets) {
        const m = generateMetrics(hour);
        await txQuery(
          `INSERT INTO asset_monitoring
             (asset_id, temperature, cpu_usage, ram_usage, disk_usage, gpu_usage, power_consumption, is_online, monitoring_time)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8)`,
          [assetId, m.temperature, m.cpuUsage, m.ramUsage, m.diskUsage, m.gpuUsage, m.powerConsumption, targetTime]
        );
      }
    });

    console.log(`[Scheduler] ${targetTime.toISOString()} — ${assets.length} asset için monitoring eklendi.`);
  } catch (err) {
    console.error('[Scheduler] Hata:', err.message);
  }
}

async function backfillToday() {
  const now = new Date();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  for (const h of [21, 22, 23]) {
    const t = new Date(yesterday);
    t.setHours(h, 0, 0, 0);
    await insertHourlyData(t);
  }

  const base = new Date(now);
  const currentHour = now.getHours();
  for (let h = 0; h <= currentHour; h++) {
    const t = new Date(base);
    t.setHours(h, 0, 0, 0);
    await insertHourlyData(t);
  }
}

function scheduleHourly() {
  const now      = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0);
  const delay = nextHour - now;

  console.log(`[Scheduler] İlk çalışma: ${nextHour.toLocaleTimeString('tr-TR')} (${Math.round(delay / 60000)} dk sonra)`);

  setTimeout(() => {
    const t = new Date();
    t.setMinutes(0, 0, 0);
    insertHourlyData(t);

    setInterval(() => {
      const t2 = new Date();
      t2.setMinutes(0, 0, 0);
      insertHourlyData(t2);
    }, 60 * 60 * 1000);
  }, delay);
}

// ── Lisans Bitiş Uyarısı ──────────────────────────────────────────────────────
async function checkLicenseExpiry() {
  try {
    const result = await query(`
      SELECT
        l.license_id, l.asset_id, l.application_name, l.expiry_date,
        (l.expiry_date::date - CURRENT_DATE) AS days_left
      FROM licenses l
      WHERE l.is_active = TRUE
        AND l.expiry_date IS NOT NULL
        AND l.expiry_date >= CURRENT_DATE
        AND l.expiry_date <= (NOW() + INTERVAL '60 days')::date
        AND NOT EXISTS (
          SELECT 1 FROM alerts a
          WHERE a.asset_id = l.asset_id
            AND a.alert_type = 'License_Expiry'
            AND a.is_resolved = FALSE
            AND a.triggered_time >= CURRENT_DATE
        )
    `);

    for (const row of result.recordset) {
      const severity = row.daysLeft <= 7 ? 'Critical' : 'Warning';
      const message  = `${row.applicationName} lisansı ${row.daysLeft} gün içinde sona eriyor (${new Date(row.expiryDate).toLocaleDateString('tr-TR')}).`;

      await query(
        `INSERT INTO alerts (asset_id, alert_type, alert_category, alert_message, alert_severity, created_by)
         VALUES ($1, 'License_Expiry', 'License', $2, $3, 'system')`,
        [row.assetId, message, severity === 'Critical' ? 5 : 3]
      );

      console.log(`[Scheduler] Lisans uyarısı oluşturuldu — Asset ${row.assetId}: ${message}`);
    }
  } catch (err) {
    console.error('[Scheduler] Lisans bitiş kontrolü hatası:', err.message);
  }
}

function scheduleLicenseCheck() {
  checkLicenseExpiry();
  setInterval(checkLicenseExpiry, 24 * 60 * 60 * 1000);
}

// ── KPI Materialized View Refresh ────────────────────────────────────────────
async function refreshKPIView() {
  try {
    await query('REFRESH MATERIALIZED VIEW mv_dashboard_kpi');
    console.log('[Scheduler] mv_dashboard_kpi yenilendi.');
  } catch (err) {
    // View henüz yoksa veya CONCURRENTLY için unique index eksikse sessizce geç
    console.error('[Scheduler] KPI view yenileme hatası:', err.message);
  }
}

function scheduleKPIRefresh() {
  // İlk yenileme hemen, sonra her 5 dakikada bir
  refreshKPIView();
  setInterval(refreshKPIView, 5 * 60 * 1000);
}

// ── Yıllık Partition Otomatik Oluşturma ──────────────────────────────────────
// fn_create_monitoring_partition(year) Migration 004'te oluşturuldu.
// Her yılın 1 Ocak'ında bir sonraki yılın partition'ı önceden oluşturulur.
async function createNextYearPartition() {
  try {
    const nextYear = new Date().getFullYear() + 1;
    const result = await query(
      `SELECT fn_create_monitoring_partition($1) AS msg`,
      [nextYear]
    );
    console.log('[Scheduler] Partition:', result.recordset[0]?.msg);
  } catch (err) {
    console.error('[Scheduler] Partition oluşturma hatası:', err.message);
  }
}

function schedulePartitionCreation() {
  // Sunucu başladığında bir kez çalıştır (idempotent — zaten varsa skip eder)
  createNextYearPartition();

  // Her gün 00:05'te kontrol et (1 Ocak'ta partition yoksa oluşturur)
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  setInterval(createNextYearPartition, MS_PER_DAY);
}

async function startMonitoringScheduler() {
  console.log('[Scheduler] Başlatılıyor...');
  await backfillToday();
  scheduleHourly();
  scheduleLicenseCheck();
  scheduleKPIRefresh();
  schedulePartitionCreation();
}

module.exports = { startMonitoringScheduler };
