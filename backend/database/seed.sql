
-- ============================================================
-- BROADCAST ASSET MANAGEMENT SYSTEM - Seed Data
-- Hierarchy: Holding -> Channel -> AssetGroup -> Asset -> Component
-- ============================================================

USE AssetManagementDB;
GO

-- ============================================================
-- 1. HOLDINGS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM Holdings WHERE HoldingID = 1)
INSERT INTO Holdings (HoldingName, Description, Website, ContactEmail) VALUES
('Broadcast Holding A.Ş.', 'Türkiye''nin önde gelen yayın holding şirketi', 'https://broadcastholding.com.tr', 'info@broadcastholding.com.tr');

-- ============================================================
-- 2. CHANNELS (Kanallar)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM Channels WHERE ChannelID = 1)
INSERT INTO Channels (HoldingID, ChannelName, Description, EstablishedYear, ContactEmail, ContactPhone, Website) VALUES
(1, 'TRT',             'Türkiye Radyo ve Televizyon Kurumu',    1964, 'teknik@trt.net.tr',        '+90 312 463 23 00', 'https://www.trt.net.tr'),
(1, 'Turkuaz Medya',   'Türkiye''nin hızla büyüyen medya grubu', 2016, 'teknik@turkvaz.tv',        '+90 212 000 00 01', 'https://www.turkvaz.tv'),
(1, 'Ekol TV',         'Güncel haber ve belgesel yayıncısı',    2010, 'teknik@ekoltv.com.tr',     '+90 212 000 00 02', 'https://www.ekoltv.com.tr'),
(1, 'Demirören Medya', 'Demirören Medya Grubu',                 2018, 'teknik@demirorenmedya.com', '+90 212 000 00 03', 'https://www.demirorenmedya.com'),
(1, 'CNBC-e',          'İş ve ekonomi haberleri kanalı',        2000, 'teknik@cnbce.com',          '+90 212 336 00 00', 'https://www.cnbce.com'),
(1, 'Now TV',          'Türkiye''nin dijital yayın platformu',   2012, 'teknik@nowtv.com.tr',       '+90 212 000 00 05', 'https://www.nowtv.com.tr'),
(1, 'Digiturk',        'Türkiye''nin lider dijital TV platformu', 2000, 'teknik@digiturk.com.tr',  '+90 212 473 77 00', 'https://www.digiturk.com.tr'),
(1, 'TGRT Haber',      'Haber ve aktüalite kanalı',             1993, 'teknik@tgrthaber.com.tr',  '+90 212 000 00 07', 'https://www.tgrthaber.com.tr');

-- ============================================================
-- 3. ASSET GROUPS (VarlıkGrubu - her kanal için)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM AssetGroups WHERE AssetGroupID = 1)
INSERT INTO AssetGroups (ChannelID, GroupName, GroupType, Description) VALUES
-- TRT (ChannelID=1) -> AssetGroupID 1-5
(1, 'TRT Playout',      'Playout',      'TRT ana yayın sunucuları ve playout sistemleri'),
(1, 'TRT Encoding',     'Encoding',     'TRT video encoding ve transkoding sistemleri'),
(1, 'TRT Transmission', 'Transmission', 'TRT iletim ve uplink sistemleri'),
(1, 'TRT Archive',      'Archive',      'TRT dijital arşiv ve depolama sistemleri'),
(1, 'TRT Storage',      'Storage',      'TRT NAS/SAN depolama altyapısı'),
-- Turkuaz Medya (ChannelID=2) -> AssetGroupID 6-9
(2, 'Turkuaz Playout',      'Playout',      'Turkuaz Medya playout sistemleri'),
(2, 'Turkuaz Encoding',     'Encoding',     'Turkuaz Medya encoding altyapısı'),
(2, 'Turkuaz Transmission', 'Transmission', 'Turkuaz Medya iletim sistemleri'),
(2, 'Turkuaz Storage',      'Storage',      'Turkuaz Medya depolama sistemleri'),
-- Ekol TV (ChannelID=3) -> AssetGroupID 10-12
(3, 'Ekol Playout',  'Playout',  'Ekol TV playout sistemleri'),
(3, 'Ekol Encoding', 'Encoding', 'Ekol TV encoding sistemleri'),
(3, 'Ekol Storage',  'Storage',  'Ekol TV depolama sistemleri'),
-- Demirören Medya (ChannelID=4) -> AssetGroupID 13-15
(4, 'Demirören Playout',  'Playout',  'Demirören playout sistemleri'),
(4, 'Demirören Encoding', 'Encoding', 'Demirören encoding sistemleri'),
(4, 'Demirören Archive',  'Archive',  'Demirören arşiv sistemleri'),
-- CNBC-e (ChannelID=5) -> AssetGroupID 16-18
(5, 'CNBC-e Playout',      'Playout',      'CNBC-e playout sistemleri'),
(5, 'CNBC-e Transmission', 'Transmission', 'CNBC-e iletim sistemleri'),
(5, 'CNBC-e Storage',      'Storage',      'CNBC-e depolama sistemleri'),
-- Now TV (ChannelID=6) -> AssetGroupID 19-21
(6, 'Now TV Playout',  'Playout',  'Now TV playout sistemleri'),
(6, 'Now TV Encoding', 'Encoding', 'Now TV encoding sistemleri'),
(6, 'Now TV Storage',  'Storage',  'Now TV depolama sistemleri'),
-- Digiturk (ChannelID=7) -> AssetGroupID 22-26
(7, 'Digiturk Playout',      'Playout',      'Digiturk playout sistemleri'),
(7, 'Digiturk Encoding',     'Encoding',     'Digiturk encoding sistemleri'),
(7, 'Digiturk Transmission', 'Transmission', 'Digiturk iletim ve uplink sistemleri'),
(7, 'Digiturk Archive',      'Archive',      'Digiturk arşiv ve yedekleme sistemleri'),
(7, 'Digiturk Storage',      'Storage',      'Digiturk depolama altyapısı'),
-- TGRT Haber (ChannelID=8) -> AssetGroupID 27-29
(8, 'TGRT Playout',  'Playout',  'TGRT Haber playout sistemleri'),
(8, 'TGRT Encoding', 'Encoding', 'TGRT Haber encoding sistemleri'),
(8, 'TGRT Storage',  'Storage',  'TGRT Haber depolama sistemleri');

