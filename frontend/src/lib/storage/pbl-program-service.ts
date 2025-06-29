import { Storage } from '@google-cloud/storage';
import { 
  Program, 
  ProgramMetadata, 
  TaskMetadata, 
  TaskLog, 
  TaskProgress, 
  TaskInteraction,
  ProgramSummary
} from '@/types/pbl';

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
  private getProgramPath(userEmail: string, scenarioId: string, programId: string, timestamp: string): string {
    const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
    return `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}_${timestamp}`;
  }

  /**
   * Get task folder path
   */
  private getTaskPath(programPath: string, taskId: string): string {
    return `${programPath}/task_${taskId}`;
  }

  /**
   * Create a new program
   */
  async createProgram(
    userEmail: string,
    scenarioId: string,
    scenarioTitle: string,
    totalTasks: number,
    language: string = 'en'
  ): Promise<ProgramMetadata> {
    const programId = this.generateProgramId();
    const timestamp = Date.now().toString();
    const now = new Date().toISOString();

    const program: ProgramMetadata = {
      id: programId,
      scenarioId,
      scenarioTitle,
      userId: userEmail,
      userEmail,
      startedAt: now,
      updatedAt: now,
      status: 'in_progress',
      totalTasks,
      completedTasks: 0,
      language
    };

    // Save program metadata
    const programPath = this.getProgramPath(userEmail, scenarioId, programId, timestamp);
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
    try {
      // We need to find the program folder which includes timestamp
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const [files] = await this.bucket.getFiles({
        prefix: `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}`,
      });

      for (const file of files) {
        if (file.name.endsWith('/metadata.json')) {
          const [contents] = await file.download();
          return JSON.parse(contents.toString()) as ProgramMetadata;
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

        // Update program metadata
        await this.incrementCompletedTasks(userEmail, scenarioId, programId);
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
  ): Promise<{ metadata: TaskMetadata | null; log: TaskLog | null; progress: TaskProgress | null }> {
    try {
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const basePath = `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}/task_${taskId}`;
      
      // Directly fetch the specific files instead of listing all files
      const metadataPath = `${basePath}/metadata.json`;
      const logPath = `${basePath}/log.json`;
      const progressPath = `${basePath}/progress.json`;
      
      const result = {
        metadata: null as TaskMetadata | null,
        log: null as TaskLog | null,
        progress: null as TaskProgress | null
      };
      
      // Fetch files in parallel for better performance
      const [metadataResult, logResult, progressResult] = await Promise.allSettled([
        this.bucket.file(metadataPath).download().catch(() => null),
        this.bucket.file(logPath).download().catch(() => null),
        this.bucket.file(progressPath).download().catch(() => null)
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
      
      return result;
    } catch (error) {
      console.error('Error getting task data:', error);
      return { metadata: null, log: null, progress: null };
    }
  }

  /**
   * Increment completed tasks count in program
   */
  private async incrementCompletedTasks(userEmail: string, scenarioId: string, programId: string): Promise<void> {
    const program = await this.getProgram(userEmail, scenarioId, programId);
    if (program) {
      await this.updateProgram(userEmail, scenarioId, programId, {
        completedTasks: program.completedTasks + 1,
        status: program.completedTasks + 1 >= program.totalTasks ? 'completed' : 'in_progress',
        completedAt: program.completedTasks + 1 >= program.totalTasks ? new Date().toISOString() : undefined
      });
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
        completionRate: Math.round((program.completedTasks / program.totalTasks) * 100)
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
    const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
    const evaluationPath = `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}/program_${programId}/task_${taskId}/evaluation.json`;
    
    const file = this.bucket.file(evaluationPath);
    
    // Load existing evaluations (in case there are multiple)
    let evaluations: any[] = [];
    try {
      const [exists] = await file.exists();
      if (exists) {
        const [contents] = await file.download();
        const data = JSON.parse(contents.toString());
        evaluations = Array.isArray(data) ? data : [data];
      }
    } catch (error) {
      console.log('No existing evaluations found');
    }
    
    // Add new evaluation
    evaluations.push({
      ...evaluation,
      createdAt: new Date().toISOString()
    });
    
    // Save updated evaluations
    await file.save(JSON.stringify(evaluations, null, 2), {
      metadata: {
        contentType: 'application/json',
      },
    });
  }

  /**
   * Get all programs for a user and specific scenario (metadata only)
   */
  async getUserProgramsForScenario(userEmail: string, scenarioId: string): Promise<ProgramMetadata[]> {
    try {
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const basePath = `${PBL_BASE_PATH}/${sanitizedEmail}/scenario_${scenarioId}`;
      
      // List only metadata.json files directly
      const [files] = await this.bucket.getFiles({ 
        prefix: basePath,
        autoPaginate: false,
        maxResults: 100  // Limit to reasonable number of programs
      });
      
      // Filter and fetch metadata files in parallel
      const metadataFiles = files.filter(file => 
        file.name.includes('/program_') && 
        file.name.endsWith('/metadata.json') && 
        !file.name.includes('/task_')
      );
      
      // Download metadata in parallel
      const metadataPromises = metadataFiles.map(async (file) => {
        try {
          const [content] = await file.download();
          return JSON.parse(content.toString()) as ProgramMetadata;
        } catch (error) {
          console.error(`Error reading program metadata from ${file.name}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(metadataPromises);
      return results.filter((p): p is ProgramMetadata => p !== null);
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
        const pathMatch = programPath.match(/scenario_([^/]+)\/program_([^_]+)_/);
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