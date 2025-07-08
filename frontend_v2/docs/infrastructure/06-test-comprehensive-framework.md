# /test - 全面測試框架

## 測試策略總覽

為架構重構建立完整的測試框架，確保每個階段的品質和穩定性。

## 1. 測試金字塔

```
          ╱╲
         ╱E2E╲        10% - 關鍵用戶流程
        ╱ Tests╲
       ╱────────╲
      ╱Integration╲    30% - API 和服務整合
     ╱   Tests     ╲
    ╱───────────────╲
   ╱   Unit Tests    ╲  60% - 業務邏輯和工具
  ╱───────────────────╲
```

## 2. 單元測試策略

### 2.1 Repository 層測試
```typescript
// src/lib/data/repositories/__tests__/session.repository.test.ts
import { SessionRepository } from '../session.repository';
import { MockStorageProvider } from '../../__mocks__/storage.provider';

describe('SessionRepository', () => {
  let repository: SessionRepository;
  let mockStorage: MockStorageProvider;
  
  beforeEach(() => {
    mockStorage = new MockStorageProvider();
    repository = new SessionRepository(mockStorage);
  });
  
  describe('create', () => {
    it('should create a new session with generated ID', async () => {
      // Arrange
      const sessionData = {
        userId: 'user123',
        projectId: 'project456',
        type: 'assessment' as const,
        status: 'active' as const
      };
      
      // Act
      const session = await repository.create(sessionData);
      
      // Assert
      expect(session).toMatchObject({
        ...sessionData,
        id: expect.any(String),
        startedAt: expect.any(Date),
        lastActiveAt: expect.any(Date)
      });
      
      expect(mockStorage.set).toHaveBeenCalledWith(
        expect.stringContaining('sessions/'),
        expect.objectContaining(sessionData)
      );
    });
    
    it('should handle storage errors gracefully', async () => {
      // Arrange
      mockStorage.set.mockRejectedValueOnce(new Error('Storage error'));
      
      // Act & Assert
      await expect(repository.create({})).rejects.toThrow('Failed to create session');
      expect(mockStorage.set).toHaveBeenCalled();
    });
  });
  
  describe('findActiveByUser', () => {
    it('should return only active sessions for user', async () => {
      // Arrange
      const sessions = [
        { id: '1', userId: 'user123', status: 'active' },
        { id: '2', userId: 'user123', status: 'completed' },
        { id: '3', userId: 'user456', status: 'active' }
      ];
      mockStorage.list.mockResolvedValueOnce(sessions);
      
      // Act
      const activeSessions = await repository.findActiveByUser('user123');
      
      // Assert
      expect(activeSessions).toHaveLength(1);
      expect(activeSessions[0]).toMatchObject({
        id: '1',
        userId: 'user123',
        status: 'active'
      });
    });
  });
});
```

### 2.2 Service 層測試
```typescript
// src/lib/services/__tests__/unified-evaluation.service.test.ts
describe('UnifiedEvaluationService', () => {
  let service: UnifiedEvaluationService;
  let mockQuizStrategy: jest.Mocked<QuizEvaluationStrategy>;
  let mockRubricStrategy: jest.Mocked<RubricEvaluationStrategy>;
  
  beforeEach(() => {
    mockQuizStrategy = createMockStrategy('quiz');
    mockRubricStrategy = createMockStrategy('rubric');
    
    service = new UnifiedEvaluationService([
      mockQuizStrategy,
      mockRubricStrategy
    ]);
  });
  
  describe('evaluate', () => {
    it('should select correct strategy based on input type', async () => {
      // Arrange
      const quizInput = {
        type: 'quiz' as const,
        answers: [{ questionId: 'q1', answer: 'A' }]
      };
      
      mockQuizStrategy.canEvaluate.mockReturnValue(true);
      mockQuizStrategy.evaluate.mockResolvedValueOnce({
        score: 100,
        feedback: 'Perfect!'
      });
      
      // Act
      const result = await service.evaluate(quizInput);
      
      // Assert
      expect(mockQuizStrategy.evaluate).toHaveBeenCalledWith(quizInput);
      expect(mockRubricStrategy.evaluate).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        score: 100,
        feedback: 'Perfect!'
      });
    });
    
    it('should throw error if no strategy can handle input', async () => {
      // Arrange
      const unknownInput = { type: 'unknown' as any };
      mockQuizStrategy.canEvaluate.mockReturnValue(false);
      mockRubricStrategy.canEvaluate.mockReturnValue(false);
      
      // Act & Assert
      await expect(service.evaluate(unknownInput))
        .rejects.toThrow('No evaluation strategy for type: unknown');
    });
  });
});
```

