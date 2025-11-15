import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { distributedCacheService } from '@/lib/cache/distributed-cache-service';
import os from 'os';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
    };
    redis: {
      status: 'up' | 'down' | 'disabled';
      responseTime?: number;
      error?: string;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  environment: string;
  version: string;
}

// Track application start time
const startTime = Date.now();

async function checkDatabase(): Promise<HealthCheckResult['services']['database']> {
  const start = Date.now();

  try {
    // Check if using DATABASE_URL or individual env vars
    let pool: Pool;

    if (process.env.DATABASE_URL) {
      // Use DATABASE_URL for Cloud Run
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 1,
        connectionTimeoutMillis: 5000,
      });
    } else {
      // Use individual env vars for local development
      const dbHost = process.env.DB_HOST || 'localhost';
      const isCloudSQL = dbHost.startsWith('/cloudsql/');

      const dbConfig: Record<string, unknown> = {
        host: dbHost,
        database: process.env.DB_NAME || 'ai_square_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        max: 1,
        connectionTimeoutMillis: 5000,
      };

      // Only set port for non-CloudSQL connections
      if (!isCloudSQL) {
        dbConfig.port = parseInt(process.env.DB_PORT || '5433');
      }

      pool = new Pool(dbConfig);
    }

    // Simple health check query
    const result = await pool.query('SELECT 1 as health_check');
    await pool.end();

    if (result.rows[0]?.health_check === 1) {
      return {
        status: 'up',
        responseTime: Date.now() - start,
      };
    }

    return {
      status: 'down',
      error: 'Unexpected response from database',
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkRedis(): Promise<HealthCheckResult['services']['redis']> {
  const start = Date.now();

  // Check if Redis is enabled
  if (process.env.REDIS_ENABLED !== 'true') {
    return {
      status: 'disabled',
    };
  }

  try {
    // Test Redis connection with a simple get/set
    const testKey = 'health:check';
    const testValue = Date.now().toString();

    // Try to set and get a value
    await distributedCacheService.getWithRevalidation(
      testKey,
      async () => testValue,
      { ttl: 10 } // 10 second TTL for health check
    );

    return {
      status: 'up',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function checkMemory(): HealthCheckResult['services']['memory'] {
  const used = process.memoryUsage();
  const total = os.totalmem();
  const usedMemory = used.heapUsed + used.external;

  return {
    used: Math.round(usedMemory / 1024 / 1024), // MB
    total: Math.round(total / 1024 / 1024), // MB
    percentage: Math.round((usedMemory / total) * 100),
  };
}

export async function GET() {
  try {
    // Run health checks in parallel
    const [dbHealth, redisHealth] = await Promise.all([
      checkDatabase(),
      checkRedis(),
    ]);

    const memoryHealth = checkMemory();

    // Determine overall status
    let overallStatus: HealthCheckResult['status'] = 'healthy';

    if (dbHealth.status === 'down') {
      overallStatus = 'unhealthy';
    } else if (redisHealth.status === 'down') {
      overallStatus = 'degraded'; // App can work without Redis
    } else if (memoryHealth.percentage > 90) {
      overallStatus = 'degraded'; // High memory usage
    }

    const healthCheckResult: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.round((Date.now() - startTime) / 1000), // seconds
      services: {
        database: dbHealth,
        redis: redisHealth,
        memory: memoryHealth,
      },
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    };

    // Return appropriate status code based on health
    const statusCode = overallStatus === 'healthy' ? 200 :
                       overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(healthCheckResult, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error) {
    // If health check itself fails, return error
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      }
    );
  }
}

// HEAD request for simple alive check
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
