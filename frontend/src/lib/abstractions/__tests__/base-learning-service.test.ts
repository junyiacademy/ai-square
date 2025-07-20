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

  async findBySourceType(sourceType: string): Promise<IScenario[]> {
    return Array.from(this.scenarios.values()).filter(s => s.sourceType === sourceType);
  }

  async listAll(): Promise<IScenario[]> {
    return Array.from(this.scenarios.values());
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

  async create(task: Omit<ITask, 'id'>): Promise<ITask> {
    const newTask = { ...task, id: 'task-' + Date.now() } as ITask;
    this.tasks.set(newTask.id, newTask);
    return newTask;
  }

  async findById(id: string): Promise<ITask | null> {
    return this.tasks.get(id) || null;
  }

  async findByProgram(programId: string): Promise<ITask[]> {
    return Array.from(this.tasks.values()).filter(t => t.programId === programId);
  }

  async updateStatus(id: string, status: 'pending' | 'active' | 'completed'): Promise<ITask> {
    const task = this.tasks.get(id);
    if (!task) throw new Error('Task not found');
    task.status = status;
    if (status === 'active' && !task.startedAt) {
      task.startedAt = new Date().toISOString();
    }
    if (status === 'completed' && !task.completedAt) {
      task.completedAt = new Date().toISOString();
    }
    return task;
  }

  async saveResponse(id: string, response: any): Promise<ITask> {
    const task = this.tasks.get(id);
    if (!task) throw new Error('Task not found');
    task.userResponse = response;
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

  async findByTarget(targetType: 'task' | 'program', targetId: string): Promise<IEvaluation[]> {
    return Array.from(this.evaluations.values()).filter(
      e => {
        if (targetType === 'task') {
          return e.evaluationType === 'task' && e.taskId === targetId;
        } else {
          return e.evaluationType === 'program' && e.programId === targetId;
        }
      }
    );
  }

  async findByProgram(programId: string): Promise<IEvaluation[]> {
    return Array.from(this.evaluations.values()).filter(e => e.programId === programId);
  }

  async findByUser(userId: string): Promise<IEvaluation[]> {
    return Array.from(this.evaluations.values()).filter(e => e.userId === userId);
  }

  async findLatestByTarget(targetType: 'task' | 'program', targetId: string): Promise<IEvaluation | null> {
    const evaluations = await this.findByTarget(targetType, targetId);
    return evaluations.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0] || null;
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
        title: { en: 'Test Scenario' },
        description: { en: 'Test Description' },
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
        status: 'active',
        startedAt: new Date().toISOString(),
        taskIds: ['task-1', 'task-2'],
        currentTaskIndex: 0,
        metadata: {}
      });

      // Create task1 with fixed ID
      const task1Data = {
        programId: program.id,
        templateId: 'template-1',
        title: 'Task 1',
        description: 'Test Task 1',
        type: 'interactive' as const,
        order: 1,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        metadata: {}
      };
      task1 = { ...task1Data, id: 'task-1' } as ITask;
      mockTaskRepo.tasks.set('task-1', task1);

      // Create task2 with fixed ID
      const task2Data = {
        programId: program.id,
        templateId: 'template-2',
        title: 'Task 2',
        description: 'Test Task 2',
        type: 'assessment' as const,
        order: 2,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        metadata: {}
      };
      task2 = { ...task2Data, id: 'task-2' } as ITask;
      mockTaskRepo.tasks.set('task-2', task2);

      // Fix the mock repository to store the updated program
      mockProgramRepo.programs.set(program.id, { ...program, taskIds: ['task-1', 'task-2'] });
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
        type: 'task_completion',
        score: 85,
        createdAt: new Date().toISOString(),
        metadata: {}
      });

      await mockEvaluationRepo.create({
        evaluationType: 'task',
        taskId: 'task-2',
        programId: program1.id,
        userId: 'user-123',
        type: 'task_completion',
        score: 90,
        createdAt: new Date().toISOString(),
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
        title: 'Test Scenario',
        description: 'Test',
        taskTemplates: [],
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
        templateId: 'template-1',
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
        templateId: 'template-2',
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