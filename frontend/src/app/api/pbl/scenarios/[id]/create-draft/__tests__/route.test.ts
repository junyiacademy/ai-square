import { POST } from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { NextRequest } from 'next/server';
import { promises as fs } from 'fs';
import yaml from 'js-yaml';

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getProgramRepository: jest.fn(),
    getUserRepository: jest.fn(),
    getTaskRepository: jest.fn(),
    getScenarioRepository: jest.fn(),
    getEvaluationRepository: jest.fn(),
    getContentRepository: jest.fn(),
    getAchievementRepository: jest.fn()
  }
}));
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));
jest.mock('js-yaml');

describe('POST /api/pbl/scenarios/[id]/create-draft', () => {
  const mockProgramRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    findByUser: jest.fn(),
    update: jest.fn()
  };

  const mockUserRepo = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (repositoryFactory.getProgramRepository as jest.Mock).mockReturnValue(mockProgramRepo);
    (repositoryFactory.getUserRepository as jest.Mock).mockReturnValue(mockUserRepo);
  });

  it('should create draft program for authenticated user', async () => {
    const mockScenarioData = {
      scenario_info: {
        id: 'test-scenario',
        title: 'Test Scenario',
        description: 'Test Description',
        target_domains: ['domain1'],
        difficulty: 'beginner',
        estimated_duration: 60,
        tasks: []
      },
      tasks: [
        {
          id: 'task1',
          title: 'Task 1',
          description: 'Task Description',
          category: 'research',
          instructions: ['Do this'],
          expected_outcome: 'Result',
          time_limit: 30
        }
      ]
    };

    (fs.readFile as jest.Mock).mockResolvedValue(yaml.dump(mockScenarioData));
    (yaml.load as jest.Mock).mockReturnValue(mockScenarioData);

    const mockProgram = {
      id: 'program-123',
      scenarioId: 'test-scenario',
      userId: 'test@example.com',
      status: 'active'
    };
    mockProgramRepo.create.mockResolvedValue(mockProgram);

    const request = new NextRequest('http://localhost:3000/api/pbl/scenarios/test-scenario/create-draft', {
      method: 'POST'
    });
    
    // Mock the cookies.get method
    request.cookies.get = jest.fn().mockReturnValue({
      value: JSON.stringify({ email: 'test@example.com' })
    });

    const params = Promise.resolve({ id: 'test-scenario' });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.programId).toBe('program-123');
    expect(data.program).toEqual(mockProgram);
  });

  it('should return 401 if user is not authenticated', async () => {
    const request = new NextRequest('http://localhost:3000/api/pbl/scenarios/test-scenario/create-draft', {
      method: 'POST'
    });

    const params = Promise.resolve({ id: 'test-scenario' });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('User authentication required');
  });

  it('should return 404 if scenario not found', async () => {
    (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

    const request = new NextRequest('http://localhost:3000/api/pbl/scenarios/invalid-scenario/create-draft', {
      method: 'POST'
    });
    
    // Mock the cookies.get method
    request.cookies.get = jest.fn().mockReturnValue({
      value: JSON.stringify({ email: 'test@example.com' })
    });

    const params = Promise.resolve({ id: 'invalid-scenario' });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Scenario not found');
  });

  it('should handle repository errors', async () => {
    const mockScenarioData = {
      scenario_info: {
        id: 'test-scenario',
        title: 'Test Scenario',
        description: 'Test Description',
        target_domains: ['domain1'],
        difficulty: 'beginner',
        estimated_duration: 60,
        tasks: []
      },
      tasks: []
    };

    (fs.readFile as jest.Mock).mockResolvedValue(yaml.dump(mockScenarioData));
    (yaml.load as jest.Mock).mockReturnValue(mockScenarioData);
    mockProgramRepo.create.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/pbl/scenarios/test-scenario/create-draft', {
      method: 'POST'
    });
    
    // Mock the cookies.get method
    request.cookies.get = jest.fn().mockReturnValue({
      value: JSON.stringify({ email: 'test@example.com' })
    });

    const params = Promise.resolve({ id: 'test-scenario' });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Failed to create draft program');
  });

  it('should handle invalid user cookie', async () => {
    const request = new NextRequest('http://localhost:3000/api/pbl/scenarios/test-scenario/create-draft', {
      method: 'POST',
      headers: {
        Cookie: 'user=invalid-json'
      }
    });

    const params = Promise.resolve({ id: 'test-scenario' });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe('User authentication required');
  });

  it('should handle scenario with Chinese translations', async () => {
    const mockScenarioData = {
      scenario_info: {
        id: 'test-scenario',
        title: 'Test Scenario',
        title_zhTW: '測試場景',
        description: 'Test Description',
        description_zhTW: '測試描述',
        target_domains: ['domain1'],
        difficulty: 'intermediate',
        estimated_duration: 90,
        prerequisites: ['prereq1'],
        learning_objectives: ['objective1'],
        learning_objectives_zhTW: ['目標1'],
        tasks: []
      },
      tasks: [
        {
          id: 'task1',
          title: 'Task 1',
          title_zhTW: '任務1',
          description: 'Task Description',
          description_zhTW: '任務描述',
          category: 'creation',
          instructions: ['Do this'],
          instructions_zhTW: ['執行此'],
          expected_outcome: 'Result',
          expected_outcome_zhTW: '結果',
          time_limit: 45,
          resources: ['resource1'],
          assessment_focus: {
            primary: ['focus1'],
            secondary: ['focus2']
          }
        }
      ],
      ksa_mapping: {
        knowledge: ['K1'],
        skills: ['S1'],
        attitudes: ['A1']
      }
    };

    (fs.readFile as jest.Mock).mockResolvedValue(yaml.dump(mockScenarioData));
    (yaml.load as jest.Mock).mockReturnValue(mockScenarioData);

    const mockProgram = {
      id: 'program-123',
      scenarioId: 'test-scenario',
      userId: 'test@example.com',
      status: 'active',
      totalTaskCount: 1
    };
    mockProgramRepo.create.mockResolvedValue(mockProgram);

    const request = new NextRequest('http://localhost:3000/api/pbl/scenarios/test-scenario/create-draft', {
      method: 'POST'
    });
    
    // Mock the cookies.get method
    request.cookies.get = jest.fn().mockReturnValue({
      value: JSON.stringify({ email: 'test@example.com' })
    });

    const params = Promise.resolve({ id: 'test-scenario' });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockProgramRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        totalTaskCount: 1,
        mode: 'pbl',
        status: 'active',
        metadata: { language: 'en' }
      })
    );
  });

  it('should handle scenario with AI module', async () => {
    const mockScenarioData = {
      scenario_info: {
        id: 'test-scenario',
        title: 'Test Scenario',
        description: 'Test Description',
        target_domains: ['domain1'],
        difficulty: 'advanced',
        estimated_duration: 120,
        tasks: []
      },
      tasks: [
        {
          id: 'task1',
          title: 'AI Task',
          description: 'AI Task Description',
          category: 'analysis',
          instructions: ['Analyze this'],
          expected_outcome: 'Analysis result',
          time_limit: 60,
          ai_module: {
            type: 'tutor',
            config: { model: 'gpt-4' }
          }
        }
      ]
    };

    (fs.readFile as jest.Mock).mockResolvedValue(yaml.dump(mockScenarioData));
    (yaml.load as jest.Mock).mockReturnValue(mockScenarioData);

    const mockProgram = {
      id: 'program-456',
      scenarioId: 'test-scenario',
      userId: 'test@example.com',
      status: 'active'
    };
    mockProgramRepo.create.mockResolvedValue(mockProgram);

    const request = new NextRequest('http://localhost:3000/api/pbl/scenarios/test-scenario/create-draft', {
      method: 'POST'
    });
    
    // Mock the cookies.get method
    request.cookies.get = jest.fn().mockReturnValue({
      value: JSON.stringify({ email: 'test@example.com' })
    });

    const params = Promise.resolve({ id: 'test-scenario' });
    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockProgramRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        totalTaskCount: 1
      })
    );
  });
});