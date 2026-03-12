USE AssetManagementDB;
GO

-- Migration takip tablosu yoksa oluştur
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SchemaMigrations' AND xtype='U')
BEGIN
  CREATE TABLE SchemaMigrations (
    MigrationID INT PRIMARY KEY IDENTITY(1,1),
    Version     NVARCHAR(50)  NOT NULL UNIQUE,
    Description NVARCHAR(500),
    AppliedAt   DATETIME      DEFAULT GETDATE()
  );
  PRINT 'SchemaMigrations tablosu oluşturuldu.';
END
GO

IF EXISTS (SELECT 1 FROM SchemaMigrations WHERE Version = '002')
BEGIN
  PRINT 'Migration 002 zaten uygulanmış. Atlandı.';
  RETURN;
END
GO

-- Licenses tablosu
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Licenses' AND xtype='U')
BEGIN
  CREATE TABLE Licenses (
    LicenseID          INT           PRIMARY KEY IDENTITY(1,1),
    AssetID            INT           NOT NULL,
    ApplicationName    NVARCHAR(100) NOT NULL,
    LicenseKey         NVARCHAR(500) NULL,
    MacID              NVARCHAR(17)  NULL,
    ExpiryDate         DATE          NULL,
    FeatureFlags       NVARCHAR(MAX) NULL,       -- JSON dizi: '["GPI","HD","UHD"]'
    Description        NVARCHAR(500) NULL,
    IsActive           BIT           NOT NULL DEFAULT 1,
    ExternalLicenseUrl NVARCHAR(500) NULL,       -- Gelecek API entegrasyonu için
    CreatedDate        DATETIME      NOT NULL DEFAULT GETDATE(),
    UpdatedDate        DATETIME      NOT NULL DEFAULT GETDATE(),
    CreatedByUserID    INT           NULL,

    CONSTRAINT FK_Licenses_Asset FOREIGN KEY (AssetID)
      REFERENCES Assets(AssetID) ON DELETE CASCADE,
    CONSTRAINT FK_Licenses_User FOREIGN KEY (CreatedByUserID)
      REFERENCES Users(UserID) ON DELETE SET NULL
  );
  PRINT 'Licenses tablosu oluşturuldu.';
END
GO

-- Performans indeksleri
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Licenses_AssetID')
BEGIN
  CREATE INDEX IDX_Licenses_AssetID ON Licenses(AssetID);
  PRINT 'IDX_Licenses_AssetID oluşturuldu.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name='IDX_Licenses_ExpiryDate')
BEGIN
  CREATE INDEX IDX_Licenses_ExpiryDate ON Licenses(ExpiryDate)
    WHERE ExpiryDate IS NOT NULL;
  PRINT 'IDX_Licenses_ExpiryDate oluşturuldu.';
END
GO

INSERT INTO SchemaMigrations (Version, Description)
VALUES ('002', 'Licenses tablosu ve indeksleri oluşturuldu');
PRINT '✅ Migration 002 başarıyla uygulandı.';
GO
