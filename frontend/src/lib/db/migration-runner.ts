/**
 * Database Migration Runner
 * Applies pending migrations to the PostgreSQL database
 */

import { Pool } from "pg";
import { promises as fs } from "fs";
import path from "path";

export class MigrationRunner {
  constructor(private pool: Pool) {}

  async initialize(): Promise<void> {
    // Create migrations table if it doesn't exist
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async runPendingMigrations(): Promise<void> {
    try {
      await this.initialize();

      // Get list of executed migrations
      const { rows: executedMigrations } = await this.pool.query(
        "SELECT filename FROM migrations ORDER BY filename",
      );
      const executedFilenames = new Set(
        executedMigrations.map((row) => row.filename),
      );

      // Get all migration files
      const migrationsDir = path.join(
        process.cwd(),
        "src/lib/repositories/postgresql/migrations",
      );
      let migrationFiles: string[] = [];

      try {
        migrationFiles = await fs.readdir(migrationsDir);
      } catch {
        console.log("No migrations directory found, skipping migrations");
        return;
      }

      // Filter to only SQL files not yet executed
      const pendingMigrations = migrationFiles
        .filter((file) => file.endsWith(".sql"))
        .filter((file) => !executedFilenames.has(file))
        .sort(); // Ensure they run in order

      if (pendingMigrations.length === 0) {
        console.log("No pending migrations to run");
        return;
      }

      console.log(`Found ${pendingMigrations.length} pending migrations`);

      // Run each pending migration
      for (const filename of pendingMigrations) {
        console.log(`Running migration: ${filename}`);

        const filePath = path.join(migrationsDir, filename);
        const sql = await fs.readFile(filePath, "utf-8");

        // Begin transaction
        const client = await this.pool.connect();
        try {
          await client.query("BEGIN");

          // Execute migration
          await client.query(sql);

          // Record migration as executed
          await client.query("INSERT INTO migrations (filename) VALUES ($1)", [
            filename,
          ]);

          await client.query("COMMIT");
          console.log(`✓ Migration ${filename} completed successfully`);
        } catch (error) {
          await client.query("ROLLBACK");
          console.error(`✗ Migration ${filename} failed:`, error);
          throw error;
        } finally {
          client.release();
        }
      }

      console.log("All migrations completed successfully");
    } catch (error) {
      console.error("Migration runner error:", error);
      throw error;
    }
  }

  async checkMigrationStatus(): Promise<{
    executed: string[];
    pending: string[];
  }> {
    await this.initialize();

    const { rows: executedMigrations } = await this.pool.query(
      "SELECT filename FROM migrations ORDER BY filename",
    );
    const executedFilenames = executedMigrations.map((row) => row.filename);

    const migrationsDir = path.join(
      process.cwd(),
      "src/lib/repositories/postgresql/migrations",
    );
    let allMigrations: string[] = [];

    try {
      const files = await fs.readdir(migrationsDir);
      allMigrations = files.filter((file) => file.endsWith(".sql")).sort();
    } catch {
      // No migrations directory
    }

    const pending = allMigrations.filter(
      (file) => !executedFilenames.includes(file),
    );

    return {
      executed: executedFilenames,
      pending,
    };
  }
}

// Export a function to run migrations on app startup
export async function runMigrations(pool: Pool): Promise<void> {
  const runner = new MigrationRunner(pool);
  await runner.runPendingMigrations();
}
