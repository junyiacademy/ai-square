# 🔺 測試金字塔實作指南 - Integration Tests 層

> 📅 Last Updated: 2025-08-11
> 📊 Current Coverage: 76.59% → Target: 82%+
> 👷 Implementation Time: ~10 hours
> 🎯 Priority: HIGH - Critical for quality assurance

## 📋 Executive Summary

本指南提供完整的 Integration Test 實作方法，幫助工程團隊從當前 76.59% 覆蓋率提升至 82%+。Integration Tests 是測試金字塔的中間層，提供最高的投資報酬率。

### 為什麼是 Integration Tests？

- **CP值最高**: 較少的測試覆蓋較多的程式碼
- **捕捉真實問題**: Unit tests 無法發現的整合問題
- **業務價值**: 驗證完整的使用者旅程

## 🏗️ 架構設計

```
frontend/
├── tests/
│   ├── integration/
│   │   ├── setup/
│   │   │   ├── test-environment.ts      # 測試環境設定
│   │   │   ├── test-fixtures.ts         # 測試資料
│   │   │   ├── test-helpers.ts          # 輔助函數
│   │   │   └── global-setup.ts          # Jest 全域設定
│   │   ├── flows/
│   │   │   ├── complete-learning-journey.test.ts
│   │   │   ├── user-onboarding.test.ts
│   │   │   └── cross-module-integration.test.ts
│   │   ├── cache/
│   │   │   ├── cache-consistency.test.ts
│   │   │   └── cache-invalidation.test.ts
│   │   └── performance/
│   │       ├── load-test.ts
│   │       └── concurrent-users.test.ts
├── jest.integration.config.js           # Jest 設定
└── package.json                          # NPM scripts
```

## 🛠️ Step 1: 建立測試基礎設施

### 1.1 測試環境管理器

**📁 `/frontend/tests/integration/setup/test-environment.ts`**

