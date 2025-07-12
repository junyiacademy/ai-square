/**
 * User Data Service - GCS Implementation
 * 
 * This service uses Google Cloud Storage for persistent data storage
 * Used by the backend API routes for server-side operations
 */

import { gcsUserDataRepository } from '@/lib/implementations/gcs-v2/repositories/gcs-user-data-repository';
import { gcsEvaluationRepository } from '@/lib/implementations/gcs-v2/repositories/gcs-evaluation-repository';
import type { 
  UserData, 
  AssessmentResults, 
  UserAchievements,
  AssessmentSession
} from '@/lib/types/user-data';

export class UserDataServiceGCS {
  private userId: string;
  private userEmail?: string;
  private cache: UserData | null = null;
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastCacheTime: number = 0;

  constructor(userId: string = 'default', userEmail?: string) {
    this.userId = userId;
    this.userEmail = userEmail;
  }

  /**
   * Load user data with caching
   */
  async loadUserData(): Promise<UserData | null> {
    // Check cache first
    if (this.cache && Date.now() - this.lastCacheTime < this.cacheExpiry) {
      return this.cache;
    }

    try {
      const gcsData = await gcsUserDataRepository.getUserData(this.userId);
      
      if (gcsData) {
        // Convert GCS format to UserData format
        const userData: UserData = {
          assessmentResults: gcsData.assessmentResults,
          achievements: gcsData.achievements,
          assessmentSessions: gcsData.assessmentSessions,
          currentView: gcsData.currentView,
          lastUpdated: gcsData.lastUpdated,
          version: gcsData.version
        };

        // Update cache
        this.cache = userData;
        this.lastCacheTime = Date.now();

        return userData;
      }

      return null;
    } catch (error) {
      console.error('Failed to load user data from GCS:', error);
      return null;
    }
  }

  /**
   * Save user data
   */
  async saveUserData(data: UserData): Promise<void> {
    try {
      await gcsUserDataRepository.saveUserData(this.userId, data, this.userEmail);
      
      // Update cache
      this.cache = data;
      this.lastCacheTime = Date.now();
    } catch (error) {
      console.error('Failed to save user data to GCS:', error);
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
    const success = await gcsUserDataRepository.addAssessmentSession(this.userId, session);
    if (!success) {
      // Fallback: load all data, modify, and save
      const userData = await this.loadUserData() || this.getDefaultUserData();
      
      userData.assessmentSessions.push(session);
      userData.assessmentResults = session.results;
      
      await this.saveUserData(userData);
    }
    this.clearCache();
  }

  async updateAchievements(updates: Partial<UserAchievements>): Promise<void> {
    const userData = await this.loadUserData() || this.getDefaultUserData();
    userData.achievements = { ...userData.achievements, ...updates };
    await this.saveUserData(userData);
  }


  // Evaluation system methods (using GCS evaluation repository)
  
  async saveEvaluation(type: string, id: string, data: any): Promise<void> {
    try {
      await gcsEvaluationRepository.save({
        ...data,
        id,
        type,
        userId: this.userId,
        userEmail: this.userEmail,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Failed to save ${type} evaluation:`, error);
      throw error;
    }
  }

  async loadEvaluation(type: string, id: string): Promise<any | null> {
    try {
      const evaluation = await gcsEvaluationRepository.getById(id);
      return evaluation;
    } catch (error) {
      console.error(`Failed to load ${type} evaluation:`, error);
      return null;
    }
  }

  async loadEvaluationsByType(type: string): Promise<any[]> {
    try {
      const evaluations = await gcsEvaluationRepository.getByUser(this.userId);
      return evaluations
        .filter(e => e.type === type)
        .sort((a, b) => 
          new Date(b.submittedAt || b.createdAt).getTime() - 
          new Date(a.submittedAt || a.createdAt).getTime()
        );
    } catch (error) {
      console.error(`Failed to load ${type} evaluations:`, error);
      return [];
    }
  }

  async deleteEvaluation(type: string, id: string): Promise<void> {
    try {
      await gcsEvaluationRepository.delete(id);
    } catch (error) {
      console.error(`Failed to delete ${type} evaluation:`, error);
      throw error;
    }
  }

  // Migration utilities
  
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
   * Migrate from localStorage to GCS
   */
  async migrateFromLocalStorage(): Promise<boolean> {
    try {
      // Check if already migrated
      const existingData = await this.loadUserData();
      if (existingData) {
        console.log('User data already exists in GCS, skipping migration');
        return true;
      }

      // Try to load from localStorage
      const localStorageData = localStorage.getItem('discoveryData');
      if (!localStorageData) {
        console.log('No localStorage data to migrate');
        return false;
      }

      const localData = JSON.parse(localStorageData) as UserData;
      
      // Save to GCS
      await this.saveUserData(localData);
      
      // Clear localStorage after successful migration
      localStorage.removeItem('discoveryData');
      
      console.log('Successfully migrated data from localStorage to GCS');
      return true;
    } catch (error) {
      console.error('Failed to migrate from localStorage:', error);
      return false;
    }
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

// Factory function to create service with proper user context
export function createUserDataServiceGCS(userId: string, userEmail?: string): UserDataServiceGCS {
  return new UserDataServiceGCS(userId, userEmail);
}

// Migration helper
export async function migrateUserToGCS(userId: string, userEmail?: string): Promise<boolean> {
  const service = new UserDataServiceGCS(userId, userEmail);
  return await service.migrateFromLocalStorage();
}