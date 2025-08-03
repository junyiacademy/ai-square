// Jest setup file - imports our centralized test utilities
import '@testing-library/jest-dom'
import 'jest-extended'

// Import our centralized test setup
import './src/test-utils/setup'

// Add TextEncoder/TextDecoder polyfills for Node.js environment
import { TextEncoder, TextDecoder } from 'util'
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

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

// Import centralized i18n mock instead of duplicating here
const { createTranslationMock } = require('./src/test-utils/mocks/i18n')

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: (namespace) => ({
    t: createTranslationMock({}, namespace),
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
      languages: ['en', 'zh', 'es', 'pt', 'ar', 'id', 'th', 'ja', 'ko', 'fr', 'de', 'ru', 'it'],
      isInitialized: true,
      resolvedLanguage: 'en',
      options: {},
    },
    ready: true,
  }),
  Trans: ({ children }) => children,
  I18nextProvider: ({ children }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
  withTranslation: () => (Component) => Component,
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

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

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
const createMockResponse = (data, init) => {
  const cookies = new Map()
  const headers = new Headers(init?.headers)
  
  const response = {
    ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
    status: init?.status || 200,
    statusText: init?.statusText || 'OK',
    headers: {
      ...headers,
      get: jest.fn((name) => headers.get(name)),
      set: jest.fn((name, value) => headers.set(name, value)),
      getSetCookie: jest.fn(() => {
        const setCookieHeaders = []
        for (const [name, cookieString] of cookies) {
          setCookieHeaders.push(cookieString)
        }
        return setCookieHeaders
      }),
    },
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
      set: jest.fn((name, value, options) => {
        let cookieString = `${name}=${value}`
        if (options?.maxAge !== undefined) cookieString += `; Max-Age=${options.maxAge}`
        if (options?.httpOnly) cookieString += `; HttpOnly`
        if (options?.secure) cookieString += `; Secure`
        if (options?.sameSite) {
          const sameSite = options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1).toLowerCase()
          cookieString += `; SameSite=${sameSite}`
        }
        if (options?.path) cookieString += `; Path=${options.path}`
        cookies.set(name, cookieString)
      }),
      get: jest.fn((name) => cookies.get(name)),
      delete: jest.fn((name) => cookies.delete(name)),
    },
  }
  return response
}

// Create a constructor function that can be called with 'new'
function MockNextResponse(body, init) {
  return createMockResponse(body, init)
}

// Add static methods
MockNextResponse.json = createMockResponse

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
})