import { spawn, execSync } from "child_process";
import { Pool } from "pg";
import waitOn from "wait-on";
import * as fs from "fs";
import * as path from "path";

/**
 * Global setup for integration tests
 * Runs once before all test suites
 *
 * IMPORTANT: Always clean up ports before starting services
 */

let nextProcess: ReturnType<typeof spawn> | undefined;
let dbPool: Pool;

// Test-specific ports to avoid conflicts
const TEST_PORTS = {
  NEXT: process.env.TEST_PORT || "3456",
  DB: process.env.TEST_DB_PORT || "5433",
  REDIS: process.env.TEST_REDIS_PORT || "6380",
};

/**
 * Kill all processes using a specific port
 * MUST be done before starting any test services
 * BUT skip PostgreSQL/Redis if they're our test instances
 */
function killPort(port: string, serviceName: string): void {
  console.log(`🧹 Checking port ${port} (${serviceName})...`);

  // Special handling for PostgreSQL and Redis test ports - DON'T kill them!
  if (
    (port === "5433" && serviceName === "PostgreSQL") ||
    (port === "6380" && serviceName === "Redis")
  ) {
    console.log(`   ⏭️ Skipping ${serviceName} on port ${port} (test service)`);
    return;
  }

  // Only kill Next.js port
  if (port === "3456" && serviceName === "Next.js") {
    try {
      // Find and kill only Node.js processes using the port (not Docker containers)
      execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`, {
        stdio: "ignore",
      });
      console.log(`   ✅ Port ${port} cleaned`);
    } catch (error) {
      // Ignore errors - port might not be in use
    }
  }
}

/**
 * Try to start test containers if Docker is available
 * But don't fail if Docker is not available - just try to connect to services
 */
async function tryStartContainers(): Promise<void> {
  console.log("🐳 Checking test environment...");
  // Resolve docker compose command (prefer v2 'docker compose')
  let composeCmd: string | undefined;
  try {
    execSync("docker compose version", { stdio: "ignore" });
    composeCmd = "docker compose";
  } catch {}
  if (!composeCmd) {
    try {
      execSync("docker-compose --version", { stdio: "ignore" });
      composeCmd = "docker-compose";
    } catch {}
  }
  if (composeCmd) {
    console.log(
      "   ℹ️ Docker compose is available, ensuring containers are up...",
    );
    try {
      // Use absolute path to docker-compose.test.yml
      const projectRoot = path.resolve(process.cwd(), "..");
      const frontendRoot = process.cwd();
      const composeFile = fs.existsSync(
        path.join(frontendRoot, "docker-compose.test.yml"),
      )
        ? path.join(frontendRoot, "docker-compose.test.yml")
        : fs.existsSync(
              path.join(projectRoot, "frontend", "docker-compose.test.yml"),
            )
          ? path.join(projectRoot, "frontend", "docker-compose.test.yml")
          : null;

      if (composeFile) {
        execSync(`${composeCmd} -f ${composeFile} up -d`, { stdio: "ignore" });
        console.log("   ✅ Test containers started/verified");
      } else {
        console.log(
          "   ⚠️ docker-compose.test.yml not found, will try to connect anyway",
        );
      }
    } catch (error) {
      console.log(
        "   ⚠️ Could not start containers, will try to connect anyway",
      );
    }
  } else {
    console.log(
      "   ℹ️ Docker compose not available, assuming services are running elsewhere",
    );
  }
}

export default async function globalSetup() {
  console.log("\n🚀 Starting global test setup...\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Set test environment variables
  process.env.PORT = TEST_PORTS.NEXT;
  process.env.DB_HOST = process.env.DB_HOST || "127.0.0.1";
  process.env.DB_PORT = TEST_PORTS.DB;
  process.env.DB_NAME = process.env.DB_NAME || "ai_square_db";
  process.env.REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
  process.env.REDIS_PORT = TEST_PORTS.REDIS;
  process.env.API_URL = `http://localhost:${TEST_PORTS.NEXT}`;
  // Force using shared DB to keep API and tests in sync
  process.env.USE_SHARED_DB = "1";

  try {
    // STEP 1: Clean test ports (but keep working PostgreSQL/Redis)
    console.log("📌 Step 1: Cleaning test ports...");
    killPort(TEST_PORTS.NEXT, "Next.js");
    killPort(TEST_PORTS.DB, "PostgreSQL");
    killPort(TEST_PORTS.REDIS, "Redis");
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for ports to be fully released

    // STEP 2: Try to ensure test environment is available
    console.log("\n📌 Step 2: Test environment...");
    // Allow skipping docker in pre-push by setting SKIP_DOCKER=1
    if (process.env.SKIP_DOCKER !== "1") {
      await tryStartContainers();
    } else {
      console.log("   ⏭️ SKIP_DOCKER=1, will not start docker compose");
    }
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Give services time to start

    // Optional: wait for DB port to be open when using compose
    try {
      await waitOn({
        resources: [`tcp:127.0.0.1:${TEST_PORTS.DB}`],
        timeout: 30000,
        interval: 1000,
      });
    } catch {}

    // STEP 3: Verify database connection (flexible - try test port first, then dev port)
    console.log("\n📌 Step 3: Verifying database connection...");

    let dbConnected = false;
    let actualDbPort = TEST_PORTS.DB;

    // Try test database first
    dbPool = new Pool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(TEST_PORTS.DB),
      database: "postgres",
      user: "postgres",
      password: "postgres",
    });

    // Try to connect to test DB
    for (let i = 0; i < 15; i++) {
      try {
        await dbPool.query("SELECT 1");
        dbConnected = true;
        console.log(`   ✅ Test database ready on port ${TEST_PORTS.DB}`);
        break;
      } catch (error) {
        if (i === 14) {
          console.log(
            `   ⚠️ Test database not available on port ${TEST_PORTS.DB}`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // If test DB fails, try development DB
    if (!dbConnected) {
      await dbPool.end();
      actualDbPort = "5433";
      console.log("   Trying development database on port 5433...");

      dbPool = new Pool({
        host: process.env.DB_HOST || "localhost",
        port: 5433,
        database: "postgres",
        user: "postgres",
        password: "postgres",
      });

      try {
        await dbPool.query("SELECT 1");
        dbConnected = true;
        console.log("   ✅ Using development database on port 5433");
        process.env.DB_PORT = "5433"; // Update for tests
      } catch (error) {
        console.log("   ❌ Development database also not available");
      }
    }

    if (!dbConnected) {
      console.error("\n❌ No database available for testing");
      console.log("Please start either:");
      console.log(
        "  1. Test database: docker-compose -f docker-compose.test.yml up -d",
      );
      console.log(
        "  2. Dev database: docker-compose -f docker-compose.postgres.yml up -d",
      );
      process.exit(1);
    }

    await dbPool.end();

    // STEP 4: Ensure DB exists and apply schema
    console.log(`\n📌 Step 4: Ensuring database schema...`);
    const targetDbName = process.env.DB_NAME || "ai_square_db";
    const adminPool = new Pool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || TEST_PORTS.DB),
      database: "postgres",
      user: "postgres",
      password: "postgres",
    });
    const exists = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDbName],
    );
    if (exists.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE ${targetDbName}`);
      console.log(`   ✅ Created database: ${targetDbName}`);
    }
    await adminPool.end();

    const schemaPath = path.join(
      process.cwd(),
      "src",
      "lib",
      "repositories",
      "postgresql",
      "schema-v4.sql",
    );
    const authMigrationPath = path.join(
      process.cwd(),
      "src",
      "lib",
      "repositories",
      "postgresql",
      "migrations",
      "20250204-add-password-column.sql",
    );
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, "utf8");
      const schemaPool = new Pool({
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || TEST_PORTS.DB),
        database: targetDbName,
        user: "postgres",
        password: "postgres",
      });
      try {
        await schemaPool.query(sql);
      } catch (e) {
        // Fallback safe execution if multi-statement fails: split
        const statements = sql
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean);
        for (const stmt of statements) {
          try {
            await schemaPool.query(stmt);
          } catch {
            /* idempotent */
          }
        }
      }
      // Apply auth migration to ensure password_hash/role columns exist
      if (fs.existsSync(authMigrationPath)) {
        const authSql = fs.readFileSync(authMigrationPath, "utf8");
        try {
          await schemaPool.query(authSql);
        } catch (e) {
          const stmts = authSql
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean);
          for (const stmt of stmts) {
            try {
              await schemaPool.query(stmt);
            } catch {
              /* idempotent */
            }
          }
        }
      }
      await schemaPool.end();
      console.log("   ✅ Schema applied to test database");
    } else {
      console.log("   ⚠️ schema-v4.sql not found; skipping schema apply");
    }

    // STEP 5: Start Next.js server on clean test port
    console.log(
      `\n📌 Step 5: Starting Next.js server on port ${TEST_PORTS.NEXT}...`,
    );

    // Start Next.js dev server on test port
    nextProcess = spawn("npm", ["run", "dev"], {
      cwd: process.cwd(),
      detached: false,
      // Avoid holding open stdio pipes which can keep Jest alive
      stdio: "ignore",
      env: {
        ...process.env,
        PORT: TEST_PORTS.NEXT,
        DB_PORT: TEST_PORTS.DB,
        DB_NAME: process.env.DB_NAME || "ai_square_db",
        USE_SHARED_DB: "1",
        REDIS_PORT: TEST_PORTS.REDIS,
        NODE_ENV: "test",
      },
    });
    // Do not keep the parent event loop alive because of the child
    try {
      nextProcess.unref();
    } catch {}

    // Store process reference for cleanup
    (
      global as unknown as { __NEXT_PROCESS__?: ReturnType<typeof spawn> }
    ).__NEXT_PROCESS__ = nextProcess;

    // Wait for server to be ready
    console.log(`   ⏳ Waiting for Next.js server to be ready...`);
    await waitOn({
      resources: [`http://localhost:${TEST_PORTS.NEXT}/api/monitoring/health`],
      timeout: 60000, // 60 seconds timeout
      interval: 1000,
      validateStatus: (status) => status === 200 || status === 503,
    });

    console.log(`   ✅ Next.js server is ready on port ${TEST_PORTS.NEXT}`);

    // STEP 6: Prepare test data
    console.log("\n📌 Step 6: Preparing test database...");
    const testDbPool = new Pool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(TEST_PORTS.DB),
      database: process.env.DB_NAME || "ai_square_db",
      user: "postgres",
      password: "postgres",
    });

    try {
      // Create test data or clean existing data
      // Use individual queries to handle missing tables gracefully
      const cleanupQueries = [
        `DELETE FROM evaluations WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')`,
        `DELETE FROM tasks WHERE program_id IN (SELECT id FROM programs WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com'))`,
        `DELETE FROM programs WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')`,
        `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')`,
        `DELETE FROM verification_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com')`,
        `DELETE FROM users WHERE email LIKE '%@test.com'`,
      ];

      for (const query of cleanupQueries) {
        try {
          await testDbPool.query(query);
        } catch (error) {
          // Ignore errors from missing tables
        }
      }

      console.log("   ✅ Test database prepared");
    } catch (error) {
      console.warn("   ⚠️ Could not clean test data:", error);
    } finally {
      await testDbPool.end();
    }

    // STEP 7: Verify Redis connection (optional - tests can run without it)
    console.log("\n📌 Step 7: Verifying Redis connection...");
    const Redis = require("ioredis");

    let redisConnected = false;
    let actualRedisPort = TEST_PORTS.REDIS;

    // Try test Redis first
    let redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(TEST_PORTS.REDIS),
      retryStrategy: () => null,
      lazyConnect: true,
    });

    try {
      await redis.connect();
      await redis.ping();
      redisConnected = true;
      console.log(`   ✅ Test Redis ready on port ${TEST_PORTS.REDIS}`);
      await redis.quit();
    } catch (error) {
      try {
        await redis.quit();
      } catch {
        // Ignore quit errors
      }

      // Try development Redis
      console.log("   Trying development Redis on port 6379...");
      redis = new Redis({
        host: process.env.REDIS_HOST || "localhost",
        port: 6379,
        retryStrategy: () => null,
        lazyConnect: true,
      });

      try {
        await redis.connect();
        await redis.ping();
        redisConnected = true;
        actualRedisPort = "6379";
        console.log("   ✅ Using development Redis on port 6379");
        process.env.REDIS_PORT = "6379"; // Update for tests
        await redis.quit();
      } catch (error) {
        try {
          await redis.quit();
        } catch {
          // Ignore quit errors
        }
        console.warn("   ⚠️ Redis not available, tests will run without cache");
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✨ Global setup complete!");
    console.log(`   Next.js: http://localhost:${TEST_PORTS.NEXT}`);
    console.log(
      `   PostgreSQL: localhost:${process.env.DB_PORT || TEST_PORTS.DB} (db: ${process.env.DB_NAME || "ai_square_db"})`,
    );
    console.log(`   Redis: localhost:${actualRedisPort || "N/A"}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("❌ Global setup failed:", error);

    // Cleanup on error
    if (nextProcess) {
      nextProcess.kill("SIGTERM");
    }

    process.exit(1);
  }
}

async function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require("net");
    const server = net.createServer();

    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolve(true); // Port is in use
      } else {
        resolve(false);
      }
    });

    server.once("listening", () => {
      server.close();
      resolve(false); // Port is available
    });

    server.listen(port);
  });
}
