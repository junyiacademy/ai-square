/**
 * @jest-environment node
 */
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { jsonYamlLoader } from '@/lib/json-yaml-loader';

// Mock jsonYamlLoader
jest.mock('@/lib/json-yaml-loader', () => ({
  jsonYamlLoader: {
    load: jest.fn()
  }
}));

// Mock NextRequest for Node.js environment
const createMockRequest = (url: string): NextRequest => {
  const mockUrl = new URL(url);
  return {
    url,
    method: 'GET',
    headers: new Headers(),
    nextUrl: mockUrl,
    cookies: {
      get: jest.fn(),
      getAll: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      has: jest.fn(),
      clear: jest.fn(),
    },
    geo: {},
    ip: undefined,
    bodyUsed: false,
    cache: 'default',
    credentials: 'same-origin',
    destination: '',
    integrity: '',
    mode: 'cors',
    redirect: 'follow',
    referrer: '',
    referrerPolicy: '',
    signal: new AbortController().signal,
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
    clone: jest.fn(),
    formData: jest.fn(),
    json: jest.fn(),
    text: jest.fn(),
    body: null,
    // Additional NextRequest specific properties
    page: undefined,
    ua: undefined,
  } as unknown as NextRequest;
};

const mockJsonYamlLoader = jsonYamlLoader as jest.Mocked<typeof jsonYamlLoader>;

describe('/api/ksa route', () => {
  const mockYamlData = {
    knowledge_codes: {
      description: 'Knowledge description',
      description_zhTW: '知識描述',
      themes: {
        'Theme1': {
          explanation: 'Theme explanation',
          explanation_zhTW: '主題解釋',
          codes: {
            'K1.1': {
              summary: 'Code summary',
              summary_zhTW: '代碼摘要'
            }
          }
        }
      }
    },
    skill_codes: {
      description: 'Skills description',
      description_zhTW: '技能描述',
      themes: {
        'SkillTheme': {
          explanation: 'Skill explanation',
          explanation_zhTW: '技能解釋',
          codes: {
            'S1.1': {
              summary: 'Skill summary',
              summary_zhTW: '技能摘要',
              questions: ['Question 1', 'Question 2'],
              questions_zhTW: ['問題1', '問題2']
            }
          }
        }
      }
    },
    attitude_codes: {
      description: 'Attitudes description',
      description_zhTW: '態度描述',
      themes: {
        'AttitudeTheme': {
          explanation: 'Attitude explanation',
          explanation_zhTW: '態度解釋',
          codes: {
            'A1.1': {
              summary: 'Attitude summary',
              summary_zhTW: '態度摘要'
            }
          }
        }
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockJsonYamlLoader.load.mockResolvedValue(mockYamlData);
  });

  describe('Language Parameter Handling', () => {
    it('should default to English when no language parameter is provided', async () => {
      const request = createMockRequest('http://localhost:3000/api/ksa');
      
      const response = await GET(request);
      const data = await response.json();

      expect(mockJsonYamlLoader.load).toHaveBeenCalledWith('ksa_codes', { preferJson: true });
      expect(data.knowledge_codes.description).toBe('Knowledge description');
      expect(data.knowledge_codes.themes.Theme1.explanation).toBe('Theme explanation');
    });

    it('should return Chinese translations when lang=zhTW is provided', async () => {
      const request = createMockRequest('http://localhost:3000/api/ksa?lang=zhTW');
      
      const response = await GET(request);
      const data = await response.json();

      expect(mockJsonYamlLoader.load).toHaveBeenCalledWith('ksa_codes_zhTW', { preferJson: true });
      expect(data.knowledge_codes.description).toBe('Knowledge description');
      expect(data.knowledge_codes.themes.Theme1.explanation).toBe('Theme explanation');
      expect(data.knowledge_codes.themes.Theme1.codes['K1.1'].summary).toBe('Code summary');
    });

    it('should fallback to English when translation is not available', async () => {
      const request = createMockRequest('http://localhost:3000/api/ksa?lang=fr');
      
      const response = await GET(request);
      const data = await response.json();

      expect(mockJsonYamlLoader.load).toHaveBeenCalledWith('ksa_codes_fr', { preferJson: true });
      // Should fallback to English when French translation is not available
      expect(data.knowledge_codes.description).toBe('Knowledge description');
      expect(data.knowledge_codes.themes.Theme1.explanation).toBe('Theme explanation');
    });
  });

  describe('Data Structure Processing', () => {
    it('should process all three sections correctly', async () => {
      const request = createMockRequest('http://localhost:3000/api/ksa');
      
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('knowledge_codes');
      expect(data).toHaveProperty('skill_codes');
      expect(data).toHaveProperty('attitude_codes');

      // Check structure of each section
      expect(data.knowledge_codes).toHaveProperty('description');
      expect(data.knowledge_codes).toHaveProperty('themes');
      expect(data.skill_codes).toHaveProperty('description');
      expect(data.skill_codes).toHaveProperty('themes');
      expect(data.attitude_codes).toHaveProperty('description');
      expect(data.attitude_codes).toHaveProperty('themes');
    });

    it('should include questions for skills codes when present', async () => {
      const request = createMockRequest('http://localhost:3000/api/ksa');
      
      const response = await GET(request);
      const data = await response.json();

      const skillCode = data.skill_codes.themes.SkillTheme.codes['S1.1'];
      expect(skillCode).toHaveProperty('questions');
      expect(skillCode.questions).toEqual(['Question 1', 'Question 2']);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 error when file reading fails', async () => {
      mockJsonYamlLoader.load.mockRejectedValue(new Error('File not found'));

      const request = createMockRequest('http://localhost:3000/api/ksa');
      
      const response = await GET(request);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Failed to load KSA data');
    });
  });
});