/**
 * 統一評估系統實作
 * 提供跨模組的評估功能
 */

import { 
  IEvaluationSystem, 
  IEvaluation, 
  ITask, 
  IProgram, 
  IEvaluationContext,
  IInteraction
} from '@/types/unified-learning';
import { BaseAIService } from '@/lib/abstractions/base-ai-service';
import type { LearningMode } from '@/types/database';
import { v4 as uuidv4 } from 'uuid';

export class UnifiedEvaluationSystem implements IEvaluationSystem {
  constructor(private aiService: BaseAIService) {}

  /**
   * Task 級別評估
   */
  async evaluateTask(task: ITask, context: IEvaluationContext): Promise<IEvaluation> {
    // 根據不同的 scenario 類型選擇評估策略
    switch (context.scenario.mode) {
      case 'pbl':
        return this.evaluatePBLTask(task, context);
      case 'assessment':
        return this.evaluateAssessmentTask(task, context);
      case 'discovery':
        return this.evaluateDiscoveryTask(task, context);
      default:
        return this.evaluateGenericTask(task, context);
    }
  }

  /**
   * Program 級別總結評估
   */
  async evaluateProgram(program: IProgram, taskEvaluations: IEvaluation[]): Promise<IEvaluation> {
    // 彙整所有 task 評估
    const scores = taskEvaluations
      .filter(e => e.score !== undefined)
      .map(e => e.score!);
    
    const averageScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : undefined;

    // 彙整維度分數
    const dimensionMap = new Map<string, { total: number; count: number; maxTotal: number }>();
    
    taskEvaluations.forEach(evaluation => {
      if (evaluation.domainScores) {
        Object.entries(evaluation.domainScores).forEach(([dim, score]: [string, number]) => {
          const existing = dimensionMap.get(dim) || { total: 0, count: 0, maxTotal: 0 };
          existing.total += score;
          existing.count += 1;
          existing.maxTotal += 100; // Assuming max score is 100
          dimensionMap.set(dim, existing);
        });
      }
    });

    // Convert to Record<string, number> for domainScores
    const domainScores: Record<string, number> = {};
    Array.from(dimensionMap.entries()).forEach(([dimension, data]) => {
      domainScores[dimension] = data.total / data.count;
    });

    // Store detailed dimension data in metadata
    const aggregatedDimensions: { dimension: string; score: number; feedback: string; maxScore?: number }[] = Array.from(dimensionMap.entries()).map(([dimension, data]) => ({
      dimension,
      score: data.total / data.count,
      maxScore: data.maxTotal / data.count,
      feedback: `Average score across ${data.count} tasks`
    }));

    return {
      id: uuidv4(),
      programId: program.id,
      userId: program.userId,
      mode: program.mode,
      evaluationType: 'program',
      evaluationSubtype: 'program_completion',
      score: averageScore,
      maxScore: 100,
      feedbackText: await this.generateProgramFeedback(program, taskEvaluations),
      feedbackData: {},
      domainScores: domainScores,
      aiAnalysis: {},
      timeTakenSeconds: program.timeSpentSeconds || 0,
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      createdAt: new Date().toISOString(),
      metadata: {
        targetType: 'program',
        taskCount: taskEvaluations.length,
        completionTime: this.calculateCompletionTime(program),
        sourceType: program.metadata?.sourceType,
        aggregatedDimensions: aggregatedDimensions
      }
    } as IEvaluation;
  }

  /**
   * 產生多語言回饋
   */
  async generateFeedback(evaluation: IEvaluation, language: string): Promise<string> {
    const prompt = this.buildFeedbackPrompt(evaluation, language);
    
    try {
      const response = await this.aiService.generateContent({
        prompt,
        maxTokens: 500,
        temperature: 0.7
      });
      
      return response.content || evaluation.feedbackText || 'No feedback available';
    } catch (error) {
      console.error('Error generating feedback:', error);
      return evaluation.feedbackText || 'No feedback available';
    }
  }

