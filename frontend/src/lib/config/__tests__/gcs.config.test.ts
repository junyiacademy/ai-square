import { GCS_CONFIG, getStorageConfig, PUBLIC_GCS_BUCKET } from '../gcs.config';

describe('gcs.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GCS_CONFIG', () => {
    it('uses default bucket name when GCS_BUCKET_NAME not set', () => {
      delete process.env.GCS_BUCKET_NAME;
      const { GCS_CONFIG: config } = require('../gcs.config');
      
      expect(config.bucketName).toBe('ai-square-db-v2');
    });

    it('uses GCS_BUCKET_NAME from environment when set', () => {
      process.env.GCS_BUCKET_NAME = 'custom-bucket';
      const { GCS_CONFIG: config } = require('../gcs.config');
      
      expect(config.bucketName).toBe('custom-bucket');
    });

    it('includes projectId from GOOGLE_CLOUD_PROJECT', () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'my-project';
      const { GCS_CONFIG: config } = require('../gcs.config');
      
      expect(config.projectId).toBe('my-project');
    });

    it('includes keyFilename from GOOGLE_APPLICATION_CREDENTIALS', () => {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/key.json';
      const { GCS_CONFIG: config } = require('../gcs.config');
      
      expect(config.keyFilename).toBe('/path/to/key.json');
    });

    it('has correct path structure', () => {
      expect(GCS_CONFIG.paths).toEqual({
        assessments: 'assessments',
        scenarios: 'v2/scenarios',
        programs: 'v2/programs',
        tasks: 'v2/tasks',
        evaluations: 'v2/evaluations',
        cms: {
          overrides: 'cms/overrides',
          drafts: 'cms/drafts',
          history: 'cms/history',
          metadata: 'cms/metadata'
        }
      });
    });
  });

  describe('getStorageConfig', () => {
    it('returns config with projectId', () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
      const { getStorageConfig: getConfig } = require('../gcs.config');
      
      const config = getConfig();
      
      expect(config).toEqual({
        projectId: 'test-project'
      });
    });

    it('includes keyFilename when set', () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
      process.env.GOOGLE_APPLICATION_CREDENTIALS = '/credentials.json';
      const { getStorageConfig: getConfig } = require('../gcs.config');
      
      const config = getConfig();
      
      expect(config).toEqual({
        projectId: 'test-project',
        keyFilename: '/credentials.json'
      });
    });

    it('omits keyFilename when not set', () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const { getStorageConfig: getConfig } = require('../gcs.config');
      
      const config = getConfig();
      
      expect(config).toEqual({
        projectId: 'test-project'
      });
      expect(config.keyFilename).toBeUndefined();
    });

    it('returns empty config when no env vars set', () => {
      delete process.env.GOOGLE_CLOUD_PROJECT;
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const { getStorageConfig: getConfig } = require('../gcs.config');
      
      const config = getConfig();
      
      expect(config).toEqual({
        projectId: undefined
      });
    });
  });

  describe('PUBLIC_GCS_BUCKET', () => {
    it('uses NEXT_PUBLIC_GCS_BUCKET when set', () => {
      process.env.NEXT_PUBLIC_GCS_BUCKET = 'public-bucket';
      process.env.GCS_BUCKET_NAME = 'private-bucket';
      const { PUBLIC_GCS_BUCKET: publicBucket } = require('../gcs.config');
      
      expect(publicBucket).toBe('public-bucket');
    });

    it('falls back to GCS_BUCKET_NAME when NEXT_PUBLIC_GCS_BUCKET not set', () => {
      delete process.env.NEXT_PUBLIC_GCS_BUCKET;
      process.env.GCS_BUCKET_NAME = 'private-bucket';
      const { PUBLIC_GCS_BUCKET: publicBucket } = require('../gcs.config');
      
      expect(publicBucket).toBe('private-bucket');
    });

    it('uses default bucket name when no env vars set', () => {
      delete process.env.NEXT_PUBLIC_GCS_BUCKET;
      delete process.env.GCS_BUCKET_NAME;
      const { PUBLIC_GCS_BUCKET: publicBucket } = require('../gcs.config');
      
      expect(publicBucket).toBe('ai-square-db-v2');
    });
  });
});
