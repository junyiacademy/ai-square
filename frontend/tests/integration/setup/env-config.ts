/**
 * Environment-aware configuration for integration tests
 * Detects and configures the appropriate test environment
 */

export interface TestEnvironment {
  type: 'local' | 'docker' | 'ci' | 'cloud';
  services: {
    postgres: ServiceConfig;
    redis: ServiceConfig;
    nextjs: ServiceConfig;
  };
}

export interface ServiceConfig {
  host: string;
  port: number;
  available: boolean;
  connectionString?: string;
}

/**
 * Detect the current test environment
 */
export function detectEnvironment(): TestEnvironment['type'] {
  // GitHub Actions or other CI
  if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS) {
    return 'ci';
  }
  
  // Cloud Run or GCP
  if (process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT) {
    return 'cloud';
  }
  
  // Docker Compose
  if (process.env.DOCKER_COMPOSE === 'true') {
    return 'docker';
  }
  
  // Default to local
  return 'local';
}

/**
 * Get configuration for the current environment
 */
export function getTestConfig(): TestEnvironment {
  const envType = detectEnvironment();
  
  switch (envType) {
    case 'ci':
      return {
        type: 'ci',
        services: {
          postgres: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5434'),
            available: true, // CI services are guaranteed
          },
          redis: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6380'),
            available: true, // CI services are guaranteed
          },
          nextjs: {
            host: 'localhost',
            port: parseInt(process.env.TEST_PORT || '3456'),
            available: false, // Will be started by tests
          }
        }
      };
      
    case 'cloud':
      return {
        type: 'cloud',
        services: {
          postgres: {
            host: process.env.DB_HOST || '/cloudsql/' + process.env.CLOUD_SQL_CONNECTION_NAME,
            port: 5432,
            available: true,
            connectionString: process.env.DATABASE_URL,
          },
          redis: {
            host: process.env.REDIS_HOST || 'redis',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            available: !!process.env.REDIS_HOST,
          },
          nextjs: {
            host: 'localhost',
            port: parseInt(process.env.PORT || '8080'),
            available: true, // Cloud Run starts the app
          }
        }
      };
      
    case 'docker':
      return {
        type: 'docker',
        services: {
          postgres: {
            host: 'postgres-test',
            port: 5432,
            available: true,
          },
          redis: {
            host: 'redis-test',
            port: 6379,
            available: true,
          },
          nextjs: {
            host: 'localhost',
            port: parseInt(process.env.TEST_PORT || '3456'),
            available: false,
          }
        }
      };
      
    case 'local':
    default:
      return {
        type: 'local',
        services: {
          postgres: {
            host: 'localhost',
            port: parseInt(process.env.TEST_DB_PORT || '5434'),
            available: false, // Will check dynamically
          },
          redis: {
            host: 'localhost',
            port: parseInt(process.env.TEST_REDIS_PORT || '6380'),
            available: false, // Will check dynamically
          },
          nextjs: {
            host: 'localhost',
            port: parseInt(process.env.TEST_PORT || '3456'),
            available: false,
          }
        }
      };
  }
}

/**
 * Check if a service is accessible
 */
export async function checkService(service: ServiceConfig, type: 'postgres' | 'redis' | 'http'): Promise<boolean> {
  switch (type) {
    case 'postgres':
      try {
        const { Pool } = require('pg');
        const pool = new Pool({
          host: service.host,
          port: service.port,
          database: 'postgres',
          user: 'postgres',
          password: 'postgres',
          connectionTimeoutMillis: 3000,
        });
        await pool.query('SELECT 1');
        await pool.end();
        return true;
      } catch {
        return false;
      }
      
    case 'redis':
      try {
        const Redis = require('ioredis');
        const redis = new Redis({
          host: service.host,
          port: service.port,
          connectTimeout: 3000,
          retryStrategy: () => null,
        });
        await redis.ping();
        await redis.quit();
        return true;
      } catch {
        return false;
      }
      
    case 'http':
      try {
        const response = await fetch(`http://${service.host}:${service.port}/api/monitoring/health`, {
          signal: AbortSignal.timeout(3000),
        });
        return response.ok;
      } catch {
        return false;
      }
  }
}

/**
 * Wait for a service to be ready
 */
export async function waitForService(
  service: ServiceConfig, 
  type: 'postgres' | 'redis' | 'http',
  maxAttempts = 10,
  delayMs = 2000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkService(service, type)) {
      return true;
    }
    if (i < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

/**
 * Get environment-specific connection strings
 */
export function getConnectionStrings() {
  const config = getTestConfig();
  
  return {
    postgres: config.services.postgres.connectionString || 
      `postgresql://postgres:postgres@${config.services.postgres.host}:${config.services.postgres.port}/ai_square_db`,
    redis: `redis://${config.services.redis.host}:${config.services.redis.port}`,
    nextjs: `http://${config.services.nextjs.host}:${config.services.nextjs.port}`,
  };
}