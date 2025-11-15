import { GET } from '../route';
import { jsonYamlLoader } from '@/lib/json-yaml-loader';
import { cacheService } from '@/lib/cache/cache-service';

// Mock dependencies
jest.mock('../../../../lib/json-yaml-loader');
jest.mock('../../../../lib/cache/cache-service');

// Mock NextRequest
class MockNextRequest {
  url: string;
  private _nextUrl: URL;

  constructor(url: string) {
    this.url = url;
    this._nextUrl = new URL(url);
  }

  get nextUrl() {
    return {
      searchParams: this._nextUrl.searchParams,
      pathname: this._nextUrl.pathname,
      href: this._nextUrl.href
    };
  }
}

const mockJsonYamlLoader = jsonYamlLoader as jest.Mocked<typeof jsonYamlLoader>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

const mockDomainsData = {
  domains: {
    engaging_with_ai: {
      overview: 'Overview of engaging with AI',
      overview_zhTW: '與 AI 互動概述',
      overview_es: 'Descripción general de interactuar con IA',
      emoji: '💬',
      competencies: {
        ai_literacy: {
          description: 'Understanding AI capabilities',
          description_zhTW: '理解 AI 能力',
          description_es: 'Comprensión de las capacidades de IA',
          knowledge: ['K1.1', 'K1.2'],
          skills: ['S1.1'],
          attitudes: ['A1.1'],
          scenarios: ['scenario1', 'scenario2'],
          scenarios_zhTW: ['情境1', '情境2'],
          content: 'Content about AI literacy',
          content_zhTW: '關於 AI 素養的內容'
        }
      }
    },
    creating_with_ai: {
      overview: 'Overview of creating with AI',
      overview_zhTW: '與 AI 共創概述',
      emoji: '🎨',
      competencies: {
        creative_collaboration: {
          description: 'Collaborating creatively with AI',
          description_zhTW: '與 AI 創意合作',
          knowledge: ['K2.1'],
          skills: ['S2.1'],
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
        theme_zhTW: '理解 AI',
        explanation: 'Basic understanding of AI systems',
        explanation_zhTW: '對 AI 系統的基本理解',
        codes: {
          'K1.1': {
            summary: 'Know what AI is',
            summary_zhTW: '知道什麼是 AI'
          },
          'K1.2': {
            summary: 'Understand AI limitations',
            summary_zhTW: '理解 AI 的限制'
          }
        }
      },
      ai_capabilities: {
        theme: 'AI Capabilities',
        codes: {
          'K2.1': {
            summary: 'Know AI creative tools',
            summary_zhTW: '了解 AI 創意工具'
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
            summary_zhTW: '與 AI 有效溝通'
          }
        }
      },
      creation: {
        theme: 'Creation',
        codes: {
          'S2.1': {
            summary: 'Use AI for creative tasks',
            summary_zhTW: '使用 AI 進行創意任務'
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
            summary_zhTW: '對 AI 協助持開放態度'
          }
        }
      },
      collaboration: {
        theme: 'Collaboration',
        codes: {
          'A2.1': {
            summary: 'Value AI as partner',
            summary_zhTW: '將 AI 視為合作夥伴'
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
    mockJsonYamlLoader.load.mockImplementation((filename: string) => {
      if (filename.includes('ai_lit_domains')) return Promise.resolve(mockDomainsData);
      if (filename.includes('ksa_codes')) return Promise.resolve(mockKsaData);
      return Promise.resolve({});
    });
  });

  describe('successful responses', () => {
    it('returns relations data for English', async () => {
      const request = new MockNextRequest('http://localhost/api/relations?lang=en') as any;
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.domains).toHaveLength(2);
      expect(data.domains[0].name).toBe('engaging with ai');
      expect(data.domains[0].overview).toBe('Overview of engaging with AI');
      expect(data.domains[0].competencies[0].description).toBe('Understanding AI capabilities');
      expect(data.kMap['K1.1'].summary).toBe('Know what AI is');
      expect(data.sMap['S1.1'].summary).toBe('Communicate effectively with AI');
      expect(data.aMap['A1.1'].summary).toBe('Open to AI assistance');
    });

    it('returns translated data for Chinese', async () => {
      // For Chinese, it loads different YAML files
      const mockChineseDomainsData = {
        domains: {
          engaging_with_ai: {
            overview: '與 AI 互動概述',
            emoji: '💬',
            competencies: {
              ai_literacy: {
                description: '理解 AI 能力',
                knowledge: ['K1.1', 'K1.2'],
                skills: ['S1.1'],
                attitudes: ['A1.1'],
                scenarios: ['情境1', '情境2'],
                content: '關於 AI 素養的內容'
              }
            }
          }
        }
      };

      const mockChineseKsaData = {
        knowledge_codes: {
          themes: {
            understanding_ai: {
              theme: '理解 AI',
              explanation: '對 AI 系統的基本理解',
              codes: {
                'K1.1': {
                  summary: '知道什麼是 AI'
                }
              }
            }
          }
        },
        skill_codes: { themes: {} },
        attitude_codes: { themes: {} }
      };

      mockJsonYamlLoader.load.mockImplementation((filename: string) => {
        if (filename.includes('ai_lit_domains_zhTW')) return Promise.resolve(mockChineseDomainsData);
        if (filename.includes('ksa_codes_zhTW')) return Promise.resolve(mockChineseKsaData);
        return Promise.resolve({});
      });

      const request = new MockNextRequest('http://localhost/api/relations?lang=zhTW') as any;
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.domains[0].overview).toBe('與 AI 互動概述');
      expect(data.domains[0].competencies[0].description).toBe('理解 AI 能力');
      expect(data.domains[0].competencies[0].scenarios).toEqual(['情境1', '情境2']);
      expect(data.domains[0].competencies[0].context).toBe('關於 AI 素養的內容');
      expect(data.kMap['K1.1'].summary).toBe('知道什麼是 AI');
    });

    it('returns translated data for Spanish', async () => {
      const mockSpanishDomainsData = {
        domains: {
          engaging_with_ai: {
            overview: 'Descripción general de interactuar con IA',
            emoji: '💬',
            competencies: {
              ai_literacy: {
                description: 'Comprensión de las capacidades de IA',
                knowledge: ['K1.1'],
                skills: ['S1.1'],
                attitudes: ['A1.1']
              }
            }
          }
        }
      };

      mockJsonYamlLoader.load.mockImplementation((filename: string) => {
        if (filename.includes('ai_lit_domains_es')) return Promise.resolve(mockSpanishDomainsData);
        if (filename.includes('ksa_codes_es')) return Promise.resolve(mockKsaData);
        return Promise.resolve({});
      });

      const request = new MockNextRequest('http://localhost/api/relations?lang=es') as any;
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.domains[0].overview).toBe('Descripción general de interactuar con IA');
      expect(data.domains[0].competencies[0].description).toBe('Comprensión de las capacidades de IA');
    });

    it('falls back to English for missing translations', async () => {
      const request = new MockNextRequest('http://localhost/api/relations?lang=fr') as any;
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.domains[0].overview).toBe('Overview of engaging with AI');
      expect(data.domains[1].competencies[0].description).toBe('Collaborating creatively with AI');
    });

    it('defaults to English when no language parameter', async () => {
      const request = new MockNextRequest('http://localhost/api/relations') as any;
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

      const request = new MockNextRequest('http://localhost/api/relations?lang=en') as any;
      const response = await GET(request);
      const data = await response.json();

      expect(mockCacheService.get).toHaveBeenCalledWith('relations-en');
      expect(mockJsonYamlLoader.load).not.toHaveBeenCalled();
      expect(data).toEqual(cachedData);
      // Note: The route doesn't set X-Cache headers
    });

    it('fetches and caches data when cache miss', async () => {
      const request = new MockNextRequest('http://localhost/api/relations?lang=en') as any;
      const response = await GET(request);
      await response.json();

      expect(mockCacheService.get).toHaveBeenCalledWith('relations-en');
      expect(mockJsonYamlLoader.load).toHaveBeenCalledWith('rubrics_data/ai_lit_domains/ai_lit_domains_en', { preferJson: false });
      expect(mockJsonYamlLoader.load).toHaveBeenCalledWith('rubrics_data/ksa_codes/ksa_codes_en', { preferJson: false });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'relations-en',
        expect.any(Object),
        { ttl: 5 * 60 * 1000 }
      );
      // Note: The route doesn't set X-Cache headers
    });
  });

  describe('data processing', () => {
    it('correctly maps competencies with all fields', async () => {
      const request = new MockNextRequest('http://localhost/api/relations?lang=en') as any;
      const response = await GET(request);
      const data = await response.json();

      const competency = data.domains[0].competencies[0];
      expect(competency).toEqual({
        id: 'ai_literacy',
        description: 'Understanding AI capabilities',
        knowledge: ['K1.1', 'K1.2'],
        skills: ['S1.1'],
        attitudes: ['A1.1'],
        scenarios: ['scenario1', 'scenario2'],
        context: 'Content about AI literacy'
      });
    });

    it('includes theme and explanation in KSA maps', async () => {
      const request = new MockNextRequest('http://localhost/api/relations?lang=en') as any;
      const response = await GET(request);
      const data = await response.json();

      expect(data.kMap['K1.1']).toEqual({
        summary: 'Know what AI is',
        theme: 'Understanding AI',
        explanation: 'Basic understanding of AI systems'
      });
    });

    it('handles missing optional fields gracefully', async () => {
      const request = new MockNextRequest('http://localhost/api/relations?lang=en') as any;
      const response = await GET(request);
      const data = await response.json();

      const competency = data.domains[1].competencies[0];
      expect(competency.scenarios).toBeUndefined();
      expect(competency.context).toBeUndefined();
    });

    it('preserves emoji in domain data', async () => {
      const request = new MockNextRequest('http://localhost/api/relations?lang=en') as any;
      const response = await GET(request);
      const data = await response.json();

      expect(data.domains[0].emoji).toBe('💬');
      expect(data.domains[1].emoji).toBe('🎨');
    });
  });

  // Note: The route implementation doesn't set custom headers like Cache-Control
});
