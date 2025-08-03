/**
 * CompetencyKnowledgeGraph 元件測試
 * 測試 D3.js 知識圖譜視覺化元件
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CompetencyKnowledgeGraph from '../CompetencyKnowledgeGraph';
import { AssessmentResult, AssessmentQuestion, UserAnswer } from '@/types/assessment';

// Use the centralized D3 mock
jest.mock('d3');

// Import translation mock utilities
import { mockUseTranslation, defaultTranslations } from '@/test-utils/mocks/i18n';

// Custom translations for this test
const customTranslations = {
  ...defaultTranslations,
  graph: {
    ...defaultTranslations.graph,
    'zoom_in': 'Zoom In',
    'zoom_out': 'Zoom Out', 
    'reset_view': 'Reset View',
    'show_table_view': 'Show Table',
    'show_graph_view': 'Show Graph',
    'competency_knowledge_graph': 'Competency Knowledge Graph',
  }
};

// Update the react-i18next mock to use our centralized version with custom translations
jest.mock('react-i18next', () => ({
  useTranslation: () => mockUseTranslation(customTranslations),
}));

describe('CompetencyKnowledgeGraph', () => {
  const mockResult: AssessmentResult = {
    overallScore: 80,
    correctAnswers: 16,
    totalQuestions: 20,
    domainScores: {
      engaging_with_ai: 85,
      creating_with_ai: 75,
      managing_with_ai: 80,
      designing_with_ai: 70,
    },
    timeSpentSeconds: 1800,
    completedAt: new Date(),
    level: 'intermediate',
    recommendations: ['Focus on AI ethics', 'Practice with AI tools'],
    ksaAnalysis: {
      knowledge: {
        score: 80,
        strong: ['K1'],
        weak: ['K2']
      },
      skills: {
        score: 75,
        strong: ['S1'],
        weak: ['S2']
      },
      attitudes: {
        score: 85,
        strong: ['A1'],
        weak: ['A2']
      }
    }
  };

  const mockQuestions: AssessmentQuestion[] = [
    {
      id: '0',
      question: 'Test question 1',
      options: {
        a: 'Option A',
        b: 'Option B', 
        c: 'Option C',
        d: 'Option D'
      },
      correct_answer: 'a',
      domain: 'engaging_with_ai',
      difficulty: 'basic',
      type: 'multiple_choice',
      explanation: 'Test explanation',
      ksa_mapping: {
        knowledge: ['K1'],
        skills: [],
        attitudes: []
      },
    },
  ];

  const mockUserAnswers: UserAnswer[] = [
    {
      questionId: '0',
      selectedAnswer: 'a',
      isCorrect: true,
      timeSpent: 30,
    },
  ];

  const mockKsaMaps = {
    kMap: {
      'K1': { summary: 'Knowledge 1', theme: 'Understanding AI' },
      'K2': { summary: 'Knowledge 2', theme: 'AI Applications' },
    },
    sMap: {
      'S1': { summary: 'Skill 1', theme: 'Using AI Tools' },
      'S2': { summary: 'Skill 2', theme: 'Creating with AI' },
    },
    aMap: {
      'A1': { summary: 'Attitude 1', theme: 'AI Ethics' },
      'A2': { summary: 'Attitude 2', theme: 'Responsible AI' },
    },
  };

  const mockDomainsData = [
    {
      domain: 'Engaging_with_AI',
      name: 'Engaging with AI',
      competencies: [
        { id: 'C1', name: 'Understanding AI', ksaCodes: ['K1', 'S1'] },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: jest.fn(),
    }));
  });

  it('renders without crashing', () => {
    const { container } = render(
      <CompetencyKnowledgeGraph result={mockResult} />
    );
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('displays graph title and description', () => {
    render(<CompetencyKnowledgeGraph result={mockResult} />);
    
    expect(screen.getByText('results.knowledgeGraph.title')).toBeInTheDocument();
    expect(screen.getByText('results.knowledgeGraph.description')).toBeInTheDocument();
  });

  it('renders with full data props', () => {
    render(
      <CompetencyKnowledgeGraph
        result={mockResult}
        questions={mockQuestions}
        userAnswers={mockUserAnswers}
        domainsData={mockDomainsData}
        ksaMaps={mockKsaMaps}
      />
    );
    
    expect(screen.getByText('results.knowledgeGraph.title')).toBeInTheDocument();
  });

  it('displays KSA legend', () => {
    render(
      <CompetencyKnowledgeGraph
        result={mockResult}
        questions={mockQuestions}
        userAnswers={mockUserAnswers}
      />
    );
    
    // Check KSA legend elements are displayed
    expect(screen.getByText('K (知識)')).toBeInTheDocument();
    expect(screen.getByText('S (技能)')).toBeInTheDocument();
    expect(screen.getByText('A (態度)')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    const { container } = render(
      <CompetencyKnowledgeGraph result={mockResult} />
    );
    
    // The SVG should be created
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('handles node click events', async () => {
    render(
      <CompetencyKnowledgeGraph
        result={mockResult}
        questions={mockQuestions}
        userAnswers={mockUserAnswers}
        ksaMaps={mockKsaMaps}
      />
    );
    
    // Wait for graph to be rendered
    await waitFor(() => {
      const d3Mock = require('d3');
      expect(d3Mock.forceSimulation).toHaveBeenCalled();
    });
  });

  it('displays performance indicators', () => {
    render(
      <CompetencyKnowledgeGraph
        result={mockResult}
        questions={mockQuestions}
        userAnswers={mockUserAnswers}
        ksaMaps={mockKsaMaps}
      />
    );
    
    // Check performance indicators are displayed
    expect(screen.getByText('完全錯誤 / 部分正確 / 全對')).toBeInTheDocument();
  });

  it('displays helpful hints', () => {
    render(
      <CompetencyKnowledgeGraph
        result={mockResult}
        questions={mockQuestions}
        userAnswers={mockUserAnswers}
        ksaMaps={mockKsaMaps}
      />
    );
    
    // Check helpful hints are displayed
    expect(screen.getByText('提示：點擊 KSA 代碼節點可查看相關題目')).toBeInTheDocument();
  });

  it('handles D3 zoom functionality', () => {
    const d3Mock = require('d3');
    const mockZoomFn = jest.fn();
    
    render(<CompetencyKnowledgeGraph result={mockResult} />);
    
    // Verify D3 zoom is initialized
    expect(d3Mock.zoom).toHaveBeenCalled();
  });

  it('handles empty KSA analysis gracefully', () => {
    const resultWithoutKSA = {
      ...mockResult,
      ksaAnalysis: undefined,
    };
    
    render(<CompetencyKnowledgeGraph result={resultWithoutKSA} />);
    
    expect(screen.getByText('results.knowledgeGraph.title')).toBeInTheDocument();
  });

  it('handles window resize', () => {
    const { container } = render(
      <CompetencyKnowledgeGraph result={mockResult} />
    );
    
    // Trigger resize event
    global.dispatchEvent(new Event('resize'));
    
    // SVG should still exist
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('unmounts without errors', () => {
    const { unmount } = render(
      <CompetencyKnowledgeGraph result={mockResult} />
    );
    
    // Should unmount without throwing errors
    expect(() => unmount()).not.toThrow();
  });
});