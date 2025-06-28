import { Storage } from '@google-cloud/storage';
import { SessionData, SessionMetadata, ProgressData, ProcessLog, StageResult } from '@/types/pbl';

// Initialize GCS client
const storageConfig: {
  projectId?: string;
  keyFilename?: string;
} = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
};

// 只在本地開發時使用金鑰檔案
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  storageConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const storage = new Storage(storageConfig);
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'ai-square-db';

// PBL specific paths
// Static data (scenarios) are in frontend/public/pbl_data/
// User logs are in GCS under user_pbl_logs/{email}/pbl_{timestamp}_{random}.json
// Where {email} is sanitized (@ and . replaced with _)
const PBL_BASE_PATH = 'user_pbl_logs';

// Interface for PBL log file structure (simplified task-based)
export interface PBLLogData {
  // Core identifiers
  session_id: string;
  scenario_id: string;
  stage_id: string;
  task_id: string;
  
  // Status and language
  status: 'in_progress' | 'completed' | 'paused';
  language: string;
  
  // Progress tracking
  progress: {
    score?: number; // Task analysis score
    conversation_count: number; // Number of user-AI exchanges
    total_time_seconds: number; // Total time spent on task
    completed_at?: string; // Completion timestamp
  };
  
  // Complete session data (source of truth for user info, timestamps, etc.)
  session_data: SessionData;
}

// Learning log interface for history API
export interface LearningLog {
  sessionId: string;
  logId: string;
  scenario: {
    id: string;
    title: string;
    stages: Array<Record<string, unknown>>;
  };
  metadata: {
    startTime: string;
    endTime?: string;
    status: 'in_progress' | 'completed' | 'paused';
    userId: string;
    language: string;
  };
  progress: {
    stageProgress: Array<{
      stageId: string;
      status: string;
      completedAt?: string;
      score?: number;
    }>;
  };
  evaluations: Array<{
    score: number;
    feedback?: string;
  }>;
  processLogs?: ProcessLog[];
  stageResults?: StageResult[];
  session_data?: SessionData;
}

export class PBLGCSService {
  private bucket = storage.bucket(BUCKET_NAME);

  /**
   * Generate PBL log filename
   * Format: pbl_{timestamp}_{random} or pbl_{scenarioId}_stage_{stageId}_task_{taskId}_{timestamp}_{random}
   */
  private generateLogFilename(scenarioId?: string, stageId?: string, taskId?: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 12);
    
    if (scenarioId !== undefined && stageId !== undefined && taskId !== undefined) {
      // Include stage and task info in filename for better organization and querying
      return `pbl_${scenarioId}_stage_${stageId}_task_${taskId}_${timestamp}_${random}`;
    }
    
