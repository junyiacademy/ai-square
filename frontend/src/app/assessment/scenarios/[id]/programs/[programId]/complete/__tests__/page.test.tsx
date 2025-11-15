import React from 'react';
import { render, waitFor } from '@testing-library/react';
import Page from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: 'test-id', programId: 'prog-id' })
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: 'en' }
  })
}));

global.fetch = jest.fn();

describe('Assessment Complete Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        program: {
          id: 'test-program',
          status: 'completed',
          totalScore: 85
        },
        results: {
          score: 85,
          totalQuestions: 10,
          correctAnswers: 8
        }
      })
    });
  });

  it('should render without errors', async () => {
    const params = Promise.resolve({ id: 'test-scenario', programId: 'test-program' });
    const result = render(<Page params={params} />);
    await waitFor(() => {
      expect(result.container).toBeTruthy();
    });
  });

  it('should handle API errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
    const params = Promise.resolve({ id: 'test-scenario', programId: 'test-program' });
    const result = render(<Page params={params} />);
    await waitFor(() => {
      expect(result.container).toBeTruthy();
    });
  });
});
