import { GET } from '../route';
import { promises as fs } from 'fs';
import * as yaml from 'js-yaml';
import { cacheService } from '@/lib/cache/cache-service';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('js-yaml');
jest.mock('../../../../../lib/cache/cache-service');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockYaml = yaml as jest.Mocked<typeof yaml>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

const mockScenarioData = {
  scenario_info: {
    id: 'ai-job-search',
    title: 'AI-Powered Job Search Assistant',
    title_zh: 'AI 求職助手',
    title_ja: 'AI就職活動アシスタント',
    title_ko: 'AI 구직 도우미',
    title_es: 'Asistente de Búsqueda de Empleo con IA',
    title_fr: 'Assistant de Recherche d\'Emploi IA',
    title_de: 'KI-gestützter Jobsuche-Assistent',
    title_ru: 'AI-помощник по поиску работы',
    title_it: 'Assistente di Ricerca Lavoro con IA',
    description: 'Learn to use AI for job searching',
    description_zh: '學習使用 AI 進行求職',
    description_ja: 'AIを使った就職活動を学ぶ',
    description_ko: 'AI를 사용한 구직 활동 배우기',
    description_es: 'Aprende a usar IA para buscar empleo',
    description_fr: 'Apprenez à utiliser l\'IA pour chercher un emploi',
    description_de: 'Lernen Sie, KI für die Jobsuche zu nutzen',
    description_ru: 'Научитесь использовать ИИ для поиска работы',
    description_it: 'Impara a usare l\'IA per cercare lavoro',
    difficulty: 'intermediate',
    estimated_duration: 90,
    target_domains: ['engaging_with_ai', 'creating_with_ai']
  }
};

