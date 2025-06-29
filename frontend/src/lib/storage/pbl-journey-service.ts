import { Storage } from '@google-cloud/storage';
import { 
  PBLJourney, 
  PBLTaskLog, 
  PBLJourneySummary,
  ConversationTurn,
  ProcessLog,
  StageResult,
  ScenarioProgram,
  Task,
  JourneyStatus
} from '@/types/pbl';

// Initialize GCS client
const storageConfig: {
  projectId?: string;
  keyFilename?: string;
} = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
};

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  storageConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const storage = new Storage(storageConfig);
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ai-square-db';

// Journey-based paths: user_pbl_logs/{email}/{scenarioId}_{timestamp}/
const PBL_BASE_PATH = 'user_pbl_logs';

export class PBLJourneyService {
  private bucket = storage.bucket(BUCKET_NAME);

  /**
   * Generate Journey ID: scenarioId_timestamp
   */
  private generateJourneyId(scenarioId: string): string {
    const timestamp = Date.now();
    return `${scenarioId}_${timestamp}`;
  }

  /**
   * Get journey folder path
   */
  private getJourneyPath(userEmail: string, journeyId: string): string {
    const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
    return `${PBL_BASE_PATH}/${sanitizedEmail}/${journeyId}`;
  }

  /**
   * Get task log file path
   */
  private getTaskLogPath(userEmail: string, journeyId: string, taskId: string): string {
    return `${this.getJourneyPath(userEmail, journeyId)}/${taskId}.json`;
  }

  /**
   * Get journey metadata file path
   */
  private getJourneyMetadataPath(userEmail: string, journeyId: string): string {
    return `${this.getJourneyPath(userEmail, journeyId)}/metadata.json`;
  }

  // === JOURNEY MANAGEMENT ===

  /**
   * Create a new journey
   */
  async createJourney(
    userEmail: string, 
    userId: string, 
    scenario: ScenarioProgram,
    language: string = 'zh-TW'
  ): Promise<PBLJourney> {
    const journeyId = this.generateJourneyId(scenario.id);
    const now = new Date().toISOString();
    
    // Count total tasks
    const totalTasks = scenario.stages.reduce((total, stage) => total + stage.tasks.length, 0);
    
    const journey: PBLJourney = {
      journeyId,
      scenarioId: scenario.id,
      userId,
      userEmail,
      startedAt: now,
      lastActiveAt: now,
      status: 'in_progress',
      language,
      scenarioTitle: scenario.title,
      totalTasks,
      completedTasks: 0,
      taskLogs: {},
      totalTimeSpent: 0
    };

    // Save journey metadata
    const metadataFile = this.bucket.file(this.getJourneyMetadataPath(userEmail, journeyId));
    await metadataFile.save(JSON.stringify(journey, null, 2), {
      metadata: { contentType: 'application/json' }
    });

    console.log(`Created new journey: ${journeyId}`);
    return journey;
  }

