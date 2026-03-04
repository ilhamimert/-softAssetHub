require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { setupWebSocket } = require('./src/websocket/monitoringWS');
const { testConnection, closePool } = require('./src/config/database');

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
});

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);

async function shutdown() {
  console.log('\n[INFO] Sunucu kapatılıyor...');
  server.close(async () => {
    await closePool();
    console.log('[INFO] Sunucu kapatıldı.');
    process.exit(0);
  });
}

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
