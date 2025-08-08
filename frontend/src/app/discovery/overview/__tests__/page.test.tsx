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

describe('Discovery Overview Page', () => {
  it('should render without errors', () => {
    const { container } = render(<Page />);
    expect(container).toBeTruthy();
  });

  it('should display page title', () => {
    const { container } = render(<Page />);
    const heading = container.querySelector('h1');
    expect(heading).toBeTruthy();
  });
});