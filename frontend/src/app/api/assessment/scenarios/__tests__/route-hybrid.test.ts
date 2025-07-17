/**
 * Hybrid Scenarios API Route Tests
 * Following TDD: Red → Green → Refactor
 */

import { GET } from '../route-hybrid';
import { NextRequest } from 'next/server';
import { getScenarioRepository } from '@/lib/implementations/gcs-v2';
import { getServerSession } from '@/lib/auth/session';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';

// Mock dependencies
jest.mock('@/lib/implementations/gcs-v2');
jest.mock('@/lib/auth/session');
jest.mock('fs/promises');
jest.mock('js-yaml');

describe('Hybrid Scenarios API Route', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockYaml = yaml as jest.Mocked<typeof yaml>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear module cache to reset translation cache
    jest.resetModules();
  });

  describe('GET /api/assessment/scenarios', () => {
    const mockScenarios = [
      {
        id: 'scenario-1',
        sourceType: 'assessment' as const,
        title: 'AI Literacy Assessment',
        description: 'Evaluate your AI understanding',
        taskTemplates: [],
        metadata: {},
        sourceRef: {
          type: 'yaml' as const,
          sourceId: 'ai_literacy',
          metadata: {
            folderName: 'ai_literacy',
            basePath: 'assessment_data/ai_literacy',
            config: {
              totalQuestions: 12,
              timeLimit: 15,
              passingScore: 60
            }
          }
        }
      },
      {
        id: 'scenario-2',
        sourceType: 'assessment' as const,
        title: 'AI Ethics Assessment',
        description: 'Test your knowledge of AI ethics',
        taskTemplates: [],
        metadata: {},
        sourceRef: {
          type: 'yaml' as const,
          sourceId: 'ai_ethics',
          metadata: {
            folderName: 'ai_ethics',
            config: {
              totalQuestions: 10,
              timeLimit: 20,
              passingScore: 70
            }
          }
        }
      }
    ];

    it('should return English scenarios from GCS when lang=en', async () => {
      // Arrange
      (getScenarioRepository as jest.Mock).mockReturnValue({
        findBySourceType: jest.fn().mockResolvedValue(mockScenarios)
      });

      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });

      const request = new NextRequest('http://localhost/api/assessment/scenarios?lang=en');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.language).toBe('en');
      expect(data.data.source).toBe('gcs');
      expect(data.data.scenarios).toHaveLength(2);
      expect(data.data.scenarios[0].title).toBe('AI Literacy Assessment');
      expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    it('should load translations from YAML for non-English languages', async () => {
      // Arrange
      mockGetScenarioRepository.mockReturnValue({
        findBySourceType: jest.fn().mockResolvedValue(mockScenarios)
      } as any);

      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });

      // Mock YAML files
      mockFs.readFile.mockImplementation(async (path: string) => {
        if (path.includes('ai_literacy_questions_zhTW.yaml')) {
          return `
assessment_config:
  title: AI 素養評估
  description: 評估您對 AI 系統的理解
  total_questions: 12
  time_limit_minutes: 15
  passing_score: 60
`;
        } else if (path.includes('ai_ethics_questions_zhTW.yaml')) {
          return `
assessment_config:
  title: AI 倫理評估
  description: 測試您對 AI 倫理的瞭解
  total_questions: 10
  time_limit_minutes: 20
  passing_score: 70
`;
        }
        throw new Error('File not found');
      });

      mockYaml.load.mockImplementation((content: string) => {
        if (content.includes('AI 素養評估')) {
          return {
            assessment_config: {
              title: 'AI 素養評估',
              description: '評估您對 AI 系統的理解',
              total_questions: 12,
              time_limit_minutes: 15,
              passing_score: 60
            }
          };
        } else {
          return {
            assessment_config: {
              title: 'AI 倫理評估',
              description: '測試您對 AI 倫理的瞭解',
              total_questions: 10,
              time_limit_minutes: 20,
              passing_score: 70
            }
          };
        }
      });

      const request = new NextRequest('http://localhost/api/assessment/scenarios?lang=zhTW');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.language).toBe('zhTW');
      expect(data.data.source).toBe('yaml');
      expect(data.data.scenarios).toHaveLength(2);
      expect(data.data.scenarios[0].title).toBe('AI 素養評估');
      expect(data.data.scenarios[1].title).toBe('AI 倫理評估');
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });

    it('should fall back to English when translation is not found', async () => {
      // Arrange
      mockGetScenarioRepository.mockReturnValue({
        findBySourceType: jest.fn().mockResolvedValue(mockScenarios)
      } as any);

      mockGetServerSession.mockResolvedValue(null);

      // Mock file not found
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const request = new NextRequest('http://localhost/api/assessment/scenarios?lang=ja');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.language).toBe('ja');
      expect(data.data.source).toBe('yaml');
      expect(data.data.scenarios[0].title).toBe('AI Literacy Assessment'); // Falls back to English
      expect(data.data.scenarios[0].description).toBe('Evaluate your AI understanding');
    });

    it('should include user progress when authenticated', async () => {
      // Arrange
      mockGetScenarioRepository.mockReturnValue({
        findBySourceType: jest.fn().mockResolvedValue(mockScenarios)
      } as any);

      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      });

      const request = new NextRequest('http://localhost/api/assessment/scenarios?lang=en');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.data.scenarios[0].userProgress).toBeDefined();
      expect(data.data.scenarios[0].userProgress.completedPrograms).toBe(0);
    });

    it('should not include user progress when not authenticated', async () => {
      // Arrange
      mockGetScenarioRepository.mockReturnValue({
        findBySourceType: jest.fn().mockResolvedValue(mockScenarios)
      } as any);

      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/assessment/scenarios?lang=en');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(data.data.scenarios[0].userProgress).toBeUndefined();
    });

    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockGetScenarioRepository.mockReturnValue({
        findBySourceType: jest.fn().mockRejectedValue(new Error('Repository error'))
      } as any);

      const request = new NextRequest('http://localhost/api/assessment/scenarios?lang=en');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to load scenarios');
    });

    it('should cache translations across requests', async () => {
      // Import fresh module to get clean cache
      const { GET: freshGET } = await import('../route-hybrid');
      
      // Arrange
      mockGetScenarioRepository.mockReturnValue({
        findBySourceType: jest.fn().mockResolvedValue(mockScenarios.slice(0, 1))
      } as any);

      mockGetServerSession.mockResolvedValue(null);

      mockFs.readFile.mockResolvedValue(`
assessment_config:
  title: AI 素養評估
  description: 評估您對 AI 系統的理解
  total_questions: 12
  time_limit_minutes: 15
  passing_score: 60
`);

      mockYaml.load.mockReturnValue({
        assessment_config: {
          title: 'AI 素養評估',
          description: '評估您對 AI 系統的理解',
          total_questions: 12,
          time_limit_minutes: 15,
          passing_score: 60
        }
      });

      // Act - First request
      const request1 = new NextRequest('http://localhost/api/assessment/scenarios?lang=zhTW');
      await freshGET(request1);

      // Act - Second request (should use cache)
      const request2 = new NextRequest('http://localhost/api/assessment/scenarios?lang=zhTW');
      const response2 = await freshGET(request2);
      const data2 = await response2.json();

      // Assert
      expect(mockFs.readFile).toHaveBeenCalledTimes(1); // Called only once due to cache
      expect(data2.data.scenarios[0].title).toBe('AI 素養評估');
    });

    it('should handle default language when not specified', async () => {
      // Arrange
      mockGetScenarioRepository.mockReturnValue({
        findBySourceType: jest.fn().mockResolvedValue(mockScenarios)
      } as any);

      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/assessment/scenarios');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.language).toBe('en');
      expect(data.data.source).toBe('gcs');
    });
  });
});