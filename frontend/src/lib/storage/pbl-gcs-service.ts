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

// Interface for PBL log file structure (similar to assessment)
export interface PBLLogData {
  session_id: string;
  user_id: string;
  user_email?: string;
  scenario_id: string;
  timestamp: string;
  duration_seconds: number;
  language: string;
  status: 'in_progress' | 'completed' | 'paused' | 'not_started';
  session_data: SessionData;
  metadata: SessionMetadata;
  progress: ProgressData;
  process_logs: ProcessLog[];
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
   * Save complete session data to GCS (single file format)
   */
  async saveSession(sessionId: string, sessionData: SessionData, logId?: string): Promise<string> {
    // Get current stage and task IDs from session data
    const currentStage = sessionData.scenario?.stages?.[sessionData.currentStage];
    const currentStageId = currentStage?.id;
    
    // Get current task ID using currentTaskIndex
    const currentTaskIndex = sessionData.currentTaskIndex || 0;
    const currentTaskId = currentStage?.tasks?.[currentTaskIndex]?.id;
    
    // Use existing logId or generate new one with stage and task info
    const pblLogId = logId || this.generateLogFilename(
      sessionData.scenarioId, 
      currentStageId,
      currentTaskId
    );
    
    // Create metadata
    const metadata: SessionMetadata = {
      session_id: sessionId,
      user_id: sessionData.userId,
      activity_type: 'pbl_practice',
      activity_id: sessionData.scenarioId,
      status: sessionData.status,
      created_at: sessionData.startedAt,
      last_active_at: sessionData.lastActiveAt,
      version: 1
    };

    // Create progress data
    const progress: ProgressData = {
      current_stage: sessionData.currentStage,
      current_task: sessionData.currentTaskIndex || 0,
      completed_stages: sessionData.progress.completedStages,
      stage_results: sessionData.stageResults.reduce((acc, result) => {
        acc[result.stageId] = result;
        return acc;
      }, {} as { [stageId: string]: StageResult }),
      total_time_spent: sessionData.progress.timeSpent,
      progress_percentage: sessionData.progress.percentage
    };

    // Create a clean session_data without processLogs to avoid duplication
    const cleanSessionData = {
      ...sessionData,
      processLogs: [] // Clear to avoid duplication - process_logs is stored at root level
    };

    // Create complete log data
    const logData: PBLLogData = {
      session_id: sessionId,
      user_id: sessionData.userId,
      user_email: sessionData.userEmail,
      scenario_id: sessionData.scenarioId,
      timestamp: new Date().toISOString(),
      duration_seconds: sessionData.progress.timeSpent,
      language: 'zh-TW', // TODO: get from session
      status: sessionData.status,
      session_data: cleanSessionData,
      metadata,
      progress,
      process_logs: sessionData.processLogs || []
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
          
          // Restore processLogs from root level to session_data
          const sessionDataWithLogs = {
            ...logData.session_data,
            processLogs: logData.process_logs || []
          };
          
          return sessionDataWithLogs;
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
          
          // Restore processLogs from root level to session_data
          const sessionDataWithLogs = {
            ...logData.session_data,
            processLogs: logData.process_logs || []
          };
          
          return sessionDataWithLogs;
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
            
            // Restore processLogs from root level to session_data
            const sessionDataWithLogs = {
              ...logData.session_data,
              processLogs: logData.process_logs || []
            };
            
            return { sessionData: sessionDataWithLogs, logId: sessionId };
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
            
            // Restore processLogs from root level to session_data
            const sessionDataWithLogs = {
              ...logData.session_data,
              processLogs: logData.process_logs || []
            };
            
            return { sessionData: sessionDataWithLogs, logId };
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

      // First restore processLogs from root level to session_data for proper updating
      const currentSessionData = {
        ...logData.session_data,
        processLogs: logData.process_logs || []
      };

      // Update the session data
      const updatedSessionData = {
        ...currentSessionData,
        ...updates,
        lastActiveAt: new Date().toISOString()
      };

      // Create clean session data without processLogs for storage
      const cleanSessionData = {
        ...updatedSessionData,
        processLogs: [] // Clear to avoid duplication - process_logs is stored at root level
      };

      // Update the complete log data
      const updatedLogData: PBLLogData = {
        ...logData,
        session_data: cleanSessionData,
        duration_seconds: updatedSessionData.progress.timeSpent,
        status: updatedSessionData.status,
        timestamp: new Date().toISOString(),
        process_logs: updatedSessionData.processLogs || []
      };

      // Save back to the SAME file (overwrite)
      await targetFile.save(JSON.stringify(updatedLogData, null, 2), {
        metadata: {
          contentType: 'application/json',
        },
      });

      // Return the updated session data with processLogs for the application
      return updatedSessionData;
    } catch (error) {
      console.error('Error updating session in GCS:', error);
      return null;
    }
  }

