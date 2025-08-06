import { getPool, closePool } from '../get-pool';
import { Pool } from 'pg';

// Mock pg module
jest.mock('pg', () => {
  const mockPool = {
    on: jest.fn(),
    end: jest.fn()
  };
  return {
    Pool: jest.fn(() => mockPool)
  };
});

describe('get-pool', () => {
  let mockPool: any;
  let originalEnv: any;
  
  beforeEach(() => {
    // Store original environment variables
    originalEnv = { ...process.env };
    
    // Clear environment variables
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_NAME;
    delete process.env.DB_USER;
    delete process.env.DB_PASSWORD;
    
    // Reset modules to clear singleton
    jest.resetModules();
    
    // Create fresh mock pool
    mockPool = {
      on: jest.fn(),
      end: jest.fn()
    };
    
    // Mock the Pool constructor to return our mock
    const { Pool } = require('pg');
    Pool.mockImplementation(() => mockPool);
  });

  afterEach(() => {
    // Restore environment variables
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('getPool', () => {
    it('creates pool with default configuration', () => {
      const { getPool } = require('../get-pool');
      const { Pool } = require('pg');
      
      const pool = getPool();
      
      expect(pool).toBeDefined();
      expect(Pool).toHaveBeenCalledWith({
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

    it('uses environment variables when provided', () => {
      process.env.DB_HOST = 'custom-host';
      process.env.DB_PORT = '5432';
      process.env.DB_NAME = 'custom_db';
      process.env.DB_USER = 'custom_user';
      process.env.DB_PASSWORD = 'custom_pass';
      
      const { getPool } = require('../get-pool');
      const { Pool } = require('pg');
      
      const pool = getPool();
      
      expect(Pool).toHaveBeenCalledWith(expect.objectContaining({
        host: 'custom-host',
        port: 5432,
        database: 'custom_db',
        user: 'custom_user',
        password: 'custom_pass'
      }));
    });

    it('returns the same pool instance on subsequent calls', () => {
      const pool1 = getPool();
      const pool2 = getPool();
      
      expect(pool1).toBe(pool2);
      expect(Pool).toHaveBeenCalledTimes(1);
    });

    it('sets up error handler', () => {
      getPool();
      
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('sets up connect handler', () => {
      getPool();
      
      expect(mockPool.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    it('handles pool errors', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      getPool();
      const errorHandler = mockPool.on.mock.calls.find(
        (call: any[]) => call[0] === 'error'
      )?.[1];
      
      const testError = new Error('Test error');
      errorHandler(testError);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Unexpected error on idle client',
        testError
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('logs successful connections', () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      getPool();
      const connectHandler = mockPool.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )?.[1];
      
      connectHandler();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Database client connected');
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('closePool', () => {
    it('closes the pool if it exists', async () => {
      getPool(); // Create pool first
      mockPool.end.mockResolvedValue(undefined);
      
      await closePool();
      
      expect(mockPool.end).toHaveBeenCalled();
    });

    it('does nothing if pool does not exist', async () => {
      await closePool();
      
      expect(mockPool.end).not.toHaveBeenCalled();
    });

    it('resets pool reference after closing', async () => {
      getPool();
      mockPool.end.mockResolvedValue(undefined);
      
      await closePool();
      
      // Should create a new pool
      const newPool = getPool();
      expect(Pool).toHaveBeenCalledTimes(2);
    });
  });
});