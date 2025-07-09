/**
 * Tests for Assessment Storage V2 Service
 */

import { AssessmentStorageV2Service } from '../assessment-storage-v2.service';
import { AssessmentScenario, AssessmentProgram, AssessmentTask } from '../../schemas/assessment-v2.schema';

// Mock the GCS storage provider
jest.mock('@/lib/core/storage/providers/gcs-storage.provider', () => {
  const mockData = new Map<string, any>();
  
  return {
    GCSStorageProvider: jest.fn().mockImplementation(() => ({
      set: jest.fn().mockImplementation((path: string, data: any) => {
        mockData.set(path, data);
        return Promise.resolve();
      }),
      get: jest.fn().mockImplementation((path: string) => {
        const data = mockData.get(path);
        if (!data) {
          throw new Error('Not found');
        }
        return Promise.resolve(data);
      }),
      list: jest.fn().mockImplementation((prefix: string, filter?: (item: any) => boolean) => {
        const items: any[] = [];
        for (const [key, value] of mockData.entries()) {
          if (key.startsWith(prefix)) {
            if (!filter || filter(value)) {
              items.push(value);
            }
          }
        }
        return Promise.resolve(items);
      }),
      delete: jest.fn().mockImplementation((path: string) => {
        mockData.delete(path);
        return Promise.resolve();
      })
    }))
  };
});