-- ============================================================
-- 4. ASSETS (Varlıklar)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM Assets WHERE AssetID = 1)
INSERT INTO Assets (AssetGroupID, ChannelID, AssetName, AssetCode, AssetType, Model, SerialNumber, Manufacturer, Supplier, PurchaseDate, WarrantyEndDate, WarrantyMonths, PurchaseCost, CurrentValue, DepreciationRate, RackPosition, IPAddress, MACAddress, FirmwareVersion, Status) VALUES
-- TRT Playout (AssetGroupID=1, ChannelID=1)
(1, 1, 'GPU Tesla V100 #001',      'GPU-TRT-PLY-001', 'GPU',         'Tesla V100 32GB',         'SN-V100-2021-001',  'NVIDIA',       'Databarış',  '2021-03-15', '2024-03-15', 36, 8500.00,  6120.00,  15.0, 'Rack-A1-U1', '10.1.1.101', 'AA:BB:CC:DD:EE:01', '460.32.03', 'Active'),
(1, 1, 'GPU RTX 4090 #002',        'GPU-TRT-PLY-002', 'GPU',         'RTX 4090 24GB',           'SN-4090-2022-002',  'NVIDIA',       'Databarış',  '2022-06-20', '2025-06-20', 36, 7200.00,  5760.00,  15.0, 'Rack-A1-U3', '10.1.1.102', 'AA:BB:CC:DD:EE:02', '535.54.03', 'Active'),
(1, 1, 'Playout Server #001',      'SRV-TRT-PLY-001', 'Server',      'Dell PowerEdge R850',     'SN-R850-2022-001',  'Dell',         'Bimeks',     '2022-01-10', '2025-01-10', 36, 45000.00, 36000.00, 20.0, 'Rack-A2-U1', '10.1.1.201', 'AA:BB:CC:DD:EE:10', '2.1.4',     'Active'),
-- TRT Encoding (AssetGroupID=2, ChannelID=1)
(2, 1, 'Encoder Server #001',      'SRV-TRT-ENC-001', 'Server',      'Dell PowerEdge R760',     'SN-R760-2022-001',  'Dell',         'Bimeks',     '2022-03-15', '2025-03-15', 36, 38000.00, 30400.00, 20.0, 'Rack-B1-U1', '10.1.2.101', 'AA:BB:CC:DD:EF:01', '2.0.8',     'Active'),
(2, 1, 'GPU A100 #001',            'GPU-TRT-ENC-001', 'GPU',         'NVIDIA A100 80GB',        'SN-A100-2022-001',  'NVIDIA',       'Databarış',  '2022-05-20', '2025-05-20', 36, 12000.00, 9600.00,  20.0, 'Rack-B1-U3', '10.1.2.102', 'AA:BB:CC:DD:EF:02', '525.85.12', 'Active'),
-- TRT Transmission (AssetGroupID=3, ChannelID=1)
(3, 1, 'Network Switch #001',      'NET-TRT-TRN-001', 'Network',     'Cisco Nexus 9300',        'SN-N9K-2021-001',   'Cisco',        'Databarış',  '2021-09-10', '2024-09-10', 36, 15000.00, 10800.00, 15.0, 'Rack-C1-U1', '10.1.3.1',   'AA:BB:CC:EE:FF:01', 'NX-OS 9.3', 'Active'),
(3, 1, 'Network Router #001',      'NET-TRT-TRN-002', 'Network',     'Juniper QFX5120',         'SN-QFX-2022-001',   'Juniper',      'Netsis',     '2022-02-15', '2025-02-15', 36, 22000.00, 17600.00, 20.0, 'Rack-C1-U3', '10.1.3.2',   'AA:BB:CC:EE:FF:02', '21.4R1',    'Active'),
-- TRT Archive (AssetGroupID=4, ChannelID=1)
(4, 1, 'Archive Storage #001',     'DSK-TRT-ARC-001', 'Disk',        'NetApp FAS2720',          'SN-FAS-2021-001',   'NetApp',       'Netsis',     '2021-11-05', '2024-11-05', 36, 28000.00, 20160.00, 15.0, 'Rack-D1-U1', '10.1.4.101', 'AA:BB:CC:FF:EE:01', '9.10P1',    'Active'),
-- TRT Storage (AssetGroupID=5, ChannelID=1)
(5, 1, 'NAS Storage #001',         'DSK-TRT-STR-001', 'Disk',        'Synology RackStation RS3621XS+', 'SN-RS-2022-001', 'Synology', 'Databarış', '2022-04-20', '2025-04-20', 36, 12000.00, 9600.00, 20.0, 'Rack-E1-U1', '10.1.5.101', 'AA:BB:DD:CC:EE:01', '7.1.1',    'Active'),
(5, 1, 'SAN Storage #001',         'DSK-TRT-STR-002', 'Disk',        'Pure Storage FlashArray', 'SN-FA-2021-001',    'Pure Storage','Netsis',     '2021-08-10', '2024-08-10', 36, 55000.00, 39600.00, 20.0, 'Rack-E1-U3', '10.1.5.102', 'AA:BB:DD:CC:EE:02', '6.3.5',    'Maintenance'),
(5, 1, 'DisplayCard RTX 4080 #001','DC-TRT-STR-001',  'DisplayCard', 'RTX 4080 16GB',           'SN-DC-2022-001',    'NVIDIA',       'Databarış',  '2022-07-15', '2025-07-15', 36, 5200.00,  4160.00,  20.0, 'Rack-E2-U1', '10.1.5.111', 'AA:BB:DD:CC:FF:01', '535.54.03', 'Active'),
(5, 1, 'DisplayCard RTX 4070 #001','DC-TRT-STR-002',  'DisplayCard', 'RTX 4070 12GB',           'SN-DC-2023-001',    'NVIDIA',       'Databarış',  '2023-02-10', '2026-02-10', 36, 3800.00,  3420.00,  10.0, 'Rack-E2-U3', '10.1.5.112', 'AA:BB:DD:CC:FF:02', '535.54.03', 'Active'),
-- Turkuaz Playout (AssetGroupID=6, ChannelID=2)
(6, 2, 'GPU A6000 #001',           'GPU-TRK-PLY-001', 'GPU',         'NVIDIA RTX A6000',        'SN-A6000-2022-001', 'NVIDIA',       'Databarış',  '2022-08-15', '2025-08-15', 36, 9500.00,  7600.00,  20.0, 'Rack-A1-U1', '10.2.1.101', 'BB:CC:DD:EE:FF:01', '525.85.12', 'Active'),
(6, 2, 'Playout Server #001',      'SRV-TRK-PLY-001', 'Server',      'HPE ProLiant DL380 Gen10','SN-HP-2021-001',    'HPE',          'Bimeks',     '2021-11-20', '2024-11-20', 36, 35000.00, 25200.00, 15.0, 'Rack-A2-U1', '10.2.1.201', 'BB:CC:DD:EE:FF:10', '2.60',      'Active'),
-- Turkuaz Encoding (AssetGroupID=7, ChannelID=2)
(7, 2, 'Encoder Server #001',      'SRV-TRK-ENC-001', 'Server',      'Dell PowerEdge R750',     'SN-R750-2022-001',  'Dell',         'Bimeks',     '2022-09-10', '2025-09-10', 36, 40000.00, 32000.00, 20.0, 'Rack-B1-U1', '10.2.2.101', 'BB:CC:EE:DD:FF:01', '2.1.2',     'Active'),
(7, 2, 'GPU A5000 #001',           'GPU-TRK-ENC-001', 'GPU',         'NVIDIA RTX A5000',        'SN-A5000-2022-001', 'NVIDIA',       'Databarış',  '2022-06-15', '2025-06-15', 36, 7800.00,  6240.00,  20.0, 'Rack-B1-U3', '10.2.2.102', 'BB:CC:EE:DD:FF:02', '525.85.12', 'Active'),
-- Turkuaz Transmission (AssetGroupID=8, ChannelID=2)
(8, 2, 'Network Switch #001',      'NET-TRK-TRN-001', 'Network',     'Arista 7050CX3',          'SN-ARI-2022-001',   'Arista',       'Netsis',     '2022-01-20', '2025-01-20', 36, 18000.00, 14400.00, 20.0, 'Rack-C1-U1', '10.2.3.1',   'BB:CC:EE:FF:DD:01', 'EOS 4.28',  'Active'),
-- Turkuaz Storage (AssetGroupID=9, ChannelID=2)
(9, 2, 'NAS Storage #001',         'DSK-TRK-STR-001', 'Disk',        'Synology RackStation RS3621XS+', 'SN-RS-2022-002', 'Synology', 'Databarış', '2022-10-05', '2025-10-05', 36, 12500.00, 10000.00, 20.0, 'Rack-D1-U1', '10.2.4.101', 'BB:DD:CC:EE:FF:01', '7.1.1',    'Active'),
(9, 2, 'DisplayCard RTX 3080 #001','DC-TRK-STR-001',  'DisplayCard', 'RTX 3080 10GB',           'SN-3080-2021-001',  'NVIDIA',       'Databarış',  '2021-05-10', '2024-05-10', 36, 3500.00,  2520.00,  15.0, 'Rack-D2-U1', '10.2.4.111', 'BB:DD:CC:FF:EE:01', '470.82.01', 'Active'),
-- Ekol Playout (AssetGroupID=10, ChannelID=3)
(10, 3, 'GPU RTX 4080 #001',       'GPU-EKL-PLY-001', 'GPU',         'RTX 4080 16GB',           'SN-4080-2023-001',  'NVIDIA',       'Databarış',  '2023-01-15', '2026-01-15', 36, 6800.00,  6120.00,  10.0, 'Rack-A1-U1', '10.3.1.101', 'CC:DD:EE:FF:AA:01', '535.54.03', 'Active'),
(10, 3, 'Playout Server #001',     'SRV-EKL-PLY-001', 'Server',      'Dell PowerEdge R640',     'SN-R640-2022-001',  'Dell',         'Bimeks',     '2022-04-20', '2025-04-20', 36, 30000.00, 24000.00, 20.0, 'Rack-A2-U1', '10.3.1.201', 'CC:DD:EE:FF:AA:10', '2.0.4',     'Active'),
-- Ekol Encoding (AssetGroupID=11, ChannelID=3)
(11, 3, 'Encoder Server #001',     'SRV-EKL-ENC-001', 'Server',      'Lenovo ThinkSystem SR650','SN-LS-2021-001',    'Lenovo',       'Bimeks',     '2021-07-15', '2024-07-15', 36, 28000.00, 20160.00, 15.0, 'Rack-B1-U1', '10.3.2.101', 'CC:EE:DD:FF:AA:01', '3.00',      'Faulty'),
-- Ekol Storage (AssetGroupID=12, ChannelID=3)
(12, 3, 'NAS Storage #001',        'DSK-EKL-STR-001', 'Disk',        'Dell EMC PowerStore 3000T','SN-PS-2022-001',   'Dell EMC',     'Netsis',     '2022-03-10', '2025-03-10', 36, 32000.00, 25600.00, 20.0, 'Rack-C1-U1', '10.3.3.101', 'CC:EE:DD:AA:FF:01', '3.0.0.4',   'Active'),
(12, 3, 'DisplayCard RTX 4090 #001','DC-EKL-STR-001', 'DisplayCard', 'RTX 4090 24GB',           'SN-DC4090-2023-001','NVIDIA',       'Databarış',  '2023-03-15', '2026-03-15', 36, 7200.00,  6480.00,  10.0, 'Rack-C2-U1', '10.3.3.111', 'CC:EE:FF:DD:AA:01', '535.54.03', 'Active'),
-- Demirören Playout (AssetGroupID=13, ChannelID=4)
(13, 4, 'GPU Tesla T4 #001',       'GPU-DMR-PLY-001', 'GPU',         'NVIDIA Tesla T4',         'SN-T4-2021-001',    'NVIDIA',       'Databarış',  '2021-06-10', '2024-06-10', 36, 4500.00,  3240.00,  15.0, 'Rack-A1-U1', '10.4.1.101', 'DD:EE:FF:AA:BB:01', '470.82.01', 'Active'),
(13, 4, 'Playout Server #001',     'SRV-DMR-PLY-001', 'Server',      'Dell PowerEdge R650',     'SN-R650-2022-001',  'Dell',         'Bimeks',     '2022-08-20', '2025-08-20', 36, 36000.00, 28800.00, 20.0, 'Rack-A2-U1', '10.4.1.201', 'DD:EE:FF:AA:BB:10', '2.1.1',     'Active'),
-- Demirören Encoding (AssetGroupID=14, ChannelID=4)
(14, 4, 'Encoder Server #001',     'SRV-DMR-ENC-001', 'Server',      'HPE ProLiant DL380 Gen10','SN-HP-2022-001',    'HPE',          'Bimeks',     '2022-01-15', '2025-01-15', 36, 35000.00, 28000.00, 20.0, 'Rack-B1-U1', '10.4.2.101', 'DD:FF:EE:AA:BB:01', '2.60',      'Active'),
(14, 4, 'GPU A4000 #001',          'GPU-DMR-ENC-001', 'GPU',         'NVIDIA RTX A4000',        'SN-A4000-2022-001', 'NVIDIA',       'Databarış',  '2022-04-10', '2025-04-10', 36, 5500.00,  4400.00,  20.0, 'Rack-B1-U3', '10.4.2.102', 'DD:FF:EE:AA:BB:02', '525.85.12', 'Active'),
-- Demirören Archive (AssetGroupID=15, ChannelID=4)
(15, 4, 'Archive Server #001',     'DSK-DMR-ARC-001', 'Disk',        'NetApp AFF A250',         'SN-AFF-2021-001',   'NetApp',       'Netsis',     '2021-10-20', '2024-10-20', 36, 42000.00, 30240.00, 15.0, 'Rack-C1-U1', '10.4.3.101', 'DD:FF:AA:EE:BB:01', '9.10P2',    'Active'),
(15, 4, 'DisplayCard RTX 3070 #001','DC-DMR-ARC-001', 'DisplayCard', 'RTX 3070 8GB',            'SN-3070-2022-001',  'NVIDIA',       'Databarış',  '2022-02-10', '2025-02-10', 36, 2800.00,  2240.00,  20.0, 'Rack-C2-U1', '10.4.3.111', 'DD:FF:AA:BB:EE:01', '525.85.12', 'Active'),
-- CNBC-e Playout (AssetGroupID=16, ChannelID=5)
(16, 5, 'GPU A100 #001',           'GPU-CNB-PLY-001', 'GPU',         'NVIDIA A100 80GB',        'SN-A100-2023-001',  'NVIDIA',       'Databarış',  '2023-02-15', '2026-02-15', 36, 12000.00, 10800.00, 10.0, 'Rack-A1-U1', '10.5.1.101', 'EE:FF:AA:BB:CC:01', '525.85.12', 'Active'),
(16, 5, 'Playout Server #001',     'SRV-CNB-PLY-001', 'Server',      'Dell PowerEdge R740',     'SN-R740-2022-001',  'Dell',         'Bimeks',     '2022-11-20', '2025-11-20', 36, 42000.00, 33600.00, 20.0, 'Rack-A2-U1', '10.5.1.201', 'EE:FF:AA:BB:CC:10', '2.0.6',     'Active'),
-- CNBC-e Transmission (AssetGroupID=17, ChannelID=5)
(17, 5, 'Network Switch #001',     'NET-CNB-TRN-001', 'Network',     'Cisco Catalyst 9500',     'SN-C9K-2022-001',   'Cisco',        'Netsis',     '2022-05-10', '2025-05-10', 36, 20000.00, 16000.00, 20.0, 'Rack-B1-U1', '10.5.2.1',   'EE:FF:BB:AA:CC:01', 'IOS-XE 17', 'Active'),
(17, 5, 'Network Router #001',     'NET-CNB-TRN-002', 'Network',     'MikroTik CRS354',         'SN-MK-2022-001',    'MikroTik',     'Netsis',     '2022-03-05', '2025-03-05', 36, 3500.00,  2800.00,  20.0, 'Rack-B1-U3', '10.5.2.2',   'EE:FF:BB:CC:AA:01', '7.4.1',     'Inactive'),
-- CNBC-e Storage (AssetGroupID=18, ChannelID=5)
(18, 5, 'SAN Storage #001',        'DSK-CNB-STR-001', 'Disk',        'Pure Storage FlashArray', 'SN-FA-2022-001',    'Pure Storage','Netsis',     '2022-07-20', '2025-07-20', 36, 58000.00, 46400.00, 20.0, 'Rack-C1-U1', '10.5.3.101', 'EE:AA:FF:BB:CC:01', '6.3.5',     'Active'),
(18, 5, 'DisplayCard RTX 3060 #001','DC-CNB-STR-001', 'DisplayCard', 'RTX 3060 12GB',           'SN-3060-2022-001',  'NVIDIA',       'Databarış',  '2022-09-15', '2025-09-15', 36, 2200.00,  1760.00,  20.0, 'Rack-C2-U1', '10.5.3.111', 'EE:AA:FF:CC:BB:01', '525.85.12', 'Active'),
-- Now TV Playout (AssetGroupID=19, ChannelID=6)
(19, 6, 'GPU RTX 4090 #001',       'GPU-NOW-PLY-001', 'GPU',         'RTX 4090 24GB',           'SN-4090-2023-001',  'NVIDIA',       'Databarış',  '2023-01-20', '2026-01-20', 36, 7500.00,  6750.00,  10.0, 'Rack-A1-U1', '10.6.1.101', 'FF:AA:BB:CC:DD:01', '535.54.03', 'Active'),
(19, 6, 'Playout Server #001',     'SRV-NOW-PLY-001', 'Server',      'Lenovo ThinkSystem SR630','SN-LS-2022-001',    'Lenovo',       'Bimeks',     '2022-06-10', '2025-06-10', 36, 32000.00, 25600.00, 20.0, 'Rack-A2-U1', '10.6.1.201', 'FF:AA:BB:CC:DD:10', '3.00',      'Active'),
-- Now TV Encoding (AssetGroupID=20, ChannelID=6)
(20, 6, 'Encoder Server #001',     'SRV-NOW-ENC-001', 'Server',      'Dell PowerEdge R760',     'SN-R760-2023-001',  'Dell',         'Bimeks',     '2023-03-10', '2026-03-10', 36, 39000.00, 35100.00, 10.0, 'Rack-B1-U1', '10.6.2.101', 'FF:BB:AA:CC:DD:01', '2.1.4',     'Active'),
-- Now TV Storage (AssetGroupID=21, ChannelID=6)
(21, 6, 'NAS Storage #001',        'DSK-NOW-STR-001', 'Disk',        'Synology RackStation RS3621XS+', 'SN-RS-2023-001', 'Synology', 'Databarış', '2023-02-20', '2026-02-20', 36, 13000.00, 11700.00, 10.0, 'Rack-C1-U1', '10.6.3.101', 'FF:CC:AA:BB:DD:01', '7.2.0',    'Active'),
-- Digiturk Playout (AssetGroupID=22, ChannelID=7)
(22, 7, 'GPU Tesla V100 #001',     'GPU-DGT-PLY-001', 'GPU',         'Tesla V100 32GB',         'SN-V100-2020-001',  'NVIDIA',       'Databarış',  '2020-11-10', '2023-11-10', 36, 8000.00,  4800.00,  20.0, 'Rack-A1-U1', '10.7.1.101', 'AA:FF:CC:BB:DD:01', '460.32.03', 'Maintenance'),
(22, 7, 'Playout Server #001',     'SRV-DGT-PLY-001', 'Server',      'Dell PowerEdge R850',     'SN-R850-2021-001',  'Dell',         'Bimeks',     '2021-05-20', '2024-05-20', 36, 48000.00, 34560.00, 15.0, 'Rack-A2-U1', '10.7.1.201', 'AA:FF:CC:DD:BB:10', '2.1.0',     'Active'),
-- Digiturk Encoding (AssetGroupID=23, ChannelID=7)
(23, 7, 'Encoder Server #001',     'SRV-DGT-ENC-001', 'Server',      'HPE ProLiant DL360 Gen10','SN-HP-2021-002',    'HPE',          'Bimeks',     '2021-08-15', '2024-08-15', 36, 30000.00, 21600.00, 15.0, 'Rack-B1-U1', '10.7.2.101', 'BB:AA:FF:CC:DD:01', '2.60',      'Active'),
-- Digiturk Transmission (AssetGroupID=24, ChannelID=7)
(24, 7, 'Uplink Router #001',      'NET-DGT-TRN-001', 'Network',     'Cisco Nexus 9300',        'SN-N9K-2022-001',   'Cisco',        'Netsis',     '2022-04-10', '2025-04-10', 36, 16000.00, 12800.00, 20.0, 'Rack-C1-U1', '10.7.3.1',   'BB:FF:AA:CC:DD:01', 'NX-OS 9.3', 'Active'),
-- Digiturk Archive (AssetGroupID=25, ChannelID=7)
(25, 7, 'Archive Storage #001',    'DSK-DGT-ARC-001', 'Disk',        'NetApp AFF A250',         'SN-AFF-2020-001',   'NetApp',       'Netsis',     '2020-09-15', '2023-09-15', 36, 40000.00, 24000.00, 15.0, 'Rack-D1-U1', '10.7.4.101', 'CC:AA:FF:BB:DD:01', '9.9P3',     'Active'),
-- Digiturk Storage (AssetGroupID=26, ChannelID=7)
(26, 7, 'SAN Storage #001',        'DSK-DGT-STR-001', 'Disk',        'Pure Storage FlashArray', 'SN-FA-2021-002',    'Pure Storage','Netsis',     '2021-12-10', '2024-12-10', 36, 60000.00, 43200.00, 15.0, 'Rack-E1-U1', '10.7.5.101', 'DD:AA:FF:BB:CC:01', '6.3.0',     'Active'),
(26, 7, 'DisplayCard RTX 4080 #001','DC-DGT-STR-001', 'DisplayCard', 'RTX 4080 16GB',           'SN-DC4080-2023-001','NVIDIA',       'Databarış',  '2023-01-10', '2026-01-10', 36, 5500.00,  4950.00,  10.0, 'Rack-E2-U1', '10.7.5.111', 'EE:AA:FF:BB:CC:01', '535.54.03', 'Active'),
-- TGRT Playout (AssetGroupID=27, ChannelID=8)
(27, 8, 'GPU RTX A5000 #001',      'GPU-TGR-PLY-001', 'GPU',         'NVIDIA RTX A5000',        'SN-A5000-2021-001', 'NVIDIA',       'Databarış',  '2021-12-15', '2024-12-15', 36, 7800.00,  5616.00,  15.0, 'Rack-A1-U1', '10.8.1.101', 'FF:BB:AA:DD:CC:01', '470.82.01', 'Active'),
(27, 8, 'Playout Server #001',     'SRV-TGR-PLY-001', 'Server',      'Dell PowerEdge R740',     'SN-R740-2021-001',  'Dell',         'Bimeks',     '2021-10-20', '2024-10-20', 36, 40000.00, 28800.00, 15.0, 'Rack-A2-U1', '10.8.1.201', 'FF:BB:AA:CC:DD:10', '2.0.2',     'Active'),
-- TGRT Encoding (AssetGroupID=28, ChannelID=8)
(28, 8, 'Encoder Server #001',     'SRV-TGR-ENC-001', 'Server',      'Lenovo ThinkSystem SR650','SN-LS-2022-002',    'Lenovo',       'Bimeks',     '2022-03-20', '2025-03-20', 36, 28500.00, 22800.00, 20.0, 'Rack-B1-U1', '10.8.2.101', 'FF:CC:BB:AA:DD:01', '3.00',      'Active'),
-- TGRT Storage (AssetGroupID=29, ChannelID=8)
(29, 8, 'NAS Storage #001',        'DSK-TGR-STR-001', 'Disk',        'Dell EMC PowerStore 1000T','SN-PS-2021-001',   'Dell EMC',     'Netsis',     '2021-07-10', '2024-07-10', 36, 25000.00, 18000.00, 15.0, 'Rack-C1-U1', '10.8.3.101', 'FF:DD:CC:BB:AA:01', '2.0.0.4',   'Active'),
(29, 8, 'DisplayCard RTX 3080 #001','DC-TGR-STR-001', 'DisplayCard', 'RTX 3080 10GB',           'SN-3080-2022-001',  'NVIDIA',       'Databarış',  '2022-05-15', '2025-05-15', 36, 3600.00,  2880.00,  20.0, 'Rack-C2-U1', '10.8.3.111', 'FF:DD:CC:AA:BB:01', '525.85.12', 'Active');