  /**
   * Get active journey for a scenario (returns the most recent in-progress journey)
   */
  async getActiveJourney(userEmail: string, scenarioId: string): Promise<PBLJourney | null> {
    try {
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const userPath = `${PBL_BASE_PATH}/${sanitizedEmail}/`;
      
      const [files] = await this.bucket.getFiles({ prefix: userPath });
      
      // Find journey folders for this scenario
      const journeyFolders = files
        .filter(file => file.name.includes(`/${scenarioId}_`) && file.name.endsWith('/metadata.json'))
        .sort((a, b) => b.name.localeCompare(a.name)); // Sort by timestamp (newest first)
      
      for (const metadataFile of journeyFolders) {
        try {
          const [contents] = await metadataFile.download();
          const journey = JSON.parse(contents.toString()) as PBLJourney;
          
          if (journey.status === 'in_progress') {
            // Load all task logs for this journey
            journey.taskLogs = await this.loadJourneyTaskLogs(userEmail, journey.journeyId);
            return journey;
          }
        } catch (parseError) {
          console.error(`Failed to parse journey metadata: ${metadataFile.name}`, parseError);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error getting active journey:', error);
      return null;
    }
  }

  /**
   * Get specific journey by ID
   */
  async getJourney(userEmail: string, journeyId: string): Promise<PBLJourney | null> {
    try {
      const metadataFile = this.bucket.file(this.getJourneyMetadataPath(userEmail, journeyId));
      const [exists] = await metadataFile.exists();
      
      if (!exists) return null;
      
      const [contents] = await metadataFile.download();
      const journey = JSON.parse(contents.toString()) as PBLJourney;
      
      // Load all task logs
      journey.taskLogs = await this.loadJourneyTaskLogs(userEmail, journeyId);
      
      return journey;
    } catch (error) {
      console.error('Error getting journey:', error);
      return null;
    }
  }

  /**
   * Load all task logs for a journey
   */
  private async loadJourneyTaskLogs(userEmail: string, journeyId: string): Promise<Record<string, PBLTaskLog>> {
    try {
      const journeyPath = this.getJourneyPath(userEmail, journeyId);
      const [files] = await this.bucket.getFiles({ prefix: `${journeyPath}/` });
      
      const taskLogs: Record<string, PBLTaskLog> = {};
      
      for (const file of files) {
        if (file.name.endsWith('.json') && !file.name.endsWith('metadata.json')) {
          try {
            const [contents] = await file.download();
            const taskLog = JSON.parse(contents.toString()) as PBLTaskLog;
            taskLogs[taskLog.taskId] = taskLog;
          } catch (parseError) {
            console.error(`Failed to parse task log: ${file.name}`, parseError);
          }
        }
      }
      
      return taskLogs;
    } catch (error) {
      console.error('Error loading journey task logs:', error);
      return {};
    }
  }

  /**
   * Update journey metadata
   */
  async updateJourney(userEmail: string, journey: PBLJourney): Promise<void> {
    try {
      // Calculate completed tasks and overall score
      const taskLogs = Object.values(journey.taskLogs);
      journey.completedTasks = taskLogs.filter(log => log.status === 'completed').length;
      
      const completedWithScores = taskLogs.filter(log => log.analysis?.score !== undefined);
      if (completedWithScores.length > 0) {
        journey.overallScore = Math.round(
          completedWithScores.reduce((sum, log) => sum + (log.analysis?.score || 0), 0) / completedWithScores.length
        );
      }
      
      journey.totalTimeSpent = taskLogs.reduce((total, log) => total + log.timeSpent, 0);
      journey.lastActiveAt = new Date().toISOString();
      
      // Check if journey is completed
      if (journey.completedTasks === journey.totalTasks) {
        journey.status = 'completed';
        journey.completedAt = new Date().toISOString();
      }
      
      const metadataFile = this.bucket.file(this.getJourneyMetadataPath(userEmail, journey.journeyId));
      await metadataFile.save(JSON.stringify(journey, null, 2), {
        metadata: { contentType: 'application/json' }
      });
    } catch (error) {
      console.error('Error updating journey:', error);
      throw error;
    }
  }

  // === TASK LOG MANAGEMENT ===

  /**
   * Get or create task log for a journey
   */
  async getOrCreateTaskLog(
    userEmail: string, 
    journeyId: string, 
    task: Task, 
    stageId: string
  ): Promise<PBLTaskLog> {
    try {
      // Try to get existing task log
      const existingLog = await this.getTaskLog(userEmail, journeyId, task.id);
      if (existingLog) {
        return existingLog;
      }
      
      // Create new task log
      const now = new Date().toISOString();
      const taskLog: PBLTaskLog = {
        taskId: task.id,
        stageId,
        startedAt: now,
        status: 'in_progress',
        conversations: [],
        processLogs: [],
        timeSpent: 0
      };
      
      await this.saveTaskLog(userEmail, journeyId, taskLog);
      return taskLog;
    } catch (error) {
      console.error('Error getting or creating task log:', error);
      throw error;
    }
  }

  /**
   * Get task log
   */
  async getTaskLog(userEmail: string, journeyId: string, taskId: string): Promise<PBLTaskLog | null> {
    try {
      const taskFile = this.bucket.file(this.getTaskLogPath(userEmail, journeyId, taskId));
      const [exists] = await taskFile.exists();
      
      if (!exists) return null;
      
      const [contents] = await taskFile.download();
      return JSON.parse(contents.toString()) as PBLTaskLog;
    } catch (error) {
      console.error('Error getting task log:', error);
      return null;
    }
  }

  /**
   * Save task log
   */
  async saveTaskLog(userEmail: string, journeyId: string, taskLog: PBLTaskLog): Promise<void> {
    try {
      const taskFile = this.bucket.file(this.getTaskLogPath(userEmail, journeyId, taskLog.taskId));
      await taskFile.save(JSON.stringify(taskLog, null, 2), {
        metadata: { contentType: 'application/json' }
      });
    } catch (error) {
      console.error('Error saving task log:', error);
      throw error;
    }
  }

  /**
   * Add conversation to task log
   */
  async addConversation(
    userEmail: string, 
    journeyId: string, 
    taskId: string, 
    conversation: ConversationTurn
  ): Promise<void> {
    try {
      const taskLog = await this.getTaskLog(userEmail, journeyId, taskId);
      if (!taskLog) {
        throw new Error(`Task log not found: ${taskId}`);
      }
      
      taskLog.conversations.push(conversation);
      await this.saveTaskLog(userEmail, journeyId, taskLog);
    } catch (error) {
      console.error('Error adding conversation:', error);
      throw error;
    }
  }

  /**
   * Add process log to task log
   */
  async addProcessLog(
    userEmail: string, 
    journeyId: string, 
    taskId: string, 
    processLog: ProcessLog
  ): Promise<void> {
    try {
      const taskLog = await this.getTaskLog(userEmail, journeyId, taskId);
      if (!taskLog) {
        throw new Error(`Task log not found: ${taskId}`);
      }
      
      taskLog.processLogs.push(processLog);
      await this.saveTaskLog(userEmail, journeyId, taskLog);
    } catch (error) {
      console.error('Error adding process log:', error);
      throw error;
    }
  }

  /**
   * Complete task with analysis
   */
  async completeTask(
    userEmail: string, 
    journeyId: string, 
    taskId: string, 
    analysis: StageResult
  ): Promise<void> {
    try {
      const taskLog = await this.getTaskLog(userEmail, journeyId, taskId);
      if (!taskLog) {
        throw new Error(`Task log not found: ${taskId}`);
      }
      
      taskLog.status = 'completed';
      taskLog.completedAt = new Date().toISOString();
      taskLog.analysis = analysis;
      
      await this.saveTaskLog(userEmail, journeyId, taskLog);
      
      // Update journey metadata
      const journey = await this.getJourney(userEmail, journeyId);
      if (journey) {
        journey.taskLogs[taskId] = taskLog;
        await this.updateJourney(userEmail, journey);
      }
    } catch (error) {
      console.error('Error completing task:', error);
      throw error;
    }
  }

  /**
   * Delete task log (reset task)
   */
  async deleteTaskLog(userEmail: string, journeyId: string, taskId: string): Promise<void> {
    try {
      const taskFile = this.bucket.file(this.getTaskLogPath(userEmail, journeyId, taskId));
      await taskFile.delete();
      
      // Update journey metadata
      const journey = await this.getJourney(userEmail, journeyId);
      if (journey) {
        delete journey.taskLogs[taskId];
        await this.updateJourney(userEmail, journey);
      }
    } catch (error) {
      console.error('Error deleting task log:', error);
      throw error;
    }
  }

  // === HISTORY AND QUERIES ===

  /**
   * Get all journeys for a user
   */
  async getUserJourneys(userEmail: string, scenarioId?: string): Promise<PBLJourneySummary[]> {
    try {
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const userPath = `${PBL_BASE_PATH}/${sanitizedEmail}/`;
      
      const [files] = await this.bucket.getFiles({ prefix: userPath });
      
      const journeys: PBLJourneySummary[] = [];
      
      // Find all metadata files
      const metadataFiles = files.filter(file => file.name.endsWith('/metadata.json'));
      
      for (const metadataFile of metadataFiles) {
        try {
          const [contents] = await metadataFile.download();
          const journey = JSON.parse(contents.toString()) as PBLJourney;
          
          // Filter by scenario if specified
          if (scenarioId && journey.scenarioId !== scenarioId) {
            continue;
          }
          
          // Load task logs to get current scores
          const taskLogs = await this.loadJourneyTaskLogs(userEmail, journey.journeyId);
          
          const summary: PBLJourneySummary = {
            journeyId: journey.journeyId,
            scenarioId: journey.scenarioId,
            scenarioTitle: journey.scenarioTitle,
            startedAt: journey.startedAt,
            completedAt: journey.completedAt,
            status: journey.status,
            progress: {
              completedTasks: Object.values(taskLogs).filter(log => log.status === 'completed').length,
              totalTasks: journey.totalTasks,
              percentage: Math.round((Object.values(taskLogs).filter(log => log.status === 'completed').length / journey.totalTasks) * 100)
            },
            scores: {
              overallScore: journey.overallScore,
              taskScores: Object.values(taskLogs).map(log => ({
                taskId: log.taskId,
                taskTitle: log.taskId, // TODO: Get actual task title from scenario
                score: log.analysis?.score
              }))
            },
            timeSpent: Object.values(taskLogs).reduce((total, log) => total + log.timeSpent, 0)
          };
          
          journeys.push(summary);
        } catch (parseError) {
          console.error(`Failed to parse journey: ${metadataFile.name}`, parseError);
        }
      }
      
      // Sort by startedAt (newest first)
      return journeys.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    } catch (error) {
      console.error('Error getting user journeys:', error);
      return [];
    }
  }

  /**
   * Delete entire journey
   */
  async deleteJourney(userEmail: string, journeyId: string): Promise<void> {
    try {
      const journeyPath = this.getJourneyPath(userEmail, journeyId);
      const [files] = await this.bucket.getFiles({ prefix: `${journeyPath}/` });
      
      // Delete all files in the journey folder
      await Promise.all(files.map(file => file.delete()));
      
      console.log(`Deleted journey: ${journeyId}`);
    } catch (error) {
      console.error('Error deleting journey:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const pblJourneyService = new PBLJourneyService();