describe('AssessmentStorageV2Service', () => {
  let service: AssessmentStorageV2Service;
  
  beforeEach(() => {
    service = new AssessmentStorageV2Service();
    jest.clearAllMocks();
  });
  
  describe('Scenario Management', () => {
    it('should create and retrieve a scenario', async () => {
      const scenarioData = {
        sourceFile: 'ai_literacy_questions_en.yaml',
        sourceId: 'ai_literacy',
        type: 'assessment' as const,
        title: { en: 'AI Literacy Assessment' },
        description: { en: 'Test your AI knowledge' },
        assessmentType: 'comprehensive' as const,
        difficulty: 'intermediate' as const,
        estimatedMinutes: 30,
        totalQuestions: 25,
        passingScore: 70,
        domains: ['engaging_with_ai', 'creating_with_ai'],
        competencies: ['AI.1.1', 'AI.2.1'],
        questionPool: {
          total: 50,
          byDomain: { engaging_with_ai: 25, creating_with_ai: 25 },
          byDifficulty: { basic: 15, intermediate: 20, advanced: 15 }
        }
      };
      
      const scenario = await service.saveScenario(scenarioData);
      
      expect(scenario).toMatchObject({
        sourceFile: 'ai_literacy_questions_en.yaml',
        sourceId: 'ai_literacy',
        type: 'assessment',
        totalQuestions: 25,
        passingScore: 70
      });
      expect(scenario.id).toBeDefined();
      expect(scenario.createdAt).toBeDefined();
      
      // Retrieve the scenario
      const retrieved = await service.getScenario(scenario.id);
      expect(retrieved).toEqual(scenario);
    });
    
    it('should find scenario by source', async () => {
      const scenario = await service.saveScenario({
        sourceFile: 'test.yaml',
        sourceId: 'test_assessment',
        type: 'assessment',
        title: { en: 'Test' },
        description: { en: 'Test' },
        assessmentType: 'quick',
        difficulty: 'beginner',
        estimatedMinutes: 10,
        totalQuestions: 10,
        passingScore: 60,
        domains: ['engaging_with_ai'],
        competencies: [],
        questionPool: { total: 10, byDomain: {}, byDifficulty: {} }
      });
      
      const found = await service.findScenarioBySource('test.yaml', 'test_assessment');
      expect(found).toEqual(scenario);
    });
    
    it('should cache scenarios for performance', async () => {
      const scenario = await service.saveScenario({
        sourceFile: 'cached.yaml',
        sourceId: 'cached_test',
        type: 'assessment',
        title: { en: 'Cached Test' },
        description: { en: 'Test caching' },
        assessmentType: 'quick',
        difficulty: 'beginner',
        estimatedMinutes: 5,
        totalQuestions: 5,
        passingScore: 60,
        domains: [],
        competencies: [],
        questionPool: { total: 5, byDomain: {}, byDifficulty: {} }
      });
      
      // First call - loads from storage
      const result1 = await service.getScenario(scenario.id);
      expect(result1).toEqual(scenario);
      
      // Second call - should use cache
      const result2 = await service.getScenario(scenario.id);
      expect(result2).toEqual(scenario);
    });
  });
  
  describe('Program Management', () => {
    let testScenario: AssessmentScenario;
    
    beforeEach(async () => {
      testScenario = await service.saveScenario({
        sourceFile: 'program_test.yaml',
        sourceId: 'program_test',
        type: 'assessment',
        title: { en: 'Program Test' },
        description: { en: 'Test programs' },
        assessmentType: 'comprehensive',
        difficulty: 'intermediate',
        estimatedMinutes: 20,
        totalQuestions: 20,
        passingScore: 70,
        domains: ['engaging_with_ai'],
        competencies: [],
        questionPool: { total: 20, byDomain: {}, byDifficulty: {} }
      });
    });
    
    it('should create a program for a user', async () => {
      const program = await service.createProgram(
        'test@example.com',
        testScenario.id,
        { language: 'es' }
      );
      
      expect(program).toMatchObject({
        userEmail: 'test@example.com',
        scenarioId: testScenario.id,
        type: 'assessment',
        status: 'not_started',
        config: {
          language: 'es',
          randomizeQuestions: true,
          showFeedback: true,
          allowReview: true
        },
        progress: {
          currentQuestionIndex: 0,
          answeredQuestions: 0,
          totalQuestions: 20
        }
      });
      expect(program.id).toBeDefined();
      
      // Verify scenario was updated
      const updatedScenario = await service.getScenario(testScenario.id);
      expect(updatedScenario?.programIds).toContain(program.id);
      expect(updatedScenario?.stats?.totalAttempts).toBe(1);
    });
    
    it('should get user programs', async () => {
      const userEmail = 'multiprogram@example.com';
      
      // Create multiple programs
      const program1 = await service.createProgram(userEmail, testScenario.id);
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for ordering
      const program2 = await service.createProgram(userEmail, testScenario.id);
      
      const userPrograms = await service.getUserPrograms(userEmail);
      
      expect(userPrograms).toHaveLength(2);
      expect(userPrograms[0].id).toBe(program2.id); // Most recent first
      expect(userPrograms[1].id).toBe(program1.id);
    });
    
    it('should update program progress', async () => {
      const program = await service.createProgram('progress@example.com', testScenario.id);
      
      const updated = await service.updateProgram(program.id, {
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        progress: {
          currentQuestionIndex: 5,
          answeredQuestions: 5,
          totalQuestions: 20
        }
      });
      
      expect(updated.status).toBe('in_progress');
      expect(updated.progress.answeredQuestions).toBe(5);
    });
  });
  
  describe('Task Management', () => {
    let testProgram: AssessmentProgram;
    
    beforeEach(async () => {
      const scenario = await service.saveScenario({
        sourceFile: 'task_test.yaml',
        sourceId: 'task_test',
        type: 'assessment',
        title: { en: 'Task Test' },
        description: { en: 'Test tasks' },
        assessmentType: 'quick',
        difficulty: 'beginner',
        estimatedMinutes: 10,
        totalQuestions: 5,
        passingScore: 60,
        domains: ['engaging_with_ai'],
        competencies: [],
        questionPool: { total: 5, byDomain: {}, byDifficulty: {} }
      });
      
      testProgram = await service.createProgram('task@example.com', scenario.id);
    });
    
    it('should create tasks from questions', async () => {
      const questions = [
        {
          id: 'q1',
          domain: 'engaging_with_ai',
          difficulty: 'basic',
          type: 'multiple_choice',
          question: { en: 'What is AI?' },
          options: { en: { a: 'Option A', b: 'Option B' } },
          correctAnswer: 'a',
          explanation: { en: 'AI is...' },
          ksaMapping: { knowledge: ['K1'], skills: [], attitudes: [] }
        },
        {
          id: 'q2',
          domain: 'engaging_with_ai',
          difficulty: 'intermediate',
          type: 'short_answer',
          question: { en: 'Explain AI ethics' },
          correctAnswer: 'Various answers',
          explanation: { en: 'Ethics in AI...' },
          ksaMapping: { knowledge: ['K2'], skills: ['S1'], attitudes: ['A1'] }
        }
      ];
      
      const tasks = await service.createTasksForProgram(testProgram.id, questions);
      
      expect(tasks).toHaveLength(2);
      expect(tasks[0].sourceQuestion.id).toBe('q1');
      expect(tasks[1].sourceQuestion.id).toBe('q2');
      
      // Verify program was updated
      const updatedProgram = await service.getProgram(testProgram.id);
      expect(updatedProgram?.taskIds).toHaveLength(2);
    });
    
    it('should track answer history in task', async () => {
      const questions = [{
        id: 'history_test',
        domain: 'engaging_with_ai',
        type: 'multiple_choice',
        question: { en: 'Test question' },
        options: { en: { a: 'A', b: 'B' } },
        correctAnswer: 'a',
        explanation: { en: 'Test' },
        ksaMapping: { knowledge: [], skills: [], attitudes: [] }
      }];
      
      const [task] = await service.createTasksForProgram(testProgram.id, questions);
      
      // Mock time delays for testing
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);
      
      // View question
      await service.addAnswerToHistory(task.id, 'view');
      
      // Answer question (advance time by 100ms)
      jest.setSystemTime(now + 100);
      await service.addAnswerToHistory(task.id, 'answer', 'b');
      
      // Change answer (advance time by 100ms)
      jest.setSystemTime(now + 200);
      await service.addAnswerToHistory(task.id, 'change', 'a');
      
      // Submit answer (advance time by 100ms)
      jest.setSystemTime(now + 300);
      const finalTask = await service.addAnswerToHistory(task.id, 'submit', 'a');
      
      jest.useRealTimers();
      
      expect(finalTask.answerHistory).toHaveLength(4);
      expect(finalTask.finalAnswer).toBe('a');
      expect(finalTask.status).toBe('completed');
      expect(finalTask.timeSpentSeconds).toBeGreaterThanOrEqual(0);
      
      // Check that time was tracked in history
      expect(finalTask.answerHistory[1].timeSpent).toBeGreaterThanOrEqual(0);
      expect(finalTask.answerHistory[2].timeSpent).toBeGreaterThanOrEqual(0);
      expect(finalTask.answerHistory[3].timeSpent).toBeGreaterThanOrEqual(0);
    });
    
    it('should batch load tasks for a program', async () => {
      const questions = Array.from({ length: 10 }, (_, i) => ({
        id: `q${i}`,
        domain: 'engaging_with_ai',
        type: 'multiple_choice',
        question: { en: `Question ${i}` },
        options: { en: { a: 'A', b: 'B' } },
        correctAnswer: 'a',
        explanation: { en: 'Test' },
        ksaMapping: { knowledge: [], skills: [], attitudes: [] }
      }));
      
      await service.createTasksForProgram(testProgram.id, questions);
      
      const tasks = await service.getProgramTasks(testProgram.id);
      expect(tasks).toHaveLength(10);
    });
  });
  
  describe('Evaluation and Completion', () => {
    let testProgram: AssessmentProgram;
    let testTasks: AssessmentTask[];
    
    beforeEach(async () => {
      const scenario = await service.saveScenario({
        sourceFile: 'eval_test.yaml',
        sourceId: 'eval_test',
        type: 'assessment',
        title: { en: 'Evaluation Test' },
        description: { en: 'Test evaluations' },
        assessmentType: 'quick',
        difficulty: 'beginner',
        estimatedMinutes: 5,
        totalQuestions: 3,
        passingScore: 70,
        domains: ['engaging_with_ai', 'creating_with_ai'],
        competencies: [],
        questionPool: { total: 3, byDomain: {}, byDifficulty: {} }
      });
      
      testProgram = await service.createProgram('eval@example.com', scenario.id);
      
      const questions = [
        {
          id: 'eval_q1',
          domain: 'engaging_with_ai',
          type: 'multiple_choice',
          question: { en: 'Q1' },
          options: { en: { a: 'A', b: 'B' } },
          correctAnswer: 'a',
          explanation: { en: 'Explanation' },
          ksaMapping: { knowledge: ['K1'], skills: [], attitudes: [] }
        },
        {
          id: 'eval_q2',
          domain: 'creating_with_ai',
          type: 'multiple_choice',
          question: { en: 'Q2' },
          options: { en: { a: 'A', b: 'B' } },
          correctAnswer: 'b',
          explanation: { en: 'Explanation' },
          ksaMapping: { knowledge: [], skills: ['S1'], attitudes: [] }
        },
        {
          id: 'eval_q3',
          domain: 'engaging_with_ai',
          type: 'multiple_choice',
          question: { en: 'Q3' },
          options: { en: { a: 'A', b: 'B' } },
          correctAnswer: 'a',
          explanation: { en: 'Explanation' },
          ksaMapping: { knowledge: [], skills: [], attitudes: ['A1'] }
        }
      ];
      
      testTasks = await service.createTasksForProgram(testProgram.id, questions);
    });
    
    it('should create evaluations for tasks', async () => {
      // Submit answers
      await service.addAnswerToHistory(testTasks[0].id, 'submit', 'a'); // Correct
      await service.addAnswerToHistory(testTasks[1].id, 'submit', 'a'); // Wrong
      await service.addAnswerToHistory(testTasks[2].id, 'submit', 'a'); // Correct
      
      // Create evaluations
      const eval1 = await service.createEvaluation(testTasks[0].id, true, 100);
      const eval2 = await service.createEvaluation(testTasks[1].id, false, 0);
      const eval3 = await service.createEvaluation(testTasks[2].id, true, 100);
      
      expect(eval1.isCorrect).toBe(true);
      expect(eval1.ksaDemonstrated.knowledge).toContain('K1');
      
      expect(eval2.isCorrect).toBe(false);
      expect(eval2.ksaDemonstrated.skills).toHaveLength(0);
      
      expect(eval3.isCorrect).toBe(true);
      expect(eval3.ksaDemonstrated.attitudes).toContain('A1');
    });
    
    it('should create completion with correct calculations', async () => {
      // Complete all tasks
      await service.addAnswerToHistory(testTasks[0].id, 'submit', 'a'); // Correct
      await service.addAnswerToHistory(testTasks[1].id, 'submit', 'a'); // Wrong
      await service.addAnswerToHistory(testTasks[2].id, 'submit', 'a'); // Correct
      
      // Create evaluations
      await service.createEvaluation(testTasks[0].id, true, 100);
      await service.createEvaluation(testTasks[1].id, false, 0);
      await service.createEvaluation(testTasks[2].id, true, 100);
      
      // Update program with results
      await service.updateProgram(testProgram.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        timeSpentMinutes: 5,
        progress: {
          currentQuestionIndex: 3,
          answeredQuestions: 3,
          totalQuestions: 3
        },
        results: {
          overallScore: 66.67,
          correctAnswers: 2,
          totalQuestions: 3,
          passed: false, // Below 70%
          performance: 'satisfactory',
          domainScores: {
            engaging_with_ai: { score: 100, correct: 2, total: 2 },
            creating_with_ai: { score: 0, correct: 0, total: 1 }
          },
          ksaScores: {
            knowledge: 100,
            skills: 0,
            attitudes: 100
          }
        }
      });
      
      const completion = await service.createCompletion(testProgram.id);
      
      expect(completion.overallScore).toBe(66.67);
      expect(completion.passed).toBe(false);
      expect(completion.certificate).toBeUndefined(); // Not passed
      
      // Check domain mastery
      const engagingDomain = completion.domainMastery.find(d => d.domain === 'engaging_with_ai');
      expect(engagingDomain?.score).toBe(100);
      expect(engagingDomain?.questionsCorrect).toBe(2);
      
      // Check KSA achievement
      expect(completion.ksaAchievement.knowledge.items).toHaveLength(1);
      expect(completion.ksaAchievement.skills.items).toHaveLength(0);
      expect(completion.ksaAchievement.attitudes.items).toHaveLength(1);
    });
    
    it('should issue certificate when passed', async () => {
      // Answer all correctly
      for (const task of testTasks) {
        const correctAnswer = task.sourceQuestion.correctAnswer;
        await service.addAnswerToHistory(task.id, 'submit', correctAnswer);
        await service.createEvaluation(task.id, true, 100);
      }
      
      // Update program with passing results
      await service.updateProgram(testProgram.id, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        results: {
          overallScore: 100,
          correctAnswers: 3,
          totalQuestions: 3,
          passed: true,
          performance: 'excellent',
          domainScores: {},
          ksaScores: { knowledge: 100, skills: 100, attitudes: 100 }
        }
      });
      
      const completion = await service.createCompletion(testProgram.id);
      
      expect(completion.passed).toBe(true);
      expect(completion.certificate).toBeDefined();
      expect(completion.certificate?.verificationCode).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });
  });
  
  describe('Performance Optimizations', () => {
    it('should efficiently load program with all details', async () => {
      const scenario = await service.saveScenario({
        sourceFile: 'perf_test.yaml',
        sourceId: 'perf_test',
        type: 'assessment',
        title: { en: 'Performance Test' },
        description: { en: 'Test performance' },
        assessmentType: 'comprehensive',
        difficulty: 'intermediate',
        estimatedMinutes: 30,
        totalQuestions: 20,
        passingScore: 70,
        domains: ['engaging_with_ai'],
        competencies: [],
        questionPool: { total: 20, byDomain: {}, byDifficulty: {} }
      });
      
      const program = await service.createProgram('perf@example.com', scenario.id);
      
      // Create tasks
      const questions = Array.from({ length: 20 }, (_, i) => ({
        id: `perf_q${i}`,
        domain: 'engaging_with_ai',
        type: 'multiple_choice',
        question: { en: `Question ${i}` },
        options: { en: { a: 'A', b: 'B' } },
        correctAnswer: 'a',
        explanation: { en: 'Test' },
        ksaMapping: { knowledge: [], skills: [], attitudes: [] }
      }));
      
      const tasks = await service.createTasksForProgram(program.id, questions);
      
      // Complete some tasks
      for (let i = 0; i < 10; i++) {
        await service.addAnswerToHistory(tasks[i].id, 'submit', 'a');
        await service.createEvaluation(tasks[i].id, true, 100);
      }
      
      // Load everything at once
      const details = await service.getProgramWithDetails(program.id);
      
      expect(details.program).toBeDefined();
      expect(details.scenario).toBeDefined();
      expect(details.tasks).toHaveLength(20);
      expect(details.evaluations).toHaveLength(10);
    });
  });
});