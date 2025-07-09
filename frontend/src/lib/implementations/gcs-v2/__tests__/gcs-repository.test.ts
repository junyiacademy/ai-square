/**
 * GCS Repository 測試
 */

import { GCSScenarioRepository } from '../repositories/gcs-scenario-repository';
import { GCSProgramRepository } from '../repositories/gcs-program-repository';
import { GCSTaskRepository } from '../repositories/gcs-task-repository';
import { GCSEvaluationRepository } from '../repositories/gcs-evaluation-repository';
import { IScenario, IProgram, ITask, IEvaluation } from '@/types/unified-learning';

// Mock @google-cloud/storage
const mockFiles = new Map<string, any>();

jest.mock('@google-cloud/storage', () => {
  const createMockFile = (name: string) => ({
    name,
    save: jest.fn(async (data: string) => {
      mockFiles.set(name, data);
      return [{}];
    }),
    download: jest.fn(async () => {
      const data = mockFiles.get(name);
      if (!data) throw new Error('File not found');
      return [Buffer.from(data)];
    }),
    exists: jest.fn(async () => [mockFiles.has(name)]),
    delete: jest.fn(async () => {
      mockFiles.delete(name);
    }),
  });

  const mockBucket = {
    file: jest.fn((name: string) => createMockFile(name)),
    getFiles: jest.fn(async (options: any) => {
      const prefix = options?.prefix || '';
      const matchingFiles = Array.from(mockFiles.keys())
        .filter(key => key.startsWith(prefix))
        .map(fileName => {
          // Return mock file objects with download method
          return {
            name: fileName,
            download: async () => {
              const data = mockFiles.get(fileName);
              if (!data) throw new Error('File not found');
              return [Buffer.from(data)];
            }
          };
        });
      return [matchingFiles];
    }),
  };

  return {
    Storage: jest.fn(() => ({
      bucket: jest.fn(() => mockBucket),
    })),
  };
});

// Clear mock files before each test
beforeEach(() => {
  mockFiles.clear();
});

