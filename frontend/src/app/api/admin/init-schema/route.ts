import { NextResponse } from "next/server";
import { Pool } from "pg";

/**
 * Initialize database schema via API
 * This endpoint is called by GitHub Actions during deployment
 */
export async function POST() {
  let pool: Pool | null = null;

  try {
    // Remove admin key check - keeping API simple

    // Create database connection
    if (process.env.DATABASE_URL) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 1,
        connectionTimeoutMillis: 5000,
      });
    } else {
      const dbHost = process.env.DB_HOST || "127.0.0.1";
      const isCloudSQL = dbHost.startsWith("/cloudsql/");

      const dbConfig: Record<string, unknown> = {
        database: process.env.DB_NAME || "ai_square_db",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
        max: 1,
        connectionTimeoutMillis: 5000,
      };

      if (isCloudSQL) {
        dbConfig.host = dbHost;
      } else {
        dbConfig.host = dbHost;
        dbConfig.port = parseInt(process.env.DB_PORT || "5433");
      }

      pool = new Pool(dbConfig);
    }

    // Test database connection
    const testResult = await pool.query("SELECT 1");
    if (!testResult) {
      throw new Error("Database connection failed");
    }

    // Initialize schema - verify that database tables exist
    // This is for verification and any app-level initialization
    const tables = [
      "users",
      "scenarios",
      "programs",
      "tasks",
      "evaluations",
      "achievements",
    ];

    const results = await Promise.all(
      tables.map(async (table) => {
        const result = await pool!.query(
          `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = $1`,
          [table],
        );
        return {
          table,
          exists: parseInt(result.rows[0].count) > 0,
        };
      }),
    );

    const missingTables = results.filter((r) => !r.exists);
    if (missingTables.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing tables",
          missing: missingTables.map((t) => t.table),
        },
        { status: 500 },
      );
    }

    // Add any app-specific initialization here
    // For example, creating indexes, views, or stored procedures

    return NextResponse.json({
      success: true,
      message: "Database schema verified",
      tables: results,
    });
  } catch (error) {
    console.error("Schema initialization error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Schema initialization failed",
      },
      { status: 500 },
    );
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}
