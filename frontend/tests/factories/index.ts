/**
 * Simple Test Factory for AI Square
 * 快速建立測試資料，支援 N+1 查詢測試
 */

import { v4 as uuidv4 } from 'uuid';

// ============ User Factory ============
export const createUser = (overrides: Partial<any> = {}) => ({
  id: overrides.id ?? uuidv4(),
  email: overrides.email ?? `test-${Date.now()}@example.com`,
  name: overrides.name ?? 'Test User',
  avatar: overrides.avatar ?? null,
  provider: overrides.provider ?? 'google',
  providerId: overrides.providerId ?? `google-${Date.now()}`,
  role: overrides.role ?? 'STUDENT',
  status: overrides.status ?? 'ACTIVE',
  createdAt: overrides.createdAt ?? new Date(),
  updatedAt: overrides.updatedAt ?? new Date(),
  lastLoginAt: overrides.lastLoginAt ?? new Date(),
  ...overrides
});

// ============ Scenario Factory ============
export const createScenario = (overrides: Partial<any> = {}) => ({
  id: overrides.id ?? uuidv4(),
  title: overrides.title ?? { en: 'Test Scenario', zh: '測試場景' },
  description: overrides.description ?? { en: 'Test scenario description' },
  category: overrides.category ?? 'EDUCATION',
  tags: overrides.tags ?? ['test', 'factory'],
  difficulty: overrides.difficulty ?? 'MEDIUM',
  estimatedMinutes: overrides.estimatedMinutes ?? 30,
  objectives: overrides.objectives ?? { en: ['Learn testing'] },
  prerequisites: overrides.prerequisites ?? { en: [] },
  isPublished: overrides.isPublished ?? true,
  sourceUrl: overrides.sourceUrl ?? null,
  contentType: overrides.contentType ?? 'SCENARIO',
  userId: overrides.userId ?? uuidv4(),
  createdAt: overrides.createdAt ?? new Date(),
  updatedAt: overrides.updatedAt ?? new Date(),
  ...overrides
});

// ============ Program Factory ============
export const createProgram = (overrides: Partial<any> = {}) => ({
  id: overrides.id ?? uuidv4(),
  title: overrides.title ?? { en: 'Test Program', zh: '測試程式' },
  description: overrides.description ?? { en: 'Test program description' },
  metadata: overrides.metadata ?? {},
  status: overrides.status ?? 'NOT_STARTED',
  learningMode: overrides.learningMode ?? 'ASSESSMENT',
  startedAt: overrides.startedAt ?? null,
  completedAt: overrides.completedAt ?? null,
  timeSpentMinutes: overrides.timeSpentMinutes ?? 0,
  completionPercentage: overrides.completionPercentage ?? 0,
  userId: overrides.userId ?? uuidv4(),
  scenarioId: overrides.scenarioId ?? uuidv4(),
  createdAt: overrides.createdAt ?? new Date(),
  updatedAt: overrides.updatedAt ?? new Date(),
  ...overrides
});

// ============ Task Factory ============
export const createTask = (overrides: Partial<any> = {}) => ({
  id: overrides.id ?? uuidv4(),
  title: overrides.title ?? { en: 'Test Task' },
  description: overrides.description ?? { en: 'Complete this test task' },
  type: overrides.type ?? 'QUIZ',
  content: overrides.content ?? {
    question: { en: 'What is 2+2?' },
    options: [
      { id: 'a', text: { en: '3' } },
      { id: 'b', text: { en: '4' } },
      { id: 'c', text: { en: '5' } }
    ],
    correctAnswer: 'b'
  },
  order: overrides.order ?? 1,
  points: overrides.points ?? 10,
  requiredForCompletion: overrides.requiredForCompletion ?? true,
  metadata: overrides.metadata ?? {},
  status: overrides.status ?? 'NOT_STARTED',
  startedAt: overrides.startedAt ?? null,
  completedAt: overrides.completedAt ?? null,
  timeSpentSeconds: overrides.timeSpentSeconds ?? 0,
  attemptCount: overrides.attemptCount ?? 0,
  score: overrides.score ?? null,
  feedback: overrides.feedback ?? null,
  programId: overrides.programId ?? uuidv4(),
  createdAt: overrides.createdAt ?? new Date(),
  updatedAt: overrides.updatedAt ?? new Date(),
  ...overrides
});

// ============ Evaluation Factory ============
export const createEvaluation = (overrides: Partial<any> = {}) => ({
  id: overrides.id ?? uuidv4(),
  score: overrides.score ?? 85,
  maxScore: overrides.maxScore ?? 100,
  percentage: overrides.percentage ?? 85,
  feedback: overrides.feedback ?? { en: 'Good job!' },
  strengths: overrides.strengths ?? { en: ['Problem solving'] },
  improvements: overrides.improvements ?? { en: ['Time management'] },
  metadata: overrides.metadata ?? {},
  evaluationType: overrides.evaluationType ?? 'assessment_complete',
  taskId: overrides.taskId ?? uuidv4(),
  programId: overrides.programId ?? uuidv4(),
  userId: overrides.userId ?? uuidv4(),
  createdAt: overrides.createdAt ?? new Date(),
  ...overrides
});

// ============ Batch Creation Helpers ============

/**
 * 建立多個使用者
 */
export const createUsers = (count: number, overrides: Partial<any> = {}) => {
  return Array.from({ length: count }, (_, i) =>
    createUser({
      email: `user-${i}@example.com`,
      name: `User ${i}`,
      ...overrides
    })
  );
};

/**
 * 建立帶有關聯的 Program (包含 User 和 Scenario)
 */
export const createProgramWithRelations = (overrides: Partial<any> = {}) => {
  const user = createUser(overrides.user || {});
  const scenario = createScenario({
    userId: user.id,
    ...(overrides.scenario || {})
  });
  const program = createProgram({
    userId: user.id,
    scenarioId: scenario.id,
    ...overrides.program
  });

  return { user, scenario, program };
};

/**
 * 建立完整的學習路徑 (User -> Scenario -> Program -> Tasks -> Evaluations)
 */
export const createLearningPath = (taskCount = 3) => {
  const user = createUser();
  const scenario = createScenario({ userId: user.id });
  const program = createProgram({
    userId: user.id,
    scenarioId: scenario.id
  });

  const tasks = Array.from({ length: taskCount }, (_, i) =>
    createTask({
      programId: program.id,
      order: i + 1,
      title: { en: `Task ${i + 1}` }
    })
  );

  const evaluations = tasks.map(task =>
    createEvaluation({
      taskId: task.id,
      programId: program.id,
      userId: user.id
    })
  );

  return { user, scenario, program, tasks, evaluations };
};

// ============ Database Query Mock Helpers ============

/**
 * 模擬 Prisma 查詢計數 (用於偵測 N+1 問題)
 */
export class QueryCounter {
  private count = 0;
  private queries: string[] = [];

  increment(query: string) {
    this.count++;
    this.queries.push(query);
  }

  getCount() {
    return this.count;
  }

  getQueries() {
    return this.queries;
  }

  reset() {
    this.count = 0;
    this.queries = [];
  }

  assertNoN1(maxQueries = 3) {
    if (this.count > maxQueries) {
      throw new Error(
        `N+1 query detected! Expected <= ${maxQueries} queries, but got ${this.count}.\n` +
        `Queries:\n${this.queries.join('\n')}`
      );
    }
  }
}

// Export a singleton instance
export const queryCounter = new QueryCounter();
