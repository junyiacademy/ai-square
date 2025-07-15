import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getAuthFromRequest } from '@/lib/auth/auth-utils';
import { getProgramRepository, getScenarioRepository, getTaskRepository } from '@/lib/implementations/gcs-v2';
import { cacheService } from '@/lib/cache/cache-service';

// Mock dependencies
jest.mock('@/lib/auth/auth-utils');
jest.mock('@/lib/implementations/gcs-v2');
jest.mock('@/lib/cache/cache-service');

describe('GET /api/discovery/my-programs', () => {
  const mockUser = { email: 'test@example.com' };

  const mockDiscoveryProgram = {
    id: 'program-1',
    scenarioId: 'scenario-1',
    userId: 'test@example.com',
    status: 'active',
    startedAt: new Date().toISOString(),
    taskIds: ['task-1'],
    currentTaskIndex: 0,
    metadata: {
      sourceType: 'discovery',
      careerType: 'ai_engineer'
    }
  };

  const mockPBLProgram = {
    id: 'program-2',
    scenarioId: 'scenario-2',
    userId: 'test@example.com',
    status: 'active',
    startedAt: new Date().toISOString(),
    taskIds: ['task-2'],
    currentTaskIndex: 0,
    metadata: {
      sourceType: 'pbl'
    }
  };

  const mockDiscoveryScenario = {
    id: 'scenario-1',
    title: 'AI Engineer',
    sourceType: 'discovery',
    sourceRef: {
      metadata: {
        careerType: 'ai_engineer'
      }
    }
  };

  const mockTask = {
    id: 'task-1',
    programId: 'program-1',
    status: 'completed'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getAuthFromRequest as jest.Mock).mockResolvedValue(mockUser);
    (cacheService.get as jest.Mock).mockResolvedValue(null);
    (cacheService.set as jest.Mock).mockResolvedValue(undefined);
    
    const mockProgramRepo = {
      findByUser: jest.fn().mockResolvedValue([mockDiscoveryProgram, mockPBLProgram])
    };
    
    const mockScenarioRepo = {
      findById: jest.fn().mockResolvedValue(mockDiscoveryScenario)
    };
    
    const mockTaskRepo = {
      findByProgram: jest.fn().mockResolvedValue([mockTask])
    };
    
    (getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
    (getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
  });

  it('should filter and return only Discovery programs', async () => {
    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('scenario-1');
    expect(data[0].sourceType).toBe('discovery');
  });

  it('should correctly identify Discovery programs by metadata.sourceType', async () => {
    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    await GET(request);

    const programRepo = getProgramRepository();
    expect(programRepo.findByUser).toHaveBeenCalledWith('test@example.com');
    
    // Verify that only Discovery scenario was fetched
    const scenarioRepo = getScenarioRepository();
    expect(scenarioRepo.findById).toHaveBeenCalledTimes(1);
    expect(scenarioRepo.findById).toHaveBeenCalledWith('scenario-1');
  });

  it('should calculate progress correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    const response = await GET(request);
    const data = await response.json();

    expect(data[0].userPrograms).toMatchObject({
      total: 1,
      active: {
        id: 'program-1',
        progress: 100, // 1 completed task out of 1 total
        completedTasks: 1,
        totalTasks: 1
      },
      completed: 0
    });
  });

  it('should return 401 if user is not authenticated', async () => {
    (getAuthFromRequest as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    const response = await GET(request);
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should also identify Discovery programs by scenarioId containing "discovery"', async () => {
    const legacyProgram = {
      ...mockDiscoveryProgram,
      scenarioId: 'discovery-ai-engineer',
      metadata: {} // No sourceType
    };
    
    const legacyScenario = {
      ...mockDiscoveryScenario,
      id: 'discovery-ai-engineer'
    };
    
    const mockProgramRepo = getProgramRepository();
    (mockProgramRepo.findByUser as jest.Mock).mockResolvedValue([legacyProgram]);
    
    const mockScenarioRepo = getScenarioRepository();
    (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(legacyScenario);

    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(1);
  });

  it('should identify Discovery programs by metadata.careerType', async () => {
    const careerTypeProgram = {
      ...mockDiscoveryProgram,
      metadata: {
        careerType: 'ai_engineer' // No sourceType but has careerType
      }
    };
    
    const mockProgramRepo = getProgramRepository();
    (mockProgramRepo.findByUser as jest.Mock).mockResolvedValue([careerTypeProgram]);

    const request = new NextRequest('http://localhost:3000/api/discovery/my-programs');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(1);
  });
});