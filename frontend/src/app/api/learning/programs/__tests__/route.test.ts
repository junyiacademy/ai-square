/**
 * Learning Programs API Route Tests
 * 測試學習程序 API
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

describe('/api/learning/programs', () => {
  // Mock repositories
  const mockProgramRepo = {
    findByUser: jest.fn(),
    create: jest.fn(),
  };

  const mockScenarioRepo = {
    findById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup repository factory mocks
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
    (getServerSession as jest.Mock).mockResolvedValue(null);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('GET - List User Programs', () => {
    const mockPrograms = [
      {
        id: 'prog-1',
        mode: 'pbl',
        scenarioId: 'scenario-1',
        userId: 'user-123',
        status: 'active',
        totalScore: 85,
        completedTaskCount: 3,
        totalTaskCount: 5,
        startedAt: '2025-01-01T10:00:00Z',
      },
      {
        id: 'prog-2',
        mode: 'assessment',
        scenarioId: 'scenario-2',
        userId: 'user-123',
        status: 'completed',
        totalScore: 95,
        completedTaskCount: 10,
        totalTaskCount: 10,
        startedAt: '2025-01-02T10:00:00Z',
        completedAt: '2025-01-02T11:00:00Z',
      },
    ];

    it('should return user programs when authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com' },
      });

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);

      const request = new NextRequest('http://localhost:3000/api/learning/programs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.programs).toHaveLength(2);
      expect(data.data.programs[0]).toMatchObject({
        id: 'prog-1',
        mode: 'pbl',
        status: 'active',
        progress: 60, // 3/5 * 100
      });
      expect(mockProgramRepo.findByUser).toHaveBeenCalledWith('user-123');
    });

    it('should filter programs by mode', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com' },
      });

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);

      const request = new NextRequest('http://localhost:3000/api/learning/programs?mode=pbl');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.programs).toHaveLength(1);
      expect(data.data.programs[0].mode).toBe('pbl');
    });

    it('should filter programs by status', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com' },
      });

      mockProgramRepo.findByUser.mockResolvedValue(mockPrograms);

      const request = new NextRequest('http://localhost:3000/api/learning/programs?status=completed');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.programs).toHaveLength(1);
      expect(data.data.programs[0].status).toBe('completed');
    });

    it('should return 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/learning/programs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle repository errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com' },
      });

      const error = new Error('Database error');
      mockProgramRepo.findByUser.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/learning/programs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch programs');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error fetching programs:',
        error
      );
    });

    it('should handle missing findByUser method', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com' },
      });

      mockProgramRepo.findByUser = undefined;

      const request = new NextRequest('http://localhost:3000/api/learning/programs');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.programs).toEqual([]);
    });
  });

  describe('POST - Create New Program', () => {
    const mockScenario = {
      id: 'scenario-1',
      mode: 'pbl',
      title: { en: 'Test Scenario' },
      description: { en: 'Test Description' },
      taskTemplates: [
        { id: 'task-1', title: { en: 'Task 1' }, type: 'question' },
        { id: 'task-2', title: { en: 'Task 2' }, type: 'chat' },
      ],
    };

    it('should create a new program successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com' },
      });

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      mockProgramRepo.create.mockResolvedValue({
        id: 'new-prog-1',
        mode: 'pbl',
        scenarioId: 'scenario-1',
        userId: 'user-123',
        status: 'pending',
        totalScore: 0,
        completedTaskCount: 0,
        totalTaskCount: 2,
      });

      const request = new NextRequest('http://localhost:3000/api/learning/programs', {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: 'scenario-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.program).toMatchObject({
        id: 'new-prog-1',
        mode: 'pbl',
        status: 'pending',
      });
      expect(mockProgramRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'pbl',
          scenarioId: 'scenario-1',
          userId: 'user-123',
          status: 'pending',
        })
      );
    });

    it('should return 400 when scenarioId is missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com' },
      });

      const request = new NextRequest('http://localhost:3000/api/learning/programs', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Scenario ID is required');
    });

    it('should return 404 when scenario not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com' },
      });

      mockScenarioRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/learning/programs', {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: 'non-existent',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Scenario not found');
    });

    it('should return 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/learning/programs', {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: 'scenario-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle invalid JSON in request body', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com' },
      });

      const request = new NextRequest('http://localhost:3000/api/learning/programs', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create program');
    });

    it('should handle repository creation errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com' },
      });

      mockScenarioRepo.findById.mockResolvedValue(mockScenario);
      const error = new Error('Database error');
      mockProgramRepo.create.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/learning/programs', {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: 'scenario-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to create program');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error creating program:',
        error
      );
    });
  });
});

/**
 * Learning Programs API Considerations:
 * 
 * 1. Authentication:
 *    - All endpoints require authentication
 *    - User ID extracted from session
 * 
 * 2. Program Creation:
 *    - Validates scenario exists
 *    - Inherits mode from scenario
 *    - Creates with pending status
 * 
 * 3. Filtering:
 *    - Supports mode filter (pbl, assessment, discovery)
 *    - Supports status filter (pending, active, completed, expired)
 * 
 * 4. Progress Calculation:
 *    - Percentage based on completed/total tasks
 *    - Separate score tracking
 * 
 * 5. Error Handling:
 *    - Graceful fallback for missing repository methods
 *    - Detailed error logging
 */