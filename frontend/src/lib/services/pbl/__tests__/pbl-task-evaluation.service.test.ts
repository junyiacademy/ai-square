/**
 * Tests for PBLTaskEvaluationService
 * Handles PBL task evaluation orchestration
 */

import { PBLTaskEvaluationService } from '../pbl-task-evaluation.service';
import { Conversation } from '@/types/pbl-evaluate';

// Mock Vertex AI
jest.mock('@google-cloud/vertexai', () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  score: 85,
                  ksaScores: { knowledge: 80, skills: 85, attitudes: 90 },
                  domainScores: {
                    engaging_with_ai: 85,
                    creating_with_ai: -1,
                    managing_with_ai: -1,
                    designing_with_ai: -1
                  },
                  rubricsScores: {
                    'Research Quality': 3,
                    'AI Utilization': 4,
                    'Content Quality': 3,
                    'Learning Progress': 3
                  },
                  conversationInsights: {
                    effectiveExamples: [{
                      quote: 'Great question about AI',
                      reason: 'Shows curiosity'
                    }],
                    improvementAreas: []
                  },
                  strengths: ['Good engagement (A1.1)'],
                  improvements: ['Ask more specific questions (K1.1)'],
                  nextSteps: ['Explore AI applications (S1.1)']
                })
              }]
            }
          }]
        }
      })
    })
  })),
  SchemaType: {
    OBJECT: 'OBJECT',
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    ARRAY: 'ARRAY'
  }
}));

describe('PBLTaskEvaluationService', () => {
  let service: PBLTaskEvaluationService;

  beforeEach(() => {
    service = new PBLTaskEvaluationService();
  });

  describe('evaluateTask', () => {
    it('should evaluate PBL task successfully', async () => {
      const params = {
        task: {
          id: 'task-1',
          title: 'Test Task',
          description: 'Test description',
          instructions: ['Step 1'],
          expectedOutcome: 'Expected result'
        },
        conversations: [
          { type: 'user', content: 'What is AI?' },
          { type: 'assistant', content: 'AI is...' },
          { type: 'user', content: 'How does it work?' }
        ] as Conversation[],
        targetDomains: ['engaging_with_ai'],
        focusKSA: ['K1.1'],
        language: 'en'
      };

      const result = await service.evaluateTask(params);

      expect(result.success).toBe(true);
      expect(result.evaluation).toBeDefined();
      expect(result.evaluation.score).toBe(85);
      expect(result.evaluation.ksaScores).toEqual({
        knowledge: 80,
        skills: 85,
        attitudes: 90
      });
      expect(result.evaluation.taskId).toBe('task-1');
      expect(result.evaluation.evaluatedAt).toBeDefined();
    });

    it('should process domain scores correctly (convert -1 to undefined)', async () => {
      const params = {
        task: {
          id: 'task-1',
          title: 'Test Task',
          description: 'Test',
          instructions: [],
          expectedOutcome: 'Result'
        },
        conversations: [{ type: 'user', content: 'test' }] as Conversation[],
        targetDomains: ['engaging_with_ai'],
        language: 'en'
      };

      const result = await service.evaluateTask(params);

      expect(result.evaluation.domainScores.engaging_with_ai).toBe(85);
      expect(result.evaluation.domainScores.creating_with_ai).toBeUndefined();
      expect(result.evaluation.domainScores.managing_with_ai).toBeUndefined();
      expect(result.evaluation.domainScores.designing_with_ai).toBeUndefined();
    });

    it('should add metadata to evaluation result', async () => {
      const conversations = [
        { type: 'user', content: 'message 1' },
        { type: 'assistant', content: 'response 1' },
        { type: 'user', content: 'message 2' },
        { type: 'assistant', content: 'response 2' },
        { type: 'user', content: 'message 3' }
      ] as Conversation[];

      const params = {
        task: {
          id: 'task-1',
          title: 'Test Task',
          description: 'Test',
          instructions: [],
          expectedOutcome: 'Result'
        },
        conversations,
        targetDomains: ['engaging_with_ai', 'creating_with_ai'],
        language: 'en'
      };

      const result = await service.evaluateTask(params);

      expect(result.evaluation.taskId).toBe('task-1');
      expect(result.evaluation.conversationCount).toBe(3); // Only user messages
      expect(result.evaluation.targetDomains).toEqual(['engaging_with_ai', 'creating_with_ai']);
      expect(result.evaluation.evaluatedAt).toBeDefined();
    });

    it('should handle AI response parsing errors with fallback', async () => {
      // Mock invalid JSON response
      const mockVertexAI = require('@google-cloud/vertexai');
      mockVertexAI.VertexAI.mockImplementationOnce(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockResolvedValue({
            response: {
              candidates: [{
                content: {
                  parts: [{
                    text: 'Invalid JSON response'
                  }]
                }
              }]
            }
          })
        })
      }));

      const params = {
        task: {
          id: 'task-1',
          title: 'Test Task',
          description: 'Test',
          instructions: [],
          expectedOutcome: 'Result'
        },
        conversations: [{ type: 'user', content: 'hi' }] as Conversation[],
        language: 'en'
      };

      const result = await service.evaluateTask(params);

      // Should return fallback evaluation
      expect(result.success).toBe(true);
      expect(result.evaluation.score).toBe(20);
      expect(result.evaluation.ksaScores).toEqual({
        knowledge: 20,
        skills: 20,
        attitudes: 20
      });
      expect(result.evaluation.improvements).toBeDefined();
      expect(result.evaluation.improvements.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      // Mock error
      const mockVertexAI = require('@google-cloud/vertexai');
      mockVertexAI.VertexAI.mockImplementationOnce(() => {
        throw new Error('Vertex AI connection failed');
      });

      const params = {
        task: {
          id: 'task-1',
          title: 'Test Task',
          description: 'Test',
          instructions: [],
          expectedOutcome: 'Result'
        },
        conversations: [{ type: 'user', content: 'test' }] as Conversation[],
        language: 'en'
      };

      const result = await service.evaluateTask(params);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Vertex AI connection failed');
    });
  });

  describe('processDomainScores', () => {
    it('should convert -1 to undefined', () => {
      const domainScores = {
        engaging_with_ai: 85,
        creating_with_ai: -1,
        managing_with_ai: 70,
        designing_with_ai: -1
      };

      const processed = service.processDomainScores(domainScores);

      expect(processed.engaging_with_ai).toBe(85);
      expect(processed.creating_with_ai).toBeUndefined();
      expect(processed.managing_with_ai).toBe(70);
      expect(processed.designing_with_ai).toBeUndefined();
    });

    it('should handle empty domain scores', () => {
      const processed = service.processDomainScores({});
      expect(processed).toEqual({});
    });
  });
});
