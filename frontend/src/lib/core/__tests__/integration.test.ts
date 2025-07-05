/**
 * 四層架構整合測試
 * 測試 Track > Program > Task + Log 的完整流程
 */

import { 
  ServiceFactory, 
  ServiceFactoryConfig, 
  LearningFlowAPI,
  getLearningFlowAPI 
} from '../services/service-factory';
import { TrackType, TrackStatus } from '../track/types';
import { ProgramType, ProgramStatus } from '../program/types';
import { TaskType, TaskStatus } from '../task/types';
import { LogType, LogSeverity } from '../log/types';

// 模擬配置
const testConfig: ServiceFactoryConfig = {
  storage: {
    projectId: 'test-project',
    bucketName: 'test-bucket'
  },
  cache: {
    enabled: false // 測試時禁用快取
  },
  ai: {
    defaultModel: 'gemini-2.5-flash',
    maxRetries: 1
  }
};

describe('Four-Phase Architecture Integration', () => {
  let serviceFactory: ServiceFactory;
  let services: any;
  let learningAPI: LearningFlowAPI;

  beforeAll(async () => {
    serviceFactory = ServiceFactory.getInstance();
    // 注意：在實際測試中，你需要配置真實的 GCS 憑證
    // 這裡我們假設有適當的測試環境
    services = await serviceFactory.initialize(testConfig);
    learningAPI = new LearningFlowAPI(services);
  });

  afterAll(() => {
    serviceFactory.reset();
  });

  describe('Phase 1: Track Layer', () => {
    let trackId: string;
    const userId = 'test-user-123';
    const projectId = 'pbl-scenario-test';

    test('should create a track', async () => {
      const track = await services.trackService.createTrack({
        userId,
        projectId,
        type: TrackType.PBL,
        metadata: {
          title: 'Test PBL Scenario',
          description: 'Testing the four-phase architecture',
          language: 'zh-TW',
          version: '1.0'
        },
        context: {
          type: 'pbl',
          scenarioId: projectId,
          programId: '',
          completedTaskIds: [],
          taskProgress: {}
        }
      });

      expect(track).toBeDefined();
      expect(track.userId).toBe(userId);
      expect(track.type).toBe(TrackType.PBL);
      expect(track.status).toBe(TrackStatus.ACTIVE);
      
      trackId = track.id;
    });

    test('should query tracks', async () => {
      const tracks = await services.trackService.queryTracks({
        userId,
        type: TrackType.PBL
      });

      expect(tracks).toHaveLength(1);
      expect(tracks[0].id).toBe(trackId);
    });

    test('should update track status', async () => {
      const updatedTrack = await services.trackService.updateTrack(trackId, {
        status: TrackStatus.PAUSED
      });

      expect(updatedTrack?.status).toBe(TrackStatus.PAUSED);
    });
  });

  describe('Phase 2: Program Layer', () => {
    let trackId: string;
    let programId: string;
    const userId = 'test-user-123';

    beforeAll(async () => {
      // 創建一個 Track 作為測試基礎
      const track = await services.trackService.createTrack({
        userId,
        projectId: 'test-project',
        type: TrackType.PBL,
        metadata: { language: 'zh-TW', version: '1.0' },
        context: {
          type: 'pbl',
          scenarioId: 'test-scenario',
          programId: '',
          completedTaskIds: [],
          taskProgress: {}
        }
      });
      trackId = track.id;
    });

    test('should create a program', async () => {
      const program = await services.programService.createProgram({
        trackId,
        userId,
        type: ProgramType.PBL,
        title: 'Test PBL Program',
        description: 'Testing program creation',
        config: {
          scenarioId: 'test-scenario',
          scenarioTitle: 'Test Scenario',
          totalTasks: 3,
          tasksOrder: ['task-1', 'task-2', 'task-3']
        }
      });

      expect(program).toBeDefined();
      expect(program.trackId).toBe(trackId);
      expect(program.type).toBe(ProgramType.PBL);
      expect(program.status).toBe(ProgramStatus.NOT_STARTED);
      
      programId = program.id;
    });

    test('should start program', async () => {
      const startedProgram = await services.programService.startProgram(userId, programId);
      
      expect(startedProgram?.status).toBe(ProgramStatus.IN_PROGRESS);
      expect(startedProgram?.startedAt).toBeDefined();
    });

    test('should query programs', async () => {
      const programs = await services.programService.queryPrograms({
        userId,
        trackId,
        type: ProgramType.PBL
      });

      expect(programs).toHaveLength(1);
      expect(programs[0].id).toBe(programId);
    });
  });

  describe('Phase 3: Task Layer', () => {
    let trackId: string;
    let programId: string;
    let taskIds: string[] = [];
    const userId = 'test-user-123';

    beforeAll(async () => {
      // 創建 Track 和 Program
      const track = await services.trackService.createTrack({
        userId,
        projectId: 'test-project',
        type: TrackType.PBL,
        metadata: { language: 'zh-TW', version: '1.0' },
        context: {
          type: 'pbl',
          scenarioId: 'test-scenario',
          programId: '',
          completedTaskIds: [],
          taskProgress: {}
        }
      });
      trackId = track.id;

      const program = await services.programService.createProgram({
        trackId,
        userId,
        type: ProgramType.PBL,
        title: 'Test Program',
        config: {
          scenarioId: 'test-scenario',
          scenarioTitle: 'Test Scenario',
          totalTasks: 2,
          tasksOrder: ['task-1', 'task-2']
        }
      });
      programId = program.id;
    });

    test('should create tasks', async () => {
      const tasks = await services.taskService.createTasks([
        {
          programId,
          userId,
          type: TaskType.ANALYSIS,
          title: 'Analyze the Problem',
          description: 'First task - analysis',
          order: 1,
          config: {
            maxAttempts: 3,
            showHints: true,
            allowSkip: false
          }
        },
        {
          programId,
          userId,
          type: TaskType.DESIGN,
          title: 'Design Solution',
          description: 'Second task - design',
          order: 2,
          config: {
            maxAttempts: 2,
            showHints: false,
            allowSkip: true
          }
        }
      ]);

      expect(tasks).toHaveLength(2);
      expect(tasks[0].type).toBe(TaskType.ANALYSIS);
      expect(tasks[1].type).toBe(TaskType.DESIGN);
      
      taskIds = tasks.map(t => t.id);
    });

    test('should start and complete task', async () => {
      const taskId = taskIds[0];
      
      // 開始任務
      const startedTask = await services.taskService.startTask(userId, programId, taskId);
      expect(startedTask?.status).toBe(TaskStatus.IN_PROGRESS);

      // 更新進度
      const progressTask = await services.taskService.updateProgress(
        userId, programId, taskId,
        { timeSpent: 300, attempts: 1 }
      );
      expect(progressTask?.progress.timeSpent).toBe(300);

      // 完成任務
      const completedTask = await services.taskService.completeTask(
        userId, programId, taskId, 85
      );
      expect(completedTask?.status).toBe(TaskStatus.COMPLETED);
      expect(completedTask?.progress.score).toBe(85);
    });

    test('should get program progress', async () => {
      const progress = await services.taskService.getProgramProgress(userId, programId);
      
      expect(progress.total).toBe(2);
      expect(progress.completed).toBe(1);
      expect(progress.percentage).toBe(50);
    });
  });

  describe('Phase 4: Log Layer', () => {
    let trackId: string;
    let programId: string;
    let taskId: string;
    const userId = 'test-user-123';

    beforeAll(async () => {
      // 創建完整的層級結構
      const track = await services.trackService.createTrack({
        userId,
        projectId: 'test-project',
        type: TrackType.PBL,
        metadata: { language: 'zh-TW', version: '1.0' },
        context: {
          type: 'pbl',
          scenarioId: 'test-scenario',
          programId: '',
          completedTaskIds: [],
          taskProgress: {}
        }
      });
      trackId = track.id;

      const program = await services.programService.createProgram({
        trackId,
        userId,
        type: ProgramType.PBL,
        title: 'Test Program',
        config: {
          scenarioId: 'test-scenario',
          scenarioTitle: 'Test Scenario',
          totalTasks: 1,
          tasksOrder: ['task-1']
        }
      });
      programId = program.id;

      const task = await services.taskService.createTask({
        programId,
        userId,
        type: TaskType.ANALYSIS,
        title: 'Test Task',
        order: 1,
        config: { maxAttempts: 3 }
      });
      taskId = task.id;
    });

    test('should log interactions', async () => {
      const interactionLog = await services.logService.logInteraction(
        userId, programId, taskId,
        'click', 'submit-button', 
        { answer: 'Test response' }
      );

      expect(interactionLog.type).toBe(LogType.INTERACTION);
      expect(interactionLog.data.action).toBe('click');
    });

    test('should log AI requests and responses', async () => {
      // AI 請求
      const requestLog = await services.logService.logAIRequest(
        userId, programId, taskId,
        'gemini-2.5-flash',
        'Evaluate user response: Test response'
      );
      expect(requestLog.type).toBe(LogType.AI_REQUEST);

      // AI 回應
      const responseLog = await services.logService.logAIResponse(
        userId, programId, taskId,
        'gemini-2.5-flash',
        'Good analysis! Consider adding more details.',
        100, 200, 1500, 0.003
      );
      expect(responseLog.type).toBe(LogType.AI_RESPONSE);
      expect(responseLog.data.tokens.total).toBe(300);
    });

    test('should log submissions', async () => {
      const submissionLog = await services.logService.logSubmission(
        userId, programId, taskId,
        'task-response',
        { content: 'Final answer content', confidence: 8 },
        1
      );

      expect(submissionLog.type).toBe(LogType.SUBMISSION);
      expect(submissionLog.data.submissionType).toBe('task-response');
    });

    test('should get AI usage statistics', async () => {
      const aiStats = await services.logService.getAIUsageStats(
        userId, programId, taskId
      );

      expect(aiStats.totalRequests).toBeGreaterThan(0);
      expect(aiStats.totalTokens).toBeGreaterThan(0);
      expect(aiStats.modelUsage['gemini-2.5-flash']).toBeGreaterThan(0);
    });

    test('should get log statistics', async () => {
      const stats = await services.logService.getStatistics(userId, programId, taskId);
      
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.byType[LogType.INTERACTION]).toBeGreaterThan(0);
      expect(stats.byType[LogType.AI_REQUEST]).toBeGreaterThan(0);
      expect(stats.byType[LogType.AI_RESPONSE]).toBeGreaterThan(0);
    });
  });

  describe('High-Level Learning Flow API', () => {
    const userId = 'test-user-456';

    test('should complete full PBL learning flow', async () => {
      // 開始學習
      const learning = await learningAPI.startPBLLearning({
        userId,
        scenarioId: 'ethics-scenario',
        scenarioTitle: 'AI Ethics Case Study',
        tasks: [
          {
            type: TaskType.ANALYSIS,
            title: 'Analyze Ethical Issues',
            description: 'Identify key ethical concerns',
            order: 1,
            config: { maxAttempts: 3, showHints: true }
          },
          {
            type: TaskType.DESIGN,
            title: 'Design Ethical Framework',
            description: 'Create framework for decision making',
            order: 2,
            config: { maxAttempts: 2, showHints: false }
          }
        ]
      });

      expect(learning.track).toBeDefined();
      expect(learning.program).toBeDefined();
      expect(learning.tasks).toHaveLength(2);

      // 提交第一個任務
      const taskResponse = await learningAPI.submitTaskResponse({
        userId,
        programId: learning.program.id,
        taskId: learning.tasks[0].id,
        response: 'This scenario raises privacy and bias concerns...',
        aiModel: 'gemini-2.5-flash'
      });

      expect(taskResponse).toBeDefined();
      expect(taskResponse?.progress.finalAnswer).toContain('privacy and bias');

      // 檢查學習進度
      const progress = await learningAPI.getLearningProgress(userId, learning.program.id);
      
      expect(progress.tracks).toHaveLength(1);
      expect(progress.programs).toHaveLength(1);
      expect(progress.aiUsage.totalRequests).toBeGreaterThan(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    const userId = 'test-user-performance';

    test('should handle batch operations efficiently', async () => {
      const startTime = Date.now();

      // 批量創建
      const track = await services.trackService.createTrack({
        userId,
        projectId: 'batch-test',
        type: TrackType.PBL,
        metadata: { language: 'zh-TW', version: '1.0' },
        context: {
          type: 'pbl',
          scenarioId: 'batch-scenario',
          programId: '',
          completedTaskIds: [],
          taskProgress: {}
        }
      });

      const program = await services.programService.createProgram({
        trackId: track.id,
        userId,
        type: ProgramType.PBL,
        title: 'Batch Test Program',
        config: {
          scenarioId: 'batch-scenario',
          scenarioTitle: 'Batch Test',
          totalTasks: 10,
          tasksOrder: Array.from({length: 10}, (_, i) => `task-${i+1}`)
        }
      });

      // 批量創建 10 個任務
      const taskParams = Array.from({length: 10}, (_, i) => ({
        programId: program.id,
        userId,
        type: TaskType.ANALYSIS,
        title: `Task ${i + 1}`,
        order: i + 1,
        config: { maxAttempts: 3 }
      }));

      const tasks = await services.taskService.createTasks(taskParams);
      expect(tasks).toHaveLength(10);

      // 批量創建日誌
      const logParams = tasks.map(task => ({
        userId,
        programId: program.id,
        taskId: task.id,
        type: LogType.SYSTEM,
        severity: LogSeverity.INFO,
        message: `Task ${task.title} created`
      }));

      const logs = await services.logService.createLogs(logParams);
      expect(logs).toHaveLength(10);

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 批量操作應該在合理時間內完成（比如 5 秒內）
      expect(duration).toBeLessThan(5000);
    });

    test('should handle error cases gracefully', async () => {
      // 測試不存在的資源
      const nonExistentTask = await services.taskService.getTask(
        'non-existent-user',
        'non-existent-program',
        'non-existent-task'
      );
      expect(nonExistentTask).toBeNull();

      // 測試錯誤日誌記錄
      await services.logService.logError(
        userId,
        'test-program',
        'test-task',
        new Error('Test error for logging'),
        { context: 'error-handling-test' }
      );

      const errorLogs = await services.logService.getErrorLogs(userId);
      expect(errorLogs.length).toBeGreaterThan(0);
    });
  });
});

/**
 * 輔助函數：等待指定時間
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 輔助函數：生成測試資料
 */
function generateTestData(count: number) {
  return Array.from({length: count}, (_, i) => ({
    id: `test-${i + 1}`,
    name: `Test Item ${i + 1}`,
    data: { index: i, timestamp: new Date() }
  }));
}