-- ============================================================
-- 5. ASSET COMPONENTS (Eklentiler)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM AssetComponents WHERE ComponentID = 1)
INSERT INTO AssetComponents (AssetID, AssetGroupID, ChannelID, ComponentName, ComponentType, Model, SerialNumber, Manufacturer) VALUES
-- Playout Server #001 (AssetID=3, TRT) bileşenleri
(3,  1, 1, 'GPU Tesla V100 (Embedded)',   'GPU',     'Tesla V100 16GB SXM2',       'SN-V100-E-001', 'NVIDIA'),
(3,  1, 1, 'RAM DDR4 64GB #1',            'RAM',     'Samsung DDR4-3200 64GB',     'SN-RAM-TRT-001','Samsung'),
(3,  1, 1, 'NIC 10GbE #1',               'NIC',     'Intel X710 10GbE',           'SN-NIC-TRT-001','Intel'),
(3,  1, 1, 'PSU 1200W #1',               'PSU',     'Delta Electronics 1200W',    'SN-PSU-TRT-001','Delta'),
-- Encoder Server #001 (AssetID=4, TRT) bileşenleri
(4,  2, 1, 'GPU A100 (Embedded)',         'GPU',     'NVIDIA A100 40GB PCIe',      'SN-A100-E-001', 'NVIDIA'),
(4,  2, 1, 'RAM DDR4 128GB #1',           'RAM',     'Samsung DDR4-3200 128GB',    'SN-RAM-TRT-002','Samsung'),
(4,  2, 1, 'Storage SSD 2TB #1',         'Storage', 'Samsung PM9A3 2TB',          'SN-SSD-TRT-001','Samsung'),
-- Digiturk Playout Server #001 (AssetID=40) bileşenleri
(40, 22, 7, 'GPU Tesla V100 (Embedded)', 'GPU',     'Tesla V100 32GB SXM2',       'SN-V100-E-002', 'NVIDIA'),
(40, 22, 7, 'RAM DDR4 256GB #1',          'RAM',     'SK Hynix DDR4-3200 256GB',   'SN-RAM-DGT-001','SK Hynix'),
(40, 22, 7, 'NIC 25GbE #1',              'NIC',     'Mellanox ConnectX-5 25GbE',  'SN-NIC-DGT-001','Mellanox'),
-- TRT NAS Storage (AssetID=9) bileşenleri
(9,  5, 1, 'HDD 16TB #1',                'Storage', 'Seagate Exos X16 16TB',      'SN-HDD-TRT-001','Seagate'),
(9,  5, 1, 'HDD 16TB #2',                'Storage', 'Seagate Exos X16 16TB',      'SN-HDD-TRT-002','Seagate'),
(9,  5, 1, 'RAM DDR4 32GB #1',            'RAM',     'Kingston ECC DDR4-2666 32GB','SN-RAM-TRT-003','Kingston');

