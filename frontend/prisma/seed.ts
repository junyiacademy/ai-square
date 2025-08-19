import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create demo users
  const users = [
    { 
      email: 'student@example.com', 
      password: 'student123', 
      role: 'student', 
      name: 'Student User',
      preferredLanguage: 'en'
    },
    { 
      email: 'teacher@example.com', 
      password: 'teacher123', 
      role: 'teacher', 
      name: 'Teacher User',
      preferredLanguage: 'en'
    },
    { 
      email: 'admin@example.com', 
      password: 'admin123', 
      role: 'admin', 
      name: 'Admin User',
      preferredLanguage: 'en'
    }
  ];

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
        preferredLanguage: userData.preferredLanguage,
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

    console.log(`✅ Created/Updated user: ${user.email} (${user.role})`);
  }

  console.log('🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });