import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(_request: NextRequest) {
  let pool: Pool | null = null;
  
  try {
    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const isCloudSQL = dbHost.startsWith('/cloudsql/');
    
    // Build config based on connection type (same logic as get-pool.ts)
    const dbConfig: Record<string, unknown> = {
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 1,
      connectionTimeoutMillis: isCloudSQL ? 10000 : 5000,
    };
    
    if (isCloudSQL) {
      // For Cloud SQL Unix socket connections
      dbConfig.host = dbHost;
      // Don't set port for Unix socket connections
    } else {
      // For regular TCP connections (local/staging with IP)
      dbConfig.host = dbHost;
      dbConfig.port = parseInt(process.env.DB_PORT || '5433');
      dbConfig.ssl = false;
    }

    console.log('Connecting to database with config:', { 
      ...dbConfig, 
      password: '***',
      isCloudSQL,
      connectionType: isCloudSQL ? 'unix_socket' : 'tcp'
    });
    
    pool = new Pool(dbConfig);
    
    const result = await pool.query('SELECT NOW() as time, current_database() as db');
    
    return NextResponse.json({
      success: true,
      database: result.rows[0].db,
      time: result.rows[0].time,
      connection: {
        type: isCloudSQL ? 'Cloud SQL (unix socket)' : 'TCP',
        host: dbConfig.host,
        port: dbConfig.port || 'N/A (unix socket)',
        database: dbConfig.database,
        isCloudSQL
      }
    });
    
  } catch (error: unknown) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}