-- ============================================================
-- 6. ASSET MONITORING (Canlı İzleme)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM AssetMonitoring WHERE MonitoringID = 1)
INSERT INTO AssetMonitoring (AssetID, CPUUsage, RAMUsage, DiskUsage, GPUUsage, Temperature, CPUTemperature, PowerConsumption, FanSpeed, MemoryUsedGB, MemoryTotalGB, NetworkInMbps, NetworkOutMbps, NetworkLatency, Uptime, IsOnline, ErrorCount, PerformanceScore, SignalStrength) VALUES
(1,  45.2, 62.3, 38.1, 71.5, 68.0, 52.0, 280.0, 2200, 18.5, 32.0,  125.3, 87.2,  1.2, 7862400,  1, 0, 88.5, 5),
(2,  78.9, 71.2, 45.8, 92.3, 76.0, 61.0, 350.0, 2800, 16.3, 24.0,  98.7,  156.4, 2.1, 5184000,  1, 2, 75.2, 5),
(3,  62.1, 55.8, 42.3, 0.0,  48.5, 44.0, 520.0, 3200, 32.1, 64.0,  456.8, 234.5, 0.8, 15724800, 1, 0, 92.1, 5),
(4,  55.4, 67.2, 38.9, 0.0,  51.0, 47.0, 480.0, 2900, 41.8, 64.0,  312.4, 198.7, 1.1, 10886400, 1, 0, 89.3, 5),
(5,  89.2, 82.4, 55.3, 95.1, 82.0, 69.0, 420.0, 3400, 62.3, 80.0,  78.9,  145.6, 3.2, 9331200,  1, 5, 62.8, 4),
(6,  12.3, 28.4, 22.1, 0.0,  38.0, 32.0, 95.0,  1200, 4.2,  16.0,  890.2, 456.1, 0.5, 8294400,  1, 0, 96.8, 5),
(7,  18.7, 31.5, 35.6, 0.0,  41.0, 35.0, 145.0, 1600, 5.8,  16.0,  1245.7,678.3, 0.7, 6739200,  1, 0, 94.5, 5),
(8,  31.2, 48.7, 78.2, 0.0,  44.0, 38.0, 85.0,  900,  18.4, 64.0,  234.5, 123.4, 1.8, 11577600, 1, 0, 85.2, 5),
(9,  22.4, 35.6, 62.3, 0.0,  42.0, 36.0, 65.0,  800,  8.2,  16.0,  567.8, 289.4, 1.5, 12268800, 1, 0, 88.7, 5),
(10, 67.8, 74.5, 48.9, 0.0,  56.0, 49.0, 650.0, 3600, 45.2, 128.0, 345.6, 234.5, 0.9, 7257600,  1, 1, 83.4, 5),
(11, 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,   0,    0.0,  0.0,   0.0,   0.0,   0.0, 0,        0, 0, 0.0,  0),
(12, 72.3, 68.9, 41.2, 0.0,  49.0, 43.0, 430.0, 2700, 42.8, 64.0,  267.3, 178.9, 1.3, 9417600,  1, 0, 87.6, 5),
(13, 51.6, 59.3, 36.8, 88.4, 72.0, 58.0, 260.0, 2100, 14.2, 32.0,  89.4,  67.3,  1.9, 8208000,  1, 0, 90.2, 5),
(14, 43.2, 52.1, 44.7, 0.0,  53.0, 47.0, 510.0, 3100, 28.6, 64.0,  423.7, 256.8, 1.0, 13046400, 1, 0, 91.8, 5),
(15, 56.8, 63.4, 52.3, 82.6, 69.0, 55.0, 310.0, 2400, 18.9, 32.0,  76.5,  98.2,  2.4, 6220800,  1, 1, 84.3, 4),
(16, 34.7, 41.8, 28.9, 0.0,  45.0, 39.0, 120.0, 1400, 3.8,  16.0,  756.3, 389.1, 0.6, 7948800,  1, 0, 95.1, 5),
(17, 71.5, 78.2, 43.6, 88.9, 74.0, 60.0, 380.0, 2900, 22.5, 32.0,  145.6, 112.3, 1.7, 5443200,  1, 2, 79.5, 4),
(18, 48.3, 55.9, 38.4, 0.0,  47.0, 41.0, 490.0, 2850, 34.7, 64.0,  389.4, 201.6, 1.1, 9072000,  1, 0, 88.9, 5),
(19, 65.4, 72.6, 46.1, 78.3, 71.0, 57.0, 295.0, 2350, 16.8, 24.0,  112.7, 89.4,  1.5, 8467200,  1, 0, 86.7, 5),
(20, 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,   0,    0.0,  0.0,   0.0,   0.0,   0.0, 0,        0, 0, 0.0,  0),
(21, 76.2, 82.3, 47.5, 0.0,  52.0, 46.0, 440.0, 2750, 38.9, 64.0,  278.5, 167.3, 1.2, 10195200, 1, 0, 85.4, 5),
(22, 58.9, 66.7, 40.3, 73.5, 67.0, 53.0, 275.0, 2250, 17.6, 32.0,  134.2, 78.6,  2.0, 7603200,  1, 0, 87.3, 5),
(23, 41.3, 49.8, 35.6, 0.0,  48.0, 42.0, 505.0, 3050, 29.4, 64.0,  412.8, 223.5, 0.9, 14515200, 1, 0, 91.2, 5),
(24, 35.6, 44.2, 32.1, 78.9, 66.0, 52.0, 285.0, 2300, 15.3, 32.0,  98.4,  72.1,  1.6, 9849600,  1, 0, 89.7, 5),
(25, 29.4, 38.6, 25.8, 0.0,  43.0, 37.0, 110.0, 1300, 4.5,  16.0,  678.4, 345.7, 0.7, 8035200,  1, 0, 94.8, 5),
(26, 62.7, 69.3, 44.7, 0.0,  50.0, 44.0, 475.0, 2800, 31.2, 64.0,  356.7, 187.4, 1.3, 11232000, 1, 0, 88.1, 5),
(27, 74.5, 79.8, 48.2, 84.3, 73.0, 59.0, 325.0, 2500, 19.4, 32.0,  123.5, 94.7,  1.8, 6566400,  1, 1, 82.9, 4),
(28, 46.8, 54.3, 39.5, 0.0,  49.0, 43.0, 495.0, 2950, 33.8, 64.0,  398.2, 214.7, 1.0, 10540800, 1, 0, 90.5, 5),
(29, 39.1, 47.4, 34.2, 0.0,  55.0, 48.0, 75.0,  850,  22.6, 128.0, 456.3, 234.8, 2.3, 11664000, 1, 0, 86.9, 5),
(30, 55.3, 62.8, 41.9, 76.2, 65.0, 51.0, 265.0, 2150, 13.7, 24.0,  89.7,  63.4,  1.7, 7344000,  1, 0, 88.4, 5),
(31, 48.7, 57.1, 37.8, 0.0,  50.0, 44.0, 515.0, 3150, 35.6, 64.0,  434.1, 245.6, 1.0, 9590400,  1, 0, 89.8, 5),
(32, 66.2, 73.5, 45.3, 80.7, 70.0, 56.0, 305.0, 2420, 17.2, 24.0,  107.3, 82.5,  1.6, 8121600,  1, 0, 87.1, 5),
(33, 38.9, 46.7, 33.4, 0.0,  46.0, 40.0, 500.0, 3000, 28.9, 64.0,  421.6, 228.3, 1.1, 13824000, 1, 0, 90.9, 5),
(34, 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,   0,    0.0,  0.0,   0.0,   0.0,   0.0, 0,        0, 0, 0.0,  0),
(35, 69.8, 76.4, 46.8, 82.1, 72.0, 58.0, 315.0, 2460, 18.1, 24.0,  118.4, 91.2,  1.9, 5875200,  1, 1, 84.6, 4),
(36, 33.5, 42.1, 29.7, 0.0,  44.0, 38.0, 115.0, 1350, 4.0,  16.0,  712.6, 367.4, 0.6, 7689600,  1, 0, 95.6, 5),
(37, 59.7, 67.4, 43.1, 77.8, 68.0, 54.0, 290.0, 2280, 16.0, 24.0,  101.5, 76.8,  2.1, 7948800,  1, 0, 87.8, 5),
(38, 44.1, 52.8, 37.2, 0.0,  48.0, 42.0, 505.0, 3050, 30.7, 64.0,  413.9, 226.1, 1.0, 10281600, 1, 0, 90.1, 5),
(39, 57.6, 64.9, 42.5, 71.4, 66.0, 52.0, 270.0, 2180, 14.8, 32.0,  92.1,  68.5,  1.8, 9244800,  1, 0, 88.2, 5),
(40, 50.3, 58.6, 39.1, 0.0,  51.0, 45.0, 520.0, 3100, 36.4, 64.0,  445.2, 251.3, 1.2, 12441600, 1, 0, 89.4, 5),
(41, 43.8, 51.4, 35.9, 0.0,  47.0, 41.0, 105.0, 1250, 5.1,  16.0,  634.7, 328.9, 0.8, 8380800,  1, 0, 94.2, 5),
(42, 77.3, 83.7, 49.6, 91.2, 78.0, 63.0, 360.0, 2780, 21.3, 32.0,  137.8, 105.6, 2.5, 4924800,  1, 3, 73.6, 4),
(43, 36.4, 44.9, 31.8, 0.0,  45.0, 39.0, 495.0, 2960, 27.8, 64.0,  402.5, 219.4, 1.1, 13305600, 1, 0, 91.5, 5),
(44, 63.1, 70.7, 45.5, 79.6, 69.0, 55.0, 300.0, 2400, 17.8, 32.0,  115.9, 88.3,  1.7, 7776000,  1, 0, 86.3, 5),
(45, 47.5, 55.2, 38.7, 0.0,  50.0, 44.0, 510.0, 3080, 34.2, 64.0,  426.8, 233.7, 1.0, 10022400, 1, 0, 89.6, 5),
(46, 37.8, 46.1, 33.0, 0.0,  46.0, 40.0, 78.0,  870,  24.3, 128.0, 489.7, 247.5, 2.2, 11145600, 1, 0, 87.5, 5),
(47, 61.4, 68.8, 44.3, 75.7, 67.0, 53.0, 280.0, 2220, 15.5, 24.0,  95.2,  71.6,  1.6, 8640000,  1, 0, 87.9, 5),
(48, 53.9, 61.5, 40.8, 0.0,  52.0, 46.0, 525.0, 3180, 37.1, 64.0,  447.9, 253.8, 1.1, 9763200,  1, 0, 88.7, 5),
(49, 70.6, 77.1, 47.4, 83.5, 71.0, 57.0, 320.0, 2490, 18.7, 32.0,  120.6, 93.0,  1.8, 6307200,  1, 1, 83.7, 4),
(50, 40.2, 48.5, 34.7, 0.0,  47.0, 41.0, 500.0, 3020, 29.6, 64.0,  418.3, 222.6, 1.0, 10886400, 1, 0, 90.8, 5),
(51, 54.7, 62.1, 41.4, 77.0, 66.0, 52.0, 270.0, 2160, 14.1, 24.0,  88.5,  65.2,  1.7, 8726400,  1, 0, 88.6, 5),
(52, 42.6, 50.9, 36.5, 0.0,  49.0, 43.0, 508.0, 3070, 32.9, 64.0,  430.2, 240.5, 1.0, 11318400, 1, 0, 90.3, 5);

