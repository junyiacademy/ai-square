import { Storage } from '@google-cloud/storage';

interface ShortTermMemory {
  recentActivities: Array<{
    type: string;
    timestamp: string;
    details: Record<string, unknown>;
  }>;
  currentProgress: {
    lastScenario?: string;
    completedTasks?: string[];
    assessmentDate?: string;
  };
  recentTopics: string[];
  lastUpdated: string;
}

interface LongTermMemory {
  profile: {
    identity: string;
    goals: string[];
    interests: string[];
    learningPreferences: string[];
  };
  learningStyle: string;
  achievements: Array<{
    type: string;
    date: string;
    details: Record<string, unknown>;
  }>;
  preferences: {
    preferredDifficulty?: string;
    preferredDomains?: string[];
    preferredDuration?: number;
  };
  lastUpdated: string;
}

export interface UserMemory {
  shortTerm: ShortTermMemory;
  longTerm: LongTermMemory;
}

export class MemoryService {
  private static instance: MemoryService;
  private storage: Storage | null = null;
  private bucket: any = null;

  private constructor() {
    if (typeof window === 'undefined') {
      // Server-side only
      this.storage = new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      });
      this.bucket = this.storage.bucket('ai-square-db');
    }
  }

  static getInstance(): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService();
    }
    return MemoryService.instance;
  }

  private sanitizeEmail(email: string): string {
    return email.replace('@', '_at_').replace(/\./g, '_');
  }

  async loadMemory(userEmail: string): Promise<UserMemory> {
    if (!this.bucket) {
      throw new Error('Memory service not available on client side');
    }

    const sanitizedEmail = this.sanitizeEmail(userEmail);
    
    const defaultMemory: UserMemory = {
      shortTerm: {
        recentActivities: [],
        currentProgress: {},
        recentTopics: [],
        lastUpdated: new Date().toISOString()
      },
      longTerm: {
        profile: {
          identity: '',
          goals: [],
          interests: [],
          learningPreferences: []
        },
        learningStyle: 'balanced',
        achievements: [],
        preferences: {},
        lastUpdated: new Date().toISOString()
      }
    };

    try {
      // Load short-term memory
      const shortTermFile = this.bucket.file(`user/${sanitizedEmail}/memory/short_term.json`);
      const [shortTermExists] = await shortTermFile.exists();
      
      if (shortTermExists) {
        const [shortTermData] = await shortTermFile.download();
        defaultMemory.shortTerm = JSON.parse(shortTermData.toString());
      }
      
      // Load long-term memory
      const longTermFile = this.bucket.file(`user/${sanitizedEmail}/memory/long_term.json`);
      const [longTermExists] = await longTermFile.exists();
      
      if (longTermExists) {
        const [longTermData] = await longTermFile.download();
        defaultMemory.longTerm = JSON.parse(longTermData.toString());
      }
    } catch (error) {
      console.error('Error loading memory:', error);
    }
    
    return defaultMemory;
  }

  async updateShortTermMemory(userEmail: string, updates: Partial<ShortTermMemory>): Promise<void> {
    if (!this.bucket) {
      throw new Error('Memory service not available on client side');
    }

    const sanitizedEmail = this.sanitizeEmail(userEmail);
    const memory = await this.loadMemory(userEmail);
    
    // Merge updates
    memory.shortTerm = {
      ...memory.shortTerm,
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    
    // Save updated memory
    const shortTermFile = this.bucket.file(`user/${sanitizedEmail}/memory/short_term.json`);
    await shortTermFile.save(JSON.stringify(memory.shortTerm, null, 2));
  }

  async updateLongTermMemory(userEmail: string, updates: Partial<LongTermMemory>): Promise<void> {
    if (!this.bucket) {
      throw new Error('Memory service not available on client side');
    }

    const sanitizedEmail = this.sanitizeEmail(userEmail);
    const memory = await this.loadMemory(userEmail);
    
    // Deep merge for nested objects
    memory.longTerm = {
      ...memory.longTerm,
      ...updates,
      profile: {
        ...memory.longTerm.profile,
        ...(updates.profile || {})
      },
      preferences: {
        ...memory.longTerm.preferences,
        ...(updates.preferences || {})
      },
      lastUpdated: new Date().toISOString()
    };
    
    // Save updated memory
    const longTermFile = this.bucket.file(`user/${sanitizedEmail}/memory/long_term.json`);
    await longTermFile.save(JSON.stringify(memory.longTerm, null, 2));
  }

  async addActivity(userEmail: string, activity: {
    type: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    const memory = await this.loadMemory(userEmail);
    
    // Add new activity (keep last 50)
    memory.shortTerm.recentActivities = [
      {
        ...activity,
        timestamp: new Date().toISOString()
      },
      ...memory.shortTerm.recentActivities
    ].slice(0, 50);
    
    await this.updateShortTermMemory(userEmail, {
      recentActivities: memory.shortTerm.recentActivities
    });
  }

  async addAchievement(userEmail: string, achievement: {
    type: string;
    details: Record<string, unknown>;
  }): Promise<void> {
    const memory = await this.loadMemory(userEmail);
    
    // Add new achievement
    memory.longTerm.achievements = [
      {
        ...achievement,
        date: new Date().toISOString()
      },
      ...memory.longTerm.achievements
    ];
    
    await this.updateLongTermMemory(userEmail, {
      achievements: memory.longTerm.achievements
    });
  }

  async compactMemory(userEmail: string): Promise<void> {
    const memory = await this.loadMemory(userEmail);
    
    // Analyze short-term patterns
    const activityTypes = memory.shortTerm.recentActivities
      .map(a => a.type)
      .reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    // Determine learning style based on activities
    let learningStyle = 'balanced';
    if (activityTypes['pbl_scenario'] > activityTypes['reading']) {
      learningStyle = 'hands-on';
    } else if (activityTypes['reading'] > activityTypes['pbl_scenario']) {
      learningStyle = 'theoretical';
    }
    
    // Update long-term memory with insights
    await this.updateLongTermMemory(userEmail, {
      learningStyle
    });
    
    // Clean up old short-term activities (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    memory.shortTerm.recentActivities = memory.shortTerm.recentActivities
      .filter(a => new Date(a.timestamp) > thirtyDaysAgo);
    
    await this.updateShortTermMemory(userEmail, {
      recentActivities: memory.shortTerm.recentActivities
    });
  }
}