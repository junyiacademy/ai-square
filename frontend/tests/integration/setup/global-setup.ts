import { spawn, execSync } from 'child_process';
import { Pool } from 'pg';
import waitOn from 'wait-on';

/**
 * Global setup for integration tests
 * Runs once before all test suites
 * 
 * IMPORTANT: Always clean up ports before starting services
 */

let nextProcess: ReturnType<typeof spawn> | undefined;
let dbPool: Pool;

// Test-specific ports to avoid conflicts
const TEST_PORTS = {
  NEXT: process.env.TEST_PORT || '3456',
  DB: process.env.TEST_DB_PORT || '5434', 
  REDIS: process.env.TEST_REDIS_PORT || '6380'
};

/**
 * Kill all processes using a specific port
 * MUST be done before starting any test services
 */
function killPort(port: string, serviceName: string): void {
  console.log(`🧹 Cleaning port ${port} (${serviceName})...`);
  try {
    // Find and kill all processes using the port
    execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
    // Additional check for Docker containers
    execSync(`docker ps -q --filter "publish=${port}" | xargs docker stop 2>/dev/null || true`, { stdio: 'ignore' });
    console.log(`   ✅ Port ${port} cleaned`);
  } catch (error) {
    // Ignore errors - port might not be in use
  }
}

/**
 * Try to start test containers if Docker is available
 * But don't fail if Docker is not available - just try to connect to services
 */
async function tryStartContainers(): Promise<void> {
  console.log('🐳 Checking test environment...');
  
  // Try to use docker-compose if available
  try {
    execSync('docker-compose -f docker-compose.test.yml ps -q 2>/dev/null', { stdio: 'ignore' });
    console.log('   ℹ️ Docker compose is available, ensuring containers are up...');
    
    // Try to start/restart containers
    try {
      execSync('docker-compose -f docker-compose.test.yml up -d 2>/dev/null', { stdio: 'ignore' });
      console.log('   ✅ Test containers started/verified');
    } catch (error) {
      console.log('   ⚠️ Could not start containers, will try to connect anyway');
    }
  } catch (error) {
    console.log('   ℹ️ Docker compose not available, assuming services are running elsewhere');
  }
}

