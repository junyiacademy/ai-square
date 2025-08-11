import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';
import type { 
  IScenario, 
  IProgram, 
  ITask, 
  IEvaluation
} from '@/types/unified-learning';
import type { LearningMode } from '@/types/database';

/**
 * Test Data Fixtures for Integration Testing
 * 
 * Provides consistent test data across all integration tests
 */

// Test Users
export const testUsers = {
  student: {
    id: uuidv4(),
    email: 'student@test.com',
    password: 'Test123!@#',
    passwordHash: '$2b$10$K7L1OJ0TfHqBQ1Q9Z8X3X.test', // Mock hash
    name: 'Test Student',
    role: 'user',
    emailVerified: true,
  },
  teacher: {
    id: uuidv4(),
    email: 'teacher@test.com',
    password: 'Teacher123!@#',
    passwordHash: '$2b$10$K7L1OJ0TfHqBQ1Q9Z8X3X.test2',
    name: 'Test Teacher',
    role: 'teacher',
    emailVerified: true,
  },
  unverified: {
    id: uuidv4(),
    email: 'unverified@test.com',
    password: 'Unverified123!@#',
    passwordHash: '$2b$10$K7L1OJ0TfHqBQ1Q9Z8X3X.test3',
    name: 'Unverified User',
    role: 'user',
    emailVerified: false,
  },
};

