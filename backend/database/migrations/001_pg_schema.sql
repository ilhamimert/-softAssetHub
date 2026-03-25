-- ============================================================
-- BROADCAST ASSET MANAGEMENT SYSTEM - PostgreSQL Schema
-- Migrated from SQL Server 2019
-- Hierarchy: Holding -> Kanal -> Bina -> Oda -> Asset -> Component
-- ============================================================

-- ============================================================
-- 1. HOLDINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS holdings (
    holding_id    SERIAL PRIMARY KEY,
    holding_name  VARCHAR(100) NOT NULL,
    description   TEXT,
    website       VARCHAR(200),
    contact_email VARCHAR(100),
    logo_url      TEXT,
    created_date  TIMESTAMP DEFAULT NOW(),
    updated_date  TIMESTAMP DEFAULT NOW(),
    is_active     BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- 2. CHANNELS
-- ============================================================
CREATE TABLE IF NOT EXISTS channels (
    channel_id       SERIAL PRIMARY KEY,
    holding_id       INT,
    channel_name     VARCHAR(100) NOT NULL,
    description      TEXT,
    logo_url         TEXT,
    established_year INT,
    contact_email    VARCHAR(100),
    contact_phone    VARCHAR(20),
    website          VARCHAR(200),
    created_date     TIMESTAMP DEFAULT NOW(),
    updated_date     TIMESTAMP DEFAULT NOW(),
    is_active        BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_channels_holdings FOREIGN KEY (holding_id) REFERENCES holdings(holding_id)
);

-- ============================================================
-- 3. BUILDINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS buildings (
    building_id   SERIAL PRIMARY KEY,
    channel_id    INT NOT NULL,
    building_name VARCHAR(100) NOT NULL,
    city          VARCHAR(100),
    address       VARCHAR(255),
    is_active     BOOLEAN DEFAULT TRUE,
    created_date  TIMESTAMP DEFAULT NOW(),
    updated_date  TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_buildings_channels FOREIGN KEY (channel_id) REFERENCES channels(channel_id)
);

-- ============================================================
-- 4. ROOMS
-- ============================================================
CREATE TABLE IF NOT EXISTS rooms (
    room_id      SERIAL PRIMARY KEY,
    building_id  INT NOT NULL,
    room_name    VARCHAR(100) NOT NULL,
    floor        INT DEFAULT 1,
    room_type    VARCHAR(50) DEFAULT 'ServerRoom',
    capacity     INT,
    is_active    BOOLEAN DEFAULT TRUE,
    created_date TIMESTAMP DEFAULT NOW(),
    updated_date TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_rooms_buildings FOREIGN KEY (building_id) REFERENCES buildings(building_id)
);

-- ============================================================
-- 5. ASSET GROUPS (Opsiyonel Metadata)
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_groups (
    asset_group_id SERIAL PRIMARY KEY,
    channel_id     INT NOT NULL,
    group_name     VARCHAR(100) NOT NULL,
    group_type     VARCHAR(50) NOT NULL,
    description    TEXT,
    status         VARCHAR(50) DEFAULT 'operational',
    created_date   TIMESTAMP DEFAULT NOW(),
    updated_date   TIMESTAMP DEFAULT NOW(),
    is_active      BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_asset_groups_channels FOREIGN KEY (channel_id) REFERENCES channels(channel_id),
    CONSTRAINT chk_asset_groups_status CHECK (status IN ('operational','degraded','failed')),
    CONSTRAINT chk_asset_groups_type   CHECK (group_type IN ('Playout','Encoding','Transmission','Archive','Storage','General'))
);

-- ============================================================
-- 6. ASSETS
-- ============================================================
CREATE TABLE IF NOT EXISTS assets (
    asset_id          SERIAL PRIMARY KEY,
    room_id           INT,                         -- nullable (fiziksel konum opsiyonel)
    channel_id        INT NOT NULL,
    asset_group_id    INT,
    asset_name        VARCHAR(100) NOT NULL,
    asset_code        VARCHAR(50) UNIQUE,
    asset_type        VARCHAR(50) NOT NULL DEFAULT 'Server',
    model             VARCHAR(100),
    serial_number     VARCHAR(100) UNIQUE,
    manufacturer      VARCHAR(100),
    supplier          VARCHAR(100),
    purchase_date     DATE,
    warranty_end_date DATE,
    warranty_months   INT,
    purchase_cost     NUMERIC(12,2),
    current_value     NUMERIC(12,2),
    depreciation_rate DOUBLE PRECISION,
    rack_position     VARCHAR(100),
    ip_address        VARCHAR(45),
    mac_address       VARCHAR(17),
    firmware_version  VARCHAR(50),
    driver_version    VARCHAR(50),
    status            VARCHAR(50) DEFAULT 'Active',
    image_url         TEXT,
    notes             TEXT,
    created_date      TIMESTAMP DEFAULT NOW(),
    updated_date      TIMESTAMP DEFAULT NOW(),
    is_active         BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_assets_rooms        FOREIGN KEY (room_id)        REFERENCES rooms(room_id),
    CONSTRAINT fk_assets_channels     FOREIGN KEY (channel_id)     REFERENCES channels(channel_id),
    CONSTRAINT fk_assets_asset_groups FOREIGN KEY (asset_group_id) REFERENCES asset_groups(asset_group_id),
    CONSTRAINT chk_assets_status CHECK (status IN ('Active','Inactive','Maintenance','Retired','Faulty'))
);

-- ============================================================
-- 7. ASSET COMPONENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_components (
    component_id     SERIAL PRIMARY KEY,
    asset_id         INT NOT NULL,
    channel_id       INT NOT NULL,
    asset_group_id   INT,
    component_name   VARCHAR(100) NOT NULL,
    component_type   VARCHAR(50) NOT NULL,
    model            VARCHAR(100),
    serial_number    VARCHAR(100),
    manufacturer     VARCHAR(100),
    specifications   TEXT,
    purchase_date    DATE,
    warranty_end_date DATE,
    status           VARCHAR(50) DEFAULT 'Active',
    notes            TEXT,
    created_date     TIMESTAMP DEFAULT NOW(),
    updated_date     TIMESTAMP DEFAULT NOW(),
    is_active        BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_components_assets       FOREIGN KEY (asset_id)       REFERENCES assets(asset_id),
    CONSTRAINT fk_components_channels     FOREIGN KEY (channel_id)     REFERENCES channels(channel_id),
    CONSTRAINT fk_components_asset_groups FOREIGN KEY (asset_group_id) REFERENCES asset_groups(asset_group_id),
    CONSTRAINT chk_components_status CHECK (status IN ('Active','Faulty','Replaced'))
);

-- ============================================================
-- 8. ASSET MONITORING
-- ============================================================
CREATE TABLE IF NOT EXISTS asset_monitoring (
    monitoring_id      BIGSERIAL PRIMARY KEY,
    asset_id           INT NOT NULL,
    monitoring_time    TIMESTAMP DEFAULT NOW(),
    cpu_usage          DOUBLE PRECISION,
    ram_usage          DOUBLE PRECISION,
    disk_usage         DOUBLE PRECISION,
    gpu_usage          DOUBLE PRECISION,
    temperature        DOUBLE PRECISION,
    cpu_temperature    DOUBLE PRECISION,
    power_consumption  DOUBLE PRECISION,
    fan_speed          INT,
    memory_used_gb     DOUBLE PRECISION,
    memory_total_gb    DOUBLE PRECISION,
    network_in_mbps    DOUBLE PRECISION,
    network_out_mbps   DOUBLE PRECISION,
    network_latency    DOUBLE PRECISION,
    uptime             BIGINT,
    is_online          BOOLEAN DEFAULT TRUE,
    error_count        INT DEFAULT 0,
    performance_score  DOUBLE PRECISION,
    signal_strength    INT,
    last_updated       TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_monitoring_assets FOREIGN KEY (asset_id) REFERENCES assets(asset_id),
    CONSTRAINT uq_monitoring_asset_time UNIQUE (asset_id, monitoring_time)
);

-- ============================================================
-- 9. MAINTENANCE RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_records (
    maintenance_id        SERIAL PRIMARY KEY,
    asset_id              INT NOT NULL,
    maintenance_date      TIMESTAMP NOT NULL,
    maintenance_type      VARCHAR(100),
    description           TEXT,
    technician_name       VARCHAR(100),
    technician_email      VARCHAR(100),
    cost_amount           NUMERIC(12,2),
    status                VARCHAR(50) DEFAULT 'Completed',
    next_maintenance_date TIMESTAMP,
    maintenance_interval  INT,
    document_url          TEXT,
    notes                 TEXT,
    created_date          TIMESTAMP DEFAULT NOW(),
    updated_date          TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_maintenance_assets FOREIGN KEY (asset_id) REFERENCES assets(asset_id)
);

-- ============================================================
-- 10. ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
    alert_id           BIGSERIAL PRIMARY KEY,
    asset_id           INT,
    alert_type         VARCHAR(50) NOT NULL,
    alert_category     VARCHAR(100),
    alert_message      TEXT NOT NULL,
    alert_severity     INT NOT NULL,
    threshold_value    DOUBLE PRECISION,
    current_value      DOUBLE PRECISION,
    triggered_time     TIMESTAMP DEFAULT NOW(),
    resolved_time      TIMESTAMP,
    is_resolved        BOOLEAN DEFAULT FALSE,
    is_notified        BOOLEAN DEFAULT FALSE,
    resolution_notes   TEXT,
    resolved_by_user_id INT,
    created_by         VARCHAR(100),
    CONSTRAINT fk_alerts_assets FOREIGN KEY (asset_id) REFERENCES assets(asset_id),
    CONSTRAINT chk_alerts_type     CHECK (alert_type IN ('Critical','Warning','Info')),
    CONSTRAINT chk_alerts_severity CHECK (alert_severity BETWEEN 1 AND 5)
);