describe('/api/pbl/scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
  });

  describe('successful responses', () => {
    beforeEach(() => {
      mockFs.readFile.mockResolvedValue(Buffer.from('mock yaml content'));
      mockYaml.load.mockReturnValue(mockScenarioData);
    });

    it('returns scenarios data for English', async () => {
      const request = new Request('http://localhost/api/pbl/scenarios?lang=en');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(3); // 1 from YAML + 2 placeholders
      
      const firstScenario = data.data.scenarios[0];
      expect(firstScenario.id).toBe('ai-job-search');
      expect(firstScenario.title).toBe('AI-Powered Job Search Assistant');
      expect(firstScenario.description).toBe('Learn to use AI for job searching');
      expect(firstScenario.isAvailable).toBe(true);
      expect(firstScenario.thumbnailEmoji).toBe('💼');
    });

    it('returns translated data for Chinese', async () => {
      const request = new Request('http://localhost/api/pbl/scenarios?lang=zh-TW');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const firstScenario = data.data.scenarios[0];
      expect(firstScenario.title).toBe('AI 求職助手');
      expect(firstScenario.description).toBe('學習使用 AI 進行求職');
    });

    it('returns translated data for Japanese', async () => {
      const request = new Request('http://localhost/api/pbl/scenarios?lang=ja');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const firstScenario = data.data.scenarios[0];
      expect(firstScenario.title).toBe('AI就職活動アシスタント');
      expect(firstScenario.description).toBe('AIを使った就職活動を学ぶ');
    });

    it('returns translated data for Korean', async () => {
      const request = new Request('http://localhost/api/pbl/scenarios?lang=ko');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const firstScenario = data.data.scenarios[0];
      expect(firstScenario.title).toBe('AI 구직 도우미');
      expect(firstScenario.description).toBe('AI를 사용한 구직 활동 배우기');
    });

    it('returns translated data for Spanish', async () => {
      const request = new Request('http://localhost/api/pbl/scenarios?lang=es');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const firstScenario = data.data.scenarios[0];
      expect(firstScenario.title).toBe('Asistente de Búsqueda de Empleo con IA');
      expect(firstScenario.description).toBe('Aprende a usar IA para buscar empleo');
    });

    it('includes placeholder scenarios with correct translations', async () => {
      const request = new Request('http://localhost/api/pbl/scenarios?lang=zh-TW');
      const response = await GET(request);
      const data = await response.json();

      const placeholderScenarios = data.data.scenarios.filter((s: any) => !s.isAvailable);
      expect(placeholderScenarios).toHaveLength(2);
      
      const creativeWriting = placeholderScenarios.find((s: any) => s.id === 'ai-creative-writing');
      expect(creativeWriting.title).toBe('使用 AI 進行創意寫作');
      expect(creativeWriting.description).toBe('掌握 AI 驅動的創意寫作技巧');
      expect(creativeWriting.thumbnailEmoji).toBe('✍️');
    });

    it('defaults to English when no language parameter', async () => {
      const request = new Request('http://localhost/api/pbl/scenarios');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const firstScenario = data.data.scenarios[0];
      expect(firstScenario.title).toBe('AI-Powered Job Search Assistant');
    });

    it('includes meta information in response', async () => {
      const request = new Request('http://localhost/api/pbl/scenarios?lang=en');
      const response = await GET(request);
      const data = await response.json();

      expect(data.meta).toBeDefined();
      expect(data.meta.timestamp).toBeDefined();
      expect(data.meta.version).toBe('1.0.0');
      expect(data.data.total).toBe(3);
      expect(data.data.available).toBe(1);
    });
  });

  describe('error handling', () => {
    it('handles file read errors gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const request = new Request('http://localhost/api/pbl/scenarios?lang=en');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(2); // Only placeholder scenarios
    });

    it('handles YAML parsing errors gracefully', async () => {
      mockFs.readFile.mockResolvedValue(Buffer.from('invalid yaml'));
      mockYaml.load.mockImplementation(() => {
        throw new Error('Invalid YAML');
      });

      const request = new Request('http://localhost/api/pbl/scenarios?lang=en');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(2); // Only placeholder scenarios
    });

    it('handles missing scenario_info in YAML', async () => {
      mockFs.readFile.mockResolvedValue(Buffer.from('valid yaml'));
      mockYaml.load.mockReturnValue({ some_other_data: {} });

      const request = new Request('http://localhost/api/pbl/scenarios?lang=en');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.scenarios).toHaveLength(2); // Only placeholder scenarios
    });

    it('returns error response for unexpected errors', async () => {
      // Mock console.error to avoid noise in test output
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      // Force an error by making the function throw
      jest.spyOn(global, 'URL').mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const request = new Request('http://localhost/api/pbl/scenarios?lang=en');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FETCH_SCENARIOS_ERROR');
      expect(data.error.message).toBe('Failed to fetch PBL scenarios');

      consoleError.mockRestore();
    });
  });

  describe('caching behavior', () => {
    beforeEach(() => {
      mockFs.readFile.mockResolvedValue(Buffer.from('mock yaml content'));
      mockYaml.load.mockReturnValue(mockScenarioData);
    });

    it('returns cached data when available', async () => {
      const cachedData = {
        success: true,
        data: { scenarios: [], total: 0, available: 0 },
        meta: { timestamp: '2024-01-01', version: '1.0.0' }
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      const request = new Request('http://localhost/api/pbl/scenarios?lang=en');
      const response = await GET(request);
      const data = await response.json();

      expect(mockCacheService.get).toHaveBeenCalledWith('pbl:scenarios:en');
      expect(mockFs.readFile).not.toHaveBeenCalled();
      expect(data).toEqual(cachedData);
      expect(response.headers.get('X-Cache')).toBe('HIT');
    });

    it('fetches and caches data when cache miss', async () => {
      const request = new Request('http://localhost/api/pbl/scenarios?lang=en');
      const response = await GET(request);
      await response.json();

      expect(mockCacheService.get).toHaveBeenCalledWith('pbl:scenarios:en');
      expect(mockFs.readFile).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'pbl:scenarios:en',
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
          meta: expect.any(Object)
        }),
        { ttl: 60 * 60 * 1000 }
      );
      expect(response.headers.get('X-Cache')).toBe('MISS');
    });
  });

  describe('headers', () => {
    beforeEach(() => {
      mockFs.readFile.mockResolvedValue(Buffer.from('mock yaml content'));
      mockYaml.load.mockReturnValue(mockScenarioData);
    });

    it('sets appropriate cache control headers', async () => {
      const request = new Request('http://localhost/api/pbl/scenarios?lang=en');
      const response = await GET(request);

      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600, stale-while-revalidate=86400');
    });
  });
});