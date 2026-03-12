-- ============================================================
-- Migration 003: Mimari İyileştirmeler
-- Tarih: 2026-03-11
-- Adımlar:
--   1. pg_trgm extension
--   2. updated_date BEFORE UPDATE trigger (10 tablo)
--   3. GIN trigram index — asset arama
--   4. feature_flags TEXT -> JSONB (licenses)
--   5. specifications TEXT -> JSONB (asset_components)
--   6. alerts.alert_type CHECK kısıtı genişletmesi (License_Expiry)
--   7. CASCADE / SET NULL kuralları (assets FK)
--   8. mv_dashboard_kpi materialized view
--   9. asset_monitoring partition (RANGE / yıllık) + DOUBLE -> REAL
--  10. BRIN index (monitoring_time)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- ADIM 1 — pg_trgm extension (fuzzy arama için)
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ─────────────────────────────────────────────────────────────
-- ADIM 2 — updated_date otomatik güncelleme trigger'ı
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_date()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_date = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  tbl  TEXT;
  tbls TEXT[] := ARRAY[
    'holdings', 'channels', 'buildings', 'rooms',
    'asset_groups', 'assets', 'asset_components',
    'maintenance_records', 'users', 'licenses'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM   pg_trigger  t
      JOIN   pg_class    c ON c.oid = t.tgrelid
      JOIN   pg_namespace n ON n.oid = c.relnamespace
      WHERE  n.nspname = 'public'
        AND  c.relname = tbl
        AND  t.tgname  = 'trg_' || tbl || '_updated_date'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_date
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION fn_set_updated_date()',
        tbl, tbl
      );
      RAISE NOTICE 'Trigger oluşturuldu: trg_%_updated_date', tbl;
    ELSE
      RAISE NOTICE 'Zaten mevcut, atlandı: trg_%_updated_date', tbl;
    END IF;
  END LOOP;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- ADIM 3 — Trigram GIN index (asset name / serial search)
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_assets_name_trgm
  ON assets USING GIN (asset_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_assets_serial_trgm
  ON assets USING GIN (serial_number gin_trgm_ops)
  WHERE serial_number IS NOT NULL;


-- ─────────────────────────────────────────────────────────────
-- ADIM 4 — licenses.feature_flags TEXT → JSONB
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF (
    SELECT data_type
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = 'licenses'
      AND  column_name  = 'feature_flags'
  ) = 'text' THEN

    ALTER TABLE licenses
      ALTER COLUMN feature_flags TYPE JSONB
      USING CASE
        WHEN feature_flags IS NULL OR TRIM(feature_flags) = '' THEN NULL
        ELSE feature_flags::JSONB
      END;

    RAISE NOTICE 'licenses.feature_flags: TEXT → JSONB dönüştürüldü.';
  ELSE
    RAISE NOTICE 'licenses.feature_flags zaten JSONB, atlandı.';
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_licenses_feature_flags_gin
  ON licenses USING GIN (feature_flags)
  WHERE feature_flags IS NOT NULL;


-- ─────────────────────────────────────────────────────────────
-- ADIM 5 — asset_components.specifications TEXT → JSONB
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF (
    SELECT data_type
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = 'asset_components'
      AND  column_name  = 'specifications'
  ) = 'text' THEN

    ALTER TABLE asset_components
      ALTER COLUMN specifications TYPE JSONB
      USING CASE
        WHEN specifications IS NULL OR TRIM(specifications) = '' THEN NULL
        ELSE specifications::JSONB
      END;

    RAISE NOTICE 'asset_components.specifications: TEXT → JSONB dönüştürüldü.';
  ELSE
    RAISE NOTICE 'asset_components.specifications zaten JSONB, atlandı.';
  END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- ADIM 6 — alerts.alert_type CHECK kısıtını genişlet
--          (Scheduler 'License_Expiry' tipi ekliyor; kısıt bunu
--           reddediyordu — önceden var olan bug düzeltmesi)
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name   = 'chk_alerts_type'
  ) THEN
    ALTER TABLE alerts DROP CONSTRAINT chk_alerts_type;
    RAISE NOTICE 'Eski chk_alerts_type kısıtı kaldırıldı.';
  END IF;
END;
$$;

ALTER TABLE alerts
  ADD CONSTRAINT chk_alerts_type
  CHECK (alert_type IN ('Critical', 'Warning', 'Info', 'License_Expiry'));


-- ─────────────────────────────────────────────────────────────
-- ADIM 7 — CASCADE / SET NULL kuralları
-- ─────────────────────────────────────────────────────────────

-- asset_components → assets  (CASCADE: component asset olmadan anlamsız)
ALTER TABLE asset_components DROP CONSTRAINT IF EXISTS fk_components_assets;
ALTER TABLE asset_components
  ADD CONSTRAINT fk_components_assets
  FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE;

-- maintenance_records → assets  (CASCADE: asset_id NOT NULL)
ALTER TABLE maintenance_records DROP CONSTRAINT IF EXISTS fk_maintenance_assets;
ALTER TABLE maintenance_records
  ADD CONSTRAINT fk_maintenance_assets
  FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE;

