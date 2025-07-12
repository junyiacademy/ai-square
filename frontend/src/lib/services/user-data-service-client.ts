/**
 * User Data Service Client - API-based implementation
 * 
 * This service communicates with the API routes instead of directly accessing GCS
 * to avoid browser compatibility issues
 */

import type { 
  UserData, 
  AssessmentResults, 
  UserAchievements,
  AssessmentSession
} from './user-data-service';

export class UserDataServiceClient {
  private cache: UserData | null = null;
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastCacheTime: number = 0;

  /**
   * Load user data with caching
   */
  async loadUserData(): Promise<UserData | null> {
    // Check cache first
    if (this.cache && Date.now() - this.lastCacheTime < this.cacheExpiry) {
      return this.cache;
    }

    try {
      // Get session token from localStorage
      const sessionToken = localStorage.getItem('ai_square_session');
      console.log('[UserDataService] Loading user data, session token:', sessionToken ? 'present' : 'missing');
      
      const headers: HeadersInit = {};
      
      // Add session token to headers if available
      if (sessionToken) {
        headers['x-session-token'] = sessionToken;
      }
      
      const response = await fetch('/api/user-data', {
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('User not authenticated for user data API');
          console.log('Session token present:', !!sessionToken);
          return null;
        }
        throw new Error(`Failed to load user data: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Update cache
        this.cache = result.data;
        this.lastCacheTime = Date.now();
        return result.data;
      }

      return null;
    } catch (error) {
      console.error('Failed to load user data:', error);
      
      // Try localStorage migration if API fails
      const localData = this.loadFromLocalStorage();
      if (localData) {
        console.log('Loaded from localStorage fallback');
        return localData;
      }
      
      return null;
    }
  }

  /**
   * Save user data
   */
  async saveUserData(data: UserData): Promise<void> {
    try {
      // Get session token from localStorage
      const sessionToken = localStorage.getItem('ai_square_session');
      console.log('[UserDataService] Saving user data, session token:', sessionToken ? 'present' : 'missing');
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      // Add session token to headers if available
      if (sessionToken) {
        headers['x-session-token'] = sessionToken;
      }
      
      const response = await fetch('/api/user-data', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ data })
      });

      if (!response.ok) {
        throw new Error(`Failed to save user data: ${response.status}`);
      }

      // Update cache
      this.cache = data;
      this.lastCacheTime = Date.now();
    } catch (error) {
      console.error('Failed to save user data:', error);
      throw error;
    }
  }

  /**
   * Check if user data exists
   */
  async userDataExists(): Promise<boolean> {
    const data = await this.loadUserData();
    return data !== null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
    this.lastCacheTime = 0;
  }

  // Convenience methods for specific data types
  
  async saveAssessmentResults(results: AssessmentResults): Promise<void> {
    const userData = await this.loadUserData() || this.getDefaultUserData();
    userData.assessmentResults = results;
    await this.saveUserData(userData);
  }

  async saveAchievements(achievements: UserAchievements): Promise<void> {
    const userData = await this.loadUserData() || this.getDefaultUserData();
    userData.achievements = achievements;
    await this.saveUserData(userData);
  }







  async addAssessmentSession(session: AssessmentSession): Promise<void> {
    const userData = await this.loadUserData() || this.getDefaultUserData();
    
    userData.assessmentSessions.push(session);
    userData.assessmentResults = session.results;
    
    await this.saveUserData(userData);
  }

  async updateAchievements(updates: Partial<UserAchievements>): Promise<void> {
    const userData = await this.loadUserData() || this.getDefaultUserData();
    userData.achievements = { ...userData.achievements, ...updates };
    await this.saveUserData(userData);
  }




  // Evaluation system methods (delegated to API)
  
  async saveEvaluation(type: string, id: string, data: any): Promise<void> {
    // This would call a separate API endpoint for evaluations
    console.warn('Evaluation save not implemented in client service');
  }

  async loadEvaluation(type: string, id: string): Promise<any | null> {
    // This would call a separate API endpoint for evaluations
    console.warn('Evaluation load not implemented in client service');
    return null;
  }

  async loadEvaluationsByType(type: string): Promise<any[]> {
    // This would call a separate API endpoint for evaluations
    console.warn('Evaluation load by type not implemented in client service');
    return [];
  }

  async deleteEvaluation(type: string, id: string): Promise<void> {
    // This would call a separate API endpoint for evaluations
    console.warn('Evaluation delete not implemented in client service');
  }

  // Utility methods
  
  async exportData(): Promise<UserData | null> {
    return await this.loadUserData();
  }

  async importData(data: UserData): Promise<void> {
    await this.saveUserData(data);
  }

  async clearAllData(): Promise<void> {
    await this.saveUserData(this.getDefaultUserData());
  }

  /**
   * Migrate from localStorage to API/GCS
   */
  async migrateFromLocalStorage(): Promise<boolean> {
    try {
      // Check if already has data
      const existingData = await this.loadUserData();
      if (existingData) {
        console.log('User data already exists, skipping migration');
        return true;
      }

      // Try to load from localStorage
      const localData = this.loadFromLocalStorage();
      if (!localData) {
        console.log('No localStorage data to migrate');
        return false;
      }

      // Save to API/GCS
      await this.saveUserData(localData);
      
      // Clear localStorage after successful migration
      localStorage.removeItem('discoveryData');
      
      console.log('Successfully migrated data from localStorage');
      return true;
    } catch (error) {
      console.error('Failed to migrate from localStorage:', error);
      return false;
    }
  }

  private loadFromLocalStorage(): UserData | null {
    try {
      const localStorageData = localStorage.getItem('discoveryData');
      if (localStorageData) {
        return JSON.parse(localStorageData) as UserData;
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
    return null;
  }

  private getDefaultUserData(): UserData {
    return {
      achievements: {
        badges: [],
        totalXp: 0,
        level: 1,
        completedTasks: []
      },
      assessmentSessions: [],
      lastUpdated: new Date().toISOString(),
      version: '2.0'
    };
  }
}

// Factory function to create service
export function createUserDataServiceClient(): UserDataServiceClient {
  return new UserDataServiceClient();
}