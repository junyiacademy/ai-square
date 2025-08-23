/**
 * PostgreSQL Discovery Repository Implementation
 * 實作 Discovery 模組的資料存取層
 */

import { Pool } from 'pg';
import { 
  IDiscoveryRepository,
  IDiscoveryScenario,
  ICareerRecommendation,
  IPortfolioItem,
  IDiscoveryMilestone
} from '@/types/discovery-types';
import { ITaskTemplate } from '@/types/unified-learning';
import { TaskType } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export class PostgreSQLDiscoveryRepository implements IDiscoveryRepository {
  constructor(private pool: Pool) {}

  /**
   * 獲取所有職涯路徑
   */
  async findCareerPaths(): Promise<IDiscoveryScenario[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM scenarios 
        WHERE mode = $1 AND status = $2
        ORDER BY created_at DESC
      `;
      const result = await client.query(query, ['discovery', 'active']);
      
      return result.rows.map(this.mapToDiscoveryScenario);
    } finally {
      client.release();
    }
  }

  /**
   * 根據 ID 獲取特定職涯路徑
   */
  async findCareerPathById(id: string): Promise<IDiscoveryScenario | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM scenarios 
        WHERE id = $1 AND mode = 'discovery'
      `;
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapToDiscoveryScenario(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * 根據 slug 獲取特定職涯路徑
   */
  async findCareerPathBySlug(slug: string): Promise<IDiscoveryScenario | null> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM scenarios 
        WHERE source_id = $1 AND mode = 'discovery'
      `;
      const result = await client.query(query, [slug]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapToDiscoveryScenario(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * 獲取個人化職涯推薦
   */
  async getCareerRecommendations(userId: string): Promise<ICareerRecommendation[]> {
    const client = await this.pool.connect();
    try {
      // Step 1: 獲取用戶技能評估結果
      const userSkillsQuery = `
        SELECT 
          DISTINCT ksa_code as skill,
          AVG(score) as score
        FROM evaluations e
        JOIN tasks t ON e.task_id = t.id
        WHERE e.user_id = $1 AND e.mode = 'assessment'
        GROUP BY ksa_code
      `;
      const userSkillsResult = await client.query(userSkillsQuery, [userId]);
      const userSkills = new Map(
        userSkillsResult.rows.map(row => [row.skill, row.score])
      );

      // Step 2: 獲取所有職涯路徑
      const careersQuery = `
        SELECT * FROM scenarios 
        WHERE mode = 'discovery' AND status = 'active'
      `;
      const careersResult = await client.query(careersQuery);
      
      // Step 3: 計算匹配分數並生成推薦
      const recommendations: ICareerRecommendation[] = [];
      
      for (const career of careersResult.rows) {
        const careerData = this.mapToDiscoveryScenario(career);
        const requiredSkills = careerData.discoveryData.requiredSkills || [];
        
        // 計算技能匹配度
        const skillMatches = requiredSkills.map(skill => ({
          skill,
          userLevel: userSkills.get(skill) || 0,
          requiredLevel: 80 // 預設需求等級
        }));
        
        // 計算總體匹配分數
        const matchScore = this.calculateMatchScore(skillMatches);
        
        // 生成推薦理由
        const reasons = this.generateRecommendationReasons(skillMatches);
        
        // 估算準備時間
        const estimatedTimeToReady = this.estimateTimeToReady(skillMatches);
        
        recommendations.push({
          careerPath: careerData.discoveryData.careerPath,
          matchScore,
          reasons,
          requiredSkills: skillMatches,
          estimatedTimeToReady,
          suggestedScenarios: [] // TODO: 實作相關場景推薦
        });
      }
      
      // 按匹配分數排序
      return recommendations.sort((a, b) => b.matchScore - a.matchScore);
    } finally {
      client.release();
    }
  }

  /**
   * 獲取用戶 Discovery 進度
   */
  async getUserDiscoveryProgress(userId: string): Promise<{
    exploredCareers: string[];
    completedMilestones: IDiscoveryMilestone[];
    portfolioItems: IPortfolioItem[];
    overallProgress: number;
  }> {
    const client = await this.pool.connect();
    try {
      // 獲取已探索的職涯
      const exploredQuery = `
        SELECT DISTINCT scenario_id 
        FROM programs 
        WHERE user_id = $1 AND mode = 'discovery' AND status != 'pending'
      `;
      const exploredResult = await client.query(exploredQuery, [userId]);
      const exploredCareers = exploredResult.rows.map(row => row.scenario_id);
      
      // 獲取已完成的里程碑
      const milestonesQuery = `
        SELECT * FROM user_achievements 
        WHERE user_id = $1 AND achievement_type = 'discovery_milestone'
        ORDER BY earned_at DESC
      `;
      const milestonesResult = await client.query(milestonesQuery, [userId]);
      const completedMilestones = milestonesResult.rows.map(this.mapToMilestone);
      
      // 暫時返回空的作品集項目，因為 portfolio_items 表尚未創建
      // TODO: 創建 portfolio_items 表後再啟用此功能
      const portfolioItems: IPortfolioItem[] = [];
      
      // 計算總體進度
      const overallProgress = this.calculateOverallProgress(
        exploredCareers.length,
        completedMilestones.length,
        portfolioItems.length
      );
      
      return {
        exploredCareers,
        completedMilestones,
        portfolioItems,
        overallProgress
      };
    } finally {
      client.release();
    }
  }

  /**
   * 新增作品集項目
   */
  async addPortfolioItem(
    userId: string, 
    item: Omit<IPortfolioItem, 'id' | 'createdAt'>
  ): Promise<IPortfolioItem> {
    // 暫時返回模擬的作品集項目，因為 portfolio_items 表尚未創建
    // TODO: 創建 portfolio_items 表後再實作此功能
    const mockPortfolioItem: IPortfolioItem = {
      id: uuidv4(),
      userId,
      title: item.title,
      description: item.description,
      taskId: item.taskId,
      artifacts: item.artifacts || [],
      skills: item.skills || [],
      createdAt: new Date().toISOString()
    };
    
    console.warn('Portfolio items table not yet created, returning mock data');
    return mockPortfolioItem;
  }

  /**
   * 更新作品集項目
   */
  async updatePortfolioItem(
    userId: string,
    itemId: string,
    updates: Partial<IPortfolioItem>
  ): Promise<IPortfolioItem> {
    // 暫時返回模擬的更新結果，因為 portfolio_items 表尚未創建
    // TODO: 創建 portfolio_items 表後再實作此功能
    console.warn('Portfolio items table not yet created, returning mock data');
    
    const mockItem: IPortfolioItem = {
      id: itemId,
      userId,
      title: updates.title || { en: 'Mock Portfolio Item' },
      description: updates.description || { en: 'Mock Description' },
      taskId: '',
      artifacts: updates.artifacts || [],
      skills: updates.skills || [],
      createdAt: new Date().toISOString()
    };
    
    return mockItem;
  }

  /**
   * 刪除作品集項目
   */
  async deletePortfolioItem(userId: string, itemId: string): Promise<void> {
    // 暫時不執行任何操作，因為 portfolio_items 表尚未創建
    // TODO: 創建 portfolio_items 表後再實作此功能
    console.warn('Portfolio items table not yet created, skipping delete operation');
  }

  /**
   * 獲取用戶所有作品集項目
   */
  async getPortfolioItems(userId: string): Promise<IPortfolioItem[]> {
    // 暫時返回空陣列，因為 portfolio_items 表尚未創建
    // TODO: 創建 portfolio_items 表後再實作此功能
    console.warn('Portfolio items table not yet created, returning empty array');
    return [];
  }

  // Private helper methods

  private mapToDiscoveryScenario(row: Record<string, unknown>): IDiscoveryScenario {
    return {
      id: row.id as string,
      mode: 'discovery',
      status: row.status as 'draft' | 'active' | 'archived',
      version: row.version as string,
      sourceType: row.source_type as 'yaml' | 'api' | 'ai-generated',
      sourcePath: row.source_path as string | undefined,
      sourceId: row.source_id as string | undefined,
      sourceMetadata: (row.source_metadata || {}) as Record<string, unknown>,
      title: row.title as Record<string, string>,
      description: row.description as Record<string, string>,
      objectives: row.objectives as string[],
      difficulty: row.difficulty as 'beginner' | 'intermediate' | 'advanced' | 'expert',
      estimatedMinutes: row.estimated_minutes as number,
      prerequisites: row.prerequisites as string[],
      taskTemplates: (row.task_templates as Array<Record<string, unknown>> || []).map((t): ITaskTemplate => ({
        id: t.id as string,
        title: t.title as Record<string, string>,
        type: t.type as TaskType,
        description: t.description as Record<string, string> | undefined,
        ...t
      })),
      taskCount: row.task_count as number,
      xpRewards: row.xp_rewards as Record<string, number>,
      unlockRequirements: row.unlock_requirements as Record<string, unknown>,
      pblData: (row.pbl_data || {}) as Record<string, unknown>,
      discoveryData: {
        careerPath: (row.discovery_data as Record<string, unknown>)?.careerPath as string || '',
        requiredSkills: (row.discovery_data as Record<string, unknown>)?.requiredSkills as string[] || [],
        industryInsights: (row.discovery_data as Record<string, unknown>)?.industryInsights as Record<string, unknown> || {},
        careerLevel: ((row.discovery_data as Record<string, unknown>)?.careerLevel as 'entry' | 'intermediate' | 'senior' | 'expert') || 'intermediate',
        estimatedSalaryRange: (row.discovery_data as Record<string, unknown>)?.estimatedSalaryRange as { min: number; max: number; currency: string; } | undefined,
        relatedCareers: (row.discovery_data as Record<string, unknown>)?.relatedCareers as string[] || [],
        dayInLife: (row.discovery_data as Record<string, unknown>)?.dayInLife as Record<string, string> | undefined,
        challenges: (row.discovery_data as Record<string, unknown>)?.challenges as Record<string, string[]> | undefined,
        rewards: (row.discovery_data as Record<string, unknown>)?.rewards as Record<string, string[]> | undefined
      },
      assessmentData: (row.assessment_data || {}) as Record<string, unknown>,
      aiModules: row.ai_modules as Record<string, unknown>,
      resources: row.resources as Array<Record<string, unknown>>,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      metadata: (row.metadata || {}) as Record<string, unknown>
    };
  }

  private mapToMilestone(row: Record<string, unknown>): IDiscoveryMilestone {
    return {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      achievedAt: row.achieved_at as string,
      criteria: row.criteria as Record<string, unknown>,
      rewards: {
        xp: (row.rewards as Record<string, unknown>)?.xp as number || 0,
        badges: (row.rewards as Record<string, unknown>)?.badges as string[] | undefined,
        unlocks: (row.rewards as Record<string, unknown>)?.unlocks as string[] | undefined
      }
    };
  }

  private mapToPortfolioItem(row: Record<string, unknown>): IPortfolioItem {
    return {
      id: row.id as string,
      title: row.title as string,
      description: row.description as string,
      taskId: row.task_id as string,
      createdAt: row.created_at as string,
      artifacts: typeof row.artifacts === 'string' 
        ? JSON.parse(row.artifacts as string) 
        : row.artifacts as unknown[],
      skills: typeof row.skills === 'string' 
        ? JSON.parse(row.skills as string) 
        : row.skills as string[],
      feedback: row.feedback as string | undefined
    };
  }

  private calculateMatchScore(skillMatches: Array<{userLevel: number; requiredLevel: number}>): number {
    if (skillMatches.length === 0) return 0;
    
    const totalScore = skillMatches.reduce((sum, match) => {
      // 計算每個技能的匹配分數，考慮技能差距
      const gap = match.requiredLevel - match.userLevel;
      // 使用更平滑的計分曲線，每10分差距降低15分
      const score = Math.max(0, 100 - (gap * 1.5));
      return sum + score;
    }, 0);
    
    // 計算平均分數
    const baseScore = totalScore / skillMatches.length;
    
    // 應用職級不匹配懲罰（如果需要的話）
    // 這裡預留給未來實作
    
    return Math.round(baseScore);
  }

  private generateRecommendationReasons(
    skillMatches: Array<{skill: string; userLevel: number; requiredLevel: number}>
  ): string[] {
    const reasons: string[] = [];
    
    // 找出強項技能
    const strongSkills = skillMatches
      .filter(m => m.userLevel >= m.requiredLevel)
      .map(m => m.skill);
    
    if (strongSkills.length > 0) {
      reasons.push(`You have strong skills in ${strongSkills.join(', ')}`);
    }
    
    // 找出需要提升的技能
    const needsImprovement = skillMatches
      .filter(m => m.userLevel < m.requiredLevel && m.userLevel > 0)
      .map(m => m.skill);
    
    if (needsImprovement.length > 0) {
      reasons.push(`You can build on your existing ${needsImprovement.join(', ')} skills`);
    }
    
    return reasons;
  }

  private estimateTimeToReady(skillMatches: Array<{userLevel: number; requiredLevel: number}>): number {
    // 估算每個技能差距需要的週數
    const totalWeeks = skillMatches.reduce((sum, match) => {
      const gap = Math.max(0, match.requiredLevel - match.userLevel);
      const weeksNeeded = Math.ceil(gap / 10); // 每10分差距需要1週
      return sum + weeksNeeded;
    }, 0);
    
    return Math.max(1, totalWeeks);
  }

  private calculateOverallProgress(
    exploredCareers: number,
    milestones: number,
    portfolioItems: number
  ): number {
    // 簡單的進度計算公式
    const careerProgress = Math.min(exploredCareers * 10, 30); // 最多30%
    const milestoneProgress = Math.min(milestones * 5, 40); // 最多40%
    const portfolioProgress = Math.min(portfolioItems * 10, 30); // 最多30%
    
    return Math.min(100, careerProgress + milestoneProgress + portfolioProgress);
  }
}