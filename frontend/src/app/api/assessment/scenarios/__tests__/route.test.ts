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

    it('should fallback to filesystem when no scenarios in database', async () => {
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
      (mockScenarioRepo.findActive as jest.Mock).mockResolvedValue([]);

      fsPromises.readdir.mockResolvedValue([
        { name: 'ai_literacy', isDirectory: () => true },
        { name: 'other_folder', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false },
      ]);

      const mockYamlContent = `
assessment_config:
  title: "AI Literacy Test"
  description: "Comprehensive AI assessment"
  total_questions: 20
  time_limit_minutes: 30
  passing_score: 75
  domains: ["AI_Ethics", "AI_Tools"]
`;
      fsPromises.readFile.mockResolvedValue(mockYamlContent);

      (mockScenarioRepo.create as jest.Mock).mockResolvedValue(createMockScenario({ id: 'new-scenario-1', title: { en: 'AI Literacy Test' } }));

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await LocalGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(1);
    });

    it('should handle language fallback for filesystem scenarios', async () => {
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
      (mockScenarioRepo.findActive as jest.Mock).mockResolvedValue([]);

      fsPromises.readdir.mockResolvedValue([
        { name: 'ai_literacy', isDirectory: () => true },
      ]);

      fsPromises.readFile
        .mockRejectedValueOnce(new Error('File not found'))
        .mockResolvedValueOnce(`config: { title: "English Title" }`);

      (mockScenarioRepo.create as jest.Mock).mockResolvedValue(createMockScenario({ id: 'new-scenario-1', title: { en: 'English Title' } }));

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios?lang=zh');
      const response = await LocalGET(request);
      expect(response.status).toBe(200);
      expect(fsPromises.readFile).toHaveBeenCalledTimes(2);
    });

    it('should skip folders without config files', async () => {
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
      (mockScenarioRepo.findActive as jest.Mock).mockResolvedValue([]);

      fsPromises.readdir.mockResolvedValue([
        { name: 'ai_literacy', isDirectory: () => true },
      ]);

      fsPromises.readFile.mockRejectedValue(new Error('File not found'));

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await LocalGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios).toHaveLength(0);
      expect(mockConsoleWarn).toHaveBeenCalled();
    });

    it('should use existing scenarios from filesystem cache', async () => {
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);

      const existingScenario = createMockScenario({
        id: 'existing-1',
        sourceMetadata: { configPath: 'assessment_data/ai_literacy/ai_literacy_questions_en.yaml' },
        title: { en: 'Existing Assessment' },
        description: { en: 'Already in DB' },
      });
      (mockScenarioRepo.findActive as jest.Mock).mockResolvedValue([existingScenario]);

      fsPromises.readdir.mockResolvedValue([
        { name: 'ai_literacy', isDirectory: () => true },
      ]);
      fsPromises.readFile.mockResolvedValue(`config:\n  title: "New Title"\n  description: "New Description"\n`);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await LocalGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios).toHaveLength(1);
    });

    it('should handle filesystem read errors', async () => {
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
      (mockScenarioRepo.findActive as jest.Mock).mockResolvedValue([]);

      const error = new Error('Permission denied');
      fsPromises.readdir.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await LocalGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toEqual([]);
    });

    it('should handle scenario creation errors', async () => {
      (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
      (mockScenarioRepo.findActive as jest.Mock).mockResolvedValue([]);

      fsPromises.readdir.mockResolvedValue([
        { name: 'ai_literacy', isDirectory: () => true },
      ]);
      fsPromises.readFile.mockResolvedValue(`config: { title: "Test" }`);

      const createError = new Error('Database error');
      (mockScenarioRepo.create as jest.Mock).mockRejectedValue(createError);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await LocalGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios).toEqual([]);
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