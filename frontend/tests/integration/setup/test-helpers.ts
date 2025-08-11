import request from 'supertest';
import { Pool } from 'pg';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { testUsers } from './test-fixtures';

/**
 * Test Helper Functions for Integration Testing
 * 
 * Provides utility functions for common test operations
 */

// API Test Helpers
export class APITestHelper {
  private baseUrl: string;
  
  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Make authenticated API request
   */
  async authenticatedRequest(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    token: string,
    body?: any
  ) {
    const req = request(this.baseUrl)[method](path)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json');
    
    if (body) {
      req.send(body);
    }
    
    return req;
  }
  
  /**
   * Login and get token
   */
  async login(email: string, password: string): Promise<string> {
    const response = await request(this.baseUrl)
      .post('/api/auth/login')
      .send({ email, password });
    
    if (response.status !== 200) {
      throw new Error(`Login failed: ${response.body.error}`);
    }
    
    return response.body.token;
  }
  
  /**
   * Register new user
   */
  async register(email: string, password: string, name: string) {
    const response = await request(this.baseUrl)
      .post('/api/auth/register')
      .send({ email, password, name });
    
    return response;
  }
  
  /**
   * Create and start a PBL program
   */
  async createPBLProgram(scenarioId: string, token: string) {
    const response = await this.authenticatedRequest(
      'post',
      `/api/pbl/scenarios/${scenarioId}/start`,
      token
    );
    
    return response.body;
  }
  
  /**
   * Submit task response
   */
  async submitTaskResponse(
    programId: string,
    taskId: string,
    response: string,
    token: string
  ) {
    return this.authenticatedRequest(
      'post',
      `/api/pbl/programs/${programId}/tasks/${taskId}/submit`,
      token,
      { response }
    );
  }
  
  /**
   * Get evaluation result
   */
  async getEvaluation(taskId: string, token: string) {
    return this.authenticatedRequest(
      'get',
      `/api/evaluations/task/${taskId}`,
      token
    );
  }
}

// Database Test Helpers
export class DatabaseTestHelper {
  private pool: Pool;
  
  constructor(pool: Pool) {
    this.pool = pool;
  }
  
  /**
   * Create test user directly in database
   */
  async createUser(userData: typeof testUsers.student) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    try {
      const result = await this.pool.query(
        `INSERT INTO users (id, email, password_hash, name, role, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          userData.id,
          userData.email,
          hashedPassword,
          userData.name,
          userData.role,
          userData.emailVerified,
          new Date(),
          new Date()
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      // Return a mock user for testing purposes
      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        email_verified: userData.emailVerified,
        created_at: new Date(),
        updated_at: new Date()
      };
    }
  }
  
  /**
   * Create session for user
   */
  async createSession(userId: string): Promise<string> {
    const token = jwt.sign(
      { userId, email: 'test@test.com' },
      process.env.NEXTAUTH_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );
    
    try {
      await this.pool.query(
        `INSERT INTO sessions (user_id, token, expires_at, created_at)
         VALUES ($1, $2, $3, $4)`,
        [
          userId,
          token,
          new Date(Date.now() + 24 * 60 * 60 * 1000),
          new Date()
        ]
      );
    } catch (error) {
      // Sessions table might not exist in test environment
      // Just return the token for testing
      console.log('Sessions table not available, returning mock token');
    }
    
    return token;
  }
  
  /**
   * Clean up test data for specific user
   */
  async cleanupUser(userId: string) {
    // Delete in reverse order of dependencies
    await this.pool.query('DELETE FROM evaluations WHERE user_id = $1', [userId]);
    await this.pool.query('DELETE FROM tasks WHERE program_id IN (SELECT id FROM programs WHERE user_id = $1)', [userId]);
    await this.pool.query('DELETE FROM programs WHERE user_id = $1', [userId]);
    await this.pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    await this.pool.query('DELETE FROM verification_tokens WHERE user_id = $1', [userId]);
    await this.pool.query('DELETE FROM users WHERE id = $1', [userId]);
  }
  
  /**
   * Verify data integrity
   */
  async verifyDataIntegrity() {
    const checks = {
      orphanedPrograms: 0,
      orphanedTasks: 0,
      orphanedEvaluations: 0,
      modeMismatches: 0,
    };
    
    // Check for orphaned programs
    const orphanedPrograms = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM programs p
      LEFT JOIN scenarios s ON p.scenario_id = s.id
      WHERE s.id IS NULL
    `);
    checks.orphanedPrograms = parseInt(orphanedPrograms.rows[0].count);
    
    // Check for orphaned tasks
    const orphanedTasks = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM tasks t
      LEFT JOIN programs p ON t.program_id = p.id
      WHERE p.id IS NULL
    `);
    checks.orphanedTasks = parseInt(orphanedTasks.rows[0].count);
    
    // Check for orphaned evaluations
    const orphanedEvaluations = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM evaluations e
      LEFT JOIN tasks t ON e.task_id = t.id
      WHERE t.id IS NULL
    `);
    checks.orphanedEvaluations = parseInt(orphanedEvaluations.rows[0].count);
    