export default async function globalSetup() {
  console.log('\n🚀 Starting global test setup...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Set test environment variables
  process.env.PORT = TEST_PORTS.NEXT;
  process.env.DB_PORT = TEST_PORTS.DB;
  process.env.REDIS_PORT = TEST_PORTS.REDIS;
  process.env.API_URL = `http://localhost:${TEST_PORTS.NEXT}`;
  
  try {
    // STEP 1: Clean ALL test ports FIRST (critical!)
    console.log('📌 Step 1: Cleaning all test ports...');
    killPort(TEST_PORTS.NEXT, 'Next.js');
    killPort(TEST_PORTS.DB, 'PostgreSQL');
    killPort(TEST_PORTS.REDIS, 'Redis');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for ports to be fully released
    
    // STEP 2: Try to ensure test environment is available
    console.log('\n📌 Step 2: Test environment...');
    await tryStartContainers();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Give services time to start
    
    // STEP 3: Verify database connection (flexible - try test port first, then dev port)
    console.log('\n📌 Step 3: Verifying database connection...');
    
    let dbConnected = false;
    let actualDbPort = TEST_PORTS.DB;
    
    // Try test database first
    dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(TEST_PORTS.DB),
      database: 'postgres',
      user: 'postgres',
      password: 'postgres',
    });
    
    // Try to connect to test DB
    for (let i = 0; i < 3; i++) {
      try {
        await dbPool.query('SELECT 1');
        dbConnected = true;
        console.log(`   ✅ Test database ready on port ${TEST_PORTS.DB}`);
        break;
      } catch (error) {
        if (i === 2) {
          console.log(`   ⚠️ Test database not available on port ${TEST_PORTS.DB}`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // If test DB fails, try development DB
    if (!dbConnected) {
      await dbPool.end();
      actualDbPort = '5433';
      console.log('   Trying development database on port 5433...');
      
      dbPool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: 5433,
        database: 'postgres',
        user: 'postgres',
        password: 'postgres',
      });
      
      try {
        await dbPool.query('SELECT 1');
        dbConnected = true;
        console.log('   ✅ Using development database on port 5433');
        process.env.DB_PORT = '5433'; // Update for tests
      } catch (error) {
        console.log('   ❌ Development database also not available');
      }
    }
    
    if (!dbConnected) {
      console.error('\n❌ No database available for testing');
      console.log('Please start either:');
      console.log('  1. Test database: docker-compose -f docker-compose.test.yml up -d');
      console.log('  2. Dev database: docker-compose -f docker-compose.postgres.yml up -d');
      process.exit(1);
    }
    
    await dbPool.end();
    
    // STEP 4: Start Next.js server on clean test port
    console.log(`\n📌 Step 4: Starting Next.js server on port ${TEST_PORTS.NEXT}...`);
    
    // Start Next.js dev server on test port
    nextProcess = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      detached: false,
      stdio: 'pipe',
      env: {
        ...process.env,
        PORT: TEST_PORTS.NEXT,
        DB_PORT: TEST_PORTS.DB,
        REDIS_PORT: TEST_PORTS.REDIS,
        NODE_ENV: 'test'
      }
    });
    
    // Store process reference for cleanup
    (global as unknown as { __NEXT_PROCESS__?: ReturnType<typeof spawn> }).__NEXT_PROCESS__ = nextProcess;
    
    // Wait for server to be ready
    console.log(`   ⏳ Waiting for Next.js server to be ready...`);
    await waitOn({
      resources: [`http://localhost:${TEST_PORTS.NEXT}/api/monitoring/health`],
      timeout: 60000, // 60 seconds timeout
      interval: 1000,
      validateStatus: (status) => status === 200 || status === 503,
    });
    
    console.log(`   ✅ Next.js server is ready on port ${TEST_PORTS.NEXT}`);
    
    // STEP 5: Setup test database
    console.log('\n📌 Step 5: Preparing test database...');
    const testDbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(TEST_PORTS.DB),
      database: process.env.DB_NAME || 'ai_square_db',
      user: 'postgres',
      password: 'postgres',
    });
    
    try {
      // Create test data or clean existing data
      // Use individual queries to handle missing tables gracefully
      const cleanupQueries = [
        `DELETE FROM evaluations WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')`,
        `DELETE FROM tasks WHERE program_id IN (SELECT id FROM programs WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com'))`,
        `DELETE FROM programs WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')`,
        `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')`,
        `DELETE FROM verification_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')`,
        `DELETE FROM users WHERE email LIKE '%@test.com'`
      ];
      
      for (const query of cleanupQueries) {
        try {
          await testDbPool.query(query);
        } catch (error) {
          // Ignore errors from missing tables
        }
      }
      
      console.log('   ✅ Test database prepared');
    } catch (error) {
      console.warn('   ⚠️ Could not clean test data:', error);
    } finally {
      await testDbPool.end();
    }
    
    // STEP 6: Verify Redis connection (optional - tests can run without it)
    console.log('\n📌 Step 6: Verifying Redis connection...');
    const Redis = require('ioredis');
    
    let redisConnected = false;
    let actualRedisPort = TEST_PORTS.REDIS;
    
    // Try test Redis first
    let redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(TEST_PORTS.REDIS),
      retryStrategy: () => null,
      lazyConnect: true,
    });
    
    try {
      await redis.connect();
      await redis.ping();
      redisConnected = true;
      console.log(`   ✅ Test Redis ready on port ${TEST_PORTS.REDIS}`);
      await redis.quit();
    } catch (error) {
      await redis.quit();
      
      // Try development Redis
      console.log('   Trying development Redis on port 6379...');
      redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: 6379,
        retryStrategy: () => null,
        lazyConnect: true,
      });
      
      try {
        await redis.connect();
        await redis.ping();
        redisConnected = true;
        actualRedisPort = '6379';
        console.log('   ✅ Using development Redis on port 6379');
        process.env.REDIS_PORT = '6379'; // Update for tests
        await redis.quit();
      } catch (error) {
        await redis.quit();
        console.warn('   ⚠️ Redis not available, tests will run without cache');
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Global setup complete!');
    console.log(`   Next.js: http://localhost:${TEST_PORTS.NEXT}`);
    console.log(`   PostgreSQL: localhost:${process.env.DB_PORT || TEST_PORTS.DB}`);
    console.log(`   Redis: localhost:${actualRedisPort || 'N/A'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    
    // Cleanup on error
    if (nextProcess) {
      nextProcess.kill('SIGTERM');
    }
    
    process.exit(1);
  }
}

async function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true); // Port is in use
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false); // Port is available
    });
    
    server.listen(port);
  });
}