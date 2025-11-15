import { getEnvVar, requireEnvVar, isProduction, isDevelopment, isTest, env, config } from './env';

describe('env config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getEnvVar', () => {
    it('should return environment variable value', () => {
      process.env.TEST_VAR = 'test_value';
      expect(getEnvVar('TEST_VAR')).toBe('test_value');
    });

    it('should return default value if not set', () => {
      expect(getEnvVar('MISSING_VAR', 'default')).toBe('default');
    });

    it('should return undefined if no default', () => {
      expect(getEnvVar('MISSING_VAR')).toBeUndefined();
    });
  });

  describe('requireEnvVar', () => {
    it('should return value if exists', () => {
      process.env.REQUIRED_VAR = 'required_value';
      expect(requireEnvVar('REQUIRED_VAR')).toBe('required_value');
    });

    it('should throw if missing', () => {
      expect(() => requireEnvVar('MISSING_REQUIRED')).toThrow();
    });
  });

  describe('environment checks', () => {
    it('should detect production environment', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        writable: true,
        configurable: true
      });
      expect(isProduction()).toBe(true);
      expect(isDevelopment()).toBe(false);
      expect(isTest()).toBe(false);
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalNodeEnv,
        writable: true,
        configurable: true
      });
    });

    it('should detect development environment', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        writable: true,
        configurable: true
      });
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
      expect(isTest()).toBe(false);
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalNodeEnv,
        writable: true,
        configurable: true
      });
    });

    it('should detect test environment', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'test',
        writable: true,
        configurable: true
      });
      expect(isTest()).toBe(true);
      expect(isProduction()).toBe(false);
      expect(isDevelopment()).toBe(false);
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalNodeEnv,
        writable: true,
        configurable: true
      });
    });
  });

  describe('env export', () => {
    it('should export process.env', () => {
      expect(env).toEqual(process.env);
    });
  });

  describe('config object', () => {
    it('should provide database configuration with defaults', () => {
      // Save original values
      const originalHost = process.env.DB_HOST;
      const originalPort = process.env.DB_PORT;
      const originalName = process.env.DB_NAME;
      const originalUser = process.env.DB_USER;

      // Clear env vars
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      delete process.env.DB_NAME;
      delete process.env.DB_USER;

      // Need to re-import to get updated config
      jest.resetModules();
      const { config: freshConfig } = require('./env');

      expect(freshConfig.dbHost).toBe('localhost');
      expect(freshConfig.dbPort).toBe(5432);
      expect(freshConfig.dbName).toBe('ai_square_db');
      expect(freshConfig.dbUser).toBe('postgres');

      // Restore original values
      if (originalHost) process.env.DB_HOST = originalHost;
      if (originalPort) process.env.DB_PORT = originalPort;
      if (originalName) process.env.DB_NAME = originalName;
      if (originalUser) process.env.DB_USER = originalUser;
    });

    it('should use environment variables when set', () => {
      process.env.DB_HOST = 'custom-host';
      process.env.DB_PORT = '3306';
      process.env.GOOGLE_CLOUD_PROJECT = 'my-project';

      jest.resetModules();
      const { config: freshConfig } = require('./env');

      expect(freshConfig.dbHost).toBe('custom-host');
      expect(freshConfig.dbPort).toBe(3306);
      expect(freshConfig.gcpProject).toBe('my-project');
    });

    it('should handle boolean feature flags', () => {
      process.env.USE_POSTGRES = 'false';

      jest.resetModules();
      const { config: freshConfig } = require('./env');

      expect(freshConfig.usePostgres).toBe(false);
    });
  });
});
