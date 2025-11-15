import { env, getEnvVar, requireEnvVar, isProduction, isDevelopment, isTest } from '../env';

describe('env configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('env object', () => {
    it('contains expected environment variables', () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
      process.env.DATABASE_URL = 'postgres://localhost:5432/db';

      const { env: envObj } = require('../env');

      expect(envObj.NEXT_PUBLIC_API_URL).toBe('https://api.example.com');
      expect(envObj.DATABASE_URL).toBe('postgres://localhost:5432/db');
    });
  });

  describe('getEnvVar', () => {
    it('returns environment variable value', () => {
      process.env.TEST_VAR = 'test-value';

      const { getEnvVar: getVar } = require('../env');
      expect(getVar('TEST_VAR')).toBe('test-value');
    });

    it('returns default value when variable not set', () => {
      delete process.env.MISSING_VAR;

      const { getEnvVar: getVar } = require('../env');
      expect(getVar('MISSING_VAR', 'default')).toBe('default');
    });

    it('returns undefined when no default provided', () => {
      delete process.env.MISSING_VAR;

      const { getEnvVar: getVar } = require('../env');
      expect(getVar('MISSING_VAR')).toBeUndefined();
    });
  });

  describe('requireEnvVar', () => {
    it('returns environment variable value when set', () => {
      process.env.REQUIRED_VAR = 'required-value';

      const { requireEnvVar: requireVar } = require('../env');
      expect(requireVar('REQUIRED_VAR')).toBe('required-value');
    });

    it('throws error when variable not set', () => {
      delete process.env.MISSING_REQUIRED;

      const { requireEnvVar: requireVar } = require('../env');
      expect(() => requireVar('MISSING_REQUIRED'))
        .toThrow('Environment variable MISSING_REQUIRED is required but not set');
    });
  });

  describe('environment helpers', () => {
    it('identifies production environment', () => {
      (process.env as any).NODE_ENV = 'production';

      const { isProduction: isProd, isDevelopment: isDev, isTest: isTst } = require('../env');

      expect(isProd()).toBe(true);
      expect(isDev()).toBe(false);
      expect(isTst()).toBe(false);
    });

    it('identifies development environment', () => {
      (process.env as any).NODE_ENV = 'development';

      const { isProduction: isProd, isDevelopment: isDev, isTest: isTst } = require('../env');

      expect(isProd()).toBe(false);
      expect(isDev()).toBe(true);
      expect(isTst()).toBe(false);
    });

    it('identifies test environment', () => {
      (process.env as any).NODE_ENV = 'test';

      const { isProduction: isProd, isDevelopment: isDev, isTest: isTst } = require('../env');

      expect(isProd()).toBe(false);
      expect(isDev()).toBe(false);
      expect(isTst()).toBe(true);
    });

    it('handles undefined NODE_ENV', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: undefined,
        writable: true,
        configurable: true
      });

      const { isProduction: isProd, isDevelopment: isDev, isTest: isTst } = require('../env');

      expect(isProd()).toBe(false);
      expect(isDev()).toBe(false);
      expect(isTst()).toBe(false);

      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalNodeEnv,
        writable: true,
        configurable: true
      });
    });
  });

  describe('common environment variables', () => {
    it('provides database configuration', () => {
      process.env.DB_HOST = 'localhost';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'testdb';

      const { env: envObj } = require('../env');

      expect(envObj.DB_HOST).toBe('localhost');
      expect(envObj.DB_PORT).toBe('5432');
      expect(envObj.DB_NAME).toBe('testdb');
    });

    it('provides API endpoints', () => {
      process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
      process.env.GOOGLE_CLOUD_PROJECT = 'my-project';

      const { env: envObj } = require('../env');

      expect(envObj.NEXT_PUBLIC_API_URL).toBe('https://api.example.com');
      expect(envObj.GOOGLE_CLOUD_PROJECT).toBe('my-project');
    });
  });
});
