import { Pool } from 'pg';
import { getPool, closePool } from '../get-pool';

// Mock pg module
jest.mock('pg', () => {
  const mockPool = {
    end: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
  };
  
  return {
    Pool: jest.fn(() => mockPool)
  };
});

describe('get-pool', () => {
  const originalEnv = process.env;
  let mockPool: any;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Reset the module to clear the pool singleton
    jest.resetModules();
    
    // Get the mocked Pool instance
    const { Pool: MockPool } = require('pg');
    mockPool = new MockPool();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getPool', () => {
    it('creates pool with default configuration', () => {
      const { getPool: getPoolFn } = require('../get-pool');
      const pool = getPoolFn();
      
      const { Pool: MockPool } = require('pg');
      expect(MockPool).toHaveBeenCalledWith({
        host: '127.0.0.1',
        port: 5433,
        database: 'ai_square_db',
        user: 'postgres',
        password: 'postgres',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: false,
        keepAlive: true,
        keepAliveInitialDelayMillis: 0
      });
    });

    it('uses environment variables when set', () => {
      process.env.DB_HOST = 'custom-host';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'custom_db';
      process.env.DB_USER = 'custom_user';
      process.env.DB_PASSWORD = 'custom_pass';
      
      const { getPool: getPoolFn } = require('../get-pool');
      getPoolFn();
      
      const { Pool: MockPool } = require('pg');
      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'custom-host',
          port: 5432,
          database: 'custom_db',
          user: 'custom_user',
          password: 'custom_pass'
        })
      );
    });

    it('returns the same pool instance on subsequent calls', () => {
      const { getPool: getPoolFn } = require('../get-pool');
      const pool1 = getPoolFn();
      const pool2 = getPoolFn();
      
      expect(pool1).toBe(pool2);
      
      const { Pool: MockPool } = require('pg');
      expect(MockPool).toHaveBeenCalledTimes(1);
    });

    it('sets up error handler', () => {
      const { getPool: getPoolFn } = require('../get-pool');
      const pool = getPoolFn();
      
      expect(pool.on).toHaveBeenCalledWith('error', expect.any(Function));
      
      // Test error handler
      const errorHandler = (pool.on as jest.Mock).mock.calls.find(
        call => call[0] === 'error'
      )[1];
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const testError = new Error('Test error');
      errorHandler(testError);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unexpected error on idle client',
        testError
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('sets up connect handler', () => {
      const { getPool: getPoolFn } = require('../get-pool');
      const pool = getPoolFn();
      
      expect(pool.on).toHaveBeenCalledWith('connect', expect.any(Function));
      
      // Test connect handler
      const connectHandler = (pool.on as jest.Mock).mock.calls.find(
        call => call[0] === 'connect'
      )[1];
      
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      connectHandler();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Database client connected');
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('closePool', () => {
    it('closes the pool if it exists', async () => {
      const { getPool: getPoolFn, closePool: closePoolFn } = require('../get-pool');
      const pool = getPoolFn();
      
      await closePoolFn();
      
      expect(pool.end).toHaveBeenCalled();
    });

    it('does nothing if pool does not exist', async () => {
      const { closePool: closePoolFn } = require('../get-pool');
      
      // Call closePool without creating a pool first
      await closePoolFn();
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('allows creating new pool after closing', async () => {
      const { getPool: getPoolFn, closePool: closePoolFn } = require('../get-pool');
      
      // Create and close pool
      const pool1 = getPoolFn();
      await closePoolFn();
      
      // Create new pool
      const pool2 = getPoolFn();
      
      expect(pool1).not.toBe(pool2);
      
      const { Pool: MockPool } = require('pg');
      expect(MockPool).toHaveBeenCalledTimes(2);
    });
  });
});