-- ============================================================
-- 7. MAINTENANCE RECORDS (Bakım Kayıtları)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM MaintenanceRecords WHERE MaintenanceID = 1)
INSERT INTO MaintenanceRecords (AssetID, MaintenanceDate, MaintenanceType, Description, TechnicianName, TechnicianEmail, CostAmount, Status, NextMaintenanceDate, MaintenanceInterval) VALUES
(1,  '2024-01-10', 'Software Update', 'CUDA driver güncellendi: 460.32.03 -> 470.82.01', 'Ahmet Yılmaz', 'tech@trt.net.tr',          0.00,   'Completed', '2024-07-10', 180),
(1,  '2023-10-15', 'Fan Cleaning',    'GPU soğutma fanları temizlendi',                  'Mehmet Öztürk','tech@trt.net.tr',          150.00, 'Completed', '2024-04-15', 180),
(2,  '2024-01-15', 'Hardware Repair', 'Güç ünitesi değiştirildi: PSU 1200W',             'Sercan Demir', 'tech@trt.net.tr',          450.00, 'Completed', '2025-01-15', 365),
(10, '2024-02-20', 'Software Update', 'Firmware güncellendi 2.0.4',                      'Can Aydın',    'tech@trt.net.tr',          0.00,   'Completed', '2024-08-20', 180),
(21, '2023-12-05', 'Inspection',      'Genel sistem incelemesi yapıldı',                 'Zeynep Kara',  'tech@trt.net.tr',          200.00, 'Completed', '2024-06-05', 180),
(40, '2024-01-25', 'Cleaning',        'Sunucu temizliği ve termal macun değişimi',       'Ali Yıldız',   'tech@digiturk.com.tr',     250.00, 'Completed', '2024-07-25', 180),
(29, '2024-02-12', 'BIOS Update',     'BIOS v3.14 kuruldu, performans iyileştirmeleri', 'Fatma Şahin',  'tech@trt.net.tr',          0.00,   'Completed', '2024-08-12', 180);

