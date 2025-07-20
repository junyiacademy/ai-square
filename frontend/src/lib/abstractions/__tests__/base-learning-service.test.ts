/**
 * BaseLearningService 抽象類別測試
 * 遵循 TDD Red → Green → Refactor
 */

import { BaseLearningService } from '../base-learning-service';
import { 
  IScenario, 
  IProgram, 
  ITask, 
  IEvaluation,
  IInteraction,
  BaseScenarioRepository,
  BaseProgramRepository,
  BaseTaskRepository,
  BaseEvaluationRepository,
  IEvaluationSystem
} from '@/types/unified-learning';

// Mock repositories
class MockScenarioRepository implements BaseScenarioRepository<IScenario> {
  private scenarios: Map<string, IScenario> = new Map();

  async create(scenario: Omit<IScenario, 'id'>): Promise<IScenario> {
    const newScenario = { ...scenario, id: 'scenario-' + Date.now() } as IScenario;
    this.scenarios.set(newScenario.id, newScenario);
    return newScenario;
  }

  async findById(id: string): Promise<IScenario | null> {
    return this.scenarios.get(id) || null;
  }

  async findBySource(sourceType: string, sourceId?: string): Promise<IScenario[]> {
    return Array.from(this.scenarios.values()).filter(s => 
      s.sourceType === sourceType && (!sourceId || s.sourceId === sourceId)
    );
  }

  async update(id: string, updates: Partial<IScenario>): Promise<IScenario> {
    const scenario = this.scenarios.get(id);
    if (!scenario) throw new Error('Scenario not found');
    const updated = { ...scenario, ...updates };
    this.scenarios.set(id, updated);
    return updated;
  }
}

class MockProgramRepository implements BaseProgramRepository<IProgram> {
  public programs: Map<string, IProgram> = new Map();

  async create(program: Omit<IProgram, 'id'>): Promise<IProgram> {
    const newProgram = { ...program, id: 'program-' + Date.now() } as IProgram;
    this.programs.set(newProgram.id, newProgram);
    return newProgram;
  }

  async findById(id: string): Promise<IProgram | null> {
    return this.programs.get(id) || null;
  }

  async findByUser(userId: string): Promise<IProgram[]> {
    return Array.from(this.programs.values()).filter(p => p.userId === userId);
  }

  async findByScenario(scenarioId: string): Promise<IProgram[]> {
    return Array.from(this.programs.values()).filter(p => p.scenarioId === scenarioId);
  }

  async updateProgress(id: string, currentTaskIndex: number): Promise<IProgram> {
    const program = this.programs.get(id);
    if (!program) throw new Error('Program not found');
    program.currentTaskIndex = currentTaskIndex;
    return program;
  }

  async complete(id: string): Promise<IProgram> {
    const program = this.programs.get(id);
    if (!program) throw new Error('Program not found');
    program.status = 'completed';
    program.completedAt = new Date().toISOString();
    return program;
  }
}

class MockTaskRepository implements BaseTaskRepository<ITask> {
  public tasks: Map<string, ITask> = new Map();
  private counter = 0;

  async create(task: Omit<ITask, 'id'>): Promise<ITask> {
    const newTask = { ...task, id: 'task-' + (++this.counter) } as ITask;
    this.tasks.set(newTask.id, newTask);
    return newTask;
  }

  async createBatch(tasks: Omit<ITask, 'id'>[]): Promise<ITask[]> {
    return Promise.all(tasks.map(task => this.create(task)));
  }

  async findById(id: string): Promise<ITask | null> {
    return this.tasks.get(id) || null;
  }

  async findByProgram(programId: string): Promise<ITask[]> {
    return Array.from(this.tasks.values())
      .filter(t => t.programId === programId)
      .sort((a, b) => (a.taskIndex || 0) - (b.taskIndex || 0));
  }

  async updateInteractions(id: string, interactions: IInteraction[]): Promise<ITask> {
    const task = this.tasks.get(id);
    if (!task) throw new Error('Task not found');
    task.interactions = interactions;
    task.interactionCount = interactions.length;
    return task;
  }

  async complete(id: string): Promise<ITask> {
    const task = this.tasks.get(id);
    if (!task) throw new Error('Task not found');
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    return task;
  }
}

class MockEvaluationRepository implements BaseEvaluationRepository<IEvaluation> {
  private evaluations: Map<string, IEvaluation> = new Map();

  async create(evaluation: Omit<IEvaluation, 'id'>): Promise<IEvaluation> {
    const newEval = { ...evaluation, id: 'eval-' + Date.now() } as IEvaluation;
    this.evaluations.set(newEval.id, newEval);
    return newEval;
  }

  async findById(id: string): Promise<IEvaluation | null> {
    return this.evaluations.get(id) || null;
  }

  async findByProgram(programId: string): Promise<IEvaluation[]> {
    return Array.from(this.evaluations.values()).filter(e => e.programId === programId);
  }

  async findByTask(taskId: string): Promise<IEvaluation[]> {
    return Array.from(this.evaluations.values()).filter(e => e.taskId === taskId);
  }

