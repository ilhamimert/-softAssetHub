const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:5412@localhost:5432/asset_hub'
});

async function fixCodes() {
  try {
    const { rows: assets } = await pool.query(`
      SELECT a.asset_id, a.asset_name, c.channel_name, r.room_name, a.asset_type
      FROM assets a
      JOIN channels c ON a.channel_id = c.channel_id
      LEFT JOIN rooms r ON a.room_id = r.room_id
      WHERE a.asset_code LIKE 'AST-DEV-%'
    `);

    for (const asset of assets) {
      // 1. Cihaz Türü (Type)
      let typePrefix = 'AST';
      const name = asset.asset_name.toUpperCase();
      const type = (asset.asset_type || '').toUpperCase();
      
      if (name.includes('GPU')) typePrefix = 'GPU';
      else if (name.includes('SERVER')) typePrefix = 'SRV';
      else if (name.includes('ENCODER') || name.includes('ENC')) typePrefix = 'ENC';
      else if (name.includes('STORAGE') || name.includes('NAS') || name.includes('SAN') || name.includes('HDD')) typePrefix = 'DSK';
      else if (name.includes('DISPLAY') || name.includes('BOARD') || name.includes('CARD')) typePrefix = 'DC';
      else if (name.includes('NETWORK') || name.includes('ROUTER') || name.includes('SWITCH')) typePrefix = 'NET';
      else if (name.includes('UPS')) typePrefix = 'UPS';
      else typePrefix = type.substring(0,3);

      // 2. Kanal Kodu
      let chanPrefix = 'GEN';
      if (asset.channel_name) {
         if (asset.channel_name.includes('TRT')) chanPrefix = 'TRT';
         else if (asset.channel_name.includes('Ekol')) chanPrefix = 'EKL';
         else if (asset.channel_name.includes('Demirören')) chanPrefix = 'DMR';
         else if (asset.channel_name.includes('CNBC')) chanPrefix = 'CNB';
         else if (asset.channel_name.includes('Now')) chanPrefix = 'NOW';
         else if (asset.channel_name.includes('Digiturk')) chanPrefix = 'DGT';
         else if (asset.channel_name.includes('Turkuaz')) chanPrefix = 'TRK';
         else if (asset.channel_name.includes('TGRT')) chanPrefix = 'TGR';
         else chanPrefix = asset.channel_name.substring(0,3).toUpperCase();
      }

      // 3. Oda Kodu
      let roomPrefix = 'GEN';
      if (asset.room_name) {
         const r = asset.room_name.toUpperCase();
         if (r.includes('PLAYOUT') || r.includes('YAYIN KONTROL')) roomPrefix = 'PLY';
         else if (r.includes('ENCOD')) roomPrefix = 'ENC';
         else if (r.includes('DEPOLAMA') || r.includes('STORAGE')) roomPrefix = 'STR';
         else if (r.includes('İLETIM') || r.includes('ALTYAPI')) roomPrefix = 'TRN';
         else if (r.includes('ARŞIV') || r.includes('ARCHIVE')) roomPrefix = 'ARC';
         else roomPrefix = r.substring(0,3).toUpperCase();
      }
      
      // 4. Sıradaki Müsait Numarayı Bul (Sırama)
      const countRes = await pool.query(`SELECT COUNT(*) as c FROM assets WHERE asset_code LIKE $1`, [`${typePrefix}-${chanPrefix}-${roomPrefix}-%`]);
      const currentCount = parseInt(countRes.rows[0].c, 10);
      const nextNum = (currentCount + 1).toString().padStart(3, '0');
      
      const newCode = `${typePrefix}-${chanPrefix}-${roomPrefix}-${nextNum}`;
      
      // 5. Veritabanını Ez ve Güncelle
      await pool.query('UPDATE assets SET asset_code = $1 WHERE asset_id = $2', [newCode, asset.asset_id]);
      console.log(`- ${asset.asset_name}   =>   ${newCode}`);
    }
    
    console.log('✅ BÜTÜN BARKODLAR İSTEDİĞİNİZ PROFESYONEL FORMATA DÖNÜŞTÜRÜLDÜ!');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

fixCodes();
