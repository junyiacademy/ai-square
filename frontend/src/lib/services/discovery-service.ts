/**
 * Discovery Service
 * 處理 Discovery 模組的業務邏輯
 */

import { 
  IDiscoveryRepository,
  IDiscoveryScenario,
  IDiscoveryProgram,
  ICareerRecommendation,
  ISkillGap,
  IPortfolioItem
} from '@/types/discovery-types';
import { IUserRepository } from '@/lib/repositories/interfaces';
import { BaseAIService } from '@/lib/abstractions/base-ai-service';
import { UnifiedEvaluationSystem } from './evaluation/unified-evaluation-system';
import { v4 as uuidv4 } from 'uuid';

export interface IDiscoveryService {
  // Career exploration
  exploreCareer(userId: string, careerId: string): Promise<IDiscoveryProgram>;
  getPersonalizedRecommendations(userId: string): Promise<ICareerRecommendation[]>;
  
  // Skill analysis
  analyzeSkillGaps(userId: string, careerId: string): Promise<ISkillGap[]>;
  calculateCareerReadiness(userId: string, careerId: string): Promise<number>;
  
  // Progress tracking
  calculateOverallProgress(userId: string): Promise<number>;
  
  // Portfolio management
  createPortfolioFromTask(userId: string, taskId: string, artifacts: unknown[]): Promise<IPortfolioItem>;
  
  // AI-powered features
  generateCareerInsights(userId: string, careerId: string): Promise<string>;
}

export class DiscoveryService implements IDiscoveryService {
  constructor(
    private discoveryRepo: IDiscoveryRepository,
    private userRepo: IUserRepository,
    private aiService: BaseAIService,
    private evaluationSystem: UnifiedEvaluationSystem
  ) {}

  /**
   * 開始探索職涯
   */
  async exploreCareer(userId: string, careerId: string): Promise<IDiscoveryProgram> {
    // 驗證用戶
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // 獲取職涯場景
    const career = await this.discoveryRepo.findCareerPathById(careerId);
    if (!career) {
      throw new Error('Career path not found');
    }

    // 分析技能差距
    const skillGaps = await this.analyzeSkillGaps(userId, careerId);
    
    // 創建探索程式
    const program: IDiscoveryProgram = {
      id: uuidv4(),
      scenarioId: careerId,
      userId,
      mode: 'discovery',
      status: 'active',
      currentTaskIndex: 0,
      completedTaskCount: 0,
      totalTaskCount: career.taskTemplates?.length || 0,
      totalScore: 0,
      domainScores: {},
      xpEarned: 0,
      badgesEarned: [],
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      timeSpentSeconds: 0,
      pblData: {},
      discoveryData: {
        explorationPath: [careerId],
        milestones: [],
        personalityMatch: await this.calculatePersonalityMatch(userId, career),
        skillGapAnalysis: skillGaps,
        careerReadiness: await this.calculateCareerReadiness(userId, careerId)
      },
      assessmentData: {},
      metadata: {
        careerTitle: career.title,
        careerLevel: career.discoveryData.careerLevel
      }
    };

    return program;
  }

  /**
   * 獲取個人化職涯推薦
   */
  async getPersonalizedRecommendations(userId: string): Promise<ICareerRecommendation[]> {
    // 使用 Repository 的推薦功能
    const recommendations = await this.discoveryRepo.getCareerRecommendations(userId);
    
    // 增強推薦結果
    const enhancedRecommendations = await Promise.all(
      recommendations.map(async (rec) => {
        // TODO: 使用 AI 生成更詳細的推薦理由
        // const prompt = `Based on user's career match for ${rec.careerPath} with score ${rec.matchScore}, provide 2 personalized insights.`;
        // const aiResponse = await this.aiService.generateContent(prompt, {
        //   temperature: 0.7,
        //   maxTokens: 200
        // });
        
        // For now, use placeholder insights
        const aiInsights = [
          'Your analytical mindset is perfect for this role',
          'This career offers excellent growth opportunities'
        ];
        
        return {
          ...rec,
          reasons: [...rec.reasons, ...aiInsights],
          suggestedScenarios: await this.getSuggestedScenarios(rec.careerPath)
        };
      })
    );

    // 根據用戶偏好排序
    return this.sortByUserPreferences(enhancedRecommendations, userId);
  }

  /**
   * 分析技能差距
   */
  async analyzeSkillGaps(userId: string, careerId: string): Promise<ISkillGap[]> {
    // 獲取職涯所需技能
    const career = await this.discoveryRepo.findCareerPathById(careerId);
    if (!career) {
      throw new Error('Career path not found');
    }

    // 獲取用戶當前技能水平
    const userSkills = await this.getUserSkillLevels(userId);
    
    // 分析差距
    const skillGaps: ISkillGap[] = career.discoveryData.requiredSkills.map(skill => {
      const currentLevel = userSkills.get(skill) || 0;
      const requiredLevel = this.getRequiredSkillLevel(career.discoveryData.careerLevel);
      
      return {
        skill,
        currentLevel,
        requiredLevel,
        importance: this.determineSkillImportance(skill, career),
        suggestedResources: this.getSuggestedResources(skill, currentLevel, requiredLevel)
      };
    });

    // 按重要性排序
    return skillGaps.sort((a, b) => {
      const importanceOrder = { 'critical': 0, 'important': 1, 'nice-to-have': 2 };
      return importanceOrder[a.importance] - importanceOrder[b.importance];
    });
  }