```typescript
import { Pool } from "pg";
import Redis from "ioredis";
import { repositoryFactory } from "@/lib/repositories/factory/repository-factory";
import * as fs from "fs";
import * as path from "path";

export class IntegrationTestEnvironment {
  private dbPool: Pool;
  private redisClient: Redis;
  private testDbName: string;
  private isSetup: boolean = false;

  constructor() {
    // 使用時間戳確保唯一性
    this.testDbName = `test_db_${Date.now()}_${process.pid}`;
  }

  async setup() {
    if (this.isSetup) return;

    console.log(`🚀 Setting up test environment: ${this.testDbName}`);

    try {
      // 1. 創建測試資料庫
      await this.createTestDatabase();

      // 2. 執行 migrations
      await this.runMigrations();

      // 3. 設置 Redis 測試實例
      await this.setupRedis();

      // 4. 初始化 repositories
      await this.initializeRepositories();

      // 5. 設置環境變數
      this.setupEnvironmentVariables();

      this.isSetup = true;
      console.log("✅ Test environment ready");
    } catch (error) {
      console.error("❌ Setup failed:", error);
      await this.teardown();
      throw error;
    }
  }

  async teardown() {
    console.log("🧹 Cleaning up test environment");

    try {
      // 關閉連線
      if (this.dbPool) await this.dbPool.end();
      if (this.redisClient) {
        await this.redisClient.flushdb();
        await this.redisClient.quit();
      }

      // 刪除測試資料庫
      await this.dropTestDatabase();

      console.log("✅ Cleanup complete");
    } catch (error) {
      console.error("⚠️ Cleanup error:", error);
    }
  }

  private async createTestDatabase() {
    const adminPool = new Pool({
      host: process.env.TEST_DB_HOST || "localhost",
      port: parseInt(process.env.TEST_DB_PORT || "5433"),
      database: "postgres",
      user: "postgres",
      password: "postgres",
    });

    // 檢查並刪除已存在的測試資料庫
    await adminPool.query(`DROP DATABASE IF EXISTS ${this.testDbName}`);

    await adminPool.query(`CREATE DATABASE ${this.testDbName}`);

    await adminPool.end();

    // 連接到新資料庫
    this.dbPool = new Pool({
      host: process.env.TEST_DB_HOST || "localhost",
      port: parseInt(process.env.TEST_DB_PORT || "5433"),
      database: this.testDbName,
      user: "postgres",
      password: "postgres",
    });
  }

  private async runMigrations() {
    const schemaPath = path.join(process.cwd(), "scripts/schema-v4.sql");

    const sql = fs.readFileSync(schemaPath, "utf8");

    // 分割 SQL 語句並執行
    const statements = sql.split(";").filter((stmt) => stmt.trim().length > 0);

    for (const statement of statements) {
      await this.dbPool.query(statement);
    }
  }

  private async setupRedis() {
    this.redisClient = new Redis({
      host: process.env.TEST_REDIS_HOST || "localhost",
      port: parseInt(process.env.TEST_REDIS_PORT || "6379"),
      db: 1, // 使用不同的 db index 避免衝突
    });

    await this.redisClient.flushdb();
  }

  private async initializeRepositories() {
    // 設定測試資料庫連線
    process.env.DB_HOST = "localhost";
    process.env.DB_PORT = "5433";
    process.env.DB_NAME = this.testDbName;
    process.env.DB_USER = "postgres";
    process.env.DB_PASSWORD = "postgres";

    // 重新初始化 repository factory
    await repositoryFactory.initialize();
  }

  private setupEnvironmentVariables() {
    process.env.NODE_ENV = "test";
    process.env.REDIS_ENABLED = "true";
    process.env.REDIS_URL = "redis://localhost:6379/1";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    process.env.NEXTAUTH_SECRET = "test-secret";
  }

  private async dropTestDatabase() {
    const adminPool = new Pool({
      host: process.env.TEST_DB_HOST || "localhost",
      port: parseInt(process.env.TEST_DB_PORT || "5433"),
      database: "postgres",
      user: "postgres",
      password: "postgres",
    });

    // 強制斷開連線
    await adminPool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = '${this.testDbName}'
        AND pid <> pg_backend_pid()
    `);

    await adminPool.query(`DROP DATABASE IF EXISTS ${this.testDbName}`);

    await adminPool.end();
  }

  // Getters for test access
  getDbPool() {
    return this.dbPool;
  }
  getRedisClient() {
    return this.redisClient;
  }
  getTestDbName() {
    return this.testDbName;
  }
}
```

### 1.2 測試資料 Fixtures

**📁 `/frontend/tests/integration/setup/test-fixtures.ts`**

```typescript
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export const testFixtures = {
  // 測試用戶
  users: {
    student: {
      id: uuidv4(),
      email: "student@test.com",
      password: "Test123!@#",
      passwordHash: bcrypt.hashSync("Test123!@#", 10),
      name: "Test Student",
      role: "user",
      emailVerified: true,
    },
    teacher: {
      id: uuidv4(),
      email: "teacher@test.com",
      password: "Test123!@#",
      passwordHash: bcrypt.hashSync("Test123!@#", 10),
      name: "Test Teacher",
      role: "teacher",
      emailVerified: true,
    },
    unverified: {
      id: uuidv4(),
      email: "unverified@test.com",
      password: "Test123!@#",
      passwordHash: bcrypt.hashSync("Test123!@#", 10),
      name: "Unverified User",
      role: "user",
      emailVerified: false,
    },
  },

  // PBL 測試情境
  scenarios: {
    pbl: {
      id: uuidv4(),
      mode: "pbl",
      status: "active",
      sourceType: "test",
      sourcePath: "test/pbl-scenario",
      title: {
        en: "Test PBL Scenario",
        zh: "測試 PBL 情境",
      },
      description: {
        en: "Integration test PBL scenario",
        zh: "整合測試 PBL 情境",
      },
      objectives: ["Learn AI basics", "Apply knowledge"],
      taskTemplates: [
        {
          id: "task-1",
          index: 0,
          title: { en: "Understanding AI" },
          type: "question",
          content: {
            instructions: "Answer the following question",
            question: "What is artificial intelligence?",
            hints: ["Think about machine learning"],
          },
          estimatedTime: 5,
        },
        {
          id: "task-2",
          index: 1,
          title: { en: "AI Applications" },
          type: "creation",
          content: {
            instructions: "Create an AI use case",
            requirements: ["Be specific", "Include benefits"],
          },
          estimatedTime: 10,
        },
      ],
      pblData: {
        difficulty: "intermediate",
        prerequisites: [],
        learningOutcomes: ["AI understanding"],
        ksaCodes: {
          knowledge: ["K1.1", "K1.2"],
          skills: ["S2.1"],
          attitudes: ["A3.1"],
        },
      },
    },

    assessment: {
      id: uuidv4(),
      mode: "assessment",
      status: "active",
      sourceType: "test",
      sourcePath: "test/assessment",
      title: {
        en: "AI Literacy Assessment",
        zh: "AI 素養評估",
      },
      description: {
        en: "Test your AI knowledge",
        zh: "測試您的 AI 知識",
      },
      assessmentData: {
        totalQuestions: 10,
        timeLimitMinutes: 30,
        passingScore: 70,
        questions: [
          {
            id: "q1",
            question: { en: "What is machine learning?" },
            options: [
              { en: "A type of AI" },
              { en: "A database" },
              { en: "A programming language" },
              { en: "A hardware device" },
            ],
            correctAnswer: 0,
            domain: "Engaging_with_AI",
          },
        ],
      },
    },

    discovery: {
      id: uuidv4(),
      mode: "discovery",
      status: "active",
      sourceType: "test",
      sourcePath: "test/discovery",
      title: {
        en: "AI Career Explorer",
        zh: "AI 職涯探索",
      },
      description: {
        en: "Explore AI career paths",
        zh: "探索 AI 職涯路徑",
      },
      discoveryData: {
        careerType: "data_scientist",
        requiredSkills: ["Python", "Statistics", "ML"],
        relatedPaths: ["ml_engineer", "data_analyst"],
        milestones: [
          {
            id: "milestone-1",
            title: "Learn Python",
            description: "Master Python programming",
            completed: false,
          },
        ],
      },
    },
  },

  // 測試 API responses
  responses: {
    aiEvaluation: {
      score: 85,
      feedback: "Great understanding of AI concepts",
      strengths: ["Clear explanation", "Good examples"],
      improvements: ["Add more details"],
      ksaScores: {
        knowledge: 90,
        skills: 80,
        attitudes: 85,
      },
    },
  },
};
```

### 1.3 測試輔助函數

**📁 `/frontend/tests/integration/setup/test-helpers.ts`**

```typescript
import { Pool } from "pg";
import jwt from "jsonwebtoken";
import { testFixtures } from "./test-fixtures";

