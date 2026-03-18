-- Migration 005: maintenance_records soft delete
-- maintenance_records tablosuna is_active sütunu ekle
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Mevcut kayıtların hepsi aktif
UPDATE maintenance_records SET is_active = TRUE WHERE is_active IS NULL;

-- Index: aktif bakım kayıtlarını hızlı filtrele
CREATE INDEX IF NOT EXISTS idx_maintenance_is_active ON maintenance_records(is_active);
