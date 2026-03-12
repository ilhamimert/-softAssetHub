require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'asset_hub',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

const createTriggerQuery = `
-- Hiyerarşi kurallarını dogrulayacak fonksiyon
CREATE OR REPLACE FUNCTION enforce_hierarchy_rules()
RETURNS TRIGGER AS $$
DECLARE
    parent_type VARCHAR(50);
BEGIN
    -- 'holding' veya 'bağımsız kanallar' (parent_id is null) yaratılırken sorun yok, atla
    IF NEW.node_type = 'holding' THEN
        RETURN NEW;
    END IF;
    
    -- parent_id zorunlu, kanal ve alti kesinlikle parent_id'siz olamaz
    IF NEW.parent_id IS NULL THEN
         RAISE EXCEPTION 'HATA: "%" turundeki "node" parent_id olmadan havada ("NULL") yaratilamaz!', NEW.node_type;
    END IF;

    -- parent'in ne tur bir dugum (node_type) oldugunu bul
    SELECT node_type INTO parent_type FROM physical_nodes WHERE node_id = NEW.parent_id;

    -- Validasyon kontrolleri
    IF NEW.node_type = 'kanal' AND parent_type != 'holding' THEN
        RAISE EXCEPTION 'HATA: "kanal" sadece "holding" altina eklenebilir. Baglanmaya calisilan parent turu: %', parent_type;
    END IF;

    IF NEW.node_type = 'bina' AND parent_type != 'kanal' THEN
        RAISE EXCEPTION 'HATA: "bina" sadece "kanal" altina eklenebilir. Baglanmaya calisilan parent turu: %', parent_type;
    END IF;

    IF NEW.node_type = 'oda' AND parent_type != 'bina' THEN
        RAISE EXCEPTION 'HATA: "oda" sadece "bina" altina eklenebilir. Baglanmaya calisilan parent turu: %', parent_type;
    END IF;

    IF NEW.node_type = 'bilgisayar' AND parent_type != 'oda' THEN
        RAISE EXCEPTION 'HATA: "bilgisayar" sunuculari dogrudan sadece "oda" altina eklenebilir. Baglanmaya calisilan parent turu: %', parent_type;
    END IF;
    
    IF NEW.node_type = 'eklenti' AND parent_type != 'bilgisayar' THEN
        RAISE EXCEPTION 'HATA: "eklenti" (GPU, RAM vb.) sadece bir "bilgisayar" altina eklenebilir. Baglanmaya calisilan parent turu: %', parent_type;
    END IF;

    -- Kurallar basariyla gecildi
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Insert ve Update oncesinde bu fonksiyonu calistiracak trigger
DROP TRIGGER IF EXISTS trg_enforce_hierarchy ON physical_nodes;
CREATE TRIGGER trg_enforce_hierarchy
    BEFORE INSERT OR UPDATE ON physical_nodes
    FOR EACH ROW
    EXECUTE FUNCTION enforce_hierarchy_rules();
`;

(async () => {
    try {
        await pool.query(createTriggerQuery);
        console.log("SQL Trigger created: Hierarchy rules are now strictly enforced in the database!");
    } catch (err) {
        console.error("Error creating trigger", err);
    } finally {
        pool.end();
    }
})();