  /**
   * List all sessions for a user (optimized with email folder structure)
   */
  async listUserSessions(userId: string, status?: 'in_progress' | 'completed' | 'paused', userEmail?: string): Promise<PBLLogData[]> {
    try {
      console.log(`listUserSessions called with userId: ${userId}, status: ${status}, userEmail: ${userEmail}`);
      const sessions: PBLLogData[] = [];
      
      // If userEmail is provided, search in user's folder first
      if (userEmail) {
        const sanitizedEmail = userEmail.replace(/[@.]/g, '_');
        console.log(`Searching in user folder: ${PBL_BASE_PATH}/${sanitizedEmail}/`);
        try {
          const [userFiles] = await this.bucket.getFiles({
            prefix: `${PBL_BASE_PATH}/${sanitizedEmail}/`,
          });
          
          console.log(`Found ${userFiles.length} files in user folder`);

          for (const file of userFiles) {
            if (file.name.endsWith('.json')) {
              try {
                const [contents] = await file.download();
                const logData = JSON.parse(contents.toString()) as PBLLogData;
                
                console.log(`File ${file.name} - user_id: ${logData.user_id}, status: ${logData.status}`);
                
                if (logData.user_id === userId) {
                  if (!status || logData.status === status) {
                    sessions.push(logData);
                  }
                }
              } catch (parseError) {
                console.error(`Failed to parse file ${file.name}:`, parseError);
              }
            }
          }
        } catch (err) {
          console.log(`User folder ${sanitizedEmail} not found or error accessing it:`, err);
        }
      }
      
      // If no sessions found in user folder or no email provided, search all files
      if (sessions.length === 0) {
        const [files] = await this.bucket.getFiles({
          prefix: `${PBL_BASE_PATH}/`,
        });

        for (const file of files) {
          if (file.name.endsWith('.json')) {
            try {
              const [contents] = await file.download();
              const logData = JSON.parse(contents.toString()) as PBLLogData;
              
              if (logData.user_id === userId) {
                if (!status || logData.status === status) {
                  sessions.push(logData);
                }
              }
            } catch (parseError) {
              console.error(`Failed to parse file ${file.name}:`, parseError);
            }
          }
        }
      }

      return sessions.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Error listing user sessions:', error);
      return [];
    }
  }

  /**
   * Get sessions directly by email folder without checking user_id
   */
  async getSessionsByEmail(userEmail: string): Promise<PBLLogData[]> {
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
      logId: session.session_id, // Use session_id as logId for consistency
      scenario: {
        id: session.scenario_id,
        title: session.session_data.scenarioTitle || session.scenario_id,
        stages: (session.session_data.scenario?.stages || []) as unknown as Array<Record<string, unknown>>
      },
      metadata: {
        startTime: session.session_data.startedAt,
        endTime: session.session_data.lastActiveAt,
        status: session.status === 'not_started' ? 'in_progress' : session.status,
        userId: session.user_id,
        language: session.language
      },
      progress: {
        stageProgress: session.session_data.stageResults?.map(result => ({
          stageId: result.stageId,
          status: result.status as 'not_started' | 'in_progress' | 'completed',
          completedAt: result.completedAt instanceof Date ? result.completedAt.toISOString() : result.completedAt,
          score: result.score
        })) || []
      },
      evaluations: session.session_data.evaluations || [],
      processLogs: session.process_logs || [],
      stageResults: session.session_data.stageResults || []
    };
  }

  /**
   * Get user learning logs for history page (transformed format)
   */
  async getUserLearningLogs(userId: string, userEmail?: string): Promise<LearningLog[]> {
    try {
      console.log(`Getting learning logs for userId: ${userId}, userEmail: ${userEmail}`);
      
      // If we have userEmail, prioritize getting sessions by email folder
      if (userEmail) {
        const sessions = await this.getSessionsByEmail(userEmail);
        console.log(`Found ${sessions.length} sessions by email: ${userEmail}`);
        
        if (sessions.length > 0) {
          return sessions.map(session => this.transformToLearningLog(session));
        }
      }
      
      // Fallback to original method
      const sessions = await this.listUserSessions(userId, undefined, userEmail);
      console.log(`Found ${sessions.length} sessions for userId: ${userId}`);
      
      return sessions.map(session => this.transformToLearningLog(session));
    } catch (error) {
      console.error('Error getting user learning logs:', error);
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
   * Append process log to session
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

    // Update session
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