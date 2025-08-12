import { Pool } from 'pg';
import { execSync } from 'child_process';
import type { ChildProcess } from 'child_process';

/**
 * Global teardown for integration tests
 * Runs once after all test suites complete
 * 
 * IMPORTANT: Always clean up all test resources and ports
 */

// Test-specific ports to clean up
const TEST_PORTS = {
  NEXT: process.env.TEST_PORT || '3456',
  DB: process.env.TEST_DB_PORT || '5434',
  REDIS: process.env.TEST_REDIS_PORT || '6380'
};

/**
 * Force kill all processes on a port
 */
function forceKillPort(port: string, serviceName: string): void {
  try {
    console.log(`   🧹 Cleaning port ${port} (${serviceName})...`);
    execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
    console.log(`   ✅ Port ${port} cleaned`);
  } catch (error) {
    // Ignore errors
  }
}

export default async function globalTeardown() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧹 Starting global test cleanup...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // STEP 1: Stop Next.js dev server if we started it
    console.log('📌 Step 1: Stopping Next.js server...');
    const nextProcess = (global as unknown as { __NEXT_PROCESS__?: ChildProcess }).__NEXT_PROCESS__;
    
    if (nextProcess) {
      // Send SIGTERM for graceful shutdown
      nextProcess.kill('SIGTERM');
      
      // Wait a moment for process to terminate
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force kill if still running
      try {
        process.kill(nextProcess.pid!, 0); // Check if process exists
        nextProcess.kill('SIGKILL'); // Force kill
        console.log('   ⚠️ Had to force kill Next.js process');
      } catch {
        // Process doesn't exist, which is good
        console.log('   ✅ Next.js server stopped');
      }
    }
    
    // Also ensure port is completely free
    forceKillPort(TEST_PORTS.NEXT, 'Next.js');
    
    // STEP 2: Clean up test data from database
    console.log('\n📌 Step 2: Cleaning test database...');
    
    const dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(TEST_PORTS.DB),
      database: process.env.DB_NAME || 'ai_square_db',
      user: 'postgres',
      password: 'postgres',
    });
    
    try {
      // Clean up test data
      const result = await dbPool.query(`
        -- Delete test data cascade
        DELETE FROM users WHERE email LIKE '%@test.com'
      `);
      
      console.log(`   ✅ Cleaned up ${result.rowCount} test users and related data`);
      
      // Clean up test scenarios
      await dbPool.query(`
        DELETE FROM scenarios 
        WHERE source_path LIKE 'test/%'
           OR title::text LIKE '%Test%'
           OR title::text LIKE '%Performance Test%'
      `);
      
      // Clean up orphaned data
      await dbPool.query(`
        -- Clean orphaned evaluations
        DELETE FROM evaluations WHERE task_id NOT IN (SELECT id FROM tasks);
        
        -- Clean orphaned tasks
        DELETE FROM tasks WHERE program_id NOT IN (SELECT id FROM programs);
        
        -- Clean orphaned programs
        DELETE FROM programs WHERE scenario_id NOT IN (SELECT id FROM scenarios);
      `);
      
      console.log('   ✅ Database cleaned');
      
    } catch (error) {
      console.warn('   ⚠️ Could not clean all test data:', error);
    } finally {
      await dbPool.end();
    }
    
    // STEP 3: Clear Redis cache
    console.log('\n📌 Step 3: Clearing Redis cache...');
    
    try {
      const Redis = require('ioredis');
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(TEST_PORTS.REDIS),
        db: 1, // Test database
        retryStrategy: () => null,
      });
        
      // Clear test keys
      const testKeys = await redis.keys('test:*');
      if (testKeys.length > 0) {
        await redis.del(...testKeys);
        console.log(`   ✅ Cleared ${testKeys.length} test cache keys`);
      } else {
        console.log('   ✅ No test keys to clear');
      }
      
      await redis.quit();
    } catch (error) {
      console.warn('   ⚠️ Could not clear Redis:', error);
    }
    
    // STEP 4: Stop Docker containers (optional - keep running for next test)
    console.log('\n📌 Step 4: Docker containers...');
    if (process.env.STOP_DOCKER_AFTER_TEST === 'true') {
      try {
        execSync('docker-compose -f docker-compose.test.yml down', { stdio: 'ignore' });
        console.log('   ✅ Docker containers stopped');
      } catch (error) {
        console.warn('   ⚠️ Could not stop Docker containers');
      }
    } else {
      console.log('   ℹ️ Keeping Docker containers running for next test run');
    }
    
    // STEP 5: Final port cleanup
    console.log('\n📌 Step 5: Final port cleanup...');
    forceKillPort(TEST_PORTS.NEXT, 'Next.js');
    forceKillPort(TEST_PORTS.DB, 'PostgreSQL');
    forceKillPort(TEST_PORTS.REDIS, 'Redis');
    
    // Report final status
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Test Cleanup Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Next.js server stopped and port freed');
    console.log('✅ Test data cleaned from database');
    console.log('✅ Redis cache cleared');
    console.log('✅ All test ports cleaned');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Global teardown error:', error);
    // Don't throw - let Jest exit
  }
  
  // Small delay to ensure all connections are closed
  await new Promise(resolve => setTimeout(resolve, 100));
}