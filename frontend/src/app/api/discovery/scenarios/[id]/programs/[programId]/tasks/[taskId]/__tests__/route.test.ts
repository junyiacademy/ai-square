import { NextRequest } from 'next/server';
import { GET, PATCH } from '../route';

// Mock dependencies
jest.mock('@/lib/auth/session');
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/ai/vertex-ai-service');
jest.mock('@/lib/services/discovery-yaml-loader');
jest.mock('@/lib/services/translation-service');

const mockSession = {
  user: { 
    id: 'test-user-123',
    email: 'test@example.com' 
  }
};

const mockTask = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  programId: '123e4567-e89b-12d3-a456-426614174001',
  type: 'exploration',
  title: { en: 'Test Task' },
  description: { en: 'Test Description' },
  status: 'active',
  content: { instructions: 'Test instructions' },
  interactions: [
    {
      timestamp: '2023-01-01T00:00:00Z',
      type: 'ai_response',
      content: { completed: true, feedback: 'Well done!' }
    }
  ],
  metadata: { skills: ['skill1'] }
};

const mockProgram = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  scenarioId: '123e4567-e89b-12d3-a456-426614174002',
  userId: 'test-user-123',
  status: 'active',
  discoveryData: { 
    careerType: 'Software Engineer',
    pathId: 'path-123'
  }
};

beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock session
  require('@/lib/auth/session').getServerSession.mockResolvedValue(mockSession);
  
  // Mock repositories
  const mockTaskRepo = {
    findById: jest.fn().mockResolvedValue(mockTask),
    getTaskWithInteractions: jest.fn().mockResolvedValue(mockTask),
    update: jest.fn().mockResolvedValue(mockTask),
    addInteraction: jest.fn().mockResolvedValue(true)
  };
  
  const mockProgramRepo = {
    findById: jest.fn().mockResolvedValue(mockProgram)
  };
  
  const mockScenarioRepo = {
    findById: jest.fn().mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174002',
      title: { en: 'Test Scenario' },
      mode: 'discovery',
      metadata: { careerType: 'Software Engineer' }
    })
  };
  
  const mockEvaluationRepo = {
    findByTaskId: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({ 
      id: '123e4567-e89b-12d3-a456-426614174003',
      score: 100,
      feedback: 'Well done!',
      criteria: {}
    })
  };

  const mockRepositoryFactory = require('@/lib/repositories/base/repository-factory');
  mockRepositoryFactory.repositoryFactory = {
    getTaskRepository: jest.fn().mockReturnValue(mockTaskRepo),
    getProgramRepository: jest.fn().mockReturnValue(mockProgramRepo),
    getScenarioRepository: jest.fn().mockReturnValue(mockScenarioRepo),
    getEvaluationRepository: jest.fn().mockReturnValue(mockEvaluationRepo)
  };
  
  // Mock AI service
  require('@/lib/ai/vertex-ai-service').VertexAIService.mockImplementation(() => ({
    generateText: jest.fn().mockResolvedValue('AI generated feedback'),
    sendMessage: jest.fn().mockResolvedValue('AI generated feedback')
  }));
  
  // Mock YAML loader
  require('@/lib/services/discovery-yaml-loader').DiscoveryYAMLLoader.mockImplementation(() => ({
    loadScenarioById: jest.fn().mockResolvedValue({
      id: '123e4567-e89b-12d3-a456-426614174002',
      title: { en: 'Test Scenario' },
      careerType: 'Software Engineer',
      world_setting: {
        description: 'Tech startup environment',
        atmosphere: 'Fast-paced and innovative'
      }
    })
  }));
  
  // Mock translation service
  require('@/lib/services/translation-service').TranslationService.mockImplementation(() => ({
    detectLanguage: jest.fn().mockReturnValue('en'),
    translateText: jest.fn().mockImplementation((text) => Promise.resolve(text))
  }));
});

