import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function POST() {
  console.log('🚀 Prisma initialization started...');

  try {
    // Create Prisma client with explicit connection string
    const databaseUrl = process.env.DATABASE_URL;
    console.log('Database URL configured:', databaseUrl ? 'Yes' : 'No');

    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      },
      log: ['query', 'error', 'warn'],
    });

    // Test connection
    console.log('Testing database connection...');
    const testResult = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Database connection test:', testResult);

    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    ` as Array<{ table_name: string }>;

    console.log('Existing tables:', tables.map(t => t.table_name));

    // If no tables, we need to run migrations manually
    if (tables.length === 0) {
      console.log('No tables found. Please run migrations first.');
      return NextResponse.json({
        success: false,
        error: 'No tables found. Database schema needs to be initialized.',
        tables: []
      }, { status: 500 });
    }

    // Check if users table exists
    const hasUsersTable = tables.some(t => t.table_name === 'users');
    if (!hasUsersTable) {
      console.log('Users table not found');
      return NextResponse.json({
        success: false,
        error: 'Users table not found',
        tables: tables.map(t => t.table_name)
      }, { status: 500 });
    }

    // Initialize demo users
    const demoUsers = [
      {
        email: 'student@example.com',
        password: 'student123',
        role: 'student',
        name: 'Student User'
      },
      {
        email: 'teacher@example.com',
        password: 'teacher123',
        role: 'teacher',
        name: 'Teacher User'
      },
      {
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
        name: 'Admin User'
      }
    ];

    const createdUsers = [];

    for (const userData of demoUsers) {
      const passwordHash = await bcrypt.hash(userData.password, 10);

      try {
        const user = await prisma.user.upsert({
          where: { email: userData.email },
          update: {
            passwordHash,
            role: userData.role,
            name: userData.name,
            emailVerified: true,
          },
          create: {
            email: userData.email,
            passwordHash,
            role: userData.role,
            name: userData.name,
            preferredLanguage: 'en',
            emailVerified: true,
            onboardingCompleted: true,
            level: 1,
            totalXp: 0,
            achievements: [],
            skills: [],
            preferences: {},
            metadata: {}
          },
        });

        createdUsers.push({
          email: user.email,
          role: user.role
        });
        console.log(`✅ User ${user.email} ready`);
      } catch (userError) {
        console.error(`Error with user ${userData.email}:`, userError);
      }
    }

    // Get user count
    const userCount = await prisma.user.count();

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      message: 'Prisma initialization completed',
      details: {
        databaseConnected: true,
        tables: tables.map(t => t.table_name),
        userCount,
        usersCreated: createdUsers
      }
    });

  } catch (error) {
    console.error('Prisma initialization error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        databaseUrl: process.env.DATABASE_URL ? 'Configured' : 'Not configured',
        nodeEnv: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}
