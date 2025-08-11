import { spawn } from 'child_process';
import { Pool } from 'pg';
import waitOn from 'wait-on';

/**
 * Global setup for integration tests
 * Runs once before all test suites
 */

let nextProcess: ReturnType<typeof spawn> | undefined;
let dbPool: Pool;

export default async function globalSetup() {
  console.log('\n🚀 Starting global test setup...\n');
  
  try {
    // 1. Check if database is available
    console.log('📦 Checking database connection...');
    dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: 'postgres',
      user: 'postgres',
      password: 'postgres',
    });
    
    try {
      await dbPool.query('SELECT 1');
      console.log('✅ Database is ready');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      console.log('Please ensure PostgreSQL is running on port 5433');
      process.exit(1);
    } finally {
      await dbPool.end();
    }
    
    // 2. Check if Next.js dev server is already running
    const isDevServerRunning = await checkPort(3000);
    
    if (!isDevServerRunning) {
      console.log('🔨 Starting Next.js development server...');
      
      // Start Next.js dev server
      nextProcess = spawn('npm', ['run', 'dev'], {
        cwd: process.cwd(),
        detached: false,
        stdio: 'pipe',
      });
      
      // Store process reference for cleanup
      (global as unknown as { __NEXT_PROCESS__?: ReturnType<typeof spawn> }).__NEXT_PROCESS__ = nextProcess;
      
      // Wait for server to be ready
      console.log('⏳ Waiting for Next.js server to be ready...');
      await waitOn({
        resources: ['http://localhost:3000/api/monitoring/health'],
        timeout: 60000, // 60 seconds timeout
        interval: 1000,
        validateStatus: (status) => status === 200 || status === 503,
      });
      
      console.log('✅ Next.js server is ready');
    } else {
      console.log('ℹ️ Next.js server already running, using existing instance');
    }
    
    // 3. Setup test database (optional - could create a dedicated test DB)
    console.log('🗄️ Preparing test database...');
    const testDbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
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
      
      console.log('✅ Test database prepared');
    } catch (error) {
      console.warn('⚠️ Could not clean test data:', error);
    } finally {
      await testDbPool.end();
    }
    
    // 4. Check Redis (optional)
    if (process.env.REDIS_ENABLED === 'true') {
      console.log('🔴 Checking Redis connection...');
      const Redis = require('ioredis');
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        retryStrategy: () => null,
      });
      
      try {
        await redis.ping();
        console.log('✅ Redis is ready');
      } catch (error) {
        console.warn('⚠️ Redis not available, tests will run without cache');
      } finally {
        redis.quit();
      }
    }
    
    console.log('\n✨ Global setup complete!\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
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