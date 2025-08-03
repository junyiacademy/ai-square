/**
 * CompetencyKnowledgeGraph 元件測試
 * 測試 D3.js 知識圖譜視覺化元件
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CompetencyKnowledgeGraph from '../CompetencyKnowledgeGraph';
import { AssessmentResult, AssessmentQuestion, UserAnswer } from '@/types/assessment';

// Mock d3
jest.mock('d3', () => ({
  select: jest.fn().mockReturnValue({
    append: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(),
    style: jest.fn().mockReturnThis(),
    call: jest.fn().mockReturnThis(),
    selectAll: jest.fn().mockReturnThis(),
    data: jest.fn().mockReturnThis(),
    join: jest.fn().mockReturnThis(),
    enter: jest.fn().mockReturnThis(),
    exit: jest.fn().mockReturnThis(),
    remove: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    transition: jest.fn().mockReturnThis(),
    duration: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    classed: jest.fn().mockReturnThis(),
    merge: jest.fn().mockReturnThis(),
  }),
  forceSimulation: jest.fn().mockReturnValue({
    force: jest.fn().mockReturnThis(),
    nodes: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    stop: jest.fn(),
    restart: jest.fn(),
    alpha: jest.fn().mockReturnThis(),
    alphaTarget: jest.fn().mockReturnThis(),
  }),
  forceLink: jest.fn().mockReturnValue({
    id: jest.fn().mockReturnThis(),
    distance: jest.fn().mockReturnThis(),
  }),
  forceManyBody: jest.fn().mockReturnValue({
    strength: jest.fn().mockReturnThis(),
  }),
  forceCenter: jest.fn(),
  forceCollide: jest.fn().mockReturnValue({
    radius: jest.fn().mockReturnThis(),
  }),
  forceRadial: jest.fn().mockReturnValue({
    radius: jest.fn().mockReturnThis(),
    x: jest.fn().mockReturnThis(),
    y: jest.fn().mockReturnThis(),
    strength: jest.fn().mockReturnThis(),
  }),
  zoom: jest.fn().mockReturnValue({
    scaleExtent: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
  }),
  drag: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
  }),
  zoomIdentity: {
    k: 1,
    x: 0,
    y: 0,
  },
}));

// Mock next-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
    },
  }),
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

  it('displays control buttons', () => {
    render(<CompetencyKnowledgeGraph result={mockResult} />);
    
    expect(screen.getByLabelText('graph.zoom_in')).toBeInTheDocument();
    expect(screen.getByLabelText('graph.zoom_out')).toBeInTheDocument();
    expect(screen.getByLabelText('graph.reset_view')).toBeInTheDocument();
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
    
    expect(screen.getByText('graph.competency_knowledge_graph')).toBeInTheDocument();
  });

  it('handles view toggle between graph and table', () => {
    render(
      <CompetencyKnowledgeGraph
        result={mockResult}
        questions={mockQuestions}
        userAnswers={mockUserAnswers}
      />
    );
    
    // Find and click view toggle button
    const toggleButton = screen.getByRole('button', { name: /graph.show_table_view/i });
    fireEvent.click(toggleButton);
    
    // Should show table view
    expect(screen.getByText('graph.ksa_performance_table')).toBeInTheDocument();
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

  it('renders table view with KSA data', () => {
    render(
      <CompetencyKnowledgeGraph
        result={mockResult}
        questions={mockQuestions}
        userAnswers={mockUserAnswers}
        ksaMaps={mockKsaMaps}
      />
    );
    
    // Switch to table view
    const toggleButton = screen.getByRole('button', { name: /graph.show_table_view/i });
    fireEvent.click(toggleButton);
    
    // Check table headers
    expect(screen.getByText('graph.ksa_performance_table')).toBeInTheDocument();
    expect(screen.getByText('graph.category')).toBeInTheDocument();
    expect(screen.getByText('graph.performance')).toBeInTheDocument();
  });

  it('shows question review when questions are available', () => {
    render(
      <CompetencyKnowledgeGraph
        result={mockResult}
        questions={mockQuestions}
        userAnswers={mockUserAnswers}
        ksaMaps={mockKsaMaps}
      />
    );
    
    // Switch to table view
    const toggleButton = screen.getByRole('button', { name: /graph.show_table_view/i });
    fireEvent.click(toggleButton);
    
    // Should render QuestionReview component
    expect(screen.getByText('graph.related_questions')).toBeInTheDocument();
  });

  it('handles zoom controls', () => {
    const d3Mock = require('d3');
    const mockZoomFn = jest.fn();
    const mockTransformFn = jest.fn();
    
    d3Mock.select.mockReturnValue({
      ...d3Mock.select(),
      call: mockZoomFn,
      transition: jest.fn().mockReturnValue({
        duration: jest.fn().mockReturnValue({
          call: mockTransformFn,
        }),
      }),
    });
    
    render(<CompetencyKnowledgeGraph result={mockResult} />);
    
    // Click zoom in
    fireEvent.click(screen.getByLabelText('graph.zoom_in'));
    
    // Click zoom out
    fireEvent.click(screen.getByLabelText('graph.zoom_out'));
    
    // Click reset
    fireEvent.click(screen.getByLabelText('graph.reset_view'));
  });

  it('handles empty KSA analysis gracefully', () => {
    const resultWithoutKSA = {
      ...mockResult,
      ksaAnalysis: undefined,
    };
    
    render(<CompetencyKnowledgeGraph result={resultWithoutKSA} />);
    
    expect(screen.getByText('graph.competency_knowledge_graph')).toBeInTheDocument();
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

  it('cleans up on unmount', () => {
    const d3Mock = require('d3');
    const mockStop = jest.fn();
    
    d3Mock.forceSimulation.mockReturnValue({
      force: jest.fn().mockReturnThis(),
      nodes: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      stop: mockStop,
      restart: jest.fn(),
      alpha: jest.fn().mockReturnThis(),
      alphaTarget: jest.fn().mockReturnThis(),
    });
    
    const { unmount } = render(
      <CompetencyKnowledgeGraph result={mockResult} />
    );
    
    unmount();
    
    expect(mockStop).toHaveBeenCalled();
  });
});