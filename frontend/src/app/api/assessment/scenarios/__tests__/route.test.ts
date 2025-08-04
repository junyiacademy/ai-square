/**
 * Assessment Scenarios API Route Tests
 * 測試評估情境 API
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { getServerSession } from '@/lib/auth/session';
import { promises as fs } from 'fs';
import path from 'path';
import { mockConsoleError as createMockConsoleError, mockConsoleWarn as createMockConsoleWarn } from '@/test-utils/helpers/console';
import { createMockScenarioRepository, createMockScenario } from '@/test-utils/mocks/repository-helpers';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/auth/session');
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
  },
}));

// Mock console
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = createMockConsoleError();
const mockConsoleWarn = createMockConsoleWarn();

describe('/api/assessment/scenarios', () => {
  // Mock repositories
  const mockScenarioRepo = createMockScenarioRepository();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup repository factory mocks
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
    (getServerSession as jest.Mock).mockResolvedValue(null);
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
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
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue(mockDbScenarios);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(2);
      expect(data.data.scenarios[0]).toMatchObject({
        id: 'scenario-1',
        title: 'AI Literacy Assessment',
        description: 'Test your AI knowledge',
        folderName: 'ai_literacy',
        config: {
          totalQuestions: 15,
          timeLimit: 30,
          passingScore: 70,
          domains: ['engaging_with_ai', 'creating_with_ai'],
        },
      });
      expect(mockScenarioRepo.findByMode).toHaveBeenCalledWith('assessment');
    });

    it('should return scenarios with specified language', async () => {
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue(mockDbScenarios);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios?lang=zh');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios[0].title).toBe('AI 素養評估');
      expect(data.data.scenarios[0].description).toBe('測試您的 AI 知識');
    });

    it('should include user progress when authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com' },
      });

      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue(mockDbScenarios);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios[0].userProgress).toEqual({
        completedPrograms: 0,
        lastAttempt: undefined,
        bestScore: undefined,
      });
    });

    it('should fallback to filesystem when no scenarios in database', async () => {
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
      (mockScenarioRepo.findActive as jest.Mock).mockResolvedValue([]);

      // Mock filesystem operations
      (fs.readdir as jest.Mock).mockResolvedValue([
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

      (fs.readFile as jest.Mock).mockResolvedValue(mockYamlContent);

      (mockScenarioRepo.create as jest.Mock).mockResolvedValue(createMockScenario({
        id: 'new-scenario-1',
        mode: 'assessment',
        title: { en: 'AI Literacy Test' },
        description: { en: 'Comprehensive AI assessment' },
      }));

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(1); // Only ai_literacy folder is processed
      expect(data.data.scenarios[0]).toMatchObject({
        id: 'new-scenario-1',
        title: 'AI Literacy Test',
        description: 'Comprehensive AI assessment',
        folderName: 'ai_literacy',
        config: {
          totalQuestions: 20,
          timeLimit: 30,
          passingScore: 75,
          domains: ['AI_Ethics', 'AI_Tools'],
        },
      });

      expect(mockScenarioRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'assessment',
          status: 'active',
          sourceType: 'yaml',
          title: { en: 'AI Literacy Test' },
        })
      );
    });

    it('should handle language fallback for filesystem scenarios', async () => {
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
      (mockScenarioRepo.findActive as jest.Mock).mockResolvedValue([]);

      (fs.readdir as jest.Mock).mockResolvedValue([
        { name: 'ai_literacy', isDirectory: () => true },
      ]);

      // Mock language-specific file not found
      (fs.readFile as jest.Mock)
        .mockRejectedValueOnce(new Error('File not found')) // zh file
        .mockResolvedValueOnce(`config: { title: "English Title" }`); // en file

      (mockScenarioRepo.create as jest.Mock).mockResolvedValue(createMockScenario({
        id: 'new-scenario-1',
        title: { en: 'English Title' },
      }));

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios?lang=zh');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('ai_literacy_questions_zh.yaml'),
        'utf-8'
      );
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('ai_literacy_questions_en.yaml'),
        'utf-8'
      );
    });

    it('should skip folders without config files', async () => {
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
      (mockScenarioRepo.findActive as jest.Mock).mockResolvedValue([]);

      (fs.readdir as jest.Mock).mockResolvedValue([
        { name: 'ai_literacy', isDirectory: () => true },
      ]);

      // Test ai_literacy folder without config
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios).toHaveLength(0); // No scenarios created
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('No config found for ai_literacy'),
        expect.any(Error)
      );
    });

    it('should use existing scenarios from filesystem cache', async () => {
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
      
      // Mock existing scenario in findActive
      const existingScenario = createMockScenario({
        id: 'existing-1',
        sourceMetadata: { 
          configPath: 'assessment_data/ai_literacy/ai_literacy_questions_en.yaml' 
        },
        title: { en: 'Existing Assessment' },
        description: { en: 'Already in DB' },
      });
      
      (mockScenarioRepo.findActive as jest.Mock).mockResolvedValue([existingScenario]);

      (fs.readdir as jest.Mock).mockResolvedValue([
        { name: 'ai_literacy', isDirectory: () => true },
      ]);

      (fs.readFile as jest.Mock).mockResolvedValue(`
config:
  title: "New Title"
  description: "New Description"
`);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios).toHaveLength(1);
      expect(data.data.scenarios[0]).toMatchObject({
        id: 'existing-1',
        title: 'New Title', // Uses config title
        description: 'New Description',
      });
      expect(mockScenarioRepo.create).not.toHaveBeenCalled(); // Doesn't create new
    });

    it('should handle filesystem read errors', async () => {
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
      (mockScenarioRepo.findActive as jest.Mock).mockResolvedValue([]);

      const error = new Error('Permission denied');
      (fs.readdir as jest.Mock).mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toEqual([]);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error reading assessment directory:',
        error
      );
    });

    it('should handle scenario creation errors', async () => {
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);
      (mockScenarioRepo.findActive as jest.Mock).mockResolvedValue([]);

      (fs.readdir as jest.Mock).mockResolvedValue([
        { name: 'ai_literacy', isDirectory: () => true },
      ]);

      (fs.readFile as jest.Mock).mockResolvedValue(`config: { title: "Test" }`);

      const createError = new Error('Database error');
      (mockScenarioRepo.create as jest.Mock).mockRejectedValue(createError);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios).toEqual([]);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error processing folder ai_literacy:',
        createError
      );
    });

    it('should handle general API errors', async () => {
      const error = new Error('Unexpected error');
      (mockScenarioRepo.findByMode as jest.Mock).mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to load assessment scenarios');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error in assessment scenarios API:',
        error
      );
    });

    it('should handle default values for missing config fields', async () => {
      (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([
        createMockScenario({
          id: 'scenario-3',
          mode: 'assessment',
          title: { en: 'Basic Assessment' },
          description: { en: 'Simple test' },
          assessmentData: {}, // Empty assessment data
          estimatedMinutes: undefined, // Clear the default to test fallback
        }),
      ]);

      const request = new NextRequest('http://localhost:3000/api/assessment/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.scenarios[0].config).toEqual({
        totalQuestions: 12, // Default
        timeLimit: 15, // Default  
        passingScore: 60, // Default
        domains: [], // Default
      });
    });
  });
});

/**
 * Assessment Scenarios API Considerations:
 * 
 * 1. Data Sources:
 *    - Primary: PostgreSQL database
 *    - Fallback: Filesystem YAML files
 *    - Only processes 'ai_literacy' folder
 * 
 * 2. Language Support:
 *    - Tries language-specific files first
 *    - Falls back to English
 *    - Config overrides database values
 * 
 * 3. Scenario Creation:
 *    - Auto-creates from filesystem if missing
 *    - Caches by config path
 *    - Preserves existing scenarios
 * 
 * 4. User Progress:
 *    - Added when authenticated
 *    - Placeholder values for now
 *    - Future: Actual progress tracking
 * 
 * 5. Error Handling:
 *    - Graceful filesystem failures
 *    - Continues with partial data
 *    - Detailed error logging
 */