  /**
   * PBL Task 評估
   */
  private async evaluatePBLTask(task: ITask, context: IEvaluationContext): Promise<IEvaluation> {
    const interactions = task.interactions;
    
    // 分析對話品質
    const qualityScore = this.analyzePBLInteractionQuality(interactions);
    
    // KSA 維度評分
    const domainScores: Record<string, number> = {
      knowledge: qualityScore.knowledge,
      skills: qualityScore.skills,
      attitudes: qualityScore.attitudes
    };

    const overallScore = (qualityScore.knowledge + qualityScore.skills + qualityScore.attitudes) / 3;

    return {
      id: uuidv4(),
      taskId: task.id,
      programId: task.programId,
      userId: context.program.userId,
      mode: 'pbl' as LearningMode,
      evaluationType: 'task',
      evaluationSubtype: 'pbl_task',
      score: overallScore,
      maxScore: 100,
      feedbackText: `Your PBL task shows ${this.getScoreLevel(overallScore)} understanding and engagement.`,
      feedbackData: {},
      domainScores,
      aiAnalysis: {},
      timeTakenSeconds: 0,
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      createdAt: new Date().toISOString(),
      metadata: {
        interactionCount: interactions.length,
        ksaCodes: (task.content.context as Record<string, unknown>)?.ksaCodes as string[] || [],
        sourceType: 'pbl',
        targetType: 'task'
      }
    } as IEvaluation;
  }

  /**
   * Assessment Task 評估
   */
  private async evaluateAssessmentTask(task: ITask, context: IEvaluationContext): Promise<IEvaluation> {
    const interactions = task.interactions;
    const questions = (task.content.context as Record<string, unknown>)?.questions as unknown[] || [];
    
    // 計算正確率
    const correctAnswers = interactions.filter(i => 
      i.type === 'user_input' && i.metadata?.isCorrect === true
    ).length;
    
    const score = questions.length > 0 ? (correctAnswers / questions.length) * 100 : 0;

    // 領域分數
    const domainScores = this.calculateDomainScores(interactions, questions as { [key: string]: unknown; domain?: string }[]);

    return {
      id: uuidv4(),
      taskId: task.id,
      programId: task.programId,
      userId: context.program.userId,
      mode: 'assessment' as LearningMode,
      evaluationType: 'task',
      evaluationSubtype: 'assessment_task',
      score,
      maxScore: 100,
      feedbackText: `You answered ${correctAnswers} out of ${questions.length} questions correctly.`,
      feedbackData: {},
      domainScores: domainScores,
      aiAnalysis: {},
      timeTakenSeconds: 0,
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      createdAt: new Date().toISOString(),
      metadata: {
        targetType: 'task',
        totalQuestions: questions.length,
        correctAnswers,
        timeSpent: this.calculateTimeSpent(task),
        sourceType: 'assessment'
      }
    } as IEvaluation;
  }

  /**
   * Discovery Task 評估
   */
  private async evaluateDiscoveryTask(task: ITask, context: IEvaluationContext): Promise<IEvaluation> {
    const interactions = task.interactions;
    
    // 計算探索品質
    const explorationQuality = this.analyzeExplorationQuality(interactions);
    const xpEarned = Math.round(explorationQuality * 100);

    return {
      id: uuidv4(),
      taskId: task.id,
      programId: task.programId,
      userId: context.program.userId,
      mode: 'discovery' as LearningMode,
      evaluationType: 'task',
      evaluationSubtype: 'discovery_task',
      score: explorationQuality * 100,
      maxScore: 100,
      feedbackText: `Great exploration! You earned ${xpEarned} XP.`,
      feedbackData: {},
      domainScores: {},
      aiAnalysis: {},
      timeTakenSeconds: 0,
      pblData: {},
      discoveryData: {
        xpEarned,
        skillsImproved: ((task.content as Record<string, unknown>).context as Record<string, unknown>)?.requiredSkills as string[] || []
      },
      assessmentData: {},
      createdAt: new Date().toISOString(),
      metadata: {
        targetType: 'task',
        sourceType: 'discovery'
      }
    } as IEvaluation;
  }

  /**
   * 通用 Task 評估
   */
  private async evaluateGenericTask(task: ITask, context: IEvaluationContext): Promise<IEvaluation> {
    const interactions = task.interactions;
    const hasInteractions = interactions.length > 0;
    
    return {
      id: uuidv4(),
      taskId: task.id,
      programId: task.programId,
      userId: context.program.userId,
      mode: context.program.mode,
      evaluationType: 'task',
      evaluationSubtype: 'generic_task',
      score: hasInteractions ? 100 : 0,
      maxScore: 100,
      feedbackText: hasInteractions ? 'Task completed successfully.' : 'No interactions recorded.',
      feedbackData: {},
      domainScores: {},
      aiAnalysis: {},
      timeTakenSeconds: 0,
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      createdAt: new Date().toISOString(),
      metadata: {
        targetType: 'task',
        interactionCount: interactions.length,
        sourceType: context.scenario.sourceType
      }
    } as IEvaluation;
  }

