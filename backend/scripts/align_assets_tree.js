const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:5412@localhost:5432/asset_hub'
});

async function syncTreeToAssets() {
  try {
    // 1. Ağaçtaki bilgisayarların isimleriyle, fiziksel assetleri eşleştirip Linked ID'leri tamamlayalım.
    await pool.query(`
      UPDATE physical_nodes pn
      SET linked_asset_id = a.asset_id
      FROM assets a
      WHERE pn.node_type = 'bilgisayar'
        AND pn.linked_asset_id IS NULL
        AND LOWER(pn.name) = LOWER(a.asset_name)
    `);

    // 2. Ağaç tabloları ve gerçek tabloları (channels, rooms) okuyalım.
    const { rows: nodes } = await pool.query('SELECT * FROM physical_nodes');
    const { rows: channels } = await pool.query('SELECT * FROM channels');
    const { rows: roomsFull } = await pool.query(`
      SELECT r.room_id, r.room_name, c.channel_id, c.channel_name
      FROM rooms r
      JOIN buildings b ON r.building_id = b.building_id
      JOIN channels c ON b.channel_id = c.channel_id
    `);
    
    const getParent = (id) => nodes.find(n => n.node_id === id);
    let updatedCount = 0;

    for (const node of nodes) {
      if (node.node_type === 'bilgisayar' && node.linked_asset_id) {
        let curr = node;
        let odaNode = null;
        let kanalNode = null;
        
        // Hiyerarşiden Odayı ve Kanalı Bul
        while (curr) {
          if (curr.node_type === 'oda' && !odaNode) odaNode = curr;
          if (curr.node_type === 'kanal' && !kanalNode) kanalNode = curr;
          curr = getParent(curr.parent_id);
        }
        
        if (kanalNode && odaNode) {
          // Gerçek veritabanındaki (kanallar/odalar tablosundaki) tam kimliklerini bul
          const dbChannel = channels.find(c => c.channel_name === kanalNode.name);
          const dbRoom = roomsFull.find(r => r.room_name === odaNode.name && r.channel_name === kanalNode.name);
          
          if (dbChannel && dbRoom) {
             const chnPrefix = dbChannel.channel_name.substring(0,3).toUpperCase().replace(/[^A-Z]/g, '');
             const typePrefix = node.name.split(' ')[0].substring(0,3).toUpperCase();
             // Barkodu oluştur (Örn: GPU-AHB-135)
             const generatedCode = `${typePrefix}-${chnPrefix}-${node.linked_asset_id}`;
             
             await pool.query(`
                UPDATE assets 
                SET channel_id = $1, 
                    room_id = $2,
                    asset_code = COALESCE(asset_code, $3)
                WHERE asset_id = $4
             `, [dbChannel.channel_id, dbRoom.room_id, generatedCode, node.linked_asset_id]);
             
             updatedCount++;
          }
        }
      }
    }
    
    // Ağaçta yeri olmayan ama barkodu boş olan yetimlere de standart AST barkodu bas.
    await pool.query(`UPDATE assets SET asset_code = 'AST-DEV-' || asset_id WHERE asset_code IS NULL`);

    console.log(`✅ MUHTEŞEM! Ağaçta yer alan ${updatedCount} adet cihaz;`);
    console.log(`1. Kendi bağlı oldukları gerçek Kanala gönderildi.`);
    console.log(`2. Kendi bağlı oldukları gerçek Odaya gönderildi.`);
    console.log(`3. Barkodsuz / Kodsuz olanlara isme göre Otomatik Demirbaş Kodları (Örn: GPU-CNN-101) yazıldı.`);
    
  } catch (err) {
    console.error('Hata:', err);
  } finally {
    pool.end();
  }
}

syncTreeToAssets();
