/**
 * Admin Create DB API Route Tests
 * 測試管理員創建資料庫 API
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { pool } from '@/lib/db/postgres';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/db/postgres', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

// Mock console
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('/api/admin/create-db', () => {
  const mockPoolQuery = pool.query as jest.MockedFunction<typeof pool.query>;
  const mockPoolConnect = pool.connect as jest.MockedFunction<typeof pool.connect>;

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(null);
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('POST - Create Database Tables', () => {
    it('should create all tables successfully for admin user', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'admin-123', email: 'admin@example.com', role: 'admin' },
      });

      // Mock successful queries
      mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/create-db', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          tables: ['all'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Database tables created successfully');
      
      // Should create extension
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
      );
      
      // Should create users table
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS users')
      );
      
      // Should create scenarios table
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS scenarios')
      );
      
      // Should create programs table
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS programs')
      );
      
      // Should create tasks table
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS tasks')
      );
      
      // Should create evaluations table
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS evaluations')
      );
    });

    it('should create specific tables only', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'admin' },
      });

      mockPoolQuery.mockResolvedValue({ rows: [] } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/create-db', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          tables: ['users', 'scenarios'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tablesCreated).toEqual(['users', 'scenarios']);
      
      // Should only create specified tables
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS users')
      );
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS scenarios')
      );
      
      // Should not create other tables
      expect(mockPoolQuery).not.toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS programs')
      );
    });

    it('should drop and recreate tables when force option is true', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'admin' },
      });

      mockPoolQuery.mockResolvedValue({ rows: [] } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/create-db', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          tables: ['users'],
          force: true,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Should drop table first
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('DROP TABLE IF EXISTS users CASCADE')
      );
      
      // Then create table
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS users')
      );
      
      expect(data.message).toContain('dropped and recreated');
    });

    it('should seed initial data when requested', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'admin' },
      });

      mockPoolQuery.mockResolvedValue({ rows: [] } as any);

      const request = new NextRequest('http://localhost:3000/api/admin/create-db', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          tables: ['all'],
          seedData: true,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.dataSeeded).toBe(true);
      
      // Should insert admin user
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['admin@aisquare.com'])
      );
    });

    it('should check database status', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'admin' },
      });

      // Mock table existence check
      mockPoolQuery
        .mockResolvedValueOnce({ rows: [{ exists: true }] } as any) // users
        .mockResolvedValueOnce({ rows: [{ exists: true }] } as any) // scenarios
        .mockResolvedValueOnce({ rows: [{ exists: false }] } as any) // programs
        .mockResolvedValueOnce({ rows: [{ exists: true }] } as any) // tasks
        .mockResolvedValueOnce({ rows: [{ exists: true }] } as any); // evaluations

      const request = new NextRequest('http://localhost:3000/api/admin/create-db', {
        method: 'POST',
        body: JSON.stringify({
          action: 'status',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toMatchObject({
        users: true,
        scenarios: true,
        programs: false,
        tasks: true,
        evaluations: true,
      });
      expect(data.message).toBe('Database status retrieved');
    });

    it('should return 403 for non-admin users', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com', role: 'student' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/create-db', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          tables: ['all'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
      expect(mockPoolQuery).not.toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/create-db', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          tables: ['all'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle database connection errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'admin' },
      });

      const dbError = new Error('Connection refused');
      mockPoolQuery.mockRejectedValue(dbError);

      const request = new NextRequest('http://localhost:3000/api/admin/create-db', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          tables: ['users'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database operation failed');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Database creation error:',
        dbError
      );
    });

    it('should validate table names', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'admin' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/create-db', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          tables: ['invalid_table', 'users'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid table names provided');
    });

    it('should handle transaction rollback on error', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'admin' },
      });

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockPoolConnect.mockResolvedValue(mockClient as any);
      
      // First query succeeds, second fails
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('Constraint violation'));

      const request = new NextRequest('http://localhost:3000/api/admin/create-db', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          tables: ['all'],
          useTransaction: true,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('rolled back');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return 400 for invalid action', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'admin' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/create-db', {
        method: 'POST',
        body: JSON.stringify({
          action: 'invalid',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action');
    });
  });
});

/**
 * Admin Create DB API Considerations:
 * 
 * 1. Security:
 *    - Admin-only access
 *    - Validate table names
 *    - Prevent SQL injection
 * 
 * 2. Database Operations:
 *    - Create tables
 *    - Drop and recreate
 *    - Check table existence
 *    - Seed initial data
 * 
 * 3. Transaction Support:
 *    - All or nothing creation
 *    - Rollback on error
 *    - Proper connection handling
 * 
 * 4. Table Management:
 *    - Create specific tables
 *    - Create all tables
 *    - Force recreation
 *    - Status checking
 * 
 * 5. Error Handling:
 *    - Connection failures
 *    - Constraint violations
 *    - Permission issues
 */