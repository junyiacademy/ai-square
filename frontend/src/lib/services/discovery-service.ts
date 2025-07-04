/**
 * Discovery Service - Core service for infinite path generation
 * Phase 1: LocalStorage implementation
 */

import { UserDataService, SavedPathData, DynamicTask } from './user-data-service';

// Public content interfaces
export interface PublicContentIndex {
  version: string;
  lastUpdated: string;
  featured: PathSummary[];
  trending: PathSummary[];
  recent: PathSummary[];
  tagIndex: Record<string, string[]>;
  stats: {
    totalPaths: number;
    totalPlays: number;
    activeCreators: number;
  };
}

export interface PathSummary {
  id: string;
  title: string;
  category: string;
  tags: string[];
  rating: number;
  plays: number;
  authorId: string;
  createdAt: string;
}

export interface PublicContent {
  index: PublicContentIndex;
  paths: Record<string, SavedPathData>;
  tasks: Record<string, DynamicTask[]>;
  lastSync: string;
}

export interface GeneratePathParams {
  userId: string;
  assessmentResults: any;
  userPrompt?: string;
  preferences?: any;
  conversationHistory?: any[];
  locale?: string;
}

export interface SearchFilters {
  tags?: string[];
  minRating?: number;
  category?: string;
  sortBy?: 'rating' | 'plays' | 'recent';
  limit?: number;
}

export class DiscoveryService {
  private userDataService: UserDataService;
  private publicContentKey = 'discovery_public_content';
  private aiConversationsKey = 'discovery_ai_conversations';

  constructor() {
    this.userDataService = new UserDataService();
  }

  // User path management
  async saveUserPath(userId: string, path: SavedPathData): Promise<void> {
    const userData = await this.userDataService.loadUserData();
    if (!userData) return;

    // Update or add the path
    const existingIndex = userData.savedPaths.findIndex(p => p.id === path.id);
    if (existingIndex >= 0) {
      userData.savedPaths[existingIndex] = path;
    } else {
      userData.savedPaths.push(path);
    }

    await this.userDataService.saveUserData(userData);
  }

  async getUserPaths(userId: string): Promise<SavedPathData[]> {
    const userData = await this.userDataService.loadUserData();
    return userData?.savedPaths || [];
  }

  // Dynamic task management
  async saveDynamicTask(userId: string, task: DynamicTask): Promise<void> {
    const userData = await this.userDataService.loadUserData();
    if (!userData) return;

    if (!userData.generatedTasks) {
      userData.generatedTasks = [];
    }

    const existingIndex = userData.generatedTasks.findIndex(t => t.id === task.id);
    if (existingIndex >= 0) {
      userData.generatedTasks[existingIndex] = task;
    } else {
      userData.generatedTasks.push(task);
    }

    await this.userDataService.saveUserData(userData);
  }

  async getDynamicTasks(userId: string, pathId: string): Promise<DynamicTask[]> {
    const userData = await this.userDataService.loadUserData();
    if (!userData?.generatedTasks) return [];
    
    return userData.generatedTasks
      .filter(task => task.pathId === pathId)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }

