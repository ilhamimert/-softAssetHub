const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'AssetManagementDB',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '5412',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    enableArithAbort: true,
  },
  pool: {
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

let pool = null;

async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('✅ SQL Server bağlantı havuzu oluşturuldu.');

    pool.on('error', (err) => {
      console.error('❌ SQL Server havuz hatası:', err);
      pool = null;
    });
  }
  return pool;
}

async function query(queryString, params = {}) {
  const poolConn = await getPool();
  const request = poolConn.request();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      request.input(key, sql.NVarChar, null);
    } else if (typeof value === 'number' && Number.isInteger(value)) {
      request.input(key, sql.Int, value);
    } else if (typeof value === 'number') {
      request.input(key, sql.Float, value);
    } else if (typeof value === 'boolean') {
      request.input(key, sql.Bit, value);
    } else if (value instanceof Date) {
      request.input(key, sql.DateTime, value);
    } else {
      request.input(key, sql.NVarChar, String(value));
    }
  }

  return request.query(queryString);
}

async function testConnection() {
  try {
    const poolConn = await getPool();
    await poolConn.request().query('SELECT 1 AS test');
    console.log('✅ Veritabanı bağlantısı başarılı.');
    return true;
  } catch (err) {
    console.error('❌ Veritabanı bağlantı hatası:', err.message);
    return false;
  }
}

async function closePool() {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('✅ Veritabanı bağlantısı kapatıldı.');
  }
}

module.exports = { getPool, query, testConnection, closePool, sql };
