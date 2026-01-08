#!/usr/bin/env node

/**
 * Test seed-users API locally before pushing to CI/CD
 * This ensures database schema compatibility
 */

import { Pool } from "pg";
import bcrypt from "bcryptjs";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const testUsers = [
  { email: "test-local@example.com", password: "test123", role: "student" },
];

async function testSeedUsers() {
  const pool = new Pool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: parseInt(process.env.DB_PORT || "5433"),
    database: process.env.DB_NAME || "ai_square_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    max: 1,
  });

  try {
    console.log("🔍 Testing database connection...");
    await pool.query("SELECT 1");
    console.log("✅ Database connected");

    console.log("\n🔍 Checking users table schema...");
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log("📊 Users table columns:");
    schemaResult.rows.forEach((col) => {
      console.log(
        `  - ${col.column_name}: ${col.data_type} ${col.is_nullable === "NO" ? "(NOT NULL)" : ""} ${col.column_default ? `DEFAULT ${col.column_default}` : ""}`,
      );
    });

    // Test 1: Check if gen_random_uuid() is available
    console.log("\n🔍 Testing gen_random_uuid() function...");
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const uuidResult = await pool.query("SELECT gen_random_uuid()");
      console.log("✅ gen_random_uuid() is available");
    } catch {
      console.error("❌ gen_random_uuid() is NOT available");
      console.log('💡 Run: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    }

    // Test 2: Try minimal insert (relying on defaults)
    console.log("\n🔍 Testing minimal INSERT (with defaults)...");
    try {
      await pool.query(
        `
        INSERT INTO users (email, password_hash, name, role, email_verified)
        VALUES ($1, $2, $3, $4, $5)
      `,
        ["test-minimal@example.com", "hash", "Test User", "student", true],
      );
      console.log("✅ Minimal INSERT successful (defaults work)");

      // Clean up
      await pool.query("DELETE FROM users WHERE email = $1", [
        "test-minimal@example.com",
      ]);
    } catch (error: unknown) {
      console.error("❌ Minimal INSERT failed:", (error as Error).message);
      console.log(
        "   This means Prisma defaults are not reflected in the database",
      );
    }

    // Test 3: Try the current seed-users approach
    console.log("\n🔍 Testing current seed-users INSERT...");
    const passwordHash = await bcrypt.hash("test123", 10);
    try {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, name, role, email_verified, metadata, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          "test-current@example.com",
          passwordHash,
          "Test User",
          "student",
          true,
          JSON.stringify({ seeded: true }),
        ],
      );
      console.log("✅ Current seed-users INSERT successful");

      // Clean up
      await pool.query("DELETE FROM users WHERE email = $1", [
        "test-current@example.com",
      ]);
    } catch (error: unknown) {
      console.error(
        "❌ Current seed-users INSERT failed:",
        (error as Error).message,
      );
    }

    // Test 4: Find all required fields
    console.log("\n🔍 Finding all required fields without defaults...");
    const requiredFields = schemaResult.rows.filter(
      (col) => col.is_nullable === "NO" && !col.column_default,
    );

    if (requiredFields.length > 0) {
      console.log("⚠️  Required fields without defaults:");
      requiredFields.forEach((field) => {
        console.log(`  - ${field.column_name} (${field.data_type})`);
      });
    } else {
      console.log("✅ All required fields have defaults");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await pool.end();
  }
}

// Run the test
testSeedUsers().catch(console.error);
