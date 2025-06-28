import { 
  SessionData, 
  ProcessLog, 
  ApiResponse, 
  EvaluationResult,
  ProgressData 
} from '@/types/pbl';

export class PBLStorageService {
  private baseUrl = '/api/storage';

  /**
   * Create a new PBL session
   */
  async createSession(
    userId: string,
    userEmail: string,
    activityId: string
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          user_email: userEmail,
          activity_type: 'pbl_practice',
          activity_id: activityId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const data = await response.json() as ApiResponse<{ session_id: string }>;
      
      if (!data.success || !data.data?.session_id) {
        throw new Error('Failed to create session');
      }

      return data.data.session_id;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create session');
    }
  }

  /**
   * Append a single log to session
   */
  async appendLog(sessionId: string, log: ProcessLog): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/session/${sessionId}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: [log] }),
      });

      if (!response.ok) {
        throw new Error('Failed to append logs');
      }

      const data = await response.json() as ApiResponse<unknown>;
      
      if (!data.success) {
        throw new Error('Failed to append logs');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to append logs');
    }
  }

  /**
   * Get session data by ID
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/session/${sessionId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error('Failed to get session');
      }

      const data = await response.json() as ApiResponse<SessionData>;
      
      if (!data.success) {
        if (data.error?.code === 'SESSION_NOT_FOUND') {
          return null;
        }
        throw new Error(data.error?.message || 'Failed to get session');
      }

      return data.data || null;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get session');
    }
  }

  /**
   * Update session progress
   */
  async updateProgress(sessionId: string, progress: ProgressData): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/session/${sessionId}/progress`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progress),
      });

      if (!response.ok) {
        throw new Error('Failed to update progress');
      }

      const data = await response.json() as ApiResponse<unknown>;
      
      if (!data.success) {
        throw new Error('Failed to update progress');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update progress');
    }
  }

  /**
   * Complete a session with evaluation
   */
  async completeSession(
    sessionId: string,
    evaluation: EvaluationResult
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/session/${sessionId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluation }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete session');
      }

      const data = await response.json() as ApiResponse<unknown>;
      
      if (!data.success) {
        throw new Error('Failed to complete session');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to complete session');
    }
  }

  /**
   * Get all sessions for a user, optionally filtered by activity
   */
  async getUserSessions(
    userId: string,
    activityId?: string
  ): Promise<SessionData[]> {
    try {
      let url = `${this.baseUrl}/user/${userId}/sessions`;
      if (activityId) {
        url += `?activity_id=${activityId}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to get user sessions');
      }

      const data = await response.json() as ApiResponse<SessionData[]>;
      
      if (!data.success) {
        throw new Error('Failed to get user sessions');
      }

      return data.data || [];
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to get user sessions');
    }
  }

  /**
   * Batch write multiple logs at once
   */
  async batchWriteLogs(sessionId: string, logs: ProcessLog[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/session/${sessionId}/logs/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs }),
      });

      if (!response.ok) {
        throw new Error('Failed to batch write logs');
      }

      const data = await response.json() as ApiResponse<unknown>;
      
      if (!data.success) {
        throw new Error('Failed to batch write logs');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to batch write logs');
    }
  }
}