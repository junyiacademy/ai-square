import { NextRequest } from 'next/server';
import { POST } from '../route';

// Mock the repository factory
const mockFindByMode = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getScenarioRepository: () => ({
      findByMode: mockFindByMode,
      create: mockCreate,
      update: mockUpdate,
    })
  }
}));

// Mock fs
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

// Mock yaml
jest.mock('yaml', () => ({
  parse: jest.fn(),
}));

import { readFileSync } from 'fs';
import { parse } from 'yaml';

describe('/api/admin/init-assessment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST', () => {
    it('should create new assessment scenario when none exists', async () => {
      const mockAssessmentData = {
        assessment_config: {
          total_questions: 12,
          time_limit_minutes: 15,
          passing_score: 60,
          domains: {
            creating_with_ai: { questions: 3 },
            engaging_with_ai: { questions: 3 },
            managing_with_ai: { questions: 3 },
            designing_with_ai: { questions: 3 }
          }
        },
        tasks: [
          {
            id: 'domain1',
            domain: 'creating_with_ai',
            questions: [
              {
                id: 'q1',
                text: 'What is AI?',
                options: ['A', 'B', 'C', 'D'],
                correct_answer: 'A',
                explanation: 'AI explanation',
                ksa_codes: ['K001']
              }
            ]
          }
        ]
      };

      (readFileSync as jest.Mock).mockReturnValue('yaml content');
      (parse as jest.Mock).mockReturnValue(mockAssessmentData);
      mockFindByMode.mockResolvedValue([]);
      mockCreate.mockResolvedValue({ id: 'new-scenario-id' });

      const request = new NextRequest('http://localhost:3001/api/admin/init-assessment', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.scenarioId).toBe('new-scenario-id');
      expect(result.questionBanks).toBe(1);
      expect(result.totalQuestions).toBe(12);
    });

    it('should update existing assessment scenario', async () => {
      const mockAssessmentData = {
        assessment_config: {
          total_questions: 12,
          time_limit_minutes: 15,
          passing_score: 60,
          domains: {}
        },
        tasks: []
      };

      const existingScenario = {
        id: 'existing-scenario-id',
        status: 'active',
        sourceId: 'ai_literacy'
      };

      (readFileSync as jest.Mock).mockReturnValue('yaml content');
      (parse as jest.Mock).mockReturnValue(mockAssessmentData);
      mockFindByMode.mockResolvedValue([existingScenario]);
      mockUpdate.mockResolvedValue(existingScenario);

      const request = new NextRequest('http://localhost:3001/api/admin/init-assessment', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(result.scenarioId).toBe('existing-scenario-id');
    });

    it('should handle file read errors', async () => {
      (readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      const request = new NextRequest('http://localhost:3001/api/admin/init-assessment', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Failed to initialize assessment scenarios');
      expect(result.details).toBe('File not found');
    });

    it('should handle repository errors', async () => {
      const mockAssessmentData = {
        assessment_config: { total_questions: 12, domains: {} },
        tasks: []
      };

      (readFileSync as jest.Mock).mockReturnValue('yaml content');
      (parse as jest.Mock).mockReturnValue(mockAssessmentData);
      mockFindByMode.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3001/api/admin/init-assessment', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Failed to initialize assessment scenarios');
    });
  });
});
