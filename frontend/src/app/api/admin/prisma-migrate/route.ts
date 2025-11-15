import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function POST() {
  const prisma = new PrismaClient();

  try {
    // Initialize demo users
    const users = [
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

    for (const userData of users) {
      const passwordHash = await bcrypt.hash(userData.password, 10);

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

      createdUsers.push(user.email);
    }

    return NextResponse.json({
      success: true,
      message: 'Prisma migration and seed completed',
      details: {
        usersCreated: createdUsers,
        prismaClient: 'Connected successfully'
      }
    });
  } catch (error) {
    console.error('Prisma migration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
