/**
 * Evaluation Strategy Pattern Implementation
 * Provides module-specific evaluation strategies
 */

import { 
  ITask, 
  IProgram, 
  IEvaluation, 
  IEvaluationContext,
  IDimensionScore,
  IInteraction 
} from '@/types/unified-learning';
import {
  IPBLTask,
  IAssessmentTask,
  IDiscoveryTask
} from '@/types/module-specific-types';
import { v4 as uuidv4 } from 'uuid';

// Type definitions for evaluation metrics
interface QualityMetrics {
  interactionDepth: number;
  responseQuality: number;
  engagementLevel: number;
}

interface AssessmentQuestion {
  id: string;
  type?: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  question?: string;
  options?: string[];
  correctAnswer?: string | string[];
  points?: number;
  domain?: string;
  competency?: string;
  explanation?: string;
}

interface AssessmentScoresResult {
  correctCount: number;
  totalCount: number;
  domainScores: Record<string, { correct: number; total: number }>;
  questionResults: Array<{
    questionId: string;
    correct: boolean;
    answer: string;
    timeSpent?: number;
  }>;
}

interface Challenge {
  id: string;
  description: string;
  xpReward: number;
  completed?: boolean;
}

interface Milestone {
  id: string;
  bonus: number;
  threshold?: number;
}

/**
 * Base evaluation strategy interface
 */
export interface IEvaluationStrategy {
  evaluateTask(task: ITask, context: IEvaluationContext): Promise<IEvaluation>;
  evaluateProgram(program: IProgram, taskEvaluations: IEvaluation[]): Promise<IEvaluation>;
}

/**
 * Factory for creating evaluation strategies
 */
export class EvaluationStrategyFactory {
  static createStrategy(sourceType: string): IEvaluationStrategy {
    switch (sourceType) {
      case 'pbl':
        return new PBLEvaluationStrategy();
      case 'assessment':
        return new AssessmentEvaluationStrategy();
      case 'discovery':
        return new DiscoveryEvaluationStrategy();
      default:
        throw new Error(`Unknown evaluation strategy: ${sourceType}`);
    }
  }
}

/**
 * PBL Evaluation Strategy
 */
