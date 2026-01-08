/**
 * ChatContextBuilderService
 * Builds context from user data, progress, and recommendations
 */

export interface UserContext {
  identity: string;
  goals: string[];
  assessmentScore: number | null;
  domainScores: Record<string, number>;
  weakDomains: string[];
  recentActivities: unknown[];
  learningStyle: string;
  completedPBLs: string[];
  currentProgress: Record<string, unknown>;
}

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

export class ChatContextBuilderService {
  constructor(
    private bucket: {
      file: (path: string) => {
        exists: () => Promise<[boolean]>;
        download: () => Promise<[Buffer]>;
      };
    },
  ) {}

  /**
   * Sanitize email for file path
   */
  private sanitizeEmail(email: string): string {
    return email.replace("@", "_at_").replace(/\./g, "_");
  }

  /**
   * Build comprehensive user context
   */
  async buildContext(userEmail: string): Promise<UserContext | null> {
    try {
      const sanitizedEmail = this.sanitizeEmail(userEmail);

      // Load user data
      const userFile = this.bucket.file(
        `user/${sanitizedEmail}/user_data.json`,
      );
      const [exists] = await userFile.exists();

      if (!exists) {
        return null;
      }

      const [data] = await userFile.download();
      const userData = JSON.parse(data.toString()) as {
        identity?: string;
        goals?: string[];
        assessmentResult?: {
          overallScore?: number;
          domainScores?: Record<string, number>;
        };
        completedPBLs?: string[];
      };

      // Load memory
      const memory = await this.getUserMemory(userEmail);

      // Build context
      const domainScores = userData.assessmentResult?.domainScores || {};
      const weakDomains = Object.entries(domainScores)
        .filter(([, score]) => typeof score === "number" && score < 60)
        .map(([domain]) => domain);

      const context: UserContext = {
        identity: userData.identity || "learner",
        goals: userData.goals || [],
        assessmentScore: userData.assessmentResult?.overallScore || null,
        domainScores,
        weakDomains,
        recentActivities: memory?.shortTerm.recentActivities || [],
        learningStyle: memory?.longTerm.learningStyle || "balanced",
        completedPBLs: userData.completedPBLs || [],
        currentProgress: memory?.shortTerm.currentProgress || {},
      };

      return context;
    } catch (error) {
      console.error("Error building context:", error);
      return null;
    }
  }

  /**
   * Get user memory
   */
  private async getUserMemory(userEmail: string): Promise<UserMemory | null> {
    try {
      const sanitizedEmail = this.sanitizeEmail(userEmail);

      const shortTermFile = this.bucket.file(
        `user/${sanitizedEmail}/memory/short_term.json`,
      );
      const longTermFile = this.bucket.file(
        `user/${sanitizedEmail}/memory/long_term.json`,
      );

      const [shortTermExists] = await shortTermFile.exists();
      const [longTermExists] = await longTermFile.exists();

      const memory: UserMemory = {
        shortTerm: {
          recentActivities: [],
          currentProgress: {},
          recentTopics: [],
          lastUpdated: new Date().toISOString(),
        },
        longTerm: {
          profile: {},
          learningStyle: "balanced",
          achievements: [],
          preferences: {},
          lastUpdated: new Date().toISOString(),
        },
      };

      if (shortTermExists) {
        const [shortTermData] = await shortTermFile.download();
        memory.shortTerm = JSON.parse(
          shortTermData.toString(),
        ) as UserMemory["shortTerm"];
      }

      if (longTermExists) {
        const [longTermData] = await longTermFile.download();
        memory.longTerm = JSON.parse(
          longTermData.toString(),
        ) as UserMemory["longTerm"];
      }

      return memory;
    } catch (error) {
      console.error("Error loading user memory:", error);
      return null;
    }
  }

  /**
   * Build system prompt with user context
   */
  buildSystemPrompt(context: UserContext): string {
    const weakDomainsText =
      context.weakDomains.length > 0
        ? context.weakDomains.join(", ")
        : "None - all domains are strong!";

    const assessmentScoreText =
      context.assessmentScore !== null
        ? `${context.assessmentScore}%`
        : "Not yet assessed";

    const systemPrompt = `You are an AI learning advisor for AI Square platform. You help users with their AI literacy learning journey.

User Profile:
- Identity: ${context.identity}
- Learning Goals: ${context.goals.join(", ")}
- Overall Assessment Score: ${assessmentScoreText}
- Weak Domains: ${weakDomainsText}
- Learning Style: ${context.learningStyle}

Your role:
1. Provide personalized learning guidance based on their profile and progress
2. Help them choose appropriate PBL scenarios
3. Offer encouragement and motivation
4. Answer questions about AI concepts
5. Suggest next steps in their learning journey

Guidelines:
- Be supportive and encouraging
- Provide concrete, actionable advice
- Reference their specific assessment results when relevant
- Adapt your communication style to their identity (student, teacher, professional, learner)
- Don't overwhelm with too much information at once
- Use examples relevant to their context`;

    return systemPrompt;
  }
}
