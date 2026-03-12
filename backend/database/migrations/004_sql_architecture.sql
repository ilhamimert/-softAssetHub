-- ============================================================
-- Migration 004: SQL Mimari İyileştirmeleri
-- Tarih: 2026-03-11
-- Adımlar:
--   1. TIMESTAMP → TIMESTAMPTZ  (tüm tablolar)
--   2. users.refresh_token → refresh_token_hash  (güvenlik)
--   3. asset_components.channel_id kaldır  (denormalizasyon)
--   4. mv_dashboard_kpi kanal bazlı yeniden oluştur
--   5. fn_create_monitoring_partition  (otomatik partition)
--   7. Row-Level Security (RLS) altyapısı
--   8. SERIAL → GENERATED ALWAYS AS IDENTITY
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- ADIM 1 — TIMESTAMP → TIMESTAMPTZ
-- Tüm non-partition tablolardaki TIMESTAMP WITHOUT TIME ZONE
-- kolonları TIMESTAMPTZ'e dönüştürür (idempotent).
-- asset_monitoring partition key (monitoring_time) hariç:
--   • monitoring_time partition key olduğu için ALTER edilemez.
--   • Yeni veri zaten UTC girileceğinden pratik fark sıfırdır.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  col_rec RECORD;
  partition_tables TEXT[] := ARRAY[
    'asset_monitoring',
    'asset_monitoring_2024', 'asset_monitoring_2025', 'asset_monitoring_2026',
    'asset_monitoring_2027', 'asset_monitoring_2028', 'asset_monitoring_default',
    'asset_monitoring_old'
  ];