describe('GCS Repository Tests', () => {
  let scenarioRepo: GCSScenarioRepository;
  let programRepo: GCSProgramRepository;
  let taskRepo: GCSTaskRepository;
  let evaluationRepo: GCSEvaluationRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    scenarioRepo = new GCSScenarioRepository();
    programRepo = new GCSProgramRepository();
    taskRepo = new GCSTaskRepository();
    evaluationRepo = new GCSEvaluationRepository();
  });

  describe('Scenario Repository', () => {
    it('should create a scenario', async () => {
      const scenarioData = {
        sourceType: 'pbl' as const,
        sourceRef: {
          type: 'yaml' as const,
          path: 'test.yaml',
          metadata: {},
        },
        title: 'Test Scenario',
        description: 'Test Description',
        objectives: ['Objective 1'],
        taskTemplates: [],
      };

      const scenario = await scenarioRepo.create(scenarioData);

      expect(scenario.id).toBeDefined();
      expect(scenario.title).toBe('Test Scenario');
      expect(scenario.sourceType).toBe('pbl');
      expect(scenario.createdAt).toBeDefined();
      expect(scenario.updatedAt).toBeDefined();
    });

    it('should find scenario by id', async () => {
      const created = await scenarioRepo.create({
        sourceType: 'pbl' as const,
        sourceRef: {
          type: 'yaml' as const,
          path: 'test.yaml',
          metadata: {},
        },
        title: 'Test Scenario',
        description: 'Test Description',
        objectives: ['Objective 1'],
        taskTemplates: [],
      });

      const found = await scenarioRepo.findById(created.id);
      expect(found).toEqual(created);
    });

    it('should find scenarios by source', async () => {
      await scenarioRepo.create({
        sourceType: 'pbl' as const,
        sourceRef: {
          type: 'yaml' as const,
          path: 'test1.yaml',
          metadata: {},
        },
        title: 'PBL Scenario 1',
        description: 'Test',
        objectives: [],
        taskTemplates: [],
      });

      await scenarioRepo.create({
        sourceType: 'discovery' as const,
        sourceRef: {
          type: 'ai-generated' as const,
          sourceId: 'test-id',
          metadata: {},
        },
        title: 'Discovery Scenario',
        description: 'Test',
        objectives: [],
        taskTemplates: [],
      });

      const pblScenarios = await scenarioRepo.findBySource('pbl');
      expect(pblScenarios).toHaveLength(1);
      expect(pblScenarios[0].sourceType).toBe('pbl');
    });
  });

  describe('Program Repository', () => {
    it('should create a program', async () => {
      const programData = {
        scenarioId: 'scenario-123',
        userId: 'user-123',
        metadata: {},
      };

      const program = await programRepo.create(programData);

      expect(program.id).toBeDefined();
      expect(program.scenarioId).toBe('scenario-123');
      expect(program.userId).toBe('user-123');
      expect(program.status).toBe('active');
      expect(program.startedAt).toBeDefined();
      expect(program.taskIds).toEqual([]);
    });

    it('should update program progress', async () => {
      const program = await programRepo.create({
        scenarioId: 'scenario-123',
        userId: 'user-123',
        metadata: {},
      });

      const updated = await programRepo.updateProgress(program.id, 2);
      expect(updated.currentTaskIndex).toBe(2);
    });

    it('should complete a program', async () => {
      const program = await programRepo.create({
        scenarioId: 'scenario-123',
        userId: 'user-123',
        metadata: {},
      });

      const completed = await programRepo.complete(program.id);
      expect(completed.status).toBe('completed');
      expect(completed.completedAt).toBeDefined();
    });
  });

  describe('Task Repository', () => {
    it('should create a task', async () => {
      const taskData = {
        programId: 'program-123',
        scenarioTaskIndex: 0,
        title: 'Test Task',
        type: 'chat' as const,
        content: {
          instructions: 'Do something',
        },
      };

      const task = await taskRepo.create(taskData);

      expect(task.id).toBeDefined();
      expect(task.programId).toBe('program-123');
      expect(task.title).toBe('Test Task');
      expect(task.status).toBe('pending');
      expect(task.interactions).toEqual([]);
    });

    it('should update task interactions', async () => {
      const task = await taskRepo.create({
        programId: 'program-123',
        scenarioTaskIndex: 0,
        title: 'Test Task',
        type: 'chat' as const,
        content: {},
      });

      const interaction = {
        timestamp: new Date().toISOString(),
        type: 'user_input' as const,
        content: { message: 'Hello' },
      };

      const updated = await taskRepo.updateInteractions(task.id, [interaction]);
      expect(updated.interactions).toHaveLength(1);
      expect(updated.interactions[0]).toEqual(interaction);
      expect(updated.status).toBe('active');
    });

    it('should find tasks by program', async () => {
      await taskRepo.create({
        programId: 'program-123',
        scenarioTaskIndex: 0,
        title: 'Task 1',
        type: 'chat' as const,
        content: {},
      });

      await taskRepo.create({
        programId: 'program-123',
        scenarioTaskIndex: 1,
        title: 'Task 2',
        type: 'chat' as const,
        content: {},
      });

      await taskRepo.create({
        programId: 'program-456',
        scenarioTaskIndex: 0,
        title: 'Other Task',
        type: 'chat' as const,
        content: {},
      });

      const tasks = await taskRepo.findByProgram('program-123');
      expect(tasks).toHaveLength(2);
      expect(tasks[0].title).toBe('Task 1');
      expect(tasks[1].title).toBe('Task 2');
    });
  });

  describe('Evaluation Repository', () => {
    it('should create an evaluation', async () => {
      const evaluationData = {
        targetType: 'task' as const,
        targetId: 'task-123',
        evaluationType: 'pbl_task',
        score: 85,
        feedback: 'Good job!',
        dimensions: [],
        metadata: {},
      };

      const evaluation = await evaluationRepo.create(evaluationData);

      expect(evaluation.id).toBeDefined();
      expect(evaluation.targetType).toBe('task');
      expect(evaluation.targetId).toBe('task-123');
      expect(evaluation.score).toBe(85);
      expect(evaluation.createdAt).toBeDefined();
    });

    it('should find evaluations by target', async () => {
      await evaluationRepo.create({
        targetType: 'task' as const,
        targetId: 'task-123',
        evaluationType: 'pbl_task',
        metadata: {},
      });

      await evaluationRepo.create({
        targetType: 'task' as const,
        targetId: 'task-123',
        evaluationType: 'pbl_task',
        metadata: {},
      });

      await evaluationRepo.create({
        targetType: 'program' as const,
        targetId: 'program-123',
        evaluationType: 'pbl_completion',
        metadata: {},
      });

      const taskEvaluations = await evaluationRepo.findByTarget('task', 'task-123');
      expect(taskEvaluations).toHaveLength(2);

      const programEvaluations = await evaluationRepo.findByTarget('program', 'program-123');
      expect(programEvaluations).toHaveLength(1);
    });
  });

  describe('Integration Tests', () => {
    it('should create a complete learning flow', async () => {
      // 1. Create Scenario
      const scenario = await scenarioRepo.create({
        sourceType: 'pbl' as const,
        sourceRef: {
          type: 'yaml' as const,
          path: 'integration-test.yaml',
          metadata: {},
        },
        title: 'Integration Test Scenario',
        description: 'Testing complete flow',
        objectives: ['Learn something'],
        taskTemplates: [
          {
            id: 'template-1',
            title: 'Task Template 1',
            type: 'chat',
          },
        ],
      });

      // 2. Create Program
      const program = await programRepo.create({
        scenarioId: scenario.id,
        userId: 'test-user',
        metadata: {},
      });

      // 3. Create Tasks
      const task1 = await taskRepo.create({
        programId: program.id,
        scenarioTaskIndex: 0,
        title: 'Task 1',
        type: 'chat' as const,
        content: {
          instructions: 'Complete this task',
        },
      });

      // 4. Update Program with task IDs
      await programRepo.updateTaskIds(program.id, [task1.id]);

      // 5. Add interaction to task
      await taskRepo.addInteraction(task1.id, {
        timestamp: new Date().toISOString(),
        type: 'user_input',
        content: { message: 'My answer' },
      });

      // 6. Create task evaluation
      const taskEval = await evaluationRepo.create({
        targetType: 'task' as const,
        targetId: task1.id,
        evaluationType: 'pbl_task',
        score: 90,
        metadata: { programId: program.id },
      });

      // 7. Complete task
      await taskRepo.complete(task1.id);

      // 8. Create program evaluation
      const programEval = await evaluationRepo.create({
        targetType: 'program' as const,
        targetId: program.id,
        evaluationType: 'pbl_completion',
        score: 90,
        metadata: {},
      });

      // 9. Complete program
      await programRepo.complete(program.id);

      // Verify the complete flow
      const finalProgram = await programRepo.findById(program.id);
      expect(finalProgram?.status).toBe('completed');
      expect(finalProgram?.completedAt).toBeDefined();

      const finalTask = await taskRepo.findById(task1.id);
      expect(finalTask?.status).toBe('completed');
      expect(finalTask?.interactions).toHaveLength(1);

      const evaluations = await evaluationRepo.findByProgram(program.id);
      expect(evaluations).toHaveLength(2);
    });
  });
});