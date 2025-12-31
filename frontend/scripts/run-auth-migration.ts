#!/usr/bin/env tsx
/**
 * Run authentication migration to add password support
 * Usage: npx tsx scripts/run-auth-migration.ts
 */

import { Pool } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: parseInt(process.env.DB_PORT || "5433"),
    database: process.env.DB_NAME || "ai_square_db",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  });

  try {
    console.log("🔄 Running authentication migration...");

    // Read migration file
    const migrationPath = path.join(
      __dirname,
      "../src/lib/repositories/postgresql/migrations/20250204-add-password-column.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8");

    // Execute migration
    await pool.query(migrationSQL);

    console.log("✅ Migration completed successfully!");
    console.log("📋 Added columns:");
    console.log("  - password_hash: For storing bcrypt hashed passwords");
    console.log("  - role: For user permissions (student, teacher, admin)");
    console.log("  - email_verified: Email verification status");
    console.log("  - email_verified_at: Email verification timestamp");
    console.log("📋 Created tables:");
    console.log(
      "  - verification_tokens: For email verification and password reset",
    );
    console.log("  - user_sessions: For session management");

    // Check current users
    const { rows: users } = await pool.query(
      "SELECT id, email, role FROM users LIMIT 5",
    );
    console.log("\n📊 Sample users in database:");
    users.forEach((user) => {
      console.log(`  - ${user.email} (${user.role || "student"})`);
    });
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error);
