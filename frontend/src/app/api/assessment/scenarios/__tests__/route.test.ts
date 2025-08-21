import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
/**
 * Assessment Scenarios API Route Tests
 * 測試評估情境 API
 */

import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { mockConsoleError as createMockConsoleError, mockConsoleWarn as createMockConsoleWarn } from '@/test-utils/helpers/console';
import { createMockScenarioRepository, createMockScenario } from '@/test-utils/mocks/repository-helpers';

// 不直接 import fs.promises，改用自建 mock 注入，避免 resetModules 造成不同實例問題
let fsPromises: { readdir: jest.Mock; readFile: jest.Mock };

// Mock dependencies（基礎宣告）
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/session');

// Mock console
const mockConsoleError = createMockConsoleError();
const mockConsoleWarn = createMockConsoleWarn();

describe('/api/assessment/scenarios', () => {
  const mockScenarioRepo = createMockScenarioRepository();
  let LocalGET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    // 建立並注入 fs mock（與 route 載入相同實例）
    fsPromises = {
      readdir: jest.fn(),
      readFile: jest.fn(),
    };
    jest.doMock('fs', () => ({ promises: fsPromises }));

    // repository 與 session mock
    (mockScenarioRepo.findByMode as jest.Mock).mockReset();
    (mockScenarioRepo.findActive as jest.Mock).mockReset();
    (mockScenarioRepo.create as jest.Mock).mockReset();
    (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
    (mockScenarioRepo.findActive as jest.Mock).mockResolvedValue([]);

    jest.doMock('@/lib/repositories/base/repository-factory', () => ({
      repositoryFactory: {
        getScenarioRepository: jest.fn(() => mockScenarioRepo),
      }
    }));
    jest.doMock('@/lib/auth/session', () => ({ getServerSession: jest.fn().mockResolvedValue(null) }));

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('../route');
      LocalGET = mod.GET;
    });
  });

  describe('GET - Assessment Scenarios', () => {
    const mockDbScenarios = [
      createMockScenario({
        id: 'scenario-1',
        mode: 'assessment',
        title: { en: 'AI Literacy Assessment', zh: 'AI 素養評估' },
        description: { en: 'Test your AI knowledge', zh: '測試您的 AI 知識' },
        sourceMetadata: { folderName: 'ai_literacy' },
        estimatedMinutes: 30,
        assessmentData: {
          totalQuestions: 15,
          passingScore: 70,
          domains: ['engaging_with_ai', 'creating_with_ai'],
        },
      }),
      createMockScenario({
        id: 'scenario-2',
        mode: 'assessment',
        title: { en: 'Data Science Assessment' },
        description: { en: 'Evaluate data science skills' },
        sourceId: 'data_science',
        estimatedMinutes: 45,
        assessmentData: {
          totalQuestions: 20,
          passingScore: 65,
          domains: ['analyzing_data', 'machine_learning'],
        },
      }),
    ];

    it('should return scenarios from database with default language', async () => {
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue(mockDbScenarios);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await LocalGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(2);
    });

    it('should return scenarios with specified language', async () => {
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue(mockDbScenarios);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios?lang=zh');
      const response = await LocalGET(request);
      expect(response.status).toBe(200);
    });

    it('should include user progress when authenticated', async () => {
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      jest.doMock('@/lib/auth/session', () => ({ getServerSession: jest.fn().mockResolvedValue({ user: { id: 'user-123', email: 'user@example.com' } }) }));
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('../route');
        LocalGET = mod.GET;
      });
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue(mockDbScenarios);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await LocalGET(request);
      expect(response.status).toBe(200);
    });

    it('should return empty array when no scenarios in database', async () => {
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
      (mockScenarioRepo.findActive as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await LocalGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(0);
      // Should NOT try to read from filesystem
      expect(fsPromises.readdir).not.toHaveBeenCalled();
      expect(fsPromises.readFile).not.toHaveBeenCalled();
    });

    it('should not attempt filesystem fallback for any language', async () => {
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
      (mockScenarioRepo.findActive as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios?lang=zh');
      const response = await LocalGET(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.data.scenarios).toHaveLength(0);
      expect(fsPromises.readFile).not.toHaveBeenCalled();
    });

    it('should not access filesystem when database is empty', async () => {
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
      (mockScenarioRepo.findActive as jest.Mock).mockResolvedValue([]);

      // Clear any previous console warnings (Redis fallback warnings are expected)
      mockConsoleWarn.mockClear();

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await LocalGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios).toHaveLength(0);
      expect(fsPromises.readdir).not.toHaveBeenCalled();
      
      // Filter out Redis-related warnings which are expected in test environment
      const nonRedisWarnings = mockConsoleWarn.mock.calls.filter(
        call => !call[0]?.includes('Redis disabled') && !call[0]?.includes('using in-memory fallback')
      );
      expect(nonRedisWarnings).toHaveLength(0);
    });

    it('should return existing scenarios from database without filesystem access', async () => {
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      
      const existingScenario = createMockScenario({
        id: 'existing-1',
        sourceMetadata: { configPath: 'assessment_data/ai_literacy/ai_literacy_questions_en.yaml' },
        title: { en: 'Existing Assessment' },
        description: { en: 'Already in DB' },
      });
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([existingScenario]);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await LocalGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios).toHaveLength(1);
      expect(fsPromises.readdir).not.toHaveBeenCalled();
      expect(fsPromises.readFile).not.toHaveBeenCalled();
    });

    it('should handle empty database without filesystem fallback', async () => {
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
      (mockScenarioRepo.findActive as jest.Mock).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await LocalGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toEqual([]);
      // Verify no filesystem operations were attempted
      expect(fsPromises.readdir).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      
      // Simulate a database error
      const dbError = new Error('Database connection failed');
      (mockScenarioRepo.findByMode as jest.Mock).mockRejectedValue(dbError);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await LocalGET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Failed to load assessment scenarios');
    });

    it('should handle default values for missing config fields', async () => {
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([
        createMockScenario({ id: 'scenario-3', title: { en: 'Basic Assessment' }, description: { en: 'Simple test' }, assessmentData: {}, estimatedMinutes: undefined }),
      ]);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await LocalGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios[0].config).toEqual({ totalQuestions: 12, timeLimit: 15, passingScore: 60, domains: [] });
    });
  });
});