-- alerts → assets  (SET NULL: tarihsel kayıt korunsun, asset_id nullable)
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS fk_alerts_assets;
ALTER TABLE alerts
  ADD CONSTRAINT fk_alerts_assets
  FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE SET NULL;

-- asset_monitoring → assets  (CASCADE: partition adımında yaratılacak,
--   önceki kısıtı şimdi kaldır; yeni tablo kendi kısıtıyla gelecek)
ALTER TABLE asset_monitoring DROP CONSTRAINT IF EXISTS fk_monitoring_assets;


-- ─────────────────────────────────────────────────────────────
-- ADIM 8 — mv_dashboard_kpi materialized view
-- ─────────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_kpi AS
SELECT
  COUNT(*)::INT                                                            AS total_assets,
  SUM(CASE WHEN status = 'Active'      THEN 1 ELSE 0 END)::INT            AS active_assets,
  SUM(CASE WHEN status = 'Maintenance' THEN 1 ELSE 0 END)::INT            AS maintenance_assets,
  SUM(CASE WHEN status = 'Faulty'      THEN 1 ELSE 0 END)::INT            AS faulty_assets,
  (SELECT COUNT(*)::INT FROM alerts
   WHERE is_resolved = FALSE AND alert_type = 'Critical')                 AS critical_alerts,
  (SELECT COUNT(*)::INT FROM alerts
   WHERE is_resolved = FALSE)                                              AS total_alerts,
  (SELECT COUNT(DISTINCT asset_group_id)::INT
   FROM asset_groups WHERE is_active = TRUE)                              AS total_groups
FROM assets
WHERE is_active = TRUE;

-- REFRESH CONCURRENTLY için unique index zorunlu
CREATE UNIQUE INDEX IF NOT EXISTS uidx_mv_dashboard_kpi
  ON mv_dashboard_kpi ((1));


-- ─────────────────────────────────────────────────────────────
-- ADIM 9 — asset_monitoring RANGE partitioning
--           + DOUBLE PRECISION → REAL dönüşümü
--
--  Tablo zaten partitioned'sa (relkind = 'p') bu adım atlanır.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_max_id BIGINT;
BEGIN
  -- Zaten partitioned mi?
  IF EXISTS (
    SELECT 1
    FROM   pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  c.relname = 'asset_monitoring'
      AND  n.nspname = 'public'
      AND  c.relkind = 'p'   -- 'p' = partitioned table
  ) THEN
    RAISE NOTICE 'asset_monitoring zaten partitioned, ADIM 9 atlandı.';
    RETURN;
  END IF;

  -- ── 9a: Mevcut tabloyu yeniden adlandır ──
  ALTER TABLE asset_monitoring RENAME TO asset_monitoring_old;
  RAISE NOTICE '9a: asset_monitoring → asset_monitoring_old yeniden adlandırıldı.';

  -- ── 9a2: Eski constraint isimleri serbest bırak (yeni tablo aynı isimleri kullanacak) ──
  ALTER TABLE asset_monitoring_old DROP CONSTRAINT IF EXISTS uq_monitoring_asset_time;
  ALTER TABLE asset_monitoring_old DROP CONSTRAINT IF EXISTS asset_monitoring_pkey;
  RAISE NOTICE '9a2: Eski constraint isimleri serbest bırakıldı.';

  -- ── 9b: Sequence ──
  CREATE SEQUENCE IF NOT EXISTS asset_monitoring_monitoring_id_seq;

  -- ── 9c: Yeni partitioned tablo (REAL kolonlar) ──
  CREATE TABLE asset_monitoring (
    monitoring_id     BIGINT        NOT NULL DEFAULT nextval('asset_monitoring_monitoring_id_seq'),
    asset_id          INT           NOT NULL,
    monitoring_time   TIMESTAMP     NOT NULL DEFAULT NOW(),
    cpu_usage         REAL,
    ram_usage         REAL,
    disk_usage        REAL,
    gpu_usage         REAL,
    temperature       REAL,
    cpu_temperature   REAL,
    power_consumption REAL,
    fan_speed         INT,
    memory_used_gb    REAL,
    memory_total_gb   REAL,
    network_in_mbps   REAL,
    network_out_mbps  REAL,
    network_latency   REAL,
    uptime            BIGINT,
    is_online         BOOLEAN       DEFAULT TRUE,
    error_count       INT           DEFAULT 0,
    performance_score REAL,
    signal_strength   INT,
    last_updated      TIMESTAMP     DEFAULT NOW(),
    CONSTRAINT fk_monitoring_assets
      FOREIGN KEY (asset_id) REFERENCES assets(asset_id) ON DELETE CASCADE,
    CONSTRAINT uq_monitoring_asset_time
      UNIQUE (asset_id, monitoring_time),
    PRIMARY KEY (monitoring_id, monitoring_time)
  ) PARTITION BY RANGE (monitoring_time);

  -- Sequence ownership
  ALTER SEQUENCE asset_monitoring_monitoring_id_seq
    OWNED BY asset_monitoring.monitoring_id;

  RAISE NOTICE '9b-c: Yeni partitioned tablo ve sequence oluşturuldu.';

  -- ── 9d: Yıllık partition'lar ──
  CREATE TABLE asset_monitoring_2024
    PARTITION OF asset_monitoring
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

  CREATE TABLE asset_monitoring_2025
    PARTITION OF asset_monitoring
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

  CREATE TABLE asset_monitoring_2026
    PARTITION OF asset_monitoring
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

  CREATE TABLE asset_monitoring_2027
    PARTITION OF asset_monitoring
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

  CREATE TABLE asset_monitoring_2028
    PARTITION OF asset_monitoring
    FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');

  -- Gelecekteki veya tarih aralığı dışı veriler için
  CREATE TABLE asset_monitoring_default
    PARTITION OF asset_monitoring DEFAULT;

  RAISE NOTICE '9d: Partition''lar oluşturuldu (2024–2028 + default).';

  -- ── 9e: Veri kopyalama (DOUBLE PRECISION → REAL cast) ──
  INSERT INTO asset_monitoring (
    monitoring_id, asset_id, monitoring_time,
    cpu_usage, ram_usage, disk_usage, gpu_usage,
    temperature, cpu_temperature, power_consumption,
    fan_speed, memory_used_gb, memory_total_gb,
    network_in_mbps, network_out_mbps, network_latency,
    uptime, is_online, error_count,
    performance_score, signal_strength, last_updated
  )
  SELECT
    monitoring_id, asset_id, monitoring_time,
    cpu_usage::REAL, ram_usage::REAL, disk_usage::REAL, gpu_usage::REAL,
    temperature::REAL, cpu_temperature::REAL, power_consumption::REAL,
    fan_speed, memory_used_gb::REAL, memory_total_gb::REAL,
    network_in_mbps::REAL, network_out_mbps::REAL, network_latency::REAL,
    uptime, is_online, error_count,
    performance_score::REAL, signal_strength, last_updated
  FROM asset_monitoring_old
  WHERE monitoring_time IS NOT NULL;

  RAISE NOTICE '9e: Veri kopyalama tamamlandı.';

  -- ── 9f: Sequence'i max monitoring_id + 1'e ilerlet ──
  SELECT COALESCE(MAX(monitoring_id), 0) INTO v_max_id
  FROM asset_monitoring;

  PERFORM setval('asset_monitoring_monitoring_id_seq', GREATEST(v_max_id, 1), true);
  RAISE NOTICE '9f: Sequence % değerine sıfırlandı.', v_max_id;

  -- ── 9g: Eski tabloyu sil ──
  DROP TABLE asset_monitoring_old;
  RAISE NOTICE '9g: asset_monitoring_old silindi.';

