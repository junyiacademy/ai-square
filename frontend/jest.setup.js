// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: (namespace) => ({
    t: (key) => {
      // Handle nested key translation
      const translations = {
        // Direct keys
        'email': 'Email',
        'password': 'Password',
        'login': 'Login',
        'loading': 'Signing in...',
        'loginTitle': 'Sign in to AI Square',
        
        // Nested keys
        'error.invalidCredentials': 'Invalid email or password',
        'error.networkError': 'Network error, please try again',
        'testAccounts.title': 'Test Accounts',
        'testAccounts.student': 'Student: student@example.com / student123',
        'testAccounts.teacher': 'Teacher: teacher@example.com / teacher123',
        'testAccounts.admin': 'Admin: admin@example.com / admin123',
        
        // Auth namespace keys
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.login': 'Login',
        'auth.loading': 'Signing in...',
        'auth.loginTitle': 'Sign in to AI Square',
        'auth.error.invalidCredentials': 'Invalid email or password',
        'auth.error.networkError': 'Network error, please try again',
        'auth.testAccounts.title': 'Test Accounts',
        'auth.testAccounts.student': 'Student: student@example.com / student123',
        'auth.testAccounts.teacher': 'Teacher: teacher@example.com / teacher123',
        'auth.testAccounts.admin': 'Admin: admin@example.com / admin123',
      }
      return translations[key] || key
    },
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
    },
  }),
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock fetch
global.fetch = jest.fn()

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
})