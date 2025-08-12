import { jest } from '@jest/globals';

// Mocks with proper typing
const mockConnect = jest.fn<() => Promise<unknown>>();
const mockEnd = jest.fn<() => Promise<void>>();
const mockQuery = jest.fn<() => Promise<unknown>>();
const mockGetBuckets = jest.fn<() => Promise<unknown[][]>>();

jest.mock('pg', () => {
  class Pool {
    constructor(_config: unknown) {}
    connect = mockConnect;
    end = mockEnd;
  }
  return { Pool };
});

jest.mock('@google-cloud/storage', () => {
  class Storage {
    constructor(_config?: unknown) {}
    bucket(_name: string) {
      const file = (_path: string) => ({
        exists: jest.fn(async (): Promise<[boolean]> => [false]),
        download: jest.fn(async (): Promise<[Buffer]> => [Buffer.from('')]),
      });
      const getFiles = jest.fn(async (): Promise<[unknown[]]> => [[]]);
      return { file, getFiles } as unknown;
    }
    getBuckets = mockGetBuckets;
  }
  return { Storage };
});

const mockRunMigrations = jest.fn();
jest.mock('@/lib/db/migration-runner', () => ({
  runMigrations: (...args: unknown[]) => mockRunMigrations(...args),
}));

// Import after mocks
import { RepositoryFactory } from '../repository-factory';

// Helper to reset singleton state between tests
const reloadFactory = async () => {
  jest.resetModules();
  return (await import('../repository-factory')).RepositoryFactory;
};

describe('RepositoryFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5433';
    process.env.DB_NAME = 'ai_square_db';
  });

  it('runs migrations on first repository access and returns repositories', async () => {
    const Factory = await reloadFactory();
    const factory = (Factory as typeof RepositoryFactory).getInstance();

    // Trigger migrations via first repo access
    const userRepo = factory.getUserRepository();
    expect(userRepo).toBeDefined();

    // ensureMigrationsRun is called in background; allow microtask queue to flush
    await new Promise((r) => setTimeout(r, 0));
    expect(mockRunMigrations).toHaveBeenCalledTimes(1);

    // Other repositories should be creatable without throwing
    expect(factory.getProgramRepository()).toBeDefined();
    expect(factory.getTaskRepository()).toBeDefined();
    expect(factory.getEvaluationRepository()).toBeDefined();
    expect(factory.getScenarioRepository()).toBeDefined();
    expect(factory.getDiscoveryRepository()).toBeDefined();

    // GCS content/media repos
    expect(factory.getContentRepository()).toBeDefined();
    expect(factory.getMediaRepository()).toBeDefined();
  });

  it('healthCheck returns success when providers respond', async () => {
    const Factory = await reloadFactory();
    const factory = (Factory as typeof RepositoryFactory).getInstance();

    mockQuery.mockResolvedValueOnce({ rows: [{ now: '2025-08-12T00:00:00Z' }] });
    mockConnect.mockResolvedValueOnce({
      query: mockQuery,
      release: jest.fn(),
    });
    mockGetBuckets.mockResolvedValueOnce([[{ name: 'bucket-1' }]]);

    const result = await factory.healthCheck();
    expect(result.postgresql).toBe(true);
    expect(result.gcs).toBe(true);
    expect((result.details.postgresql as Record<string, unknown>).status).toBe('connected');
    expect((result.details.gcs as Record<string, unknown>).status).toBe('connected');
  });

  it('healthCheck captures errors without throwing', async () => {
    const Factory = await reloadFactory();
    const factory = (Factory as typeof RepositoryFactory).getInstance();

    mockConnect.mockRejectedValueOnce(new Error('db down'));
    mockGetBuckets.mockRejectedValueOnce(new Error('gcs down'));

    const result = await factory.healthCheck();
    expect(result.postgresql).toBe(false);
    expect(result.gcs).toBe(false);
    expect((result.details.postgresql as Record<string, unknown>).status).toBe('error');
    expect((result.details.gcs as Record<string, unknown>).status).toBe('error');
  });
});

// Additional tests for repositoryFactory instance
describe('repositoryFactory instance', () => {
  it('should expose a singleton instance with repository getters', () => {
    const { repositoryFactory } = require('../repository-factory');
    expect(typeof repositoryFactory).toBe('object');
    expect(typeof repositoryFactory.getUserRepository).toBe('function');
  });
  
  it('should have repository getter methods', () => {
    const { repositoryFactory } = require('../repository-factory');
    expect(typeof repositoryFactory.getUserRepository).toBe('function');
    expect(typeof repositoryFactory.getProgramRepository).toBe('function');
    expect(typeof repositoryFactory.getTaskRepository).toBe('function');
    expect(typeof repositoryFactory.getEvaluationRepository).toBe('function');
    expect(typeof repositoryFactory.getScenarioRepository).toBe('function');
  });
});