END;
$$;


-- ─────────────────────────────────────────────────────────────
-- ADIM 10 — Performans indexleri (partitioned tablo üzerinde)
--            IF NOT EXISTS → yeniden çalıştırılabilir (idempotent)
-- ─────────────────────────────────────────────────────────────

-- asset_id lookup
CREATE INDEX IF NOT EXISTS idx_monitoring_asset_id
  ON asset_monitoring (asset_id);

-- Zaman sıralaması (DESC — en yeni önce)
CREATE INDEX IF NOT EXISTS idx_monitoring_time
  ON asset_monitoring (monitoring_time DESC);

-- Composite covering index (en kritik — OUTER APPLY TOP 1 yerine LATERAL)
CREATE INDEX IF NOT EXISTS idx_monitoring_asset_time
  ON asset_monitoring (asset_id, monitoring_time DESC)
  INCLUDE (temperature, power_consumption, cpu_usage, gpu_usage,
           ram_usage, is_online, performance_score, network_latency);

-- BRIN index — monitoring_time kronolojik sıralı giriliyor,
-- B-tree'nin 1/100'ü boyutunda ama benzer hız sağlar
CREATE INDEX IF NOT EXISTS idx_monitoring_time_brin
  ON asset_monitoring USING BRIN (monitoring_time);


-- ─────────────────────────────────────────────────────────────
-- NOT: TimescaleDB (Adım 10 — opsiyonel, OS kurulumu gerekli)
-- ─────────────────────────────────────────────────────────────
-- TimescaleDB kurulduktan sonra aşağıdaki komut mevcut veriyle
-- asset_monitoring'i hypertable'a dönüştürür:
--
--   SELECT create_hypertable(
--     'asset_monitoring', 'monitoring_time',
--     chunk_time_interval => INTERVAL '1 month',
--     migrate_data        => true
--   );
--
-- Kurulum: https://docs.timescale.com/install/latest/


-- ─────────────────────────────────────────────────────────────
-- Migration kaydı
-- ─────────────────────────────────────────────────────────────
INSERT INTO schema_migrations (version, description)
VALUES (
  '003',
  'Mimari iyileştirmeler: trgm + updated_date trigger + JSONB + CASCADE + MV + partition REAL + BRIN'
)
ON CONFLICT (version) DO NOTHING;

DO $$ BEGIN RAISE NOTICE '✅ Migration 003 başarıyla tamamlandı.'; END; $$;
