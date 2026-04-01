require('dotenv').config();
const { getPool, closePool } = require('../src/config/database');

async function addAssets() {
    try {
        const pool = await getPool();
        console.log('DB connected. Adding assets...');

        // Check existing asset count
        const before = await pool.request().query('SELECT COUNT(*) AS cnt FROM Assets');
        console.log(`Current asset count: ${before.recordset[0].cnt}`);

        // Get server room IDs dynamically
        const rooms = await pool.request().query(`
      SELECT sr.ServerRoomID, sr.RoomName, b.BuildingName, c.ChannelName, c.ChannelID
      FROM ServerRooms sr
      JOIN Buildings b ON sr.BuildingID = b.BuildingID
      JOIN Channels c ON b.ChannelID = c.ChannelID
      ORDER BY c.ChannelID, b.BuildingID, sr.ServerRoomID
    `);
        console.log(`Found ${rooms.recordset.length} server rooms`);

        // Build a map: channelName -> [serverRoomIDs]
        const roomMap = {};
        for (const r of rooms.recordset) {
            if (!roomMap[r.ChannelName]) roomMap[r.ChannelName] = [];
            roomMap[r.ChannelName].push(r.ServerRoomID);
        }
        console.log('Room map:', JSON.stringify(roomMap, null, 2));

        // Assets to add - each channel gets GPU, DisplayCard, Server, Disk, Network variety
        const newAssets = [];

        // Helper
        const add = (roomId, name, code, type, model, sn, mfr, supplier, pDate, wDate, wm, cost, val, dep, ip, status) => {
            newAssets.push({ roomId, name, code, type, model, sn, mfr, supplier, pDate, wDate, wm, cost, val, dep, ip, status });
        };

        // --- Turkuaz Medya ---
        const tkz = roomMap['Turkuaz Medya'] || [];
        if (tkz.length >= 1) {
            add(tkz[0], 'GPU RTX A6000 #001', 'GPU-TKZ-IST-001', 'GPU', 'RTX A6000 48GB', 'SN-A6000-2022-TKZ-001', 'NVIDIA', 'NVIDIA Turkey', '2022-09-10', '2025-09-10', 36, 5200, 3900, 25, '10.3.1.101', 'Active');
            add(tkz[0], 'GPU RTX A6000 #002', 'GPU-TKZ-IST-002', 'GPU', 'RTX A6000 48GB', 'SN-A6000-2022-TKZ-002', 'NVIDIA', 'NVIDIA Turkey', '2022-09-10', '2025-09-10', 36, 5200, 3900, 25, '10.3.1.102', 'Active');
            add(tkz[0], 'HPE ProLiant DL360 #001', 'SRV-TKZ-IST-001', 'Server', 'ProLiant DL360 Gen10+', 'SN-HPE-DL360-2022-TKZ', 'HPE', 'HPE Turkey', '2022-04-20', '2025-04-20', 36, 14000, 10500, 25, '10.3.1.50', 'Active');
            add(tkz[0], 'Cisco Nexus 9300 #001', 'NET-TKZ-IST-001', 'Network', 'Nexus 9300-EX', 'SN-CISCO-9300-TKZ-001', 'Cisco', 'Cisco Turkey', '2022-06-15', '2025-06-15', 36, 8500, 6375, 25, '10.3.1.1', 'Active');
            add(tkz[0], 'Display RTX 4070 #001', 'DISP-TKZ-IST-001', 'DisplayCard', 'RTX 4070 Ti 12GB', 'SN-RTX4070-TKZ-001', 'NVIDIA', 'NVIDIA Turkey', '2023-08-01', '2026-08-01', 36, 900, 810, 20, '10.3.1.111', 'Active');
        }
        if (tkz.length >= 2) {
            add(tkz[1], 'Dell EMC PowerStore #001', 'DSK-TKZ-IST-001', 'Disk', 'PowerStore 500T', 'SN-DELL-PS500-TKZ-001', 'Dell', 'Dell Turkey', '2023-01-10', '2026-01-10', 36, 22000, 19800, 20, '10.3.2.201', 'Active');
        }
        if (tkz.length >= 3) {
            add(tkz[2], 'GPU RTX 4080 #001', 'GPU-TKZ-ANK-001', 'GPU', 'RTX 4080 16GB', 'SN-RTX4080-2023-TKZ-ANK', 'NVIDIA', 'NVIDIA Turkey', '2023-05-01', '2026-05-01', 36, 1300, 1170, 20, '10.4.1.101', 'Active');
            add(tkz[2], 'Lenovo ThinkSystem SR650 #001', 'SRV-TKZ-ANK-001', 'Server', 'ThinkSystem SR650 V2', 'SN-LEN-SR650-TKZ-ANK', 'Lenovo', 'Lenovo Turkey', '2023-02-15', '2026-02-15', 36, 13500, 12150, 20, '10.4.1.50', 'Active');
        }

        // --- Ekol TV ---
        const ekl = roomMap['Ekol TV'] || [];
        if (ekl.length >= 1) {
            add(ekl[0], 'GPU Tesla T4 #001', 'GPU-EKL-IST-001', 'GPU', 'Tesla T4 16GB', 'SN-T4-2021-EKL-001', 'NVIDIA', 'NVIDIA Turkey', '2021-08-20', '2024-08-20', 36, 2500, 1500, 28, '10.5.1.101', 'Active');
            add(ekl[0], 'GPU Tesla T4 #002', 'GPU-EKL-IST-002', 'GPU', 'Tesla T4 16GB', 'SN-T4-2021-EKL-002', 'NVIDIA', 'NVIDIA Turkey', '2021-08-20', '2024-08-20', 36, 2500, 1500, 28, '10.5.1.102', 'Maintenance');
            add(ekl[0], 'Dell PowerEdge R740 #001', 'SRV-EKL-IST-001', 'Server', 'PowerEdge R740', 'SN-DELL-R740-EKL-001', 'Dell', 'Dell Turkey', '2021-06-10', '2024-06-10', 36, 11000, 6600, 25, '10.5.1.50', 'Active');
            add(ekl[0], 'NetApp FAS2720 #001', 'DSK-EKL-IST-001', 'Disk', 'FAS2720', 'SN-NTAP-2720-EKL-001', 'NetApp', 'NetApp Turkey', '2021-10-05', '2024-10-05', 36, 16000, 9600, 25, '10.5.1.201', 'Active');
        }
        if (ekl.length >= 2) {
            add(ekl[1], 'Display RTX 3080 #001', 'DISP-EKL-ANK-001', 'DisplayCard', 'RTX 3080 10GB', 'SN-RTX3080-EKL-ANK', 'NVIDIA', 'NVIDIA Turkey', '2022-03-15', '2025-03-15', 36, 800, 560, 20, '10.6.1.111', 'Active');
            add(ekl[1], 'Lenovo ThinkSystem SR530 #001', 'SRV-EKL-ANK-001', 'Server', 'ThinkSystem SR530', 'SN-LEN-SR530-EKL-ANK', 'Lenovo', 'Lenovo Turkey', '2022-01-20', '2025-01-20', 36, 9000, 6750, 25, '10.6.1.50', 'Active');
        }

        // --- Demirören Medya ---
        const dmr = roomMap['Demirören Medya'] || roomMap['Demiroren Medya'] || [];
        if (dmr.length >= 1) {
            add(dmr[0], 'GPU A100 #001', 'GPU-DMR-IST-001', 'GPU', 'A100 40GB', 'SN-A100-2023-DMR-001', 'NVIDIA', 'NVIDIA Turkey', '2023-03-01', '2026-03-01', 36, 10000, 9000, 25, '10.7.2.101', 'Active');
            add(dmr[0], 'GPU A100 #002', 'GPU-DMR-IST-002', 'GPU', 'A100 40GB', 'SN-A100-2023-DMR-002', 'NVIDIA', 'NVIDIA Turkey', '2023-03-01', '2026-03-01', 36, 10000, 9000, 25, '10.7.2.102', 'Active');
            add(dmr[0], 'Display RTX 4070 #001', 'DISP-DMR-IST-001', 'DisplayCard', 'RTX 4070 Ti 12GB', 'SN-RTX4070-DMR-001', 'NVIDIA', 'NVIDIA Turkey', '2023-08-10', '2026-08-10', 36, 900, 810, 20, '10.7.2.111', 'Active');
            add(dmr[0], 'Dell PowerEdge R760 #001', 'SRV-DMR-IST-001', 'Server', 'PowerEdge R760', 'SN-DELL-R760-DMR-001', 'Dell', 'Dell Turkey', '2023-05-15', '2026-05-15', 36, 20000, 18000, 20, '10.7.2.50', 'Active');
            add(dmr[0], 'Juniper QFX5120 #001', 'NET-DMR-IST-001', 'Network', 'QFX5120-48Y', 'SN-JNP-5120-DMR-001', 'Juniper', 'Juniper Turkey', '2023-04-01', '2026-04-01', 36, 12000, 10800, 20, '10.7.2.1', 'Active');
        }
        if (dmr.length >= 2) {
            add(dmr[1], 'Dell EMC Unity XT #001', 'DSK-DMR-IST-001', 'Disk', 'Unity XT 480', 'SN-DELL-UXT-DMR-001', 'Dell', 'Dell Turkey', '2023-06-20', '2026-06-20', 36, 28000, 25200, 20, '10.7.3.201', 'Active');
        }
        if (dmr.length >= 3) {
            add(dmr[2], 'GPU RTX 4080 #001', 'GPU-DMR-ANK-001', 'GPU', 'RTX 4080 16GB', 'SN-RTX4080-DMR-ANK', 'NVIDIA', 'NVIDIA Turkey', '2023-07-01', '2026-07-01', 36, 1300, 1170, 20, '10.8.1.101', 'Active');
            add(dmr[2], 'HPE ProLiant DL380 #001', 'SRV-DMR-ANK-001', 'Server', 'ProLiant DL380 Gen10+', 'SN-HPE-DL380-DMR-ANK', 'HPE', 'HPE Turkey', '2023-04-10', '2026-04-10', 36, 17000, 15300, 20, '10.8.1.50', 'Active');
        }

        // --- CNBC-e ---
        const cnbc = roomMap['CNBC-e'] || [];
        if (cnbc.length >= 1) {
            add(cnbc[0], 'GPU RTX A5000 #001', 'GPU-CNBC-IST-001', 'GPU', 'RTX A5000 24GB', 'SN-A5000-2022-CNBC-001', 'NVIDIA', 'NVIDIA Turkey', '2022-11-15', '2025-11-15', 36, 3200, 2400, 25, '10.9.1.101', 'Active');
            add(cnbc[0], 'GPU RTX A5000 #002', 'GPU-CNBC-IST-002', 'GPU', 'RTX A5000 24GB', 'SN-A5000-2022-CNBC-002', 'NVIDIA', 'NVIDIA Turkey', '2022-11-15', '2025-11-15', 36, 3200, 2400, 25, '10.9.1.102', 'Faulty');
            add(cnbc[0], 'Dell PowerEdge R650 #001', 'SRV-CNBC-IST-001', 'Server', 'PowerEdge R650', 'SN-DELL-R650-CNBC-001', 'Dell', 'Dell Turkey', '2022-08-10', '2025-08-10', 36, 16000, 12000, 25, '10.9.1.50', 'Active');
            add(cnbc[0], 'Arista 7050X3 #001', 'NET-CNBC-IST-001', 'Network', '7050X3-48YC8', 'SN-ARISTA-7050-CNBC', 'Arista', 'Arista Turkey', '2022-09-01', '2025-09-01', 36, 9500, 7125, 25, '10.9.1.1', 'Active');
        }
        if (cnbc.length >= 2) {
            add(cnbc[1], 'Display RTX 3070 #001', 'DISP-CNBC-ANK-001', 'DisplayCard', 'RTX 3070 8GB', 'SN-RTX3070-CNBC-ANK', 'NVIDIA', 'NVIDIA Turkey', '2022-05-20', '2025-05-20', 36, 600, 420, 20, '10.10.1.111', 'Active');
            add(cnbc[1], 'Lenovo ThinkSystem SR550 #001', 'SRV-CNBC-ANK-001', 'Server', 'ThinkSystem SR550', 'SN-LEN-SR550-CNBC-ANK', 'Lenovo', 'Lenovo Turkey', '2022-06-01', '2025-06-01', 36, 8500, 6375, 25, '10.10.1.50', 'Active');
        }

        // --- Now TV ---
        const now = roomMap['Now TV'] || [];
        if (now.length >= 1) {
            add(now[0], 'GPU RTX A6000 #001', 'GPU-NOW-IST-001', 'GPU', 'RTX A6000 48GB', 'SN-A6000-2023-NOW-001', 'NVIDIA', 'NVIDIA Turkey', '2023-04-10', '2026-04-10', 36, 5200, 4680, 25, '10.11.1.101', 'Active');
            add(now[0], 'GPU RTX A6000 #002', 'GPU-NOW-IST-002', 'GPU', 'RTX A6000 48GB', 'SN-A6000-2023-NOW-002', 'NVIDIA', 'NVIDIA Turkey', '2023-04-10', '2026-04-10', 36, 5200, 4680, 25, '10.11.1.102', 'Active');
            add(now[0], 'Display RTX 4090 #001', 'DISP-NOW-IST-001', 'DisplayCard', 'RTX 4090 24GB', 'SN-RTX4090-NOW-001', 'NVIDIA', 'NVIDIA Turkey', '2023-09-01', '2026-09-01', 36, 1999, 1799, 20, '10.11.1.111', 'Active');
            add(now[0], 'Dell PowerEdge R760 #001', 'SRV-NOW-IST-001', 'Server', 'PowerEdge R760', 'SN-DELL-R760-NOW-001', 'Dell', 'Dell Turkey', '2023-03-20', '2026-03-20', 36, 20000, 18000, 20, '10.11.1.50', 'Active');
            add(now[0], 'Pure Storage FlashArray #001', 'DSK-NOW-IST-001', 'Disk', 'FlashArray//X20', 'SN-PURE-FA-NOW-001', 'Pure Storage', 'Pure Storage TR', '2023-07-15', '2026-07-15', 36, 35000, 31500, 20, '10.11.1.201', 'Active');
            add(now[0], 'Cisco Catalyst 9300 #001', 'NET-NOW-IST-001', 'Network', 'Catalyst 9300-48UXM', 'SN-CISCO-C9300-NOW', 'Cisco', 'Cisco Turkey', '2023-05-01', '2026-05-01', 36, 7500, 6750, 20, '10.11.1.1', 'Active');
        }

        // --- TGRT Haber ---
        const tgrt = roomMap['TGRT Haber'] || [];
        if (tgrt.length >= 1) {
            add(tgrt[0], 'GPU RTX A4000 #001', 'GPU-TGRT-IST-001', 'GPU', 'RTX A4000 16GB', 'SN-A4000-2022-TGRT-001', 'NVIDIA', 'NVIDIA Turkey', '2022-10-01', '2025-10-01', 36, 1200, 840, 25, '10.12.1.101', 'Active');
            add(tgrt[0], 'GPU RTX A4000 #002', 'GPU-TGRT-IST-002', 'GPU', 'RTX A4000 16GB', 'SN-A4000-2022-TGRT-002', 'NVIDIA', 'NVIDIA Turkey', '2022-10-01', '2025-10-01', 36, 1200, 840, 25, '10.12.1.102', 'Inactive');
            add(tgrt[0], 'Display RTX 3060 #001', 'DISP-TGRT-IST-001', 'DisplayCard', 'RTX 3060 12GB', 'SN-RTX3060-TGRT-001', 'NVIDIA', 'NVIDIA Turkey', '2022-07-15', '2025-07-15', 36, 400, 280, 20, '10.12.1.111', 'Active');
            add(tgrt[0], 'HPE ProLiant DL360 #001', 'SRV-TGRT-IST-001', 'Server', 'ProLiant DL360 Gen10', 'SN-HPE-DL360-TGRT', 'HPE', 'HPE Turkey', '2022-05-01', '2025-05-01', 36, 13000, 9750, 25, '10.12.1.50', 'Active');
            add(tgrt[0], 'Synology RackStation #001', 'DSK-TGRT-IST-001', 'Disk', 'RS3621xs+', 'SN-SYN-RS3621-TGRT', 'Synology', 'Synology Turkey', '2022-08-20', '2025-08-20', 36, 6000, 4200, 25, '10.12.1.201', 'Active');
            add(tgrt[0], 'MikroTik CRS326 #001', 'NET-TGRT-IST-001', 'Network', 'CRS326-24G-2S+', 'SN-MKTK-CRS326-TGRT', 'MikroTik', 'MikroTik Turkey', '2022-06-10', '2025-06-10', 36, 350, 245, 20, '10.12.1.1', 'Active');
        }

        // Insert assets
        let inserted = 0;
        for (const a of newAssets) {
            try {
                // Check if asset code already exists
                const exists = await pool.request()
                    .input('code', a.code)
                    .query('SELECT AssetID FROM Assets WHERE AssetCode = @code');

                if (exists.recordset.length > 0) {
                    console.log(`  ⏭ Skip (exists): ${a.name}`);
                    continue;
                }

                const result = await pool.request()
                    .input('roomId', a.roomId)
                    .input('name', a.name)
                    .input('code', a.code)
                    .input('type', a.type)
                    .input('model', a.model)
                    .input('sn', a.sn)
                    .input('mfr', a.mfr)
                    .input('supplier', a.supplier)
                    .input('pDate', a.pDate)
                    .input('wDate', a.wDate)
                    .input('wm', a.wm)
                    .input('cost', a.cost)
                    .input('val', a.val)
                    .input('dep', a.dep)
                    .input('ip', a.ip)
                    .input('status', a.status)
                    .query(`INSERT INTO Assets (ServerRoomID, AssetName, AssetCode, AssetType, Model, SerialNumber, Manufacturer, Supplier, PurchaseDate, WarrantyEndDate, WarrantyMonths, PurchaseCost, CurrentValue, DepreciationRate, IPAddress, Status)
                  OUTPUT INSERTED.AssetID
                  VALUES (@roomId, @name, @code, @type, @model, @sn, @mfr, @supplier, @pDate, @wDate, @wm, @cost, @val, @dep, @ip, @status)`);

                const newId = result.recordset[0].AssetID;

                // Add monitoring data for the new asset
                const isGpu = a.type === 'GPU';
                const isDisplay = a.type === 'DisplayCard';
                const isServer = a.type === 'Server';
                const isOnline = a.status === 'Active' ? 1 : 0;
                const temp = 35 + Math.floor(Math.random() * 30);
                const power = isServer ? 500 + Math.floor(Math.random() * 400) : isGpu ? 150 + Math.floor(Math.random() * 150) : 50 + Math.floor(Math.random() * 100);

                await pool.request()
                    .input('assetId', newId)
                    .input('cpuUsage', isServer ? 40 + Math.floor(Math.random() * 40) : null)
                    .input('ramUsage', isServer ? 50 + Math.floor(Math.random() * 30) : null)
                    .input('diskUsage', isServer ? 30 + Math.floor(Math.random() * 40) : null)
                    .input('gpuUsage', (isGpu || isDisplay) ? 40 + Math.floor(Math.random() * 50) : null)
                    .input('temp', temp)
                    .input('cpuTemp', isServer ? temp : (isGpu || isDisplay) ? temp - 10 : null)
                    .input('power', power)
                    .input('fan', 1000 + Math.floor(Math.random() * 2500))
                    .input('memUsed', isServer ? 50 + Math.floor(Math.random() * 150) : (isGpu || isDisplay) ? 5 + Math.floor(Math.random() * 20) : null)
                    .input('memTotal', isServer ? 256 : (isGpu || isDisplay) ? (a.model.includes('48') ? 48 : a.model.includes('80') ? 80 : a.model.includes('40') ? 40 : a.model.includes('24') ? 24 : 16) : null)
                    .input('uptime', 3000000 + Math.floor(Math.random() * 8000000))
                    .input('isOnline', isOnline)
                    .input('perfScore', isOnline ? 70 + Math.floor(Math.random() * 25) : 0)
                    .input('signal', isOnline ? 4 + Math.floor(Math.random() * 2) : 0)
                    .query(`INSERT INTO AssetMonitoring (AssetID, CPUUsage, RAMUsage, DiskUsage, GPUUsage, Temperature, CPUTemperature, PowerConsumption, FanSpeed, MemoryUsedGB, MemoryTotalGB, Uptime, IsOnline, PerformanceScore, SignalStrength)
                  VALUES (@assetId, @cpuUsage, @ramUsage, @diskUsage, @gpuUsage, @temp, @cpuTemp, @power, @fan, @memUsed, @memTotal, @uptime, @isOnline, @perfScore, @signal)`);

                inserted++;
                console.log(`  ✅ Added: ${a.name} (ID: ${newId})`);
            } catch (err) {
                console.error(`  ❌ Error adding ${a.name}: ${err.message}`);
            }
        }

        const after = await pool.request().query('SELECT COUNT(*) AS cnt FROM Assets');
        console.log(`\nDone! Inserted ${inserted} new assets. Total: ${after.recordset[0].cnt}`);

        await closePool();
    } catch (err) {
        console.error('Fatal error:', err.message);
        process.exit(1);
    }
}

addAssets();
