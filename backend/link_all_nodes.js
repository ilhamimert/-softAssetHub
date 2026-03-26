/**
 * link_all_nodes.js
 *
 * Tüm bağlanmamış 'bilgisayar' node'larını SQL asset'lere bağlar.
 * - Zaten bağlı → atla
 * - İsim eşleşmesi var → direkt bağla
 * - Eşleşme yok → yeni SQL asset oluştur, bağla
 *
 * Kullanım: node link_all_nodes.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '5412',
  database: process.env.DB_NAME     || 'asset_hub',
});

// Node adından asset_type tahmin et
function inferAssetType(name = '') {
  const n = name.toLowerCase();
  if (n.includes('server') || n.includes('sunucu'))   return 'Server';
  if (n.includes('router') || n.includes('yönlend'))  return 'Router';
  if (n.includes('switch') || n.includes('anahtar'))  return 'Switch';
  if (n.includes('gpu') || n.includes('graphics'))    return 'GPU';
  if (n.includes('storage') || n.includes('depo'))    return 'Storage';
  if (n.includes('encoder') || n.includes('kodla'))   return 'Encoder';
  if (n.includes('decoder') || n.includes('çözücü'))  return 'Decoder';
  if (n.includes('uplink') || n.includes('antenna'))  return 'Transmitter';
  if (n.includes('archive') || n.includes('arsiv'))   return 'ArchiveUnit';
  if (n.includes('firewall'))                          return 'Firewall';
  if (n.includes('ups'))                               return 'UPS';
  if (n.includes('camera') || n.includes('kamera'))   return 'Camera';
  return 'Server';
}

async function main() {
  const client = await pool.connect();
  try {
    // ── 1. Önce name-match ile bağla (mevcut autoLink mantığı) ──────
    const { rows: exactMatched } = await client.query(`
      UPDATE physical_nodes pn
      SET linked_asset_id = a.asset_id
      FROM assets a
      WHERE pn.node_type = 'bilgisayar'
        AND pn.linked_asset_id IS NULL
        AND (
          LOWER(pn.name) = LOWER(a.asset_name)
          OR LOWER(a.asset_name) LIKE '%' || LOWER(pn.name) || '%'
          OR LOWER(pn.name) LIKE '%' || LOWER(a.asset_name) || '%'
        )
      RETURNING pn.node_id, pn.name, a.asset_id, a.asset_name
    `);
    console.log(`\n[1] İsim eslesme: ${exactMatched.length} node baglandi`);
    exactMatched.forEach(r => console.log(`   ✓ "${r.name}" → asset #${r.asset_id} (${r.asset_name})`));

    // ── 2. Hâlâ bağlanmamış node'ları + kanal bilgisiyle al ─────────
    const { rows: unlinked } = await client.query(`
      WITH RECURSIVE node_ancestors AS (
        SELECT node_id AS bilgisayar_id, node_id, parent_id, name, node_type
        FROM physical_nodes
        WHERE node_type = 'bilgisayar' AND linked_asset_id IS NULL
        UNION ALL
        SELECT na.bilgisayar_id, pn.node_id, pn.parent_id, pn.name, pn.node_type
        FROM physical_nodes pn
        JOIN node_ancestors na ON pn.node_id = na.parent_id
      )
      SELECT
        b.node_id,
        b.name,
        b.payload,
        ka.name AS kanal_name
      FROM physical_nodes b
      LEFT JOIN (
        SELECT DISTINCT ON (bilgisayar_id) bilgisayar_id, name
        FROM node_ancestors
        WHERE node_type = 'kanal'
      ) ka ON ka.bilgisayar_id = b.node_id
      WHERE b.node_type = 'bilgisayar'
        AND b.linked_asset_id IS NULL
      ORDER BY b.name
    `);

    if (unlinked.length === 0) {
      console.log('\n[2] Tüm bilgisayar node\'lari zaten bagli. Islem bitti.');
      return;
    }

    console.log(`\n[2] ${unlinked.length} eslessiz node icin SQL asset olusturuluyor...`);

    let created = 0;
    let skipped = 0;

    for (const node of unlinked) {
      // Kanal adından channel_id bul
      let channelId = null;
      if (node.kanal_name) {
        const { rows: ch } = await client.query(
          `SELECT channel_id FROM channels WHERE LOWER(channel_name) = LOWER($1) LIMIT 1`,
          [node.kanal_name]
        );
        channelId = ch[0]?.channel_id ?? null;
      }

      if (!channelId) {
        // channel_id olmadan asset oluşturulamaz — ilk kanalı fallback olarak al
        const { rows: fallback } = await client.query(
          `SELECT channel_id FROM channels ORDER BY channel_id LIMIT 1`
        );
        channelId = fallback[0]?.channel_id ?? null;
      }

      if (!channelId) {
        console.log(`   ! "${node.name}" → kanal bulunamadi, atlandi`);
        skipped++;
        continue;
      }

      const assetType  = inferAssetType(node.name);
      const model      = node.payload?.model      ?? null;
      const ipAddress  = node.payload?.ip         ?? null;
      const rack       = node.payload?.rack        ?? null;
      const assetCode  = null; // otomatik oluşturulmayacak

      // Asset oluştur
      const { rows: [asset] } = await client.query(
        `INSERT INTO assets
           (asset_name, asset_type, channel_id, model, status, notes)
         VALUES ($1, $2, $3, $4, 'Active', $5)
         RETURNING asset_id`,
        [
          node.name,
          assetType,
          channelId,
          model,
          [ipAddress ? `IP: ${ipAddress}` : null, rack ? `Rack: ${rack}` : null]
            .filter(Boolean).join(' | ') || null,
        ]
      );

      // Node'u asset'e bağla
      await client.query(
        `UPDATE physical_nodes SET linked_asset_id = $1 WHERE node_id = $2`,
        [asset.asset_id, node.node_id]
      );

      // Audit kaydı
      await client.query(
        `INSERT INTO physical_audits (action_type, node_type, node_name) VALUES ('link', 'bilgisayar', $1)`,
        [node.name]
      );

      console.log(`   + "${node.name}" → yeni asset #${asset.asset_id} (${assetType}, kanal: ${node.kanal_name ?? '?'})`);
      created++;
    }

    console.log(`\n[SONUC]`);
    console.log(`  Isim eslesme ile baglanan : ${exactMatched.length}`);
    console.log(`  Yeni asset olusturulan    : ${created}`);
    console.log(`  Atlanan (kanal yok)       : ${skipped}`);
    console.log(`  TOPLAM islem              : ${exactMatched.length + created}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('HATA:', err.message);
  process.exit(1);
});