  async findByUser(userId: string): Promise<IEvaluation[]> {
    return Array.from(this.evaluations.values()).filter(e => e.userId === userId);
  }

  async findByType(evaluationType: string, evaluationSubtype?: string): Promise<IEvaluation[]> {
    return Array.from(this.evaluations.values()).filter(e => 
      e.evaluationType === evaluationType && 
      (!evaluationSubtype || e.evaluationSubtype === evaluationSubtype)
    );
  }
}

// Concrete implementation for testing
class TestLearningService extends BaseLearningService {
  // Hook implementations for testing
  protected async beforeProgramCreate(data: Partial<IProgram>): Promise<Partial<IProgram>> {
    return { ...data, metadata: { ...data.metadata, beforeCreateCalled: true } };
  }

  protected async afterProgramCreate(program: IProgram): Promise<void> {
    // For testing hooks
  }

  protected async beforeTaskComplete(task: ITask): Promise<void> {
    // For testing hooks
  }

  protected async afterTaskComplete(task: ITask, evaluation: IEvaluation): Promise<void> {
    // For testing hooks
  }
}

describe('BaseLearningService', () => {
  let service: TestLearningService;
  let mockScenarioRepo: MockScenarioRepository;
  let mockProgramRepo: MockProgramRepository;
  let mockTaskRepo: MockTaskRepository;
  let mockEvaluationRepo: MockEvaluationRepository;

  beforeEach(() => {
    mockScenarioRepo = new MockScenarioRepository();
    mockProgramRepo = new MockProgramRepository();
    mockTaskRepo = new MockTaskRepository();
    mockEvaluationRepo = new MockEvaluationRepository();

    service = new TestLearningService(
      mockScenarioRepo,
      mockProgramRepo,
      mockTaskRepo,
      mockEvaluationRepo
    );
  });

  describe('createLearningProgram', () => {
    it('should create a complete learning program with tasks', async () => {
      // Arrange
      const scenario = await mockScenarioRepo.create({
        sourceType: 'yaml' as const,
        sourcePath: 'test_scenario.yaml',
        sourceId: 'test_scenario',
        mode: 'pbl' as const,
        title: { en: 'Test Scenario' },
        description: { en: 'Test Description' },
        difficulty: 'intermediate',
        estimatedTime: 30,
        prerequisites: [],
        learningObjectives: [],
        tags: [],
        status: 'active' as const,
        version: '1.0.0',
        ksaMapping: {
          knowledge: [],
          skills: [],
          attitudes: []
        },
        rubric: {},
        taskTemplates: [
          {
            id: 'template-1',
            title: 'Task 1',
            type: 'interactive',
            metadata: {}
          },
          {
            id: 'template-2',
            title: 'Task 2',
            type: 'assessment',
            metadata: {}
          }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {}
      });

      // Act
      const result = await service.createLearningProgram(scenario.id, 'user-123');

      // Assert
      expect(result.scenario.id).toBe(scenario.id);
      expect(result.program.scenarioId).toBe(scenario.id);
      expect(result.program.userId).toBe('user-123');
      expect(result.program.status).toBe('active');
      expect(result.program.metadata?.beforeCreateCalled).toBe(true); // Hook was called
      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].title).toBe('Task 1');
      expect(result.tasks[1].title).toBe('Task 2');
    });

    it('should throw error if scenario not found', async () => {
      await expect(
        service.createLearningProgram('non-existent', 'user-123')
      ).rejects.toThrow('Scenario not found');
    });
  });

  describe('completeTask', () => {
    let program: IProgram;
    let task1: ITask;
    let task2: ITask;

    beforeEach(async () => {
      // Setup test data
      program = await mockProgramRepo.create({
        scenarioId: 'scenario-1',
        userId: 'user-123',
        mode: 'pbl' as const,
        status: 'active' as const,
        currentTaskIndex: 0,
        completedTaskCount: 0,
        totalTaskCount: 2,
        totalScore: 0,
        dimensionScores: {},
        xpEarned: 0,
        badgesEarned: [],
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
        timeSpentSeconds: 0,
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      });

      // Create task1 with fixed ID
      const task1Data: Omit<ITask, 'id'> = {
        programId: program.id,
        mode: 'pbl' as const,
        taskIndex: 0,
        scenarioTaskIndex: 0,
        title: 'Task 1',
        description: 'Test Task 1',
        type: 'interactive' as const,
        status: 'active' as const,
        content: {},
        interactions: [],
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 3,
        attemptCount: 0,
        timeSpentSeconds: 0,
        aiConfig: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      };
      task1 = { ...task1Data, id: 'task-1' } as ITask;
      mockTaskRepo.tasks.set('task-1', task1);

      // Create task2 with fixed ID
      const task2Data: Omit<ITask, 'id'> = {
        programId: program.id,
        mode: 'pbl' as const,
        taskIndex: 1,
        scenarioTaskIndex: 1,
        title: 'Task 2',
        description: 'Test Task 2',
        type: 'assessment' as const,
        status: 'pending' as const,
        content: {},
        interactions: [],
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 3,
        attemptCount: 0,
        timeSpentSeconds: 0,
        aiConfig: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      };
      task2 = { ...task2Data, id: 'task-2' } as ITask;
      mockTaskRepo.tasks.set('task-2', task2);

      // No need to store taskIds - tasks are linked via programId
    });

    it('should complete task and create evaluation', async () => {
      // Act
      const result = await service.completeTask('task-1', 'user-123', { answer: 'test' });

      // Assert
      expect(result.task.status).toBe('completed');
      expect(result.task.userResponse).toEqual({ answer: 'test' });
      expect(result.evaluation.evaluationType).toBe('task');
      expect(result.evaluation.taskId).toBe('task-1');
      expect(result.nextTask?.id).toBe('task-2');
      expect(result.nextTask?.status).toBe('active');
    });

    it('should complete last task and complete program', async () => {
      // Complete first task
      await service.completeTask(task1.id, 'user-123');
      
      // Act - Complete last task
      const result = await service.completeTask(task2.id, 'user-123');

      // Assert
      expect(result.task.status).toBe('completed');
      expect(result.evaluation).toBeDefined();
      expect(result.nextTask).toBeUndefined();
      
      // Check program is completed
      const completedProgram = await mockProgramRepo.findById(program.id);
      expect(completedProgram?.status).toBe('completed');
    });
  });

  describe('getLearningProgress', () => {
    it('should return user learning progress with metrics', async () => {
      // Arrange - Create multiple programs with evaluations
      const program1 = await mockProgramRepo.create({
        scenarioId: 'scenario-1',
        userId: 'user-123',
        status: 'active',
        startedAt: new Date().toISOString(),
        taskIds: [],
        currentTaskIndex: 0,
        metadata: {}
      });
      
      // Manually update to completed status
      await mockProgramRepo.complete(program1.id);

      const program2 = await mockProgramRepo.create({
        scenarioId: 'scenario-2',
        userId: 'user-123',
        status: 'active',
        startedAt: new Date().toISOString(),
        taskIds: [],
        currentTaskIndex: 0,
        metadata: {}
      });

      await mockEvaluationRepo.create({
        evaluationType: 'task',
        taskId: 'task-1',
        programId: program1.id,
        userId: 'user-123',
        mode: 'pbl' as const,
        score: 85,
        maxScore: 100,
        dimensionScores: {},
        feedbackData: {},
        aiAnalysis: {},
        timeTakenSeconds: 0,
        createdAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      });

      await mockEvaluationRepo.create({
        evaluationType: 'task',
        taskId: 'task-2',
        programId: program1.id,
        userId: 'user-123',
        mode: 'pbl' as const,
        score: 90,
        maxScore: 100,
        dimensionScores: {},
        feedbackData: {},
        aiAnalysis: {},
        timeTakenSeconds: 0,
        createdAt: new Date().toISOString(),
        pblData: {},
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      });

      // Act
      const progress = await service.getLearningProgress('user-123');

      // Assert
      expect(progress.activePrograms).toHaveLength(1);
      expect(progress.completedPrograms).toHaveLength(1);
      expect(progress.totalEvaluations).toBe(2);
      expect(progress.averageScore).toBe(87.5);
    });
  });

  describe('getProgramStatus', () => {
    it('should return detailed program status with completion rate', async () => {
      // Arrange
      const scenario = await mockScenarioRepo.create({
        sourceType: 'yaml' as const,
        sourcePath: 'test_scenario.yaml',
        sourceId: 'test_scenario', 
        mode: 'pbl' as const,
        title: { en: 'Test Scenario' },
        description: { en: 'Test' },
        difficulty: 'intermediate',
        estimatedTime: 30,
        prerequisites: [],
        learningObjectives: [],
        tags: [],
        status: 'active' as const,
        version: '1.0.0',
        ksaMapping: {
          knowledge: [],
          skills: [],
          attitudes: []
        },
        rubric: {},
        taskTemplates: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {}
      });

      const program = await mockProgramRepo.create({
        scenarioId: scenario.id,
        userId: 'user-123',
        status: 'active',
        startedAt: new Date().toISOString(),
        taskIds: [],
        currentTaskIndex: 0,
        metadata: {}
      });

      const task1 = await mockTaskRepo.create({
        programId: program.id,
        title: 'Task 1',
        description: 'Test',
        type: 'interactive',
        order: 1,
        status: 'completed',
        createdAt: new Date().toISOString(),
        metadata: {}
      });

      const task2 = await mockTaskRepo.create({
        programId: program.id,
        title: 'Task 2',
        description: 'Test',
        type: 'assessment',
        order: 2,
        status: 'active',
        createdAt: new Date().toISOString(),
        metadata: {}
      });

      // Fix the mock repository to store the updated program
      mockProgramRepo.programs.set(program.id, { 
        ...program, 
        taskIds: [task1.id, task2.id],
        currentTaskIndex: 1 
      });

      // Act
      const status = await service.getProgramStatus(program.id);

      // Assert
      expect(status.program.id).toBe(program.id);
      expect(status.scenario.id).toBe(scenario.id);
      expect(status.tasks).toHaveLength(2);
      expect(status.currentTask?.id).toBe(task2.id);
      expect(status.completionRate).toBe(50); // 1 of 2 tasks completed
    });
  });
});