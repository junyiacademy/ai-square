import { VertexAI } from '@google-cloud/vertexai';
import { VertexAIService, getVertexAI, createPBLVertexAIService } from '../vertex-ai-service';
import { AIModule } from '@/types/pbl';

// Mock the VertexAI SDK
jest.mock('@google-cloud/vertexai');

describe('vertex-ai-service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    process.env.GOOGLE_CLOUD_LOCATION = 'us-central1';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getVertexAI', () => {
    it('should create and return a VertexAI instance with correct config', () => {
      const vertexAI = getVertexAI();

      expect(VertexAI).toHaveBeenCalledWith({
        project: 'test-project',
        location: 'us-central1'
      });
      expect(vertexAI).toBeInstanceOf(VertexAI);
    });

    it('should use default location when GOOGLE_CLOUD_LOCATION is not set', () => {
      delete process.env.GOOGLE_CLOUD_LOCATION;
      
      getVertexAI();

      expect(VertexAI).toHaveBeenCalledWith({
        project: 'test-project',
        location: 'us-central1'
      });
    });
  });

  describe('VertexAIService', () => {
    let service: VertexAIService;
    const mockConfig = {
      systemPrompt: 'You are a helpful assistant',
      temperature: 0.7,
      maxOutputTokens: 4096
    };

    beforeEach(() => {
      service = new VertexAIService(mockConfig);
    });

    it('should initialize with correct config', () => {
      expect(service).toBeDefined();
      // Test that the service is properly initialized
    });

    it('should handle chat interactions', async () => {
      const mockGenerateContent = jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: 'Test response'
              }]
            }
          }]
        }
      });

      // Mock the fetch method for testing
      (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: 'Test response'
              }]
            }
          }]
        })
      });

      const response = await service.sendMessage('Test message');

      expect(response.content).toBe('Test response');
      expect(response.processingTime).toBeGreaterThan(0);
    });

    it('should evaluate task performance', async () => {
      const evaluation = await service.evaluateResponse(
        'User response',
        'Task content',
        ['criteria1', 'criteria2']
      );

      expect(evaluation).toHaveProperty('score');
      expect(evaluation).toHaveProperty('feedback');
      expect(evaluation).toHaveProperty('suggestions');
      expect(Array.isArray(evaluation.suggestions)).toBe(true);
    });
  });

  describe('createPBLVertexAIService', () => {
    it('should create service with correct language instructions for Traditional Chinese', () => {
      const aiModule: AIModule = {
        role: 'assistant' as const,
        model: 'gemini-2.5-flash',
        persona: 'AI Tutor'
      };

      const stageContext = {
        stageName: 'Learning Stage',
        stageType: 'practice',
        taskTitle: 'Test Task',
        taskInstructions: ['Step 1', 'Step 2']
      };

      const service = createPBLVertexAIService(aiModule, stageContext, 'zhTW');
      expect(service).toBeInstanceOf(VertexAIService);
    });

    it('should create service with English instructions by default', () => {
      const aiModule: AIModule = {
        role: 'assistant' as const,
        model: 'gemini-2.5-flash',
        persona: 'AI Assistant'
      };

      const stageContext = {
        stageName: 'Test Stage',
        stageType: 'assessment',
        taskTitle: 'Test Task',
        taskInstructions: ['Do this', 'Then that']
      };

      const service = createPBLVertexAIService(aiModule, stageContext);
      expect(service).toBeInstanceOf(VertexAIService);
    });
  });
});