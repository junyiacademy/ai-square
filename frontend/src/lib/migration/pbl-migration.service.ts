/**
 * PBL Migration Service
 * 將現有 PBL 系統遷移到新的四層統一架構
 */

import {
  ServiceFactory,
  LearningFlowAPI,
  getServices
} from '../core/services/service-factory';
import { TrackType, TrackStatus } from '../core/track/types';
import { ProgramType, ProgramStatus } from '../core/program/types';
import { TaskType, TaskStatus } from '../core/task/types';
import { LogType, LogSeverity } from '../core/log/types';

// 現有 PBL 類型
import { 
  ProgramMetadata, 
  TaskMetadata, 
  TaskLog, 
  TaskProgress, 
  TaskInteraction,
  ProgramSummary
} from '@/types/pbl';
import type { TaskEvaluation } from '@/types/pbl-completion';

// 現有服務
import { pblProgramService } from '../storage/pbl-program-service';
import { PBLStorageService } from '../storage/pbl-storage-service';

export class PBLMigrationService {
  private pblStorageService = new PBLStorageService();
  private isInitialized = false;

  /**
   * 確保服務已初始化
   */
  private async ensureInitialized() {
    if (!this.isInitialized) {
      try {
        await ServiceFactory.getInstance().initialize({
          storage: {
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'ai-square-dev',
            bucketName: process.env.GCS_BUCKET_NAME_V2 || 'ai-square-db-v2',
            keyFilePath: process.env.GOOGLE_CLOUD_KEY_FILE
          }
        });
        this.isInitialized = true;
      } catch (error) {
        console.error('Failed to initialize services:', error);
        throw error;
      }
    }
  }

