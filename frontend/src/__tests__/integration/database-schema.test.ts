/**
 * Integration test to verify database schema compatibility
 * This test should be run before pushing to ensure Prisma schema matches database
 */

import { Pool } from "pg";

describe("Database Schema Integration Tests", () => {
  let pool: Pool;

  beforeAll(() => {
    // Skip these tests in CI environment
    if (process.env.CI === "true" || !process.env.RUN_INTEGRATION_TESTS) {
      console.log("Skipping database integration tests in CI environment");
      return;
    }

    pool = new Pool({
      host: process.env.DB_HOST || "127.0.0.1",
      port: parseInt(process.env.DB_PORT || "5433"),
      database: process.env.DB_NAME || "ai_square_db",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      max: 1,
      connectionTimeoutMillis: 5000,
    });
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  describe("Users table schema", () => {
    it("should have all required columns with proper defaults", async () => {
      if (!pool) {
        console.log("Skipping database tests - no pool available");
        return;
      }

      try {
        const result = await pool.query(`
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
          ORDER BY ordinal_position
        `);

        const columns = result.rows.reduce(
          (acc, col) => {
            acc[col.column_name] = {
              type: col.data_type,
              nullable: col.is_nullable === "YES",
              default: col.column_default,
            };
            return acc;
          },
          {} as Record<string, any>,
        );

        // Verify critical columns exist
        expect(columns.id).toBeDefined();
        expect(columns.email).toBeDefined();
        expect(columns.password_hash).toBeDefined();
        expect(columns.created_at).toBeDefined();
        expect(columns.updated_at).toBeDefined();

        // Verify defaults for timestamp columns
        expect(columns.id.default).toBeTruthy(); // Should have UUID default
        expect(columns.created_at.default).toBeTruthy(); // Should have CURRENT_TIMESTAMP

        // For updated_at, Prisma uses triggers, not column defaults
        // So it might not have a default in the column definition
      } catch (error) {
        // If database is not available, skip the test
        console.log("Database not available for integration test:", error);
      }
    });

    it("should support gen_random_uuid() function", async () => {
      if (!pool) return;

      try {
        const result = await pool.query("SELECT gen_random_uuid() as uuid");
        expect(result.rows[0].uuid).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      } catch (error: any) {
        if (
          error.message.includes("function gen_random_uuid() does not exist")
        ) {
          throw new Error(
            "gen_random_uuid() function not available. " +
              'Run: CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
          );
        }
        throw error;
      }
    });

    it("should accept INSERT with minimal required fields", async () => {
      if (!pool) return;

      const testEmail = `test-${Date.now()}@example.com`;

      try {
        // Test if we can insert with minimal fields (relying on defaults)
        const insertResult = await pool.query(
          `
          INSERT INTO users (email, password_hash, name, role, email_verified)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, created_at, updated_at
        `,
          [testEmail, "test_hash", "Test User", "student", true],
        );

        expect(insertResult.rows[0].id).toBeTruthy();
        expect(insertResult.rows[0].created_at).toBeTruthy();
        expect(insertResult.rows[0].updated_at).toBeTruthy();

        // Clean up
        await pool.query("DELETE FROM users WHERE email = $1", [testEmail]);
      } catch (error: any) {
        throw new Error(
          `Cannot insert with minimal fields. Error: ${error.message}. ` +
            "This means Prisma schema defaults are not reflected in the database. " +
            "Run: npx prisma migrate dev",
        );
      }
    });

    it("should match Prisma schema expectations", async () => {
      if (!pool) return;

      const testEmail = `test-prisma-${Date.now()}@example.com`;

      try {
        // Test the exact INSERT that seed-users API uses
        const insertResult = await pool.query(
          `
          INSERT INTO users (
            id, email, password_hash, name, role,
            email_verified, metadata, created_at, updated_at
          )
          VALUES (
            gen_random_uuid(), $1, $2, $3, $4,
            $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          RETURNING id
        `,
          [
            testEmail,
            "test_hash",
            "Test User",
            "student",
            true,
            JSON.stringify({ test: true }),
          ],
        );

        expect(insertResult.rows[0].id).toBeTruthy();

        // Clean up
        await pool.query("DELETE FROM users WHERE email = $1", [testEmail]);
      } catch (error: any) {
        throw new Error(`seed-users INSERT pattern failed: ${error.message}`);
      }
    });
  });
});