### 2.3 Hook 測試
```typescript
// src/hooks/__tests__/useSession.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useSession } from '../useSession';
import { SessionService } from '@/lib/services/session.service';

jest.mock('@/lib/services/session.service');

describe('useSession', () => {
  let mockSessionService: jest.Mocked<SessionService>;
  
  beforeEach(() => {
    mockSessionService = new SessionService() as jest.Mocked<SessionService>;
    (SessionService as jest.Mock).mockImplementation(() => mockSessionService);
  });
  
  it('should load session on mount', async () => {
    // Arrange
    const mockSession = { id: 'session123', status: 'active' };
    mockSessionService.getSession.mockResolvedValueOnce(mockSession);
    
    // Act
    const { result, waitForNextUpdate } = renderHook(() => 
      useSession('session123')
    );
    
    // Assert - Initial state
    expect(result.current.loading).toBe(true);
    expect(result.current.session).toBe(null);
    
    // Wait for async update
    await waitForNextUpdate();
    
    // Assert - After load
    expect(result.current.loading).toBe(false);
    expect(result.current.session).toEqual(mockSession);
  });
  
  it('should handle pause and resume', async () => {
    // Arrange
    const mockSession = { id: 'session123', status: 'active' };
    mockSessionService.getSession.mockResolvedValueOnce(mockSession);
    mockSessionService.pauseSession.mockResolvedValueOnce({
      ...mockSession,
      status: 'paused'
    });
    
    // Act
    const { result, waitForNextUpdate } = renderHook(() => 
      useSession('session123')
    );
    
    await waitForNextUpdate();
    
    await act(async () => {
      await result.current.pauseSession();
    });
    
    // Assert
    expect(mockSessionService.pauseSession).toHaveBeenCalledWith('session123');
    expect(result.current.session?.status).toBe('paused');
  });
});
```

## 3. 整合測試策略

### 3.1 API Route 測試
```typescript
// src/app/api/sessions/__tests__/route.test.ts
import { createMocks } from 'node-mocks-http';
import { POST, GET } from '../route';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    learningSession: {
      create: jest.fn(),
      findUnique: jest.fn()
    }
  }
}));

describe('/api/sessions', () => {
  describe('POST', () => {
    it('should create a new session', async () => {
      // Arrange
      const { req } = createMocks({
        method: 'POST',
        body: {
          userId: 'user123',
          projectId: 'project456',
          type: 'assessment'
        }
      });
      
      const mockSession = {
        id: 'session789',
        userId: 'user123',
        projectId: 'project456',
        type: 'assessment',
        status: 'active',
        startedAt: new Date()
      };
      
      (prisma.learningSession.create as jest.Mock).mockResolvedValueOnce(mockSession);
      
      // Act
      const response = await POST(req as any);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        id: 'session789',
        status: 'active'
      });
      
      expect(prisma.learningSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          projectId: 'project456'
        })
      });
    });
    
    it('should validate required fields', async () => {
      // Arrange
      const { req } = createMocks({
        method: 'POST',
        body: { userId: 'user123' } // Missing required fields
      });
      
      // Act
      const response = await POST(req as any);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });
  });
});
```

### 3.2 Service 整合測試
```typescript
// src/lib/services/__tests__/integration/learning.service.test.ts
import { LearningService } from '../../learning.service';
import { PrismaClient } from '@prisma/client';
import { testDb } from '../../../test/utils/test-db';

describe('LearningService Integration', () => {
  let service: LearningService;
  let prisma: PrismaClient;
  
  beforeAll(async () => {
    prisma = await testDb.setup();
    service = new LearningService(prisma);
  });
  
  afterAll(async () => {
    await testDb.teardown();
  });
  
  beforeEach(async () => {
    await testDb.clean();
  });
  
  describe('complete learning flow', () => {
    it('should handle full session lifecycle', async () => {
      // Arrange
      const user = await prisma.user.create({
        data: { email: 'test@example.com', name: 'Test User' }
      });
      
      const project = await prisma.learningProject.create({
        data: {
          type: 'assessment',
          title: 'AI Literacy Test',
          objectives: ['Test AI knowledge']
        }
      });
      
      // Act - Start session
      const session = await service.startLearning(user.id, project.id);
      expect(session.status).toBe('active');
      
      // Act - Submit progress
      const evaluation = await service.submitProgress(session.id, {
        answers: [{ questionId: 'q1', answer: 'A' }]
      });
      expect(evaluation.score).toBeGreaterThan(0);
      
      // Act - Complete session
      const completed = await service.completeSession(session.id);
      expect(completed.status).toBe('completed');
      
      // Assert - Check competency updates
      const competencies = await prisma.competencyProgress.findMany({
        where: { userId: user.id }
      });
      expect(competencies.length).toBeGreaterThan(0);
    });
  });
});
```

