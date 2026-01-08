import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getRedisClient } from "@/lib/cache/redis-client";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    database: {
      status: boolean;
      responseTime?: number;
      error?: string;
    };
    redis: {
      status: boolean;
      responseTime?: number;
      error?: string;
    };
    memory: {
      status: boolean;
      used: number;
      limit: number;
      percentage: number;
    };
    diskSpace?: {
      status: boolean;
      available: number;
      percentage: number;
    };
  };
  uptime: number;
}

export async function GET(): Promise<NextResponse> {
  // Add timeout to prevent hanging
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second total timeout

  try {
    const health: HealthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      checks: {
        database: { status: false },
        redis: { status: false },
        memory: {
          status: true,
          used: 0,
          limit: 0,
          percentage: 0,
        },
      },
      uptime: process.uptime(),
    };

    // 1. Check Database (with shorter timeout)
    if (process.env.DATABASE_URL) {
      try {
        const dbStart = Date.now();
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          max: 1,
          connectionTimeoutMillis: 2000, // Reduce to 2 seconds
        });

        // Use Promise.race to enforce timeout
        const queryPromise = pool.query("SELECT 1").then(async (result) => {
          await pool.end();
          return result;
        });

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Database timeout")), 2000),
        );

        await Promise.race([queryPromise, timeoutPromise]);

        health.checks.database = {
          status: true,
          responseTime: Date.now() - dbStart,
        };
      } catch (error) {
        health.checks.database = {
          status: false,
          error:
            error instanceof Error ? error.message : "Unknown database error",
        };
        health.status = "degraded";
      }
    } else {
      health.checks.database = {
        status: false,
        error: "DATABASE_URL not configured",
      };
      health.status = "degraded";
    }

    // 2. Check Redis Cache (with timeout)
    try {
      const redisStart = Date.now();

      // Wrap Redis check in timeout
      const redisCheckPromise = getRedisClient().then(
        async (redis: unknown) => {
          if (redis && typeof redis === "object" && "ping" in redis) {
            await (redis as { ping: () => Promise<void> }).ping();
            return { status: true, responseTime: Date.now() - redisStart };
          } else {
            return { status: false, error: "Redis client not available" };
          }
        },
      );

      const redisTimeoutPromise = new Promise<{
        status: boolean;
        error: string;
      }>((resolve) =>
        setTimeout(
          () => resolve({ status: false, error: "Redis timeout" }),
          1000,
        ),
      );

      const redisResult = await Promise.race([
        redisCheckPromise,
        redisTimeoutPromise,
      ]);
      health.checks.redis = redisResult as typeof health.checks.redis;
    } catch (error) {
      health.checks.redis = {
        status: false,
        error: error instanceof Error ? error.message : "Unknown redis error",
      };
      // Redis is optional, don't degrade status
    }

    // 3. Check Memory Usage
    const memUsage = process.memoryUsage();
    const memLimit = 512 * 1024 * 1024; // 512MB default limit
    const memPercentage = (memUsage.heapUsed / memLimit) * 100;

    health.checks.memory = {
      status: memPercentage < 90,
      used: memUsage.heapUsed,
      limit: memLimit,
      percentage: Math.round(memPercentage),
    };

    if (memPercentage > 90) {
      health.status = "degraded";
    }

    // 4. Determine overall health
    if (!health.checks.database.status && process.env.DATABASE_URL) {
      health.status = "unhealthy";
    }

    // Clear timeout
    clearTimeout(timeoutId);

    // Return appropriate status code
    const statusCode =
      health.status === "healthy"
        ? 200
        : health.status === "degraded"
          ? 200
          : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    // Clear timeout on error
    clearTimeout(timeoutId);

    // Return basic health status on error
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Health check failed",
        checks: {
          database: { status: false, error: "Check failed" },
          redis: { status: false, error: "Check failed" },
          memory: { status: false, used: 0, limit: 0, percentage: 0 },
        },
        uptime: process.uptime(),
      },
      { status: 503 },
    );
  }
}

// Readiness check - used by Kubernetes/Cloud Run
export async function HEAD(): Promise<NextResponse> {
  // Quick check - just verify the app is responding
  return new NextResponse(null, { status: 200 });
}
