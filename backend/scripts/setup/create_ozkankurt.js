const bcrypt = require('bcryptjs');
require('dotenv').config();
const { query } = require('./src/config/database');

async function createUser() {
    const username = 'özkankurt';
    const password = process.env.OZKANKURT_PASSWORD;
    if (!password) { console.error('❌ OZKANKURT_PASSWORD tanımlı değil'); process.exit(1); }
    const fullName = 'Özkankurt';
    const email = 'ozkankurt@isoft.com.tr';
    const role = 'Admin';

    const hash = await bcrypt.hash(password, 10);

    try {
        const check = await query('SELECT user_id FROM users WHERE username = $1', [username]);
        if (check.recordset.length > 0) {
            console.log('Kullanıcı mevcut, güncelleniyor...');
            await query(
                'UPDATE users SET password_hash = $1, role = $2, full_name = $3, email = $4, is_active = TRUE WHERE username = $5',
                [hash, role, fullName, email, username]
            );
        } else {
            console.log('Yeni kullanıcı oluşturuluyor...');
            await query(
                'INSERT INTO users (username, password_hash, full_name, email, role, is_active) VALUES ($1, $2, $3, $4, $5, TRUE)',
                [username, hash, fullName, email, role]
            );
        }
        console.log('✅ Kullanıcı özkankurt Admin olarak oluşturuldu.');
    } catch (err) {
        console.error('❌ Hata:', err);
    } finally {
        process.exit();
    }
}

createUser();