export class PBLEvaluationStrategy implements IEvaluationStrategy {
  async evaluateTask(task: ITask, context: IEvaluationContext): Promise<IEvaluation> {
    const pblTask = task as IPBLTask;
    const interactions = task.interactions || [];
    
    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(interactions);
    
    // Calculate KSA dimensions
    const dimensionScores = this.calculateKSADimensions(qualityMetrics, pblTask);
    
    // Overall score is average of KSA dimensions
    const overallScore = dimensionScores.reduce((sum, d) => sum + d.score, 0) / dimensionScores.length;

    return {
      id: uuidv4(),
      taskId: task.id,
      programId: task.programId,
      userId: context.program.userId,
      mode: 'pbl' as const,
      evaluationType: 'task',
      evaluationSubtype: 'pbl_task',
      score: Math.round(overallScore),
      maxScore: 100,
      feedbackText: this.generateTaskFeedback(overallScore, qualityMetrics),
      feedbackData: {},
      dimensionScores: this.convertDimensionScoresToRecord(dimensionScores),
      aiAnalysis: {},
      timeTakenSeconds: 0,
      pblData: {
        qualityMetrics,
        interactionQuality: this.getInteractionQuality(qualityMetrics)
      },
      discoveryData: {},
      assessmentData: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        sourceType: 'pbl',
        interactionCount: interactions.length,
        ksaCodes: ((pblTask.content?.context as Record<string, unknown>)?.ksaCodes as string[]) || []
      }
    } as unknown as IEvaluation;
  }

  async evaluateProgram(program: IProgram, taskEvaluations: IEvaluation[]): Promise<IEvaluation> {
    // Aggregate scores
    const scores = taskEvaluations.filter(e => e.score !== undefined).map(e => e.score!);
    const averageScore = scores.length > 0 ? 
      scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Aggregate KSA dimensions
    const dimensionScoresArray = this.aggregateKSADimensions(taskEvaluations);
    const dimensionScores = dimensionScoresArray.reduce((acc, dim) => {
      acc[dim.dimension] = dim.score;
      return acc;
    }, {} as Record<string, number>);

    return {
      id: uuidv4(),
      programId: program.id,
      userId: program.userId,
      mode: 'pbl' as const,
      evaluationType: 'program',
      evaluationSubtype: 'pbl_completion',
      score: Math.round(averageScore),
      maxScore: 100,
      feedbackText: this.generateProgramFeedback(averageScore, taskEvaluations),
      feedbackData: {},
      dimensionScores,
      aiAnalysis: {},
      timeTakenSeconds: program.timeSpentSeconds || 0,
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        sourceType: 'pbl',
        taskCount: taskEvaluations.length,
        completionTime: this.calculateCompletionTime(program),
        ksaAchieved: this.extractAchievedKSA(taskEvaluations)
      }
    } as unknown as IEvaluation;
  }

  protected calculateQualityMetrics(interactions: IInteraction[]): QualityMetrics {
    const userInputs = interactions.filter(i => i.type === 'user_input');
    const aiResponses = interactions.filter(i => i.type === 'ai_response');
    
    // Calculate interaction depth
    const avgInputLength = userInputs.length > 0 ?
      userInputs.reduce((sum, i) => sum + (typeof i.content === 'string' ? i.content.length : 0), 0) / userInputs.length : 0;
    
    // Calculate response quality based on length and variety
    const interactionDepth = Math.min(avgInputLength / 100, 1) * 100; // Normalize to 0-100
    const responseQuality = Math.min(userInputs.length / 5, 1) * 100; // Expect at least 5 interactions
    const engagementLevel = Math.min((userInputs.length + aiResponses.length) / 10, 1) * 100;

    return {
      interactionDepth,
      responseQuality,
      engagementLevel
    };
  }

  private calculateKSADimensions(metrics: QualityMetrics, {}: IPBLTask): IDimensionScore[] {
    const baseScore = (metrics.interactionDepth + metrics.responseQuality + metrics.engagementLevel) / 3;
    
    return [
      {
        dimension: 'knowledge',
        score: Math.round(baseScore * 0.9), // Knowledge slightly lower
        maxScore: 100,
        feedback: 'Understanding of concepts'
      },
      {
        dimension: 'skills',
        score: Math.round(baseScore * 0.85), // Skills moderate
        maxScore: 100,
        feedback: 'Application abilities'
      },
      {
        dimension: 'attitudes',
        score: Math.round(baseScore * 0.95), // Attitudes higher for engagement
        maxScore: 100,
        feedback: 'Learning mindset'
      }
    ];
  }

  private aggregateKSADimensions(evaluations: IEvaluation[]): IDimensionScore[] {
    const dimensionMap = new Map<string, { total: number; count: number }>();
    
    evaluations.forEach(evaluation => {
      if (evaluation.dimensionScores) {
        Object.entries(evaluation.dimensionScores).forEach(([dim, score]: [string, number]) => {
          const existing = dimensionMap.get(dim) || { total: 0, count: 0 };
          existing.total += score;
          existing.count += 1;
          dimensionMap.set(dim, existing);
        });
      }
    });

    return Array.from(dimensionMap.entries()).map(([dimension, data]) => ({
      dimension,
      score: Math.round(data.total / data.count),
      maxScore: 100,
      feedback: `Average across ${data.count} tasks`
    }));
  }

  private getInteractionQuality(metrics: QualityMetrics): 'low' | 'medium' | 'high' {
    const avg = (metrics.interactionDepth + metrics.responseQuality + metrics.engagementLevel) / 3;
    if (avg >= 70) return 'high';
    if (avg >= 40) return 'medium';
    return 'low';
  }

  private generateTaskFeedback(score: number, {}: QualityMetrics): string {
    if (score >= 80) {
      return 'Excellent problem-solving approach with deep engagement!';
    } else if (score >= 60) {
      return 'Good effort! Consider exploring the problem from more angles.';
    } else {
      return 'Keep practicing! Try to engage more deeply with the problem.';
    }
  }

  private generateProgramFeedback(score: number, evaluations: IEvaluation[]): string {
    const taskCount = evaluations.length;
    return `Completed ${taskCount} PBL tasks with an average score of ${score}%. ` +
           `Your problem-solving skills are ${score >= 80 ? 'excellent' : score >= 60 ? 'developing well' : 'improving'}.`;
  }

  private calculateCompletionTime(program: IProgram): number {
    if (!program.startedAt || !program.completedAt) return 0;
    const start = new Date(program.startedAt).getTime();
    const end = new Date(program.completedAt).getTime();
    return Math.round((end - start) / 1000); // seconds
  }

  private extractAchievedKSA(evaluations: IEvaluation[]): string[] {
    const ksaSet = new Set<string>();
    evaluations.forEach(e => {
      const codes = e.metadata?.ksaCodes || [];
      if (Array.isArray(codes)) {
        codes.forEach((code: string) => ksaSet.add(code));
      }
    });
    return Array.from(ksaSet);
  }

  private convertDimensionScoresToRecord(dimensionScores: IDimensionScore[]): Record<string, number> {
    return dimensionScores.reduce((acc, score) => {
      acc[score.dimension] = score.score;
      return acc;
    }, {} as Record<string, number>);
  }
}

