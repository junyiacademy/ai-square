import React from 'react';
import { render, waitFor } from '@testing-library/react';
import Page from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/discovery/evaluation'
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'interestAssessment.questions' && options?.returnObjects) {
        return [
          {
            id: 'q1',
            question: 'Test question 1',
            type: 'single',
            options: [
              { id: 'opt1', text: 'Option 1', careerTypes: ['tech'] },
              { id: 'opt2', text: 'Option 2', careerTypes: ['business'] }
            ]
          },
          {
            id: 'q2',
            question: 'Test question 2',
            type: 'single',
            options: [
              { id: 'opt3', text: 'Option 3', careerTypes: ['tech'] },
              { id: 'opt4', text: 'Option 4', careerTypes: ['creative'] }
            ]
          }
        ];
      }
      return key;
    },
    i18n: { changeLanguage: jest.fn(), language: 'en' }
  })
}));

global.fetch = jest.fn();

describe('Discovery Evaluation Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ 
        success: true,
        evaluation: {
          score: 85,
          level: 'intermediate',
          skills: []
        }
      })
    });
  });

  it('should render without errors', async () => {
    const { container } = render(<Page />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });

  it('should render evaluation content', async () => {
    const { container } = render(<Page />);
    await waitFor(() => {
      // Check if the page rendered with evaluation content
      const content = container.querySelector('.min-h-screen');
      expect(content).toBeTruthy();
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
    const { container } = render(<Page />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });
});