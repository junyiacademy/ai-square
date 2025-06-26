import { GET } from '../route';
import { readFile } from 'fs/promises';
import yaml from 'js-yaml';

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

// Mock yaml
jest.mock('js-yaml', () => ({
  load: jest.fn(),
}));

// Mock path to handle different OS paths
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/').replace(/\/\//g, '/')),
  basename: jest.fn((path) => path.split('/').pop()),
}));

const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockYamlLoad = yaml.load as jest.MockedFunction<typeof yaml.load>;

const mockAssessmentData = {
  assessment_config: {
    total_questions: 12,
    time_limit_minutes: 15,
    passing_score: 60,
    domains: ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai']
  },
  domains: {
    engaging_with_ai: {
      name: 'Engaging with AI',
      name_zh: '與 AI 互動',
      description: 'Understanding and effectively communicating with AI systems',
      questions: 3
    },
    creating_with_ai: {
      name: 'Creating with AI',
      name_zh: '與 AI 共創',
      description: 'Using AI tools to enhance creativity and productivity',
      questions: 3
    },
    managing_with_ai: {
      name: 'Managing with AI',
      name_zh: '與 AI 管理',
      description: 'Understanding AI limitations, privacy, and ethical considerations',
      questions: 3
    },
    designing_with_ai: {
      name: 'Designing with AI',
      name_zh: '與 AI 設計',
      description: 'Strategic thinking about AI implementation and innovation',
      questions: 3
    }
  },
  questions: [
    {
      id: 'E001',
      domain: 'engaging_with_ai',
      difficulty: 'basic',
      type: 'multiple_choice',
      question: 'What is the most effective way to get better results from an AI chatbot?',
      question_zh: '如何才能從 AI 聊天機器人獲得更好的結果？',
      options: {
        a: 'Ask very general questions',
        b: 'Provide clear, specific prompts with context',
        c: 'Use only yes/no questions',
        d: 'Always ask multiple questions at once'
      },
      options_zh: {
        a: '問非常籠統的問題',
        b: '提供清晰、具體且有背景的提示',
        c: '只使用是/否問題',
        d: '總是一次問多個問題'
      },
      correct_answer: 'b',
      explanation: 'Clear, specific prompts with context help AI understand exactly what you need.',
      ksa_mapping: {
        knowledge: ['K1.1', 'K1.2'],
        skills: ['S1.1'],
        attitudes: ['A1.1']
      }
    }
  ]
};

describe('/api/assessment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadFile.mockResolvedValue(Buffer.from('mock yaml content'));
    mockYamlLoad.mockReturnValue(mockAssessmentData);
  });

  it('returns assessment data for English', async () => {
    const request = new Request('http://localhost/api/assessment?lang=en');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.assessment_config).toEqual(mockAssessmentData.assessment_config);
    expect(data.domains.engaging_with_ai.name).toBe('engaging_with_ai');
    expect(data.questions[0].question).toBe('What is the most effective way to get better results from an AI chatbot?');
    expect(data.questions[0].options).toEqual(mockAssessmentData.questions[0].options);
  });

  it('returns translated assessment data for Chinese', async () => {
    const request = new Request('http://localhost/api/assessment?lang=zh-TW');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.domains.engaging_with_ai.name).toBe('engaging_with_ai');
    expect(data.questions[0].question).toBe('如何才能從 AI 聊天機器人獲得更好的結果？');
    expect(data.questions[0].options).toEqual(mockAssessmentData.questions[0].options_zh);
  });

  it('falls back to default language when translation not available', async () => {
    const request = new Request('http://localhost/api/assessment?lang=fr');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.domains.engaging_with_ai.name).toBe('engaging_with_ai');
    expect(data.questions[0].question).toBe('What is the most effective way to get better results from an AI chatbot?');
    expect(data.questions[0].options).toEqual(mockAssessmentData.questions[0].options);
  });

  it('defaults to English when no language parameter provided', async () => {
    const request = new Request('http://localhost/api/assessment');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.domains.engaging_with_ai.name).toBe('engaging_with_ai');
  });

  it('handles file read errors', async () => {
    mockReadFile.mockRejectedValue(new Error('File not found'));

    const request = new Request('http://localhost/api/assessment?lang=en');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to load assessment data');
  });

  it('handles YAML parsing errors', async () => {
    mockYamlLoad.mockImplementation(() => {
      throw new Error('Invalid YAML');
    });

    const request = new Request('http://localhost/api/assessment?lang=en');
    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to load assessment data');
  });

  it('processes all questions correctly', async () => {
    const multiQuestionData = {
      ...mockAssessmentData,
      questions: [
        mockAssessmentData.questions[0],
        {
          id: 'C001',
          domain: 'creating_with_ai',
          difficulty: 'basic',
          type: 'multiple_choice',
          question: 'Which approach is most effective when using AI for creative writing?',
          question_zh: '使用 AI 進行創意寫作時，哪種方法最有效？',
          options: {
            a: 'Let AI write everything',
            b: 'Use AI as a collaborative partner',
            c: 'Only use AI to fix grammar',
            d: 'Avoid AI completely'
          },
          options_zh: {
            a: '讓 AI 寫所有內容',
            b: '將 AI 作為協作夥伴',
            c: '只用 AI 修正語法',
            d: '完全避免 AI'
          },
          correct_answer: 'b',
          explanation: 'AI works best as a creative partner.',
          ksa_mapping: {
            knowledge: ['K1.3', 'K2.1'],
            skills: ['S1.2', 'S1.3'],
            attitudes: ['A1.2']
          }
        }
      ]
    };

    mockYamlLoad.mockReturnValue(multiQuestionData);

    const request = new Request('http://localhost/api/assessment?lang=zh-TW');
    const response = await GET(request as any);
    const data = await response.json();

    expect(data.questions).toHaveLength(2);
    expect(data.questions[0].question).toBe('如何才能從 AI 聊天機器人獲得更好的結果？');
    expect(data.questions[1].question).toBe('使用 AI 進行創意寫作時，哪種方法最有效？');
  });
});