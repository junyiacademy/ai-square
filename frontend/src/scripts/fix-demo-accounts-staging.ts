#!/usr/bin/env npx tsx
/**
 * Fix Demo Accounts on Staging Script
 * Updates demo accounts with proper passwords and roles on staging database
 */

import bcrypt from "bcryptjs";
import { Pool } from "pg";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function fixStagingDemoAccounts() {
  console.log("🔧 Fixing demo accounts on STAGING...");

  // Create a connection pool for staging
  const pool = new Pool({
    host: "/cloudsql/ai-square-2024:asia-east1:ai-square-db-staging",
    database: "ai_square_db",
    user: "postgres",
    password: process.env.STAGING_DB_PASSWORD || process.env.DB_PASSWORD,
    max: 1,
  });

  try {
    // Test connection
    await pool.query("SELECT NOW()");
    console.log("✅ Connected to staging database");

    // Define demo accounts with their intended passwords and roles
    const demoAccounts = [
      { email: "student@example.com", password: "student123", role: "student" },
      { email: "teacher@example.com", password: "teacher123", role: "teacher" },
      { email: "admin@example.com", password: "admin123", role: "admin" },
    ];

    for (const account of demoAccounts) {
      console.log(`\n📧 Processing ${account.email}...`);

      // Check if user exists
      const checkResult = await pool.query(
        "SELECT id, email, password_hash, role FROM users WHERE email = $1",
        [account.email],
      );

      if (checkResult.rows.length === 0) {
        console.log(`  ➕ Creating new user: ${account.email}`);

        // Hash the password
        const passwordHash = await bcrypt.hash(account.password, 10);

        // Create the user
        const insertResult = await pool.query(
          `INSERT INTO users (email, password_hash, role, name, preferred_language, email_verified)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, email, role`,
          [
            account.email,
            passwordHash,
            account.role,
            `${account.role.charAt(0).toUpperCase() + account.role.slice(1)} User`,
            "en",
            true, // Mark demo accounts as verified
          ],
        );

        console.log(
          `  ✅ Created: ${insertResult.rows[0].email} with role: ${insertResult.rows[0].role}`,
        );
      } else {
        const user = checkResult.rows[0];
        console.log(`  🔍 Found existing user: ${user.email}`);

        // Hash the password
        const passwordHash = await bcrypt.hash(account.password, 10);

        // Update password and role
        await pool.query(
          `UPDATE users
           SET password_hash = $1,
               role = $2,
               email_verified = true
           WHERE email = $3`,
          [passwordHash, account.role, account.email],
        );

        console.log(`  ✅ Updated password and role: ${account.role}`);
      }
    }

    // Verify all accounts
    console.log("\n📊 Verification:");
    const verifyResult = await pool.query(
      `SELECT email, role,
              CASE WHEN password_hash IS NOT NULL THEN 'SET' ELSE 'NOT SET' END as password_status,
              email_verified
       FROM users
       WHERE email IN ('student@example.com', 'teacher@example.com', 'admin@example.com')
       ORDER BY
         CASE role
           WHEN 'student' THEN 1
           WHEN 'teacher' THEN 2
           WHEN 'admin' THEN 3
         END`,
    );

    console.table(verifyResult.rows);

    console.log("\n✅ Staging demo accounts fixed successfully!");
    console.log("\n📝 Login credentials for staging:");
    console.log(
      "  🌐 URL: https://ai-square-staging-731209836128.asia-east1.run.app/login",
    );
    console.log("  Student: student@example.com / student123");
    console.log("  Teacher: teacher@example.com / teacher123");
    console.log("  Admin: admin@example.com / admin123");
  } catch (error) {
    console.error("❌ Error fixing staging demo accounts:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  // Check if running on Cloud Run or locally with Cloud SQL proxy
  const isCloudRun = process.env.K_SERVICE;
  const hasCloudSQLProxy = process.env.INSTANCE_CONNECTION_NAME;

  if (!isCloudRun && !hasCloudSQLProxy) {
    console.log(
      "⚠️  This script needs to run with Cloud SQL proxy or on Cloud Run",
    );
    console.log("\n📝 To run locally with Cloud SQL proxy:");
    console.log("1. Start the proxy:");
    console.log(
      "   cloud-sql-proxy --port=5432 ai-square-2024:asia-east1:ai-square-db-staging",
    );
    console.log("2. Set environment:");
    console.log("   export DB_HOST=127.0.0.1");
    console.log("   export DB_PASSWORD=YOUR_STAGING_PASSWORD");
    console.log("3. Run this script again");
    process.exit(1);
  }

  fixStagingDemoAccounts().catch(console.error);
}

export { fixStagingDemoAccounts };
