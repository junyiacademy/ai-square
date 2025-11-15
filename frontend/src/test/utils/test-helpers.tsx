/**
 * Centralized test utilities and helpers
 * 提供統一的測試工具函數和 wrapper 組件
 */

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import userEvent from '@testing-library/user-event';

// User type from AuthContext
interface User {
  id: number;
  email: string;
  role: string;
  name: string;
}

// Mock next/navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRefresh = jest.fn();
const mockPrefetch = jest.fn();
const mockBack = jest.fn();
const mockForward = jest.fn();
const mockPathname = jest.fn(() => '/');

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
    prefetch: mockPrefetch,
    back: mockBack,
    forward: mockForward,
  })),
  usePathname: mockPathname,
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({})),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: jest.fn(),
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  I18nextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Default auth state for tests
export const defaultAuthState = {
  user: null as User | null,
  isLoggedIn: false,
  isLoading: false,
  tokenExpiringSoon: false,
  login: jest.fn(),
  logout: jest.fn(),
  checkAuth: jest.fn(),
  refreshToken: jest.fn(),
};

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => defaultAuthState,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock ThemeContext
const mockToggleTheme = jest.fn();

jest.mock('@/contexts/ThemeContext', () => {
  const toggleTheme = jest.fn();
  return {
    useTheme: jest.fn(() => ({
      theme: 'light',
      toggleTheme,
    })),
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock localStorage
export const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock fetch
global.fetch = jest.fn();
export const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

/**
 * Test user data fixtures
 */
export const testUsers = {
  student: {
    id: 1,
    email: 'student@example.com',
    role: 'student',
    name: 'Test Student',
  },
  teacher: {
    id: 2,
    email: 'teacher@example.com',
    role: 'teacher',
    name: 'Test Teacher',
  },
  admin: {
    id: 3,
    email: 'admin@example.com',
    role: 'admin',
    name: 'Test Admin',
  },
};

/**
 * Custom render function with all providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authState?: Partial<typeof defaultAuthState>;
  theme?: 'light' | 'dark';
  route?: string;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    authState = {},
    theme = 'light',
    route = '/',
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // Update auth state if provided
  Object.assign(defaultAuthState, authState);

  // Update pathname mock
  mockPathname.mockReturnValue(route);

  // Update theme mock
  const useThemeMock = jest.requireMock('@/contexts/ThemeContext').useTheme;
  useThemeMock.mockReturnValue({
    theme,
    toggleTheme: mockToggleTheme,
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    );
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Reset all mocks to default state
 */
export function resetAllMocks() {
  jest.clearAllMocks();

  // Reset navigation mocks
  mockPush.mockClear();
  mockReplace.mockClear();
  mockRefresh.mockClear();
  mockPrefetch.mockClear();
  mockBack.mockClear();
  mockForward.mockClear();

  // Reset localStorage
  mockLocalStorage.getItem.mockClear();
  mockLocalStorage.setItem.mockClear();
  mockLocalStorage.removeItem.mockClear();
  mockLocalStorage.clear.mockClear();

  // Reset fetch
  mockFetch.mockClear();

  // Reset auth state
  Object.assign(defaultAuthState, {
    user: null,
    isLoggedIn: false,
    isLoading: false,
    tokenExpiringSoon: false,
  });

  // Reset theme
  mockToggleTheme.mockClear();
}

/**
 * Wait for async operations with better error handling
 */
export async function waitForAsync(ms: number = 100) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock successful API response
 */
export function mockApiSuccess(data: unknown, options: Partial<Response> = {}) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
    ...options,
  } as Response);
}

/**
 * Mock API error response
 */
export function mockApiError(message: string, status: number = 500) {
  return Promise.resolve({
    ok: false,
    status,
    json: async () => ({ error: message }),
    text: async () => message,
  } as Response);
}

/**
 * Setup authenticated user state
 */
export function setupAuthenticatedUser(user = testUsers.student) {
  Object.assign(defaultAuthState, {
    user,
    isLoggedIn: true,
    isLoading: false,
  });

  mockLocalStorage.getItem.mockImplementation((key: string) => {
    if (key === 'isLoggedIn') return 'true';
    if (key === 'user') return JSON.stringify(user);
    return null;
  });
}

/**
 * Setup unauthenticated state
 */
export function setupUnauthenticatedUser() {
  Object.assign(defaultAuthState, {
    user: null,
    isLoggedIn: false,
    isLoading: false,
  });

  mockLocalStorage.getItem.mockReturnValue(null);
}

/**
 * Create mock scenario data
 */
export function createMockScenario(overrides = {}) {
  return {
    id: 'test-scenario-123',
    mode: 'pbl',
    status: 'active',
    sourceType: 'yaml',
    sourcePath: 'test/scenario.yaml',
    title: { en: 'Test Scenario', zh: '測試情境' },
    description: { en: 'Test description', zh: '測試描述' },
    objectives: ['Learn testing', 'Write good tests'],
    difficulty: 'beginner',
    estimatedMinutes: 30,
    taskTemplates: [],
    ...overrides,
  };
}

/**
 * Create mock program data
 */
export function createMockProgram(overrides = {}) {
  return {
    id: 'test-program-456',
    userId: 'test-user-789',
    scenarioId: 'test-scenario-123',
    mode: 'pbl',
    status: 'active',
    totalScore: 0,
    completedTaskCount: 0,
    totalTaskCount: 5,
    timeSpentSeconds: 0,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock task data
 */
export function createMockTask(overrides = {}) {
  return {
    id: 'test-task-789',
    programId: 'test-program-456',
    taskIndex: 0,
    title: { en: 'Test Task', zh: '測試任務' },
    type: 'question',
    status: 'active',
    content: { instructions: 'Complete this task' },
    interactions: [],
    score: 0,
    maxScore: 100,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Export all navigation mocks for easy access
 */
export const navigationMocks = {
  mockPush,
  mockReplace,
  mockRefresh,
  mockPrefetch,
  mockBack,
  mockForward,
  mockPathname,
};

/**
 * Export theme mocks
 */
export const themeMocks = {
  mockToggleTheme,
};

// Re-export testing library utilities
export * from '@testing-library/react';
export { userEvent };
