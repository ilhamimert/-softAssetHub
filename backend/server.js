require('dotenv').config();

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET tanımlı değil veya 32 karakterden kısa! .env dosyasını kontrol edin.');
  process.exit(1);
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  console.error('❌ JWT_REFRESH_SECRET tanımlı değil veya 32 karakterden kısa! .env dosyasını kontrol edin.');
  process.exit(1);
}

const http = require('http');
const app = require('./src/app');
const { setupWebSocket, closeWebSocket } = require('./src/websocket/monitoringWS');
const { testConnection, closePool } = require('./src/config/database');
const { startMonitoringScheduler } = require('./src/services/monitoringScheduler');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// WebSocket
setupWebSocket(server);

// Başlat
server.listen(PORT, async () => {
  console.log('\n========================================');
  console.log('  BROADCAST ASSET MANAGEMENT SYSTEM');
  console.log('========================================');
  console.log(`  API     : http://localhost:${PORT}/api/v1`);
  console.log(`  WS      : ws://localhost:${PORT}/monitoring/realtime`);
  console.log(`  Ortam   : ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================\n');

  await testConnection();
  await startMonitoringScheduler();
});

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);

async function shutdown() {
  console.log('\n[INFO] Sunucu kapatılıyor...');
  closeWebSocket();
  server.close(async () => {
    await closePool();
    console.log('[INFO] Sunucu kapatıldı.');
    process.exit(0);
  });
}

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
