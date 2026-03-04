-- ============================================================
-- BROADCAST ASSET MANAGEMENT SYSTEM - Database Schema
-- SQL Server 2019+
-- Hierarchy: Holding -> Kanal -> Bina -> Oda -> Bilgisayar/Asset -> Eklenti
-- AssetGroups: opsiyonel metadata (agacta gosterilmiyor)
-- ============================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'AssetManagementDB')
BEGIN
    CREATE DATABASE AssetManagementDB;
END
GO

USE AssetManagementDB;
GO

-- ============================================================
-- 1. HOLDINGS (Holding / Broadcast Grubu)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Holdings' AND xtype='U')
CREATE TABLE Holdings (
    HoldingID     INT PRIMARY KEY IDENTITY(1,1),
    HoldingName   NVARCHAR(100) NOT NULL,
    Description   NVARCHAR(500),
    Website       NVARCHAR(200),
    ContactEmail  NVARCHAR(100),
    LogoUrl       NVARCHAR(MAX),
    CreatedDate   DATETIME DEFAULT GETDATE(),
    UpdatedDate   DATETIME DEFAULT GETDATE(),
    IsActive      BIT DEFAULT 1
);

-- ============================================================
-- 2. CHANNELS (Kanallar / Yayın Şirketleri)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Channels' AND xtype='U')
CREATE TABLE Channels (
    ChannelID     INT PRIMARY KEY IDENTITY(1,1),
    HoldingID     INT,
    ChannelName   NVARCHAR(100) NOT NULL,
    Description   NVARCHAR(500),
    LogoUrl       NVARCHAR(MAX),
    EstablishedYear INT,
    ContactEmail  NVARCHAR(100),
    ContactPhone  NVARCHAR(20),
    Website       NVARCHAR(200),
    CreatedDate   DATETIME DEFAULT GETDATE(),
    UpdatedDate   DATETIME DEFAULT GETDATE(),
    IsActive      BIT DEFAULT 1,
    CONSTRAINT FK_Channels_Holdings FOREIGN KEY (HoldingID) REFERENCES Holdings(HoldingID)
);

-- ============================================================
-- 3. BUILDINGS (Binalar - Fiziksel Konum Katman 1)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Buildings' AND xtype='U')
CREATE TABLE Buildings (
    BuildingID    INT PRIMARY KEY IDENTITY(1,1),
    ChannelID     INT NOT NULL,
    BuildingName  NVARCHAR(100) NOT NULL,
    City          NVARCHAR(100),
    Address       NVARCHAR(255),
    IsActive      BIT DEFAULT 1,
    CreatedDate   DATETIME DEFAULT GETDATE(),
    UpdatedDate   DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Buildings_Channels FOREIGN KEY (ChannelID) REFERENCES Channels(ChannelID)
);

-- ============================================================
-- 4. ROOMS (Odalar - Fiziksel Konum Katman 2)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Rooms' AND xtype='U')
CREATE TABLE Rooms (
    RoomID        INT PRIMARY KEY IDENTITY(1,1),
    BuildingID    INT NOT NULL,
    RoomName      NVARCHAR(100) NOT NULL,
    Floor         INT DEFAULT 1,
    RoomType      NVARCHAR(50) DEFAULT 'ServerRoom',
    Capacity      INT,
    IsActive      BIT DEFAULT 1,
    CreatedDate   DATETIME DEFAULT GETDATE(),
    UpdatedDate   DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Rooms_Buildings FOREIGN KEY (BuildingID) REFERENCES Buildings(BuildingID)
);

-- ============================================================
-- 5. ASSET GROUPS (Varlık Grupları - Opsiyonel Metadata)
-- Playout, Encoding, Transmission, Archive, Storage
-- Ağaçta gösterilmez, asset için kategori bilgisi
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AssetGroups' AND xtype='U')
CREATE TABLE AssetGroups (
    AssetGroupID  INT PRIMARY KEY IDENTITY(1,1),
    ChannelID     INT NOT NULL,
    GroupName     NVARCHAR(100) NOT NULL,
    GroupType     NVARCHAR(50) NOT NULL,
    Description   NVARCHAR(500),
    Status        NVARCHAR(50) DEFAULT 'operational',
    CreatedDate   DATETIME DEFAULT GETDATE(),
    UpdatedDate   DATETIME DEFAULT GETDATE(),
    IsActive      BIT DEFAULT 1,
    CONSTRAINT FK_AssetGroups_Channels FOREIGN KEY (ChannelID) REFERENCES Channels(ChannelID),
    CONSTRAINT CHK_AssetGroups_Status CHECK (Status IN ('operational','degraded','failed')),
    CONSTRAINT CHK_AssetGroups_Type CHECK (GroupType IN ('Playout','Encoding','Transmission','Archive','Storage','General'))
);

