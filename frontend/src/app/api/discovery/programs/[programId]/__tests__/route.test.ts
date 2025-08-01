/**
 * Discovery Program API Route Tests
 * 測試探索程序 API
 */

import { GET, PUT, DELETE } from '../route';
import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/session');

// Mock console
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

describe('/api/discovery/programs/[programId]', () => {
  // Mock repositories
  const mockProgramRepo = {
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockTaskRepo = {
    findByProgram: jest.fn(),
  };

  const mockScenarioRepo = {
    findById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup repository factory mocks
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
    (getServerSession as jest.Mock).mockResolvedValue(null);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('GET - Get Discovery Program Details', () => {
    const mockProgram = {
      id: 'prog-123',
      mode: 'discovery',
      scenarioId: 'scenario-456',
      userId: 'user-789',
      status: 'active',
      totalScore: 75,
      completedTaskCount: 2,
      totalTaskCount: 4,
      startedAt: '2025-01-01T10:00:00Z',
      discoveryData: {
        careerType: 'data-scientist',
        interests: ['machine-learning', 'statistics'],
      },
    };

    const mockTasks = [
      {
        id: 'task-1',
        programId: 'prog-123',
        title: { en: 'Explore Career Path' },
        type: 'question',
        status: 'completed',
        score: 90,
      },
      {
        id: 'task-2',
        programId: 'prog-123',
        title: { en: 'Build Portfolio' },
        type: 'creation',
        status: 'completed',
        score: 60,
      },
      {
        id: 'task-3',
        programId: 'prog-123',
        title: { en: 'Interview Prep' },
        type: 'chat',
        status: 'active',
      },
    ];

    const mockScenario = {
      id: 'scenario-456',
      title: { en: 'Data Science Career Path' },
      description: { en: 'Explore data science careers' },
      difficulty: 'intermediate',
    };

    it('should return program details for authorized user', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);
      mockScenarioRepo.findById.mockResolvedValue(mockScenario);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/prog-123');
      const response = await GET(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.program).toMatchObject({
        id: 'prog-123',
        mode: 'discovery',
        status: 'active',
        progress: 50, // 2/4 * 100
        careerType: 'data-scientist',
        interests: ['machine-learning', 'statistics'],
      });
      expect(data.data.tasks).toHaveLength(3);
      expect(data.data.scenario).toMatchObject({
        title: 'Data Science Career Path',
        description: 'Explore data science careers',
      });
    });

    it('should return 404 when program not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/non-existent');
      const response = await GET(request, { params: Promise.resolve({ programId: 'non-existent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Program not found');
    });

    it('should return 403 when user is not program owner', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'other-user', email: 'other@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/prog-123');
      const response = await GET(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should return 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/prog-123');
      const response = await GET(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('PUT - Update Discovery Program', () => {
    const mockProgram = {
      id: 'prog-123',
      mode: 'discovery',
      userId: 'user-789',
      status: 'active',
      discoveryData: {
        careerType: 'data-scientist',
      },
    };

    it('should update program successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockProgramRepo.update.mockResolvedValue({
        ...mockProgram,
        status: 'completed',
        completedAt: '2025-01-10T15:00:00Z',
      });

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/prog-123', {
        method: 'PUT',
        body: JSON.stringify({
          status: 'completed',
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.program.status).toBe('completed');
      expect(mockProgramRepo.update).toHaveBeenCalledWith(
        'prog-123',
        expect.objectContaining({
          status: 'completed',
          completedAt: expect.any(String),
        })
      );
    });

    it('should update discovery-specific data', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockProgramRepo.update.mockResolvedValue({
        ...mockProgram,
        discoveryData: {
          careerType: 'ai-engineer',
          interests: ['nlp', 'computer-vision'],
        },
      });

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/prog-123', {
        method: 'PUT',
        body: JSON.stringify({
          discoveryData: {
            careerType: 'ai-engineer',
            interests: ['nlp', 'computer-vision'],
          },
        }),
      });

      const response = await PUT(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.program.discoveryData).toMatchObject({
        careerType: 'ai-engineer',
        interests: ['nlp', 'computer-vision'],
      });
    });

    it('should return 403 when user is not program owner', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'other-user', email: 'other@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/prog-123', {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
      expect(mockProgramRepo.update).not.toHaveBeenCalled();
    });

    it('should handle missing update method', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockProgramRepo.update = undefined;

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/prog-123', {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Update not supported');
    });
  });

  describe('DELETE - Delete Discovery Program', () => {
    const mockProgram = {
      id: 'prog-123',
      mode: 'discovery',
      userId: 'user-789',
      status: 'active',
    };

    it('should delete program successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockProgramRepo.delete.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/prog-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Program deleted successfully');
      expect(mockProgramRepo.delete).toHaveBeenCalledWith('prog-123');
    });

    it('should return 403 when user is not program owner', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'other-user', email: 'other@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/prog-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
      expect(mockProgramRepo.delete).not.toHaveBeenCalled();
    });

    it('should handle missing delete method', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockProgramRepo.delete = undefined;

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/prog-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Delete not supported');
    });

    it('should handle repository errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'user@example.com' },
      });

      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      const error = new Error('Database error');
      mockProgramRepo.delete.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/discovery/programs/prog-123', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ programId: 'prog-123' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to delete program');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error deleting discovery program:',
        error
      );
    });
  });
});

/**
 * Discovery Program API Considerations:
 * 
 * 1. Authorization:
 *    - Must verify user owns the program
 *    - Returns 403 for unauthorized access
 * 
 * 2. Discovery-specific Data:
 *    - Career type tracking
 *    - Interest areas
 *    - Skills assessment
 * 
 * 3. Program Lifecycle:
 *    - Supports status updates
 *    - Tracks completion timestamps
 *    - Preserves historical data
 * 
 * 4. Related Data:
 *    - Loads tasks for program
 *    - Includes scenario details
 *    - Calculates progress
 * 
 * 5. Error Handling:
 *    - Graceful handling of missing methods
 *    - Detailed error messages
 */