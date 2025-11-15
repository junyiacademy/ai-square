/**
 * Jest Global Setup
 * 所有測試的全域設定，確保測試環境一致性
 */

import { cleanup } from '@testing-library/react';
import './mocks/browser';

// 設定環境變數
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// 修復 window.matchMedia - only if window is defined (not in Node environment)
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

// 修復 ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// 清理 DOM after each test
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

// 設定測試 timeout
jest.setTimeout(30000);

// Mock console methods to reduce noise
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    // 過濾掉 React act() 警告和其他測試警告
    const message = args[0]?.toString?.() || '';
    if (message.includes('act(')) return;
    if (message.includes('Warning: ReactDOM.render is no longer supported')) return;
    if (message.includes('Warning: componentWillReceiveProps')) return;
    if (message.includes('Failed to load navigation data')) return;
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    // 過濾掉已知的警告
    const message = args[0]?.toString?.() || '';
    if (message.includes('componentWillReceiveProps')) return;
    if (message.includes('React Hook useEffect has missing dependencies')) return;
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.scrollTo
if (typeof window !== 'undefined') {
  window.scrollTo = jest.fn();
}