export class TestHelpers {
  constructor(private dbPool: Pool) {}

  // 創建測試用戶
  async createUser(userData = testFixtures.users.student) {
    const result = await this.dbPool.query(
      `INSERT INTO users (id, email, password_hash, name, role, email_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userData.id,
        userData.email,
        userData.passwordHash,
        userData.name,
        userData.role,
        userData.emailVerified,
      ],
    );
    return result.rows[0];
  }

  // 生成 JWT token
  generateAuthToken(userId: string) {
    return jwt.sign(
      { userId, email: "test@example.com" },
      process.env.NEXTAUTH_SECRET || "test-secret",
      { expiresIn: "1h" },
    );
  }

  // 創建測試 scenario
  async createScenario(scenarioData = testFixtures.scenarios.pbl) {
    const result = await this.dbPool.query(
      `INSERT INTO scenarios
       (id, mode, status, source_type, source_path, title, description,
        objectives, task_templates, pbl_data, discovery_data, assessment_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        scenarioData.id,
        scenarioData.mode,
        scenarioData.status,
        scenarioData.sourceType,
        scenarioData.sourcePath,
        JSON.stringify(scenarioData.title),
        JSON.stringify(scenarioData.description),
        JSON.stringify(scenarioData.objectives),
        JSON.stringify(scenarioData.taskTemplates),
        scenarioData.pblData ? JSON.stringify(scenarioData.pblData) : null,
        scenarioData.discoveryData
          ? JSON.stringify(scenarioData.discoveryData)
          : null,
        scenarioData.assessmentData
          ? JSON.stringify(scenarioData.assessmentData)
          : null,
      ],
    );
    return result.rows[0];
  }

  // 創建 program
  async createProgram(userId: string, scenarioId: string) {
    const result = await this.dbPool.query(
      `INSERT INTO programs (user_id, scenario_id, status, mode)
       VALUES ($1, $2, 'active',
         (SELECT mode FROM scenarios WHERE id = $2))
       RETURNING *`,
      [userId, scenarioId],
    );
    return result.rows[0];
  }

  // 清理測試資料
  async cleanup() {
    await this.dbPool.query("TRUNCATE TABLE users CASCADE");
    await this.dbPool.query("TRUNCATE TABLE scenarios CASCADE");
    await this.dbPool.query("TRUNCATE TABLE programs CASCADE");
    await this.dbPool.query("TRUNCATE TABLE tasks CASCADE");
    await this.dbPool.query("TRUNCATE TABLE evaluations CASCADE");
  }

  // 等待條件成立
  async waitFor(
    condition: () => Promise<boolean>,
    timeout = 5000,
    interval = 100,
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error("Timeout waiting for condition");
  }

  // 驗證快取狀態
  async verifyCacheState(key: string, expectedValue: any) {
    const cacheValue = await this.getCacheValue(key);
    expect(cacheValue).toEqual(expectedValue);
  }

  // 取得快取值
  async getCacheValue(key: string) {
    // 實作快取讀取邏輯
    return null;
  }
}
```

## 🧪 Step 2: 核心學習流程整合測試

### 2.1 完整學習旅程測試

**📁 `/frontend/tests/integration/flows/complete-learning-journey.test.ts`**

```typescript
import { IntegrationTestEnvironment } from "../setup/test-environment";
import { TestHelpers } from "../setup/test-helpers";
import { testFixtures } from "../setup/test-fixtures";
import request from "supertest";
import { createServer } from "http";
import { parse } from "url";
import next from "next";

