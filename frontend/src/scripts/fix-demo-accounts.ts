#!/usr/bin/env npx tsx
/**
 * Fix Demo Accounts Script
 * Updates demo accounts with proper passwords and roles
 */

import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db/get-pool';

async function fixDemoAccounts() {
  console.log('🔧 Fixing demo accounts...');

  const pool = getPool();

  try {
    // Define demo accounts with their intended passwords and roles
    const demoAccounts = [
      { email: 'student@example.com', password: 'student123', role: 'student' },
      { email: 'teacher@example.com', password: 'teacher123', role: 'teacher' },
      { email: 'admin@example.com', password: 'admin123', role: 'admin' }
    ];

    for (const account of demoAccounts) {
      console.log(`\n📧 Processing ${account.email}...`);

      // Check if user exists
      const checkResult = await pool.query(
        'SELECT id, email, password_hash, role FROM users WHERE email = $1',
        [account.email]
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
            'en',
            true // Mark demo accounts as verified
          ]
        );

        console.log(`  ✅ Created: ${insertResult.rows[0].email} with role: ${insertResult.rows[0].role}`);
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
          [passwordHash, account.role, account.email]
        );

        console.log(`  ✅ Updated password and role: ${account.role}`);
      }
    }

    // Verify all accounts
    console.log('\n📊 Verification:');
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
         END`
    );

    console.table(verifyResult.rows);

    console.log('\n✅ Demo accounts fixed successfully!');
    console.log('\n📝 Login credentials:');
    console.log('  Student: student@example.com / student123');
    console.log('  Teacher: teacher@example.com / teacher123');
    console.log('  Admin: admin@example.com / admin123');

  } catch (error) {
    console.error('❌ Error fixing demo accounts:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  fixDemoAccounts().catch(console.error);
}

export { fixDemoAccounts };