  /**
   * 遷移現有 PBL Program 到新架構
   */
  async migratePBLProgram(
    userEmail: string,
    scenarioId: string,
    programId: string
  ): Promise<{
    trackId: string;
    programId: string;
    taskIds: string[];
    migrationLog: string[];
  }> {
    await this.ensureInitialized();
    const services = getServices();
    const migrationLog: string[] = [];

    try {
      migrationLog.push(`🚀 Starting migration for program ${programId}`);

      // 1. 獲取現有 PBL Program 資料
      const existingProgram = await pblProgramService.getProgram(userEmail, scenarioId, programId);
      if (!existingProgram) {
        throw new Error(`Program ${programId} not found`);
      }
      
      migrationLog.push(`✅ Found existing program: ${existingProgram.scenarioTitle}`);

      // 2. 創建新的 Track
      const track = await services.trackService.createTrack({
        userId: userEmail,
        projectId: scenarioId,
        type: TrackType.PBL,
        metadata: {
          title: existingProgram.scenarioTitle,
          description: `Migrated from legacy PBL program ${programId}`,
          language: existingProgram.language || 'en',
          version: '2.0',
          tags: ['migrated', 'pbl'],
          // 保留原始程序資訊
          legacyData: {
            originalProgramId: programId,
            migratedAt: new Date().toISOString(),
            originalStartedAt: existingProgram.startedAt
          }
        },
        context: {
          type: 'pbl',
          scenarioId,
          programId: '', // 稍後更新
          completedTaskIds: [],
          taskProgress: {}
        }
      });

      migrationLog.push(`✅ Created Track: ${track.id}`);

      // 3. 創建新的 Program
      const newProgram = await services.programService.createProgram({
        trackId: track.id,
        userId: userEmail,
        type: ProgramType.PBL,
        title: existingProgram.scenarioTitle,
        description: `Migrated PBL program: ${existingProgram.scenarioTitle}`,
        metadata: {
          language: existingProgram.language || 'en',
          source: scenarioId,
          legacyProgramId: programId,
          migratedAt: new Date().toISOString()
        },
        config: {
          scenarioId,
          scenarioTitle: existingProgram.scenarioTitle,
          totalTasks: existingProgram.totalTasks,
          tasksOrder: [] // 稍後填入
        }
      });

      migrationLog.push(`✅ Created Program: ${newProgram.id}`);

      // 4. 更新 Track 的 context
      await services.trackService.updateTrack(track.id, {
        context: {
          type: 'pbl',
          scenarioId,
          programId: newProgram.id,
          completedTaskIds: [],
          taskProgress: {}
        }
      });

      // 5. 遷移 Tasks
      const taskIds: string[] = [];
      const taskMap = new Map<string, string>(); // oldTaskId -> newTaskId
      
      // 獲取現有 tasks 資料
      const programSummary = await pblProgramService.getProgramSummary(userEmail, scenarioId, programId);
      if (programSummary?.tasks) {
        migrationLog.push(`📋 Found ${programSummary.tasks.length} tasks to migrate`);

        // 按順序遷移每個 task
        for (let i = 0; i < programSummary.tasks.length; i++) {
          const taskData = programSummary.tasks[i];
          const oldTaskId = taskData.metadata.taskId;

          // 獲取詳細的 task 資料
          const detailedTaskData = await pblProgramService.getTaskData(
            userEmail, scenarioId, programId, oldTaskId
          );

          // 創建新 Task
          const newTask = await services.taskService.createTask({
            programId: newProgram.id,
            userId: userEmail,
            type: this.mapTaskType(oldTaskId), // 根據 taskId 推斷類型
            title: taskData.metadata.title,
            description: `Legacy task ${oldTaskId}`,
            order: i + 1,
            metadata: {
              difficulty: 'medium',
              estimatedTime: 30,
              tags: ['migrated'],
              legacyTaskId: oldTaskId
            },
            config: {
              maxAttempts: taskData.metadata.attempts || 3,
              allowSkip: false,
              showHints: true
            }
          });

          taskIds.push(newTask.id);
          taskMap.set(oldTaskId, newTask.id);

          // 更新狀態和進度
          if (detailedTaskData.metadata?.status === 'completed') {
            await services.taskService.updateTask(userEmail, newProgram.id, newTask.id, {
              status: TaskStatus.COMPLETED,
              progress: {
                completed: true,
                score: detailedTaskData.progress?.score || 0,
                timeSpent: detailedTaskData.progress?.timeSpentSeconds || 0,
                finalAnswer: this.extractFinalAnswer(detailedTaskData.log),
                evaluation: this.convertEvaluation(detailedTaskData.evaluation)
              }
            });
          }

          // 遷移 Logs
          if (detailedTaskData.log?.interactions) {
            await this.migrateLogs(
              services,
              userEmail,
              newProgram.id,
              newTask.id,
              detailedTaskData.log.interactions,
              migrationLog
            );
          }

          migrationLog.push(`✅ Migrated task: ${oldTaskId} -> ${newTask.id}`);
        }
      }

      // 6. 更新 Program 狀態
      const programStatus = existingProgram.status === 'completed' 
        ? ProgramStatus.COMPLETED 
        : ProgramStatus.IN_PROGRESS;

      await services.programService.updateProgram(userEmail, newProgram.id, {
        status: programStatus,
        progress: {
          totalTasks: taskIds.length,
          completedTasks: taskIds.filter(async (taskId) => {
            const task = await services.taskService.getTask(userEmail, newProgram.id, taskId);
            return task?.status === TaskStatus.COMPLETED;
          }).length,
          averageScore: programSummary?.overallScore
        }
      });

      // 7. 更新 Track 狀態
      const trackStatus = programStatus === ProgramStatus.COMPLETED 
        ? TrackStatus.COMPLETED 
        : TrackStatus.ACTIVE;

      await services.trackService.updateTrack(track.id, {
        status: trackStatus,
        summary: programSummary ? {
          totalTimeSpent: programSummary.totalTimeSeconds,
          totalPrograms: 1,
          completedPrograms: trackStatus === TrackStatus.COMPLETED ? 1 : 0,
          averagePerformance: programSummary.overallScore || 0,
          achievements: ['Legacy PBL Completion'],
          insights: [`Migrated from legacy system on ${new Date().toLocaleDateString()}`],
          skillsLearned: Object.keys(programSummary.domainScores || {}),
          areasImproved: ['Problem-based learning'],
          recommendations: ['Continue with advanced scenarios'],
          createdAt: new Date(),
          updatedAt: new Date()
        } : undefined
      });

      // 8. 記錄系統事件
      await services.logService.logSystemEvent(
        userEmail,
        newProgram.id,
        taskIds[0] || 'migration',
        'pbl-program-migrated',
        {
          legacyProgramId: programId,
          scenarioId,
          taskCount: taskIds.length,
          migrationTimestamp: new Date().toISOString()
        }
      );

      migrationLog.push(`🎉 Migration completed successfully!`);
      migrationLog.push(`📊 Summary: Track=${track.id}, Program=${newProgram.id}, Tasks=${taskIds.length}`);

      return {
        trackId: track.id,
        programId: newProgram.id,
        taskIds,
        migrationLog
      };

    } catch (error) {
      migrationLog.push(`❌ Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 批量遷移用戶的所有 PBL Programs
   */
  async migrateUserPBLPrograms(userEmail: string): Promise<{
    migratedPrograms: Array<{
      scenarioId: string;
      programId: string;
      newTrackId: string;
      newProgramId: string;
    }>;
    errors: Array<{ programId: string; error: string }>;
    migrationLog: string[];
  }> {
    const migrationLog: string[] = [];
    const migratedPrograms: Array<{
      scenarioId: string;
      programId: string;
      newTrackId: string;
      newProgramId: string;
    }> = [];
    const errors: Array<{ programId: string; error: string }> = [];

    try {
      migrationLog.push(`🚀 Starting bulk migration for user: ${userEmail}`);

      // 獲取用戶的所有 PBL Programs
      const userPrograms = await pblProgramService.getUserPrograms(userEmail);
      migrationLog.push(`📋 Found ${userPrograms.length} programs to migrate`);

      for (const programSummary of userPrograms) {
        try {
          const result = await this.migratePBLProgram(
            userEmail,
            programSummary.program.scenarioId,
            programSummary.program.id
          );

          migratedPrograms.push({
            scenarioId: programSummary.program.scenarioId,
            programId: programSummary.program.id,
            newTrackId: result.trackId,
            newProgramId: result.programId
          });

          migrationLog.push(`✅ Successfully migrated: ${programSummary.program.id}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            programId: programSummary.program.id,
            error: errorMsg
          });
          migrationLog.push(`❌ Failed to migrate ${programSummary.program.id}: ${errorMsg}`);
        }
      }

      migrationLog.push(`🎉 Bulk migration completed: ${migratedPrograms.length} success, ${errors.length} errors`);

      return {
        migratedPrograms,
        errors,
        migrationLog
      };

    } catch (error) {
      migrationLog.push(`❌ Bulk migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * 遷移 Task Logs 到新的 Log 系統
   */
  private async migrateLogs(
    services: ReturnType<typeof getServices>,
    userId: string,
    programId: string,
    taskId: string,
    interactions: TaskInteraction[],
    migrationLog: string[]
  ): Promise<void> {
    try {
      for (const interaction of interactions) {
        // 根據互動類型創建不同的 log
        if (interaction.type === 'message') {
          await services.logService.logInteraction(
            userId,
            programId,
            taskId,
            'message',
            'chat-interface',
            interaction.data,
            {
              migratedFrom: 'legacy-pbl',
              originalTimestamp: interaction.timestamp
            }
          );
        } else if (interaction.type === 'submission') {
          await services.logService.logSubmission(
            userId,
            programId,
            taskId,
            'task-response',
            interaction.data,
            1
          );
        } else {
          // 一般互動記錄
          await services.logService.logInteraction(
            userId,
            programId,
            taskId,
            interaction.type,
            interaction.element || 'unknown',
            interaction.data,
            {
              migratedFrom: 'legacy-pbl',
              originalTimestamp: interaction.timestamp
            }
          );
        }
      }

      migrationLog.push(`📝 Migrated ${interactions.length} log entries for task ${taskId}`);
    } catch (error) {
      migrationLog.push(`⚠️ Partial log migration failed for task ${taskId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 根據 taskId 推斷 TaskType
   */
  private mapTaskType(taskId: string): TaskType {
    const taskIdLower = taskId.toLowerCase();
    
    if (taskIdLower.includes('analysis') || taskIdLower.includes('analyze')) {
      return TaskType.ANALYSIS;
    } else if (taskIdLower.includes('design') || taskIdLower.includes('create')) {
      return TaskType.DESIGN;
    } else if (taskIdLower.includes('implement') || taskIdLower.includes('build')) {
      return TaskType.IMPLEMENTATION;
    } else if (taskIdLower.includes('evaluate') || taskIdLower.includes('assess')) {
      return TaskType.EVALUATION;
    } else {
      return TaskType.ANALYSIS; // 預設
    }
  }

  /**
   * 從 TaskLog 中提取最終答案
   */
  private extractFinalAnswer(log: TaskLog | null): any {
    if (!log?.interactions || log.interactions.length === 0) {
      return null;
    }

    // 尋找最後一個提交類型的互動
    const submissions = log.interactions.filter(i => i.type === 'submission');
    if (submissions.length > 0) {
      return submissions[submissions.length - 1].data;
    }

    // 尋找最後一個訊息
    const messages = log.interactions.filter(i => i.type === 'message');
    if (messages.length > 0) {
      return messages[messages.length - 1].data;
    }

    return null;
  }

  /**
   * 轉換 TaskEvaluation 到新格式
   */
  private convertEvaluation(evaluation: TaskEvaluation | null): any {
    if (!evaluation) {
      return null;
    }

    return {
      grade: this.scoreToGrade(evaluation.score),
      feedback: evaluation.strengths?.join('; ') || 'Migrated from legacy system',
      rubric: 'Legacy PBL Evaluation',
      strengths: evaluation.strengths || [],
      improvements: evaluation.improvements || [],
      evaluatedAt: new Date(),
      evaluatedBy: 'AI-Legacy'
    };
  }

  /**
   * 分數轉換為等級
   */
  private scoreToGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 檢查程序是否已遷移
   */
  async isProgramMigrated(userEmail: string, scenarioId: string, programId: string): Promise<boolean> {
    await this.ensureInitialized();
    const services = getServices();

    try {
      const tracks = await services.trackService.queryTracks({
        userId: userEmail,
        type: TrackType.PBL
      });

      return tracks.some(track => 
        track.metadata.legacyData?.originalProgramId === programId
      );
    } catch {
      return false;
    }
  }

  /**
   * 創建遷移報告
   */
  async generateMigrationReport(userEmail: string): Promise<{
    totalPrograms: number;
    migratedPrograms: number;
    pendingPrograms: Array<{ scenarioId: string; programId: string; title: string }>;
    summary: string;
  }> {
    try {
      const userPrograms = await pblProgramService.getUserPrograms(userEmail);
      const pendingPrograms: Array<{ scenarioId: string; programId: string; title: string }> = [];
      let migratedCount = 0;

      for (const programSummary of userPrograms) {
        const isMigrated = await this.isProgramMigrated(
          userEmail,
          programSummary.program.scenarioId,
          programSummary.program.id
        );

        if (isMigrated) {
          migratedCount++;
        } else {
          pendingPrograms.push({
            scenarioId: programSummary.program.scenarioId,
            programId: programSummary.program.id,
            title: programSummary.program.scenarioTitle
          });
        }
      }

      const totalPrograms = userPrograms.length;
      const migrationRate = totalPrograms > 0 ? (migratedCount / totalPrograms) * 100 : 0;

      return {
        totalPrograms,
        migratedPrograms: migratedCount,
        pendingPrograms,
        summary: `Migration Status: ${migratedCount}/${totalPrograms} programs migrated (${migrationRate.toFixed(1)}%)`
      };
    } catch (error) {
      throw new Error(`Failed to generate migration report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// 單例導出
export const pblMigrationService = new PBLMigrationService();