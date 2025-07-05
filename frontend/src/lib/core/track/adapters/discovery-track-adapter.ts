/**
 * Discovery Track Adapter
 * 將現有的 Discovery 服務適配到新的 Track 架構
 */

import { trackService } from '../services';
import { 
  TrackType, 
  TrackStatus, 
  DiscoveryTrackContext,
  DiscoveryTask,
  EvaluationType,
  DiscoveryEvaluationData,
  ExplorationStep
} from '../types';
import { UserDataService } from '@/lib/services/user-data-service';
import { DiscoveryService } from '@/lib/services/discovery-service';

export class DiscoveryTrackAdapter {
  private userDataService: UserDataService;
  private discoveryService: DiscoveryService;

  constructor() {
    this.userDataService = new UserDataService();
    this.discoveryService = new DiscoveryService();
  }

  /**
   * 創建新的 Discovery Track
   */
  async createDiscoveryTrack(
    userId: string,
    projectId: string,
    workspaceId: string,
    language: string = 'en',
    initialContext?: any
  ) {
    // 創建 Track
    const track = await trackService.createTrack({
      userId,
      projectId,
      type: TrackType.DISCOVERY,
      metadata: {
        language,
        title: `Discovery Workspace: ${workspaceId}`,
        tags: ['discovery', workspaceId]
      },
      context: {
        type: 'discovery',
        workspaceId,
        currentPathId: undefined,
        completedPaths: [],
        generatedTasks: [],
        explorationHistory: []
      }
    });

    // 記錄探索開始
    await trackService.recordExplorationStep(
      track.id,
      'workspace_created',
      { workspaceId, initialContext },
      { trackId: track.id }
    );

    // 同步到舊系統（為了向後兼容）
    await this.userDataService.createWorkspaceSession({
      workspaceId,
      startedAt: new Date(),
      language,
      context: initialContext
    });

    return track;
  }

  /**
   * 生成新的探索路徑
   */
  async generatePath(
    trackId: string,
    topic: string,
    previousResults?: any
  ) {
    const track = await trackService.getTrack(trackId);
    if (!track || track.type !== TrackType.DISCOVERY) {
      throw new Error('Invalid Discovery track');
    }

    const context = track.context as DiscoveryTrackContext;
    
    // 使用 Discovery Service 生成路徑
    const paths = await this.discoveryService.generateInfinitePaths(
      topic,
      track.metadata.language,
      previousResults
    );

    // 記錄探索步驟
    await trackService.recordExplorationStep(
      trackId,
      'path_generated',
      { topic, pathCount: paths.length },
      { paths: paths.map(p => p.id) }
    );

    // 更新當前路徑
    if (paths.length > 0) {
      await trackService.updateTrack(trackId, {
        context: {
          ...context,
          currentPathId: paths[0].id
        }
      });
    }

    return paths;
  }

  /**
   * 生成動態任務
   */
  async generateTasks(
    trackId: string,
    pathId: string,
    taskCount: number = 3
  ) {
    const track = await trackService.getTrack(trackId);
    if (!track || track.type !== TrackType.DISCOVERY) {
      throw new Error('Invalid Discovery track');
    }

    // 這裡應該調用 AI 生成任務...
    // const tasks = await aiService.generateDiscoveryTasks(pathId, taskCount);
    
    // 模擬生成任務
    const tasks: Omit<DiscoveryTask, 'id' | 'generatedAt'>[] = [];
    for (let i = 0; i < taskCount; i++) {
      tasks.push({
        title: `Task ${i + 1}: Explore ${pathId}`,
        description: `Investigate and document your findings about this topic.`,
        difficulty: ['easy', 'medium', 'hard'][i % 3] as any,
        estimatedTime: (i + 1) * 10
      });
    }

    // 添加任務到 Track
    for (const task of tasks) {
      await trackService.addDiscoveryTask(trackId, task);
    }

    // 記錄生成
    await trackService.recordExplorationStep(
      trackId,
      'tasks_generated',
      { pathId, taskCount },
      { taskIds: tasks.map((_, i) => `task_${i}`) }
    );

    return tasks;
  }

