import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  let pool: Pool | null = null;
  
  try {
    // Create database connection (same as seed-users)
    if (process.env.DATABASE_URL) {
      const isCloudSQL = process.env.DATABASE_URL.includes('/cloudsql/');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
        connectionTimeoutMillis: isCloudSQL ? 10000 : 2000,
        idleTimeoutMillis: 30000,
      });
    } else {
      const dbHost = process.env.DB_HOST || '127.0.0.1';
      const isCloudSQL = dbHost.startsWith('/cloudsql/');
      
      const dbConfig: Record<string, unknown> = {
        database: process.env.DB_NAME || 'ai_square_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: 20,
        connectionTimeoutMillis: isCloudSQL ? 10000 : 2000,
        idleTimeoutMillis: 30000,
      };
      
      if (isCloudSQL) {
        dbConfig.host = dbHost;
      } else {
        dbConfig.host = dbHost;
        dbConfig.port = parseInt(process.env.DB_PORT || '5433');
      }
      
      pool = new Pool(dbConfig);
    }

    // Get all users (limit to 100 for safety)
    const result = await pool.query(
      'SELECT id, email, name, role, email_verified, created_at FROM users ORDER BY created_at DESC LIMIT 100'
    );
    
    // Remove sensitive data
    const sanitizedUsers = result.rows.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.email_verified,
      createdAt: user.created_at
    }));
    
    return NextResponse.json({
      success: true,
      users: sanitizedUsers,
      count: sanitizedUsers.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch users',
        users: [] 
      },
      { status: 500 }
    );
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}