import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

// Mock the repository factory
jest.mock('@/lib/repositories/base/repository-factory');

describe('/api/programs/[id] Route', () => {
  const mockProgram = {
    id: 'test-program-id',
    userId: 'test-user-id',
    scenarioId: 'test-scenario-id',
    status: 'active',
    currentTaskIndex: 0,
    completedTasks: [],
    totalScore: 0
  };

  const mockTasks = [
    { id: 'task-1', programId: 'test-program-id', title: 'Task 1' },
    { id: 'task-2', programId: 'test-program-id', title: 'Task 2' }
  ];

  const mockEvaluations = [
    { id: 'eval-1', programId: 'test-program-id', score: 85 }
  ];

  let mockProgramRepo: any;
  let mockTaskRepo: any;
  let mockEvaluationRepo: any;
  let mockUserRepo: any;
  let mockScenarioRepo: any;

  beforeEach(() => {
    mockProgramRepo = {
      findById: jest.fn(),
      update: jest.fn()
    };

    mockTaskRepo = {
      findByProgram: jest.fn()
    };

    mockEvaluationRepo = {
      findByProgram: jest.fn()
    };

    mockUserRepo = {
      update: jest.fn()
    };

    mockScenarioRepo = {
      findById: jest.fn()
    };

    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
    (repositoryFactory.getEvaluationRepository as jest.Mock).mockReturnValue(mockEvaluationRepo);
    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
  });

  describe('GET /api/programs/[id]', () => {
    it('should handle async params correctly in Next.js 15', async () => {
      mockProgramRepo.findById.mockResolvedValue(mockProgram);
      mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);
      mockEvaluationRepo.findByProgram.mockResolvedValue(mockEvaluations);

      const request = new NextRequest('http://localhost:3000/api/programs/test-program-id');
      const params = Promise.resolve({ id: 'test-program-id' });

      const response = await GET(request, { params });
      const data = await response.json();

      expect(mockProgramRepo.findById).toHaveBeenCalledWith('test-program-id');
      expect(mockTaskRepo.findByProgram).toHaveBeenCalledWith('test-program-id');
      expect(mockEvaluationRepo.findByProgram).toHaveBeenCalledWith('test-program-id');
      
      expect(data).toEqual({
        ...mockProgram,
        tasks: mockTasks,
        evaluations: mockEvaluations
      });
    });

    it('should return 404 when program not found', async () => {
      mockProgramRepo.findById.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/programs/nonexistent');
      const params = Promise.resolve({ id: 'nonexistent' });

      const response = await GET(request, { params });
      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data).toEqual({ error: 'Program not found' });
    });
  });

  describe('PATCH /api/programs/[id]', () => {
    it('should handle async params and update program', async () => {
      const updateData = { status: 'completed' };
      const endTime = new Date();
      const updatedProgram = { ...mockProgram, ...updateData, endTime: endTime.toISOString() };
      
      mockProgramRepo.update.mockResolvedValue(updatedProgram);
      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue({ xpRewards: { completion: 100 } });

      const request = new NextRequest('http://localhost:3000/api/programs/test-program-id', {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });
      const params = Promise.resolve({ id: 'test-program-id' });

      const response = await PATCH(request, { params });
      const data = await response.json();

      expect(mockProgramRepo.update).toHaveBeenCalledWith('test-program-id', expect.objectContaining({
        status: 'completed',
        endTime: expect.any(Date)
      }));
      
      expect(data).toEqual(updatedProgram);
    });

    it('should update user XP when program is completed', async () => {
      const updateData = { status: 'completed' };
      const updatedProgram = { ...mockProgram, ...updateData };
      
      mockProgramRepo.update.mockResolvedValue(updatedProgram);
      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue({ xpRewards: { completion: 150 } });

      const request = new NextRequest('http://localhost:3000/api/programs/test-program-id', {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });
      const params = Promise.resolve({ id: 'test-program-id' });

      await PATCH(request, { params });

      expect(mockUserRepo.update).toHaveBeenCalledWith('test-user-id', {
        totalXp: 150
      });
    });
  });

  describe('DELETE /api/programs/[id]', () => {
    it('should handle async params and mark program as abandoned', async () => {
      mockProgramRepo.update.mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/programs/test-program-id', {
        method: 'DELETE'
      });
      const params = Promise.resolve({ id: 'test-program-id' });

      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(mockProgramRepo.update).toHaveBeenCalledWith('test-program-id', { status: 'abandoned' });
      expect(data).toEqual({ message: 'Program marked as abandoned' });
    });
  });
});