## 4. E2E 測試策略

### 4.1 關鍵用戶流程
```typescript
// e2e/critical-paths/assessment-flow.spec.ts
import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth';

test.describe('Assessment Flow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'test@example.com', 'password');
  });
  
  test('complete AI literacy assessment', async ({ page }) => {
    // Navigate to assessment
    await page.goto('/assessment');
    await expect(page.locator('h1')).toContainText('AI 素養評估');
    
    // Start assessment
    await page.click('button:has-text("開始評估")');
    await expect(page.locator('.question-container')).toBeVisible();
    
    // Answer questions
    for (let i = 0; i < 5; i++) {
      await page.click(`.answer-option:nth-child(1)`);
      await page.click('button:has-text("下一題")');
    }
    
    // Complete assessment
    await page.click('button:has-text("完成評估")');
    
    // Verify results
    await expect(page.locator('.results-container')).toBeVisible();
    await expect(page.locator('.score-display')).toContainText(/\d+%/);
    await expect(page.locator('.competency-chart')).toBeVisible();
    
    // Check session saved
    await page.goto('/dashboard');
    await expect(page.locator('.recent-activities'))
      .toContainText('AI 素養評估');
  });
  
  test('pause and resume assessment', async ({ page }) => {
    // Start assessment
    await page.goto('/assessment');
    await page.click('button:has-text("開始評估")');
    
    // Answer some questions
    await page.click('.answer-option:first-child');
    await page.click('button:has-text("下一題")');
    
    // Pause
    await page.click('button:has-text("暫停")');
    await expect(page.locator('.pause-confirmation')).toBeVisible();
    await page.click('button:has-text("確認暫停")');
    
    // Navigate away and back
    await page.goto('/dashboard');
    await page.goto('/assessment');
    
    // Resume
    await expect(page.locator('button:has-text("繼續評估")')).toBeVisible();
    await page.click('button:has-text("繼續評估")');
    
    // Verify progress preserved
    await expect(page.locator('.progress-bar')).toHaveAttribute(
      'aria-valuenow', '20'
    );
  });
});
```

### 4.2 跨模組整合測試
```typescript
// e2e/integration/cross-module-flow.spec.ts
test.describe('Cross-module Integration', () => {
  test('assessment results affect PBL recommendations', async ({ page }) => {
    // Complete assessment with low AI literacy score
    await completeAssessment(page, 'low');
    
    // Navigate to PBL
    await page.goto('/pbl');
    
    // Verify beginner scenarios are recommended
    await expect(page.locator('.recommended-scenarios'))
      .toContainText('AI 基礎入門');
    await expect(page.locator('.difficulty-badge'))
      .toHaveText('初級');
    
    // Start PBL scenario
    await page.click('.scenario-card:has-text("AI 基礎入門")');
    await page.click('button:has-text("開始學習")');
    
    // Verify personalized guidance
    await expect(page.locator('.ai-tutor-message'))
      .toContainText('基於您的評估結果');
  });
});
```

## 5. 效能測試

