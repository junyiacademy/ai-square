/**
 * Complete test environment setup
 * This file configures all necessary mocks and global settings for tests
 */

import '@testing-library/jest-dom';
import 'jest-extended';
import { TextEncoder, TextDecoder } from 'util';

// Setup globals
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Mock environment variables
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-jwt-secret';

// Set default DB variables for unit tests (integration tests will override)
if (!process.env.DB_HOST) {
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5432';
  process.env.DB_NAME = `test_db_${Date.now()}_${process.pid}`;
  process.env.DB_USER = 'postgres';  // Use postgres for compatibility
  process.env.DB_PASSWORD = 'postgres';
}

// Disable Redis by default for unit tests
if (!process.env.REDIS_ENABLED) {
  process.env.REDIS_ENABLED = 'false';
  process.env.TEST_REDIS_ENABLED = 'false';
}

// Disable real database for unit tests
if (!process.env.USE_MOCK_DB) {
  process.env.USE_MOCK_DB = 'true';
}

// Mock window.matchMedia (only in jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
} as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as unknown as typeof ResizeObserver;

// Setup fetch mock
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    redirected: false,
    type: 'basic',
    url: '',
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: jest.fn(() => Promise.resolve(new ArrayBuffer(0))),
    blob: jest.fn(() => Promise.resolve(new Blob())),
    formData: jest.fn(() => Promise.resolve(new FormData())),
    json: jest.fn(() => Promise.resolve({})),
    text: jest.fn(() => Promise.resolve('')),
    bytes: jest.fn(() => Promise.resolve(new Uint8Array())),
  } as unknown as Response)
) as jest.Mock;

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn((message, ...args) => {
    // Only show actual errors, not React warnings
    const msg = typeof message === 'string' ? message : String(message);
    const suppressed = [
      'Warning:',
      'act(',
      // Suppress expected GCS repository negative-path logs in unit tests
      'Error getting file URL:',
      'Error deleting file:',
      'Error listing files:',
      'Error copying file:',
      'Error checking file existence:',
      'Error getting file metadata:',
      'Error setting file metadata:',
      'Error downloading file:',
    ];
    if (!suppressed.some((s) => msg.includes(s))) {
      originalError(message, ...args);
    }
  });

  console.warn = jest.fn((message, ...args) => {
    // Filter out known warnings
    if (
      typeof message === 'string' &&
      !message.includes('Warning:') &&
      !message.includes('deprecated')
    ) {
      originalWarn(message, ...args);
    }
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock localStorage and sessionStorage (only in jsdom environment)
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};

const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  });
}

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();

  // Clear any test-specific environment variables
  if (process.env.NODE_ENV === 'test') {
    // Reset fetch mock if it exists
    if (global.fetch && typeof (global.fetch as any).mockClear === 'function') {
      (global.fetch as jest.Mock).mockClear();
    }
  }
});

// Mock database and Redis modules completely for unit tests
jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn(),
    }),
    end: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    flushdb: jest.fn().mockResolvedValue('OK'),
    quit: jest.fn().mockResolvedValue('OK'),
  }));
});

// Mock the integration test environment to prevent real DB connections
jest.mock('../../tests/integration/setup/test-environment', () => ({
  IntegrationTestEnvironment: jest.fn().mockImplementation(() => ({
    setup: jest.fn().mockResolvedValue(undefined),
    teardown: jest.fn().mockResolvedValue(undefined),
    getDbPool: jest.fn().mockReturnValue({
      query: jest.fn().mockResolvedValue({ rows: [{ test: 1 }], rowCount: 1 }),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [{ test: 1 }], rowCount: 1 }),
        release: jest.fn(),
      }),
      end: jest.fn().mockResolvedValue(undefined),
    }),
    getRedisClient: jest.fn().mockReturnValue({
      ping: jest.fn().mockResolvedValue('PONG'),
    }),
    getTestDbName: jest.fn().mockReturnValue(process.env.DB_NAME || `test_db_${Date.now()}_${process.pid}`),
  })),
}));

// Mock test helpers
jest.mock('../../tests/integration/setup/test-helpers', () => ({
  DatabaseTestHelper: jest.fn().mockImplementation(() => ({
    createUser: jest.fn().mockImplementation((userData) => Promise.resolve({
      id: userData.id || `user-${Date.now()}`,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      emailVerified: userData.emailVerified,
    })),
    createSession: jest.fn().mockResolvedValue('mock-session-token'),
  })),
}));

// Mock test fixtures
jest.mock('../../tests/integration/setup/test-fixtures', () => ({
  testUsers: {
    demo: {
      id: 'demo-user',
      email: 'demo@example.com',
      name: 'Demo User',
    },
  },
  seedTestDatabase: jest.fn().mockResolvedValue(undefined),
}));

export {};