  // Public content management
  loadPublicContent(): PublicContent {
    const stored = localStorage.getItem(this.publicContentKey);
    if (!stored) {
      return this.getDefaultPublicContent();
    }
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse public content:', error);
      return this.getDefaultPublicContent();
    }
  }

  private getDefaultPublicContent(): PublicContent {
    return {
      index: {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        featured: [],
        trending: [],
        recent: [],
        tagIndex: {},
        stats: {
          totalPaths: 0,
          totalPlays: 0,
          activeCreators: 0
        }
      },
      paths: {},
      tasks: {},
      lastSync: new Date().toISOString()
    };
  }

  async savePublicPath(path: SavedPathData): Promise<void> {
    if (!path.isPublic) return;

    const publicContent = this.loadPublicContent();
    publicContent.paths[path.id] = path;
    this.updatePublicIndex(publicContent.index, path);

    localStorage.setItem(this.publicContentKey, JSON.stringify(publicContent));
  }

  private updatePublicIndex(index: PublicContentIndex, path: SavedPathData): void {
    const summary: PathSummary = {
      id: path.id,
      title: path.pathData?.title || 'Untitled Path',
      category: path.pathData?.category || 'general',
      tags: path.publicMetadata?.tags || [],
      rating: path.publicMetadata?.rating || 0,
      plays: path.publicMetadata?.plays || 0,
      authorId: path.publicMetadata?.authorId || 'anonymous',
      createdAt: path.createdAt
    };

    // Update recent
    index.recent = [summary, ...index.recent.filter(p => p.id !== path.id)].slice(0, 10);

    // Update trending (simplified for Phase 1)
    if (summary.plays > 10) {
      index.trending = [summary, ...index.trending.filter(p => p.id !== path.id)].slice(0, 10);
    }

    // Update featured (manual curation in Phase 1)
    if (path.publicMetadata?.featured) {
      index.featured = [summary, ...index.featured.filter(p => p.id !== path.id)].slice(0, 10);
    }

    // Update tag index
    summary.tags.forEach(tag => {
      if (!index.tagIndex[tag]) {
        index.tagIndex[tag] = [];
      }
      if (!index.tagIndex[tag].includes(path.id)) {
        index.tagIndex[tag].push(path.id);
      }
    });

    // Update stats
    index.stats.totalPaths = Object.keys(index.tagIndex).reduce(
      (sum, tag) => sum + index.tagIndex[tag].length, 0
    );
    index.lastUpdated = new Date().toISOString();
  }

  searchPublicPaths(filters: SearchFilters): SavedPathData[] {
    const content = this.loadPublicContent();
    let paths = Object.values(content.paths);

    // Apply filters
    if (filters.category) {
      paths = paths.filter(p => p.pathData?.category === filters.category);
    }

    if (filters.tags?.length) {
      paths = paths.filter(p => 
        filters.tags!.some(tag => 
          p.publicMetadata?.tags.includes(tag)
        )
      );
    }

    if (filters.minRating) {
      paths = paths.filter(p => 
        (p.publicMetadata?.rating || 0) >= filters.minRating!
      );
    }

    // Sort
    paths.sort((a, b) => {
      switch (filters.sortBy) {
        case 'rating':
          return (b.publicMetadata?.rating || 0) - (a.publicMetadata?.rating || 0);
        case 'plays':
          return (b.publicMetadata?.plays || 0) - (a.publicMetadata?.plays || 0);
        case 'recent':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return (b.publicMetadata?.rating || 0) - (a.publicMetadata?.rating || 0);
      }
    });

    // Limit results
    return paths.slice(0, filters.limit || 20);
  }

  // AI conversation management
  saveAIConversation(sessionId: string, conversation: any): void {
    const stored = localStorage.getItem(this.aiConversationsKey);
    const conversations = stored ? JSON.parse(stored) : { sessions: [] };
    
    const existingIndex = conversations.sessions.findIndex(
      (s: any) => s.sessionId === sessionId
    );
    
    if (existingIndex >= 0) {
      conversations.sessions[existingIndex] = conversation;
    } else {
      conversations.sessions.push(conversation);
    }

    // Keep only last 10 conversations
    conversations.sessions = conversations.sessions.slice(-10);
    
    localStorage.setItem(this.aiConversationsKey, JSON.stringify(conversations));
  }

  getAIConversations(): any[] {
    const stored = localStorage.getItem(this.aiConversationsKey);
    if (!stored) return [];
    
    try {
      const conversations = JSON.parse(stored);
      return conversations.sessions || [];
    } catch (error) {
      console.error('Failed to parse AI conversations:', error);
      return [];
    }
  }

  // Helper methods
  extractTags(path: SavedPathData): string[] {
    const tags: string[] = [];
    
    // Add category as tag
    if (path.pathData?.category) {
      tags.push(path.pathData.category.toLowerCase());
    }
    
    // Add skills as tags
    if (path.pathData?.skills && Array.isArray(path.pathData.skills)) {
      tags.push(...path.pathData.skills.map((s: string) => s.toLowerCase()));
    }
    
    // Add story theme as tag
    if (path.storyContext?.theme) {
      tags.push(path.storyContext.theme.toLowerCase());
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  // Generate unique IDs
  generatePathId(): string {
    return `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateTaskId(pathId: string, sequenceNumber: number): string {
    return `task_${pathId}_${sequenceNumber}_${Date.now()}`;
  }

  // Storage management
  getStorageUsage(): { used: number; limit: number; percentage: number } {
    const used = new Blob([JSON.stringify(localStorage)]).size;
    const limit = 10 * 1024 * 1024; // 10MB approximate limit
    const percentage = (used / limit) * 100;
    
    return { used, limit, percentage };
  }

  clearOldData(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // Clear old public content
    const publicContent = this.loadPublicContent();
    const filteredPaths: Record<string, SavedPathData> = {};
    
    Object.entries(publicContent.paths).forEach(([id, path]) => {
      if (new Date(path.createdAt) > cutoffDate) {
        filteredPaths[id] = path;
      }
    });
    
    publicContent.paths = filteredPaths;
    localStorage.setItem(this.publicContentKey, JSON.stringify(publicContent));
    
    // Clear old conversations
    const conversations = this.getAIConversations();
    const recentConversations = conversations.filter(
      c => new Date(c.startedAt) > cutoffDate
    );
    
    localStorage.setItem(this.aiConversationsKey, JSON.stringify({
      sessions: recentConversations
    }));
  }
}