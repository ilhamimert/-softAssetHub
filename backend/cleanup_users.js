require('dotenv').config();
const { query } = require('./src/config/database');

async function cleanupUsers() {
    const keepUsername = 'ilhami.yesiloz';

    try {
        console.log(`Cleaning up all users except ${keepUsername}...`);
        
        // Let's delete them. If there are foreign key constraints, we might need to handle them.
        // But for users, usually activity_log might have user_id.
        // Let's check first.
        
        // We will do a hard delete for demo/clean start as requested.
        // First nullify user_id in activity_log to avoid FK errors if they exist.
        await query('UPDATE activity_log SET user_id = NULL WHERE user_id IN (SELECT user_id FROM users WHERE username != $1)', [keepUsername]);
        
        const result = await query(
            'DELETE FROM users WHERE username != $1 RETURNING username',
            [keepUsername]
        );
        
        console.log(`✅ Removed ${result.recordset.length} users.`);
        result.recordset.forEach(u => console.log(`- Removed: ${u.username}`));
        
    } catch (err) {
        console.error('❌ Error during cleanup:', err);
    } finally {
        process.exit();
    }
}

cleanupUsers();