BEGIN
  -- Tüm tablolar (partition'lar hariç)
  FOR col_rec IN
    SELECT table_name, column_name
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
      AND  data_type    = 'timestamp without time zone'
      AND  table_name   != ALL(partition_tables)
    ORDER BY table_name, column_name
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I AT TIME ZONE ''UTC''',
      col_rec.table_name, col_rec.column_name, col_rec.column_name
    );
    RAISE NOTICE 'TIMESTAMPTZ: %.%', col_rec.table_name, col_rec.column_name;
  END LOOP;

  -- asset_monitoring: sadece partition key olmayan kolonlar
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = 'asset_monitoring'
      AND  column_name  = 'last_updated'
      AND  data_type    = 'timestamp without time zone'
  ) THEN
    ALTER TABLE asset_monitoring
      ALTER COLUMN last_updated TYPE TIMESTAMPTZ USING last_updated AT TIME ZONE 'UTC';
    RAISE NOTICE 'TIMESTAMPTZ: asset_monitoring.last_updated';
  END IF;

  RAISE NOTICE '✅ ADIM 1 tamamlandı: TIMESTAMPTZ dönüşümü.';
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- ADIM 2 — users.refresh_token → refresh_token_hash
-- Plaintext JWT yerine SHA-256 hash saklanır.
-- Uygulama kodu (authController.js) crypto.createHash kullanacak.
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = 'users'
      AND  column_name  = 'refresh_token'
  ) THEN
    -- Mevcut plaintext token'ları geçersiz kıl (güvenlik gereği)
    UPDATE users SET refresh_token = NULL WHERE refresh_token IS NOT NULL;

    ALTER TABLE users
      RENAME COLUMN refresh_token TO refresh_token_hash;

    RAISE NOTICE 'users.refresh_token → refresh_token_hash yeniden adlandırıldı.';
  ELSE
    RAISE NOTICE 'users.refresh_token_hash zaten var, atlandı.';
  END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- ADIM 3 — asset_components.channel_id kaldır
-- channel_id; asset_id → assets → channel_id zinciri üzerinden
-- zaten erişilebilir. Denormalizasyon ve veri tutarsızlığı riski.
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = 'asset_components'
      AND  column_name  = 'channel_id'
  ) THEN
    -- FK kısıtı önce kaldır
    ALTER TABLE asset_components DROP CONSTRAINT IF EXISTS fk_components_channels;
    -- İndeks kaldır
    DROP INDEX IF EXISTS idx_components_channel_id;
    -- Kolon kaldır
    ALTER TABLE asset_components DROP COLUMN channel_id;
    RAISE NOTICE 'asset_components.channel_id kaldırıldı.';
  ELSE
    RAISE NOTICE 'asset_components.channel_id zaten yok, atlandı.';
  END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- ADIM 4 — mv_dashboard_kpi → kanal bazlı yeniden oluştur
-- Önceki MV tüm sistemin toplamını döndürüyordu.
-- Yeni MV her kanal için ayrı satır döndürür;
-- unique index channel_id üzerinde → REFRESH CONCURRENTLY uyumlu.
-- ─────────────────────────────────────────────────────────────
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_kpi;

CREATE MATERIALIZED VIEW mv_dashboard_kpi AS
SELECT
  c.channel_id,
  c.channel_name,
  COUNT(a.asset_id)::INT                                               AS total_assets,
  SUM(CASE WHEN a.status = 'Active'      THEN 1 ELSE 0 END)::INT      AS active_assets,
  SUM(CASE WHEN a.status = 'Maintenance' THEN 1 ELSE 0 END)::INT      AS maintenance_assets,
  SUM(CASE WHEN a.status = 'Faulty'      THEN 1 ELSE 0 END)::INT      AS faulty_assets,
  SUM(CASE WHEN a.status = 'Retired'     THEN 1 ELSE 0 END)::INT      AS retired_assets,
  (
    SELECT COUNT(*)::INT FROM alerts al
    JOIN assets ax ON al.asset_id = ax.asset_id
    WHERE ax.channel_id = c.channel_id
      AND al.is_resolved = FALSE
      AND al.alert_type  = 'Critical'
  )                                                                    AS critical_alerts,
  (
    SELECT COUNT(*)::INT FROM alerts al
    JOIN assets ax ON al.asset_id = ax.asset_id
    WHERE ax.channel_id = c.channel_id
      AND al.is_resolved = FALSE
  )                                                                    AS total_alerts,
  (
    SELECT COUNT(DISTINCT asset_group_id)::INT
    FROM   asset_groups ag
    WHERE  ag.channel_id = c.channel_id
      AND  ag.is_active  = TRUE
  )                                                                    AS total_groups,
  NOW()                                                                AS refreshed_at
FROM channels c
LEFT JOIN assets a
  ON  a.channel_id = c.channel_id
  AND a.is_active  = TRUE
WHERE c.is_active = TRUE
GROUP BY c.channel_id, c.channel_name
ORDER BY c.channel_name;

-- REFRESH CONCURRENTLY için unique index gerekli
CREATE UNIQUE INDEX uidx_mv_dashboard_kpi_channel
  ON mv_dashboard_kpi (channel_id);

DO $$ BEGIN RAISE NOTICE '✅ ADIM 4 tamamlandı: mv_dashboard_kpi kanal bazlı yeniden oluşturuldu.'; END; $$;


-- ─────────────────────────────────────────────────────────────
-- ADIM 5 — fn_create_monitoring_partition
-- Her yıl başında otomatik partition oluşturur.
-- monitoringScheduler.js bu fonksiyonu her yılın ilk günü çağırır.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_create_monitoring_partition(p_year INT)
RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
  v_table_name TEXT := 'asset_monitoring_' || p_year;
  v_from       TEXT := p_year       || '-01-01';
  v_to         TEXT := (p_year + 1) || '-01-01';
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN   pg_namespace n ON n.oid = c.relnamespace
    WHERE  c.relname = v_table_name
      AND  n.nspname = 'public'
  ) THEN
    RETURN format('Zaten mevcut: %s', v_table_name);
  END IF;

  EXECUTE format(
    'CREATE TABLE %I PARTITION OF asset_monitoring
     FOR VALUES FROM (%L) TO (%L)',
    v_table_name, v_from, v_to
  );

  RETURN format('Oluşturuldu: %s (%s – %s)', v_table_name, v_from, v_to);
END;
$$;

-- Gelecek yıllar için önceden oluştur (2029-2030)
SELECT fn_create_monitoring_partition(2029);
SELECT fn_create_monitoring_partition(2030);

DO $$ BEGIN RAISE NOTICE '✅ ADIM 5 tamamlandı: fn_create_monitoring_partition oluşturuldu.'; END; $$;


-- ─────────────────────────────────────────────────────────────
-- ADIM 7 — Row-Level Security (RLS) altyapısı
--
-- Politikalar SET LOCAL app.user_role / app.channel_id değerlerine
-- göre filtreler. Uygulama tarafı: database.js withRLS() helper'ı
-- her istek için bu değerleri transaction içinde SET LOCAL ile atar.
--
-- Admin: tüm verileri görür.
-- Manager/Technician/Viewer: yalnızca kendi kanalı.
-- ─────────────────────────────────────────────────────────────

-- Yardımcı fonksiyonlar (güvenli current_setting okuma)
CREATE OR REPLACE FUNCTION fn_app_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('app.user_role', TRUE), 'Admin');
$$;

CREATE OR REPLACE FUNCTION fn_app_channel_id()
RETURNS INT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('app.channel_id', TRUE)::INT, 0);
$$;

-- assets tablosu
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_assets ON assets;
CREATE POLICY rls_assets ON assets
  AS PERMISSIVE FOR ALL
  USING (
    fn_app_role() = 'Admin'
    OR channel_id = fn_app_channel_id()
  );

-- alerts tablosu (asset üzerinden kanal kontrolü)
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_alerts ON alerts;
CREATE POLICY rls_alerts ON alerts
  AS PERMISSIVE FOR ALL
  USING (
    fn_app_role() = 'Admin'
    OR asset_id IS NULL
    OR asset_id IN (
      SELECT asset_id FROM assets WHERE channel_id = fn_app_channel_id()
    )
  );

-- asset_groups tablosu
ALTER TABLE asset_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_asset_groups ON asset_groups;
CREATE POLICY rls_asset_groups ON asset_groups
  AS PERMISSIVE FOR ALL
  USING (
    fn_app_role() = 'Admin'
    OR channel_id = fn_app_channel_id()
  );

-- maintenance_records tablosu
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_maintenance ON maintenance_records;
CREATE POLICY rls_maintenance ON maintenance_records
  AS PERMISSIVE FOR ALL
  USING (
    fn_app_role() = 'Admin'
    OR asset_id IN (
      SELECT asset_id FROM assets WHERE channel_id = fn_app_channel_id()
    )
  );

-- users tablosu (Admin herkesi, diğerleri sadece kendi kanalı)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_users ON users;
CREATE POLICY rls_users ON users
  AS PERMISSIVE FOR ALL
  USING (
    fn_app_role() = 'Admin'
    OR user_id = current_setting('app.user_id', TRUE)::INT
    OR channel_id = fn_app_channel_id()
  );

-- DB sahibi (postgres) RLS'den muaf — uygulama için BYPASS gerekirse:
-- ALTER ROLE postgres BYPASSRLS;

DO $$ BEGIN RAISE NOTICE '✅ ADIM 7 tamamlandı: RLS politikaları oluşturuldu.'; END; $$;


-- ─────────────────────────────────────────────────────────────
-- ADIM 8 — SERIAL → GENERATED ALWAYS AS IDENTITY
-- SERIAL = INT + sequence + DEFAULT nextval(...)  (PostgreSQL özel)
-- IDENTITY = SQL standartı (ISO/IEC 9075), daha güvenli
-- asset_monitoring PK ayrı sequence kullandığından hariç tutulur.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_tables  TEXT[] := ARRAY[
    'holdings','channels','buildings','rooms','asset_groups',
    'assets','asset_components','maintenance_records',
    'users','reports','licenses','schema_migrations'
  ];
  v_cols    TEXT[] := ARRAY[
    'holding_id','channel_id','building_id','room_id','asset_group_id',
    'asset_id','component_id','maintenance_id',
    'user_id','report_id','license_id','migration_id'
  ];
  v_big_t   TEXT[] := ARRAY['activity_log','alerts'];
  v_big_c   TEXT[] := ARRAY['log_id','alert_id'];
  i         INT;
  v_max     BIGINT;
  v_gen     TEXT;
BEGIN
  FOR i IN 1..array_length(v_tables, 1) LOOP
    SELECT identity_generation
    INTO   v_gen
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = v_tables[i]
      AND  column_name  = v_cols[i];

    IF v_gen IS NULL THEN
      EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', v_cols[i], v_tables[i])
        INTO v_max;
      EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT', v_tables[i], v_cols[i]);
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I ADD GENERATED ALWAYS AS IDENTITY (START WITH %s)',
        v_tables[i], v_cols[i], v_max + 1
      );
      EXECUTE format(
        'DROP SEQUENCE IF EXISTS %I',
        v_tables[i] || '_' || v_cols[i] || '_seq'
      );
      RAISE NOTICE 'IDENTITY: %.% (START WITH %)', v_tables[i], v_cols[i], v_max + 1;
    ELSE
      RAISE NOTICE 'Zaten IDENTITY: %.%', v_tables[i], v_cols[i];
    END IF;
  END LOOP;

  FOR i IN 1..array_length(v_big_t, 1) LOOP
    SELECT identity_generation
    INTO   v_gen
    FROM   information_schema.columns
    WHERE  table_schema = 'public'
      AND  table_name   = v_big_t[i]
      AND  column_name  = v_big_c[i];

    IF v_gen IS NULL THEN
      EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', v_big_c[i], v_big_t[i])
        INTO v_max;
      EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT', v_big_t[i], v_big_c[i]);
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I ADD GENERATED ALWAYS AS IDENTITY (START WITH %s)',
        v_big_t[i], v_big_c[i], v_max + 1
      );
      EXECUTE format(
        'DROP SEQUENCE IF EXISTS %I',
        v_big_t[i] || '_' || v_big_c[i] || '_seq'
      );
      RAISE NOTICE 'IDENTITY (BIGINT): %.% (START WITH %)', v_big_t[i], v_big_c[i], v_max + 1;
    ELSE
      RAISE NOTICE 'Zaten IDENTITY: %.%', v_big_t[i], v_big_c[i];
    END IF;
  END LOOP;

  RAISE NOTICE '✅ ADIM 8 tamamlandı: SERIAL → IDENTITY dönüşümü.';
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- Migration kaydı
-- ─────────────────────────────────────────────────────────────
INSERT INTO schema_migrations (version, description)
VALUES (
  '004',
  'SQL mimari: TIMESTAMPTZ + refresh_token_hash + drop component.channel_id + kanal-MV + partition-fn + RLS + IDENTITY'
)
ON CONFLICT (version) DO NOTHING;

DO $$ BEGIN RAISE NOTICE '✅ Migration 004 başarıyla tamamlandı.'; END; $$;