/**
 * Assessment Evaluation Strategy
 */
export class AssessmentEvaluationStrategy implements IEvaluationStrategy {
  async evaluateTask(task: ITask, context: IEvaluationContext): Promise<IEvaluation> {
    const assessmentTask = task as IAssessmentTask;
    const interactions = task.interactions || [];
    const taskContext = assessmentTask.content?.context as Record<string, unknown>;
    const questions = (taskContext?.questions as AssessmentQuestion[]) || [];
    
    // Calculate scores
    const { correctCount, totalCount, domainScores, questionResults } = 
      this.calculateAssessmentScores(interactions, questions);
    
    const baseScore = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
    
    // Apply time bonus if applicable
    const timeSpent = this.calculateTimeSpent(task);
    const timeLimit = taskContext?.timeLimit as number | undefined;
    const timeBonus = timeLimit ? this.calculateTimeBonus(timeSpent, timeLimit) : 0;
    
    const finalScore = Math.min(baseScore + timeBonus, 100);

    return {
      id: uuidv4(),
      taskId: task.id,
      programId: task.programId,
      userId: context.program.userId,
      mode: 'assessment' as const,
      evaluationType: 'task',
      evaluationSubtype: 'assessment_task',
      score: Math.round(finalScore * 100) / 100, // Round to 2 decimals
      maxScore: 100,
      feedbackText: `You answered ${correctCount} out of ${totalCount} questions correctly.`,
      feedbackData: {},
      dimensionScores: this.convertDomainScoresToDimensions(domainScores),
      aiAnalysis: {},
      timeTakenSeconds: timeSpent,
      pblData: {},
      discoveryData: {},
      assessmentData: {
        questionResults,
        domainScores,
        timeBonus
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        sourceType: 'assessment',
        targetType: 'task',
        totalQuestions: totalCount,
        correctAnswers: correctCount,
        timeSpent,
        timeBonus,
        questionResults,
        domainScores
      }
    } as unknown as IEvaluation;
  }

  async evaluateProgram(program: IProgram, taskEvaluations: IEvaluation[]): Promise<IEvaluation> {
    // Aggregate scores
    const scores = taskEvaluations.filter(e => e.score !== undefined).map(e => e.score!);
    const averageScore = scores.length > 0 ? 
      scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Aggregate domain scores
    const aggregatedDomains = this.aggregateDomainScores(taskEvaluations);

    return {
      id: uuidv4(),
      programId: program.id,
      userId: program.userId,
      mode: 'assessment' as const,
      evaluationType: 'program',
      evaluationSubtype: 'assessment_complete',
      score: Math.round(averageScore),
      maxScore: 100,
      feedbackText: this.generateAssessmentProgramFeedback(averageScore, taskEvaluations),
      feedbackData: {},
      dimensionScores: aggregatedDomains,
      aiAnalysis: {},
      timeTakenSeconds: program.timeSpentSeconds || 0,
      pblData: {},
      discoveryData: {},
      assessmentData: {
        totalQuestions: this.getTotalQuestions(taskEvaluations),
        competencyGaps: this.identifyCompetencyGaps(this.convertDimensionScoresToRecord(aggregatedDomains))
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        sourceType: 'assessment',
        targetType: 'program',
        taskCount: taskEvaluations.length
      }
    } as unknown as IEvaluation;
  }

