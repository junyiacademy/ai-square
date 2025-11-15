import React from 'react';
import { render } from '@testing-library/react';
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

jest.mock('@/hooks/useDiscoveryData', () => ({
  useDiscoveryData: () => ({
    achievements: [],
    loading: false,
    error: null
  })
}));

jest.mock('@/components/discovery/DiscoveryPageLayout', () => {
  return function DiscoveryPageLayout({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  };
});

jest.mock('next/dynamic', () => () => {
  return function AchievementsView({ achievements }: { achievements: unknown[] }) {
    return <div>Achievements: {achievements.length}</div>;
  };
});

describe('Discovery Achievements Page', () => {
  it('should render without errors', () => {
    const { container } = render(<Page />);
    expect(container).toBeTruthy();
  });

  it('should display page content', () => {
    const { container } = render(<Page />);
    expect(container.textContent).toContain('Achievements');
  });
});