    return `pbl_${timestamp}_${random}`;
  }

  /**
   * Get log file path with email folder structure
   */
  private getLogPath(logId: string, userEmail?: string): string {
    if (userEmail) {
      // Sanitize email for folder name (replace @ and . with _)
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      return `${PBL_BASE_PATH}/${sanitizedEmail}/${logId}.json`;
    }
    // Fallback to old structure for backward compatibility
    return `${PBL_BASE_PATH}/${logId}.json`;
  }

  // === Session Management ===
  
  /**
   * Save complete session data to GCS (simplified format)
   */
  async saveSession(sessionId: string, sessionData: SessionData, logId?: string): Promise<string> {
    // Extract IDs from session data
    const stageId = sessionData.currentStageId || `stage-${sessionData.currentStage + 1}`;
    const taskId = sessionData.currentTaskId || `task-${sessionData.currentStage + 1}-${sessionData.currentTaskIndex + 1}`;
    
    // Use existing logId or generate new one
    const pblLogId = logId || this.generateLogFilename(
      sessionData.scenarioId, 
      stageId,
      taskId
    );
    
    // Calculate conversation count from processLogs (user messages only)
    const conversationCount = sessionData.processLogs?.filter(
      log => log.actionType === 'write' || (log.actionType === 'interaction' && log.detail?.userInput)
    ).length || 0;
    
    // Calculate total time
    const startTime = new Date(sessionData.startedAt).getTime();
    const currentTime = new Date().getTime();
    const totalTimeSeconds = Math.floor((currentTime - startTime) / 1000);
    
    // Get task score from stage results
    const taskResult = sessionData.stageResults.find(
      result => result.stageId === stageId && result.taskId === taskId
    );
    
    // Create simplified log data
    const logData: PBLLogData = {
      // Core identifiers
      session_id: sessionId,
      scenario_id: sessionData.scenarioId,
      stage_id: stageId,
      task_id: taskId,
      
      // Status and language
      status: sessionData.status === 'not_started' ? 'in_progress' : sessionData.status,
      language: 'zh-TW', // TODO: get from session context
      
      // Progress tracking
      progress: {
        score: taskResult?.score,
        conversation_count: conversationCount,
        total_time_seconds: totalTimeSeconds,
        completed_at: sessionData.status === 'completed' ? new Date().toISOString() : undefined
      },
      
      // Complete session data (source of truth)
      session_data: sessionData
    };

    // Save to GCS with email folder structure
    const file = this.bucket.file(this.getLogPath(pblLogId, sessionData.userEmail));
    await file.save(JSON.stringify(logData, null, 2), {
      metadata: {
        contentType: 'application/json',
      },
    });

    return pblLogId;
  }

  /**
   * Get session by logId (searches across all email folders)
   */
  async getSessionByLogId(logId: string, userEmail?: string): Promise<SessionData | null> {
    try {
      // Try with email folder first if provided
      if (userEmail) {
        const file = this.bucket.file(this.getLogPath(logId, userEmail));
        const [exists] = await file.exists();
        
        if (exists) {
          const [contents] = await file.download();
          const logData = JSON.parse(contents.toString()) as PBLLogData;
          
          // Return session_data directly (it's the source of truth)
          return logData.session_data;
        }
      }
      
      // Fallback: search across all files (for backward compatibility)
      const [files] = await this.bucket.getFiles({
        prefix: `${PBL_BASE_PATH}/`,
      });

      for (const file of files) {
        if (file.name.endsWith(`${logId}.json`)) {
          const [contents] = await file.download();
          const logData = JSON.parse(contents.toString()) as PBLLogData;
          
          // Return session_data directly (it's the source of truth)
          return logData.session_data;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching session from GCS:', error);
      return null;
    }
  }

  /**
   * Get session by sessionId (searches through all logs)
   */
  async getSession(sessionId: string): Promise<{ sessionData: SessionData; logId: string } | null> {
    try {
      // First try direct file access if sessionId looks like a filename
      if (sessionId.startsWith('pbl_')) {
        const [files] = await this.bucket.getFiles({
          prefix: `${PBL_BASE_PATH}/`,
        });
        
        for (const file of files) {
          const filename = file.name.split('/').pop()?.replace('.json', '') || '';
          if (filename === sessionId) {
            console.log('Found file by direct match:', file.name);
            const [contents] = await file.download();
            const logData = JSON.parse(contents.toString()) as PBLLogData;
            
            // Return session_data directly
            return { sessionData: logData.session_data, logId: sessionId };
          }
        }
      }
      
      // Fallback: search by session_id field
      const [files] = await this.bucket.getFiles({
        prefix: `${PBL_BASE_PATH}/`,
      });

      for (const file of files) {
        if (file.name.endsWith('.json')) {
          const [contents] = await file.download();
          const logData = JSON.parse(contents.toString()) as PBLLogData;
          
          if (logData.session_id === sessionId) {
            const logId = file.name.split('/').pop()!.replace('.json', '');
            
            // Return session_data directly
            return { sessionData: logData.session_data, logId };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching session from GCS:', error);
      return null;
    }
  }

  /**
   * Update session data in GCS (efficiently update existing file)
   */
  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<SessionData | null> {
    try {
      // Try to find the session more efficiently if we have userEmail in updates
      let targetFile = null;
      let logData: PBLLogData | null = null;

      // If we have userEmail in updates, try the user's folder first
      if (updates.userEmail) {
        const sanitizedEmail = updates.userEmail.replace(/[@.]/g, '_');
        const [userFiles] = await this.bucket.getFiles({
          prefix: `${PBL_BASE_PATH}/${sanitizedEmail}/`,
        });

        for (const file of userFiles) {
          if (file.name.endsWith('.json')) {
            try {
              const [contents] = await file.download();
              const data = JSON.parse(contents.toString()) as PBLLogData;
              
              if (data.session_id === sessionId) {
                targetFile = file;
                logData = data;
                break;
              }
            } catch (parseError) {
              console.error(`Failed to parse file ${file.name}:`, parseError);
              continue;
            }
          }
        }
      }

      // If not found in user folder, search all files (backward compatibility)
      if (!targetFile) {
        const [files] = await this.bucket.getFiles({
          prefix: `${PBL_BASE_PATH}/`,
        });

        for (const file of files) {
          if (file.name.endsWith('.json')) {
            try {
              const [contents] = await file.download();
              const data = JSON.parse(contents.toString()) as PBLLogData;
              
              if (data.session_id === sessionId) {
                targetFile = file;
                logData = data;
                break;
              }
            } catch (parseError) {
              console.error(`Failed to parse file ${file.name}:`, parseError);
              continue;
            }
          }
        }
      }

      if (!targetFile || !logData) {
        console.error(`Session ${sessionId} not found for update`);
        return null;
      }

      // Update the session data
      const updatedSessionData = {
        ...logData.session_data,
        ...updates,
        lastActiveAt: new Date().toISOString()
      };

      // Re-save with updated session data using new format
      const logId = targetFile.name.split('/').pop()!.replace('.json', '');
      await this.saveSession(sessionId, updatedSessionData, logId);
      
      console.log(`Updated session ${sessionId} - status: ${logData.status} -> ${updatedSessionData.status}`);

      // Return the updated session data
      return updatedSessionData;
    } catch (error) {
      console.error('Error updating session in GCS:', error);
      return null;
    }
  }

  /**
   * List all sessions for a user by email
   */
  async listUserSessions(userEmail: string, status?: 'in_progress' | 'completed' | 'paused'): Promise<PBLLogData[]> {
    try {
      return await this.getSessionsByEmail(userEmail, status);
    } catch (error) {
      console.error('Error listing user sessions:', error);
      return [];
    }
  }

  /**
   * Get sessions directly by email folder without checking user_id
   */
  async getSessionsByEmail(userEmail: string, status?: 'in_progress' | 'completed' | 'paused', scenarioId?: string): Promise<PBLLogData[]> {
    try {
      const sessions: PBLLogData[] = [];
      const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
      const folderPath = `${PBL_BASE_PATH}/${sanitizedEmail}/`;
      
      console.log(`Getting all sessions from email folder: ${folderPath}`);
      
      const [files] = await this.bucket.getFiles({
        prefix: folderPath,
      });
      
      console.log(`Found ${files.length} files in email folder`);
      
      for (const file of files) {
        if (file.name.endsWith('.json')) {
          try {
            const [contents] = await file.download();
            const logData = JSON.parse(contents.toString()) as PBLLogData;
            
            console.log(`Loaded session from ${file.name} - status: ${logData.status}, scenario: ${logData.scenario_id}`);
            
            // Apply filters
            if (status && logData.status !== status) {
              console.log(`Skipping due to status filter: looking for ${status}, found ${logData.status}`);
              continue;
            }
            
            if (scenarioId && logData.scenario_id !== scenarioId) {
              console.log(`Skipping due to scenario filter: looking for ${scenarioId}, found ${logData.scenario_id}`);
              continue;
            }
            
            sessions.push(logData);
          } catch (parseError) {
            console.error(`Failed to parse file ${file.name}:`, parseError);
          }
        }
      }
      
      return sessions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error getting sessions by email:', error);
      return [];
    }
  }

  /**
   * Transform PBLLogData to LearningLog format
   */
  private transformToLearningLog(session: PBLLogData): LearningLog {
    return {
      sessionId: session.session_id,
      logId: session.session_id,
      scenario: {
        id: session.scenario_id,
        title: session.session_data.scenarioTitle || session.scenario_id,
        stages: (session.session_data.scenario?.stages || []) as unknown as Array<Record<string, unknown>>
      },
      metadata: {
        startTime: session.session_data.startedAt,
        endTime: session.session_data.lastActiveAt,
        status: session.status,
        userId: session.session_data.userId,
        language: session.language
      },
      progress: {
        stageProgress: session.session_data.stageResults?.map((result: StageResult) => ({
          stageId: result.stageId,
          status: result.status,
          completedAt: result.completedAt instanceof Date ? result.completedAt.toISOString() : result.completedAt,
          score: result.score
        })) || []
      },
      evaluations: session.session_data.evaluations || [],
      processLogs: session.session_data.processLogs || [],
      stageResults: session.session_data.stageResults || [],
      session_data: session.session_data
    };
  }

  /**
   * Get user learning logs for history page (transformed format)
   */
  async getUserLearningLogs(userEmail: string): Promise<LearningLog[]> {
    try {
      console.log(`Getting learning logs for userEmail: ${userEmail}`);
      
      const sessions = await this.getSessionsByEmail(userEmail);
      console.log(`Found ${sessions.length} sessions by email: ${userEmail}`);
      
      return sessions.map(session => this.transformToLearningLog(session));
    } catch (error) {
      console.error('Error getting user learning logs:', error);
      return [];
    }
  }

  /**
   * Get all task logs for a specific task by user email and task ID
   * Returns all sessions for this task across different attempts
   */
  async getTaskLogs(userEmail: string, taskId: string): Promise<PBLLogData[]> {
    try {
      console.log(`Getting task logs for email: ${userEmail}, taskId: ${taskId}`);
      
      const sessions = await this.getSessionsByEmail(userEmail);
      
      // Filter sessions by task_id
      const taskSessions = sessions.filter(session => session.task_id === taskId);
      
      console.log(`Found ${taskSessions.length} sessions for task ${taskId}`);
      
      // Sort by timestamp (most recent first)
      return taskSessions.sort((a, b) => 
        new Date(b.session_data.startedAt).getTime() - new Date(a.session_data.startedAt).getTime()
      );
    } catch (error) {
      console.error(`Error getting task logs for ${taskId}:`, error);
      return [];
    }
  }


  // === Utility Methods ===

  /**
   * List files with a specific prefix (searches across all user folders)
   */
  async listFiles(prefix: string): Promise<Record<string, unknown>[]> {
    try {
      // Get all files under PBL_BASE_PATH (including all subfolders)
      const [files] = await this.bucket.getFiles({
        prefix: `${PBL_BASE_PATH}/`,
      });
      
      // Filter files that match the prefix (checking only the filename part)
      const matchingFiles = files.filter(file => {
        const filename = file.name.split('/').pop() || '';
        return filename.startsWith(prefix) && filename.endsWith('.json');
      });
      
      return matchingFiles.map(file => ({
        name: file.name,
        timeCreated: file.metadata?.timeCreated,
        updated: file.metadata?.updated,
        size: file.metadata?.size,
        metadata: file.metadata
      }));
    } catch (error) {
      console.error('Error listing files from GCS:', error);
      return [];
    }
  }

  /**
   * Delete session by logId
   */
  async deleteSession(logId: string, userEmail?: string): Promise<void> {
    try {
      const file = this.bucket.file(this.getLogPath(logId, userEmail));
      await file.delete();
      console.log(`Deleted PBL log: ${logId}`);
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  /**
   * Append process log to session (maintains compatibility)
   */
  async appendProcessLog(sessionId: string, log: ProcessLog): Promise<void> {
    const result = await this.getSession(sessionId);
    if (!result) {
      console.error(`Session ${sessionId} not found`);
      return;
    }

    const { sessionData, logId } = result;
    
    // Add log to session data
    if (!sessionData.processLogs) {
      sessionData.processLogs = [];
    }
    sessionData.processLogs.push(log);

    // Update session (saveSession will handle conversion to new format)
    await this.saveSession(sessionId, sessionData, logId);
  }

  /**
   * Get all PBL logs (for admin/debugging)
   */
  async getAllLogs(limit: number = 100): Promise<PBLLogData[]> {
    try {
      const [files] = await this.bucket.getFiles({
        prefix: `${PBL_BASE_PATH}/`,
        maxResults: limit
      });

      const logs: PBLLogData[] = [];
      
      for (const file of files) {
        if (file.name.endsWith('.json')) {
          const [contents] = await file.download();
          logs.push(JSON.parse(contents.toString()));
        }
      }

      return logs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error fetching all logs:', error);
      return [];
    }
  }
}

// Export singleton instance
export const pblGCS = new PBLGCSService();