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
    const dimensions = this.calculateKSADimensions(qualityMetrics, pblTask);
    
    // Overall score is average of KSA dimensions
    const overallScore = dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length;

    return {
      id: uuidv4(),
      targetType: 'task',
      targetId: task.id,
      programId: task.programId,
      userId: context.program.userId,
      type: 'pbl_task',
      score: Math.round(overallScore),
      feedback: this.generateTaskFeedback(overallScore, qualityMetrics),
      dimensions,
      createdAt: new Date().toISOString(),
      metadata: {
        sourceType: 'pbl',
        interactionCount: interactions.length,
        ksaCodes: pblTask.content?.context?.ksaCodes || [],
        qualityMetrics,
        interactionQuality: this.getInteractionQuality(qualityMetrics)
      }
    };
  }

  async evaluateProgram(program: IProgram, taskEvaluations: IEvaluation[]): Promise<IEvaluation> {
    // Aggregate scores
    const scores = taskEvaluations.filter(e => e.score !== undefined).map(e => e.score!);
    const averageScore = scores.length > 0 ? 
      scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Aggregate KSA dimensions
    const dimensions = this.aggregateKSADimensions(taskEvaluations);

    return {
      id: uuidv4(),
      targetType: 'program',
      targetId: program.id,
      programId: program.id,
      userId: program.userId,
      type: 'pbl_completion',
      score: Math.round(averageScore),
      feedback: this.generateProgramFeedback(averageScore, taskEvaluations),
      dimensions,
      createdAt: new Date().toISOString(),
      metadata: {
        sourceType: 'pbl',
        taskCount: taskEvaluations.length,
        completionTime: this.calculateCompletionTime(program),
        ksaAchieved: this.extractAchievedKSA(taskEvaluations)
      }
    };
  }

  protected calculateQualityMetrics(interactions: IInteraction[]): QualityMetrics {
    const userInputs = interactions.filter(i => i.type === 'user_input');
    const aiResponses = interactions.filter(i => i.type === 'ai_response');
    
    // Calculate interaction depth
    const avgInputLength = userInputs.length > 0 ?
      userInputs.reduce((sum, i) => sum + (i.content?.length || 0), 0) / userInputs.length : 0;
    
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
      if (evaluation.dimensions) {
        evaluation.dimensions.forEach(dim => {
          const existing = dimensionMap.get(dim.dimension) || { total: 0, count: 0 };
          existing.total += dim.score;
          existing.count += 1;
          dimensionMap.set(dim.dimension, existing);
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
      codes.forEach((code: string) => ksaSet.add(code));
    });
    return Array.from(ksaSet);
  }
}

/**
 * Assessment Evaluation Strategy
 */
