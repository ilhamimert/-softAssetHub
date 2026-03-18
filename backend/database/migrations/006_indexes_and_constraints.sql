-- ============================================================
-- Migration 006: İndeksler + Veri Bütünlüğü Kısıtları
-- Tarih: 2026-03-17
-- İçerik:
--   1. physical_nodes.created_at index
--   2. licenses.expiry_date index
--   3. physical_nodes → assets FK (asset_id)
--   4. asset_components → maintenance_records FK koruması
-- ============================================================

-- ── 1. physical_nodes — created_at index (ORDER BY created_at sorguları) ────
CREATE INDEX IF NOT EXISTS idx_physical_nodes_created_at
    ON physical_nodes(created_at);

-- ── 2. licenses — expiry_date index (ILIKE + expiry range sorguları) ─────────
CREATE INDEX IF NOT EXISTS idx_licenses_expiry_date
    ON licenses(expiry_date)
    WHERE is_active = TRUE;

-- ── 3. physical_nodes.asset_id → assets FK ───────────────────────────────────
-- Önce kolon var mı kontrol et, yoksa sorun çıkartma
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'physical_nodes' AND column_name = 'asset_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'physical_nodes'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'asset_id'
  ) THEN
    ALTER TABLE physical_nodes
      ADD CONSTRAINT fk_physical_nodes_asset
      FOREIGN KEY (asset_id) REFERENCES assets(asset_id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ── 4. asset_monitoring — ek covering index (getHistory range sorguları) ──────
CREATE INDEX IF NOT EXISTS idx_monitoring_asset_time_cover
    ON asset_monitoring(asset_id, monitoring_time DESC)
    INCLUDE (cpu_usage, ram_usage, temperature, power_consumption, gpu_usage, is_online);

-- ── 5. assets — warranty_end_date index (getWarrantyExpiring sorgusu) ─────────
CREATE INDEX IF NOT EXISTS idx_assets_warranty_end_date
    ON assets(warranty_end_date)
    WHERE is_active = TRUE AND warranty_end_date IS NOT NULL;

-- ── 6. assets — serial_number UNIQUE sadece NOT NULL için ────────────────────
-- PostgreSQL zaten birden fazla NULL'a izin verir, bu yüzden NULL'lar unique
-- ihlali yaratmaz. Ek: partial unique index ile NULL dışındaki değerleri koru.
CREATE UNIQUE INDEX IF NOT EXISTS uidx_assets_serial_number_notnull
    ON assets(serial_number)
    WHERE serial_number IS NOT NULL AND is_active = TRUE;
