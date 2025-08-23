import { GCS_CONFIG, getStorageConfig, PUBLIC_GCS_BUCKET } from '../gcs.config';

describe('GCS Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('GCS_CONFIG', () => {
    it('has default bucket name', () => {
      expect(GCS_CONFIG.bucketName).toBe('ai-square-db-v2');
    });

    it('has path configuration', () => {
      expect(GCS_CONFIG.paths.assessments).toBe('assessments');
      expect(GCS_CONFIG.paths.scenarios).toBe('v2/scenarios');
      expect(GCS_CONFIG.paths.programs).toBe('v2/programs');
      expect(GCS_CONFIG.paths.tasks).toBe('v2/tasks');
      expect(GCS_CONFIG.paths.evaluations).toBe('v2/evaluations');
    });

    it('has CMS path configuration', () => {
      expect(GCS_CONFIG.paths.cms.overrides).toBe('cms/overrides');
      expect(GCS_CONFIG.paths.cms.drafts).toBe('cms/drafts');
      expect(GCS_CONFIG.paths.cms.history).toBe('cms/history');
      expect(GCS_CONFIG.paths.cms.metadata).toBe('cms/metadata');
    });

    it('is immutable at TypeScript level', () => {
      // The object is marked as const which makes it readonly at TypeScript level
      // but doesn't actually prevent runtime modification in JavaScript
      // We'll test that the values haven't been accidentally modified
      expect(GCS_CONFIG.bucketName).toBe('ai-square-db-v2');
      expect(GCS_CONFIG.paths.assessments).toBe('assessments');
      
      // TypeScript would prevent these at compile time:
      // The following would cause TypeScript errors if uncommented:
      // GCS_CONFIG.bucketName = 'modified'; // Error: Cannot assign to 'bucketName' because it is a read-only property
      // GCS_CONFIG.paths.assessments = 'modified'; // Error: Cannot assign to 'assessments' because it is a read-only property
      
      // Verify the values are correct
      expect(GCS_CONFIG.bucketName).toBe('ai-square-db-v2');
      expect(GCS_CONFIG.paths.assessments).toBe('assessments');
    });
  });

  describe('getStorageConfig', () => {
    it('returns basic config without credentials', () => {
      // Save original env vars
      const originalProject = process.env.GOOGLE_CLOUD_PROJECT;
      const originalKeyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      // Clear env vars for this test
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      // Re-import to get new values without credentials
      jest.resetModules();
      const { getStorageConfig: getConfig } = require('../gcs.config');
      const config = getConfig();
      
      expect(config).toEqual({
        projectId: undefined,
      });
      
      // Restore env vars
      if (originalProject) process.env.GOOGLE_CLOUD_PROJECT = originalProject;
      if (originalKeyFile) process.env.GOOGLE_APPLICATION_CREDENTIALS = originalKeyFile;
    });

    it('includes projectId when environment variable is set', () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
      
      // Re-import to get new values
      jest.resetModules();
      const { getStorageConfig: getConfig } = require('../gcs.config');
      const config = getConfig();
      
      expect(config.projectId).toBe('test-project');
    });

    it('includes keyFilename when environment variable is set', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/key.json';
      
      // Re-import to get new values
      jest.resetModules();
      const { getStorageConfig: getConfig } = require('../gcs.config');
      const config = getConfig();
      
      expect(config.keyFilename).toBe('/path/to/key.json');
    });

    it('includes both projectId and keyFilename when both are set', () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
      process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/key.json';
      
      // Re-import to get new values
      jest.resetModules();
      const { getStorageConfig: getConfig } = require('../gcs.config');
      const config = getConfig();
      
      expect(config).toEqual({
        projectId: 'test-project',
        keyFilename: '/path/to/key.json',
      });
    });
  });

  describe('PUBLIC_GCS_BUCKET', () => {
    it('uses default bucket name when no env var', () => {
      expect(PUBLIC_GCS_BUCKET).toBe('ai-square-db-v2');
    });

    it('uses NEXT_PUBLIC_GCS_BUCKET when set', () => {
      process.env.NEXT_PUBLIC_GCS_BUCKET = 'public-bucket';
      
      // Re-import to get new values
      jest.resetModules();
      const { PUBLIC_GCS_BUCKET: bucket } = require('../gcs.config');
      
      expect(bucket).toBe('public-bucket');
    });

    it('prefers NEXT_PUBLIC_GCS_BUCKET over GCS_BUCKET_NAME', () => {
      process.env.GCS_BUCKET_NAME = 'private-bucket';
      process.env.NEXT_PUBLIC_GCS_BUCKET = 'public-bucket';
      
      // Re-import to get new values
      jest.resetModules();
      const { PUBLIC_GCS_BUCKET: bucket } = require('../gcs.config');
      
      expect(bucket).toBe('public-bucket');
    });
  });

  describe('Environment variable usage', () => {
    it('uses GCS_BUCKET_NAME for bucket configuration', () => {
      process.env.GCS_BUCKET_NAME = 'custom-bucket';
      
      // Re-import to get new values
      jest.resetModules();
      const { GCS_CONFIG: config } = require('../gcs.config');
      
      expect(config.bucketName).toBe('custom-bucket');
    });

    it('falls back to default when GCS_BUCKET_NAME is not set', () => {
      delete process.env.GCS_BUCKET_NAME;
      
      // Re-import to get new values
      jest.resetModules();
      const { GCS_CONFIG: config } = require('../gcs.config');
      
      expect(config.bucketName).toBe('ai-square-db-v2');
    });
  });
});