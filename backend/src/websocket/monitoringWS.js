const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

let wss = null;
let heartbeatInterval = null;
let broadcastInterval = null;
const clients = new Map(); // clientId -> { ws, channelId, assetIds, authenticated }

function setupWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/monitoring/realtime' });

  wss.on('connection', (ws) => {
    const clientId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    clients.set(clientId, { ws, channelId: null, assetIds: [], authenticated: false });

    // 10 saniye içinde AUTH gelmezse bağlantıyı kes
    const authTimeout = setTimeout(() => {
      const c = clients.get(clientId);
      if (c && !c.authenticated) {
        ws.close(4001, 'Authentication timeout');
        clients.delete(clientId);
      }
    }, 10000);

    ws.send(JSON.stringify({
      type: 'CONNECTED',
      clientId,
      message: 'Lütfen AUTH mesajı gönderin.',
    }));

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        const client = clients.get(clientId);
        if (!client) return;

        // ── AUTH ──────────────────────────────────────────────────
        if (data.type === 'AUTH') {
          const token = data.token;
          if (!token) {
            return ws.send(JSON.stringify({ type: 'AUTH_ERROR', message: 'Token gerekli.' }));
          }
          try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            client.authenticated = true;
            client.userId = decoded.userId;
            client.role   = decoded.role;
            clearTimeout(authTimeout);
            ws.send(JSON.stringify({ type: 'AUTH_OK', userId: decoded.userId, role: decoded.role }));
          } catch {
            ws.close(4001, 'Invalid token');
            clients.delete(clientId);
          }
          return;
        }

        // Kimlik doğrulanmamışsa diğer mesajları reddet
        if (!client.authenticated) {
          return ws.send(JSON.stringify({ type: 'ERROR', message: 'Kimlik doğrulama gerekli.' }));
        }

        // ── SUBSCRIBE ─────────────────────────────────────────────
        if (data.type === 'SUBSCRIBE') {
          client.channelId = data.channelId || null;
          client.assetIds  = Array.isArray(data.assetIds) ? data.assetIds.map(Number) : [];
          ws.send(JSON.stringify({ type: 'SUBSCRIBED', channelId: data.channelId, assetIds: data.assetIds }));
        }

      } catch (err) {
        console.error('[WS] Mesaj işleme hatası:', err.message);
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Geçersiz mesaj formatı.' }));
      }
    });

    ws.on('close', () => {
      clearTimeout(authTimeout);
      clients.delete(clientId);
    });

    ws.on('error', (err) => {
      console.error(`[WS] Hata - ${clientId}:`, err.message);
      clearTimeout(authTimeout);
      clients.delete(clientId);
    });

    // Heartbeat
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
  });

  // Heartbeat interval — ölü bağlantıları temizle
  heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  });

  // Periyodik DB polling — OUTER APPLY (ROW_NUMBER yerine)
  startPeriodicBroadcast();

  console.log('✅ WebSocket sunucusu başlatıldı: /monitoring/realtime');
  return wss;
}

function broadcast(data, targetAssetId = null) {
  if (!wss) return;
  const message = JSON.stringify(data);

  clients.forEach(({ ws, assetIds, authenticated }) => {
    if (!authenticated || ws.readyState !== WebSocket.OPEN) return;
    if (!targetAssetId || assetIds.length === 0 || assetIds.includes(targetAssetId)) {
      ws.send(message);
    }
  });
}

function broadcastToAll(data) {
  if (!wss) return;
  const message = JSON.stringify(data);
  clients.forEach(({ ws, authenticated }) => {
    if (authenticated && ws.readyState === WebSocket.OPEN) ws.send(message);
  });
}

// Demo canlılık için küçük rastgele sapma ekler
function jitter(val, delta, min = 0, max = 100) {
  if (val == null) return val;
  const rand = Math.floor(Math.random() * (delta * 2 + 1)) - delta;
  return Math.max(min, Math.min(max, val + rand));
}

function applyJitter(row) {
  return {
    ...row,
    cpuUsage:         jitter(row.cpuUsage,         5,  0, 100),
    ramUsage:         jitter(row.ramUsage,          3,  0, 100),
    diskUsage:        jitter(row.diskUsage,         2,  0, 100),
    gpuUsage:         jitter(row.gpuUsage,          5,  0, 100),
    temperature:      jitter(row.temperature,       2, 20,  90),
    powerConsumption: jitter(row.powerConsumption, 15,  0, 800),
  };
}

function startPeriodicBroadcast() {
  let errorCount = 0;
  const MAX_ERRORS = 10;

  broadcastInterval = setInterval(async () => {
    if (!wss || wss.clients.size === 0) return;

    try {
      const result = await query(
        `SELECT
          a.asset_id, a.asset_name, a.asset_code, a.status,
          lm.temperature, lm.power_consumption, lm.cpu_usage, lm.gpu_usage,
          lm.ram_usage, lm.is_online, lm.performance_score, lm.monitoring_time
         FROM assets a
         LEFT JOIN LATERAL (
           SELECT temperature, power_consumption, cpu_usage, gpu_usage,
                  ram_usage, is_online, performance_score, monitoring_time
           FROM asset_monitoring m2
           WHERE m2.asset_id = a.asset_id
           ORDER BY m2.monitoring_time DESC LIMIT 1
         ) lm ON true
         WHERE a.is_active = TRUE`
      );

      errorCount = 0;
      if (result.recordset.length > 0) {
        broadcastToAll({
          type: 'BATCH_UPDATE',
          data: result.recordset.map(applyJitter),
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      errorCount++;
      console.error(`[WS] Periyodik yayın hatası (${errorCount}/${MAX_ERRORS}):`, err.message);
      if (errorCount >= MAX_ERRORS) {
        console.error('[WS] Ardışık hata eşiği aşıldı, process yeniden başlatılıyor.');
        process.exit(1);
      }
    }
  }, 5000);
}

function closeWebSocket() {
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    broadcastInterval = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (wss) {
    wss.clients.forEach((ws) => ws.terminate());
    wss.close();
    wss = null;
    clients.clear();
  }
}

module.exports = { setupWebSocket, broadcast, broadcastToAll, closeWebSocket };
