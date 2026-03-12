-- ============================================================
-- Migration 001: Performans İndeksleri + Veri Bütünlüğü
-- Tarih: 2026-03-06
-- Açıklama:
--   - AssetMonitoring(AssetID, MonitoringTime) UNIQUE kısıt
--   - 8 adet composite/covering index
--   - SchemaMigrations takip tablosu
-- ============================================================

USE AssetManagementDB;
GO

-- ============================================================
-- 0. Migration takip tablosu
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SchemaMigrations' AND xtype='U')
CREATE TABLE SchemaMigrations (
    MigrationID   INT PRIMARY KEY IDENTITY(1,1),
    Version       NVARCHAR(50) NOT NULL UNIQUE,
    Description   NVARCHAR(500),
    AppliedAt     DATETIME DEFAULT GETDATE()
);
GO

-- Bu migration daha önce çalıştırıldıysa atla
IF EXISTS (SELECT 1 FROM SchemaMigrations WHERE Version = '001')
BEGIN
    PRINT 'Migration 001 zaten uygulanmış. Atlandı.';
    RETURN;
END
GO

-- ============================================================
-- 1. UNIQUE kısıt — AssetMonitoring çift satır koruması
--    Önce mevcut duplikatleri temizle (en düşük MonitoringID'yi koru)
-- ============================================================
PRINT 'AssetMonitoring duplikatları temizleniyor...';
WITH CTE AS (
    SELECT MonitoringID,
           ROW_NUMBER() OVER (PARTITION BY AssetID, MonitoringTime ORDER BY MonitoringID ASC) AS rn
    FROM AssetMonitoring
)
DELETE FROM CTE WHERE rn > 1;
PRINT 'Temizlik tamamlandı.';

IF NOT EXISTS (
    SELECT * FROM sys.indexes
    WHERE name = 'UQ_Monitoring_AssetID_Time' AND object_id = OBJECT_ID('AssetMonitoring')
)
BEGIN
    ALTER TABLE AssetMonitoring
        ADD CONSTRAINT UQ_Monitoring_AssetID_Time UNIQUE (AssetID, MonitoringTime);
    PRINT 'UQ_Monitoring_AssetID_Time oluşturuldu.';
END
GO

-- ============================================================
-- 2. AssetMonitoring — En kritik composite + covering index
--    ROW_NUMBER yerine OUTER APPLY TOP 1 için zorunlu
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Monitoring_AssetID_Time_Cover')
BEGIN
    CREATE INDEX IDX_Monitoring_AssetID_Time_Cover
        ON AssetMonitoring(AssetID, MonitoringTime DESC)
        INCLUDE (Temperature, PowerConsumption, CPUUsage, GPUUsage, RAMUsage, IsOnline, PerformanceScore, NetworkLatency);
    PRINT 'IDX_Monitoring_AssetID_Time_Cover oluşturuldu.';
END
GO

-- ============================================================
-- 3. Assets — IsActive + ChannelID covering (getAll temel sorgusu)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Assets_IsActive_ChannelID_Cover')
BEGIN
    CREATE INDEX IDX_Assets_IsActive_ChannelID_Cover
        ON Assets(IsActive, ChannelID)
        INCLUDE (AssetName, RoomID, AssetGroupID, Status, AssetType);
    PRINT 'IDX_Assets_IsActive_ChannelID_Cover oluşturuldu.';
END
GO

-- ============================================================
-- 4. Assets — Status + IsActive (getDashboardKPI aggregation)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Assets_Status_IsActive')
BEGIN
    CREATE INDEX IDX_Assets_Status_IsActive
        ON Assets(Status, IsActive);
    PRINT 'IDX_Assets_Status_IsActive oluşturuldu.';
END
GO

-- ============================================================
-- 5. Alerts — IsResolved + AlertType (getCriticalAlerts)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Alerts_IsResolved_Type')
BEGIN
    CREATE INDEX IDX_Alerts_IsResolved_Type
        ON Alerts(IsResolved, AlertType)
        INCLUDE (AssetID, AlertSeverity, TriggeredTime);
    PRINT 'IDX_Alerts_IsResolved_Type oluşturuldu.';
END
GO

-- ============================================================
-- 6. MaintenanceRecords — Bakım forecast sorgusu
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Maintenance_AssetID_Status_Date')
BEGIN
    CREATE INDEX IDX_Maintenance_AssetID_Status_Date
        ON MaintenanceRecords(AssetID, Status)
        INCLUDE (NextMaintenanceDate, MaintenanceInterval, MaintenanceType);
    PRINT 'IDX_Maintenance_AssetID_Status_Date oluşturuldu.';
END
GO

-- ============================================================
-- 7. ActivityLog — Kullanıcı bazlı filtreleme (log sayfası)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_ActivityLog_UserID_Timestamp')
BEGIN
    CREATE INDEX IDX_ActivityLog_UserID_Timestamp
        ON ActivityLog(UserID, Timestamp DESC);
    PRINT 'IDX_ActivityLog_UserID_Timestamp oluşturuldu.';
END
GO

-- ============================================================
-- 8. AssetComponents — IsActive filtreli bileşen sorguları
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Components_AssetID_Active')
BEGIN
    CREATE INDEX IDX_Components_AssetID_Active
        ON AssetComponents(AssetID)
        WHERE IsActive = 1;
    PRINT 'IDX_Components_AssetID_Active oluşturuldu.';
END
GO

-- ============================================================
-- 9. Users — Aktif kullanıcı ChannelID lookup
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Users_ChannelID_Active')
BEGIN
    CREATE INDEX IDX_Users_ChannelID_Active
        ON Users(ChannelID)
        WHERE IsActive = 1;
    PRINT 'IDX_Users_ChannelID_Active oluşturuldu.';
END
GO

-- ============================================================
-- Migration kaydını ekle
-- ============================================================
INSERT INTO SchemaMigrations (Version, Description)
VALUES ('001', 'Performans indeksleri: UQ_Monitoring_AssetID_Time + 8 composite/covering index');

PRINT '✅ Migration 001 başarıyla tamamlandı.';
GO
