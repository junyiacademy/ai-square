import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db/get-pool';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  const pool = getPool();
  
  try {
    // 讀取 migration 檔案
    const migrationPath = path.join(process.cwd(), 'prisma/migrations/001_initial_schema.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
    
    // 執行 migration
    await pool.query(migrationSQL);
    
    // 初始化 demo 用戶
    const users = [
      { email: 'student@example.com', password: 'student123', role: 'student', name: 'Student User' },
      { email: 'teacher@example.com', password: 'teacher123', role: 'teacher', name: 'Teacher User' },
      { email: 'admin@example.com', password: 'admin123', role: 'admin', name: 'Admin User' }
    ];
    
    const bcrypt = await import('bcryptjs');
    
    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await pool.query(`
        INSERT INTO users (email, password_hash, role, name, email_verified)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash
      `, [user.email, passwordHash, user.role, user.name]);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database migrated successfully',
      details: {
        tablesCreated: ['users', 'scenarios', 'programs', 'tasks', 'evaluations'],
        usersCreated: users.map(u => u.email)
      }
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}