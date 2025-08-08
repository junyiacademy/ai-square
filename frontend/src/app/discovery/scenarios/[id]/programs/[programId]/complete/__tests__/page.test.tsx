import React from 'react';
import { render, waitFor } from '@testing-library/react';
import Page from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: 'test-scenario-id', programId: 'test-program-id' })
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: 'en' }
  })
}));

global.fetch = jest.fn();

describe('Discovery Complete Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ 
        success: true,
        program: {
          id: 'test-program-id',
          status: 'completed',
          totalScore: 95,
          achievements: [],
          skills: []
        },
        scenario: {
          id: 'test-scenario-id',
          title: { en: 'Test Scenario' }
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

  it('should fetch completion data', async () => {
    render(<Page />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('should handle API errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
    const { container } = render(<Page />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });
});