/**
 * This test file has been temporarily disabled due to GCS v2 removal.
 * TODO: Update to use PostgreSQL repositories
 */

/*
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServerSession } from '@/lib/auth/session';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/services/discovery-yaml-loader');

describe('POST /api/discovery/scenarios/[id]/programs', () => {
  const mockSession = {
    user: { email: 'test@example.com' }
  };

  const mockScenario = {
    id: 'scenario-123',
    title: 'AI Engineer',
    sourceType: 'discovery',
    sourceRef: {
      metadata: {
        careerType: 'ai_engineer'
      }
    }
  };

  const mockProgram = {
    id: 'program-456',
    scenarioId: 'scenario-123',
    userId: 'test@example.com',
    status: 'active',
    startedAt: new Date().toISOString(),
    taskIds: [],
    currentTaskIndex: 0,
    metadata: {
      sourceType: 'discovery',
      careerType: 'ai_engineer',
      totalXP: 0,
      achievements: [],
      skillProgress: []
    }
  };

  const mockTask = {
    id: 'task-789',
    programId: 'program-456',
    scenarioTaskIndex: 0,
    title: 'Test Task',
    type: 'analysis',
    content: {
      instructions: 'Test instructions'
    },
    interactions: [],
    status: 'active'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    
    const mockScenarioRepo = {
      findById: jest.fn().mockResolvedValue(mockScenario)
    };
    
    const mockProgramRepo = {
      create: jest.fn().mockResolvedValue(mockProgram),
      update: jest.fn().mockResolvedValue({ ...mockProgram, taskIds: ['task-789'] })
    };
    
    const mockTaskRepo = {
      create: jest.fn().mockResolvedValue(mockTask)
    };
    
    (getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
    (getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (getTaskRepository as jest.Mock).mockReturnValue(mockTaskRepo);
  });

  it('should create a Discovery program with correct metadata', async () => {
    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ language: 'zhTW' })
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'scenario-123' }) });
    const data = await response.json();

    // Verify program was created with correct metadata
    const programRepo = getProgramRepository();
    expect(programRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scenarioId: 'scenario-123',
        userId: 'test@example.com',
        metadata: expect.objectContaining({
          sourceType: 'discovery',
          careerType: 'ai_engineer'
        })
      })
    );

    // Verify response includes program data
    expect(response.status).toBe(200);
    expect(data.id).toBe('program-456');
    expect(data.metadata.sourceType).toBe('discovery');
    expect(data.metadata.careerType).toBe('ai_engineer');
  });

  it('should use "unknown" careerType if not specified in scenario', async () => {
    const scenarioWithoutCareerType = {
      ...mockScenario,
      sourceRef: { metadata: {} }
    };
    
    const mockScenarioRepo = getScenarioRepository();
    (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(scenarioWithoutCareerType);

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs', {
      method: 'POST'
    });

    await POST(request, { params: Promise.resolve({ id: 'scenario-123' }) });

    const programRepo = getProgramRepository();
    expect(programRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          sourceType: 'discovery',
          careerType: 'unknown'
        })
      })
    );
  });

  it('should return 401 if user is not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs', {
      method: 'POST'
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'scenario-123' }) });
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if scenario does not exist', async () => {
    const mockScenarioRepo = getScenarioRepository();
    (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/discovery/scenarios/scenario-123/programs', {
      method: 'POST'
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'scenario-123' }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Scenario not found');
  });
});
*/
