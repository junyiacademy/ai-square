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

export interface TaskAnswer {
  taskId: string;
  answer: string;
  submittedAt: string;
  feedback?: string;
  score?: number;
}

export interface WorkspaceSession {
  id: string;
  pathId: string;
  createdAt: string;
  lastActiveAt: string;
  status: 'active' | 'paused' | 'completed';
  completedTasks: string[];
  totalXP: number;
  chatHistory?: any[];
  taskAnswers?: TaskAnswer[]; // Store task answers
}

export interface AssessmentSession {
  id: string;
  createdAt: string;
  results: AssessmentResults;
  answers?: Record<string, string[]>;
  generatedPaths?: string[];
}

export interface SavedPathData {
  id: string;
  assessmentId: string;
  pathData: any;
  matchPercentage: number;
  isFavorite: boolean;
  isCustom: boolean;
  createdAt: string;
  lastUpdated?: string;
}

export interface UserData {
  assessmentResults?: AssessmentResults | null;
  achievements: UserAchievements;
  workspaceSessions: WorkspaceSession[];
  assessmentSessions: AssessmentSession[];
  savedPaths: SavedPathData[];
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
        workspaceSessions: data.workspaceSessions || [],
        assessmentSessions: data.assessmentSessions || [],
        savedPaths: data.savedPaths || [],
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
  
  async saveWorkspaceSessions(sessions: WorkspaceSession[]): Promise<void> {
    const userData = await this.loadUserData() || this.getDefaultUserData();
    userData.workspaceSessions = sessions;
    await this.saveUserData(userData);
  }
  
  async savePaths(paths: SavedPathData[]): Promise<void> {
    const userData = await this.loadUserData() || this.getDefaultUserData();
    userData.savedPaths = paths;
    await this.saveUserData(userData);
  }
  
  async addWorkspaceSession(session: WorkspaceSession): Promise<void> {
    const userData = await this.loadUserData() || this.getDefaultUserData();
    userData.workspaceSessions.push(session);
    await this.saveUserData(userData);
  }
  
  async updateWorkspaceSession(sessionId: string, updates: Partial<WorkspaceSession>): Promise<void> {
    const userData = await this.loadUserData() || this.getDefaultUserData();
    const sessionIndex = userData.workspaceSessions.findIndex(s => s.id === sessionId);
    if (sessionIndex >= 0) {
      userData.workspaceSessions[sessionIndex] = {
        ...userData.workspaceSessions[sessionIndex],
        ...updates,
        lastActiveAt: new Date().toISOString()
      };
      await this.saveUserData(userData);
    }
  }
  
  async saveTaskAnswer(sessionId: string, taskAnswer: TaskAnswer): Promise<void> {
    const userData = await this.loadUserData() || this.getDefaultUserData();
    const sessionIndex = userData.workspaceSessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex >= 0) {
      const session = userData.workspaceSessions[sessionIndex];
      
      // Initialize taskAnswers if not exists
      if (!session.taskAnswers) {
        session.taskAnswers = [];
      }
      
      // Check if answer already exists for this task
      const existingAnswerIndex = session.taskAnswers.findIndex(a => a.taskId === taskAnswer.taskId);
      
      if (existingAnswerIndex >= 0) {
        // Update existing answer
        session.taskAnswers[existingAnswerIndex] = taskAnswer;
      } else {
        // Add new answer
        session.taskAnswers.push(taskAnswer);
      }
      
      // Update last active time
      session.lastActiveAt = new Date().toISOString();
      
      await this.saveUserData(userData);
    }
  }
  
  async getTaskAnswer(sessionId: string, taskId: string): Promise<TaskAnswer | null> {
    const userData = await this.loadUserData();
    if (!userData) return null;
    
    const session = userData.workspaceSessions.find(s => s.id === sessionId);
    if (!session || !session.taskAnswers) return null;
    
    return session.taskAnswers.find(a => a.taskId === taskId) || null;
  }
  
  async addAssessmentSession(session: AssessmentSession, paths: SavedPathData[]): Promise<void> {
    const userData = await this.loadUserData() || this.getDefaultUserData();
    
    // Add assessment session
    userData.assessmentSessions.push(session);
    
    // Update assessment results
    userData.assessmentResults = session.results;
    
    // Filter out duplicate paths before appending
    const existingPathIds = new Set(
      userData.savedPaths.map(p => p.pathData?.id).filter(Boolean)
    );
    
    // Only add paths that don't already exist
    const newPaths = paths.filter(path => {
      const pathId = path.pathData?.id;
      if (!pathId) return true; // Keep paths without ID (custom paths)
      
      // Check if this path ID already exists
      if (existingPathIds.has(pathId)) {
        console.log(`Path ${pathId} already exists, skipping...`);
        return false;
      }
      
      return true;
    });
    
    // Update existing paths with better match percentage if new one is higher
    paths.forEach(newPath => {
      const pathId = newPath.pathData?.id;
      if (pathId && existingPathIds.has(pathId)) {
        const existingPathIndex = userData.savedPaths.findIndex(
          p => p.pathData?.id === pathId
        );
        
        if (existingPathIndex >= 0) {
          const existingPath = userData.savedPaths[existingPathIndex];
          // Update if new match percentage is higher
          if (newPath.matchPercentage > existingPath.matchPercentage) {
            userData.savedPaths[existingPathIndex] = {
              ...existingPath,
              matchPercentage: newPath.matchPercentage,
              assessmentId: newPath.assessmentId,
              lastUpdated: new Date().toISOString()
            };
            console.log(`Updated path ${pathId} with higher match percentage: ${newPath.matchPercentage}%`);
          }
        }
      }
    });
    
    // Append new paths
    userData.savedPaths.push(...newPaths);
    
    // Store generated path IDs in the assessment session
    session.generatedPaths = newPaths.map(p => p.id);
    
    await this.saveUserData(userData);
  }
  
  async updateAchievements(updates: Partial<UserAchievements>): Promise<void> {
    const userData = await this.loadUserData() || this.getDefaultUserData();
    userData.achievements = { ...userData.achievements, ...updates };
    await this.saveUserData(userData);
  }
  
  async togglePathFavorite(pathId: string): Promise<void> {
    const userData = await this.loadUserData() || this.getDefaultUserData();
    const pathIndex = userData.savedPaths.findIndex(p => p.id === pathId);
    if (pathIndex >= 0) {
      userData.savedPaths[pathIndex].isFavorite = !userData.savedPaths[pathIndex].isFavorite;
      await this.saveUserData(userData);
    }
  }
  
  async deletePath(pathId: string): Promise<void> {
    const userData = await this.loadUserData() || this.getDefaultUserData();
    userData.savedPaths = userData.savedPaths.filter(p => p.id !== pathId);
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
      workspaceSessions: [],
      assessmentSessions: [],
      savedPaths: [],
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