-- ============================================================
-- 8. ALERTS (Uyarılar)
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM Alerts WHERE AlertID = 1)
INSERT INTO Alerts (AssetID, AlertType, AlertCategory, AlertMessage, AlertSeverity, ThresholdValue, CurrentValue, IsResolved) VALUES
(5,  'Critical', 'CPU',         'CPU kullanımı kritik seviyede: %89.2 (Eşik: %85)',     5, 85.0, 89.2, 0),
(5,  'Warning',  'Temperature', 'Sıcaklık yüksek: 82°C (Uyarı eşiği: 80°C)',           4, 80.0, 82.0, 0),
(11, 'Critical', 'Offline',     'Cihaz çevrimdışı - Ekol Encoding Server',              5, 0.0,  0.0,  0),
(20, 'Critical', 'Offline',     'Cihaz çevrimdışı - CNBC-e Transmission Router',        5, 0.0,  0.0,  0),
(34, 'Critical', 'Offline',     'Cihaz çevrimdışı - Demirören Archive Server',          5, 0.0,  0.0,  0),
(2,  'Warning',  'GPU',         'GPU kullanımı yüksek: %92.3 (Eşik: %90)',              3, 90.0, 92.3, 0),
(42, 'Warning',  'CPU',         'CPU kullanımı yüksek: %77.3 (Eşik: %75)',              3, 75.0, 77.3, 0),
(10, 'Info',     'Maintenance', 'Zamanlanmış bakım: TRT SAN Storage 2024-08-10',        2, 0.0,  0.0,  0),
(27, 'Info',     'Warranty',    'Garanti bitimine 90 gün kaldı: TGRT GPU RTX A5000',    2, 0.0,  0.0,  0),
(6,  'Info',     'Maintenance', 'Önlük bakım tamamlandı',                               1, 0.0,  0.0,  1);

