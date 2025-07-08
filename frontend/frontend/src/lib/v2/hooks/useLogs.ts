import { StorageFactory } from '@/lib/abstractions/implementations/storage-factory';

interface LogEntry {
  timestamp: string;
  type: 'action' | 'task_completion' | 'program_completion';
  data: any;
}

export function useLogs(scenarioId: string, programId: string) {
  const storage = StorageFactory.create();
  const userEmail = localStorage.getItem('userEmail') || 'anonymous';
  
  const getLogPath = (logType: string) => {
    return `users/${userEmail}/scenarios/${scenarioId}/programs/${programId}/logs/${logType}.json`;
  };

  const appendLog = async (logType: string, entry: LogEntry) => {
    try {
      const path = getLogPath(logType);
      
      // Read existing logs
      let logs: LogEntry[] = [];
      try {
        const existingData = await storage.read(path);
        if (existingData) {
          logs = JSON.parse(existingData);
        }
      } catch (err) {
        // File doesn't exist yet, start with empty array
      }

      // Append new entry
      logs.push(entry);

      // Save updated logs
      await storage.write(path, JSON.stringify(logs, null, 2));
      
      return true;
    } catch (err) {
      console.error(`Failed to append log to ${logType}:`, err);
      return false;
    }
  };

  const logAction = async (taskId: string, action: any) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: 'action',
      data: {
        taskId,
        action,
      },
    };

    return appendLog('actions', entry);
  };

  const logTaskCompletion = async (taskId: string, evaluation: any) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: 'task_completion',
      data: {
        taskId,
        evaluation,
      },
    };

    // Save to both task-specific log and completions log
    await appendLog(`tasks/${taskId}`, entry);
    return appendLog('task_completions', entry);
  };

  const logProgramCompletion = async () => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: 'program_completion',
      data: {
        scenarioId,
        programId,
      },
    };

    return appendLog('program_completion', entry);
  };

  const readLogs = async (logType: string): Promise<LogEntry[]> => {
    try {
      const path = getLogPath(logType);
      const data = await storage.read(path);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.error(`Failed to read logs from ${logType}:`, err);
      return [];
    }
  };

  return {
    logAction,
    logTaskCompletion,
    logProgramCompletion,
    readLogs,
  };
}