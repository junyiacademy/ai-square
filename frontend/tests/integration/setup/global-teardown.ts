import { Pool } from 'pg';
import type { ChildProcess } from 'child_process';

/**
 * Global teardown for integration tests
 * Runs once after all test suites complete
 */

export default async function globalTeardown() {
  console.log('\n🧹 Starting global test cleanup...\n');
  
  try {
    // 1. Stop Next.js dev server if we started it
    const nextProcess = (global as unknown as { __NEXT_PROCESS__?: ChildProcess }).__NEXT_PROCESS__;
    
    if (nextProcess) {
      console.log('🛑 Stopping Next.js development server...');
      
      // Send SIGTERM for graceful shutdown
      nextProcess.kill('SIGTERM');
      
      // Wait a moment for process to terminate
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Force kill if still running
      try {
        process.kill(nextProcess.pid!, 0); // Check if process exists
        nextProcess.kill('SIGKILL'); // Force kill
        console.log('⚠️ Had to force kill Next.js process');
      } catch {
        // Process doesn't exist, which is good
        console.log('✅ Next.js server stopped');
      }
    }
    
    // 2. Clean up test data from database
    console.log('🗑️ Cleaning up test data...');
    
    const dbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
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
      
      console.log(`✅ Cleaned up ${result.rowCount} test users and related data`);
      
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
      
      console.log('✅ Database cleaned');
      
    } catch (error) {
      console.warn('⚠️ Could not clean all test data:', error);
    } finally {
      await dbPool.end();
    }
    
    // 3. Clear Redis if it was used
    if (process.env.REDIS_ENABLED === 'true') {
      console.log('🔴 Clearing Redis test data...');
      
      try {
        const Redis = require('ioredis');
        const redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          db: 1, // Test database
          retryStrategy: () => null,
        });
        
        // Clear test keys
        const testKeys = await redis.keys('test:*');
        if (testKeys.length > 0) {
          await redis.del(...testKeys);
          console.log(`✅ Cleared ${testKeys.length} test cache keys`);
        }
        
        await redis.quit();
      } catch (error) {
        console.warn('⚠️ Could not clear Redis:', error);
      }
    }
    
    // 4. Report final status
    console.log('\n📊 Test Cleanup Summary:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Next.js server stopped (if started)');
    console.log('✅ Test data cleaned from database');
    console.log('✅ Cache cleared (if applicable)');
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Global teardown error:', error);
    // Don't throw - let Jest exit
  }
  
  // Small delay to ensure all connections are closed
  await new Promise(resolve => setTimeout(resolve, 100));
}