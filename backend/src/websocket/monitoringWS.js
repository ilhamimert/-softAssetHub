const WebSocket = require('ws');
const { query } = require('../config/database');

let wss = null;
const clients = new Map(); // clientId -> { ws, channelId, assetIds }

function setupWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/monitoring/realtime' });

  wss.on('connection', (ws, req) => {
    const clientId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    clients.set(clientId, { ws, channelId: null, assetIds: [] });

    console.log(`[WS] Yeni bağlantı: ${clientId} | Toplam: ${clients.size}`);

    ws.send(JSON.stringify({
      type: 'CONNECTED',
      clientId,
      message: 'Broadcast Asset Management - Real-time Monitoring',
    }));

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());

        // Kanal veya asset filtreleme
        if (data.type === 'SUBSCRIBE') {
          const client = clients.get(clientId);
          if (client) {
            client.channelId = data.channelId || null;
            client.assetIds  = data.assetIds  || [];
          }
          ws.send(JSON.stringify({ type: 'SUBSCRIBED', channelId: data.channelId, assetIds: data.assetIds }));
        }

        // Cihazdan monitoring verisi push
        if (data.type === 'MONITORING_DATA' && data.assetId) {
          const { assetId, ...metricsData } = data;
          await query(
            `INSERT INTO AssetMonitoring (AssetID, CPUUsage, RAMUsage, DiskUsage, GPUUsage,
              Temperature, PowerConsumption, IsOnline, ErrorCount, PerformanceScore)
             VALUES (@assetId, @cpuUsage, @ramUsage, @diskUsage, @gpuUsage,
              @temperature, @powerConsumption, @isOnline, @errorCount, @performanceScore)`,
            {
              assetId: parseInt(assetId),
              cpuUsage: metricsData.cpuUsage,
              ramUsage: metricsData.ramUsage,
              diskUsage: metricsData.diskUsage,
              gpuUsage: metricsData.gpuUsage,
              temperature: metricsData.temperature,
              powerConsumption: metricsData.powerConsumption,
              isOnline: metricsData.isOnline !== false,
              errorCount: metricsData.errorCount || 0,
              performanceScore: metricsData.performanceScore,
            }
          );

          // Abone olan clientlara yayınla
          broadcast({ type: 'ASSET_UPDATE', assetId: parseInt(assetId), data: metricsData, timestamp: new Date().toISOString() }, parseInt(assetId));
        }
      } catch (err) {
        console.error('[WS] Mesaj işleme hatası:', err.message);
        ws.send(JSON.stringify({ type: 'ERROR', message: err.message }));
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`[WS] Bağlantı kapandı: ${clientId} | Kalan: ${clients.size}`);
    });

    ws.on('error', (err) => {
      console.error(`[WS] Hata - ${clientId}:`, err.message);
      clients.delete(clientId);
    });

    // Heartbeat — bağlantıyı canlı tut
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
  });

  // Heartbeat interval
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(heartbeat));

  // Periyodik DB polling — anlık verileri pushla (5 saniye)
  startPeriodicBroadcast();

  console.log('✅ WebSocket sunucusu başlatıldı: /monitoring/realtime');
  return wss;
}

function broadcast(data, targetAssetId = null) {
  if (!wss) return;
  const message = JSON.stringify(data);

  clients.forEach(({ ws, assetIds }, clientId) => {
    if (ws.readyState !== WebSocket.OPEN) return;

    // Filtre yoksa herkese gönder
    if (!targetAssetId || assetIds.length === 0 || assetIds.includes(targetAssetId)) {
      ws.send(message);
    }
  });
}

function broadcastToAll(data) {
  if (!wss) return;
  const message = JSON.stringify(data);
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(message);
  });
}

function startPeriodicBroadcast() {
  setInterval(async () => {
    if (!wss || wss.clients.size === 0) return;

    try {
      const result = await query(
        `SELECT TOP 50
          m.AssetID, m.Temperature, m.PowerConsumption, m.CPUUsage, m.GPUUsage,
          m.RAMUsage, m.IsOnline, m.PerformanceScore, m.MonitoringTime,
          a.AssetName, a.AssetCode, a.Status
         FROM (
           SELECT *, ROW_NUMBER() OVER (PARTITION BY AssetID ORDER BY MonitoringTime DESC) AS rn
           FROM AssetMonitoring
         ) m
         JOIN Assets a ON m.AssetID = a.AssetID
         WHERE m.rn = 1 AND a.IsActive = 1`
      );

      if (result.recordset.length > 0) {
        broadcastToAll({
          type: 'BATCH_UPDATE',
          data: result.recordset,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      // DB bağlantısı yoksa sessizce geç
    }
  }, 5000);
}

module.exports = { setupWebSocket, broadcast, broadcastToAll };
