import { POST } from '../route';
import { NextRequest } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Mock the database pool
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    end: jest.fn(),
  };
  return { Pool: jest.fn(() => mockPool) };
});

jest.mock('bcryptjs');

describe('/api/admin/seed-users', () => {
  let mockPool: any;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      ADMIN_API_KEY: 'test-admin-key',
      DB_NAME: 'test_db',
      DB_USER: 'test_user',
      DB_PASSWORD: 'test_pass',
    };
    mockPool = new Pool();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Database Schema Compatibility', () => {
    it('should handle INSERT with all required fields including timestamps', async () => {
      // Mock existing user check
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // Mock successful insert
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const request = new NextRequest('http://localhost/api/admin/seed-users', {
        method: 'POST',
        headers: {
          'X-Admin-Key': 'test-admin-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          users: [
            { email: 'test@example.com', password: 'test123', role: 'student' }
          ]
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Check that the INSERT query includes all required fields
      const insertCall = mockPool.query.mock.calls[1];
      expect(insertCall[0]).toContain('INSERT INTO users');
      expect(insertCall[0]).toContain('id');
      expect(insertCall[0]).toContain('created_at');
      expect(insertCall[0]).toContain('updated_at');
      expect(insertCall[0]).toContain('gen_random_uuid()');
      expect(insertCall[0]).toContain('CURRENT_TIMESTAMP');
    });

    it('should handle database error for missing required fields', async () => {
      // Mock existing user check
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // Mock insert failure due to missing field
      mockPool.query.mockRejectedValueOnce(
        new Error('null value in column "updated_at" of relation "users" violates not-null constraint')
      );

      const request = new NextRequest('http://localhost/api/admin/seed-users', {
        method: 'POST',
        headers: {
          'X-Admin-Key': 'test-admin-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          users: [
            { email: 'test@example.com', password: 'test123', role: 'student' }
          ]
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.results[0].status).toBe('failed');
      expect(data.results[0].error).toContain('null value in column "updated_at"');
    });

    it('should verify gen_random_uuid() is used for ID generation', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const request = new NextRequest('http://localhost/api/admin/seed-users', {
        method: 'POST',
        headers: {
          'X-Admin-Key': 'test-admin-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          users: [
            { email: 'test@example.com', password: 'test123', role: 'student' }
          ]
        }),
      });

      await POST(request);

      const insertQuery = mockPool.query.mock.calls[1][0];
      expect(insertQuery).toContain('gen_random_uuid()');
    });
  });

  describe('Authorization', () => {
    it('should reject request without admin key', async () => {
      const request = new NextRequest('http://localhost/api/admin/seed-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ users: [] }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should reject request with invalid admin key', async () => {
      const request = new NextRequest('http://localhost/api/admin/seed-users', {
        method: 'POST',
        headers: {
          'X-Admin-Key': 'wrong-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ users: [] }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });

  describe('User Creation', () => {
    it('should update existing users', async () => {
      // Mock existing user
      mockPool.query.mockResolvedValueOnce({ 
        rows: [{ id: 'existing-user-id' }] 
      });
      
      // Mock successful update
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const request = new NextRequest('http://localhost/api/admin/seed-users', {
        method: 'POST',
        headers: {
          'X-Admin-Key': 'test-admin-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          users: [
            { email: 'existing@example.com', password: 'new123', role: 'teacher' }
          ]
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results[0].status).toBe('updated');
      
      // Check UPDATE query
      const updateCall = mockPool.query.mock.calls[1];
      expect(updateCall[0]).toContain('UPDATE users');
      expect(updateCall[0]).toContain('updated_at = CURRENT_TIMESTAMP');
    });

    it('should handle multiple users with mixed results', async () => {
      // First user - doesn't exist, create succeeds
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      
      // Second user - exists, update succeeds
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'user-2' }] });
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
      
      // Third user - doesn't exist, create fails
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/admin/seed-users', {
        method: 'POST',
        headers: {
          'X-Admin-Key': 'test-admin-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          users: [
            { email: 'new@example.com', password: 'pass1', role: 'student' },
            { email: 'existing@example.com', password: 'pass2', role: 'teacher' },
            { email: 'failed@example.com', password: 'pass3', role: 'admin' },
          ]
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Created: 1, Updated: 1, Failed: 1');
    });
  });
});