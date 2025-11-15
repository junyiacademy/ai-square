import { getPool, closePool } from '../get-pool';

describe('get-pool', () => {
  let originalEnv: any;

  beforeEach(() => {
    // Store original environment variables
    originalEnv = { ...process.env };

    // Clear environment variables for clean testing
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_NAME;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Restore environment variables
    process.env = originalEnv;
    // Clean up pool state
    await closePool();
  });

  describe('getPool', () => {
    it('returns a pool instance', () => {
      const pool = getPool();

      expect(pool).toBeDefined();
      expect(pool.query).toBeDefined();
      expect(pool.connect).toBeDefined();
      expect(pool.end).toBeDefined();
    });

    it('returns the same pool instance on subsequent calls', () => {
      const pool1 = getPool();
      const pool2 = getPool();

      expect(pool1).toBe(pool2);
    });
  });

  describe('closePool', () => {
    it('can be called without throwing', async () => {
      await expect(closePool()).resolves.not.toThrow();
    });

    it('can be called multiple times safely', async () => {
      await closePool();
      await expect(closePool()).resolves.not.toThrow();
    });

    it('allows creating a new pool after closing', async () => {
      const pool1 = getPool();
      await closePool();
      const pool2 = getPool();

      // Should be able to get pools without errors
      expect(pool1).toBeDefined();
      expect(pool2).toBeDefined();
    });
  });
});
