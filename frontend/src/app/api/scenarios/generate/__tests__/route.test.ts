/**
 * Integration tests for /api/scenarios/generate
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';
import type { GenerateScenarioRequest } from '@/types/prompt-to-course';

// Mock Vertex AI Service
jest.mock('@/lib/ai/vertex-ai-service');

describe('POST /api/scenarios/generate', () => {
  const mockInput: GenerateScenarioRequest = {
    input: {
      scenarioId: 'test-scenario',
      title: 'Test Scenario',
      description: 'A test scenario description',
      mode: 'pbl',
      difficulty: 'beginner',
      estimatedMinutes: 60,
      taskCount: 5,
      targetDomains: ['ai_literacy'],
      language: 'en',
      prerequisites: [],
    },
  };

  const createMockRequest = (body: GenerateScenarioRequest) => {
    return new NextRequest('http://localhost:3000/api/scenarios/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  it('should return 400 if input is missing', async () => {
    const request = createMockRequest({} as GenerateScenarioRequest);
    const response = await POST(request);

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Missing input data');
  });

  it('should return 400 if required fields are missing', async () => {
    const invalidInput = {
      input: {
        ...mockInput.input,
        scenarioId: '',
      },
    };

    const request = createMockRequest(invalidInput);
    const response = await POST(request);

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Missing required fields');
  });

  it('should return 400 for invalid mode', async () => {
    const invalidInput = {
      input: {
        ...mockInput.input,
        mode: 'invalid_mode' as 'pbl',
      },
    };

    const request = createMockRequest(invalidInput);
    const response = await POST(request);

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toContain('Invalid mode');
  });

  it('should generate YAML for valid input', async () => {
    const { VertexAIService } = await import('@/lib/ai/vertex-ai-service');

    // Mock sendMessage method
    (VertexAIService as jest.MockedClass<typeof VertexAIService>).mockImplementation(() => ({
      sendMessage: jest.fn().mockResolvedValue({
        content: 'id: test\nmode: pbl\ntitle:\n  en: "Test"',
        processingTime: 1000,
        tokensUsed: 100,
      }),
      getChatHistory: jest.fn(),
      resetChat: jest.fn(),
      evaluateResponse: jest.fn(),
    }) as never);

    const request = createMockRequest(mockInput);
    const response = await POST(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.yaml).toBeDefined();
    expect(data.processingTime).toBeDefined();
    expect(typeof data.yaml).toBe('string');
  });

  it('should remove markdown code blocks from YAML', async () => {
    const { VertexAIService } = await import('@/lib/ai/vertex-ai-service');

    (VertexAIService as jest.MockedClass<typeof VertexAIService>).mockImplementation(() => ({
      sendMessage: jest.fn().mockResolvedValue({
        content: '```yaml\nid: test\nmode: pbl\n```',
        processingTime: 1000,
        tokensUsed: 100,
      }),
      getChatHistory: jest.fn(),
      resetChat: jest.fn(),
      evaluateResponse: jest.fn(),
    }) as never);

    const request = createMockRequest(mockInput);
    const response = await POST(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.yaml).not.toContain('```yaml');
    expect(data.yaml).not.toContain('```');
    expect(data.warnings).toBeDefined();
    expect(data.warnings?.length).toBeGreaterThan(0);
  });

  it('should handle Vertex AI errors', async () => {
    const { VertexAIService } = await import('@/lib/ai/vertex-ai-service');

    (VertexAIService as jest.MockedClass<typeof VertexAIService>).mockImplementation(() => ({
      sendMessage: jest.fn().mockRejectedValue(new Error('Vertex AI service error')),
      getChatHistory: jest.fn(),
      resetChat: jest.fn(),
      evaluateResponse: jest.fn(),
    }) as never);

    const request = createMockRequest(mockInput);
    const response = await POST(request);

    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});
