-- ============================================================
-- Migration 007: Buildings & Rooms seed + asset room_id ataması
-- Her kanal için 1 bina, grup tipine göre odalar,
-- ardından tüm asset'lere room_id atanır.
--
-- Bina → Oda → Asset hiyerarşisi:
--   channel 1 (TRT)            → building_id 1  → room_id 1-4
--   channel 2 (Turkuaz)        → building_id 2  → room_id 5-7
--   channel 3 (Ekol)           → building_id 3  → room_id 8-9
--   channel 4 (Demirören)      → building_id 4  → room_id 10-11
--   channel 5 (CNBC-e)         → building_id 5  → room_id 12-14
--   channel 6 (Now TV)         → building_id 6  → room_id 15-16
--   channel 7 (Digiturk)       → building_id 7  → room_id 17-20
--   channel 8 (TGRT Haber)     → building_id 8  → room_id 21-22
-- ============================================================

BEGIN;

-- Daha önce çalıştırılmışsa atla
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM buildings LIMIT 1) THEN
    RAISE NOTICE 'Buildings zaten dolu, Migration 007 atlanıyor.';
    RETURN;
  END IF;
END $$;

-- ============================================================
-- 1. BUILDINGS (her kanal için 1 merkez bina)
-- ============================================================
INSERT INTO buildings (channel_id, building_name, city, address) VALUES
(1, 'TRT Genel Müdürlük Teknik Merkezi',  'Ankara',   'Oran Mahallesi, Atatürk Bulvarı No:62'),
(2, 'Turkuaz Medya Yayın Merkezi',         'İstanbul', 'Esentepe Mah., Büyükdere Cad. No:127, Şişli'),
(3, 'Ekol TV Yayın Merkezi',               'İstanbul', 'Güneşli İş Merkezi No:42, Bağcılar'),
(4, 'Demirören Medya Yayın Kompleksi',     'İstanbul', 'Demirören Tower, Kağıthane'),
(5, 'CNBC-e Yayın Merkezi',               'İstanbul', 'Yapı Kredi Plaza B Blok, Levent'),
(6, 'Now TV Dijital Yayın Merkezi',        'İstanbul', 'Abdi İpekçi Cad. No:75, Şişli'),
(7, 'Digiturk Genel Müdürlük Kampüsü',    'İstanbul', 'Çırağan Cad. No:89, Beşiktaş'),
(8, 'TGRT Haber Yayın Merkezi',            'İstanbul', 'Piyalepaşa Bulvarı No:34, Okmeydanı');

-- ============================================================
-- 2. ROOMS (grup tipine göre oda ataması)
-- ============================================================

-- TRT (building_id=1) — 4 oda
INSERT INTO rooms (building_id, room_name, floor, room_type) VALUES
(1, 'TRT Sunucu Odası',    1,  'ServerRoom'),   -- room_id=1  → PLY(1) + ENC(2)
(1, 'TRT Network Odası',   1,  'ServerRoom'),   -- room_id=2  → TRN(3)
(1, 'TRT Arşiv Odası',    -1,  'ServerRoom'),   -- room_id=3  → ARC(4)
(1, 'TRT Depolama Odası', -1,  'ServerRoom');   -- room_id=4  → STR(5)

-- Turkuaz Medya (building_id=2) — 3 oda
INSERT INTO rooms (building_id, room_name, floor, room_type) VALUES
(2, 'Turkuaz Sunucu Odası',    1, 'ServerRoom'),  -- room_id=5  → PLY(6) + ENC(7)
(2, 'Turkuaz Network Odası',   1, 'ServerRoom'),  -- room_id=6  → TRN(8)
(2, 'Turkuaz Depolama Odası',  1, 'ServerRoom');  -- room_id=7  → STR(9)

-- Ekol TV (building_id=3) — 2 oda
INSERT INTO rooms (building_id, room_name, floor, room_type) VALUES
(3, 'Ekol Sunucu Odası',    1, 'ServerRoom'),  -- room_id=8  → PLY(10) + ENC(11)
(3, 'Ekol Depolama Odası',  1, 'ServerRoom');  -- room_id=9  → STR(12)

-- Demirören Medya (building_id=4) — 2 oda
INSERT INTO rooms (building_id, room_name, floor, room_type) VALUES
(4, 'Demirören Sunucu Odası',  1,  'ServerRoom'),  -- room_id=10 → PLY(13) + ENC(14)
(4, 'Demirören Arşiv Odası',  -1,  'ServerRoom');  -- room_id=11 → ARC(15)

-- CNBC-e (building_id=5) — 3 oda
INSERT INTO rooms (building_id, room_name, floor, room_type) VALUES
(5, 'CNBC-e Sunucu Odası',    1, 'ServerRoom'),  -- room_id=12 → PLY(16)
(5, 'CNBC-e Network Odası',   1, 'ServerRoom'),  -- room_id=13 → TRN(17)
(5, 'CNBC-e Depolama Odası',  1, 'ServerRoom');  -- room_id=14 → STR(18)