  /**
   * 分析 PBL 互動品質
   */
  private analyzePBLInteractionQuality(interactions: IInteraction[]): { knowledge: number; skills: number; attitudes: number } {
    // 簡化的品質分析邏輯
    const userInputs = interactions.filter(i => i.type === 'user_input');
    
    // 基於互動深度給分
    const interactionDepth = Math.min(userInputs.length / 5, 1) * 100;
    
    return {
      knowledge: interactionDepth * 0.9,
      skills: interactionDepth * 0.85,
      attitudes: interactionDepth * 0.95
    };
  }

  /**
   * 計算領域分數
   */
  private calculateDomainScores(interactions: IInteraction[], questions: { domain?: string; [key: string]: unknown }[]): Record<string, number> {
    const domainMap = new Map<string, { correct: number; total: number }>();
    
    interactions.forEach((interaction, index) => {
      if (interaction.type === 'user_input' && questions[index]) {
        const domain = questions[index].domain || 'general';
        const stats = domainMap.get(domain) || { correct: 0, total: 0 };
        stats.total++;
        if (interaction.metadata?.isCorrect) {
          stats.correct++;
        }
        domainMap.set(domain, stats);
      }
    });

    // Convert to Record<string, number>
    const domainScores: Record<string, number> = {};
    domainMap.forEach((stats, domain) => {
      domainScores[domain] = (stats.correct / stats.total) * 100;
    });
    return domainScores;
  }

  /**
   * 分析探索品質
   */
  private analyzeExplorationQuality(interactions: IInteraction[]): number {
    // 簡化的探索品質分析
    const totalInteractions = interactions.length;
    const userActions = interactions.filter(i => i.type === 'user_input').length;
    
    if (totalInteractions === 0) return 0;
    
    const engagementRate = userActions / totalInteractions;
    return Math.min(engagementRate * 1.5, 1); // 最高 1.0
  }

  /**
   * 產生 Program 級別回饋
   */
  private async generateProgramFeedback(program: IProgram, taskEvaluations: IEvaluation[]): Promise<string> {
    const completedTasks = taskEvaluations.length;
    const averageScore = taskEvaluations
      .filter(e => e.score !== undefined)
      .reduce((sum, e) => sum + e.score!, 0) / completedTasks || 0;
    
    const level = this.getScoreLevel(averageScore);
    
    return `You have completed ${completedTasks} tasks with an average score of ${averageScore.toFixed(1)}%. ` +
           `Your overall performance is ${level}. Keep up the great work!`;
  }

  /**
   * 建立回饋生成提示
   */
  private buildFeedbackPrompt(evaluation: IEvaluation, language: string): string {
    return `Generate constructive feedback in ${language} for a learning evaluation:
    
    Type: ${evaluation.evaluationType}
    Score: ${evaluation.score || 'N/A'}
    Target: ${evaluation.evaluationType}
    
    ${evaluation.domainScores ? `
    Dimension Scores:
    ${Object.entries(evaluation.domainScores).map(([d, score]: [string, number]) => `- ${d}: ${score}/100`).join('\n')}
    ` : ''}
    
    Please provide:
    1. Positive reinforcement for achievements
    2. Specific areas for improvement
    3. Actionable next steps
    
    Keep the feedback encouraging and constructive.`;
  }

  /**
   * 計算完成時間
   */
  private calculateCompletionTime(program: IProgram): number {
    if (!program.startedAt || !program.completedAt) return 0;
    
    const start = new Date(program.startedAt).getTime();
    const end = new Date(program.completedAt).getTime();
    
    return Math.round((end - start) / 1000); // 秒數
  }

  /**
   * 計算花費時間
   */
  private calculateTimeSpent(task: ITask): number {
    if (!task.startedAt || !task.completedAt) return 0;
    
    const start = new Date(task.startedAt).getTime();
    const end = new Date(task.completedAt).getTime();
    
    return Math.round((end - start) / 1000); // 秒數
  }

  /**
   * 取得分數等級
   */
  private getScoreLevel(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'very good';
    if (score >= 70) return 'good';
    if (score >= 60) return 'satisfactory';
    return 'needs improvement';
  }
}