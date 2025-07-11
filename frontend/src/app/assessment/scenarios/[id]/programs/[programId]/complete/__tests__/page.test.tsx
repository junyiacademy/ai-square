import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CompletePage from '../page';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn()
}));

const mockPush = jest.fn();
const mockUseRouter = require('next/navigation').useRouter;
const mockUseTranslation = require('react-i18next').useTranslation;

// Mock fetch
global.fetch = jest.fn();

describe('Assessment Complete Page', () => {
  const mockParams = Promise.resolve({ id: 'scenario123', programId: 'program123' });
  const mockT = (key: string) => key;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn()
    } as any);
    
    mockUseTranslation.mockReturnValue({
      t: mockT,
      i18n: { language: 'en', changeLanguage: jest.fn() } as any,
      ready: true
    } as any);
  });

  it('should load all tasks data when includeAllTasks is true', async () => {
    const mockEvaluation = {
      id: 'eval123',
      score: 75,
      feedback: 'Good job!',
      metadata: {
        totalQuestions: 12,
        correctAnswers: 9
      }
    };

    const mockAllTasks = [
      {
        id: 'task1',
        title: 'Engaging with AI',
        content: {
          context: {
            questions: [
              { id: 'Q1', question: 'Question 1', ksa_mapping: { knowledge: ['K1.1'] } },
              { id: 'Q2', question: 'Question 2', ksa_mapping: { knowledge: ['K1.2'] } },
              { id: 'Q3', question: 'Question 3', ksa_mapping: { knowledge: ['K1.3'] } }
            ]
          }
        },
        interactions: [
          { type: 'assessment_answer', content: { questionId: 'Q1', isCorrect: true } },
          { type: 'assessment_answer', content: { questionId: 'Q2', isCorrect: true } },
          { type: 'assessment_answer', content: { questionId: 'Q3', isCorrect: false } }
        ]
      },
      {
        id: 'task2',
        title: 'Creating with AI',
        content: {
          context: {
            questions: [
              { id: 'Q4', question: 'Question 4', ksa_mapping: { skills: ['S1.1'] } },
              { id: 'Q5', question: 'Question 5', ksa_mapping: { skills: ['S2.1'] } },
              { id: 'Q6', question: 'Question 6', ksa_mapping: { attitudes: ['A3.1'] } }
            ]
          }
        },
        interactions: [
          { type: 'assessment_answer', content: { questionId: 'Q4', isCorrect: true } },
          { type: 'assessment_answer', content: { questionId: 'Q5', isCorrect: false } },
          { type: 'assessment_answer', content: { questionId: 'Q6', isCorrect: false } }
        ]
      }
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({ evaluation: mockEvaluation })
      })
      .mockResolvedValueOnce({
        json: async () => ({ program: { id: 'program123' } })
      })
      .mockResolvedValueOnce({
        json: async () => ({ allTasks: mockAllTasks })
      });

    render(<CompletePage params={mockParams} />);

    await waitFor(() => {
      // Check that includeAllTasks parameter was used
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('includeAllTasks=true'),
        expect.any(Object)
      );
    });

    await waitFor(() => {
      // Verify that total questions from all tasks are loaded
      const fetchCalls = (global.fetch as jest.Mock).mock.calls;
      const includeAllTasksCall = fetchCalls.find(call => 
        call[0].includes('includeAllTasks=true')
      );
      expect(includeAllTasksCall).toBeDefined();
    });
  });

  it('should show loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    );

    render(<CompletePage params={mockParams} />);
    
    expect(screen.getByText('loading')).toBeInTheDocument();
  });

  it('should show not completed message when evaluation not found', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({ evaluation: null })
      })
      .mockResolvedValueOnce({
        json: async () => ({ program: { id: 'program123' } })
      });

    render(<CompletePage params={mockParams} />);

    await waitFor(() => {
      expect(screen.getByText('Assessment Not Completed')).toBeInTheDocument();
    });
  });

  it('should collect questions from multiple tasks correctly', async () => {
    const mockEvaluation = { id: 'eval123', score: 75 };
    const mockAllTasks = [
      {
        id: 'task1',
        content: { context: { questions: [{ id: 'Q1' }, { id: 'Q2' }] } },
        interactions: [{ type: 'assessment_answer', content: { questionId: 'Q1' } }]
      },
      {
        id: 'task2',
        content: { context: { questions: [{ id: 'Q3' }, { id: 'Q4' }] } },
        interactions: [{ type: 'assessment_answer', content: { questionId: 'Q3' } }]
      }
    ];

    let capturedTaskData: any = null;

    // Mock AssessmentResults component to capture props
    jest.mock('@/components/assessment/AssessmentResults', () => ({
      __esModule: true,
      default: (props: any) => {
        capturedTaskData = props.taskData;
        return <div>Assessment Results</div>;
      }
    }));

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: async () => ({ evaluation: mockEvaluation })
      })
      .mockResolvedValueOnce({
        json: async () => ({ program: { id: 'program123' } })
      })
      .mockResolvedValueOnce({
        json: async () => ({ allTasks: mockAllTasks })
      });

    render(<CompletePage params={mockParams} />);

    await waitFor(() => {
      expect(screen.queryByText('loading')).not.toBeInTheDocument();
    });

    // Verify console log was called with correct data
    const consoleSpy = jest.spyOn(console, 'log');
    expect(consoleSpy).toHaveBeenCalledWith(
      'Loaded all tasks data:',
      expect.objectContaining({
        tasksCount: 2,
        totalQuestions: 4,
        totalInteractions: 2
      })
    );
  });
});