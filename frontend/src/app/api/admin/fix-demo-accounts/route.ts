import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getPool } from '@/lib/db/get-pool';

// This is a temporary endpoint to fix demo accounts
// It will be removed after fixing the staging environment
export async function POST(request: NextRequest) {
  try {
    // Simple auth check - require a secret key
    const { secretKey } = await request.json();
    
    if (secretKey !== 'fix-demo-accounts-2025') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('🔧 Fixing demo accounts...');
    
    const pool = getPool();
    const results = [];
    
    // Define demo accounts with their intended passwords and roles
    const demoAccounts = [
      { email: 'student@example.com', password: 'student123', role: 'student' },
      { email: 'teacher@example.com', password: 'teacher123', role: 'teacher' },
      { email: 'admin@example.com', password: 'admin123', role: 'admin' }
    ];
    
    for (const account of demoAccounts) {
      console.log(`Processing ${account.email}...`);
      
      // Check if user exists
      const checkResult = await pool.query(
        'SELECT id, email, password_hash, role FROM users WHERE email = $1',
        [account.email]
      );
      
      if (checkResult.rows.length === 0) {
        // Hash the password
        const passwordHash = await bcrypt.hash(account.password, 10);
        
        // Create the user
        await pool.query(
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
        
        results.push({
          email: account.email,
          action: 'created',
          role: account.role
        });
      } else {
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
        
        results.push({
          email: account.email,
          action: 'updated',
          role: account.role
        });
      }
    }
    
    // Verify all accounts
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
    
    return NextResponse.json({
      success: true,
      message: 'Demo accounts fixed successfully',
      results,
      verification: verifyResult.rows,
      credentials: {
        student: 'student@example.com / student123',
        teacher: 'teacher@example.com / teacher123',
        admin: 'admin@example.com / admin123'
      }
    });
    
  } catch (error) {
    console.error('Error fixing demo accounts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fix demo accounts' },
      { status: 500 }
    );
  }
}