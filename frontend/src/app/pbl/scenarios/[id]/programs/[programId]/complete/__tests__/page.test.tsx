import React from 'react';
import { render } from '@testing-library/react';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useParams: () => ({ id: 'test-id', programId: 'prog-id' })
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' }
  })
}));

// Import after mocks
const CompletePage = require('../page').default;

describe('PBL Complete Page', () => {
  it('should render', () => {
    const { container } = render(<CompletePage />);
    expect(container).toBeTruthy();
  });
});
