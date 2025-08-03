/**
 * Jest Global Setup
 * 所有測試的全域設定，確保測試環境一致性
 */

import { cleanup } from '@testing-library/react';

// 設定環境變數
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
// NODE_ENV is already set by Jest, no need to override

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
    // 過濾掉 React act() 警告，我們會在特定測試中處理
    if (args[0]?.includes?.('act(')) return;
    originalError.call(console, ...args);
  };
  
  console.warn = (...args: any[]) => {
    // 過濾掉已知的警告
    if (args[0]?.includes?.('componentWillReceiveProps')) return;
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});