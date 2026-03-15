const { Pool } = require('pg');

if (!process.env.DB_PASSWORD) {
  console.error('❌ DB_PASSWORD ortam değişkeni tanımlı değil! .env dosyasını kontrol edin.');
  process.exit(1);
}

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'asset_hub',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 40,
      min: 5,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 45000,
    });

    pool.on('error', (err) => {
      console.error('❌ PostgreSQL havuz hatası:', err);
      pool = null;
    });

    console.log('✅ PostgreSQL bağlantı havuzu oluşturuldu.');
  }
  return pool;
}

/** snake_case → camelCase dönüştürücü */
function toCamelCase(str) {
  return str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function convertRow(row) {
  if (!row) return row;
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [toCamelCase(k), v])
  );
}

/**
 * Parametreli sorgu çalıştırır.
 * params: pozisyonel dizi — örn. [userId, 'Admin']
 * Döndürür: { recordset: [...camelCase rows], rowsAffected: [n] }
 */
async function query(queryString, params = []) {
  const result = await getPool().query(queryString, params);
  return {
    recordset: result.rows.map(convertRow),
    rowsAffected: [result.rowCount],
  };
}

/**
 * Atomik işlemler için transaction wrapper.
 * fn(txQuery) içindeki tüm sorgular tek transaction'da çalışır;
 * herhangi bir hata olursa otomatik rollback yapılır.
 *
 * @example
 * await withTransaction(async (txQuery) => {
 *   await txQuery('UPDATE users SET ...', [1]);
 *   await txQuery('INSERT INTO activity_log ...', [...]);
 * });
 */
/**
 * RLS-aware sorgu çalıştırıcı.
 * Transaction içinde SET LOCAL ile kullanıcı bağlamını atar;
 * RLS politikaları bu değerlere göre filtreler.
 *
 * @param {object} user  — { userId, role, channelId }
 * @param {function} fn  — async (rlsQuery) => { ... }
 *
 * @example
 * await withRLS(req.user, async (rlsQuery) => {
 *   const r = await rlsQuery('SELECT * FROM assets WHERE ...', []);
 * });
 */
async function withRLS(user, fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT set_config($1, $2, true)', ['app.user_role',  String(user.role)]);
    await client.query('SELECT set_config($1, $2, true)', ['app.user_id',    String(user.userId)]);
    await client.query('SELECT set_config($1, $2, true)', ['app.channel_id', String(user.channelId || 0)]);

    const rlsQuery = async (queryString, params = []) => {
      const r = await client.query(queryString, params);
      return {
        recordset: r.rows.map(convertRow),
        rowsAffected: [r.rowCount],
      };
    };

    const result = await fn(rlsQuery);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const txQuery = async (queryString, params = []) => {
      const r = await client.query(queryString, params);
      return {
        recordset: r.rows.map(convertRow),
        rowsAffected: [r.rowCount],
      };
    };

    const result = await fn(txQuery);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function testConnection() {
  try {
    const result = await query('SELECT NOW() AS now');
    console.log('✅ PostgreSQL bağlantısı başarılı:', result.recordset[0].now);
    return true;
  } catch (err) {
    console.error('❌ Veritabanı bağlantı hatası:', err.message);
    return false;
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Veritabanı bağlantısı kapatıldı.');
  }
}

module.exports = { getPool, query, withRLS, withTransaction, testConnection, closePool };
