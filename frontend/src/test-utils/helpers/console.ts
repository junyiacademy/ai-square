/**
 * Console Mock Helpers
 * 協助測試中 mock console 方法
 */

// Store original console methods
const originalConsole = {
  error: console.error,
  warn: console.warn,
  log: console.log,
  info: console.info,
};

/**
 * Mock console.error for tests
 * @returns Mocked console.error function
 */
export function mockConsoleError() {
  const mockError = jest.fn();
  
  beforeEach(() => {
    // Replace console.error with our mock
    console.error = mockError;
  });
  
  afterEach(() => {
    // Restore original console.error
    console.error = originalConsole.error;
    mockError.mockClear();
  });
  
  return mockError;
}

/**
 * Mock console.warn for tests
 * @returns Mocked console.warn function
 */
export function mockConsoleWarn() {
  const mockWarn = jest.fn();
  
  beforeEach(() => {
    console.warn = mockWarn;
  });
  
  afterEach(() => {
    console.warn = originalConsole.warn;
    mockWarn.mockClear();
  });
  
  return mockWarn;
}

/**
 * Mock console.log for tests
 * @returns Mocked console.log function
 */
export function mockConsoleLog() {
  const mockLog = jest.fn();
  
  beforeEach(() => {
    console.log = mockLog;
  });
  
  afterEach(() => {
    console.log = originalConsole.log;
    mockLog.mockClear();
  });
  
  return mockLog;
}

/**
 * Temporarily suppress console output during a test
 * Useful for tests that generate expected console output
 */
export function suppressConsole() {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
}