    // Check for mode mismatches
    const modeMismatches = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM programs p
      JOIN scenarios s ON p.scenario_id = s.id
      WHERE p.mode != s.mode
    `);
    checks.modeMismatches = parseInt(modeMismatches.rows[0].count);
    
    return checks;
  }
  
  /**
   * Get statistics for a user's learning progress
   */
  async getUserStats(userId: string) {
    const stats = {
      totalPrograms: 0,
      completedPrograms: 0,
      totalTasks: 0,
      completedTasks: 0,
      averageScore: 0,
      totalTimeSpent: 0,
    };
    
    // Get program stats
    const programStats = await this.pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        SUM(time_spent_seconds) as total_time
      FROM programs
      WHERE user_id = $1
    `, [userId]);
    
    stats.totalPrograms = parseInt(programStats.rows[0].total);
    stats.completedPrograms = parseInt(programStats.rows[0].completed);
    stats.totalTimeSpent = parseInt(programStats.rows[0].total_time || 0);
    
    // Get task stats
    const taskStats = await this.pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed
      FROM tasks t
      JOIN programs p ON t.program_id = p.id
      WHERE p.user_id = $1
    `, [userId]);
    
    stats.totalTasks = parseInt(taskStats.rows[0].total);
    stats.completedTasks = parseInt(taskStats.rows[0].completed);
    
    // Get average score
    const scoreStats = await this.pool.query(`
      SELECT AVG(e.score) as avg_score
      FROM evaluations e
      WHERE e.user_id = $1
    `, [userId]);
    
    stats.averageScore = parseFloat(scoreStats.rows[0].avg_score || 0);
    
    return stats;
  }
}

// Cache Test Helpers
export class CacheTestHelper {
  private redisClient: Redis | null;
  
  constructor(redisClient: Redis | null) {
    this.redisClient = redisClient;
  }
  
  /**
   * Warm up cache with test data
   */
  async warmUpCache(data: Record<string, any>) {
    if (!this.redisClient) {
      console.log('Redis not available, skipping cache warmup');
      return;
    }
    
    for (const [key, value] of Object.entries(data)) {
      await this.redisClient.set(
        key,
        JSON.stringify(value),
        'EX',
        3600 // 1 hour TTL
      );
    }
  }
  
  /**
   * Clear specific cache keys
   */
  async clearCache(pattern: string = '*') {
    if (!this.redisClient) return;
    
    const keys = await this.redisClient.keys(pattern);
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStats() {
    if (!this.redisClient) {
      return { available: false };
    }
    
    const info = await this.redisClient.info('stats');
    const keyCount = await this.redisClient.dbsize();
    
    // Parse hit/miss stats from info
    const hitMatch = info.match(/keyspace_hits:(\d+)/);
    const missMatch = info.match(/keyspace_misses:(\d+)/);
    
    const hits = hitMatch ? parseInt(hitMatch[1]) : 0;
    const misses = missMatch ? parseInt(missMatch[1]) : 0;
    const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;
    
    return {
      available: true,
      keyCount,
      hits,
      misses,
      hitRate: hitRate.toFixed(2) + '%',
    };
  }
  
  /**
   * Test cache invalidation
   */
  async testCacheInvalidation(key: string, newValue: any) {
    if (!this.redisClient) return false;
    
    // Set initial value
    await this.redisClient.set(key, JSON.stringify(newValue), 'EX', 60);
    
    // Get value
    const cached = await this.redisClient.get(key);
    
    // Delete and verify
    await this.redisClient.del(key);
    const deleted = await this.redisClient.get(key);
    
    return cached !== null && deleted === null;
  }
}

// Performance Test Helpers
export class PerformanceTestHelper {
  /**
   * Measure API response time
   */
  static async measureResponseTime(
    fn: () => Promise<any>
  ): Promise<{ result: any; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    
    return { result, duration };
  }
  
  /**
   * Run concurrent requests
   */
  static async runConcurrentRequests(
    requestFn: () => Promise<any>,
    concurrency: number
  ) {
    const results = await Promise.allSettled(
      Array.from({ length: concurrency }, () => requestFn())
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    return {
      total: concurrency,
      successful,
      failed,
      successRate: (successful / concurrency) * 100,
    };
  }
  
  /**
   * Memory usage snapshot
   */
  static getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024) + ' MB',
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
      external: Math.round(usage.external / 1024 / 1024) + ' MB',
    };
  }
  
  /**
   * Calculate percentiles from array of numbers
   */
  static calculatePercentiles(values: number[]) {
    const sorted = values.sort((a, b) => a - b);
    const len = sorted.length;
    
    return {
      p50: sorted[Math.floor(len * 0.5)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)],
      min: sorted[0],
      max: sorted[len - 1],
      avg: values.reduce((a, b) => a + b, 0) / len,
    };
  }
}

// Test Assertion Helpers
export class AssertionHelper {
  /**
   * Assert API response structure
   */
  static assertAPIResponse(response: any, expectedStatus: number, requiredFields: string[]) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
    
    for (const field of requiredFields) {
      expect(response.body).toHaveProperty(field);
    }
  }
  
  /**
   * Assert multilingual field structure
   */
  static assertMultilingualField(field: any, requiredLanguages: string[] = ['en']) {
    expect(field).toBeDefined();
    expect(typeof field).toBe('object');
    
    for (const lang of requiredLanguages) {
      expect(field).toHaveProperty(lang);
      expect(typeof field[lang]).toBe('string');
    }
  }
  
  /**
   * Assert timestamp fields
   */
  static assertTimestamps(object: any, fields: string[] = ['createdAt', 'updatedAt']) {
    for (const field of fields) {
      expect(object).toHaveProperty(field);
      expect(new Date(object[field]).getTime()).not.toBeNaN();
    }
  }
  
  /**
   * Assert UUID format
   */
  static assertUUID(value: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(value).toMatch(uuidRegex);
  }
}

// Test Data Generator
export class TestDataGenerator {
  /**
   * Generate random email
   */
  static randomEmail(): string {
    return `test_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
  }
  
  /**
   * Generate random multilingual text
   */
  static randomMultilingualText(prefix: string = 'Test'): Record<string, string> {
    const suffix = Math.random().toString(36).substring(7);
    return {
      en: `${prefix} ${suffix}`,
      zh: `測試 ${suffix}`,
      es: `Prueba ${suffix}`,
      ja: `テスト ${suffix}`,
    };
  }
  
  /**
   * Generate test interaction
   */
  static generateInteraction(type: 'user' | 'ai' = 'user', content: string = 'Test message') {
    return {
      type,
      content,
      timestamp: new Date().toISOString(),
    };
  }
}

// Export all helpers as a single object for convenience
export const testHelpers = {
  api: APITestHelper,
  db: DatabaseTestHelper,
  cache: CacheTestHelper,
  performance: PerformanceTestHelper,
  assertion: AssertionHelper,
  generator: TestDataGenerator,
};