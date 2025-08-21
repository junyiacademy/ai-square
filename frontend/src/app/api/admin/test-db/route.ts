import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET() {
  let pool: Pool | null = null;
  
  try {
    let connectionInfo: { type: string; url?: string; host?: unknown; port?: unknown; database?: unknown; source: string };
    
    // Use DATABASE_URL if available (Cloud Run), fallback to individual env vars (local)
    if (process.env.DATABASE_URL) {
      console.log('Using DATABASE_URL for connection');
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 1,
        connectionTimeoutMillis: 5000,
      });
      
      connectionInfo = {
        type: 'DATABASE_URL (recommended)',
        url: process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@'), // Hide password
        source: 'CONNECTION_STRING'
      };
    } else {
      // Fallback to individual environment variables for local development
      const dbHost = process.env.DB_HOST || '127.0.0.1';
      const isCloudSQL = dbHost.startsWith('/cloudsql/');
      
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

      console.log('Using individual env vars for connection:', { 
        ...dbConfig, 
        password: '***',
        isCloudSQL,
        connectionType: isCloudSQL ? 'unix_socket' : 'tcp'
      });
      
      pool = new Pool(dbConfig);
      
      connectionInfo = {
        type: isCloudSQL ? 'Cloud SQL (unix socket)' : 'TCP',
        host: dbConfig.host,
        port: dbConfig.port || 'N/A (unix socket)',
        database: dbConfig.database,
        source: 'INDIVIDUAL_ENV_VARS'
      };
    }
    
    const result = await pool.query('SELECT NOW() as time, current_database() as db');

    return NextResponse.json({
      success: true,
      database: result.rows[0].db,
      time: result.rows[0].time,
      connection: connectionInfo
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