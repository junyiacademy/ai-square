/**
 * Service Factory
 * 統一的服務初始化工廠
 */

import { UserCentricGCSProvider } from '../storage/providers/user-centric-gcs.provider';
import { GCSTrackRepository } from '../track/repositories/gcs-track.repository';
import { GCSProgramRepository } from '../program/repositories/gcs-program.repository';
import { PBLProgramRepository } from '../program/repositories/pbl-program.repository';
import { GCSTaskRepository } from '../task/repositories/gcs-task.repository';
import { GCSLogRepository } from '../log/repositories/gcs-log.repository';

import { TrackService } from '../track/services/track.service';
import { ProgramService } from '../program/services/program.service';
import { TaskService } from '../task/services/task.service';
import { LogService } from '../log/services/log.service';

/**
 * 服務容器配置
 */
export interface ServiceFactoryConfig {
  storage: {
    projectId: string;
    bucketName: string;
    keyFilePath?: string;
  };
  cache?: {
    enabled: boolean;
    ttl?: number;
  };
  ai?: {
    defaultModel?: string;
    maxRetries?: number;
  };
}

/**
 * 服務容器
 */
export interface ServiceContainer {
  // Core Services
  trackService: TrackService;
  programService: ProgramService;
  taskService: TaskService;
  logService: LogService;
  evaluationService: any; // Will be properly typed when EvaluationService is imported
  
  // Storage
  storageProvider: UserCentricGCSProvider;
  
  // Repositories
  trackRepository: GCSTrackRepository;
  programRepository: GCSProgramRepository;
  pblProgramRepository: PBLProgramRepository;
  taskRepository: GCSTaskRepository;
  logRepository: GCSLogRepository;
  evaluationRepository: any; // Will be properly typed when EvaluationRepository is imported
}

/**
 * 服務工廠
 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  private container: ServiceContainer | null = null;

  private constructor() {}

  /**
   * 獲取單例實例
   */
  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  /**
   * 初始化服務容器
   */
  async initialize(config: ServiceFactoryConfig): Promise<ServiceContainer> {
    if (this.container) {
      return this.container;
    }

    // 初始化儲存提供者
    const storageProvider = new UserCentricGCSProvider({
      projectId: config.storage.projectId,
      bucketName: config.storage.bucketName,
      keyFilename: config.storage.keyFilePath
    });

    // 初始化儲存庫
    const trackRepository = new GCSTrackRepository(storageProvider);
    const programRepository = new GCSProgramRepository(storageProvider);
    const pblProgramRepository = new PBLProgramRepository(storageProvider);
    const taskRepository = new GCSTaskRepository(storageProvider);
    const logRepository = new GCSLogRepository(storageProvider);

    // 初始化服務
    // Note: TrackService 需要兩個 repositories
    const { EvaluationRepository } = await import('../track/repositories/evaluation.repository');
    const { EvaluationService } = await import('../track/services/evaluation.service');
    const evaluationRepository = new EvaluationRepository(storageProvider);
    const trackService = new TrackService(trackRepository, evaluationRepository);
    const programService = new ProgramService(programRepository, {
      pbl: pblProgramRepository
    });
    const taskService = new TaskService(taskRepository);
    const logService = new LogService(logRepository);
    const evaluationService = new EvaluationService(evaluationRepository);

    this.container = {
      // Services
      trackService,
      programService,
      taskService,
      logService,
      evaluationService,
      
      // Storage
      storageProvider,
      
      // Repositories
      trackRepository,
      programRepository,
      pblProgramRepository,
      taskRepository,
      logRepository,
      evaluationRepository
    };

    return this.container;
  }

  /**
   * 獲取服務容器
   */
  getContainer(): ServiceContainer {
    if (!this.container) {
      throw new Error('ServiceFactory not initialized. Call initialize() first.');
    }
    return this.container;
  }

  /**
   * 重置容器（主要用於測試）
   */
  reset(): void {
    this.container = null;
  }
}

/**
 * 便利函數：獲取服務容器
 */
export function getServices(): ServiceContainer {
  return ServiceFactory.getInstance().getContainer();
}

/**
 * 便利函數：初始化服務
 */
export async function initializeServices(config: ServiceFactoryConfig): Promise<ServiceContainer> {
  return ServiceFactory.getInstance().initialize(config);
}

/**
 * 預設配置
 */
export const defaultConfig: ServiceFactoryConfig = {
  storage: {
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'ai-square-463013',
    bucketName: process.env.GCS_BUCKET_NAME_V2 || 'ai-square-db-v2',
    keyFilePath: process.env.GOOGLE_APPLICATION_CREDENTIALS
  },
  cache: {
    enabled: true,
    ttl: 300 // 5 minutes
  },
  ai: {
    defaultModel: 'gemini-2.5-flash',
    maxRetries: 3
  }
};