// Test Scenarios
export const testScenarios = {
  pbl: {
    id: uuidv4(),
    mode: 'pbl' as LearningMode,
    status: 'active' as const,
    sourceType: 'yaml' as const,
    sourcePath: 'test/pbl_scenario.yaml',
    title: {
      en: 'Test PBL Scenario',
      zh: '測試 PBL 情境',
    },
    description: {
      en: 'A test scenario for PBL integration testing',
      zh: '用於 PBL 整合測試的測試情境',
    },
    objectives: {
      en: ['Learn AI basics', 'Apply critical thinking'],
      zh: ['學習 AI 基礎', '應用批判性思考'],
    },
    taskTemplates: [
      {
        id: uuidv4(),
        title: { en: 'Understanding AI' },
        type: 'question',
        content: {
          instructions: 'Explain what AI means to you',
          question: 'What is artificial intelligence?',
        },
        estimatedTime: 10,
      },
      {
        id: uuidv4(),
        title: { en: 'AI Ethics Discussion' },
        type: 'chat',
        content: {
          instructions: 'Discuss AI ethics with the tutor',
        },
        estimatedTime: 15,
      },
    ],
    pblData: {
      difficulty: 'beginner',
      prerequisites: [],
      ksaCodes: ['K1', 'S2', 'A1'],
      scenarioType: 'real-world',
      industry: 'education',
      aiModules: {
        tutor: {
          enabled: true,
          model: 'gemini-2.5-flash',
          systemPrompt: 'You are a helpful AI tutor',
        },
        evaluator: {
          enabled: true,
          model: 'gemini-2.5-flash',
        },
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  assessment: {
    id: uuidv4(),
    mode: 'assessment' as LearningMode,
    status: 'active' as const,
    sourceType: 'yaml' as const,
    sourcePath: 'test/assessment_scenario.yaml',
    title: {
      en: 'AI Literacy Assessment',
      zh: 'AI 素養評估',
    },
    description: {
      en: 'Test your AI literacy knowledge',
      zh: '測試你的 AI 素養知識',
    },
    assessmentData: {
      questionBank: [
        {
          domain: 'Engaging_with_AI',
          questions: [
            {
              id: 'q1',
              text: { en: 'What is machine learning?' },
              options: [
                { en: 'A) A type of AI' },
                { en: 'B) A programming language' },
                { en: 'C) A database' },
                { en: 'D) A web framework' },
              ],
              correctAnswer: 0,
              ksaCodes: ['K1'],
            },
          ],
        },
      ],
      scoringRubric: {
        passing: 60,
        levels: {
          beginner: [0, 40],
          intermediate: [41, 70],
          advanced: [71, 100],
        },
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  discovery: {
    id: uuidv4(),
    mode: 'discovery' as LearningMode,
    status: 'active' as const,
    sourceType: 'yaml' as const,
    sourcePath: 'test/discovery_scenario.yaml',
    title: {
      en: 'AI Career Explorer',
      zh: 'AI 職涯探索',
    },
    description: {
      en: 'Explore careers in AI',
      zh: '探索 AI 相關職涯',
    },
    discoveryData: {
      careerType: 'ai_engineer',
      pathId: 'path_ai_engineer',
      explorationPath: [
        {
          id: 'step1',
          title: { en: 'Learn Python Basics' },
          description: { en: 'Start with Python programming' },
          resources: [],
          estimatedTime: 30,
        },
      ],
      skills: {
        core: ['python', 'machine_learning', 'data_analysis'],
        advanced: ['deep_learning', 'nlp', 'computer_vision'],
      },
      milestones: [
        {
          id: 'milestone1',
          title: { en: 'Complete Python Course' },
          criteria: 'Finish all Python modules',
          reward: 'Python Proficiency Badge',
        },
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

// Test Programs
export function createTestProgram(
  scenarioId: string,
  userId: string,
  mode: LearningMode,
  status: 'pending' | 'active' | 'completed' = 'active'
): Partial<IProgram> {
  return {
    id: uuidv4(),
    mode,
    scenarioId,
    userId,
    status,
    totalScore: 0,
    timeSpentSeconds: 0,
    startedAt: status !== 'pending' ? new Date().toISOString() : undefined,
    completedAt: status === 'completed' ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Test Tasks
export function createTestTask(
  programId: string,
  mode: LearningMode,
  taskIndex: number = 0
): Partial<ITask> {
  return {
    id: uuidv4(),
    mode,
    programId,
    taskIndex,
    type: 'question',
    status: 'active',
    title: { en: `Test Task ${taskIndex + 1}` },
    description: { en: 'Complete this test task' },
    content: {
      instructions: 'Answer the question',
      question: 'What is AI?',
    },
    interactions: [],
    startedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Test Evaluations
export function createTestEvaluation(
  taskId: string,
  userId: string,
  mode: LearningMode,
  score: number = 85
): Partial<IEvaluation> {
  return {
    id: uuidv4(),
    mode,
    taskId,
    userId,
    evaluationType: 'ai-feedback',
    score,
    feedbackText: 'Great job! You demonstrated good understanding.',
    feedbackData: {
      criteria: {
        accuracy: 90,
        completeness: 85,
        clarity: 80,
      },
    },
    aiAnalysis: {
      model: 'gemini-2.5-flash',
      timestamp: new Date().toISOString(),
      rawResponse: {
        score,
        feedback: 'Well done!',
        suggestions: ['Consider exploring more advanced topics'],
      },
    },
    createdAt: new Date().toISOString(),
  };
}

// Test Sessions
export function createTestSession(userId: string) {
  return {
    id: uuidv4(),
    userId,
    token: `test_token_${Date.now()}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    createdAt: new Date().toISOString(),
  };
}

// Cache Test Data
export const cacheTestData = {
  keys: {
    pblScenarios: 'pbl:scenarios:list:en',
    assessmentScenarios: 'assessment:scenarios:list:en',
    discoveryScenarios: 'discovery:scenarios:list:en',
    ksaData: 'ksa:data:en',
    userProgram: (userId: string) => `user:${userId}:programs`,
  },
  values: {
    pblScenarios: [testScenarios.pbl],
    assessmentScenarios: [testScenarios.assessment],
    discoveryScenarios: [testScenarios.discovery],
    ksaData: {
      domains: [
        {
          id: 'engaging_with_ai',
          name: { en: 'Engaging with AI' },
          competencies: [
            {
              id: 'c1',
              name: { en: 'Understanding AI' },
              ksaCodes: ['K1', 'S1'],
            },
          ],
        },
      ],
      ksa: {
        knowledge: [{ code: 'K1', description: { en: 'Basic AI concepts' } }],
        skills: [{ code: 'S1', description: { en: 'Critical thinking' } }],
        attitudes: [{ code: 'A1', description: { en: 'Ethical consideration' } }],
      },
    },
  },
};

// Performance Test Data
export const performanceTestData = {
  // Generate multiple scenarios for load testing
  generateScenarios: (count: number): IScenario[] => {
    return Array.from({ length: count }, (_, i) => ({
      ...testScenarios.pbl,
      id: uuidv4(),
      title: {
        en: `Performance Test Scenario ${i + 1}`,
        zh: `性能測試情境 ${i + 1}`,
      },
    } as unknown as IScenario));
  },
  
  // Generate multiple users for concurrent testing
  generateUsers: (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: uuidv4(),
      email: `user${i}@test.com`,
      password: `Password${i}!`,
      passwordHash: `$2b$10$hash${i}`,
      name: `Test User ${i}`,
      role: 'user',
      emailVerified: true,
    }));
  },
  
  // Generate bulk operations
  generateBulkOperations: (count: number) => {
    const operations = [];
    for (let i = 0; i < count; i++) {
      operations.push({
        type: ['create', 'update', 'read', 'delete'][i % 4],
        resource: ['scenario', 'program', 'task', 'evaluation'][i % 4],
        data: { id: uuidv4(), index: i },
      });
    }
    return operations;
  },
};

// Helper to reset all test data IDs (useful for test isolation)
export function resetTestDataIds() {
  // Regenerate all UUIDs for test data
  Object.keys(testUsers).forEach(key => {
    testUsers[key as keyof typeof testUsers].id = uuidv4();
  });
  
  Object.keys(testScenarios).forEach(key => {
    testScenarios[key as keyof typeof testScenarios].id = uuidv4();
  });
}

// Export a function to seed database with test data
export async function seedTestDatabase(pool: Pool) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Insert test users
    for (const user of Object.values(testUsers)) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, name, role, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (email) DO NOTHING`,
        [user.id, user.email, user.passwordHash, user.name, user.role, user.emailVerified, new Date(), new Date()]
      );
    }
    
    // Insert test scenarios
    for (const scenario of Object.values(testScenarios)) {
      await client.query(
        `INSERT INTO scenarios (id, mode, status, source_type, source_path, title, description, objectives, task_templates, pbl_data, assessment_data, discovery_data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (id) DO NOTHING`,
        [
          scenario.id,
          scenario.mode,
          scenario.status,
          scenario.sourceType,
          scenario.sourcePath,
          JSON.stringify(scenario.title),
          JSON.stringify(scenario.description),
          JSON.stringify((scenario as Record<string, unknown>).objectives || {}),
          JSON.stringify((scenario as Record<string, unknown>).taskTemplates || []),
          JSON.stringify((scenario as Record<string, unknown>).pblData || {}),
          JSON.stringify((scenario as Record<string, unknown>).assessmentData || {}),
          JSON.stringify((scenario as Record<string, unknown>).discoveryData || {}),
          new Date(),
          new Date()
        ]
      );
    }
    
    await client.query('COMMIT');
    console.log('✅ Test database seeded successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    client.release();
  }
}