  private calculateAssessmentScores(interactions: IInteraction[], questions: AssessmentQuestion[]): AssessmentScoresResult {
    let correctCount = 0;
    const domainScores: Record<string, { correct: number; total: number }> = {};
    const questionResults: AssessmentScoresResult['questionResults'] = [];

    interactions.forEach((interaction) => {
      if (interaction.type === 'user_input' && interaction.metadata?.questionId) {
        const isCorrect = Boolean(interaction.metadata?.isCorrect);
        const question = questions.find((q: any) => q.id === interaction.metadata?.questionId);
        
        if (isCorrect) correctCount++;
        
        if (question?.domain) {
          if (!domainScores[question.domain]) {
            domainScores[question.domain] = { correct: 0, total: 0 };
          }
          domainScores[question.domain].total++;
          if (isCorrect) domainScores[question.domain].correct++;
        }

        questionResults.push({
          questionId: interaction.metadata?.questionId as string,
          correct: isCorrect,
          answer: String(interaction.content),
          timeSpent: interaction.metadata?.timeSpent as number | undefined
        });
      }
    });

    return {
      correctCount,
      totalCount: questions.length,
      domainScores,
      questionResults
    };
  }

  protected calculateTimeBonus(timeSpent: number, timeLimit: number): number {
    if (timeSpent >= timeLimit) return 0;
    
    const timeRatio = timeSpent / timeLimit;
    if (timeRatio < 0.5) return 10; // Finished in less than half time
    if (timeRatio < 0.75) return 5; // Finished in less than 3/4 time
    return 2; // Finished with time to spare
  }

  private calculateTimeSpent(task: ITask): number {
    if (!task.startedAt || !task.completedAt) return 0;
    const start = new Date(task.startedAt).getTime();
    const end = new Date(task.completedAt).getTime();
    return Math.round((end - start) / 1000); // seconds
  }

  private convertDomainScoresToDimensions(domainScores: Record<string, { correct: number; total: number }>): IDimensionScore[] {
    return Object.entries(domainScores).map(([domain, scores]) => ({
      dimension: domain,
      score: Math.round((scores.correct / scores.total) * 100),
      maxScore: 100,
      feedback: `${scores.correct}/${scores.total} correct`
    }));
  }

  private aggregateDomainScores(evaluations: IEvaluation[]): IDimensionScore[] {
    const domainMap = new Map<string, { totalScore: number; count: number }>();
    
    evaluations.forEach(evaluation => {
      if (evaluation.dimensionScores && Array.isArray(evaluation.dimensionScores)) {
        evaluation.dimensionScores.forEach((dimScore: IDimensionScore) => {
          const existing = domainMap.get(dimScore.dimension) || { totalScore: 0, count: 0 };
          existing.totalScore += dimScore.score;
          existing.count += 1;
          domainMap.set(dimScore.dimension, existing);
        });
      }
    });

    return Array.from(domainMap.entries()).map(([domain, data]) => ({
      dimension: domain,
      score: Math.round(data.totalScore / data.count),
      maxScore: 100,
      feedback: `Average across ${data.count} assessments`
    }));
  }

  private generateAssessmentProgramFeedback(score: number, {}: IEvaluation[]): string {
    const level = score >= 90 ? 'mastery' : score >= 80 ? 'proficient' : 
                  score >= 70 ? 'developing' : 'foundational';
    return `Assessment complete! Your AI literacy level is ${level} with an average score of ${Math.round(score)}%.`;
  }