export class AssessmentEvaluationStrategy implements IEvaluationStrategy {
  async evaluateTask(task: ITask, context: IEvaluationContext): Promise<IEvaluation> {
    const assessmentTask = task as IAssessmentTask;
    const interactions = task.interactions || [];
    const questions = assessmentTask.content?.context?.questions || [];
    
    // Calculate scores
    const { correctCount, totalCount, domainScores, questionResults } = 
      this.calculateAssessmentScores(interactions, questions);
    
    const baseScore = totalCount > 0 ? (correctCount / totalCount) * 100 : 0;
    
    // Apply time bonus if applicable
    const timeSpent = this.calculateTimeSpent(task);
    const timeLimit = assessmentTask.content?.context?.timeLimit;
    const timeBonus = timeLimit ? this.calculateTimeBonus(timeSpent, timeLimit) : 0;
    
    const finalScore = Math.min(baseScore + timeBonus, 100);

    return {
      id: uuidv4(),
      targetType: 'task',
      targetId: task.id,
      programId: task.programId,
      userId: context.program.userId,
      type: 'assessment_task',
      score: Math.round(finalScore * 100) / 100, // Round to 2 decimals
      feedback: `You answered ${correctCount} out of ${totalCount} questions correctly.`,
      dimensions: this.convertDomainScoresToDimensions(domainScores),
      createdAt: new Date().toISOString(),
      metadata: {
        sourceType: 'assessment',
        totalQuestions: totalCount,
        correctAnswers: correctCount,
        timeSpent,
        timeBonus,
        questionResults,
        domainScores
      }
    };
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
      targetType: 'program',
      targetId: program.id,
      programId: program.id,
      userId: program.userId,
      type: 'assessment_complete',
      score: Math.round(averageScore),
      feedback: this.generateAssessmentProgramFeedback(averageScore, taskEvaluations),
      dimensions: aggregatedDomains,
      createdAt: new Date().toISOString(),
      metadata: {
        sourceType: 'assessment',
        taskCount: taskEvaluations.length,
        totalQuestions: this.getTotalQuestions(taskEvaluations),
        competencyGaps: this.identifyCompetencyGaps(aggregatedDomains)
      }
    };
  }

  private calculateAssessmentScores(interactions: IInteraction[], questions: AssessmentQuestion[]): AssessmentScoresResult {
    let correctCount = 0;
    const domainScores: Record<string, { correct: number; total: number }> = {};
    const questionResults: AssessmentScoresResult['questionResults'] = [];

    interactions.forEach((interaction) => {
      if (interaction.type === 'user_input' && interaction.metadata?.questionId) {
        const isCorrect = interaction.metadata.isCorrect || false;
        const question = questions.find(q => q.id === interaction.metadata.questionId);
        
        if (isCorrect) correctCount++;
        
        if (question?.domain) {
          if (!domainScores[question.domain]) {
            domainScores[question.domain] = { correct: 0, total: 0 };
          }
          domainScores[question.domain].total++;
          if (isCorrect) domainScores[question.domain].correct++;
        }

        questionResults.push({
          questionId: interaction.metadata.questionId,
          correct: isCorrect,
          answer: interaction.content,
          timeSpent: interaction.metadata?.timeSpent
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
      if (evaluation.dimensions) {
        evaluation.dimensions.forEach(dim => {
          const existing = domainMap.get(dim.dimension) || { totalScore: 0, count: 0 };
          existing.totalScore += dim.score;
          existing.count += 1;
          domainMap.set(dim.dimension, existing);
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
    return evaluations.reduce((sum, e) => sum + (e.metadata?.totalQuestions || 0), 0);
  }

  private identifyCompetencyGaps(dimensions: IDimensionScore[]): string[] {
    return dimensions
      .filter(d => d.score < 70)
      .map(d => d.dimension);
  }
}

/**
 * Discovery Evaluation Strategy
 */
export class DiscoveryEvaluationStrategy implements IEvaluationStrategy {
  async evaluateTask(task: ITask, context: IEvaluationContext): Promise<IEvaluation> {
    const discoveryTask = task as IDiscoveryTask;
    const interactions = task.interactions || [];
    const goals = discoveryTask.content?.context?.explorationGoals || [];
    
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
      targetType: 'task',
      targetId: task.id,
      programId: task.programId,
      userId: context.program.userId,
      type: 'discovery_task',
      score: explorationScore,
      feedback: this.generateDiscoveryFeedback(explorationScore, totalXP),
      createdAt: new Date().toISOString(),
      metadata: {
        sourceType: 'discovery',
        xpEarned: totalXP,
        baseXP,
        challengeXP,
        toolsExplored,
        challengesCompleted: challengesCompleted.map(c => c.id),
        explorationDepth: this.calculateExplorationDepth(interactions),
        skillsImproved: discoveryTask.content?.context?.requiredSkills || []
      }
    };
  }

  async evaluateProgram(program: IProgram, taskEvaluations: IEvaluation[]): Promise<IEvaluation> {
    // Calculate total XP
    const currentXP = program.metadata?.totalXP || 0;
    const earnedXP = taskEvaluations.reduce((sum, e) => sum + (e.metadata?.xpEarned || 0), 0);
    const totalXP = currentXP + earnedXP;
    
    // Check for milestones
    const milestones = this.checkMilestones(currentXP, totalXP);
    const bonusXP = milestones.reduce((sum, m) => sum + m.bonus, 0);

    return {
      id: uuidv4(),
      targetType: 'program',
      targetId: program.id,
      programId: program.id,
      userId: program.userId,
      type: 'discovery_complete',
      score: 100, // Discovery programs are always "complete"
      feedback: this.generateDiscoveryProgramFeedback(totalXP, milestones),
      createdAt: new Date().toISOString(),
      metadata: {
        sourceType: 'discovery',
        totalXP: totalXP + bonusXP,
        earnedXP,
        bonusXP,
        milestonesAchieved: milestones.map(m => m.id),
        discoveryLevel: this.calculateDiscoveryLevel(totalXP + bonusXP),
        toolsMastered: this.aggregateToolsMastered(taskEvaluations)
      }
    };
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
        tools.add(i.metadata.toolUsed);
      }
    });
    return Array.from(tools);
  }

  private extractChallengesCompleted(interactions: IInteraction[], task: IDiscoveryTask): Challenge[] {
    const completedChallenges: Challenge[] = [];
    const challenges = (task.content?.context?.challenges || []) as Challenge[];
    
    interactions.forEach(i => {
      if (i.metadata?.challengeId) {
        const challenge = challenges.find(c => c.id === i.metadata.challengeId);
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
      sum + (i.content?.length || 0), 0) / Math.max(interactions.length, 1);
    
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
      explored.forEach((tool: string) => tools.add(tool));
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