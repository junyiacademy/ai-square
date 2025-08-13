import { NextRequest } from 'next/server';
import { Pool } from 'pg';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { testUsers } from './test-fixtures';

// Import API route handlers directly
import * as authLoginRoute from '@/app/api/auth/login/route';
import * as authRegisterRoute from '@/app/api/auth/register/route';
import * as pblScenariosRoute from '@/app/api/pbl/scenarios/route';
import * as pblScenarioDetailRoute from '@/app/api/pbl/scenarios/[id]/route';
import * as pblStartRoute from '@/app/api/pbl/scenarios/[id]/start/route';
import * as pblTaskRoute from '@/app/api/pbl/scenarios/[id]/programs/[programId]/tasks/[taskId]/route';
import * as pblEvaluateRoute from '@/app/api/pbl/tasks/[taskId]/evaluate/route';
import * as pblCompleteRoute from '@/app/api/pbl/programs/[programId]/complete/route';

/**
 * Test Helper Functions for Integration Testing
 * 
 * Provides utility functions for common test operations
 */

// API Test Helpers
export class APITestHelper {
  private baseUrl: string;
  
  constructor(baseUrl: string = (process.env.API_URL || 'http://localhost:3456')) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Create NextRequest for testing
   */
  private createRequest(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    headers?: Record<string, string>
  ): NextRequest {
    const url = `${this.baseUrl}${path}`;
    const init = {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Provide a default user cookie for routes that rely on cookies (e.g., start endpoints)
        'cookie': `user=${encodeURIComponent(JSON.stringify({ email: 'integration@test.com' }))}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    };
    
    return new NextRequest(url, init);
  }
  
  /**
   * Make authenticated API request directly to route handler
   */
  async authenticatedRequest(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    token: string,
    body?: Record<string, unknown>
  ) {
    const request = this.createRequest(method.toUpperCase(), path, body, {
      'Authorization': `Bearer ${token}`,
    });
    
    // Route to the appropriate handler based on path
    let response: Response;
    
    if (path === '/api/pbl/scenarios' && method === 'get') {
      response = await pblScenariosRoute.GET(request);
    } else if (path.startsWith('/api/pbl/scenarios/') && path.includes('/start')) {
      const id = path.split('/')[4];
      response = await pblStartRoute.POST(request, { params: Promise.resolve({ id }) });
    } else if (path.match(/^\/api\/pbl\/scenarios\/[^/]+$/) && method === 'get') {
      const id = path.split('/').pop()!;
      response = await pblScenarioDetailRoute.GET(request, { params: Promise.resolve({ id }) });
    } else if (path.includes('/tasks/') && path.includes('/evaluate')) {
      const taskId = path.match(/tasks\/([^/]+)\/evaluate/)?.[1];
      if (taskId) {
        response = await pblEvaluateRoute.POST(request, { 
          params: Promise.resolve({ taskId }) 
        });
      } else {
        throw new Error(`Invalid evaluate path: ${path}`);
      }
    } else {
      // Fallback: call running Next.js server via HTTP for any other API path
      const url = `${this.baseUrl}${path}`;
      const res = await fetch(url, {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          // Provide cookie for endpoints that rely on request.cookies
          'cookie': `user=${encodeURIComponent(JSON.stringify({ email: 'integration@test.com' }))}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return {
        status: res.status,
        body: await res.json().catch(() => ({})),
        headers: Object.fromEntries(res.headers.entries()) as Record<string, string>,
      };
    }
    
    const responseBody = await response.json();
    
    return {
      status: response.status,
      body: responseBody,
      headers: Object.fromEntries(response.headers.entries()) as Record<string, string>,
    };
  }
  
  /**
   * Login and get token
   */
  async login(email: string, password: string): Promise<string> {
    const request = this.createRequest('POST', '/api/auth/login', { email, password });
    const response = await authLoginRoute.POST(request);
    
    if (response.status !== 200) {
      const body = await response.json();
      throw new Error(`Login failed: ${body.error}`);
    }
    
    const body = await response.json();
    return body.token;
  }
  
  /**
   * Register new user
   */
  async register(email: string, password: string, name: string) {
    // Use HTTP call to ensure Next.js runtime (cookies handling) is consistent
    const url = `${this.baseUrl}/api/auth/register`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        name,
        preferredLanguage: 'en',
        acceptTerms: true,
      }),
    });
    const body = await res.json().catch(() => ({}));
    return {
      status: res.status,
      body,
      headers: Object.fromEntries(res.headers.entries()) as Record<string, string>,
    };
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
   * Submit task response via evaluate endpoint
   */
  async submitTaskResponse(
    programId: string,
    taskId: string,
    response: string,
    token: string
  ) {
    return this.authenticatedRequest(
      'post',
      `/api/pbl/tasks/${taskId}/evaluate`,
      token,
      { response, programId }
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
  public pool: Pool;
  
  constructor(pool: Pool) {
    this.pool = pool;
  }
  
  /**
   * Create test user directly in database
   */
  async createUser(userData: typeof testUsers.student) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const userId = crypto.randomUUID();
    
    try {
      const result = await this.pool.query(
        `INSERT INTO users (id, email, password_hash, name, role, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          userId,
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
      // If duplicate email, fetch existing user and return it
      try {
        const existing = await this.pool.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [userData.email]);
        if (existing.rows[0]) {
          return existing.rows[0];
        }
      } catch {}
      // Fallback mock (no DB impact)
      return {
        id: userId,
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