  private getTotalQuestions(evaluations: IEvaluation[]): number {
    return evaluations.reduce((sum, e) => sum + ((e.metadata?.totalQuestions as number) || 0), 0);
  }

  private identifyCompetencyGaps(dimensionScores: Record<string, number> | IDimensionScore[]): string[] {
    const scores = Array.isArray(dimensionScores) 
      ? this.convertDimensionScoresToRecord(dimensionScores)
      : dimensionScores;
    return Object.entries(scores)
      .filter(([, score]) => score < 70)
      .map(([dimension]) => dimension);
  }

  private convertDimensionScoresToRecord(dimensionScores: IDimensionScore[]): Record<string, number> {
    return dimensionScores.reduce((acc, score) => {
      acc[score.dimension] = score.score;
      return acc;
    }, {} as Record<string, number>);
  }
}

/**
 * Discovery Evaluation Strategy
 */
export class DiscoveryEvaluationStrategy implements IEvaluationStrategy {
  async evaluateTask(task: ITask, context: IEvaluationContext): Promise<IEvaluation> {
    const discoveryTask = task as IDiscoveryTask;
    const interactions = task.interactions || [];
    const taskContext = discoveryTask.content?.context as Record<string, unknown>;
    const goals = (taskContext?.explorationGoals as string[]) || [];
    
    // Calculate exploration metrics
    const explorationScore = this.calculateExplorationScore(interactions, goals);
    const toolsExplored = this.extractToolsExplored(interactions);
    const challengesCompleted = this.extractChallengesCompleted(interactions, discoveryTask);
    
    // Calculate XP
    const baseXP = Math.round(explorationScore);
    const challengeXP = challengesCompleted.reduce((sum, c) => sum + (c.xpReward || 0), 0);
    const totalXP = baseXP + challengeXP;

    return {
      id: uuidv4(),
      taskId: task.id,
      programId: task.programId,
      userId: context.program.userId,
      mode: 'discovery' as const,
      evaluationType: 'task',
      evaluationSubtype: 'discovery_task',
      score: explorationScore,
      maxScore: 100,
      feedbackText: this.generateDiscoveryFeedback(explorationScore, totalXP),
      feedbackData: {},
      dimensionScores: {},
      aiAnalysis: {},
      timeTakenSeconds: 0,
      pblData: {},
      discoveryData: {
        xpEarned: totalXP,
        baseXP,
        challengeXP,
        toolsExplored,
        challengesCompleted: challengesCompleted.map(c => c.id),
        explorationDepth: this.calculateExplorationDepth(interactions),
        skillsImproved: (taskContext?.requiredSkills as string[]) || []
      },
      assessmentData: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        sourceType: 'discovery',
        targetType: 'task'
      }
    } as unknown as IEvaluation;
  }

  async evaluateProgram(program: IProgram, taskEvaluations: IEvaluation[]): Promise<IEvaluation> {
    // Calculate total XP
    const currentXP = (program.metadata?.totalXP as number) || 0;
    const earnedXP = taskEvaluations.reduce((sum, e) => sum + ((e.metadata?.xpEarned as number) || 0), 0);
    const totalXP = currentXP + earnedXP;
    
    // Check for milestones
    const milestones = this.checkMilestones(currentXP, totalXP);
    const bonusXP = milestones.reduce((sum, m) => sum + m.bonus, 0);

    return {
      id: uuidv4(),
      programId: program.id,
      userId: program.userId,
      mode: 'discovery' as const,
      evaluationType: 'program',
      evaluationSubtype: 'discovery_complete',
      score: 100, // Discovery programs are always "complete"
      maxScore: 100,
      feedbackText: this.generateDiscoveryProgramFeedback(totalXP, milestones),
      feedbackData: {},
      dimensionScores: {},
      aiAnalysis: {},
      timeTakenSeconds: program.timeSpentSeconds || 0,
      pblData: {},
      discoveryData: {
        totalXP: totalXP + bonusXP,
        earnedXP,
        bonusXP,
        milestonesAchieved: milestones.map(m => m.id),
        discoveryLevel: this.calculateDiscoveryLevel(totalXP + bonusXP),
        toolsMastered: this.aggregateToolsMastered(taskEvaluations)
      },
      assessmentData: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        sourceType: 'discovery',
        targetType: 'program'
      }
    } as unknown as IEvaluation;
  }

  protected calculateExplorationScore(interactions: IInteraction[], goals: string[]): number {
    const interactionCount = interactions.filter(i => i.type === 'user_input').length;
    const systemEventCount = interactions.filter(i => i.type === 'system_event').length;
    
    // Base score on interaction variety and depth
    const interactionScore = Math.min(interactionCount * 10, 50);
    const eventScore = Math.min(systemEventCount * 15, 50);
    
    // Bonus for completing goals
    const goalBonus = goals.length > 0 ? 20 : 0;
    
    return Math.min(interactionScore + eventScore + goalBonus, 100);
  }

  private extractToolsExplored(interactions: IInteraction[]): string[] {
    const tools = new Set<string>();
    interactions.forEach(i => {
      if (i.metadata?.toolUsed) {
        tools.add(String(i.metadata.toolUsed));
      }
    });
    return Array.from(tools);
  }

  private extractChallengesCompleted(interactions: IInteraction[], task: IDiscoveryTask): Challenge[] {
    const completedChallenges: Challenge[] = [];
    const context = task.content?.context as Record<string, unknown>;
    const challenges = (context?.challenges || []) as Challenge[];
    
    interactions.forEach(i => {
      if (i.metadata?.challengeId) {
        const challenge = challenges.find((c: any) => c.id === i.metadata?.challengeId);
        if (challenge) {
          completedChallenges.push(challenge);
        }
      }
    });
    
    return completedChallenges;
  }

  private calculateExplorationDepth(interactions: IInteraction[]): number {
    // Measure variety and depth of exploration
    const uniqueTypes = new Set(interactions.map(i => i.type)).size;
    const avgContentLength = interactions.reduce((sum, i) => 
      sum + (typeof i.content === 'string' ? i.content.length : 0), 0) / Math.max(interactions.length, 1);
    
    return Math.min((uniqueTypes * 20) + (avgContentLength / 10), 100);
  }

  private checkMilestones(currentXP: number, newXP: number): Milestone[] {
    const milestones = [
      { threshold: 100, id: '100_xp', bonus: 20 },
      { threshold: 500, id: '500_xp', bonus: 50 },
      { threshold: 1000, id: '1000_xp', bonus: 100 },
      { threshold: 5000, id: '5000_xp', bonus: 500 }
    ];

    return milestones.filter(m => 
      currentXP < m.threshold && newXP >= m.threshold
    );
  }

  private calculateDiscoveryLevel(totalXP: number): string {
    if (totalXP >= 5000) return 'expert';
    if (totalXP >= 1000) return 'advanced';
    if (totalXP >= 500) return 'intermediate';
    return 'novice';
  }

  private aggregateToolsMastered(evaluations: IEvaluation[]): string[] {
    const tools = new Set<string>();
    evaluations.forEach(e => {
      const explored = e.metadata?.toolsExplored || [];
      if (Array.isArray(explored)) {
        explored.forEach((tool: string) => tools.add(tool));
      }
    });
    return Array.from(tools);
  }

  private generateDiscoveryFeedback(score: number, xp: number): string {
    return `Great exploration! You earned ${xp} XP. ${
      score >= 80 ? 'Your curiosity and experimentation are outstanding!' :
      score >= 60 ? 'Keep exploring to discover more!' :
      'Try experimenting with different approaches!'
    }`;
  }

  private generateDiscoveryProgramFeedback(totalXP: number, milestones: Milestone[]): string {
    const level = this.calculateDiscoveryLevel(totalXP);
    let feedback = `Discovery journey complete! You've reached ${level} level with ${totalXP} XP.`;
    
    if (milestones.length > 0) {
      feedback += ` Milestones achieved: ${milestones.map(m => m.id).join(', ')}!`;
    }
    
    return feedback;
  }
}