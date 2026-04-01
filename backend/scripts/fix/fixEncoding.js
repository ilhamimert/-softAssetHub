/**
 * Encoding fix — seed verilerdeki bozuk Türkçe karakterleri düzeltir.
 * Çalıştır: node scripts/fixEncoding.js
 */

require('dotenv').config();
const sql = require('mssql');

const config = {
  server:   process.env.DB_SERVER   || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME     || 'AssetManagementDB',
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASSWORD || '5412',
  options: { encrypt: false, trustServerCertificate: true },
};

async function run() {
  const pool = await sql.connect(config);

  // ── USERS ──────────────────────────────────────────────────────────────────
  const users = [
    { username: 'admin',       fullName: 'Sistem Yöneticisi', department: 'Yönetim' },
    { username: 'trt_manager', fullName: 'Mahmut Aydın',      department: 'IT Yönetimi' },
    { username: 'trt_tech',    fullName: 'Ahmet Yılmaz',      department: 'Teknik Destek' },
    { username: 'dgt_manager', fullName: 'Murat Erdoğan',     department: 'IT Yönetimi' },
    { username: 'viewer1',     fullName: 'Gözlemci Kullanıcı', department: 'İzleme' },
  ];

  for (const u of users) {
    await pool.request()
      .input('fn', sql.NVarChar, u.fullName)
      .input('dp', sql.NVarChar, u.department)
      .input('un', sql.NVarChar, u.username)
      .query('UPDATE Users SET FullName=@fn, Department=@dp WHERE Username=@un');
    console.log(`✓ Users — ${u.username} → ${u.fullName}`);
  }

  // ── ALERTS ─────────────────────────────────────────────────────────────────
  const alerts = [
    { id: 1,  msg: 'CPU kullanımı kritik seviyede: %89.2 (Eşik: %85)' },
    { id: 2,  msg: 'Sıcaklık yüksek: 82°C (Uyarı eşiği: 80°C)' },
    { id: 3,  msg: 'Cihaz Çevrimdışı - Ekol Encoding Server' },
    { id: 4,  msg: 'Cihaz Çevrimdışı - CNBC-e Transmission Router' },
    { id: 5,  msg: 'Cihaz Çevrimdışı - Demirören Archive Server' },
    { id: 6,  msg: 'GPU kullanımı yüksek: %92.3 (Eşik: %90)' },
    { id: 7,  msg: 'CPU kullanımı yüksek: %77.3 (Eşik: %75)' },
    { id: 8,  msg: 'Zamanlanmış bakım: TRT SAN Storage 2024-08-10' },
    { id: 9,  msg: 'Garanti bitimine 90 gün kaldı: TGRT GPU RTX A5000' },
    { id: 10, msg: 'Günlük bakım tamamlandı' },
  ];

  for (const a of alerts) {
    await pool.request()
      .input('msg', sql.NVarChar, a.msg)
      .input('id',  sql.Int, a.id)
      .query('UPDATE Alerts SET AlertMessage=@msg WHERE AlertID=@id');
    console.log(`✓ Alerts #${a.id} → ${a.msg}`);
  }

  // ── BUILDINGS ──────────────────────────────────────────────────────────────
  const buildings = [
    { id: 4,  name: 'Demirören Teknik Bina' },
    { id: 10, name: 'CNN Türk Merkez Bina'  },
  ];

  for (const b of buildings) {
    await pool.request()
      .input('name', sql.NVarChar, b.name)
      .input('id',   sql.Int, b.id)
      .query('UPDATE Buildings SET BuildingName=@name WHERE BuildingID=@id');
    console.log(`✓ Buildings #${b.id} → ${b.name}`);
  }

  // ── MAINTENANCE RECORDS ────────────────────────────────────────────────────
  const maintenance = [
    { id: 1, tech: 'Ahmet Yılmaz',   desc: 'CUDA driver güncellendi: 460.32.03 → 470.82.01',   notes: 'Başarılı' },
    { id: 2, tech: 'Mehmet Öztürk',  desc: 'GPU soğutma fanları temizlendi',                   notes: 'Başarılı' },
    { id: 3, tech: 'Sercan Demir',   desc: 'Güç ünitesi değiştirildi: PSU 1200W',              notes: 'Başarılı' },
    { id: 4, tech: 'Can Aydın',      desc: 'Firmware güncellendi 2.0.4',                       notes: 'Başarılı' },
    { id: 5, tech: 'Zeynep Kara',    desc: 'Genel sistem incelemesi yapıldı',                  notes: 'Başarılı' },
    { id: 6, tech: 'Ali Yıldız',     desc: 'Sunucu temizliği ve termal macun değişimi',        notes: 'Başarılı' },
    { id: 7, tech: 'Fatma Şahin',    desc: 'BIOS v3.14 kuruldu, performans iyileştirmeleri',   notes: 'Başarılı' },
  ];

  for (const m of maintenance) {
    await pool.request()
      .input('tech',  sql.NVarChar, m.tech)
      .input('desc',  sql.NVarChar, m.desc)
      .input('notes', sql.NVarChar, m.notes)
      .input('id',    sql.Int, m.id)
      .query('UPDATE MaintenanceRecords SET TechnicianName=@tech, Description=@desc, Notes=@notes WHERE MaintenanceID=@id');
    console.log(`✓ Maintenance #${m.id} → ${m.tech}`);
  }

  await pool.close();
  console.log('\n✅ Tüm encoding düzeltmeleri tamamlandı.');
}

run().catch(err => { console.error('❌ Hata:', err.message); process.exit(1); });