describe("Complete Learning Journey Integration", () => {
  let env: IntegrationTestEnvironment;
  let helpers: TestHelpers;
  let app: any;
  let server: any;
  let authToken: string;
  let userId: string;
  let programId: string;
  let scenarioId: string;

  beforeAll(async () => {
    // 初始化測試環境
    env = new IntegrationTestEnvironment();
    await env.setup();

    helpers = new TestHelpers(env.getDbPool());

    // 啟動 Next.js 測試 server
    const nextApp = next({ dev: false, dir: process.cwd() });
    const handle = nextApp.getRequestHandler();
    await nextApp.prepare();

    server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    });

    await new Promise((resolve) => {
      server.listen(0, resolve);
    });

    app = `http://localhost:${server.address().port}`;
  }, 30000);

  afterAll(async () => {
    server?.close();
    await helpers.cleanup();
    await env.teardown();
  });

  describe("User Registration to Completion Flow", () => {
    test("1. User can register and verify email", async () => {
      // 註冊新用戶
      const registerRes = await request(app).post("/api/auth/register").send({
        email: "newuser@test.com",
        password: "Test123!@#",
        name: "New Test User",
      });

      expect(registerRes.status).toBe(201);
      expect(registerRes.body.user).toBeDefined();
      expect(registerRes.body.user.email).toBe("newuser@test.com");
      userId = registerRes.body.user.id;

      // 從資料庫取得驗證 token
      const tokenResult = await env
        .getDbPool()
        .query(`SELECT token FROM verification_tokens WHERE user_id = $1`, [
          userId,
        ]);
      const verificationToken = tokenResult.rows[0].token;

      // 驗證 email
      const verifyRes = await request(app)
        .post("/api/auth/verify-email")
        .send({ token: verificationToken });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.verified).toBe(true);

      // 確認資料庫已更新
      const userResult = await env
        .getDbPool()
        .query(`SELECT email_verified FROM users WHERE id = $1`, [userId]);
      expect(userResult.rows[0].email_verified).toBe(true);
    });

    test("2. User can login and get session", async () => {
      const loginRes = await request(app).post("/api/auth/login").send({
        email: "newuser@test.com",
        password: "Test123!@#",
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.token).toBeDefined();
      authToken = loginRes.body.token;

      // 驗證 session 存在
      const sessionRes = await request(app)
        .get("/api/auth/session")
        .set("Authorization", `Bearer ${authToken}`);

      expect(sessionRes.status).toBe(200);
      expect(sessionRes.body.user.id).toBe(userId);
      expect(sessionRes.body.user.email).toBe("newuser@test.com");
    });

    test("3. User can start a PBL program", async () => {
      // 創建測試 scenario
      const scenario = await helpers.createScenario(testFixtures.scenarios.pbl);
      scenarioId = scenario.id;

      // 開始 program
      const startRes = await request(app)
        .post(`/api/pbl/scenarios/${scenarioId}/start`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ language: "en" });

      expect(startRes.status).toBe(201);
      expect(startRes.body.program).toBeDefined();
      programId = startRes.body.program.id;

      // 驗證 program 狀態
      expect(startRes.body.program.status).toBe("active");
      expect(startRes.body.program.userId).toBe(userId);
      expect(startRes.body.program.scenarioId).toBe(scenarioId);

      // 驗證資料庫
      const programResult = await env
        .getDbPool()
        .query(`SELECT * FROM programs WHERE id = $1`, [programId]);
      expect(programResult.rows[0].status).toBe("active");
      expect(programResult.rows[0].started_at).toBeDefined();
    });

    test("4. User can complete tasks", async () => {
      // 取得任務列表
      const tasksRes = await request(app)
        .get(`/api/pbl/programs/${programId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(tasksRes.status).toBe(200);
      const tasks = tasksRes.body.tasks;
      expect(tasks.length).toBeGreaterThan(0);

      // 完成第一個任務
      const taskId = tasks[0].id;
      const completeTaskRes = await request(app)
        .post(`/api/pbl/tasks/${taskId}/complete`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          response:
            "AI is artificial intelligence that simulates human intelligence",
          timeSpent: 120,
        });

      expect(completeTaskRes.status).toBe(200);
      expect(completeTaskRes.body.evaluation).toBeDefined();
      expect(completeTaskRes.body.evaluation.score).toBeGreaterThan(0);

      // 驗證任務狀態已更新
      const taskResult = await env
        .getDbPool()
        .query(`SELECT status, completed_at FROM tasks WHERE id = $1`, [
          taskId,
        ]);
      expect(taskResult.rows[0].status).toBe("completed");
      expect(taskResult.rows[0].completed_at).toBeDefined();
    });

    test("5. User can complete program and get certificate", async () => {
      // 先完成所有任務
      const tasksRes = await request(app)
        .get(`/api/pbl/programs/${programId}/tasks`)
        .set("Authorization", `Bearer ${authToken}`);

      const incompleteTasks = tasksRes.body.tasks.filter(
        (t: any) => t.status !== "completed",
      );

      // 完成剩餘任務
      for (const task of incompleteTasks) {
        await request(app)
          .post(`/api/pbl/tasks/${task.id}/complete`)
          .set("Authorization", `Bearer ${authToken}`)
          .send({
            response: "Test response for task completion",
            timeSpent: 60,
          });
      }

      // 完成 program
      const completeRes = await request(app)
        .post(`/api/pbl/programs/${programId}/complete`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.certificate).toBeDefined();
      expect(completeRes.body.totalScore).toBeGreaterThan(0);
      expect(completeRes.body.achievements).toBeInstanceOf(Array);

      // 驗證資料庫狀態
      const programResult = await env.getDbPool().query(
        `SELECT status, completed_at, total_score
         FROM programs WHERE id = $1`,
        [programId],
      );
      expect(programResult.rows[0].status).toBe("completed");
      expect(programResult.rows[0].completed_at).toBeDefined();
      expect(programResult.rows[0].total_score).toBeGreaterThan(0);
    });
  });

  describe("Cross-Module Integration", () => {
    test("Assessment results affect PBL recommendations", async () => {
      // 完成 assessment
      const assessmentScenario = await helpers.createScenario(
        testFixtures.scenarios.assessment,
      );

      const assessmentRes = await request(app)
        .post(`/api/assessment/scenarios/${assessmentScenario.id}/complete`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          answers: [0, 1, 2, 0, 1], // 測試答案
          timeSpent: 600,
        });

      expect(assessmentRes.status).toBe(200);
      const score = assessmentRes.body.score;

      // 取得推薦的 PBL scenarios
      const recommendRes = await request(app)
        .get("/api/pbl/recommendations")
        .set("Authorization", `Bearer ${authToken}`);

      expect(recommendRes.status).toBe(200);

      // 低分應該推薦基礎課程
      if (score < 50) {
        expect(recommendRes.body.scenarios[0].difficulty).toBe("beginner");
      } else {
        expect(recommendRes.body.scenarios[0].difficulty).toBe("intermediate");
      }
    });

    test("PBL completion unlocks Discovery paths", async () => {
      // 檢查 Discovery 解鎖狀態
      const discoveryRes = await request(app)
        .get("/api/discovery/paths")
        .set("Authorization", `Bearer ${authToken}`);

      expect(discoveryRes.status).toBe(200);

      // 驗證因完成 PBL 而解鎖的路徑
      const unlockedPaths = discoveryRes.body.paths.filter(
        (p: any) => p.unlocked,
      );
      expect(unlockedPaths.length).toBeGreaterThan(0);
    });
  });
});
```

## 🚀 Step 3: 快取一致性測試

### 3.1 快取與資料庫同步測試

**📁 `/frontend/tests/integration/cache/cache-consistency.test.ts`**

```typescript
import { IntegrationTestEnvironment } from "../setup/test-environment";
import { TestHelpers } from "../setup/test-helpers";
import request from "supertest";
import Redis from "ioredis";

describe("Cache and Database Consistency", () => {
  let env: IntegrationTestEnvironment;
  let helpers: TestHelpers;
  let redis: Redis;
  let app: string;

  beforeAll(async () => {
    env = new IntegrationTestEnvironment();
    await env.setup();

    helpers = new TestHelpers(env.getDbPool());
    redis = env.getRedisClient();

    // Setup test server
    app = "http://localhost:3001"; // 假設測試 server 在此 port
  });

  afterAll(async () => {
    await helpers.cleanup();
    await env.teardown();
  });

  test("Cache invalidation on data update", async () => {
    // 1. 創建測試資料
    const scenario = await helpers.createScenario();
    const scenarioId = scenario.id;

    // 2. 第一次讀取 (cache miss)
    const res1 = await request(app)
      .get(`/api/pbl/scenarios/${scenarioId}`)
      .query({ lang: "en" });

    expect(res1.headers["x-cache"]).toBe("MISS");
    expect(res1.body.title.en).toBe("Test PBL Scenario");

    // 3. 第二次讀取 (cache hit)
    const res2 = await request(app)
      .get(`/api/pbl/scenarios/${scenarioId}`)
      .query({ lang: "en" });

    expect(res2.headers["x-cache"]).toBe("HIT");
    expect(res2.body.title.en).toBe("Test PBL Scenario");

    // 4. 直接更新資料庫
    await env.getDbPool().query(
      `UPDATE scenarios
       SET title = $1
       WHERE id = $2`,
      [JSON.stringify({ en: "Updated Title", zh: "更新的標題" }), scenarioId],
    );

    // 5. 清除快取
    const cacheKey = `scenario:${scenarioId}:en`;
    await redis.del(cacheKey);

    // 6. 讀取新資料 (cache miss)
    const res3 = await request(app)
      .get(`/api/pbl/scenarios/${scenarioId}`)
      .query({ lang: "en" });

    expect(res3.headers["x-cache"]).toBe("MISS");
    expect(res3.body.title.en).toBe("Updated Title");

    // 7. 確認快取已更新
    const res4 = await request(app)
      .get(`/api/pbl/scenarios/${scenarioId}`)
      .query({ lang: "en" });

    expect(res4.headers["x-cache"]).toBe("HIT");
    expect(res4.body.title.en).toBe("Updated Title");
  });

  test("Concurrent updates maintain consistency", async () => {
    const user = await helpers.createUser();
    const token = helpers.generateAuthToken(user.id);
    const scenario = await helpers.createScenario();
    const program = await helpers.createProgram(user.id, scenario.id);

    // 10 個並發更新
    const updates = [];
    for (let i = 0; i < 10; i++) {
      updates.push(
        request(app)
          .post(`/api/pbl/programs/${program.id}/update-score`)
          .set("Authorization", `Bearer ${token}`)
          .send({ score: 70 + i }),
      );
    }

    const results = await Promise.all(updates);

    // 驗證所有更新都成功
    results.forEach((res) => {
      expect(res.status).toBe(200);
    });

    // 驗證最終狀態一致
    const dbResult = await env
      .getDbPool()
      .query(`SELECT total_score FROM programs WHERE id = $1`, [program.id]);

    const cacheKey = `program:${program.id}`;
    const cacheValue = await redis.get(cacheKey);
    const cacheData = cacheValue ? JSON.parse(cacheValue) : null;

    // 資料庫和快取應該一致
    expect(cacheData?.totalScore).toBe(dbResult.rows[0].total_score);
  });

  test("Stale-While-Revalidate pattern works correctly", async () => {
    const scenario = await helpers.createScenario();
    const cacheKey = `scenario:${scenario.id}:en`;

    // 設定快取為 stale
    await redis.setex(
      cacheKey,
      1, // 1 秒後過期
      JSON.stringify({
        ...scenario,
        _stale: false,
      }),
    );

    // 等待快取過期
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // 請求應返回 stale 資料並背景更新
    const res = await request(app)
      .get(`/api/pbl/scenarios/${scenario.id}`)
      .query({ lang: "en" });

    expect(res.headers["x-cache"]).toBe("STALE");

    // 等待背景更新完成
    await helpers.waitFor(async () => {
      const value = await redis.get(cacheKey);
      return value !== null && !JSON.parse(value)._stale;
    });

    // 下次請求應該是 HIT
    const res2 = await request(app)
      .get(`/api/pbl/scenarios/${scenario.id}`)
      .query({ lang: "en" });

    expect(res2.headers["x-cache"]).toBe("HIT");
  });

  test("Cache fallback when Redis is down", async () => {
    // 暫時關閉 Redis 連線
    await redis.quit();

    // API 應該仍然能工作（從資料庫讀取）
    const scenario = await helpers.createScenario();

    const res = await request(app)
      .get(`/api/pbl/scenarios/${scenario.id}`)
      .query({ lang: "en" });

    expect(res.status).toBe(200);
    expect(res.body.title.en).toBe("Test PBL Scenario");

    // 重新連接 Redis
    redis = new Redis({
      host: "localhost",
      port: 6379,
      db: 1,
    });
  });
});
```

## 📊 Step 4: 效能與負載測試

### 4.1 並發用戶負載測試

**📁 `/frontend/tests/integration/performance/load-test.ts`**

```typescript
import { IntegrationTestEnvironment } from "../setup/test-environment";
import { TestHelpers } from "../setup/test-helpers";
import { testFixtures } from "../setup/test-fixtures";
import request from "supertest";
import { performance } from "perf_hooks";

describe("Performance and Load Testing", () => {
  let env: IntegrationTestEnvironment;
  let helpers: TestHelpers;
  let app: string;
  let tokens: string[] = [];

  beforeAll(async () => {
    env = new IntegrationTestEnvironment();
    await env.setup();

    helpers = new TestHelpers(env.getDbPool());
    app = "http://localhost:3001";

    // 創建測試用戶
    for (let i = 0; i < 50; i++) {
      const user = await helpers.createUser({
        ...testFixtures.users.student,
        id: `user-${i}`,
        email: `user${i}@test.com`,
      });
      tokens.push(helpers.generateAuthToken(user.id));
    }

    // 創建測試資料
    await helpers.createScenario();
  });

  afterAll(async () => {
    await helpers.cleanup();
    await env.teardown();
  });

  test("API response time under load", async () => {
    const concurrentUsers = 50;
    const requests = [];

    const startTime = performance.now();

    // 模擬 50 個並發用戶
    for (let i = 0; i < concurrentUsers; i++) {
      requests.push(
        request(app)
          .get("/api/pbl/scenarios")
          .set("Authorization", `Bearer ${tokens[i]}`),
      );
    }

    const responses = await Promise.all(requests);
    const endTime = performance.now();

    // 收集響應時間
    const responseTimes = responses.map((res, index) => {
      return {
        status: res.status,
        duration: res.get("X-Response-Time") || 0,
      };
    });

    // 驗證所有請求成功
    const successCount = responses.filter((r) => r.status === 200).length;
    expect(successCount).toBe(concurrentUsers);

    // 計算統計
    const totalTime = endTime - startTime;
    const avgResponseTime = totalTime / concurrentUsers;

    // 計算 P95
    const sortedTimes = responseTimes
      .map((r) => parseFloat(r.duration))
      .sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p95 = sortedTimes[p95Index];

    console.log(`
      Performance Results:
      - Total time: ${totalTime.toFixed(2)}ms
      - Average response time: ${avgResponseTime.toFixed(2)}ms
      - P95 response time: ${p95}ms
      - Success rate: ${((successCount / concurrentUsers) * 100).toFixed(2)}%
    `);

    // 驗證效能指標
    expect(avgResponseTime).toBeLessThan(500); // 平均 < 500ms
    expect(p95).toBeLessThan(1000); // P95 < 1s
  });

  test("Cache hit ratio under load", async () => {
    // 預熱快取
    const warmupRequests = [];
    for (let i = 0; i < 10; i++) {
      warmupRequests.push(request(app).get("/api/ksa?lang=en"));
    }
    await Promise.all(warmupRequests);

    // 執行 100 個請求
    const testRequests = [];
    for (let i = 0; i < 100; i++) {
      testRequests.push(request(app).get("/api/ksa?lang=en"));
    }

    const responses = await Promise.all(testRequests);

    // 計算快取命中率
    const cacheStats = {
      hits: 0,
      misses: 0,
      stale: 0,
    };

    responses.forEach((res) => {
      const cacheHeader = res.headers["x-cache"];
      if (cacheHeader === "HIT") cacheStats.hits++;
      else if (cacheHeader === "MISS") cacheStats.misses++;
      else if (cacheHeader === "STALE") cacheStats.stale++;
    });

    const hitRatio = cacheStats.hits / responses.length;

    console.log(`
      Cache Performance:
      - Hits: ${cacheStats.hits}
      - Misses: ${cacheStats.misses}
      - Stale: ${cacheStats.stale}
      - Hit ratio: ${(hitRatio * 100).toFixed(2)}%
    `);

    // 預期 90%+ 快取命中
    expect(hitRatio).toBeGreaterThan(0.9);
  });

  test("Database connection pool under stress", async () => {
    const iterations = 100;
    const queries = [];

    // 快速執行大量資料庫查詢
    for (let i = 0; i < iterations; i++) {
      queries.push(env.getDbPool().query("SELECT 1"));
    }

    const startTime = performance.now();
    await Promise.all(queries);
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const avgQueryTime = totalTime / iterations;

    console.log(`
      Database Performance:
      - Total queries: ${iterations}
      - Total time: ${totalTime.toFixed(2)}ms
      - Average query time: ${avgQueryTime.toFixed(2)}ms
    `);

    // 平均查詢時間應該很短
    expect(avgQueryTime).toBeLessThan(10);
  });

  test("Memory usage remains stable", async () => {
    const initialMemory = process.memoryUsage();

    // 執行大量操作
    const operations = [];
    for (let i = 0; i < 100; i++) {
      operations.push(
        request(app)
          .get("/api/pbl/scenarios")
          .set("Authorization", `Bearer ${tokens[0]}`),
      );
    }

    await Promise.all(operations);

    // 強制 garbage collection（如果可用）
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage();

    // 計算記憶體增長
    const memoryGrowth = {
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      external: finalMemory.external - initialMemory.external,
    };

    console.log(`
      Memory Usage:
      - Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
      - Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB
      - Growth: ${(memoryGrowth.heapUsed / 1024 / 1024).toFixed(2)}MB
    `);

    // 記憶體增長不應超過 100MB
    expect(memoryGrowth.heapUsed).toBeLessThan(100 * 1024 * 1024);
  });
});
```

## 🔧 Step 5: 設定檔案

### 5.1 Jest Integration 設定

**📁 `/frontend/jest.integration.config.js`**

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests/integration"],
  testMatch: ["**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/integration/setup/jest.setup.ts"],
  globalSetup: "<rootDir>/tests/integration/setup/global-setup.ts",
  globalTeardown: "<rootDir>/tests/integration/setup/global-teardown.ts",
  testTimeout: 30000,
  maxWorkers: 1,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/index.ts",
  ],
  coveragePathIgnorePatterns: ["/node_modules/", "/.next/", "/coverage/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  globals: {
    "ts-jest": {
      tsconfig: {
        jsx: "react",
      },
    },
  },
};
```

### 5.2 NPM Scripts

**📁 `/frontend/package.json` 更新**

```json
{
  "scripts": {
    "test:integration": "jest --config jest.integration.config.js --runInBand",
    "test:integration:watch": "jest --config jest.integration.config.js --watch --runInBand",
    "test:integration:coverage": "jest --config jest.integration.config.js --coverage --runInBand",
    "test:integration:debug": "node --inspect-brk ./node_modules/.bin/jest --config jest.integration.config.js --runInBand",
    "test:load": "jest tests/integration/performance --config jest.integration.config.js --maxWorkers=1",
    "test:cache": "jest tests/integration/cache --config jest.integration.config.js --runInBand",
    "test:flows": "jest tests/integration/flows --config jest.integration.config.js --runInBand",
    "test:pyramid": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:all": "npm run test:pyramid && npm run test:load"
  }
}
```

### 5.3 Docker Compose 測試環境

**📁 `/frontend/docker-compose.test.yml`**

```yaml
version: "3.8"

services:
  postgres-test:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    ports:
      - "5433:5432"
    volumes:
      - postgres-test-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis-test:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres-test-data:
```

## 📊 執行與監控

### 執行測試

```bash
# 1. 啟動測試環境
docker-compose -f docker-compose.test.yml up -d

# 2. 執行所有整合測試
npm run test:integration

# 3. 執行特定測試套件
npm run test:flows           # 學習流程測試
npm run test:cache           # 快取測試
npm run test:load            # 負載測試

# 4. 產生覆蓋率報告
npm run test:integration:coverage
open coverage/lcov-report/index.html

# 5. Debug 模式
npm run test:integration:debug
```

### CI/CD 整合

**📁 `.github/workflows/integration-tests.yml`**

```yaml
name: Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  integration-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5433:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: "18"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        env:
          TEST_DB_HOST: localhost
          TEST_DB_PORT: 5433
          TEST_REDIS_HOST: localhost
          TEST_REDIS_PORT: 6379
        run: npm run test:integration:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: integration
```

## 📈 預期成果

### 覆蓋率提升

```
Current State:
├── Unit Tests: 76.59%
├── Integration Tests: 0% → 85%
└── E2E Tests: ~20%

Target State:
├── Unit Tests: 77%
├── Integration Tests: 85%
└── Overall Coverage: 82%+
```

### 測試金字塔分佈

```
         /\
        /E2E\      10% - Critical user journeys
       /------\
      /  Integ \   30% - API & DB integration
     /----------\
    /   Unit     \ 60% - Business logic
   /--------------\
```

### 品質指標達成

- ✅ 關鍵使用者流程 100% 覆蓋
- ✅ API 整合測試覆蓋率 > 90%
- ✅ 快取一致性保證
- ✅ 效能基準建立 (P95 < 1s)
- ✅ 並發測試通過 (50+ users)

## ⚠️ 最佳實踐與注意事項

### Do's ✅

1. **測試隔離**: 每個測試使用獨立的資料庫
2. **並行控制**: 使用 `--runInBand` 避免衝突
3. **清理策略**: `afterEach` 清理測試資料
4. **超時設定**: 30 秒給整合測試足夠時間
5. **Mock 外部服務**: AI API 使用 mock

### Don'ts ❌

1. **不要共享測試資料**: 避免測試間依賴
2. **不要跳過清理**: 會造成資料污染
3. **不要並行執行**: 資料庫操作可能衝突
4. **不要硬編碼等待**: 使用 `waitFor` helper
5. **不要忽略錯誤**: 記錄並分析失敗原因

## 🚀 Quick Start Checklist

- [ ] 安裝 Docker Desktop
- [ ] 複製測試環境設定檔
- [ ] 啟動測試資料庫和 Redis
- [ ] 執行第一個整合測試
- [ ] 查看覆蓋率報告
- [ ] 整合到 CI/CD pipeline

## 📚 相關文件

- [測試覆蓋率分析](../coverage-analysis.md)
- [測試策略文件](../TESTING-STRATEGY.md)
- [API 文件](../api/README.md)
- [資料庫架構](../database/schema.md)

---

_最後更新: 2025-08-11 | 作者: AI Square Engineering Team_
