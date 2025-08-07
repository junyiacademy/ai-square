import { mockRepositoryFactory } from '@/test-utils/mocks/repositories';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { cacheService } from '@/lib/cache/cache-service';
import { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';
import { createMockScenarioRepository, createMockScenario } from '@/test-utils/mocks/repository-helpers';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/cache/cache-service');

// Mock console
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = createMockConsoleError();

describe('/api/assessment', () => {
  const mockScenarioRepo = createMockScenarioRepository();

  const mockAssessmentScenario = createMockScenario({
    id: 'scenario-123',
    mode: 'assessment',
    status: 'active',
    title: { en: 'AI Literacy Assessment', zh: 'AI素養評估' },
    description: { en: 'Test your AI knowledge', zh: '測試您的AI知識' },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup repository factory mock
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(mockScenarioRepo);
    
    // Setup cache service mock
    (cacheService.get as jest.Mock).mockResolvedValue(null);
    (cacheService.set as jest.Mock).mockResolvedValue(undefined);
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should return assessment data successfully', async () => {
    (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([mockAssessmentScenario]);

    const request = new NextRequest('http://localhost:3000/api/assessment');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('assessment_config');
    expect(data.assessment_config).toMatchObject({
      total_questions: 12,
      time_limit_minutes: 15,
      passing_score: 60,
    });
    expect(data).toHaveProperty('domains');
    expect(data).toHaveProperty('questions');
    expect(data.questions).toHaveLength(1);
  });

  it('should return cached data when available', async () => {
    const cachedData = {
      assessment_config: { total_questions: 10 },
      domains: {},
      questions: [],
    };

    (cacheService.get as jest.Mock).mockResolvedValue(cachedData);

    const request = new NextRequest('http://localhost:3000/api/assessment');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Cache')).toBe('HIT');
    expect(data).toEqual(cachedData);
    expect(mockScenarioRepo.findByMode).not.toHaveBeenCalled();
  });

  it('should support language parameter', async () => {
    (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([mockAssessmentScenario]);

    const request = new NextRequest('http://localhost:3000/api/assessment?lang=zh');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(cacheService.get).toHaveBeenCalledWith('assessment:zh');
  });

  it('should return 404 when no assessment scenarios found', async () => {
    (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/assessment');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No assessment scenarios found');
  });

  it('should handle missing findByMode method', async () => {
    // Create a mock without findByMode
    const incompleteRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySourcePath: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    };
    (repositoryFactory.getScenarioRepository as jest.Mock).mockReturnValue(incompleteRepo);

    const request = new NextRequest('http://localhost:3000/api/assessment');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No assessment scenarios found');
  });

  it('should prefer active scenarios', async () => {
    const inactiveScenario = { ...mockAssessmentScenario, id: 'inactive-1', status: 'draft' };
    const activeScenario = { ...mockAssessmentScenario, id: 'active-1', status: 'active' };
    
    (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([inactiveScenario, activeScenario]);

    const request = new NextRequest('http://localhost:3000/api/assessment');
    await GET(request);

    expect(mockConsoleLog).toHaveBeenCalledWith(
      'Loading assessment data from database for scenario: active-1'
    );
  });

  it('should handle malformed assessment data', async () => {
    const malformedScenario = {
      ...mockAssessmentScenario,
      assessmentData: null,
    };

    (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([malformedScenario]);

    const request = new NextRequest('http://localhost:3000/api/assessment');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should have default values
    expect(data.assessment_config.total_questions).toBe(20);
    expect(data.assessment_config.time_limit_minutes).toBe(30);
    expect(data.assessment_config.passing_score).toBe(70);
  });

  it('should set proper cache headers', async () => {
    (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([mockAssessmentScenario]);

    const request = new NextRequest('http://localhost:3000/api/assessment');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=3600, stale-while-revalidate=86400'
    );
    expect(response.headers.get('X-Cache')).toBe('MISS');
    
    // Verify data was cached
    expect(cacheService.set).toHaveBeenCalledWith(
      'assessment:en',
      expect.any(Object),
      { ttl: 60 * 60 * 1000 }
    );
  });

  it('should handle repository errors gracefully', async () => {
    const error = new Error('Database error');
    (mockScenarioRepo.findByMode as jest.Mock).mockRejectedValue(error);

    const request = new NextRequest('http://localhost:3000/api/assessment');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to load assessment data');
    expect(mockConsoleError).toHaveBeenCalledWith('Error loading assessment data:', error);
  });

  it('should transform questions for different languages', async () => {
    const multilingualScenario = {
      ...mockAssessmentScenario,
      assessmentData: {
        ...mockAssessmentScenario.assessmentData,
        questions: {
          en: [
            {
              id: 'Q001',
              domain: 'engaging_with_ai',
              type: 'multiple_choice',
              question: 'What is machine learning?',
              options: [
                { id: 'a', text: 'A type of AI' },
                { id: 'b', text: 'A programming language' },
                { id: 'c', text: 'A database' },
                { id: 'd', text: 'A hardware device' },
              ],
              correct_answer: 'a',
            },
          ],
          zh: [
            {
              id: 'Q001',
              domain: 'engaging_with_ai',
              type: 'multiple_choice',
              question: '什麼是機器學習？',
              options: [
                { id: 'a', text: '一種AI技術' },
                { id: 'b', text: '一種程式語言' },
                { id: 'c', text: '一個資料庫' },
                { id: 'd', text: '一個硬體設備' },
              ],
              correct_answer: 'a',
            },
          ],
          es: [
            {
              id: 'Q001',
              domain: 'engaging_with_ai',
              type: 'multiple_choice',
              question: '¿Qué es el aprendizaje automático?',
              options: [
                { id: 'a', text: 'Un tipo de IA' },
                { id: 'b', text: 'Un lenguaje de programación' },
                { id: 'c', text: 'Una base de datos' },
                { id: 'd', text: 'Un dispositivo de hardware' },
              ],
              correct_answer: 'a',
            },
          ],
        },
      },
    };

    (mockScenarioRepo.findByMode as jest.Mock).mockResolvedValue([multilingualScenario]);

    // Test Chinese
    const requestZh = new NextRequest('http://localhost:3000/api/assessment?lang=zh');
    const responseZh = await GET(requestZh);
    const dataZh = await responseZh.json();

    expect(dataZh.questions[0].question).toBeDefined();
    expect(dataZh.questions[0].options).toBeDefined();

    // Test Spanish
    const requestEs = new NextRequest('http://localhost:3000/api/assessment?lang=es');
    const responseEs = await GET(requestEs);
    const dataEs = await responseEs.json();

    expect(dataEs.questions[0].question).toBeDefined();
    expect(dataEs.questions[0].options).toBeDefined();
  });
});

/**
 * Assessment API Considerations:
 * 
 * 1. Data Source:
 *    - Loads from database via repository
 *    - Falls back to default values if data missing
 * 
 * 2. Caching:
 *    - Caches assessment data for 1 hour
 *    - Language-specific cache keys
 * 
 * 3. Multi-language Support:
 *    - Transforms questions based on language parameter
 *    - Falls back to English if translation missing
 * 
 * 4. Scenario Selection:
 *    - Prefers active scenarios
 *    - Uses first available if no active found
 */