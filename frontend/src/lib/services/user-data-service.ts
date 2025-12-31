/**
 * User Data Service - LocalStorage Implementation
 *
 * This service provides a localStorage-based implementation of user data storage
 * Used primarily for development and as a fallback option
 */

import type {
  UserData,
  AssessmentResults,
  UserAchievements,
  AssessmentSession,
  UserDataOperations,
} from "@/lib/types/user-data";

// Re-export types for backward compatibility
export type {
  UserData,
  AssessmentResults,
  UserAchievements,
  AssessmentSession,
  Badge,
  Achievement,
} from "@/lib/types/user-data";

// Storage interface for different backends
interface StorageBackend {
  save(userId: string, data: UserData): Promise<void>;
  load(userId: string): Promise<UserData | null>;
  exists(userId: string): Promise<boolean>;
}

// localStorage implementation
class LocalStorageBackend implements StorageBackend {
  private readonly STORAGE_KEY = "discoveryData";

  // Safe JSON serialization to handle circular references
  private safeStringify(obj: unknown): string {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    });
  }

  async save(userId: string, data: UserData): Promise<void> {
    try {
      const storageKey = this.getStorageKey(userId);
      localStorage.setItem(storageKey, this.safeStringify(data));
    } catch (error) {
      console.error("Failed to save to localStorage:", error);
      throw error;
    }
  }

  async load(userId: string): Promise<UserData | null> {
    try {
      const storageKey = this.getStorageKey(userId);
      const data = localStorage.getItem(storageKey);

      if (!data) {
        // Try legacy key for backward compatibility
        const legacyData = localStorage.getItem(this.STORAGE_KEY);
        if (legacyData) {
          const parsed = JSON.parse(legacyData);
          // Migrate to new key
          await this.save(userId, parsed);
          // Clean up legacy key
          localStorage.removeItem(this.STORAGE_KEY);
          return parsed;
        }
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error("Failed to load from localStorage:", error);
      return null;
    }
  }

  async exists(userId: string): Promise<boolean> {
    const storageKey = this.getStorageKey(userId);
    return (
      localStorage.getItem(storageKey) !== null ||
      localStorage.getItem(this.STORAGE_KEY) !== null
    );
  }

  private getStorageKey(userId: string): string {
    return `${this.STORAGE_KEY}_${userId}`;
  }
}

// Placeholder for future GCS implementation
class GCSBackend implements StorageBackend {
  async save({}: string, {}: UserData): Promise<void> {
    throw new Error("GCS backend not implemented - use UserDataServiceV2");
  }

  async load({}: string): Promise<UserData | null> {
    throw new Error("GCS backend not implemented - use UserDataServiceV2");
  }

  async exists({}: string): Promise<boolean> {
    throw new Error("GCS backend not implemented - use UserDataServiceV2");
  }
}

export class UserDataService implements UserDataOperations {
  private backend: StorageBackend;
  private userId: string;

  constructor(userId: string = "default", useGCS: boolean = false) {
    this.userId = userId;
    this.backend = useGCS ? new GCSBackend() : new LocalStorageBackend();
  }

  async saveUserData(data: UserData): Promise<void> {
    await this.backend.save(this.userId, data);
  }

  async loadUserData(): Promise<UserData | null> {
    return await this.backend.load(this.userId);
  }

  async userDataExists(): Promise<boolean> {
    return await this.backend.exists(this.userId);
  }

  // Convenience methods
  async saveAssessmentResults(results: AssessmentResults): Promise<void> {
    const userData = (await this.loadUserData()) || this.getDefaultUserData();
    userData.assessmentResults = results;
    userData.lastUpdated = new Date().toISOString();
    await this.saveUserData(userData);
  }

  async saveAchievements(achievements: UserAchievements): Promise<void> {
    const userData = (await this.loadUserData()) || this.getDefaultUserData();
    userData.achievements = achievements;
    userData.lastUpdated = new Date().toISOString();
    await this.saveUserData(userData);
  }

  async addAssessmentSession(session: AssessmentSession): Promise<void> {
    const userData = (await this.loadUserData()) || this.getDefaultUserData();

    // Add new session
    userData.assessmentSessions.push(session);

    // Update current results
    userData.assessmentResults = session.results;

    userData.lastUpdated = new Date().toISOString();
    await this.saveUserData(userData);
  }

  async updateAchievements(updates: Partial<UserAchievements>): Promise<void> {
    const userData = (await this.loadUserData()) || this.getDefaultUserData();
    userData.achievements = { ...userData.achievements, ...updates };
    userData.lastUpdated = new Date().toISOString();
    await this.saveUserData(userData);
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

  private getDefaultUserData(): UserData {
    return {
      achievements: {
        badges: [],
        totalXp: 0,
        level: 1,
        completedTasks: [],
      },
      assessmentSessions: [],
      lastUpdated: new Date().toISOString(),
      version: "2.0",
    };
  }
}

// Factory function
export function createUserDataService(
  userId: string = "default",
  useGCS: boolean = false,
): UserDataService {
  return new UserDataService(userId, useGCS);
}

// Singleton instance for backward compatibility
export const userDataService = new UserDataService();