/**
 * 高階 API：完整學習流程
 */
export class LearningFlowAPI {
  private services: ServiceContainer;

  constructor(services: ServiceContainer) {
    this.services = services;
  }

  /**
   * 開始 PBL 學習
   */
  async startPBLLearning(params: {
    userId: string;
    scenarioId: string;
    scenarioTitle: string;
    tasks: Array<{
      type: string;
      title: string;
      description?: string;
      order: number;
      config: any;
    }>;
  }) {
    const { trackService, programService, taskService, logService } = this.services;

    // 1. 創建 Track
    const track = await trackService.createTrack({
      userId: params.userId,
      projectId: params.scenarioId,
      type: 'pbl' as any,
      metadata: {
        title: params.scenarioTitle,
        language: 'zh-TW',
        version: '1.0'
      },
      context: {
        type: 'pbl',
        scenarioId: params.scenarioId,
        programId: '',
        completedTaskIds: [],
        taskProgress: {}
      } as any
    });

    // 2. 創建 Program
    const program = await programService.createProgram({
      trackId: track.id,
      userId: params.userId,
      type: 'PBL' as any,
      title: params.scenarioTitle,
      config: {
        scenarioId: params.scenarioId,
        scenarioTitle: params.scenarioTitle,
        totalTasks: params.tasks.length,
        tasksOrder: params.tasks.map((_, i) => `task-${i + 1}`)
      }
    });

    // 3. 創建 Tasks
    const tasks = await taskService.createTasks(
      params.tasks.map(task => ({
        programId: program.id,
        userId: params.userId,
        type: task.type as any,
        title: task.title,
        description: task.description,
        order: task.order,
        config: task.config
      }))
    );

    // 4. 記錄系統事件
    await logService.logSystemEvent(
      params.userId,
      program.id,
      tasks[0].id,
      'pbl-learning-started',
      {
        scenarioId: params.scenarioId,
        totalTasks: tasks.length
      }
    );

    return {
      track,
      program,
      tasks
    };
  }

  /**
   * 提交任務回答
   */
  async submitTaskResponse(params: {
    userId: string;
    programId: string;
    taskId: string;
    response: string;
    aiModel?: string;
  }) {
    const { taskService, logService } = this.services;

    // 1. 記錄提交
    await logService.logSubmission(
      params.userId,
      params.programId,
      params.taskId,
      'task-response',
      { content: params.response }
    );

    // 2. AI 評估（模擬）
    if (params.aiModel) {
      const aiRequestLog = await logService.logAIRequest(
        params.userId,
        params.programId,
        params.taskId,
        params.aiModel,
        `Evaluate: ${params.response.substring(0, 100)}...`
      );

      // 模擬 AI 回應
      const mockFeedback = 'Good analysis! Consider exploring deeper implications.';
      const mockScore = 75 + Math.random() * 20; // 75-95

      await logService.logAIResponse(
        params.userId,
        params.programId,
        params.taskId,
        params.aiModel,
        mockFeedback,
        150, // prompt tokens
        100, // completion tokens
        1200, // latency
        0.003 // cost
      );

      // 3. 更新任務
      return taskService.updateTask(
        params.userId,
        params.programId,
        params.taskId,
        {
          progress: {
            finalAnswer: params.response,
            evaluation: {
              grade: mockScore >= 90 ? 'A' : mockScore >= 80 ? 'B' : 'C',
              feedback: mockFeedback,
              evaluatedAt: new Date(),
              evaluatedBy: 'AI'
            }
          }
        }
      );
    }

    return null;
  }

  /**
   * 獲取學習進度
   */
  async getLearningProgress(userId: string, programId?: string) {
    const { trackService, programService, taskService, logService } = this.services;

    const [tracks, programs, aiStats] = await Promise.all([
      trackService.queryTracks({ userId }),
      programId ? [await programService.getProgram(userId, programId)] : 
                  programService.queryPrograms({ userId }),
      logService.getAIUsageStats(userId, programId)
    ]);

    return {
      tracks: tracks.filter(Boolean),
      programs: programs.filter(Boolean),
      aiUsage: aiStats
    };
  }
}

/**
 * 獲取高階 API
 */
export function getLearningFlowAPI(): LearningFlowAPI {
  const services = getServices();
  return new LearningFlowAPI(services);
}

/**
 * Helper: Generate a unique program ID
 */
export function generateProgramId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `prog_${timestamp}_${random}`;
}