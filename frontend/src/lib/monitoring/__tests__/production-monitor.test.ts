import { productionMonitor } from '../production-monitor';

describe('production-monitor', () => {
  // Mock console methods
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalConsoleGroup = console.group;
  const originalConsoleGroupEnd = console.groupEnd;
  const originalConsoleTime = console.time;
  const originalConsoleTimeEnd = console.timeEnd;
  
  beforeEach(() => {
    // Mock all console methods
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.group = jest.fn();
    console.groupEnd = jest.fn();
    console.time = jest.fn();
    console.timeEnd = jest.fn();
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    console.group = originalConsoleGroup;
    console.groupEnd = originalConsoleGroupEnd;
    console.time = originalConsoleTime;
    console.timeEnd = originalConsoleTimeEnd;
  });

  describe('log method', () => {
    it('logs messages with INFO level', () => {
      productionMonitor.log('Test message');
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('Test message')
      );
    });

    it('includes timestamp in log', () => {
      const beforeTime = new Date().toISOString();
      productionMonitor.log('Test message');
      const afterTime = new Date().toISOString();
      
      const logCall = (console.log as jest.Mock).mock.calls[0][0];
      const timestampMatch = logCall.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/);
      expect(timestampMatch).toBeTruthy();
      
      const loggedTime = new Date(timestampMatch[1]);
      expect(loggedTime.getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      expect(loggedTime.getTime()).toBeLessThanOrEqual(new Date(afterTime).getTime());
    });
  });

  describe('warn method', () => {
    it('logs warning messages with WARN level', () => {
      productionMonitor.warn('Warning message');
      
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        expect.stringContaining('Warning message')
      );
    });
  });

  describe('error method', () => {
    it('logs error messages with ERROR level', () => {
      productionMonitor.error('Error message');
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.stringContaining('Error message')
      );
    });

    it('logs Error objects with stack trace', () => {
      const error = new Error('Test error');
      productionMonitor.error('Error occurred', error);
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.stringContaining('Error occurred'),
        error
      );
    });
  });

  describe('group method', () => {
    it('creates a console group with timestamp', () => {
      productionMonitor.group('Test Group');
      
      expect(console.group).toHaveBeenCalledWith(
        expect.stringContaining('[GROUP]'),
        expect.stringContaining('Test Group')
      );
    });
  });

  describe('groupEnd method', () => {
    it('ends the console group', () => {
      productionMonitor.groupEnd();
      
      expect(console.groupEnd).toHaveBeenCalled();
    });
  });

  describe('time method', () => {
    it('starts a timer with label', () => {
      productionMonitor.time('myTimer');
      
      expect(console.time).toHaveBeenCalledWith('myTimer');
    });
  });

  describe('timeEnd method', () => {
    it('ends a timer with label', () => {
      productionMonitor.timeEnd('myTimer');
      
      expect(console.timeEnd).toHaveBeenCalledWith('myTimer');
    });
  });

  describe('performance method', () => {
    it('logs performance metrics with timing', () => {
      productionMonitor.performance('API Call', 250);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[PERF]'),
        expect.stringContaining('API Call'),
        expect.stringContaining('250ms')
      );
    });

    it('includes metadata if provided', () => {
      const metadata = { endpoint: '/api/users', method: 'GET' };
      productionMonitor.performance('API Call', 250, metadata);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[PERF]'),
        expect.stringContaining('API Call'),
        expect.stringContaining('250ms'),
        metadata
      );
    });
  });

  describe('metric method', () => {
    it('logs custom metrics', () => {
      productionMonitor.metric('cache_hit_rate', 0.95, 'ratio');
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[METRIC]'),
        expect.stringContaining('cache_hit_rate'),
        expect.stringContaining('0.95'),
        expect.stringContaining('ratio')
      );
    });

    it('uses default unit when not provided', () => {
      productionMonitor.metric('request_count', 100);
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[METRIC]'),
        expect.stringContaining('request_count'),
        expect.stringContaining('100'),
        expect.stringContaining('value')
      );
    });
  });

  describe('debug method', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('logs debug messages in development', () => {
      process.env.NODE_ENV = 'development';
      productionMonitor.debug('Debug message', { data: 'test' });
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.stringContaining('Debug message'),
        { data: 'test' }
      );
    });

    it('does not log debug messages in production', () => {
      process.env.NODE_ENV = 'production';
      productionMonitor.debug('Debug message', { data: 'test' });
      
      expect(console.log).not.toHaveBeenCalled();
    });
  });
});