-- ============================================================
-- 11. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    user_id        SERIAL PRIMARY KEY,
    username       VARCHAR(100) UNIQUE NOT NULL,
    email          VARCHAR(100) UNIQUE NOT NULL,
    password_hash  TEXT NOT NULL,
    full_name      VARCHAR(100) NOT NULL,
    role           VARCHAR(50) NOT NULL,
    channel_id     INT,
    phone          VARCHAR(20),
    avatar         TEXT,
    department     VARCHAR(100),
    is_active      BOOLEAN DEFAULT TRUE,
    is_2fa_enabled BOOLEAN DEFAULT FALSE,
    last_login     TIMESTAMP,
    last_login_ip  VARCHAR(45),
    refresh_token  TEXT,
    created_date   TIMESTAMP DEFAULT NOW(),
    updated_date   TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_users_channels FOREIGN KEY (channel_id) REFERENCES channels(channel_id),
    CONSTRAINT chk_users_role CHECK (role IN ('Admin','Manager','Technician','Viewer'))
);

-- ============================================================
-- 12. ACTIVITY LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
    log_id      BIGSERIAL PRIMARY KEY,
    user_id     INT,
    action      VARCHAR(200) NOT NULL,
    entity_type VARCHAR(100),
    asset_id    INT,
    entity_id   INT,
    old_value   TEXT,
    new_value   TEXT,
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(500),
    timestamp   TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_activity_log_users FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ============================================================
