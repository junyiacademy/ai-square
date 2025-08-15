import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(request: NextRequest) {
  let pool: Pool | null = null;
  
  try {
    const dbConfig = {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 1,
      connectionTimeoutMillis: 5000,
    };

    console.log('Connecting to database with config:', { ...dbConfig, password: '***' });
    
    pool = new Pool(dbConfig);
    
    const result = await pool.query('SELECT NOW() as time, current_database() as db');
    
    return NextResponse.json({
      success: true,
      database: result.rows[0].db,
      time: result.rows[0].time,
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database
      }
    });
    
  } catch (error: any) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}