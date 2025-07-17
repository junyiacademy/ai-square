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
  IDimensionScore 
} from '@/types/unified-learning';
import { BaseAIService } from '@/lib/abstractions/base-ai-service';
import { v4 as uuidv4 } from 'uuid';

export class UnifiedEvaluationSystem implements IEvaluationSystem {
  constructor(private aiService: BaseAIService) {}

  /**
   * Task 級別評估
   */
  async evaluateTask(task: ITask, context: IEvaluationContext): Promise<IEvaluation> {
    // 根據不同的 scenario 類型選擇評估策略
    switch (context.scenario.sourceType) {
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
      if (evaluation.dimensions) {
        evaluation.dimensions.forEach(dim => {
          const existing = dimensionMap.get(dim.dimension) || { total: 0, count: 0, maxTotal: 0 };
          existing.total += dim.score;
          existing.count += 1;
          existing.maxTotal += dim.maxScore;
          dimensionMap.set(dim.dimension, existing);
        });
      }
    });

    const aggregatedDimensions: IDimensionScore[] = Array.from(dimensionMap.entries()).map(([dimension, data]) => ({
      dimension,
      score: data.total / data.count,
      maxScore: data.maxTotal / data.count,
      feedback: `Average score across ${data.count} tasks`
    }));

    return {
      id: uuidv4(),
      targetType: 'program',
      targetId: program.id,
      programId: program.id,
      userId: program.userId,
      type: 'program_completion',
      score: averageScore,
      feedback: await this.generateProgramFeedback(program, taskEvaluations),
      dimensions: aggregatedDimensions,
      createdAt: new Date().toISOString(),
      metadata: {
        taskCount: taskEvaluations.length,
        completionTime: this.calculateCompletionTime(program),
        sourceType: program.metadata?.sourceType
      }
    };
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
      
      return response.text || evaluation.feedback || 'No feedback available';
    } catch (error) {
      console.error('Error generating feedback:', error);
      return evaluation.feedback || 'No feedback available';
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
    const dimensions: IDimensionScore[] = [
      { dimension: 'knowledge', score: qualityScore.knowledge, maxScore: 100 },
      { dimension: 'skills', score: qualityScore.skills, maxScore: 100 },
      { dimension: 'attitudes', score: qualityScore.attitudes, maxScore: 100 }
    ];

    const overallScore = (qualityScore.knowledge + qualityScore.skills + qualityScore.attitudes) / 3;

    return {
      id: uuidv4(),
      targetType: 'task',
      targetId: task.id,
      programId: task.programId,
      userId: context.program.userId,
      type: 'pbl_task',
      score: overallScore,
      feedback: `Your PBL task shows ${this.getScoreLevel(overallScore)} understanding and engagement.`,
      dimensions,
      createdAt: new Date().toISOString(),
      metadata: {
        interactionCount: interactions.length,
        ksaCodes: task.content.context?.ksaCodes || [],
        sourceType: 'pbl'
      }
    };
  }

  /**
   * Assessment Task 評估
   */
  private async evaluateAssessmentTask(task: ITask, context: IEvaluationContext): Promise<IEvaluation> {
    const interactions = task.interactions;
    const questions = task.content.context?.questions || [];
    
    // 計算正確率
    const correctAnswers = interactions.filter(i => 
      i.type === 'user_input' && i.metadata?.isCorrect === true
    ).length;
    
    const score = questions.length > 0 ? (correctAnswers / questions.length) * 100 : 0;

    // 領域分數
    const domainScores = this.calculateDomainScores(interactions, questions);

    return {
      id: uuidv4(),
      targetType: 'task',
      targetId: task.id,
      programId: task.programId,
      userId: context.program.userId,
      type: 'assessment_task',
      score,
      feedback: `You answered ${correctAnswers} out of ${questions.length} questions correctly.`,
      dimensions: domainScores,
      createdAt: new Date().toISOString(),
      metadata: {
        totalQuestions: questions.length,
        correctAnswers,
        timeSpent: this.calculateTimeSpent(task),
        sourceType: 'assessment'
      }
    };
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
      targetType: 'task',
      targetId: task.id,
      programId: task.programId,
      userId: context.program.userId,
      type: 'discovery_task',
      score: explorationQuality * 100,
      feedback: `Great exploration! You earned ${xpEarned} XP.`,
      createdAt: new Date().toISOString(),
      metadata: {
        xpEarned,
        skillsImproved: task.content.context?.requiredSkills || [],
        sourceType: 'discovery'
      }
    };
  }

  /**
   * 通用 Task 評估
   */
  private async evaluateGenericTask(task: ITask, context: IEvaluationContext): Promise<IEvaluation> {
    const interactions = task.interactions;
    const hasInteractions = interactions.length > 0;
    
    return {
      id: uuidv4(),
      targetType: 'task',
      targetId: task.id,
      programId: task.programId,
      userId: context.program.userId,
      type: 'generic_task',
      score: hasInteractions ? 100 : 0,
      feedback: hasInteractions ? 'Task completed successfully.' : 'No interactions recorded.',
      createdAt: new Date().toISOString(),
      metadata: {
        interactionCount: interactions.length,
        sourceType: context.scenario.sourceType
      }
    };
  }

  /**
   * 分析 PBL 互動品質
   */
  private analyzePBLInteractionQuality(interactions: any[]): { knowledge: number; skills: number; attitudes: number } {
    // 簡化的品質分析邏輯
    const userInputs = interactions.filter(i => i.type === 'user_input');
    const aiResponses = interactions.filter(i => i.type === 'ai_response');
    
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
  private calculateDomainScores(interactions: any[], questions: any[]): IDimensionScore[] {
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

    return Array.from(domainMap.entries()).map(([domain, stats]) => ({
      dimension: domain,
      score: (stats.correct / stats.total) * 100,
      maxScore: 100,
      feedback: `${stats.correct}/${stats.total} correct`
    }));
  }

  /**
   * 分析探索品質
   */
  private analyzeExplorationQuality(interactions: any[]): number {
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
    
    Type: ${evaluation.type}
    Score: ${evaluation.score || 'N/A'}
    Target: ${evaluation.targetType}
    
    ${evaluation.dimensions ? `
    Dimension Scores:
    ${evaluation.dimensions.map(d => `- ${d.dimension}: ${d.score}/${d.maxScore}`).join('\n')}
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