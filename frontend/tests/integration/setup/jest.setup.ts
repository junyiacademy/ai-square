// CRITICAL: Unmock database modules for integration tests
// This MUST be done before any imports
jest.unmock('pg');
jest.unmock('pg-pool');
jest.unmock('ioredis');
jest.unmock('uuid'); // Integration tests need real UUIDs

import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Set test environment
if (process.env.NODE_ENV !== 'test') {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true,
    enumerable: true,
    configurable: true
  });
}
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-for-integration-tests';

// Increase test timeout for integration tests
jest.setTimeout(30000);

// Retry flaky integration tests only on CI (avoid hiding real issues locally)
jest.retryTimes(process.env.CI ? 2 : 0);

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

global.console.error = (...args: unknown[]) => {
  // Filter out expected errors
  const errorString = args[0]?.toString() || '';

  // Ignore specific expected errors
  const ignoredErrors = [
    'Not Found',
    'Unauthorized',
    'Bad Request',
    'Redis connection failed', // Expected when Redis is not running
    // GCS repository tests intentionally simulate failures; suppress error noise
    'Error getting file URL:',
    'Error deleting file:',
    'Error listing files:',
    'Error copying file:',
    'Error checking file existence:',
    'Error getting file metadata:',
    'Error setting file metadata:',
    'Error downloading file:',
  ];

  const shouldIgnore = ignoredErrors.some(ignored =>
    errorString.includes(ignored)
  );

  if (!shouldIgnore) {
    originalConsoleError(...args);
  }
};

global.console.warn = (...args: unknown[]) => {
  // Filter out expected warnings
  const warnString = args[0]?.toString() || '';

  const ignoredWarnings = [
    'Redis not available',
    'Cache miss',
    'Using fallback',
  ];

  const shouldIgnore = ignoredWarnings.some(ignored =>
    warnString.includes(ignored)
  );

  if (!shouldIgnore) {
    originalConsoleWarn(...args);
  }
};

// Cleanup after all tests
afterAll(async () => {
  // Restore console methods
  global.console.error = originalConsoleError;
  global.console.warn = originalConsoleWarn;

  // Close any open handles
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Global test utilities
export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await waitFor(delay);
      }
    }
  }

  throw lastError;
};

// Add custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toHaveStatus(response: { status: number }, expectedStatus: number) {
    const pass = response.status === expectedStatus;
    if (pass) {
      return {
        message: () =>
          `expected response not to have status ${expectedStatus}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected response to have status ${expectedStatus}, but got ${response.status}`,
        pass: false,
      };
    }
  },
});
