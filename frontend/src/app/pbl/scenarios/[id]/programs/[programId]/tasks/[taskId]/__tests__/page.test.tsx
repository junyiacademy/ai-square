import React from 'react';
import { render } from '@testing-library/react';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useParams: () => ({ id: 'test-id', programId: 'prog-id', taskId: 'task-id' })
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' }
  })
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user1' }, isLoading: false })
}));

// Import after mocks
const TaskPage = require('../page').default;

describe('PBL Task Page', () => {
  it('should render', () => {
    const { container } = render(<TaskPage />);
    expect(container).toBeTruthy();
  });
});