-- ============================================================
-- 6. ASSETS (Varlıklar / Bilgisayarlar)
-- RoomID: fiziksel konum (zorunlu)
-- AssetGroupID: fonksiyonel kategori (opsiyonel metadata)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Assets' AND xtype='U')
CREATE TABLE Assets (
    AssetID           INT PRIMARY KEY IDENTITY(1,1),
    RoomID            INT NOT NULL,                -- FK -> Rooms (fiziksel konum)
    ChannelID         INT NOT NULL,                -- Hızlı sorgu için denormalize
    AssetGroupID      INT NULL,                    -- Opsiyonel metadata FK -> AssetGroups
    AssetName         NVARCHAR(100) NOT NULL,
    AssetCode         NVARCHAR(50) UNIQUE,
    AssetType         NVARCHAR(50) NOT NULL DEFAULT 'Server',
    Model             NVARCHAR(100),
    SerialNumber      NVARCHAR(100) UNIQUE,
    Manufacturer      NVARCHAR(100),
    Supplier          NVARCHAR(100),
    PurchaseDate      DATE,
    WarrantyEndDate   DATE,
    WarrantyMonths    INT,
    PurchaseCost      DECIMAL(12,2),
    CurrentValue      DECIMAL(12,2),
    DepreciationRate  FLOAT,
    RackPosition      NVARCHAR(100),
    IPAddress         NVARCHAR(45),
    MACAddress        NVARCHAR(17),
    FirmwareVersion   NVARCHAR(50),
    DriverVersion     NVARCHAR(50),
    Status            NVARCHAR(50) DEFAULT 'Active',
    ImageUrl          NVARCHAR(MAX),
    Notes             NVARCHAR(MAX),
    CreatedDate       DATETIME DEFAULT GETDATE(),
    UpdatedDate       DATETIME DEFAULT GETDATE(),
    IsActive          BIT DEFAULT 1,
    CONSTRAINT FK_Assets_Rooms        FOREIGN KEY (RoomID)       REFERENCES Rooms(RoomID),
    CONSTRAINT FK_Assets_Channels     FOREIGN KEY (ChannelID)    REFERENCES Channels(ChannelID),
    CONSTRAINT FK_Assets_AssetGroups  FOREIGN KEY (AssetGroupID) REFERENCES AssetGroups(AssetGroupID),
    CONSTRAINT CHK_Assets_Status CHECK (Status IN ('Active','Inactive','Maintenance','Retired','Faulty'))
);

-- ============================================================
-- 7. ASSET COMPONENTS (Eklentiler - Alt Bileşenler)
-- GPU, RAM, NIC, Storage kartları vb.
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AssetComponents' AND xtype='U')
CREATE TABLE AssetComponents (
    ComponentID    INT PRIMARY KEY IDENTITY(1,1),
    AssetID        INT NOT NULL,
    ChannelID      INT NOT NULL,
    AssetGroupID   INT NULL,                       -- Opsiyonel metadata
    ComponentName  NVARCHAR(100) NOT NULL,
    ComponentType  NVARCHAR(50) NOT NULL,
    Model          NVARCHAR(100),
    SerialNumber   NVARCHAR(100),
    Manufacturer   NVARCHAR(100),
    Specifications NVARCHAR(MAX),
    PurchaseDate   DATE,
    WarrantyEndDate DATE,
    Status         NVARCHAR(50) DEFAULT 'Active',
    Notes          NVARCHAR(MAX),
    CreatedDate    DATETIME DEFAULT GETDATE(),
    UpdatedDate    DATETIME DEFAULT GETDATE(),
    IsActive       BIT DEFAULT 1,
    CONSTRAINT FK_Components_Assets      FOREIGN KEY (AssetID)      REFERENCES Assets(AssetID),
    CONSTRAINT FK_Components_Channels    FOREIGN KEY (ChannelID)    REFERENCES Channels(ChannelID),
    CONSTRAINT FK_Components_AssetGroups FOREIGN KEY (AssetGroupID) REFERENCES AssetGroups(AssetGroupID),
    CONSTRAINT CHK_Components_Status CHECK (Status IN ('Active','Faulty','Replaced'))
);