  /**
   * 提交任務答案
   */
  async submitTaskAnswer(
    trackId: string,
    taskId: string,
    answer: string
  ) {
    const track = await trackService.getTrack(trackId);
    if (!track || track.type !== TrackType.DISCOVERY) {
      throw new Error('Invalid Discovery track');
    }

    const context = track.context as DiscoveryTrackContext;
    
    // 更新任務狀態
    const taskIndex = context.generatedTasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      context.generatedTasks[taskIndex].completedAt = new Date();
      await trackService.updateTrack(trackId, { context });
    }

    // 記錄答案
    await trackService.recordExplorationStep(
      trackId,
      'task_completed',
      { taskId, answer },
      { success: true }
    );

    // 同步到舊系統
    await this.userDataService.saveTaskAnswer(
      context.workspaceId,
      taskId,
      answer
    );

    return { taskId, completed: true };
  }

  /**
   * 完成探索路徑
   */
  async completePath(trackId: string, pathId: string) {
    const track = await trackService.getTrack(trackId);
    if (!track || track.type !== TrackType.DISCOVERY) {
      throw new Error('Invalid Discovery track');
    }

    const context = track.context as DiscoveryTrackContext;
    
    // 添加到已完成路徑
    if (!context.completedPaths.includes(pathId)) {
      context.completedPaths.push(pathId);
      await trackService.updateTrack(trackId, { context });
    }

    // 創建評估
    const completedTasks = context.generatedTasks.filter(t => t.completedAt).length;
    const evaluation = await trackService.createEvaluation({
      trackId,
      userId: track.userId,
      type: EvaluationType.DISCOVERY,
      evaluationData: {
        type: 'discovery',
        workspaceId: context.workspaceId,
        pathId,
        tasksCompleted: completedTasks,
        totalTasks: context.generatedTasks.length,
        explorationDepth: context.explorationHistory.length,
        creativityScore: this.calculateCreativityScore(context),
        learningObjectivesMet: [],
        insights: []
      } as DiscoveryEvaluationData
    });

    // 生成反饋
    const feedback = {
      summary: `Great exploration! You completed ${completedTasks} tasks and discovered new insights.`,
      strengths: ['Thorough investigation', 'Creative thinking'],
      improvements: ['Could explore more connections'],
      suggestions: ['Try different perspectives next time']
    };

    await trackService.completeEvaluation(
      evaluation.id,
      Math.floor(80 + Math.random() * 20), // 80-100
      feedback
    );

    return { pathId, evaluation };
  }

  /**
   * 完成整個 Discovery 工作空間
   */
  async completeWorkspace(trackId: string) {
    const track = await trackService.getTrack(trackId);
    if (!track || track.type !== TrackType.DISCOVERY) {
      throw new Error('Invalid Discovery track');
    }

    // 完成 Track
    await trackService.completeTrack(trackId);

    // 計算統計
    const evaluations = await trackService.getTrackEvaluations(trackId);
    const context = track.context as DiscoveryTrackContext;
    
    // 同步到舊系統
    await this.userDataService.completeWorkspaceSession(
      context.workspaceId,
      {
        completedAt: new Date(),
        pathsExplored: context.completedPaths.length,
        tasksCompleted: context.generatedTasks.filter(t => t.completedAt).length
      }
    );

    return {
      trackId,
      pathsExplored: context.completedPaths.length,
      tasksCompleted: context.generatedTasks.filter(t => t.completedAt).length,
      totalExplorationTime: this.calculateExplorationTime(track)
    };
  }

  /**
   * 從舊系統遷移 Discovery 數據
   */
  async migrateLegacyDiscoveryData(userId: string) {
    const workspaceSessions = await this.userDataService.getWorkspaceSessions();
    const migratedTracks = [];
    
    for (const session of workspaceSessions) {
      // 檢查是否已經遷移
      const existingTracks = await trackService.queryTracks({
        userId,
        type: TrackType.DISCOVERY
      });
      
      const alreadyMigrated = existingTracks.some(t => {
        const ctx = t.context as DiscoveryTrackContext;
        return ctx.workspaceId === session.workspaceId;
      });
      
      if (!alreadyMigrated) {
        // 創建新的 Track
        const track = await this.createDiscoveryTrack(
          userId,
          'migrated',
          session.workspaceId,
          session.language || 'en',
          session.context
        );
        
        // 遷移已保存的路徑
        const savedPaths = await this.userDataService.getSavedPaths();
        const workspacePaths = savedPaths.filter(p => 
          p.workspaceId === session.workspaceId
        );
        
        for (const path of workspacePaths) {
          const context = track.context as DiscoveryTrackContext;
          context.completedPaths.push(path.id);
          await trackService.updateTrack(track.id, { context });
        }
        
        // 遷移動態任務
        const dynamicTasks = await this.userDataService.getDynamicTasks();
        const workspaceTasks = dynamicTasks.filter(t => 
          t.workspaceId === session.workspaceId
        );
        
        for (const task of workspaceTasks) {
          await trackService.addDiscoveryTask(track.id, {
            title: task.title,
            description: task.description || '',
            difficulty: 'medium',
            estimatedTime: 15,
            completedAt: task.completed ? new Date() : undefined
          });
        }
        
        migratedTracks.push(track);
      }
    }
    
    return migratedTracks;
  }

  /**
   * 獲取 Discovery Track 詳情
   */
  async getDiscoveryTrackDetails(trackId: string) {
    const track = await trackService.getTrack(trackId);
    if (!track || track.type !== TrackType.DISCOVERY) {
      throw new Error('Invalid Discovery track');
    }

    const context = track.context as DiscoveryTrackContext;
    const evaluations = await trackService.getTrackEvaluations(trackId);
    
    return {
      track,
      exploration: {
        workspaceId: context.workspaceId,
        currentPath: context.currentPathId,
        completedPaths: context.completedPaths,
        totalSteps: context.explorationHistory.length
      },
      tasks: {
        total: context.generatedTasks.length,
        completed: context.generatedTasks.filter(t => t.completedAt).length,
        tasks: context.generatedTasks
      },
      evaluations,
      insights: this.extractInsights(context.explorationHistory)
    };
  }

  /**
   * 計算創意分數
   */
  private calculateCreativityScore(context: DiscoveryTrackContext): number {
    // 基於探索深度、路徑多樣性等計算
    const pathDiversity = context.completedPaths.length;
    const explorationDepth = context.explorationHistory.length;
    const taskCompletion = context.generatedTasks.filter(t => t.completedAt).length;
    
    return Math.min(100, (pathDiversity * 20) + (explorationDepth * 2) + (taskCompletion * 10));
  }

  /**
   * 計算探索時間
   */
  private calculateExplorationTime(track: any): number {
    const start = track.startedAt.getTime();
    const end = track.completedAt?.getTime() || Date.now();
    return Math.round((end - start) / 1000 / 60); // 分鐘
  }

  /**
   * 提取洞察
   */
  private extractInsights(history: ExplorationStep[]): string[] {
    // 從探索歷史中提取關鍵洞察
    const insights: string[] = [];
    
    const pathGenerations = history.filter(h => h.action === 'path_generated');
    if (pathGenerations.length > 3) {
      insights.push('Extensive exploration across multiple paths');
    }
    
    const taskCompletions = history.filter(h => h.action === 'task_completed');
    if (taskCompletions.length > 5) {
      insights.push('High task completion rate shows dedication');
    }
    
    return insights;
  }
}