/**
 * Learning Service Factory
 * 
 * 統一管理所有學習服務的創建
 * 實現策略模式，根據學習模式返回對應的服務
 */

import type { BaseLearningService, ILearningServiceFactory } from './base-learning-service';
import { AssessmentLearningService } from './assessment-learning-service';
// import { PBLLearningService } from './pbl-learning-service';
// import { DiscoveryLearningService } from './discovery-learning-service';

export class LearningServiceFactory implements ILearningServiceFactory {
  private static instance: LearningServiceFactory;
  private services: Map<string, BaseLearningService>;

  private constructor() {
    this.services = new Map();
    this.initializeServices();
  }

  public static getInstance(): LearningServiceFactory {
    if (!LearningServiceFactory.instance) {
      LearningServiceFactory.instance = new LearningServiceFactory();
    }
    return LearningServiceFactory.instance;
  }

  private initializeServices(): void {
    // 初始化各個學習服務
    // Note: AssessmentLearningService 需要適配 BaseLearningService 介面
    // 這裡暫時使用 adapter pattern
    this.services.set('assessment', this.createAssessmentAdapter());
    
    // TODO: 實作其他服務
    // this.services.set('pbl', new PBLLearningService());
    // this.services.set('discovery', new DiscoveryLearningService());
  }

  public getService(mode: 'assessment' | 'pbl' | 'discovery'): BaseLearningService {
    const service = this.services.get(mode);
    if (!service) {
      throw new Error(`Learning service for mode '${mode}' not found`);
    }
    return service;
  }

  /**
   * 創建 Assessment 服務的適配器
   * 將 AssessmentLearningService 適配到 BaseLearningService 介面
   */
  private createAssessmentAdapter(): BaseLearningService {
    const assessmentService = new AssessmentLearningService();
    
    return {
      async startLearning(userId, scenarioId, options) {
        return assessmentService.startAssessment(
          userId, 
          scenarioId, 
          options?.language || 'en'
        );
      },

      async getProgress(programId) {
        const progress = await assessmentService.getProgress(programId);
        return {
          programId: progress.programId,
          status: progress.status as any,
          currentTaskIndex: 0,
          totalTasks: 1,
          completedTasks: progress.answeredQuestions === progress.totalQuestions ? 1 : 0,
          score: progress.currentScore,
          timeSpent: progress.timeElapsed,
          estimatedTimeRemaining: progress.timeRemaining,
          metadata: {
            answeredQuestions: progress.answeredQuestions,
            totalQuestions: progress.totalQuestions
          }
        };
      },

      async submitResponse(programId, taskId, response) {
        const result = await assessmentService.submitAnswer(
          programId,
          response.questionId,
          response.answer
        );
        
        return {
          taskId,
          success: true,
          score: result.isCorrect ? 100 : 0,
          feedback: result.isCorrect ? 'Correct!' : `Incorrect. The correct answer is ${result.correctAnswer}`,
          nextTaskAvailable: false, // Assessment only has one task
          metadata: result
        };
      },

      async completeLearning(programId) {
        const result = await assessmentService.completeAssessment(programId);
        return {
          program: result.program,
          evaluation: result.evaluation,
          passed: result.passed,
          finalScore: result.score,
          metadata: {
            domainScores: result.domainScores
          }
        };
      },

      async getNextTask(programId) {
        // Assessment doesn't have multiple tasks
        return null;
      },

      async evaluateTask(taskId) {
        // This would be implemented if needed
        throw new Error('Not implemented for assessment mode');
      },

      async generateFeedback(evaluationId, language) {
        // This would be implemented with AI service
        return 'Thank you for completing the assessment.';
      }
    };
  }
}

// Export singleton instance
export const learningServiceFactory = LearningServiceFactory.getInstance();