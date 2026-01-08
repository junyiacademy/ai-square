import { Pool } from "pg";
import { promises as fs } from "fs";
import path from "path";
import { MigrationRunner, runMigrations } from "../migration-runner";

// Mock dependencies
jest.mock("fs", () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
  },
}));

jest.mock("path", () => ({
  join: jest.fn((...args) => args.join("/")),
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe("MigrationRunner", () => {
  let mockPool: { query: jest.Mock; connect: jest.Mock };
  let mockClient: { query: jest.Mock; release: jest.Mock };
  let runner: MigrationRunner;
  const originalCwd = process.cwd;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock client
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    // Mock pool
    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    runner = new MigrationRunner(mockPool as any);

    // Mock process.cwd
    process.cwd = jest.fn(() => "/test/project");
  });

  afterEach(() => {
    process.cwd = originalCwd;
  });

  describe("initialize", () => {
    it("creates migrations table if not exists", async () => {
      await runner.initialize();

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("CREATE TABLE IF NOT EXISTS migrations"),
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("filename VARCHAR(255) NOT NULL UNIQUE"),
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("executed_at TIMESTAMP WITH TIME ZONE"),
      );
    });
  });

  describe("runPendingMigrations", () => {
    beforeEach(() => {
      // Mock successful initialization
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
    });

    it("runs pending migrations in order", async () => {
      // Mock executed migrations
      mockPool.query.mockResolvedValueOnce({
        rows: [{ filename: "001_initial.sql" }],
        rowCount: 1,
      } as any);

      // Mock migration files
      mockFs.readdir.mockResolvedValue([
        "001_initial.sql",
        "002_add_users.sql",
        "003_add_tasks.sql",
        "readme.md", // Should be ignored
      ] as any);

      // Mock file contents
      mockFs.readFile
        .mockResolvedValueOnce("CREATE TABLE users (id INT);" as any)
        .mockResolvedValueOnce("CREATE TABLE tasks (id INT);" as any);

      // Mock successful execution
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      await runner.runPendingMigrations();

      // Should read directory
      expect(mockFs.readdir).toHaveBeenCalledWith(
        "/test/project/src/lib/repositories/postgresql/migrations",
      );

      // Should execute only pending migrations
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        "/test/project/src/lib/repositories/postgresql/migrations/002_add_users.sql",
        "utf-8",
      );
      expect(mockFs.readFile).toHaveBeenCalledWith(
        "/test/project/src/lib/repositories/postgresql/migrations/003_add_tasks.sql",
        "utf-8",
      );

      // Should execute migrations via client with transaction
      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(mockClient.query).toHaveBeenCalledWith(
        "CREATE TABLE users (id INT);",
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        "INSERT INTO migrations (filename) VALUES ($1)",
        ["002_add_users.sql"],
      );
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");

      // Should release client
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("skips migrations if directory does not exist", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockFs.readdir.mockRejectedValue(new Error("ENOENT"));

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      await runner.runPendingMigrations();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "No migrations directory found, skipping migrations",
      );
      expect(mockFs.readFile).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it("handles migration execution errors", async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // initialize
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // get executed migrations

      mockFs.readdir.mockResolvedValue(["001_failing.sql"] as any);
      mockFs.readFile.mockResolvedValue("INVALID SQL SYNTAX" as any);

      // Create a new client mock for this test that will fail
      const failingClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce(undefined) // BEGIN transaction
          .mockRejectedValueOnce(new Error("Syntax error")), // execute migration fails
        release: jest.fn(),
      };

      // Update the pool.connect to return the failing client
      mockPool.connect = jest.fn().mockResolvedValue(failingClient);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      await expect(runner.runPendingMigrations()).rejects.toThrow(
        "Syntax error",
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "✗ Migration 001_failing.sql failed:",
        expect.any(Error),
      );

      // Should rollback and release client
      expect(failingClient.query).toHaveBeenCalledWith("ROLLBACK");
      expect(failingClient.release).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it("logs when no pending migrations", async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ filename: "001_initial.sql" }],
        rowCount: 1,
      } as any);

      mockFs.readdir.mockResolvedValue(["001_initial.sql"] as any);

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      await runner.runPendingMigrations();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "No pending migrations to run",
      );
      expect(mockFs.readFile).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it("logs successful migration execution", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
      mockFs.readdir.mockResolvedValue(["001_initial.sql"] as any);
      mockFs.readFile.mockResolvedValue("CREATE TABLE test (id INT);" as any);
      mockPool.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

      await runner.runPendingMigrations();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Running migration: 001_initial.sql",
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "✓ Migration 001_initial.sql completed successfully",
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "All migrations completed successfully",
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe("checkMigrationStatus", () => {
    it("returns executed and pending migrations", async () => {
      // Mock initialization
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock executed migrations
      mockPool.query.mockResolvedValueOnce({
        rows: [
          { filename: "001_initial.sql" },
          { filename: "002_add_users.sql" },
        ],
        rowCount: 2,
      } as any);

      // Mock all migration files
      mockFs.readdir.mockResolvedValue([
        "001_initial.sql",
        "002_add_users.sql",
        "003_add_tasks.sql",
        "004_add_programs.sql",
        "readme.md", // Should be filtered out
      ] as any);

      const status = await runner.checkMigrationStatus();

      expect(status.executed).toEqual(["001_initial.sql", "002_add_users.sql"]);
      expect(status.pending).toEqual([
        "003_add_tasks.sql",
        "004_add_programs.sql",
      ]);
    });

    it("handles missing migrations directory", async () => {
      // Mock initialization
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock executed migrations
      mockPool.query.mockResolvedValueOnce({
        rows: [{ filename: "001_initial.sql" }],
        rowCount: 1,
      } as any);

      // Mock missing directory
      mockFs.readdir.mockRejectedValue(new Error("ENOENT"));

      const status = await runner.checkMigrationStatus();

      expect(status.executed).toEqual(["001_initial.sql"]);
      expect(status.pending).toEqual([]);
    });

    it("returns empty arrays when no migrations exist", async () => {
      // Mock initialization
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock no executed migrations
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock empty directory
      mockFs.readdir.mockResolvedValue([] as any);

      const status = await runner.checkMigrationStatus();

      expect(status.executed).toEqual([]);
      expect(status.pending).toEqual([]);
    });

    it("filters out non-SQL files", async () => {
      // Mock initialization
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      // Mock no executed migrations
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // Mock directory with mixed files
      mockFs.readdir.mockResolvedValue([
        "001_initial.sql",
        "README.md",
        "002_users.sql",
        "migration.js",
        "003_tasks.sql",
        ".DS_Store",
      ] as any);

      const status = await runner.checkMigrationStatus();

      expect(status.pending).toEqual([
        "001_initial.sql",
        "002_users.sql",
        "003_tasks.sql",
      ]);
    });
  });
});

describe("runMigrations function", () => {
  it("creates MigrationRunner and calls runPendingMigrations", async () => {
    const mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        release: jest.fn(),
      }),
    };

    // Mock no pending migrations
    mockFs.readdir.mockResolvedValue(["001_initial.sql"] as any);

    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();

    await runMigrations(mockPool as any);

    // Should initialize migrations table
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS migrations"),
    );

    consoleLogSpy.mockRestore();
  });

  it("propagates errors from MigrationRunner", async () => {
    const mockPool = {
      query: jest
        .fn()
        .mockRejectedValue(new Error("Database connection failed")),
      connect: jest.fn(),
    };

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    await expect(runMigrations(mockPool as any)).rejects.toThrow(
      "Database connection failed",
    );

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Migration runner error:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