-- ============================================================
-- 9. USERS (Kullanıcılar)
-- NOT: Şifreler bcrypt hash - `node scripts/hashPasswords.js` çalıştırın
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM Users WHERE UserID = 1)
INSERT INTO Users (Username, Email, PasswordHash, FullName, Role, ChannelID, Department) VALUES
('admin',       'admin@assetmgmt.local',   '$2a$10$Zp8d5lCRQcm.5IRVoaDJhO1h8UVFjlWSl52YmuM2Ojz1Cz6QZyfJi', 'Sistem Yöneticisi',  'Admin',      NULL, 'IT'),
('trt_manager', 'manager@trt.net.tr',      '$2a$10$Zp8d5lCRQcm.5IRVoaDJhO1h8UVFjlWSl52YmuM2Ojz1Cz6QZyfJi', 'Mahmut Aydın',       'Manager',    1,    'Teknik Yönetim'),
('trt_tech',    'tech@trt.net.tr',         '$2a$10$Zp8d5lCRQcm.5IRVoaDJhO1h8UVFjlWSl52YmuM2Ojz1Cz6QZyfJi', 'Ahmet Yılmaz',       'Technician', 1,    'Teknik Operasyon'),
('dgt_manager', 'manager@digiturk.com.tr', '$2a$10$Zp8d5lCRQcm.5IRVoaDJhO1h8UVFjlWSl52YmuM2Ojz1Cz6QZyfJi', 'Murat Erdoğan',      'Manager',    7,    'Teknik Yönetim'),
('viewer1',     'viewer@assetmgmt.local',  '$2a$10$Zp8d5lCRQcm.5IRVoaDJhO1h8UVFjlWSl52YmuM2Ojz1Cz6QZyfJi', 'Gözlemci Kullanıcı', 'Viewer',     NULL, 'Operasyon');

PRINT 'Seed data inserted! 1 Holding, 8 Channels, 29 AssetGroups, 53 Assets, 13 Components, 10 Alerts, 5 Users';
GO
