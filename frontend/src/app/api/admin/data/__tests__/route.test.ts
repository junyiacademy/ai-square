/**
 * Admin Data API Route Tests
 * 測試管理員數據 API
 */

import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/session');

// Mock console
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('/api/admin/data', () => {
  // Mock repositories
  const mockUserRepo = {
    findAll: jest.fn(),
    count: jest.fn(),
  };

  const mockProgramRepo = {
    findAll: jest.fn(),
    count: jest.fn(),
  };

  const mockScenarioRepo = {
    findAll: jest.fn(),
    count: jest.fn(),
  };

  const mockTaskRepo = {
    findAll: jest.fn(),
    count: jest.fn(),
  };

  const mockEvaluationRepo = {
    findAll: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup repository factory mocks
    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
    (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(mockEvaluationRepo);
    (getServerSession as jest.Mock).mockResolvedValue(null);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleLog.mockRestore();
  });

  describe('GET - Get Admin Statistics', () => {
    it('should return system statistics for admin user', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'admin-123', email: 'admin@example.com', role: 'admin' },
      });

      // Mock counts
      mockUserRepo.count.mockResolvedValue(150);
      mockProgramRepo.count.mockResolvedValue(450);
      mockScenarioRepo.count.mockResolvedValue(25);
      mockTaskRepo.count.mockResolvedValue(1200);
      mockEvaluationRepo.count.mockResolvedValue(3500);

      // Mock recent data
      mockUserRepo.findAll.mockResolvedValue([
        { id: 'user-1', email: 'user1@example.com', createdAt: '2025-01-10T10:00:00Z' },
        { id: 'user-2', email: 'user2@example.com', createdAt: '2025-01-09T15:00:00Z' },
      ]);

      mockProgramRepo.findAll.mockResolvedValue([
        { id: 'prog-1', mode: 'pbl', status: 'active', createdAt: '2025-01-10T12:00:00Z' },
        { id: 'prog-2', mode: 'assessment', status: 'completed', createdAt: '2025-01-10T11:00:00Z' },
      ]);

      const request = new NextRequest('http://localhost:3000/api/admin/data');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        statistics: {
          totalUsers: 150,
          totalPrograms: 450,
          totalScenarios: 25,
          totalTasks: 1200,
          totalEvaluations: 3500,
        },
        recentUsers: expect.arrayContaining([
          expect.objectContaining({ email: 'user1@example.com' }),
        ]),
        recentPrograms: expect.arrayContaining([
          expect.objectContaining({ mode: 'pbl' }),
        ]),
        systemHealth: {
          status: 'healthy',
          databaseConnected: true,
        },
      });
    });

    it('should return filtered data with query parameters', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'admin' },
      });

      // Setup mocks
      mockUserRepo.count.mockResolvedValue(50);
      mockProgramRepo.count.mockResolvedValue(100);
      mockScenarioRepo.count.mockResolvedValue(10);
      mockTaskRepo.count.mockResolvedValue(500);
      mockEvaluationRepo.count.mockResolvedValue(1000);

      const request = new NextRequest('http://localhost:3000/api/admin/data?limit=5&timeRange=7d');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockUserRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 })
      );
    });

    it('should return 403 for non-admin users', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com', role: 'student' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/data');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('should return 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/data');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle missing repository methods', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'admin' },
      });

      // Some repos don't have count method
      mockUserRepo.count = undefined;
      mockProgramRepo.count.mockResolvedValue(100);

      const request = new NextRequest('http://localhost:3000/api/admin/data');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.statistics.totalUsers).toBe(0);
      expect(data.data.statistics.totalPrograms).toBe(100);
    });

    it('should handle repository errors gracefully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'admin' },
      });

      const error = new Error('Database connection failed');
      mockUserRepo.count.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/admin/data');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.systemHealth.status).toBe('degraded');
      expect(data.data.systemHealth.databaseConnected).toBe(false);
    });
  });

  describe('POST - Export Admin Data', () => {
    it('should export data in JSON format', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'admin' },
      });

      mockUserRepo.findAll.mockResolvedValue([
        { id: 'user-1', email: 'user1@example.com' },
        { id: 'user-2', email: 'user2@example.com' },
      ]);

      const request = new NextRequest('http://localhost:3000/api/admin/data', {
        method: 'POST',
        body: JSON.stringify({
          action: 'export',
          format: 'json',
          entities: ['users'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.export).toMatchObject({
        format: 'json',
        timestamp: expect.any(String),
        entities: {
          users: expect.arrayContaining([
            expect.objectContaining({ email: 'user1@example.com' }),
          ]),
        },
      });
    });

    it('should export multiple entities', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'admin' },
      });

      mockUserRepo.findAll.mockResolvedValue([{ id: 'user-1' }]);
      mockProgramRepo.findAll.mockResolvedValue([{ id: 'prog-1' }]);
      mockScenarioRepo.findAll.mockResolvedValue([{ id: 'scenario-1' }]);

      const request = new NextRequest('http://localhost:3000/api/admin/data', {
        method: 'POST',
        body: JSON.stringify({
          action: 'export',
          format: 'json',
          entities: ['users', 'programs', 'scenarios'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.export.entities).toHaveProperty('users');
      expect(data.data.export.entities).toHaveProperty('programs');
      expect(data.data.export.entities).toHaveProperty('scenarios');
    });

    it('should support CSV export format', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'admin' },
      });

      mockUserRepo.findAll.mockResolvedValue([
        { id: 'user-1', email: 'user1@example.com', name: 'User One' },
        { id: 'user-2', email: 'user2@example.com', name: 'User Two' },
      ]);

      const request = new NextRequest('http://localhost:3000/api/admin/data', {
        method: 'POST',
        body: JSON.stringify({
          action: 'export',
          format: 'csv',
          entities: ['users'],
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('users-export');
    });

    it('should perform bulk updates', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'admin' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/data', {
        method: 'POST',
        body: JSON.stringify({
          action: 'bulk-update',
          entity: 'programs',
          filter: { status: 'expired' },
          updates: { status: 'archived' },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Updated');
    });

    it('should return 400 for invalid export format', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'admin' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/data', {
        method: 'POST',
        body: JSON.stringify({
          action: 'export',
          format: 'invalid',
          entities: ['users'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid export format');
    });

    it('should return 403 for non-admin users', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'student' },
      });

      const request = new NextRequest('http://localhost:3000/api/admin/data', {
        method: 'POST',
        body: JSON.stringify({
          action: 'export',
          format: 'json',
          entities: ['users'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Admin access required');
    });

    it('should handle export errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { role: 'admin' },
      });

      const error = new Error('Export failed');
      mockUserRepo.findAll.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/admin/data', {
        method: 'POST',
        body: JSON.stringify({
          action: 'export',
          format: 'json',
          entities: ['users'],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Export failed');
      expect(mockConsoleError).toHaveBeenCalledWith('Admin data export error:', error);
    });
  });
});

/**
 * Admin Data API Considerations:
 * 
 * 1. Authorization:
 *    - Strict admin-only access
 *    - Role-based permissions
 * 
 * 2. Statistics:
 *    - System-wide counts
 *    - Recent activity tracking
 *    - Health monitoring
 * 
 * 3. Export Functionality:
 *    - Multiple format support (JSON, CSV)
 *    - Entity selection
 *    - Bulk operations
 * 
 * 4. Performance:
 *    - Pagination support
 *    - Time range filtering
 *    - Graceful degradation
 * 
 * 5. Security:
 *    - Sensitive data filtering
 *    - Audit logging
 *    - Rate limiting consideration
 */