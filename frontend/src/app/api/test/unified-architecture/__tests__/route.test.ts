/**
 * TDD Test: Unified Architecture Test API
 * Following Kent Beck's Red → Green → Refactor methodology
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { IScenario, IProgram, ITask, IEvaluation } from '@/types/unified-learning';
import { jest } from '@jest/globals';

// Mock the entire module before imports
jest.mock('@/lib/implementations/gcs-v2');

// Import the mocked repositories
import { 
  mockScenarioRepo, 
  mockProgramRepo, 
  mockTaskRepo, 
  mockEvaluationRepo 
} from '@/lib/implementations/__mocks__/gcs-v2';

describe('Unified Architecture Test API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment
    process.env.GCS_BUCKET_NAME = 'test-bucket';
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
  });

  describe('GET /api/test/unified-architecture', () => {
    it('should return architecture configuration and data', async () => {
      // Red: Write failing test first
      const mockScenarios: IScenario[] = [
        {
          id: 'scenario-1',
          sourceType: 'pbl',
          sourceRef: {
            type: 'yaml',
            path: 'test.yaml',
            metadata: {}
          },
          title: 'Test Scenario',
          description: 'Test description',
          objectives: ['Test objective'],
          taskTemplates: [],
          metadata: {},
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ];

      const mockPrograms: IProgram[] = [
        {
          id: 'program-1',
          scenarioId: 'scenario-1',
          userId: 'user@example.com',
          status: 'active',
          startedAt: '2024-01-01T00:00:00.000Z',
          taskIds: [],
          currentTaskIndex: 0,
          metadata: {}
        }
      ];

      mockScenarioRepo.listAll.mockResolvedValue(mockScenarios);
      mockProgramRepo.findByScenario.mockResolvedValue(mockPrograms);

      // Green: Make test pass
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.architecture.bucketName).toBe('test-bucket');
      expect(data.architecture.isConfigured).toBe(true);
      expect(data.data.scenarios).toHaveLength(1);
      expect(data.data.programs).toHaveLength(1);
      expect(data.operations.listScenarios).toBe(true);
    });

    it('should handle GCS errors gracefully', async () => {
      mockScenarioRepo.listAll.mockRejectedValue(new Error('GCS connection failed'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.architecture.isConfigured).toBe(false);
      expect(data.operations.listScenarios).toBe(false);
    });

    it('should handle missing environment configuration', async () => {
      delete process.env.GOOGLE_CLOUD_PROJECT;

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.architecture.isConfigured).toBe(false);
    });
  });

  describe('POST /api/test/unified-architecture', () => {
    describe('create-test action', () => {
      it('should create complete test flow', async () => {
        const mockScenario: IScenario = {
          id: 'new-scenario-id',
          sourceType: 'pbl',
          sourceRef: {
            type: 'yaml',
            path: 'test/api-test.yaml',
            metadata: { createdBy: 'api-test' }
          },
          title: expect.stringContaining('API Test Scenario'),
          description: 'Created via test API endpoint',
          objectives: ['Test the unified architecture', 'Verify GCS integration'],
          taskTemplates: [{
            id: 'template-1',
            title: 'Test Task Template',
            type: 'chat'
          }],
          metadata: {},
          createdAt: expect.any(String),
          updatedAt: expect.any(String)
        };

        const mockProgram: IProgram = {
          id: 'new-program-id',
          scenarioId: 'new-scenario-id',
          userId: 'test-user@example.com',
          status: 'active',
          startedAt: expect.any(String),
          taskIds: [],
          currentTaskIndex: 0,
          metadata: {
            sourceType: 'pbl',
            testRun: true
          }
        };

        const mockTask: ITask = {
          id: 'new-task-id',
          programId: 'new-program-id',
          templateId: 'template-1',
          title: 'Test Task Instance',
          description: '',
          type: 'chat',
          order: 1,
          status: 'pending',
          createdAt: expect.any(String),
          metadata: {}
        };

        const mockEvaluation: IEvaluation = {
          id: 'new-eval-id',
          entityType: 'task',
          entityId: 'new-task-id',
          programId: 'new-program-id',
          userId: 'test-user@example.com',
          type: 'api_test',
          createdAt: expect.any(String),
          metadata: {
            score: 95,
            feedback: 'Test evaluation created successfully',
            automated: true
          }
        };

        mockScenarioRepo.create.mockResolvedValue(mockScenario);
        mockProgramRepo.create.mockResolvedValue(mockProgram);
        mockTaskRepo.create.mockResolvedValue(mockTask);
        mockTaskRepo.addInteraction.mockResolvedValue(mockTask);
        mockEvaluationRepo.create.mockResolvedValue(mockEvaluation);

        const request = new Request('http://localhost:3000/api/test/unified-architecture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create-test' })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.data.scenario).toBeDefined();
        expect(data.data.program).toBeDefined();
        expect(data.data.task).toBeDefined();
        expect(data.data.evaluation).toBeDefined();
        
        // Verify correct repository calls
        expect(mockScenarioRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            sourceType: 'pbl',
            title: expect.stringContaining('API Test Scenario')
          })
        );
        
        expect(mockTaskRepo.addInteraction).toHaveBeenCalledWith(
          'new-task-id',
          expect.objectContaining({
            type: 'user_input',
            content: { message: 'Test message from API' }
          })
        );
      });

      it('should handle creation errors', async () => {
        mockScenarioRepo.create.mockRejectedValue(new Error('GCS write failed'));

        const request = new Request('http://localhost:3000/api/test/unified-architecture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create-test' })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.success).toBe(false);
        expect(data.error).toBe('GCS write failed');
      });
    });

    describe('input validation', () => {
      it('should reject invalid actions', async () => {
        const request = new Request('http://localhost:3000/api/test/unified-architecture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'invalid-action' })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain('Invalid action');
      });

      it('should handle malformed JSON', async () => {
        // Create a mock Request with json() that rejects
        const mockRequest = {
          json: jest.fn().mockRejectedValue(new SyntaxError('Invalid JSON')),
          url: 'http://localhost:3000/api/test/unified-architecture',
          method: 'POST'
        } as unknown as Request;

        const response = await POST(mockRequest);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        // Should default to create-test action
      });
    });
  });

  describe('Data integrity tests', () => {
    it('should ensure all created entities follow unified architecture interfaces', async () => {
      const request = new Request('http://localhost:3000/api/test/unified-architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-test' })
      });

      // Mock successful creation
      mockScenarioRepo.create.mockImplementation((data) => ({
        ...data,
        id: 'test-scenario-id'
      }));
      
      mockProgramRepo.create.mockImplementation((data) => ({
        ...data,
        id: 'test-program-id'
      }));
      
      mockTaskRepo.create.mockImplementation((data) => ({
        ...data,
        id: 'test-task-id'
      }));
      
      mockEvaluationRepo.create.mockImplementation((data) => ({
        ...data,
        id: 'test-eval-id'
      }));

      await POST(request);

      // Verify IScenario compliance
      expect(mockScenarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: expect.any(String),
          sourceRef: expect.objectContaining({
            type: expect.any(String),
            path: expect.any(String)
          }),
          title: expect.any(String),
          description: expect.any(String),
          objectives: expect.any(Array),
          taskTemplates: expect.any(Array)
        })
      );

      // Verify IProgram compliance
      expect(mockProgramRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          scenarioId: expect.any(String),
          userId: expect.any(String),
          status: expect.stringMatching(/^(active|completed|abandoned)$/),
          taskIds: expect.any(Array),
          currentTaskIndex: expect.any(Number)
        })
      );

      // Verify ITask compliance
      expect(mockTaskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          programId: expect.any(String),
          title: expect.any(String),
          type: expect.any(String),
          status: expect.stringMatching(/^(pending|active|completed|skipped)$/)
        })
      );

      // Verify IEvaluation compliance
      expect(mockEvaluationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: expect.stringMatching(/^(task|program)$/),
          entityId: expect.any(String),
          programId: expect.any(String),
          userId: expect.any(String),
          type: expect.any(String)
        })
      );
    });
  });

  describe('Performance and reliability', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill(null).map(() => 
        new Request('http://localhost:3000/api/test/unified-architecture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create-test' })
        })
      );

      mockScenarioRepo.create.mockResolvedValue({ id: 'test-id' } as IScenario);
      mockProgramRepo.create.mockResolvedValue({ id: 'test-id' } as IProgram);
      mockTaskRepo.create.mockResolvedValue({ id: 'test-id' } as ITask);
      mockEvaluationRepo.create.mockResolvedValue({ id: 'test-id' } as IEvaluation);

      const responses = await Promise.all(requests.map(req => POST(req)));
      const results = await Promise.all(responses.map(res => res.json()));

      expect(responses.every(res => res.status === 200)).toBe(true);
      expect(results.every(data => data.success === true)).toBe(true);
      expect(mockScenarioRepo.create).toHaveBeenCalledTimes(5);
    });
  });
});