### 5.1 負載測試
```typescript
// performance/load-test.ts
import { check } from 'k6';
import http from 'k6/http';
import { Rate } from 'k6/metrics';

export const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Ramp up
    { duration: '5m', target: 200 },  // Stay at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    errors: ['rate<0.1'],             // Error rate under 10%
  },
};

export default function () {
  // Test session creation
  const createSession = http.post(
    'http://localhost:3000/api/sessions',
    JSON.stringify({
      userId: `user_${__VU}`,
      projectId: 'test_project',
      type: 'assessment'
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(createSession, {
    'session created': (r) => r.status === 201,
    'response time OK': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(createSession.status !== 201);
  
  // Test session operations
  if (createSession.status === 201) {
    const sessionId = createSession.json('id');
    
    // Submit progress
    const submitProgress = http.post(
      `http://localhost:3000/api/sessions/${sessionId}/progress`,
      JSON.stringify({ progress: 50 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    check(submitProgress, {
      'progress updated': (r) => r.status === 200,
    });
  }
}
```

### 5.2 效能基準測試
```typescript
// performance/benchmark.test.ts
describe('Performance Benchmarks', () => {
  it('repository operations should be fast', async () => {
    const repository = new SessionRepository(new InMemoryStorage());
    const iterations = 1000;
    
    // Benchmark create
    const createStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await repository.create({
        userId: `user${i}`,
        projectId: 'project1',
        type: 'assessment'
      });
    }
    const createTime = performance.now() - createStart;
    
    expect(createTime / iterations).toBeLessThan(1); // < 1ms per operation
    
    // Benchmark read
    const readStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await repository.findById(`session${i}`);
    }
    const readTime = performance.now() - readStart;
    
    expect(readTime / iterations).toBeLessThan(0.5); // < 0.5ms per operation
  });
});
```

## 6. 測試資料管理

### 6.1 測試資料工廠
```typescript
// test/factories/session.factory.ts
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';
import { LearningSession } from '@prisma/client';

export const sessionFactory = Factory.define<LearningSession>(() => ({
  id: faker.datatype.uuid(),
  userId: faker.datatype.uuid(),
  projectId: faker.datatype.uuid(),
  type: faker.helpers.arrayElement(['assessment', 'pbl', 'discovery']),
  status: faker.helpers.arrayElement(['active', 'paused', 'completed']),
  startedAt: faker.date.recent(),
  lastActiveAt: faker.date.recent(),
  completedAt: null,
  metadata: {}
}));

// 使用範例
const activeSession = sessionFactory.build({ status: 'active' });
const completedSessions = sessionFactory.buildList(5, { status: 'completed' });
```

### 6.2 測試資料 Seeder
```typescript
// test/seeders/test-data.seeder.ts
export class TestDataSeeder {
  constructor(private prisma: PrismaClient) {}
  
  async seed() {
    // Create test users
    const users = await this.createUsers(10);
    
    // Create test projects
    const projects = await this.createProjects();
    
    // Create sessions with various states
    for (const user of users) {
      await this.createUserSessions(user.id, projects);
    }
    
    // Create evaluations
    await this.createEvaluations();
  }
  
  private async createUsers(count: number) {
    return Promise.all(
      Array.from({ length: count }, (_, i) => 
        this.prisma.user.create({
          data: {
            email: `test${i}@example.com`,
            name: `Test User ${i}`,
            locale: 'zh-TW'
          }
        })
      )
    );
  }
}
```

## 7. 測試覆蓋率策略

### 7.1 覆蓋率目標
```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      },
      "./src/lib/data/": {
        "branches": 90,
        "functions": 90,
        "lines": 90,
        "statements": 90
      },
      "./src/lib/services/": {
        "branches": 85,
        "functions": 85,
        "lines": 85,
        "statements": 85
      }
    }
  }
}
```

### 7.2 覆蓋率報告
```bash
# 生成覆蓋率報告
npm run test:coverage

# 檢視 HTML 報告
open coverage/lcov-report/index.html

# CI 整合
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
    fail_ci_if_error: true
```

## 8. 測試自動化

### 8.1 CI Pipeline
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:coverage
      
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test:integration
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

### 8.2 測試報告
```typescript
// test/reporters/custom-reporter.ts
export class CustomReporter {
  onTestResult(test: Test, result: TestResult) {
    // 發送測試結果到監控系統
    this.sendToMonitoring({
      testName: test.name,
      duration: result.duration,
      status: result.status,
      errors: result.errors
    });
    
    // 更新測試儀表板
    this.updateDashboard(result);
  }
  
  onRunComplete(contexts: Set<Context>, results: AggregatedResult) {
    // 生成測試報告
    this.generateReport({
      totalTests: results.numTotalTests,
      passedTests: results.numPassedTests,
      failedTests: results.numFailedTests,
      coverage: results.coverageMap
    });
  }
}
```

## 總結

這個全面的測試框架確保架構重構的每個階段都有適當的測試覆蓋。透過自動化測試、持續整合和完整的測試策略，我們可以信心滿滿地進行大規模重構。