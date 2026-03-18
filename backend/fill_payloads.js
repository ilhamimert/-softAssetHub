require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

const holdingPayloads = {
  'TRT Holding':        { vergiNo: '1234567890', merkez: 'Ankara',    sektor: 'Kamu Yayıncılığı' },
  'Bağımsız Kanallar':  { vergiNo: '9876543210', merkez: 'İstanbul',  sektor: 'Özel Yayıncılık' },
  'Demirören Medya':    { vergiNo: '5544332211', merkez: 'İstanbul',  sektor: 'Medya & Yayıncılık' },
  'Turkuaz Medya':      { vergiNo: '6677889900', merkez: 'İstanbul',  sektor: 'Medya & Yayıncılık' },
};

const kanalPayloads = {
  'TRT 1':           { frekans: '177.5 MHz', yayinTipi: 'Karasal + Uydu', lisansNo: 'RTÜK-2001-001', kurulus: 1968 },
  'TRT Haber':       { frekans: '514 MHz',   yayinTipi: 'Karasal + Uydu', lisansNo: 'RTÜK-2001-002', kurulus: 1999 },
  'TRT Spor':        { frekans: '522 MHz',   yayinTipi: 'Uydu',           lisansNo: 'RTÜK-2001-003', kurulus: 1993 },
  'Ekol TV':         { frekans: '490 MHz',   yayinTipi: 'Uydu',           lisansNo: 'RTÜK-2010-045', kurulus: 2008 },
  'Digiturk':        { frekans: '506 MHz',   yayinTipi: 'Uydu',           lisansNo: 'RTÜK-2005-022', kurulus: 1999 },
  'CNBC-e':          { frekans: '498 MHz',   yayinTipi: 'Uydu + Kablo',   lisansNo: 'RTÜK-2003-018', kurulus: 2000 },
  'Now TV':          { frekans: '514 MHz',   yayinTipi: 'Uydu + Kablo',   lisansNo: 'RTÜK-2004-021', kurulus: 2004 },
  'TGRT Haber':      { frekans: '530 MHz',   yayinTipi: 'Karasal + Uydu', lisansNo: 'RTÜK-2009-038', kurulus: 1993 },
  'Demirören Medya': { frekans: '538 MHz',   yayinTipi: 'Uydu',           lisansNo: 'RTÜK-2011-051', kurulus: 2011 },
  'Kanal D':         { frekans: '546 MHz',   yayinTipi: 'Karasal + Uydu', lisansNo: 'RTÜK-1993-007', kurulus: 1993 },
  'CNN Türk':        { frekans: '554 MHz',   yayinTipi: 'Karasal + Uydu', lisansNo: 'RTÜK-1999-012', kurulus: 1999 },
  'Turkuaz Medya':   { frekans: '562 MHz',   yayinTipi: 'Uydu',           lisansNo: 'RTÜK-2013-062', kurulus: 2013 },
  'ATV':             { frekans: '570 MHz',   yayinTipi: 'Karasal + Uydu', lisansNo: 'RTÜK-1993-008', kurulus: 1993 },
  'A2':              { frekans: '578 MHz',   yayinTipi: 'Karasal + Uydu', lisansNo: 'RTÜK-2007-033', kurulus: 2007 },
  'A Haber':         { frekans: '586 MHz',   yayinTipi: 'Karasal + Uydu', lisansNo: 'RTÜK-2010-044', kurulus: 2010 },
};

const adresler = [
  'Harbiye Mah. Cumhuriyet Cad. No:12, Şişli, İstanbul',
  'Kavacık Mah. Rüzgarlıbahçe Cad. No:8, Beykoz, İstanbul',
  'Esenyurt Mah. Atatürk Cad. No:45, Esenyurt, İstanbul',
  'Oran Mah. Ege Sok. No:3, Çankaya, Ankara',
  'Balgat Mah. Kızılırmak Cad. No:15, Çankaya, Ankara',
  'Levent Mah. Büyükdere Cad. No:201, Beşiktaş, İstanbul',
  'Maslak Mah. Eski Büyükdere Cad. No:55, Sarıyer, İstanbul',
  'Kozyatağı Mah. Bağdat Cad. No:88, Kadıköy, İstanbul',
  'Nişantaşı Mah. Abdi İpekçi Cad. No:20, Şişli, İstanbul',
  'Bahçelievler Mah. İstasyon Cad. No:7, Bahçelievler, İstanbul',
  'Ümraniye Mah. Alemdağ Cad. No:102, Ümraniye, İstanbul',
  'Kızılay Mah. Atatürk Bul. No:33, Çankaya, Ankara',
  'Yıldız Mah. Çırağan Cad. No:5, Beşiktaş, İstanbul',
];

const odaMap = {
  'Playout Odası':          { tip: 'Yayın Kontrol', kapasite: 12, iklimlendirme: true },
  'Yayın Kontrol Odası':    { tip: 'Yayın Kontrol', kapasite: 15, iklimlendirme: true },
  'Encoding Odası':         { tip: 'Teknik',         kapasite: 8,  iklimlendirme: true },
  'Depolama Odası':         { tip: 'Depolama',       kapasite: 4,  iklimlendirme: true },
  'İletim Odası':           { tip: 'İletim',         kapasite: 6,  iklimlendirme: true },
  'Arşiv Odası':            { tip: 'Arşiv',          kapasite: 3,  iklimlendirme: false },
  'Teknik Altyapı Odası':   { tip: 'Teknik',         kapasite: 10, iklimlendirme: true },
};

async function run() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "SELECT node_id, name, node_type FROM physical_nodes WHERE node_type IN ('holding','kanal','bina','oda') ORDER BY node_type"
    );

    let updated = 0;
    let binaIdx = 0;
    let odaIdx = 0;

    for (const row of rows) {
      let payload = null;

      if (row.node_type === 'holding') {
        payload = holdingPayloads[row.name] || { vergiNo: '0000000000', merkez: 'İstanbul', sektor: 'Yayıncılık' };

      } else if (row.node_type === 'kanal') {
        payload = kanalPayloads[row.name] || { frekans: '500 MHz', yayinTipi: 'Uydu', lisansNo: 'RTÜK-2000-000', kurulus: 2000 };

      } else if (row.node_type === 'bina') {
        const adres = adresler[binaIdx % adresler.length];
        const katlar = [4, 5, 6, 8, 10, 12];
        const tipler = ['Yayın Merkezi', 'Teknik Merkez', 'Genel Merkez'];
        const telefonlar = ['0212 217 5800', '0212 463 3100', '0216 540 2200', '0312 490 1100', '0212 380 9900'];
        payload = {
          adres,
          kat: katlar[binaIdx % katlar.length],
          tip: tipler[binaIdx % tipler.length],
          telefon: telefonlar[binaIdx % telefonlar.length],
        };
        binaIdx++;

      } else if (row.node_type === 'oda') {
        const base = odaMap[row.name] || { tip: 'Genel', kapasite: 6, iklimlendirme: false };
        payload = {
          odaNo: `ODA-${String(101 + odaIdx)}`,
          kat: (odaIdx % 5) + 1,
          ...base,
        };
        odaIdx++;
      }

      if (payload) {
        await client.query(
          'UPDATE physical_nodes SET payload = $1 WHERE node_id = $2',
          [JSON.stringify(payload), row.node_id]
        );
        updated++;
        console.log(`[${row.node_type}] ${row.name} → güncellendi`);
      }
    }

    console.log(`\nToplam ${updated} node güncellendi.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(console.error);
