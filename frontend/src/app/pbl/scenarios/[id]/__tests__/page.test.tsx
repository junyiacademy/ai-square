import React from 'react';
import { render } from '@testing-library/react';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useParams: () => ({ id: 'test-id' })
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' }
  })
}));

// Import after mocks
const ScenarioPage = require('../page').default;

describe('PBL Scenario Page', () => {
  it('should render', () => {
    const { container } = render(<ScenarioPage />);
    expect(container).toBeTruthy();
  });
});
