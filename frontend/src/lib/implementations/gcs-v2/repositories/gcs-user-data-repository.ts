/**
 * GCS User Data Repository
 * Manages all user data in Google Cloud Storage
 */

import { GCSRepositoryBase } from '../base/gcs-repository-base';
import type { 
  UserData, 
  AssessmentResults, 
  UserAchievements,
  AssessmentSession
} from '@/lib/services/user-data-service';

export interface GCSUserData extends UserData {
  userId: string;
  userEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export class GCSUserDataRepository extends GCSRepositoryBase<GCSUserData> {
  constructor() {
    super('user_data');
  }

  /**
   * Get user data by user ID
   */
  async getUserData(userId: string): Promise<GCSUserData | null> {
    // Try to load by user ID
    let userData = await this.loadEntity(userId);
    
    // If not found, check if there's data with email as ID (for backward compatibility)
    if (!userData && userId.includes('@')) {
      const sanitizedEmail = this.sanitizeEmail(userId);
      userData = await this.loadEntity(sanitizedEmail);
    }
    
    return userData;
  }

  /**
   * Save user data
   */
  async saveUserData(userId: string, data: UserData, userEmail?: string): Promise<GCSUserData> {
    const now = new Date().toISOString();
    
    // Check if user data already exists
    const existingData = await this.getUserData(userId);
    
    const gcsUserData: GCSUserData = {
      ...data,
      id: userId,
      userId,
      userEmail,
      createdAt: existingData?.createdAt || now,
      updatedAt: now,
      lastUpdated: now,
      version: data.version || '2.0' // v2 with GCS
    };

    return await this.saveEntity(gcsUserData);
  }

  /**
   * Update specific fields of user data
   */
  async updateUserData(userId: string, updates: Partial<UserData>): Promise<GCSUserData | null> {
    const existingData = await this.getUserData(userId);
    if (!existingData) {
      return null;
    }

    const updatedData: GCSUserData = {
      ...existingData,
      ...updates,
      updatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    return await this.saveEntity(updatedData);
  }

  /**
   * Delete user data
   */
  async deleteUserData(userId: string): Promise<boolean> {
    return await this.deleteEntity(userId);
  }

  /**
   * Get all users (for admin purposes)
   */
  async getAllUsers(): Promise<GCSUserData[]> {
    return await this.listAllEntities();
  }

  /**
   * Migrate from localStorage data format
   */
  async migrateFromLocalStorage(userId: string, localData: UserData, userEmail?: string): Promise<GCSUserData> {
    // Check if already migrated
    const existingData = await this.getUserData(userId);
    if (existingData) {
      console.log(`User ${userId} already migrated to GCS`);
      return existingData;
    }

    // Save to GCS
    const gcsData = await this.saveUserData(userId, localData, userEmail);
    console.log(`Successfully migrated user ${userId} to GCS`);
    
    return gcsData;
  }

  /**
   * Get user by email (for backward compatibility)
   */
  async getUserDataByEmail(email: string): Promise<GCSUserData | null> {
    const sanitizedEmail = this.sanitizeEmail(email);
    
    // First try direct lookup
    let userData = await this.loadEntity(sanitizedEmail);
    if (userData) {
      return userData;
    }

    // If not found, search through all users
    const allUsers = await this.getAllUsers();
    return allUsers.find(user => user.userEmail === email) || null;
  }

  /**
   * Sanitize email for use as file name
   */
  private sanitizeEmail(email: string): string {
    return email.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  /**
   * Get file path override to support both user ID and email
   */
  protected getFilePath(id: string): string {
    // If ID looks like an email, sanitize it
    if (id.includes('@')) {
      id = this.sanitizeEmail(id);
    }
    return super.getFilePath(id);
  }

  /**
   * Convenience methods for specific data operations
   */
  
  async updateAssessmentResults(userId: string, results: AssessmentResults): Promise<boolean> {
    const updates = { assessmentResults: results };
    const result = await this.updateUserData(userId, updates);
    return result !== null;
  }

  async updateAchievements(userId: string, achievements: UserAchievements): Promise<boolean> {
    const updates = { achievements };
    const result = await this.updateUserData(userId, updates);
    return result !== null;
  }


  async addAssessmentSession(userId: string, session: AssessmentSession): Promise<boolean> {
    const userData = await this.getUserData(userId);
    if (!userData) return false;

    // Update assessment sessions
    const assessmentSessions = [...(userData.assessmentSessions || []), session];
    
    // Update assessment results
    const assessmentResults = session.results;

    const updates = {
      assessmentSessions,
      assessmentResults
    };

    const result = await this.updateUserData(userId, updates);
    return result !== null;
  }

}

// Singleton instance
export const gcsUserDataRepository = new GCSUserDataRepository();