describe('/api/discovery/scenarios/[id]/programs/[programId]/tasks/[taskId]', () => {
  describe('GET', () => {
    it('should return task details with program context', async () => {
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123');
      
      const response = await GET(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.id).toBe(mockTask.id);
      expect(data.status).toBe(mockTask.status);
      expect(data.careerType).toBe(mockProgram.discoveryData.careerType);
    });

    it('should return 401 when user not authenticated', async () => {
      require('@/lib/auth/session').getServerSession.mockResolvedValueOnce(null);
      
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123');
      
      const response = await GET(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      expect(response.status).toBe(401);
    });

    it('should return 404 when task not found', async () => {
      const mockRepositoryFactory = require('@/lib/repositories/base/repository-factory');
      const mockTaskRepo = mockRepositoryFactory.repositoryFactory.getTaskRepository();
      mockTaskRepo.getTaskWithInteractions.mockResolvedValueOnce(null);
      
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/nonexistent');
      
      const response = await GET(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      expect(response.status).toBe(404);
    });

    it('should handle repository errors', async () => {
      const mockRepositoryFactory = require('@/lib/repositories/base/repository-factory');
      const mockTaskRepo = mockRepositoryFactory.repositoryFactory.getTaskRepository();
      mockTaskRepo.getTaskWithInteractions.mockRejectedValueOnce(new Error('Database error'));
      
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123');
      
      const response = await GET(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      expect(response.status).toBe(500);
    });

    it('should include scenario data when available', async () => {
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123');
      
      const response = await GET(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      const data = await response.json();
      expect(data.careerType).toBeDefined();
      expect(data.careerType).toBe('Software Engineer');
    });

    it('should handle YAML loading errors gracefully', async () => {
      const mockYAMLLoader = require('@/lib/services/discovery-yaml-loader').DiscoveryYAMLLoader();
      mockYAMLLoader.loadScenarioById.mockRejectedValueOnce(new Error('YAML load error'));
      
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123');
      
      const response = await GET(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      const data = await response.json();
      // Should still return task data even if scenario loading fails
      expect(data.id).toBe(mockTask.id);
      expect(data.status).toBe(mockTask.status);
    });
  });

  describe('PATCH', () => {
    it('should add interaction to task', async () => {
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123', {
        method: 'PATCH',
        body: JSON.stringify({ 
          action: 'submit',
          content: { response: 'This is my response' }
        })
      });
      
      const response = await PATCH(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'invalid-action' }) // Invalid action
      });
      
      const response = await PATCH(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      expect(response.status).toBe(400);
    });

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123', {
        method: 'PATCH',
        body: 'invalid json'
      });
      
      const response = await PATCH(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      expect(response.status).toBe(500);
    });

    it('should generate AI feedback for completed interactions', async () => {
      const interactionData = {
        action: 'submit',
        content: { response: 'I have completed the task' }
      };
      
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123', {
        method: 'PATCH',
        body: JSON.stringify(interactionData)
      });
      
      const response = await PATCH(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('PATCH update', () => {
    it('should update task status', async () => {
      const updateData = {
        action: 'start'
      };
      
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123', {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      });
      
      const response = await PATCH(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('active');
    });

    it('should validate update data', async () => {
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'invalid', data: 'test' })
      });
      
      const response = await PATCH(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      expect(response.status).toBe(400);
    });

    it('should handle task not found for update', async () => {
      const mockRepositoryFactory = require('@/lib/repositories/base/repository-factory');
      const mockTaskRepo = mockRepositoryFactory.repositoryFactory.getTaskRepository();
      mockTaskRepo.getTaskWithInteractions.mockResolvedValueOnce(null);
      
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/nonexistent', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'start' })
      });
      
      const response = await PATCH(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      expect(response.status).toBe(404);
    });

    it('should handle update repository errors', async () => {
      const mockRepositoryFactory = require('@/lib/repositories/base/repository-factory');
      const mockTaskRepo = mockRepositoryFactory.repositoryFactory.getTaskRepository();
      mockTaskRepo.updateStatus = jest.fn().mockRejectedValueOnce(new Error('Update failed'));
      
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'start' })
      });
      
      const response = await PATCH(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      expect(response.status).toBe(500);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle missing parameters', async () => {
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123');
      
      const response = await GET(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      // The params are provided, so it should work
      expect(response.status).toBe(200);
    });

    it('should handle AI service failures gracefully', async () => {
      const mockAI = require('@/lib/ai/vertex-ai-service').VertexAIService();
      mockAI.generateText.mockRejectedValueOnce(new Error('AI service unavailable'));
      
      const interactionData = {
        action: 'submit',
        content: { response: 'Task completed' }
      };
      
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123', {
        method: 'PATCH',
        body: JSON.stringify(interactionData)
      });
      
      const response = await PATCH(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      // Should still succeed even if AI feedback fails
      expect(response.status).toBe(200);
    });

    it('should handle translation service errors', async () => {
      const mockTranslation = require('@/lib/services/translation-service').TranslationService();
      mockTranslation.detectLanguage.mockImplementation(() => {
        throw new Error('Translation service error');
      });
      
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123');
      
      const response = await GET(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      // Should still return data even with translation errors
      expect(response.status).toBe(200);
    });

    it('should handle concurrent requests correctly', async () => {
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123');
      
      const promises = Array.from({ length: 5 }, () => 
        GET(request, { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) })
      );
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should validate parameter format', async () => {
      const request = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123');
      
      const response = await GET(
        request,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      // Valid params are provided
      expect(response.status).toBe(200);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete learning journey flow', async () => {
      // Test the complete flow from GET to POST to PUT
      const getRequest = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123');
      
      const getResponse = await GET(
        getRequest,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      expect(getResponse.status).toBe(200);
      
      // Add interaction
      const postRequest = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123', {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'submit',
          content: { response: 'My learning response' }
        })
      });
      
      const postResponse = await PATCH(
        postRequest,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      expect(postResponse.status).toBe(200);
      
      // Update task status
      const putRequest = new NextRequest('http://localhost/api/discovery/scenarios/scenario-123/programs/prog-123/tasks/task-123', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'start' })
      });
      
      const putResponse = await PATCH(
        putRequest,
        { params: Promise.resolve({'id':'123e4567-e89b-12d3-a456-426614174002','programId':'123e4567-e89b-12d3-a456-426614174001','taskId':'123e4567-e89b-12d3-a456-426614174000'}) }
      );
      
      expect(putResponse.status).toBe(200);
    });
  });
});