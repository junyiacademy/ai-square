/**
 * Tests for admin database initialization route
 * Following TDD approach
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { initializeDatabase } from '@/lib/db/init';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/db/init');

// Mock console
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('/api/admin/init-db', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('POST /api/admin/init-db', () => {
    it('should initialize database successfully for admin users', async () => {
      // Mock admin session
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          email: 'admin@example.com',
          role: 'admin',
        },
      });

      // Mock successful database initialization
      (initializeDatabase as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Database initialized successfully',
        tables: ['users', 'programs', 'scenarios', 'tasks', 'evaluations'],
      });

      const request = new NextRequest('http://localhost/api/admin/init-db', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('message', 'Database initialized successfully');
      expect(data).toHaveProperty('tables');
      expect(data.tables).toContain('users');
      expect(data.tables).toContain('scenarios');
    });

    it('should reject non-admin users', async () => {
      // Mock non-admin session
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          email: 'student@example.com',
          role: 'student',
        },
      });

      const request = new NextRequest('http://localhost/api/admin/init-db', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toHaveProperty('error', 'Admin access required');
      expect(initializeDatabase).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated requests', async () => {
      // Mock no session
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/init-db', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty('error', 'Authentication required');
      expect(initializeDatabase).not.toHaveBeenCalled();
    });

    it('should handle database initialization errors', async () => {
      // Mock admin session
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          email: 'admin@example.com',
          role: 'admin',
        },
      });

      // Mock database error
      const dbError = new Error('Failed to create tables');
      (initializeDatabase as jest.Mock).mockRejectedValue(dbError);

      const request = new NextRequest('http://localhost/api/admin/init-db', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toHaveProperty('error', 'Failed to initialize database');
      expect(data).toHaveProperty('details', 'Failed to create tables');
      expect(mockConsoleError).toHaveBeenCalledWith('Database initialization error:', dbError);
    });

    it('should handle partial initialization success', async () => {
      // Mock admin session
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          email: 'admin@example.com',
          role: 'admin',
        },
      });

      // Mock partial success
      (initializeDatabase as jest.Mock).mockResolvedValue({
        success: false,
        message: 'Partial initialization',
        tables: ['users', 'programs'],
        errors: ['Failed to create scenarios table'],
      });

      const request = new NextRequest('http://localhost/api/admin/init-db', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('message', 'Partial initialization');
      expect(data).toHaveProperty('tables');
      expect(data).toHaveProperty('errors');
      expect(data.errors).toContain('Failed to create scenarios table');
    });

    it('should include initialization options when provided', async () => {
      // Mock admin session
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {
          email: 'admin@example.com',
          role: 'admin',
        },
      });

      // Mock successful initialization
      (initializeDatabase as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Database initialized with seed data',
        tables: ['users', 'programs', 'scenarios', 'tasks', 'evaluations'],
        seedData: true,
      });

      const request = new NextRequest('http://localhost/api/admin/init-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seedData: true,
          dropExisting: false,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('success', true);
      expect(initializeDatabase).toHaveBeenCalledWith({
        seedData: true,
        dropExisting: false,
      });
    });
  });
});

/**
 * Admin Database Initialization API Considerations:
 * 
 * 1. Authentication:
 *    - Requires admin role
 *    - Checks session validity
 * 
 * 2. Operations:
 *    - Create database tables
 *    - Optional seed data
 *    - Optional drop existing
 * 
 * 3. Safety:
 *    - Admin-only access
 *    - Detailed error reporting
 *    - Partial success handling
 * 
 * 4. Options:
 *    - seedData: boolean
 *    - dropExisting: boolean
 */