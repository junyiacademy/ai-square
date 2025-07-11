/**
 * Index Service for GCS v2
 * Provides fast bidirectional queries for UUID relationships
 */

import { StorageService } from '@/lib/abstractions/storage-service';

interface UserIndex {
  userId: string;
  email: string;
  programs: {
    programId: string;
    scenarioId: string;
    status: string;
    startedAt: string;
    completedAt?: string;
  }[];
  lastUpdated: string;
}

interface ScenarioStats {
  scenarioId: string;
  totalPrograms: number;
  activePrograms: number;
  completedPrograms: number;
  averageCompletionTime?: number;
  averageScore?: number;
  lastActivity: string;
}

interface DailyActivity {
  date: string; // YYYY-MM-DD
  activities: {
    type: 'program_started' | 'program_completed' | 'task_completed' | 'evaluation_created';
    userId: string;
    timestamp: string;
    entityId: string;
    metadata?: Record<string, any>;
  }[];
}

export class IndexService {
  constructor(private storage: StorageService) {}

  // ===== User Index =====
  
  async getUserIndex(userId: string): Promise<UserIndex | null> {
    try {
      return await this.storage.read<UserIndex>(`v2/indexes/users/${userId}.json`);
    } catch {
      return null;
    }
  }

  async updateUserIndex(userId: string, email: string, programData: {
    programId: string;
    scenarioId: string;
    status: string;
    startedAt: string;
    completedAt?: string;
  }): Promise<void> {
    let index = await this.getUserIndex(userId) || {
      userId,
      email,
      programs: [],
      lastUpdated: new Date().toISOString()
    };

    // Update or add program
    const existingIndex = index.programs.findIndex(p => p.programId === programData.programId);
    if (existingIndex >= 0) {
      index.programs[existingIndex] = programData;
    } else {
      index.programs.push(programData);
    }

    index.lastUpdated = new Date().toISOString();
    await this.storage.write(`v2/indexes/users/${userId}.json`, index);
  }

  // ===== Scenario Stats =====
  
  async getScenarioStats(scenarioId: string): Promise<ScenarioStats | null> {
    try {
      return await this.storage.read<ScenarioStats>(`v2/indexes/scenarios/${scenarioId}-stats.json`);
    } catch {
      return null;
    }
  }

  async updateScenarioStats(scenarioId: string, updates: Partial<ScenarioStats>): Promise<void> {
    const stats = await this.getScenarioStats(scenarioId) || {
      scenarioId,
      totalPrograms: 0,
      activePrograms: 0,
      completedPrograms: 0,
      lastActivity: new Date().toISOString()
    };

    Object.assign(stats, updates, {
      lastActivity: new Date().toISOString()
    });

    await this.storage.write(`v2/indexes/scenarios/${scenarioId}-stats.json`, stats);
  }

  // ===== Daily Activity =====
  
  async getDailyActivity(date: string): Promise<DailyActivity | null> {
    try {
      return await this.storage.read<DailyActivity>(`v2/indexes/activity/${date}.json`);
    } catch {
      return null;
    }
  }

  async addActivity(activity: {
    type: 'program_started' | 'program_completed' | 'task_completed' | 'evaluation_created';
    userId: string;
    entityId: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    let dailyActivity = await this.getDailyActivity(today) || {
      date: today,
      activities: []
    };

    dailyActivity.activities.push({
      ...activity,
      timestamp: new Date().toISOString()
    });

    await this.storage.write(`v2/indexes/activity/${today}.json`, dailyActivity);
  }

  // ===== Query Helpers =====
  
  /**
   * Get all programs for a user across all scenarios
   */
  async getUserPrograms(userId: string): Promise<Array<{
    programId: string;
    scenarioId: string;
    status: string;
    startedAt: string;
    completedAt?: string;
  }>> {
    const index = await this.getUserIndex(userId);
    return index?.programs || [];
  }

  /**
   * Get activity for a date range
   */
  async getActivityRange(startDate: string, endDate: string): Promise<DailyActivity[]> {
    const activities: DailyActivity[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      const activity = await this.getDailyActivity(dateStr);
      if (activity) {
        activities.push(activity);
      }
    }
    
    return activities;
  }

  /**
   * Get user's recent activity
   */
  async getUserRecentActivity(userId: string, days: number = 7): Promise<Array<{
    type: string;
    timestamp: string;
    entityId: string;
    metadata?: Record<string, any>;
  }>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const activities = await this.getActivityRange(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
    
    return activities
      .flatMap(day => day.activities)
      .filter(activity => activity.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // ===== Maintenance =====
  
  /**
   * Rebuild user index from programs
   */
  async rebuildUserIndex(userId: string, programs: Array<{
    id: string;
    scenarioId: string;
    status: string;
    startedAt: string;
    completedAt?: string;
  }>): Promise<void> {
    const index: UserIndex = {
      userId,
      email: userId, // Will be updated with actual email
      programs: programs.map(p => ({
        programId: p.id,
        scenarioId: p.scenarioId,
        status: p.status,
        startedAt: p.startedAt,
        completedAt: p.completedAt
      })),
      lastUpdated: new Date().toISOString()
    };
    
    await this.storage.write(`v2/indexes/users/${userId}.json`, index);
  }

  /**
   * Clean up old activity logs
   */
  async cleanupOldActivity(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    // This would need to list all activity files and delete old ones
    // Implementation depends on storage service capabilities
    console.log(`Would clean up activity older than ${cutoffDate.toISOString()}`);
  }
}