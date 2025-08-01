import { withPerformanceTracking } from '../performance-monitor';

// Mock performance.now()
const mockPerformanceNow = jest.fn();
global.performance.now = mockPerformanceNow;

// Mock console.log for development environment testing
const originalConsoleLog = console.log;
const mockConsoleLog = jest.fn();

describe('performance-monitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(0);
    console.log = mockConsoleLog;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
  });

  describe('withPerformanceTracking', () => {
    it('tracks performance of async functions', async () => {
      mockPerformanceNow
        .mockReturnValueOnce(100) // Start time
        .mockReturnValueOnce(150); // End time

      const mockAsyncFn = jest.fn().mockResolvedValue({ result: 'success' });
      
      const result = await withPerformanceTracking(
        mockAsyncFn,
        '/api/test',
        'GET'
      );

      expect(mockAsyncFn).toHaveBeenCalled();
      expect(result).toEqual({ result: 'success' });
    });

    it('tracks performance when async function throws error', async () => {
      mockPerformanceNow
        .mockReturnValueOnce(100) // Start time
        .mockReturnValueOnce(200); // End time

      const mockError = new Error('Test error');
      const mockAsyncFn = jest.fn().mockRejectedValue(mockError);
      
      await expect(
        withPerformanceTracking(mockAsyncFn, '/api/test', 'POST')
      ).rejects.toThrow('Test error');

      expect(mockAsyncFn).toHaveBeenCalled();
    });

    it('tracks performance of sync functions', () => {
      mockPerformanceNow
        .mockReturnValueOnce(50) // Start time
        .mockReturnValueOnce(60); // End time

      const mockSyncFn = jest.fn().mockReturnValue({ data: 'test' });
      
      const result = withPerformanceTracking(
        mockSyncFn,
        '/api/sync',
        'PUT'
      );

      expect(mockSyncFn).toHaveBeenCalled();
      expect(result).toEqual({ data: 'test' });
    });

    it('tracks performance when sync function throws error', () => {
      mockPerformanceNow
        .mockReturnValueOnce(0) // Start time
        .mockReturnValueOnce(10); // End time

      const mockError = new Error('Sync error');
      const mockSyncFn = jest.fn().mockImplementation(() => {
        throw mockError;
      });
      
      expect(() => 
        withPerformanceTracking(mockSyncFn, '/api/error', 'DELETE')
      ).toThrow('Sync error');

      expect(mockSyncFn).toHaveBeenCalled();
    });

    it('handles functions that return promises', async () => {
      mockPerformanceNow
        .mockReturnValueOnce(1000)
        .mockReturnValueOnce(1100);

      const mockPromiseFn = jest.fn(() => Promise.resolve({ status: 'ok' }));
      
      const result = await withPerformanceTracking(
        mockPromiseFn,
        '/api/promise'
      );

      expect(result).toEqual({ status: 'ok' });
    });

    it('uses default values when path and method not provided', async () => {
      mockPerformanceNow
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(25);

      const mockFn = jest.fn().mockResolvedValue('result');
      
      const result = await withPerformanceTracking(mockFn);

      expect(result).toBe('result');
    });

    it('tracks nested performance calls', async () => {
      let callCount = 0;
      mockPerformanceNow.mockImplementation(() => callCount++ * 10);

      const innerFn = jest.fn().mockResolvedValue('inner');
      const outerFn = jest.fn(async () => {
        await withPerformanceTracking(innerFn, '/api/inner', 'GET');
        return 'outer';
      });

      const result = await withPerformanceTracking(
        outerFn,
        '/api/outer',
        'POST'
      );

      expect(innerFn).toHaveBeenCalled();
      expect(outerFn).toHaveBeenCalled();
      expect(result).toBe('outer');
    });

    it('handles functions that return undefined', () => {
      mockPerformanceNow
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(5);

      const mockVoidFn = jest.fn();
      
      const result = withPerformanceTracking(
        mockVoidFn,
        '/api/void',
        'PATCH'
      );

      expect(mockVoidFn).toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });
});
