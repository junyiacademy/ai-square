import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import bcrypt from "bcryptjs";

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

  console.log("Starting Prisma deployment...");

  try {
    // 1. Run Prisma migrations
    console.log("📦 Running Prisma migrations...");
    try {
      // In production, we use prisma migrate deploy
      execSync("npx prisma migrate deploy", {
        stdio: "inherit",
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
      });
      console.log("✅ Prisma migrations completed");
    } catch (migrateError) {
      console.error("Migration error:", migrateError);
      // Continue anyway - migrations might already be applied
    }

    // 2. Initialize Prisma Client
    const prisma = new PrismaClient({
      log: ["query", "info", "warn", "error"],
    });

    // 3. Test connection
    await prisma.$connect();
    console.log("✅ Connected to database");

    // 4. Check if users exist
    const userCount = await prisma.user.count();
    console.log(`📊 Current user count: ${userCount}`);

    // 5. Create demo users if needed
    // Get passwords from environment variables
    const studentPassword = process.env.DEMO_STUDENT_PASSWORD || "student123";
    const teacherPassword = process.env.DEMO_TEACHER_PASSWORD || "teacher123";
    const adminPassword = process.env.DEMO_ADMIN_PASSWORD || "admin123";

    const demoUsers = [
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

        createdUsers.push({
          email: user.email,
          role: user.role,
          created: user.createdAt,
        });
        console.log(`✅ User ${user.email} ready`);
      } catch (userError) {
        console.error(`Error with user ${userData.email}:`, userError);
      }
    }

    // 6. Verify database schema
    const tables = (await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `) as Array<{ table_name: string }>;

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      message: "Prisma deployment completed successfully",
      details: {
        userCount: userCount + createdUsers.length,
        usersCreated: createdUsers,
        tables: tables.map((t) => t.table_name),
        databaseUrl: process.env.DATABASE_URL ? "Configured" : "Not configured",
      },
    });
  } catch (error) {
    console.error("Prisma deployment error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: {
          databaseUrl: process.env.DATABASE_URL
            ? "Configured"
            : "Not configured",
          nodeEnv: process.env.NODE_ENV,
        },
      },
      { status: 500 },
    );
  }
}
