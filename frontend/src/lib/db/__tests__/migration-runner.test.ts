import { Pool } from 'pg';
import { promises as fs } from 'fs';
import path from 'path';
import { MigrationRunner } from '../migration-runner';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
  }
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe.skip('MigrationRunner', () => {
  let mockPool: { query: jest.Mock };
  let runner: MigrationRunner;
  const originalCwd = process.cwd;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock pool
    mockPool = {
      query: jest.fn(),
    };
    
    runner = new MigrationRunner(mockPool as any);
    
    // Mock process.cwd
    process.cwd = jest.fn(() => '/test/project');
  });

  afterEach(() => {
    process.cwd = originalCwd;
  });

  describe('initialize', () => {
    it('creates migrations table if not exists', async () => {
      await runner.initialize();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS migrations')
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('filename VARCHAR(255) NOT NULL UNIQUE')
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('executed_at TIMESTAMP WITH TIME ZONE')
      );
    });
  });

  describe('runPendingMigrations', () => {
    beforeEach(() => {
      // Mock successful initialization
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
    });

    it('runs pending migrations in order', async () => {
      // Mock executed migrations
      mockPool.query.mockResolvedValueOnce({
        rows: [{ filename: '001_initial.sql' }],
        rowCount: 1
      } as any);

      // Mock migration files
      mockFs.readdir.mockResolvedValue([
        '001_initial.sql',
        '002_add_users.sql',
        '003_add_tasks.sql',
        'readme.md', // Should be ignored
      ] as any);

      // Mock file contents
      mockFs.readFile
        .mockResolvedValueOnce('CREATE TABLE users (id INT);' as any)
        .mockResolvedValueOnce('CREATE TABLE tasks (id INT);' as any);

      // Mock successful execution
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await runner.runPendingMigrations();

      // Should read directory
      expect(mockFs.readdir).toHaveBeenCalledWith(
        '/test/project/src/lib/repositories/postgresql/migrations'
      );

      // Should execute only pending migrations
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        '/test/project/src/lib/repositories/postgresql/migrations/002_add_users.sql',
        'utf8'
      );
      expect(mockFs.readFile).toHaveBeenCalledWith(
        '/test/project/src/lib/repositories/postgresql/migrations/003_add_tasks.sql',
        'utf8'
      );

      // Should execute migrations
      expect(mockPool.query).toHaveBeenCalledWith('CREATE TABLE users (id INT);');
      expect(mockPool.query).toHaveBeenCalledWith('CREATE TABLE tasks (id INT);');

      // Should record migrations
      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO migrations (filename) VALUES ($1)',
        ['002_add_users.sql']
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        'INSERT INTO migrations (filename) VALUES ($1)',
        ['003_add_tasks.sql']
      );
    });

    it('skips migrations if directory does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockFs.readdir.mockRejectedValue(new Error('ENOENT'));

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await runner.runPendingMigrations();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'No migrations directory found, skipping migrations'
      );
      expect(mockFs.readFile).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it('handles migration execution errors', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockFs.readdir.mockResolvedValue(['001_failing.sql'] as any);
      mockFs.readFile.mockResolvedValue('INVALID SQL SYNTAX' as any);
      
      // Mock migration execution failure
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // initialize
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // get executed
        .mockRejectedValueOnce(new Error('Syntax error')); // execute migration

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await runner.runPendingMigrations();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to execute migration 001_failing.sql:',
        expect.any(Error)
      );

      // Should not record failed migration
      expect(mockPool.query).not.toHaveBeenCalledWith(
        'INSERT INTO migrations (filename) VALUES ($1)',
        expect.any(Array)
      );

      consoleErrorSpy.mockRestore();
    });

    it('logs when no pending migrations', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ filename: '001_initial.sql' }],
        rowCount: 1
      } as any);
      
      mockFs.readdir.mockResolvedValue(['001_initial.sql'] as any);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await runner.runPendingMigrations();

      expect(consoleLogSpy).toHaveBeenCalledWith('No pending migrations');
      expect(mockFs.readFile).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it('logs successful migration execution', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockFs.readdir.mockResolvedValue(['001_initial.sql'] as any);
      mockFs.readFile.mockResolvedValue('CREATE TABLE test (id INT);' as any);
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await runner.runPendingMigrations();

      expect(consoleLogSpy).toHaveBeenCalledWith('Running migration: 001_initial.sql');
      expect(consoleLogSpy).toHaveBeenCalledWith('✓ Executed migration: 001_initial.sql');
      expect(consoleLogSpy).toHaveBeenCalledWith('All migrations completed successfully');

      consoleLogSpy.mockRestore();
    });
  });
});
