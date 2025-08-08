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

jest.mock('@/hooks/useUserData', () => ({
  useUserData: () => ({
    userData: {},
    loading: false
  })
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com' },
    loading: false
  })
}));

jest.mock('@/components/discovery/DiscoveryPageLayout', () => {
  return function DiscoveryPageLayout({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  };
});

jest.mock('@/components/discovery/ScenarioCard', () => {
  return function ScenarioCard({ scenario }: { scenario: Record<string, unknown> }) {
    return <div>Scenario: {scenario.id as string}</div>;
  };
});

global.fetch = jest.fn();

describe('Discovery Scenarios Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ 
        success: true,
        scenarios: [
          { id: '1', title: { en: 'Scenario 1' }, description: { en: 'Description 1' } },
          { id: '2', title: { en: 'Scenario 2' }, description: { en: 'Description 2' } }
        ]
      })
    });
  });

  it('should render without errors', async () => {
    const { container } = render(<Page />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });

  it('should fetch scenarios data', async () => {
    render(<Page />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('should handle empty scenarios', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, scenarios: [] })
    });
    const { container } = render(<Page />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });
});