import { Storage } from '@google-cloud/storage';
import { 
  Program, 
  ProgramMetadata, 
  TaskMetadata, 
  TaskLog, 
  TaskProgress, 
  TaskInteraction,
  ProgramSummary,
  ProgramStatus
} from '@/types/pbl';
import { cacheService } from '@/lib/cache/cache-service';

// Initialize GCS client
const storageConfig: {
  projectId?: string;
  keyFilename?: string;
} = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
};

// Only use key file in local development
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  storageConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const storage = new Storage(storageConfig);
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ai-square-db';

// Base path for PBL data
const PBL_BASE_PATH = 'user_pbl_logs';

class PBLProgramService {
  private bucket = storage.bucket(BUCKET_NAME);

  /**
   * Generate program ID
   */
  generateProgramId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `prog_${timestamp}_${random}`;
  }

  /**
   * Get program folder path
   */
  private getProgramPath(userEmail: string, scenarioId: string, programId: string): string {
    const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
    return `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}`;
  }

  /**
   * Get task folder path
   */
  private getTaskPath(programPath: string, taskId: string): string {
    return `${programPath}/task_${taskId}`;
  }

  /**
   * Find existing draft program for user and scenario
   */
  async findUserDraftProgram(userEmail: string, scenarioId: string): Promise<ProgramMetadata | null> {
    try {
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const basePath = `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}`;
      
      const [files] = await this.bucket.getFiles({ 
        prefix: basePath,
        autoPaginate: false,
        maxResults: 50
      });
      
      // Find metadata files (not in task folders)
      const metadataFiles = files.filter(file => 
        file.name.includes('/program_') && 
        file.name.endsWith('/metadata.json') &&
        !file.name.includes('/task_')
      );
      
      // Check each program to find drafts
      for (const file of metadataFiles) {
        try {
          const [content] = await file.download();
          const metadata = JSON.parse(content.toString()) as ProgramMetadata;
          
          if (metadata.status === 'draft') {
            return metadata;
          }
        } catch (error) {
          console.error(`Error reading metadata from ${file.name}:`, error);
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding draft program:', error);
      return null;
    }
  }

  /**
   * Create a new program
   */
  async createProgram(
    userEmail: string,
    scenarioId: string,
    scenarioTitle: string,
    totalTasks: number,
    language: string = 'en',
    status: ProgramStatus = 'in_progress'
  ): Promise<ProgramMetadata> {
    const programId = this.generateProgramId();
    const now = new Date().toISOString();

    const program: ProgramMetadata = {
      id: programId,
      scenarioId,
      scenarioTitle,
      userId: userEmail,
      userEmail,
      startedAt: now,
      updatedAt: now,
      status,
      totalTasks,
      language
    };

    // Save program metadata
    const programPath = this.getProgramPath(userEmail, scenarioId, programId);
    const metadataFile = this.bucket.file(`${programPath}/metadata.json`);
    
    await metadataFile.save(JSON.stringify(program, null, 2), {
      metadata: {
        contentType: 'application/json',
      },
    });

    return program;
  }

  /**
   * Get program metadata
   */
  async getProgram(userEmail: string, scenarioId: string, programId: string): Promise<ProgramMetadata | null> {
    const cacheKey = `pbl:program:${userEmail}:${scenarioId}:${programId}`;
    
    try {
      // Try cache first
      const cached = await cacheService.get<ProgramMetadata>(cacheKey);
      if (cached) {
        return cached;
      }

      // We need to find the program folder which includes timestamp
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const [files] = await this.bucket.getFiles({
        prefix: `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}`,
      });

      for (const file of files) {
        if (file.name.endsWith('/metadata.json')) {
          const [contents] = await file.download();
          const metadata = JSON.parse(contents.toString()) as ProgramMetadata;
          
          // Cache for 5 minutes
          await cacheService.set(cacheKey, metadata, { ttl: 5 * 60 * 1000 });
          
          return metadata;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting program:', error);
      return null;
    }
  }

  /**
   * Update program metadata
   */
  async updateProgram(userEmail: string, scenarioId: string, programId: string, updates: Partial<ProgramMetadata>): Promise<ProgramMetadata | null> {
    try {
      const program = await this.getProgram(userEmail, scenarioId, programId);
      if (!program) return null;

      const updated = {
        ...program,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      // Invalidate related caches
      const cacheKey = `pbl:program:${userEmail}:${scenarioId}:${programId}`;
      await cacheService.delete(cacheKey);

      // Find the program folder
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const [files] = await this.bucket.getFiles({
        prefix: `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}`,
      });

      for (const file of files) {
        if (file.name.endsWith('/metadata.json')) {
          await file.save(JSON.stringify(updated, null, 2), {
            metadata: {
              contentType: 'application/json',
            },
          });
          return updated;
        }
      }

      return null;
    } catch (error) {
      console.error('Error updating program:', error);
      return null;
    }
  }

  /**
   * Initialize task folder
   */
  async initializeTask(
    userEmail: string,
    scenarioId: string,
    programId: string,
    taskId: string,
    taskTitle: string
  ): Promise<TaskMetadata> {
    const now = new Date().toISOString();
    
    const metadata: TaskMetadata = {
      taskId,
      programId,
      title: taskTitle,
      startedAt: now,
      updatedAt: now,
      status: 'in_progress',
      attempts: 1
    };

    const log: TaskLog = {
      taskId,
      programId,
      interactions: [],
      totalInteractions: 0
    };

    const progress: TaskProgress = {
      taskId,
      programId,
      status: 'in_progress',
      startedAt: now,
      timeSpentSeconds: 0
    };

    // Find program folder
    const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
    const [files] = await this.bucket.getFiles({
      prefix: `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}`,
      maxResults: 1
    });

    if (files.length === 0) {
      throw new Error('Program folder not found');
    }

    const programPath = files[0].name.substring(0, files[0].name.lastIndexOf('/'));
    const taskPath = this.getTaskPath(programPath, taskId);

    // Save all task files
    await Promise.all([
      this.bucket.file(`${taskPath}/metadata.json`).save(JSON.stringify(metadata, null, 2)),
      this.bucket.file(`${taskPath}/log.json`).save(JSON.stringify(log, null, 2)),
      this.bucket.file(`${taskPath}/progress.json`).save(JSON.stringify(progress, null, 2))
    ]);

    return metadata;
  }

  /**
   * Add interaction to task log
   */
  async addTaskInteraction(
    userEmail: string,
    scenarioId: string,
    programId: string,
    taskId: string,
    interaction: TaskInteraction
  ): Promise<void> {
    try {
      // Find task log file
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const [files] = await this.bucket.getFiles({
        prefix: `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}`,
      });

      let logFile = null;
      for (const file of files) {
        if (file.name.endsWith(`/task_${taskId}/log.json`)) {
          logFile = file;
          break;
        }
      }

      if (!logFile) {
        throw new Error('Task log file not found');
      }

      // Read existing log
      const [contents] = await logFile.download();
      const log = JSON.parse(contents.toString()) as TaskLog;

      // Add new interaction
      log.interactions.push(interaction);
      log.totalInteractions++;
      log.lastInteractionAt = interaction.timestamp;

      // Save updated log
      await logFile.save(JSON.stringify(log, null, 2));
    } catch (error) {
      console.error('Error adding task interaction:', error);
      throw error;
    }
  }

  /**
   * Update task progress
   */
  async updateTaskProgress(
    userEmail: string,
    scenarioId: string,
    programId: string,
    taskId: string,
    updates: Partial<TaskProgress>
  ): Promise<void> {
    try {
      // Find task progress file
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const [files] = await this.bucket.getFiles({
        prefix: `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}`,
      });

      let progressFile = null;
      let metadataFile = null;
      
      for (const file of files) {
        if (file.name.endsWith(`/task_${taskId}/progress.json`)) {
          progressFile = file;
        } else if (file.name.endsWith(`/task_${taskId}/metadata.json`)) {
          metadataFile = file;
        }
      }

      if (!progressFile || !metadataFile) {
        throw new Error('Task files not found');
      }

      // Update progress
      const [progressContents] = await progressFile.download();
      const progress = JSON.parse(progressContents.toString()) as TaskProgress;
      const updatedProgress = { ...progress, ...updates };
      await progressFile.save(JSON.stringify(updatedProgress, null, 2));

      // Update metadata if task is completed
      if (updates.status === 'completed') {
        const [metadataContents] = await metadataFile.download();
        const metadata = JSON.parse(metadataContents.toString()) as TaskMetadata;
        metadata.status = 'completed';
        metadata.completedAt = updates.completedAt || new Date().toISOString();
        metadata.updatedAt = new Date().toISOString();
        await metadataFile.save(JSON.stringify(metadata, null, 2));

        // Check and update program completion status
        await this.checkProgramCompletion(userEmail, scenarioId, programId);
        
        // Update program completion data
        await this.updateProgramCompletion(userEmail, scenarioId, programId);
      }
    } catch (error) {
      console.error('Error updating task progress:', error);
      throw error;
    }
  }

  /**
   * Get task data (metadata, log, progress)
   */
  async getTaskData(
    userEmail: string,
    scenarioId: string,
    programId: string,
    taskId: string
  ): Promise<{ metadata: TaskMetadata | null; log: TaskLog | null; progress: TaskProgress | null; evaluation?: any }> {
    const cacheKey = `pbl:task:${userEmail}:${scenarioId}:${programId}:${taskId}`;
    
    try {
      // Try cache first for metadata and progress (not log as it changes frequently)
      const cached = await cacheService.get<any>(cacheKey);
      if (cached && cached.metadata && cached.progress) {
        // Still fetch fresh log data
        const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
        const logPath = `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}/task_${taskId}/log.json`;
        
        try {
          const [logContents] = await this.bucket.file(logPath).download();
          cached.log = JSON.parse(logContents.toString());
        } catch {
          cached.log = null;
        }
        
        return cached;
      }

      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const basePath = `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}/task_${taskId}`;
      
      // Directly fetch the specific files instead of listing all files
      const metadataPath = `${basePath}/metadata.json`;
      const logPath = `${basePath}/log.json`;
      const progressPath = `${basePath}/progress.json`;
      const evaluationPath = `${basePath}/evaluation.json`;
      
      const result = {
        metadata: null as TaskMetadata | null,
        log: null as TaskLog | null,
        progress: null as TaskProgress | null,
        evaluation: null as any
      };
      
      // Fetch files in parallel for better performance
      const [metadataResult, logResult, progressResult, evaluationResult] = await Promise.allSettled([
        this.bucket.file(metadataPath).download().catch(() => null),
        this.bucket.file(logPath).download().catch(() => null),
        this.bucket.file(progressPath).download().catch(() => null),
        this.bucket.file(evaluationPath).download().catch(() => null)
      ]);
      
      if (metadataResult.status === 'fulfilled' && metadataResult.value) {
        const [contents] = metadataResult.value;
        result.metadata = JSON.parse(contents.toString());
      }
      
      if (logResult.status === 'fulfilled' && logResult.value) {
        const [contents] = logResult.value;
        result.log = JSON.parse(contents.toString());
      }
      
      if (progressResult.status === 'fulfilled' && progressResult.value) {
        const [contents] = progressResult.value;
        result.progress = JSON.parse(contents.toString());
      }
      
      if (evaluationResult.status === 'fulfilled' && evaluationResult.value) {
        const [contents] = evaluationResult.value;
        result.evaluation = JSON.parse(contents.toString());
      }
      
      // Cache metadata and progress (but not log as it changes frequently)
      if (result.metadata && result.progress) {
        await cacheService.set(cacheKey, {
          metadata: result.metadata,
          progress: result.progress,
          evaluation: result.evaluation
        }, { ttl: 2 * 60 * 1000 }); // 2 minutes cache
      }
      
      return result;
    } catch (error) {
      console.error('Error getting task data:', error);
      return { metadata: null, log: null, progress: null, evaluation: null };
    }
  }

  /**
   * Check and update program completion status
   */
  private async checkProgramCompletion(userEmail: string, scenarioId: string, programId: string): Promise<void> {
    // Get completion data to check evaluated tasks
    const completionData = await this.getProgramCompletion(userEmail, scenarioId, programId);
    if (completionData) {
      const isCompleted = completionData.evaluatedTasks >= completionData.totalTasks;
      await this.updateProgram(userEmail, scenarioId, programId, {
        status: isCompleted ? 'completed' : 'in_progress',
        completedAt: isCompleted ? new Date().toISOString() : undefined
      });
    } else {
      // If no completion data yet, check by counting evaluated tasks
      const program = await this.getProgram(userEmail, scenarioId, programId);
      if (program) {
        const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
        const [files] = await this.bucket.getFiles({
          prefix: `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}/task_`,
        });
        
        let evaluatedCount = 0;
        for (const file of files) {
          if (file.name.endsWith('/evaluation.json')) {
            evaluatedCount++;
          }
        }
        
        if (evaluatedCount >= program.totalTasks) {
          await this.updateProgram(userEmail, scenarioId, programId, {
            status: 'completed',
            completedAt: new Date().toISOString()
          });
        }
      }
    }
  }

  /**
   * Get program summary (for history and complete pages)
   */
  async getProgramSummary(userEmail: string, scenarioId: string, programId: string): Promise<ProgramSummary | null> {
    try {
      const program = await this.getProgram(userEmail, scenarioId, programId);
      if (!program) return null;

      // Get all task data
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const [files] = await this.bucket.getFiles({
        prefix: `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}`,
      });

      const tasks: ProgramSummary['tasks'] = [];
      const taskMap = new Map<string, any>();

      // Group files by task
      for (const file of files) {
        const match = file.name.match(/task_([^/]+)\/(metadata|log|progress)\.json$/);
        if (match) {
          const [, taskId, fileType] = match;
          if (!taskMap.has(taskId)) {
            taskMap.set(taskId, {});
          }
          
          const [contents] = await file.download();
          taskMap.get(taskId)[fileType] = JSON.parse(contents.toString());
        }
      }

      // Build task summaries
      let totalTimeSeconds = 0;
      let totalScore = 0;
      let scoredTasks = 0;
      const domainScores: Record<string, { total: number; count: number }> = {};

      for (const [taskId, data] of taskMap) {
        if (data.metadata && data.progress && data.log) {
          tasks.push({
            metadata: data.metadata,
            progress: data.progress,
            interactionCount: data.log.totalInteractions
          });

          totalTimeSeconds += data.progress.timeSpentSeconds || 0;
          
          if (data.progress.score !== undefined) {
            totalScore += data.progress.score;
            scoredTasks++;
          }

          // Aggregate domain scores from KSA scores
          if (data.progress.ksaScores) {
            for (const [ksa, score] of Object.entries(data.progress.ksaScores)) {
              // Map KSA to domain (simplified logic)
              let domain = 'engaging_with_ai';
              if (ksa.startsWith('K2') || ksa.startsWith('S2')) domain = 'creating_with_ai';
              else if (ksa.startsWith('K3') || ksa.startsWith('S3')) domain = 'managing_with_ai';
              else if (ksa.startsWith('K4') || ksa.startsWith('S4')) domain = 'designing_with_ai';

              if (!domainScores[domain]) {
                domainScores[domain] = { total: 0, count: 0 };
              }
              domainScores[domain].total += score as number;
              domainScores[domain].count++;
            }
          }
        }
      }

      // Calculate final scores
      const overallScore = scoredTasks > 0 ? Math.round(totalScore / scoredTasks) : undefined;
      const finalDomainScores: Record<string, number> = {};
      
      for (const [domain, data] of Object.entries(domainScores)) {
        if (data.count > 0) {
          finalDomainScores[domain] = Math.round(data.total / data.count);
        }
      }

      return {
        program,
        tasks: tasks.sort((a, b) => a.metadata.taskId.localeCompare(b.metadata.taskId)),
        overallScore,
        domainScores: Object.keys(finalDomainScores).length > 0 ? finalDomainScores as any : undefined,
        totalTimeSeconds,
        completionRate: Math.round((tasks.filter(t => t.progress.status === 'completed').length / program.totalTasks) * 100)
      };
    } catch (error) {
      console.error('Error getting program summary:', error);
      return null;
    }
  }

  /**
   * Save task evaluation results
   */
  async saveTaskEvaluation(
    userEmail: string,
    scenarioId: string,
    programId: string,
    taskId: string,
    evaluation: any
  ): Promise<void> {
    // Invalidate task cache
    const taskCacheKey = `pbl:task:${userEmail}:${scenarioId}:${programId}:${taskId}`;
    await cacheService.delete(taskCacheKey);
    
    const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
    const evaluationPath = `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}/task_${taskId}/evaluation.json`;
    
    const file = this.bucket.file(evaluationPath);
    
    // Save only the latest evaluation (overwrite existing)
    const evaluationData = {
      ...evaluation,
      createdAt: new Date().toISOString()
    };
    
    // Save evaluation (overwrites existing file)
    await file.save(JSON.stringify(evaluationData, null, 2), {
      metadata: {
        contentType: 'application/json',
      },
    });
    
    // Check if task is already completed before updating
    const taskData = await this.getTaskData(userEmail, scenarioId, programId, taskId);
    if (taskData.progress && taskData.progress.status !== 'completed') {
      // Update task progress to completed
      await this.updateTaskProgress(
        userEmail,
        scenarioId,
        programId,
        taskId,
        {
          status: 'completed',
          completedAt: new Date().toISOString()
        }
      );
    } else {
      // If already completed, just update program completion data
      await this.updateProgramCompletion(userEmail, scenarioId, programId);
    }
  }

  /**
   * Update program completion data
   */
  async updateProgramCompletion(
    userEmail: string,
    scenarioId: string,
    programId: string
  ): Promise<void> {
    try {
      // Invalidate related caches
      const completionCacheKey = `pbl:completion:${userEmail}:${scenarioId}:${programId}`;
      const userProgramsCacheKey = `pbl:user-programs:${userEmail}:${scenarioId}`;
      await Promise.all([
        cacheService.delete(completionCacheKey),
        cacheService.delete(userProgramsCacheKey)
      ]);
      
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const basePath = `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}`;
      
      // Get program metadata
      const program = await this.getProgram(userEmail, scenarioId, programId);
      if (!program) return;
      
      // Get all tasks data
      const [files] = await this.bucket.getFiles({ 
        prefix: `${basePath}/task_`,
        autoPaginate: false 
      });
      
      // Extract unique task IDs
      const taskIds = new Set<string>();
      files.forEach(file => {
        const match = file.name.match(/task_([^/]+)\//);
        if (match) taskIds.add(match[1]);
      });
      
      // Collect task data
      const tasks: any[] = [];
      let totalScore = 0;
      let evaluatedTasks = 0;
      const domainScores: Record<string, number[]> = {
        engaging_with_ai: [],
        creating_with_ai: [],
        managing_with_ai: [],
        designing_with_ai: []
      };
      const ksaScores = {
        knowledge: [] as number[],
        skills: [] as number[],
        attitudes: [] as number[]
      };
      let totalTimeSeconds = 0;
      
      for (const taskId of taskIds) {
        const taskData = await this.getTaskData(userEmail, scenarioId, programId, taskId);
        
        const taskInfo: any = {
          taskId,
          metadata: taskData.metadata,
          log: taskData.log,
          progress: taskData.progress,
          evaluation: taskData.evaluation
        };
        
        // Calculate time spent from log interactions
        if (taskData.log?.interactions && taskData.log.interactions.length > 0) {
          const firstInteraction = taskData.log.interactions[0];
          const lastInteraction = taskData.log.interactions[taskData.log.interactions.length - 1];
          const timeSpent = new Date(lastInteraction.timestamp).getTime() - new Date(firstInteraction.timestamp).getTime();
          totalTimeSeconds += Math.floor(timeSpent / 1000);
        }
        
        // If task has evaluation
        if (taskData.evaluation) {
          totalScore += taskData.evaluation.score;
          evaluatedTasks++;
          
          // Collect domain scores
          if (taskData.evaluation.domainScores) {
            Object.entries(taskData.evaluation.domainScores).forEach(([domain, score]) => {
              if (domainScores[domain]) {
                domainScores[domain].push(score as number);
              }
            });
          }
          
          // Collect KSA scores
          if (taskData.evaluation.ksaScores) {
            ksaScores.knowledge.push(taskData.evaluation.ksaScores.knowledge);
            ksaScores.skills.push(taskData.evaluation.ksaScores.skills);
            ksaScores.attitudes.push(taskData.evaluation.ksaScores.attitudes);
          }
        }
        
        tasks.push(taskInfo);
      }
      
      // Calculate averages
      const avgScore = evaluatedTasks > 0 ? Math.round(totalScore / evaluatedTasks) : 0;
      const avgDomainScores: Record<string, number> = {};
      Object.entries(domainScores).forEach(([domain, scores]) => {
        avgDomainScores[domain] = scores.length > 0 
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;
      });
      
      const avgKsaScores = {
        knowledge: ksaScores.knowledge.length > 0 
          ? Math.round(ksaScores.knowledge.reduce((a, b) => a + b, 0) / ksaScores.knowledge.length)
          : 0,
        skills: ksaScores.skills.length > 0
          ? Math.round(ksaScores.skills.reduce((a, b) => a + b, 0) / ksaScores.skills.length)
          : 0,
        attitudes: ksaScores.attitudes.length > 0
          ? Math.round(ksaScores.attitudes.reduce((a, b) => a + b, 0) / ksaScores.attitudes.length)
          : 0
      };
      
      // Create completion data
      const completionData = {
        programId,
        scenarioId,
        userEmail,
        status: evaluatedTasks >= program.totalTasks ? 'completed' : 'in_progress',
        startedAt: program.startedAt,
        updatedAt: new Date().toISOString(),
        completedAt: evaluatedTasks >= program.totalTasks ? new Date().toISOString() : program.completedAt,
        totalTasks: program.totalTasks,
        evaluatedTasks,
        overallScore: avgScore,
        domainScores: avgDomainScores,
        ksaScores: avgKsaScores,
        totalTimeSeconds,
        tasks
      };
      
      // Save completion data
      const completionPath = `${basePath}/completion.json`;
      const file = this.bucket.file(completionPath);
      await file.save(JSON.stringify(completionData, null, 2), {
        metadata: {
          contentType: 'application/json',
        },
      });
      
    } catch (error) {
      console.error('Error updating program completion:', error);
    }
  }

  /**
   * Get program completion data
   */
  async getProgramCompletion(
    userEmail: string,
    scenarioId: string,
    programId: string
  ): Promise<any | null> {
    const cacheKey = `pbl:completion:${userEmail}:${scenarioId}:${programId}`;
    
    try {
      // Try cache first
      const cached = await cacheService.get<any>(cacheKey);
      if (cached) {
        return cached;
      }
      
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const completionPath = `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}/completion.json`;
      
      const file = this.bucket.file(completionPath);
      const [exists] = await file.exists();
      
      if (!exists) {
        return null;
      }
      
      const [contents] = await file.download();
      const completionData = JSON.parse(contents.toString());
      
      // Cache for 3 minutes
      await cacheService.set(cacheKey, completionData, { ttl: 3 * 60 * 1000 });
      
      return completionData;
    } catch (error) {
      console.error('Error getting program completion:', error);
      return null;
    }
  }

  /**
   * Update program completion with qualitative feedback
   */
  async updateProgramCompletionFeedback(
    userEmail: string,
    scenarioId: string,
    programId: string,
    feedback: any,
    language: string = 'en'
  ): Promise<void> {
    try {
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const completionPath = `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}/completion.json`;
      
      const file = this.bucket.file(completionPath);
      const [exists] = await file.exists();
      
      if (exists) {
        const [contents] = await file.download();
        const completionData = JSON.parse(contents.toString());
        
        // Initialize qualitativeFeedback as object if it's old format or doesn't exist
        if (!completionData.qualitativeFeedback || 
            (typeof completionData.qualitativeFeedback === 'object' && 
             completionData.qualitativeFeedback.overallAssessment)) {
          // Convert old format to new multi-language format
          const oldFeedback = completionData.qualitativeFeedback;
          const oldLang = completionData.feedbackLanguage || 'en';
          
          completionData.qualitativeFeedback = {};
          if (oldFeedback) {
            completionData.qualitativeFeedback[oldLang] = oldFeedback;
          }
        }
        
        // Update with new language feedback
        completionData.qualitativeFeedback[language] = feedback;
        completionData.feedbackLanguages = Object.keys(completionData.qualitativeFeedback);
        completionData.feedbackGeneratedAt = new Date().toISOString();
        completionData.lastFeedbackLanguage = language;
        
        // Save updated data
        await file.save(JSON.stringify(completionData, null, 2), {
          metadata: {
            contentType: 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Error updating completion feedback:', error);
      throw error;
    }
  }

  /**
   * Get all programs for a user and specific scenario (using completion data)
   */
  async getUserProgramsForScenario(userEmail: string, scenarioId: string): Promise<any[]> {
    const cacheKey = `pbl:user-programs:${userEmail}:${scenarioId}`;
    
    try {
      // Try cache first
      const cached = await cacheService.get<any[]>(cacheKey);
      if (cached) {
        return cached;
      }
      
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const basePath = `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}`;
      
      // List all files
      const [files] = await this.bucket.getFiles({ 
        prefix: basePath,
        autoPaginate: false,
        maxResults: 100
      });
      
      // Find all program folders
      const programFolders = new Set<string>();
      files.forEach(file => {
        const match = file.name.match(/\/program_([^\/]+)\//);
        if (match) {
          programFolders.add(match[0]);
        }
      });
      
      console.log(`Found ${programFolders.size} program folders for user ${userEmail} in scenario ${scenarioId}`);
      
      // Process each program folder
      const programPromises = Array.from(programFolders).map(async (programFolder) => {
        try {
          // Check if completion.json exists
          const completionFile = files.find(f => 
            f.name.includes(programFolder) && 
            f.name.endsWith('/completion.json')
          );
          
          if (completionFile) {
            // Use completion data
            const [content] = await completionFile.download();
            return JSON.parse(content.toString());
          } else {
            // Fall back to metadata.json
            const metadataFile = files.find(f => 
              f.name.includes(programFolder) && 
              f.name.endsWith('/metadata.json') &&
              !f.name.includes('/task_')
            );
            
            if (metadataFile) {
              const [content] = await metadataFile.download();
              const metadata = JSON.parse(content.toString()) as ProgramMetadata;
              
              // Skip draft programs - they should not appear in user's program list
              if (metadata.status === 'draft') {
                return null;
              }
              
              // Create basic completion data from metadata
              return {
                programId: metadata.id,
                scenarioId: metadata.scenarioId,
                userEmail: metadata.userEmail,
                status: metadata.status,
                startedAt: metadata.startedAt,
                updatedAt: metadata.updatedAt,
                completedAt: metadata.completedAt,
                totalTasks: metadata.totalTasks,
                evaluatedTasks: 0,
                overallScore: 0,
                domainScores: {},
                ksaScores: {},
                totalTimeSeconds: 0,
                taskSummaries: []
              };
            }
          }
          
          return null;
        } catch (error) {
          console.error(`Error reading program data from ${programFolder}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(programPromises);
      const programs = results.filter(p => p !== null);
      
      // Cache for 2 minutes
      await cacheService.set(cacheKey, programs, { ttl: 2 * 60 * 1000 });
      
      return programs;
    } catch (error) {
      console.error('Error getting user programs for scenario:', error);
      return [];
    }
  }

  /**
   * Get all programs for a user
   */
  async getUserPrograms(userEmail: string, scenarioId?: string): Promise<ProgramSummary[]> {
    try {
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const prefix = scenarioId 
        ? `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/`
        : `${PBL_BASE_PATH}/${sanitizedEmail}/`;

      const [files] = await this.bucket.getFiles({ prefix });

      // Find all program metadata files
      const programPaths = new Set<string>();
      for (const file of files) {
        if (file.name.endsWith('/metadata.json') && file.name.includes('/program_')) {
          const programPath = file.name.substring(0, file.name.lastIndexOf('/'));
          programPaths.add(programPath);
        }
      }

      // Get summaries for each program
      const summaries: ProgramSummary[] = [];
      
      for (const programPath of programPaths) {
        // Extract scenario and program IDs from path
        const pathMatch = programPath.match(/scenario_([^/]+)\/program_([^/]+)/);
        if (pathMatch) {
          const [, extractedScenarioId, programId] = pathMatch;
          const summary = await this.getProgramSummary(userEmail, extractedScenarioId, programId);
          if (summary) {
            summaries.push(summary);
          }
        }
      }

      // Sort by most recent first
      return summaries.sort((a, b) => 
        new Date(b.program.startedAt).getTime() - new Date(a.program.startedAt).getTime()
      );
    } catch (error) {
      console.error('Error getting user programs:', error);
      return [];
    }
  }
}

// Export singleton instance
export const pblProgramService = new PBLProgramService();