-- ============================================================
-- 8. ASSET MONITORING (Canlı İzleme Verileri)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AssetMonitoring' AND xtype='U')
CREATE TABLE AssetMonitoring (
    MonitoringID       BIGINT PRIMARY KEY IDENTITY(1,1),
    AssetID            INT NOT NULL,
    MonitoringTime     DATETIME DEFAULT GETDATE(),
    CPUUsage           FLOAT,
    RAMUsage           FLOAT,
    DiskUsage          FLOAT,
    GPUUsage           FLOAT,
    Temperature        FLOAT,
    CPUTemperature     FLOAT,
    PowerConsumption   FLOAT,
    FanSpeed           INT,
    MemoryUsedGB       FLOAT,
    MemoryTotalGB      FLOAT,
    NetworkInMbps      FLOAT,
    NetworkOutMbps     FLOAT,
    NetworkLatency     FLOAT,
    Uptime             BIGINT,
    IsOnline           BIT DEFAULT 1,
    ErrorCount         INT DEFAULT 0,
    PerformanceScore   FLOAT,
    SignalStrength     INT,
    LastUpdated        DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Monitoring_Assets FOREIGN KEY (AssetID) REFERENCES Assets(AssetID)
);

-- ============================================================
-- 9. MAINTENANCE RECORDS (Bakım Kayıtları)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MaintenanceRecords' AND xtype='U')
CREATE TABLE MaintenanceRecords (
    MaintenanceID       INT PRIMARY KEY IDENTITY(1,1),
    AssetID             INT NOT NULL,
    MaintenanceDate     DATETIME NOT NULL,
    MaintenanceType     NVARCHAR(100),
    Description         NVARCHAR(MAX),
    TechnicianName      NVARCHAR(100),
    TechnicianEmail     NVARCHAR(100),
    CostAmount          DECIMAL(12,2),
    Status              NVARCHAR(50) DEFAULT 'Completed',
    NextMaintenanceDate DATETIME,
    MaintenanceInterval INT,
    DocumentURL         NVARCHAR(MAX),
    Notes               NVARCHAR(MAX),
    CreatedDate         DATETIME DEFAULT GETDATE(),
    UpdatedDate         DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Maintenance_Assets FOREIGN KEY (AssetID) REFERENCES Assets(AssetID)
);

-- ============================================================
-- 10. ALERTS (Uyarılar)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Alerts' AND xtype='U')
CREATE TABLE Alerts (
    AlertID           BIGINT PRIMARY KEY IDENTITY(1,1),
    AssetID           INT,
    AlertType         NVARCHAR(50) NOT NULL,
    AlertCategory     NVARCHAR(100),
    AlertMessage      NVARCHAR(MAX) NOT NULL,
    AlertSeverity     INT NOT NULL,
    ThresholdValue    FLOAT,
    CurrentValue      FLOAT,
    TriggeredTime     DATETIME DEFAULT GETDATE(),
    ResolvedTime      DATETIME,
    IsResolved        BIT DEFAULT 0,
    IsNotified        BIT DEFAULT 0,
    ResolutionNotes   NVARCHAR(MAX),
    ResolvedByUserID  INT,
    CreatedBy         NVARCHAR(100),
    CONSTRAINT FK_Alerts_Assets FOREIGN KEY (AssetID) REFERENCES Assets(AssetID),
    CONSTRAINT CHK_Alerts_Type CHECK (AlertType IN ('Critical','Warning','Info')),
    CONSTRAINT CHK_Alerts_Severity CHECK (AlertSeverity BETWEEN 1 AND 5)
);

-- ============================================================
-- 11. USERS (Kullanıcılar)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
CREATE TABLE Users (
    UserID        INT PRIMARY KEY IDENTITY(1,1),
    Username      NVARCHAR(100) UNIQUE NOT NULL,
    Email         NVARCHAR(100) UNIQUE NOT NULL,
    PasswordHash  NVARCHAR(MAX) NOT NULL,
    FullName      NVARCHAR(100) NOT NULL,
    Role          NVARCHAR(50) NOT NULL,
    ChannelID     INT,
    Phone         NVARCHAR(20),
    Avatar        NVARCHAR(MAX),
    Department    NVARCHAR(100),
    IsActive      BIT DEFAULT 1,
    Is2FAEnabled  BIT DEFAULT 0,
    LastLogin     DATETIME,
    LastLoginIP   NVARCHAR(45),
    RefreshToken  NVARCHAR(MAX),
    CreatedDate   DATETIME DEFAULT GETDATE(),
    UpdatedDate   DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Users_Channels FOREIGN KEY (ChannelID) REFERENCES Channels(ChannelID),
    CONSTRAINT CHK_Users_Role CHECK (Role IN ('Admin','Manager','Technician','Viewer'))
);