-- 13. REPORTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
    report_id      SERIAL PRIMARY KEY,
    report_name    VARCHAR(200) NOT NULL,
    report_type    VARCHAR(50),
    channel_id     INT,
    date_range_from TIMESTAMP,
    date_range_to  TIMESTAMP,
    generated_date TIMESTAMP DEFAULT NOW(),
    generated_by   INT,
    report_data    TEXT,
    file_url       TEXT,
    expiry_date    TIMESTAMP,
    CONSTRAINT fk_reports_channels FOREIGN KEY (channel_id) REFERENCES channels(channel_id),
    CONSTRAINT fk_reports_users    FOREIGN KEY (generated_by) REFERENCES users(user_id)
);

-- ============================================================
-- 14. LICENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS licenses (
    license_id           SERIAL PRIMARY KEY,
    asset_id             INT NOT NULL,
    application_name     VARCHAR(100) NOT NULL,
    license_key          VARCHAR(500),
    mac_id               VARCHAR(17),
    expiry_date          DATE,
    feature_flags        TEXT,           -- JSON: '["GPI","HD","UHD"]'
    description          VARCHAR(500),
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    external_license_url VARCHAR(500),
    created_date         TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_date         TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by_user_id   INT,
    CONSTRAINT fk_licenses_asset FOREIGN KEY (asset_id)           REFERENCES assets(asset_id) ON DELETE CASCADE,
    CONSTRAINT fk_licenses_user  FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ============================================================
-- 15. SCHEMA MIGRATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_id SERIAL PRIMARY KEY,
    version      VARCHAR(50) NOT NULL UNIQUE,
    description  VARCHAR(500),
    applied_at   TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXLER
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_holdings_is_active         ON holdings(is_active);
CREATE INDEX IF NOT EXISTS idx_channels_holding_id        ON channels(holding_id);
CREATE INDEX IF NOT EXISTS idx_buildings_channel_id       ON buildings(channel_id);
CREATE INDEX IF NOT EXISTS idx_buildings_is_active        ON buildings(is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_building_id          ON rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_rooms_is_active            ON rooms(is_active);
CREATE INDEX IF NOT EXISTS idx_asset_groups_channel_id    ON asset_groups(channel_id);
CREATE INDEX IF NOT EXISTS idx_assets_room_id             ON assets(room_id);
CREATE INDEX IF NOT EXISTS idx_assets_channel_id          ON assets(channel_id);
CREATE INDEX IF NOT EXISTS idx_assets_status              ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_asset_type          ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_is_active_channel   ON assets(is_active, channel_id) INCLUDE (asset_name, room_id, asset_group_id, status, asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_status_is_active    ON assets(status, is_active);
CREATE INDEX IF NOT EXISTS idx_components_asset_id        ON asset_components(asset_id);
CREATE INDEX IF NOT EXISTS idx_components_channel_id      ON asset_components(channel_id);
CREATE INDEX IF NOT EXISTS idx_components_asset_active    ON asset_components(asset_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_monitoring_asset_id        ON asset_monitoring(asset_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_time            ON asset_monitoring(monitoring_time DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_asset_time      ON asset_monitoring(asset_id, monitoring_time DESC) INCLUDE (temperature, power_consumption, cpu_usage, gpu_usage, ram_usage, is_online, performance_score, network_latency);
CREATE INDEX IF NOT EXISTS idx_maintenance_asset_id       ON maintenance_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_asset_status   ON maintenance_records(asset_id, status) INCLUDE (next_maintenance_date, maintenance_interval, maintenance_type);
CREATE INDEX IF NOT EXISTS idx_alerts_asset_id            ON alerts(asset_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_resolved         ON alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved_type       ON alerts(is_resolved, alert_type) INCLUDE (asset_id, alert_severity, triggered_time);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id       ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp     ON activity_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_ts       ON activity_log(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_users_channel_active       ON users(channel_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_licenses_asset_id          ON licenses(asset_id);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry_date       ON licenses(expiry_date) WHERE expiry_date IS NOT NULL;

INSERT INTO schema_migrations (version, description)
VALUES ('001', 'İlk PostgreSQL şeması — SQL Server''dan taşındı')
ON CONFLICT (version) DO NOTHING;
