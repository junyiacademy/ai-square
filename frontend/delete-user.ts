import { Pool } from 'pg';

async function deleteUser() {
  const pool = new Pool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'ai_square_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    const email = 'youngtsai@junyiacademy.org';
    
    // 查找用戶
    const findResult = await pool.query(
      'SELECT id, email, name, created_at FROM users WHERE email = $1',
      [email]
    );
    
    if (findResult.rows.length === 0) {
      console.log('❌ 找不到用戶:', email);
      return;
    }
    
    const user = findResult.rows[0];
    console.log('找到用戶:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Name:', user.name);
    console.log('  註冊時間:', user.created_at);
    
    // 刪除用戶
    await pool.query('DELETE FROM users WHERE email = $1', [email]);
    console.log('✅ 用戶已刪除');
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

deleteUser().catch(console.error);