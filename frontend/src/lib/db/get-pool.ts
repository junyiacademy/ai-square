import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const isCloudSQL = dbHost.startsWith('/cloudsql/');

    // Build config based on connection type
    const config: Record<string, unknown> = {
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: isCloudSQL ? 10000 : 5000,
    };

    if (isCloudSQL) {
      // For Cloud SQL Unix socket connections
      config.host = dbHost;
      // Don't set port for Unix socket connections
    } else {
      // For regular TCP connections (local/staging with IP)
      config.host = dbHost;
      config.port = parseInt(process.env.DB_PORT || '5432');
      config.ssl = false;
      config.keepAlive = true;
      config.keepAliveInitialDelayMillis = 0;
    }

    pool = new Pool(config);

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    // Test connection on first use
    pool.on('connect', () => {
      console.log('Database client connected');
    });
  }

  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
