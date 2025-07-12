/**
 * 統一的用戶數據存儲服務
 * 
 * 目前使用 localStorage，未來可以輕鬆遷移到 GCS
 * 提供統一的 API 來管理所有用戶數據
 */

// Data types
export interface AssessmentResults {
  tech: number;
  creative: number;
  business: number;
}

export interface UserAchievements {
  badges: string[];
  totalXp: number;
  level: number;
  completedTasks: string[];
}

export interface AssessmentSession {
  id: string;
  createdAt: string;
  results: AssessmentResults;
  answers?: Record<string, string[]>;
}

export interface UserData {
  assessmentResults?: AssessmentResults | null;
  achievements: UserAchievements;
  assessmentSessions: AssessmentSession[];
  currentView?: string;
  lastUpdated: string;
  version: string; // For future migration compatibility
}

// Storage interface for different backends
interface StorageBackend {
  save(userId: string, data: UserData): Promise<void>;
  load(userId: string): Promise<UserData | null>;
  exists(userId: string): Promise<boolean>;
}

// localStorage implementation
class LocalStorageBackend implements StorageBackend {
  private readonly STORAGE_KEY = 'discoveryData';
  
  // Safe JSON serialization to handle circular references
  private safeStringify(obj: any): string {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        // Skip DOM elements and window objects
        if (value instanceof Window || value instanceof HTMLElement) {
          return undefined;
        }
        // Handle circular references
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    });
  }
  
  async save(userId: string, data: UserData): Promise<void> {
    try {
      const dataWithMetadata = {
        ...data,
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      };
      console.log('Saving data to localStorage:', dataWithMetadata);
      localStorage.setItem(this.STORAGE_KEY, this.safeStringify(dataWithMetadata));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      throw error;
    }
  }
  
  async load(userId: string): Promise<UserData | null> {
    try {
      const savedData = localStorage.getItem(this.STORAGE_KEY);
      console.log('Loading data from localStorage:', savedData);
      
      if (!savedData) return null;
      
      const data = JSON.parse(savedData);
      console.log('Parsed localStorage data:', data);
      
      // Ensure data has the required structure
      return {
        assessmentResults: data.assessmentResults || null,
        achievements: data.achievements || {
          badges: [],
          totalXp: 0,
          level: 1,
          completedTasks: []
        },
        assessmentSessions: data.assessmentSessions || [],
        currentView: data.currentView,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        version: data.version || '1.0'
      };
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return null;
    }
  }
  
  async exists(userId: string): Promise<boolean> {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }
}

// Future GCS implementation placeholder
class GCSBackend implements StorageBackend {
  async save(userId: string, data: UserData): Promise<void> {
    // TODO: Implement GCS save
    throw new Error('GCS backend not implemented yet');
  }
  
  async load(userId: string): Promise<UserData | null> {
    // TODO: Implement GCS load
    throw new Error('GCS backend not implemented yet');
  }
  
  async exists(userId: string): Promise<boolean> {
    // TODO: Implement GCS exists check
    throw new Error('GCS backend not implemented yet');
  }
}

// Main service class
export class UserDataService {
  private backend: StorageBackend;
  private userId: string;
  
  constructor(userId: string = 'default', useGCS: boolean = false) {
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
    
    // Add assessment session
    userData.assessmentSessions.push(session);
    
    // Update assessment results
    userData.assessmentResults = session.results;
    
    await this.saveUserData(userData);
  }
  
  async updateAchievements(updates: Partial<UserAchievements>): Promise<void> {
    const userData = await this.loadUserData() || this.getDefaultUserData();
    userData.achievements = { ...userData.achievements, ...updates };
    await this.saveUserData(userData);
  }
  
  // Evaluation system methods
  async saveEvaluation(type: string, id: string, data: any): Promise<void> {
    try {
      const key = `${this.userId}_${type}_${id}`;
      localStorage.setItem(key, JSON.stringify({
        ...data,
        savedAt: new Date().toISOString()
      }));
      console.log(`Saved ${type} evaluation:`, data);
    } catch (error) {
      console.error(`Failed to save ${type} evaluation:`, error);
      throw error;
    }
  }
  
  async loadEvaluation(type: string, id: string): Promise<any | null> {
    try {
      const key = `${this.userId}_${type}_${id}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Failed to load ${type} evaluation:`, error);
      return null;
    }
  }
  
  async loadEvaluationsByType(type: string): Promise<any[]> {
    try {
      const prefix = `${this.userId}_${type}_`;
      const evaluations: any[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          const data = localStorage.getItem(key);
          if (data) {
            evaluations.push(JSON.parse(data));
          }
        }
      }
      
      return evaluations.sort((a, b) => 
        new Date(b.submittedAt || b.savedAt).getTime() - 
        new Date(a.submittedAt || a.savedAt).getTime()
      );
    } catch (error) {
      console.error(`Failed to load ${type} evaluations:`, error);
      return [];
    }
  }
  
  async deleteEvaluation(type: string, id: string): Promise<void> {
    try {
      const key = `${this.userId}_${type}_${id}`;
      localStorage.removeItem(key);
      console.log(`Deleted ${type} evaluation: ${id}`);
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
      version: '1.0'
    };
  }
  
  // Switch storage backend (for migration)
  switchToGCS(): void {
    this.backend = new GCSBackend();
  }
  
  switchToLocalStorage(): void {
    this.backend = new LocalStorageBackend();
  }
}

// Singleton instance
export const userDataService = new UserDataService();

// Migration helper
export async function migrateToGCS(userId: string): Promise<void> {
  const localService = new UserDataService(userId, false);
  const gcsService = new UserDataService(userId, true);
  
  const data = await localService.loadUserData();
  if (data) {
    await gcsService.saveUserData(data);
    console.log('Data migrated to GCS successfully');
  }
}
