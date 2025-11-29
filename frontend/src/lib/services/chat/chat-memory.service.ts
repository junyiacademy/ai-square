/**
 * ChatMemoryService
 * Manages user conversation memory and history
 */

interface UserMemory {
  shortTerm: {
    recentActivities: unknown[];
    currentProgress: Record<string, unknown>;
    recentTopics: string[];
    lastUpdated: string;
  };
  longTerm: {
    profile: unknown;
    learningStyle: string;
    achievements: unknown[];
    preferences: unknown;
    lastUpdated: string;
  };
}

export class ChatMemoryService {
  constructor(private bucket: { file: (path: string) => { exists: () => Promise<[boolean]>; download: () => Promise<[Buffer]>; save: (data: string) => Promise<void> } }) {}

  /**
   * Sanitize email for file path
   */
  private sanitizeEmail(email: string): string {
    return email.replace('@', '_at_').replace(/\./g, '_');
  }

  /**
   * Update short-term memory with recent topic
   */
  async updateShortTermMemory(userEmail: string, message: string): Promise<void> {
    try {
      const memory = await this.getUserMemory(userEmail);

      if (!memory) {
        // Create new memory
        const newMemory = {
          recentActivities: [],
          currentProgress: {},
          recentTopics: [message.substring(0, 100)],
          lastUpdated: new Date().toISOString()
        };

        const sanitizedEmail = this.sanitizeEmail(userEmail);
        const shortTermFile = this.bucket.file(`user/${sanitizedEmail}/memory/short_term.json`);
        await shortTermFile.save(JSON.stringify(newMemory, null, 2));
        return;
      }

      // Add to recent topics (keep last 10)
      memory.shortTerm.recentTopics = [
        message.substring(0, 100),
        ...memory.shortTerm.recentTopics
      ].slice(0, 10);

      memory.shortTerm.lastUpdated = new Date().toISOString();

      // Save updated memory
      const sanitizedEmail = this.sanitizeEmail(userEmail);
      const shortTermFile = this.bucket.file(`user/${sanitizedEmail}/memory/short_term.json`);
      await shortTermFile.save(JSON.stringify(memory.shortTerm, null, 2));
    } catch (error) {
      console.error('Error updating short-term memory:', error);
    }
  }

  /**
   * Get user memory
   */
  async getUserMemory(userEmail: string): Promise<UserMemory | null> {
    try {
      const sanitizedEmail = this.sanitizeEmail(userEmail);

      const shortTermFile = this.bucket.file(`user/${sanitizedEmail}/memory/short_term.json`);
      const longTermFile = this.bucket.file(`user/${sanitizedEmail}/memory/long_term.json`);

      const [shortTermExists] = await shortTermFile.exists();
      const [longTermExists] = await longTermFile.exists();

      const memory: UserMemory = {
        shortTerm: {
          recentActivities: [],
          currentProgress: {},
          recentTopics: [],
          lastUpdated: new Date().toISOString()
        },
        longTerm: {
          profile: {},
          learningStyle: '',
          achievements: [],
          preferences: {},
          lastUpdated: new Date().toISOString()
        }
      };

      if (shortTermExists) {
        const [shortTermData] = await shortTermFile.download();
        memory.shortTerm = JSON.parse(shortTermData.toString()) as UserMemory['shortTerm'];
      }

      if (longTermExists) {
        const [longTermData] = await longTermFile.download();
        memory.longTerm = JSON.parse(longTermData.toString()) as UserMemory['longTerm'];
      }

      return memory;
    } catch (error) {
      console.error('Error loading user memory:', error);
      return null;
    }
  }
}