-- Now TV (building_id=6) — 2 oda
INSERT INTO rooms (building_id, room_name, floor, room_type) VALUES
(6, 'Now TV Sunucu Odası',    1, 'ServerRoom'),  -- room_id=15 → PLY(19) + ENC(20)
(6, 'Now TV Depolama Odası',  1, 'ServerRoom');  -- room_id=16 → STR(21)

-- Digiturk (building_id=7) — 4 oda
INSERT INTO rooms (building_id, room_name, floor, room_type) VALUES
(7, 'Digiturk Sunucu Odası',    1,  'ServerRoom'),  -- room_id=17 → PLY(22) + ENC(23)
(7, 'Digiturk Network Odası',   1,  'ServerRoom'),  -- room_id=18 → TRN(24)
(7, 'Digiturk Arşiv Odası',    -1,  'ServerRoom'),  -- room_id=19 → ARC(25)
(7, 'Digiturk Depolama Odası', -1,  'ServerRoom');  -- room_id=20 → STR(26)

-- TGRT Haber (building_id=8) — 2 oda
INSERT INTO rooms (building_id, room_name, floor, room_type) VALUES
(8, 'TGRT Sunucu Odası',    1, 'ServerRoom'),  -- room_id=21 → PLY(27) + ENC(28)
(8, 'TGRT Depolama Odası',  1, 'ServerRoom');  -- room_id=22 → STR(29)

-- ============================================================
-- 3. ASSETS → room_id ataması (asset_group_id üzerinden)
-- ============================================================
UPDATE assets SET room_id =
  CASE asset_group_id
    -- TRT
    WHEN 1  THEN 1   -- PLY  → TRT Sunucu Odası
    WHEN 2  THEN 1   -- ENC  → TRT Sunucu Odası
    WHEN 3  THEN 2   -- TRN  → TRT Network Odası
    WHEN 4  THEN 3   -- ARC  → TRT Arşiv Odası
    WHEN 5  THEN 4   -- STR  → TRT Depolama Odası
    -- Turkuaz Medya
    WHEN 6  THEN 5   -- PLY  → Turkuaz Sunucu Odası
    WHEN 7  THEN 5   -- ENC  → Turkuaz Sunucu Odası
    WHEN 8  THEN 6   -- TRN  → Turkuaz Network Odası
    WHEN 9  THEN 7   -- STR  → Turkuaz Depolama Odası
    -- Ekol TV
    WHEN 10 THEN 8   -- PLY  → Ekol Sunucu Odası
    WHEN 11 THEN 8   -- ENC  → Ekol Sunucu Odası
    WHEN 12 THEN 9   -- STR  → Ekol Depolama Odası
    -- Demirören Medya
    WHEN 13 THEN 10  -- PLY  → Demirören Sunucu Odası
    WHEN 14 THEN 10  -- ENC  → Demirören Sunucu Odası
    WHEN 15 THEN 11  -- ARC  → Demirören Arşiv Odası
    -- CNBC-e
    WHEN 16 THEN 12  -- PLY  → CNBC-e Sunucu Odası
    WHEN 17 THEN 13  -- TRN  → CNBC-e Network Odası
    WHEN 18 THEN 14  -- STR  → CNBC-e Depolama Odası
    -- Now TV
    WHEN 19 THEN 15  -- PLY  → Now TV Sunucu Odası
    WHEN 20 THEN 15  -- ENC  → Now TV Sunucu Odası
    WHEN 21 THEN 16  -- STR  → Now TV Depolama Odası
    -- Digiturk
    WHEN 22 THEN 17  -- PLY  → Digiturk Sunucu Odası
    WHEN 23 THEN 17  -- ENC  → Digiturk Sunucu Odası
    WHEN 24 THEN 18  -- TRN  → Digiturk Network Odası
    WHEN 25 THEN 19  -- ARC  → Digiturk Arşiv Odası
    WHEN 26 THEN 20  -- STR  → Digiturk Depolama Odası
    -- TGRT Haber
    WHEN 27 THEN 21  -- PLY  → TGRT Sunucu Odası
    WHEN 28 THEN 21  -- ENC  → TGRT Sunucu Odası
    WHEN 29 THEN 22  -- STR  → TGRT Depolama Odası
    ELSE NULL
  END
WHERE room_id IS NULL;

-- Migration kaydı
INSERT INTO schema_migrations (version, description)
VALUES ('007', 'Buildings & Rooms seed — 8 bina, 22 oda, asset room_id ataması')
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- ============================================================
-- Kontrol sorguları
-- ============================================================
SELECT 'Buildings' AS tablo, COUNT(*) AS adet FROM buildings
UNION ALL
SELECT 'Rooms',              COUNT(*)          FROM rooms
UNION ALL
SELECT 'Assets (room atandı)', COUNT(*)        FROM assets WHERE room_id IS NOT NULL
UNION ALL
SELECT 'Assets (room NULL)',   COUNT(*)        FROM assets WHERE room_id IS NULL;
