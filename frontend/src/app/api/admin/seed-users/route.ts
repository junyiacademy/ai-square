import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Pool } from "pg";

interface UserSeed {
  email: string;
  password: string;
  role: string;
  name?: string;
}

/**
 * Seed demo user accounts via API
 * This endpoint is called by GitHub Actions during deployment
 *
 * SECURITY: Requires ADMIN_SEED_SECRET environment variable for authentication
 */
export async function POST(request: NextRequest) {
  let pool: Pool | null = null;

  try {
    // SECURITY: Require authentication via secret key
    const adminSecret = process.env.ADMIN_SEED_SECRET;
    if (!adminSecret) {
      console.error("ADMIN_SEED_SECRET environment variable not set");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 },
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // If no body, continue with empty object
    }

    // Verify secret key
    const providedSecret = body.secretKey as string;
    if (!providedSecret || providedSecret !== adminSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get demo passwords from environment variables (with fallback for CI)
    const studentPassword = process.env.DEMO_STUDENT_PASSWORD || "student123";
    const teacherPassword = process.env.DEMO_TEACHER_PASSWORD || "teacher123";
    const adminPassword = process.env.DEMO_ADMIN_PASSWORD || "admin123";

    // Default demo users with passwords from env vars
    const defaultUsers: UserSeed[] = [
      {
        email: "student@example.com",
        password: studentPassword,
        role: "student",
        name: "Demo Student",
      },
      {
        email: "teacher@example.com",
        password: teacherPassword,
        role: "teacher",
        name: "Demo Teacher",
      },
      {
        email: "admin@example.com",
        password: adminPassword,
        role: "admin",
        name: "Demo Admin",
      },
    ];

    // Allow override from request body for testing, but use defaults if not provided
    let users: UserSeed[] = defaultUsers;
    let cleanMode = false;

    if (body.users && Array.isArray(body.users) && body.users.length > 0) {
      users = body.users as UserSeed[];
    }
    if (body.clean === true) {
      cleanMode = true;
    }

    // Create database connection
    if (process.env.DATABASE_URL) {
      const isCloudSQL = process.env.DATABASE_URL.includes("/cloudsql/");
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
        connectionTimeoutMillis: isCloudSQL ? 10000 : 2000,
        idleTimeoutMillis: 30000,
      });
    } else {
      const dbHost = process.env.DB_HOST || "127.0.0.1";
      const isCloudSQL = dbHost.startsWith("/cloudsql/");

      const dbConfig: Record<string, unknown> = {
        database: process.env.DB_NAME || "ai_square_db",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
        max: 20,
        connectionTimeoutMillis: isCloudSQL ? 10000 : 2000,
        idleTimeoutMillis: 30000,
      };

      if (isCloudSQL) {
        dbConfig.host = dbHost;
      } else {
        dbConfig.host = dbHost;
        dbConfig.port = parseInt(process.env.DB_PORT || "5433");
      }

      pool = new Pool(dbConfig);
    }

    // Clean mode: delete all existing users before seeding
    let deletedCount = 0;
    if (cleanMode) {
      console.log("🧹 Clean mode: Deleting all existing users...");
      const deleteResult = await pool.query("DELETE FROM users");
      deletedCount = deleteResult.rowCount || 0;
      console.log(`✅ Deleted ${deletedCount} existing users`);
    }

    const results = await Promise.all(
      users.map(async (userData) => {
        try {
          // Check if user already exists
          const existingUserResult = await pool!.query(
            "SELECT id FROM users WHERE email = $1",
            [userData.email],
          );

          if (existingUserResult.rows.length > 0) {
            // Update password if user exists
            const passwordHash = await bcrypt.hash(userData.password, 10);
            await pool!.query(
              `UPDATE users
               SET password_hash = $1, role = $2, updated_at = CURRENT_TIMESTAMP
               WHERE email = $3`,
              [passwordHash, userData.role, userData.email],
            );

            return {
              email: userData.email,
              status: "updated",
            };
          } else {
            // Create new user
            const passwordHash = await bcrypt.hash(userData.password, 10);
            const name =
              userData.name ||
              `${userData.role.charAt(0).toUpperCase()}${userData.role.slice(1)} User`;

            await pool!.query(
              `INSERT INTO users (id, email, password_hash, name, role, email_verified, metadata, created_at, updated_at)
               VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [
                userData.email,
                passwordHash,
                name,
                userData.role,
                true,
                JSON.stringify({ seeded: true }),
              ],
            );

            return {
              email: userData.email,
              status: "created",
            };
          }
        } catch (error) {
          console.error(`Failed to seed user ${userData.email}:`, error);
          return {
            email: userData.email,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),
    );

    const created = results.filter((r) => r.status === "created").length;
    const updated = results.filter((r) => r.status === "updated").length;
    const failed = results.filter((r) => r.status === "failed").length;

    const message = cleanMode
      ? `Clean mode: Deleted ${deletedCount} users, Created: ${created}, Failed: ${failed}`
      : `Created: ${created}, Updated: ${updated}, Failed: ${failed}`;

    return NextResponse.json({
      success: failed === 0,
      message,
      results: {
        ...(!cleanMode && { updated }),
        created,
        failed,
        ...(cleanMode && { deleted: deletedCount }),
        details: results,
      },
    });
  } catch (error) {
    console.error("User seeding error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "User seeding failed",
      },
      { status: 500 },
    );
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}