  /**
   * 計算職涯準備度
   */
  async calculateCareerReadiness(userId: string, careerId: string): Promise<number> {
    const skillGaps = await this.analyzeSkillGaps(userId, careerId);
    
    // 如果沒有技能要求，返回 0
    if (skillGaps.length === 0) {
      return 0;
    }
    
    // 計算各技能的準備度權重
    const readinessScores = skillGaps.map(gap => {
      const readiness = (gap.currentLevel / gap.requiredLevel) * 100;
      const weight = gap.importance === 'critical' ? 3 : 
                    gap.importance === 'important' ? 2 : 1;
      
      return {
        score: Math.min(100, readiness),
        weight
      };
    });

    // 加權平均
    const totalWeight = readinessScores.reduce((sum, item) => sum + item.weight, 0);
    const weightedSum = readinessScores.reduce((sum, item) => sum + (item.score * item.weight), 0);
    
    return Math.round(weightedSum / totalWeight);
  }


  /**
   * 計算總體進度
   */
  async calculateOverallProgress(userId: string): Promise<number> {
    const progress = await this.discoveryRepo.getUserDiscoveryProgress(userId);
    return progress.overallProgress;
  }

  /**
   * 從任務創建作品集項目
   */
  async createPortfolioFromTask(
    userId: string, 
    taskId: string, 
    artifacts: unknown[]
  ): Promise<IPortfolioItem> {
    // TODO: 驗證任務完成狀態
    // TODO: 處理檔案上傳
    
    const portfolioItem = await this.discoveryRepo.addPortfolioItem(userId, {
      title: 'Task Portfolio Item', // TODO: 從任務獲取標題
      description: 'Created from task completion',
      taskId,
      artifacts,
      skills: [], // TODO: 從任務提取技能
      feedback: undefined
    });

    return portfolioItem;
  }


  /**
   * AI 生成職涯洞察
   */
  async generateCareerInsights(userId: string, careerId: string): Promise<string> {
    const career = await this.discoveryRepo.findCareerPathById(careerId);
    const userProgress = await this.discoveryRepo.getUserDiscoveryProgress(userId);
    const skillGaps = await this.analyzeSkillGaps(userId, careerId);

    const prompt = `
      Based on the user's exploration of ${career?.title.en} career path:
      - Explored careers: ${userProgress.exploredCareers.length}
      - Portfolio items: ${userProgress.portfolioItems.length}
      - Key skill gaps: ${skillGaps.slice(0, 3).map(g => `${g.skill} (${g.currentLevel}/${g.requiredLevel})`).join(', ')}
      
      Provide personalized insights about:
      1. Their fit for this career
      2. Key strengths they can leverage
      3. Most important areas to focus on
      4. Realistic timeline expectations
    `;

    const insights = await this.aiService.generateContent(prompt, {
      temperature: 0.7,
      maxTokens: 500
    });

    return insights;
  }


  // Private helper methods

  private async getUserSkillLevels(_userId: string): Promise<Map<string, number>> {
    // TODO: 從評估結果獲取用戶技能水平
    // 暫時返回模擬資料
    return new Map([
      ['JavaScript', 75],
      ['Python', 60],
      ['Communication', 80],
      ['Leadership', 70]
    ]);
  }

  private getRequiredSkillLevel(careerLevel: string): number {
    const levels: Record<string, number> = {
      'entry': 60,
      'intermediate': 75,
      'senior': 85,
      'expert': 95
    };
    return levels[careerLevel] || 75;
  }

  private determineSkillImportance(
    skill: string, 
    _career: IDiscoveryScenario
  ): 'critical' | 'important' | 'nice-to-have' {
    // TODO: 實作更複雜的重要性判斷邏輯
    const criticalSkills = ['Communication', 'Problem Solving'];
    const importantSkills = ['Leadership', 'Teamwork'];
    
    if (criticalSkills.includes(skill)) return 'critical';
    if (importantSkills.includes(skill)) return 'important';
    return 'nice-to-have';
  }

  private getSuggestedResources(
    skill: string, 
    _currentLevel: number, 
    _requiredLevel: number
  ): string[] {
    // TODO: 實作資源推薦邏輯
    return [
      `Online course: Advanced ${skill}`,
      `Practice project: Build with ${skill}`,
      `Mentorship: ${skill} expert guidance`
    ];
  }

  private async calculatePersonalityMatch(
    _userId: string, 
    _career: IDiscoveryScenario
  ): Promise<number> {
    // TODO: 實作性格匹配演算法
    return Math.floor(Math.random() * 30) + 70; // 70-100
  }


  private async getSuggestedScenarios(careerPath: string): Promise<string[]> {
    // TODO: 獲取相關學習場景
    return [`intro-to-${careerPath}`, `${careerPath}-fundamentals`];
  }

  private sortByUserPreferences(
    recommendations: ICareerRecommendation[],
    _userId: string
  ): ICareerRecommendation[] {
    // TODO: 根據用戶偏好排序
    return recommendations.sort((a, b) => b.matchScore - a.matchScore);
  }
}