-- ============================================================
-- 12. ACTIVITY LOG (Aktivite Günlüğü)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ActivityLog' AND xtype='U')
CREATE TABLE ActivityLog (
    LogID         BIGINT PRIMARY KEY IDENTITY(1,1),
    UserID        INT,
    Action        NVARCHAR(200) NOT NULL,
    EntityType    NVARCHAR(100),
    AssetID       INT,
    EntityID      INT,
    OldValue      NVARCHAR(MAX),
    NewValue      NVARCHAR(MAX),
    IPAddress     NVARCHAR(45),
    UserAgent     NVARCHAR(500),
    Timestamp     DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_ActivityLog_Users FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

-- ============================================================
-- 13. REPORTS (Raporlar)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Reports' AND xtype='U')
CREATE TABLE Reports (
    ReportID      INT PRIMARY KEY IDENTITY(1,1),
    ReportName    NVARCHAR(200) NOT NULL,
    ReportType    NVARCHAR(50),
    ChannelID     INT,
    DateRangeFrom DATETIME,
    DateRangeTo   DATETIME,
    GeneratedDate DATETIME DEFAULT GETDATE(),
    GeneratedBy   INT,
    ReportData    NVARCHAR(MAX),
    FileURL       NVARCHAR(MAX),
    ExpiryDate    DATETIME,
    CONSTRAINT FK_Reports_Channels FOREIGN KEY (ChannelID) REFERENCES Channels(ChannelID),
    CONSTRAINT FK_Reports_Users FOREIGN KEY (GeneratedBy) REFERENCES Users(UserID)
);

-- ============================================================
-- INDEXLER (Performans)
-- ============================================================
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Holdings_IsActive')
    CREATE INDEX IDX_Holdings_IsActive ON Holdings(IsActive);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Channels_HoldingID')
    CREATE INDEX IDX_Channels_HoldingID ON Channels(HoldingID);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Buildings_ChannelID')
    CREATE INDEX IDX_Buildings_ChannelID ON Buildings(ChannelID);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Buildings_IsActive')
    CREATE INDEX IDX_Buildings_IsActive ON Buildings(IsActive);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Rooms_BuildingID')
    CREATE INDEX IDX_Rooms_BuildingID ON Rooms(BuildingID);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Rooms_IsActive')
    CREATE INDEX IDX_Rooms_IsActive ON Rooms(IsActive);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_AssetGroups_ChannelID')
    CREATE INDEX IDX_AssetGroups_ChannelID ON AssetGroups(ChannelID);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Assets_RoomID')
    CREATE INDEX IDX_Assets_RoomID ON Assets(RoomID);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Assets_ChannelID')
    CREATE INDEX IDX_Assets_ChannelID ON Assets(ChannelID);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Assets_Status')
    CREATE INDEX IDX_Assets_Status ON Assets(Status);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Assets_AssetType')
    CREATE INDEX IDX_Assets_AssetType ON Assets(AssetType);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Components_AssetID')
    CREATE INDEX IDX_Components_AssetID ON AssetComponents(AssetID);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Components_ChannelID')
    CREATE INDEX IDX_Components_ChannelID ON AssetComponents(ChannelID);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Monitoring_AssetID')
    CREATE INDEX IDX_Monitoring_AssetID ON AssetMonitoring(AssetID);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Monitoring_Time')
    CREATE INDEX IDX_Monitoring_Time ON AssetMonitoring(MonitoringTime DESC);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Maintenance_AssetID')
    CREATE INDEX IDX_Maintenance_AssetID ON MaintenanceRecords(AssetID);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Alerts_AssetID')
    CREATE INDEX IDX_Alerts_AssetID ON Alerts(AssetID);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Alerts_IsResolved')
    CREATE INDEX IDX_Alerts_IsResolved ON Alerts(IsResolved);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_ActivityLog_UserID')
    CREATE INDEX IDX_ActivityLog_UserID ON ActivityLog(UserID);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_ActivityLog_Timestamp')
    CREATE INDEX IDX_ActivityLog_Timestamp ON ActivityLog(Timestamp DESC);

PRINT 'Schema created! Hierarchy: Holding -> Kanal -> Bina -> Oda -> Bilgisayar -> Eklenti';
GO
