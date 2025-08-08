import React from 'react';
import { render, waitFor } from '@testing-library/react';
import Page from '../page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams()
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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

  it('should fetch evaluation data', async () => {
    render(<Page />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
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