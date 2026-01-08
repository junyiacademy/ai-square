import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
// import { execSync } from 'child_process'; // TODO: use for migration commands

export async function POST(request: Request) {
  // Authentication check
  const adminSecret = process.env.ADMIN_SEED_SECRET;
  if (!adminSecret) {
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 },
    );
  }

  const body = await request.json();
  if (!body.secretKey || body.secretKey !== adminSecret) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const prisma = new PrismaClient();

  // Get passwords from environment variables
  const studentPassword = process.env.DEMO_STUDENT_PASSWORD || "student123";
  const teacherPassword = process.env.DEMO_TEACHER_PASSWORD || "teacher123";
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || "admin123";

  try {
    // Check if migration is needed by trying to access the User table
    try {
      await prisma.user.count();
      console.log("Database schema is ready");
    } catch (error) {
      console.error("Database schema not ready:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            "Database schema not initialized. Please run Prisma migrations manually.",
        },
        { status: 500 },
      );
    }

    // Initialize demo users
    const users = [
      {
        email: "student@example.com",
        password: studentPassword,
        role: "student",
        name: "Student User",
      },
      {
        email: "teacher@example.com",
        password: teacherPassword,
        role: "teacher",
        name: "Teacher User",
      },
      {
        email: "admin@example.com",
        password: adminPassword,
        role: "admin",
        name: "Admin User",
      },
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
          preferredLanguage: "en",
          emailVerified: true,
          onboardingCompleted: true,
          level: 1,
          totalXp: 0,
          achievements: [],
          skills: [],
          preferences: {},
          metadata: {},
        },
      });

      createdUsers.push(user.email);
    }

    return NextResponse.json({
      success: true,
      message: "Prisma migration and seed completed",
      details: {
        usersCreated: createdUsers,
        prismaClient: "Connected successfully",
      },
    });
  } catch (error) {
    console.error("Prisma migration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
