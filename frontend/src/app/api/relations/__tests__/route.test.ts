import { GET } from '../route';
import { contentService } from '@/lib/cms/content-service';
import { cacheService } from '@/lib/cache/cache-service';

// Mock dependencies
jest.mock('../../../../lib/cms/content-service');
jest.mock('../../../../lib/cache/cache-service');

const mockContentService = contentService as jest.Mocked<typeof contentService>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

const mockDomainsData = {
  domains: {
    engaging_with_ai: {
      overview: 'Overview of engaging with AI',
      overview_zh: '與 AI 互動概述',
      overview_es: 'Descripción general de interactuar con IA',
      emoji: '💬',
      competencies: {
        ai_literacy: {
          description: 'Understanding AI capabilities',
          description_zh: '理解 AI 能力',
          description_es: 'Comprensión de las capacidades de IA',
          knowledge: ['K1.1', 'K1.2'],
          skills: ['S1.1'],
          attitudes: ['A1.1'],
          scenarios: ['scenario1', 'scenario2'],
          scenarios_zh: ['情境1', '情境2'],
          content: 'Content about AI literacy',
          content_zh: '關於 AI 素養的內容'
        }
      }
    },
    creating_with_ai: {
      overview: 'Overview of creating with AI',
      overview_zh: '與 AI 共創概述',
      emoji: '🎨',
      competencies: {
        creative_collaboration: {
          description: 'Collaborating creatively with AI',
          description_zh: '與 AI 創意合作',
          knowledge: ['K2.1'],
          skills: ['S2.1', 'S2.2'],
          attitudes: ['A2.1']
        }
      }
    }
  }
};

const mockKsaData = {
  knowledge_codes: {
    themes: {
      understanding_ai: {
        theme: 'Understanding AI',
        theme_zh: '理解 AI',
        explanation: 'Basic understanding of AI systems',
        explanation_zh: '對 AI 系統的基本理解',
        codes: {
          'K1.1': {
            summary: 'Know what AI is',
            summary_zh: '知道什麼是 AI'
          },
          'K1.2': {
            summary: 'Understand AI limitations',
            summary_zh: '理解 AI 的限制'
          }
        }
      },
      ai_capabilities: {
        theme: 'AI Capabilities',
        codes: {
          'K2.1': {
            summary: 'Know AI creative tools',
            summary_zh: '了解 AI 創意工具'
          }
        }
      }
    }
  },
  skill_codes: {
    themes: {
      communication: {
        theme: 'Communication',
        codes: {
          'S1.1': {
            summary: 'Communicate effectively with AI',
            summary_zh: '與 AI 有效溝通'
          }
        }
      },
      creation: {
        theme: 'Creation',
        codes: {
          'S2.1': {
            summary: 'Use AI for creative tasks',
            summary_zh: '使用 AI 進行創意任務'
          },
          'S2.2': {
            summary: 'Iterate with AI feedback',
            summary_zh: '根據 AI 反饋進行迭代'
          }
        }
      }
    }
  },
  attitude_codes: {
    themes: {
      openness: {
        theme: 'Openness',
        codes: {
          'A1.1': {
            summary: 'Open to AI assistance',
            summary_zh: '對 AI 協助持開放態度'
          }
        }
      },
      collaboration: {
        theme: 'Collaboration',
        codes: {
          'A2.1': {
            summary: 'Value AI as partner',
            summary_zh: '將 AI 視為合作夥伴'
          }
        }
      }
    }
  }
};

describe('/api/relations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheService.get.mockResolvedValue(null);
    mockCacheService.set.mockResolvedValue(undefined);
    mockContentService.getContent.mockImplementation((type: string) => {
      if (type === 'domain') return Promise.resolve(mockDomainsData);
      if (type === 'ksa') return Promise.resolve(mockKsaData);
      return Promise.resolve({});
    });
  });

  describe('successful responses', () => {
    it('returns relations data for English', async () => {
      const request = new Request('http://localhost/api/relations?lang=en') as any;
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.domains).toHaveLength(2);
      expect(data.domains[0].overview).toBe('Overview of engaging with AI');
      expect(data.domains[0].competencies[0].description).toBe('Understanding AI capabilities');
      expect(data.kMap['K1.1'].summary).toBe('Know what AI is');
      expect(data.sMap['S1.1'].summary).toBe('Communicate effectively with AI');
      expect(data.aMap['A1.1'].summary).toBe('Open to AI assistance');
    });

    it('returns translated data for Chinese', async () => {
      const request = new Request('http://localhost/api/relations?lang=zh-TW') as any;
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.domains[0].overview).toBe('與 AI 互動概述');
      expect(data.domains[0].competencies[0].description).toBe('理解 AI 能力');
      expect(data.domains[0].competencies[0].scenarios).toEqual(['情境1', '情境2']);
      expect(data.domains[0].competencies[0].content).toBe('關於 AI 素養的內容');
      expect(data.kMap['K1.1'].summary).toBe('知道什麼是 AI');
    });

    it('returns translated data for Spanish', async () => {
      const request = new Request('http://localhost/api/relations?lang=es') as any;
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.domains[0].overview).toBe('Descripción general de interactuar con IA');
      expect(data.domains[0].competencies[0].description).toBe('Comprensión de las capacidades de IA');
    });

    it('falls back to English for missing translations', async () => {
      const request = new Request('http://localhost/api/relations?lang=fr') as any;
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.domains[0].overview).toBe('Overview of engaging with AI');
      expect(data.domains[1].competencies[0].description).toBe('Collaborating creatively with AI');
    });

    it('defaults to English when no language parameter', async () => {
      const request = new Request('http://localhost/api/relations') as any;
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.domains[0].overview).toBe('Overview of engaging with AI');
    });
  });

  describe('caching behavior', () => {
    it('returns cached data when available', async () => {
      const cachedData = { domains: [], kMap: {}, sMap: {}, aMap: {} };
      mockCacheService.get.mockResolvedValue(cachedData);

      const request = new Request('http://localhost/api/relations?lang=en') as any;
      const response = await GET(request);
      const data = await response.json();

      expect(mockCacheService.get).toHaveBeenCalledWith('relations:en');
      expect(mockContentService.getContent).not.toHaveBeenCalled();
      expect(data).toEqual(cachedData);
      expect(response.headers.get('X-Cache')).toBe('HIT');
    });

    it('fetches and caches data when cache miss', async () => {
      const request = new Request('http://localhost/api/relations?lang=en') as any;
      const response = await GET(request);
      await response.json();

      expect(mockCacheService.get).toHaveBeenCalledWith('relations:en');
      expect(mockContentService.getContent).toHaveBeenCalledWith('domain', 'ai_lit_domains.yaml');
      expect(mockContentService.getContent).toHaveBeenCalledWith('ksa', 'ksa_codes.yaml');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'relations:en',
        expect.any(Object),
        { ttl: 60 * 60 * 1000 }
      );
      expect(response.headers.get('X-Cache')).toBe('MISS');
    });
  });

  describe('data processing', () => {
    it('correctly maps competencies with all fields', async () => {
      const request = new Request('http://localhost/api/relations?lang=en') as any;
      const response = await GET(request);
      const data = await response.json();

      const competency = data.domains[0].competencies[0];
      expect(competency).toEqual({
        key: 'ai_literacy',
        description: 'Understanding AI capabilities',
        knowledge: ['K1.1', 'K1.2'],
        skills: ['S1.1'],
        attitudes: ['A1.1'],
        scenarios: ['scenario1', 'scenario2'],
        content: 'Content about AI literacy'
      });
    });

    it('includes theme and explanation in KSA maps', async () => {
      const request = new Request('http://localhost/api/relations?lang=en') as any;
      const response = await GET(request);
      const data = await response.json();

      expect(data.kMap['K1.1']).toEqual({
        summary: 'Know what AI is',
        theme: 'understanding_ai',
        explanation: 'Basic understanding of AI systems'
      });
    });

    it('handles missing optional fields gracefully', async () => {
      const request = new Request('http://localhost/api/relations?lang=en') as any;
      const response = await GET(request);
      const data = await response.json();

      const competency = data.domains[1].competencies[0];
      expect(competency.scenarios).toEqual([]);
      expect(competency.content).toBe('');
    });

    it('preserves emoji in domain data', async () => {
      const request = new Request('http://localhost/api/relations?lang=en') as any;
      const response = await GET(request);
      const data = await response.json();

      expect(data.domains[0].emoji).toBe('💬');
      expect(data.domains[1].emoji).toBe('🎨');
    });
  });

  describe('headers', () => {
    it('sets appropriate cache control headers', async () => {
      const request = new Request('http://localhost/api/relations?lang=en') as any;
      const response = await GET(request);

      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600, stale-while-revalidate=86400');
    });
  });
});