// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
import 'jest-extended'

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
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}))

// Mock i18next module
jest.mock('i18next', () => ({
  use: jest.fn().mockReturnThis(),
  init: jest.fn().mockReturnThis(),
  t: jest.fn((key) => key),
  changeLanguage: jest.fn(),
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

// Mock Request and Response for Next.js API routes
global.Request = jest.fn().mockImplementation((url, init) => ({
  url,
  method: init?.method || 'GET',
  headers: new Headers(init?.headers || {}),
  json: jest.fn().mockResolvedValue(init?.body ? JSON.parse(init.body) : {}),
}))

global.Response = jest.fn().mockImplementation((body, init) => ({
  ok: init?.status >= 200 && init?.status < 300,
  status: init?.status || 200,
  json: jest.fn().mockResolvedValue(JSON.parse(body)),
}))

// Mock NextResponse for API routes
const mockNextResponse = {
  json: (data, init) => {
    const response = {
      ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
      status: init?.status || 200,
      statusText: init?.statusText || 'OK',
      headers: new Headers(init?.headers),
      json: jest.fn().mockResolvedValue(data),
      text: jest.fn().mockResolvedValue(JSON.stringify(data)),
      blob: jest.fn(),
      arrayBuffer: jest.fn(),
      formData: jest.fn(),
      body: null,
      bodyUsed: false,
      url: '',
      redirected: false,
      type: 'basic',
      clone: jest.fn(),
      cookies: {
        set: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
      },
    }
    return response
  },
}

jest.mock('next/server', () => ({
  NextResponse: mockNextResponse,
}))

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
})