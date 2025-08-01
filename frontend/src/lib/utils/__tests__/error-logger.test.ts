import { ErrorLogger, LogLevel, errorLogger } from '../error-logger';

// Mock console methods
const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
  fatal: console.log,
};

const mockConsole = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn(),
};

describe('error-logger', () => {
  let logger: ErrorLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    console.debug = mockConsole.debug;
    console.info = mockConsole.info;
    console.warn = mockConsole.warn;
    console.error = mockConsole.error;
    console.log = mockConsole.log;
    
    // Clear singleton instance
    logger = errorLogger;
    logger.clearLogs();
    
    // Set environment
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.log = originalConsole.fatal;
  });

  describe('singleton pattern', () => {
    it('returns the same instance', () => {
      const instance1 = ErrorLogger.getInstance();
      const instance2 = ErrorLogger.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('errorLogger exports singleton instance', () => {
      expect(errorLogger).toBe(ErrorLogger.getInstance());
    });
  });

  describe('logging methods', () => {
    it('logs debug messages', () => {
      logger.debug('Debug message', { key: 'value' });

      expect(mockConsole.debug).toHaveBeenCalledWith(
        'Debug message',
        undefined,
        { key: 'value' }
      );

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        level: LogLevel.DEBUG,
        message: 'Debug message',
        context: { key: 'value' }
      });
    });

    it('logs info messages', () => {
      logger.info('Info message');

      expect(mockConsole.info).toHaveBeenCalledWith(
        'Info message',
        undefined,
        undefined
      );

      const logs = logger.getLogs();
      expect(logs[0].level).toBe(LogLevel.INFO);
    });

    it('logs warning messages with error', () => {
      const error = new Error('Warning error');
      logger.warn('Warning message', error, { component: 'test' });

      expect(mockConsole.warn).toHaveBeenCalledWith(
        'Warning message',
        error,
        { component: 'test' }
      );

      const logs = logger.getLogs();
      expect(logs[0]).toMatchObject({
        level: LogLevel.WARN,
        message: 'Warning message',
        error,
        context: { component: 'test' }
      });
    });

    it('logs error messages', () => {
      const error = new Error('Test error');
      logger.error('Error occurred', error);

      expect(mockConsole.error).toHaveBeenCalledWith(
        'Error occurred',
        error,
        undefined
      );

      const logs = logger.getLogs();
      expect(logs[0].error).toBe(error);
    });

    it('logs fatal messages', () => {
      const error = new Error('Fatal error');
      logger.fatal('Fatal error occurred', error, { severity: 'critical' });

      // fatal maps to console.log in default console
      expect(mockConsole.log).toHaveBeenCalledWith(
        'Fatal error occurred',
        error,
        { severity: 'critical' }
      );

      const logs = logger.getLogs();
      expect(logs[0].level).toBe(LogLevel.FATAL);
    });
  });

  describe('log management', () => {
    it('stores multiple log entries', () => {
      logger.debug('Debug 1');
      logger.info('Info 1');
      logger.warn('Warn 1');
      logger.error('Error 1', new Error('test'));
      logger.fatal('Fatal 1', new Error('fatal'));

      const logs = logger.getLogs();
      expect(logs).toHaveLength(5);
      expect(logs.map(l => l.level)).toEqual([
        LogLevel.DEBUG,
        LogLevel.INFO,
        LogLevel.WARN,
        LogLevel.ERROR,
        LogLevel.FATAL
      ]);
    });

    it('returns copy of logs array', () => {
      logger.info('Test message');
      const logs1 = logger.getLogs();
      const logs2 = logger.getLogs();
      
      expect(logs1).not.toBe(logs2);
      expect(logs1).toEqual(logs2);
    });

    it('clears all logs', () => {
      logger.info('Message 1');
      logger.error('Message 2', new Error('test'));
      expect(logger.getLogs()).toHaveLength(2);

      logger.clearLogs();
      expect(logger.getLogs()).toHaveLength(0);
    });
  });

  describe('environment behavior', () => {
    it('logs to console in development', () => {
      process.env.NODE_ENV = 'development';
      logger.info('Dev message');

      expect(mockConsole.info).toHaveBeenCalled();
    });

    it('does not log to console in production', () => {
      process.env.NODE_ENV = 'production';
      logger.info('Prod message');

      expect(mockConsole.info).not.toHaveBeenCalled();
      
      // But still stores in logs array
      expect(logger.getLogs()).toHaveLength(1);
    });

    it('does not log to console in test environment', () => {
      process.env.NODE_ENV = 'test';
      logger.error('Test error', new Error('test'));

      expect(mockConsole.error).not.toHaveBeenCalled();
      expect(logger.getLogs()).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('handles undefined error parameter', () => {
      logger.warn('Warning without error');
      
      const logs = logger.getLogs();
      expect(logs[0].error).toBeUndefined();
    });

    it('timestamps all log entries', () => {
      const beforeTime = new Date();
      logger.info('Test message');
      const afterTime = new Date();

      const logs = logger.getLogs();
      const timestamp = logs[0].timestamp;
      
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('handles console method not being a function', () => {
      // Mock a console without a specific method
      const brokenConsole = { ...console };
      delete (brokenConsole as any).debug;
      console.debug = undefined as any;

      expect(() => {
        logger.debug('Test message');
      }).not.toThrow();

      // Should still log to internal array
      expect(logger.getLogs()).toHaveLength(1);
    });
  });
});
