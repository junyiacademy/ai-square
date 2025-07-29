/**
 * Assessment Learning Service
 * 
 * 實作統一學習架構中的 Assessment 模組
 * 負責處理評估相關的業務邏輯
 */

import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import type { 
  IScenario, 
  IProgram, 
  ITask, 
  IEvaluation,
  IInteraction 
} from '@/types/unified-learning';
import type { BaseLearningService } from './base-learning-service';

export interface StartAssessmentResult extends IProgram {
  // Assessment-specific fields can be added here
}

export interface SubmitAnswerResult {
  isCorrect: boolean;
  questionId: string;
  selectedAnswer: string;
  correctAnswer?: string;
}

export interface CompleteAssessmentResult {
  program: IProgram;
  evaluation: IEvaluation;
  passed: boolean;
  score: number;
  domainScores: Record<string, number>;
}

export interface AssessmentProgress {
  programId: string;
  status: string;
  answeredQuestions: number;
  totalQuestions: number;
  timeElapsed: number;
  timeRemaining: number;
  currentScore?: number;
}

export class AssessmentLearningService implements Partial<BaseLearningService> {
  private scenarioRepo = repositoryFactory.getScenarioRepository();
  private programRepo = repositoryFactory.getProgramRepository();
  private taskRepo = repositoryFactory.getTaskRepository();
  private evaluationRepo = repositoryFactory.getEvaluationRepository();

  /**
   * 開始新的評估
   */
  async startAssessment(
    userId: string, 
    scenarioId: string, 
    language: string = 'en'
  ): Promise<StartAssessmentResult> {
    // 1. 載入 Scenario
    const scenario = await this.scenarioRepo.findById(scenarioId);
    if (!scenario) {
      throw new Error('Scenario not found');
    }

    // 2. 驗證是 Assessment 類型
    if (scenario.mode !== 'assessment' || !scenario.assessmentData) {
      throw new Error('Scenario is not an assessment');
    }

    // 3. 選擇題目（根據語言和領域）
    const questions = this.selectQuestions(scenario, language);

    // 4. 創建 Program
    const program = await this.programRepo.create({
      userId,
      scenarioId,
      mode: 'assessment',
      status: 'active',
      currentTaskIndex: 0,
      completedTaskCount: 0,
      totalTaskCount: 1, // Assessment 只有一個 task
      totalScore: 0,
      domainScores: {},
      xpEarned: 0,
      badgesEarned: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      timeSpentSeconds: 0,
      pblData: {},
      discoveryData: {},
      assessmentData: {
        selectedQuestions: questions.map(q => q.id),
        timeStarted: new Date().toISOString(),
        timeLimit: scenario.assessmentData.timeLimit
      },
      metadata: {
        language
      }
    });

    // 5. 創建 Assessment Task
    await this.taskRepo.create({
      programId: program.id,
      mode: 'assessment',
      taskIndex: 0,
      title: scenario.taskTemplates[0]?.title || { en: 'Assessment' },
      type: 'question',
      status: 'active',
      content: {
        instructions: 'Complete the assessment',
        questions,
        timeLimit: scenario.assessmentData.timeLimit,
        language
      },
      interactions: [],
      interactionCount: 0,
      userResponse: {},
      score: 0,
      maxScore: 100,
      allowedAttempts: 1,
      attemptCount: 0,
      timeSpentSeconds: 0,
      aiConfig: {},
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pblData: {},
      discoveryData: {},
      assessmentData: {},
      metadata: {}
    });

    return program;
  }

  /**
   * 提交答案
   */
  async submitAnswer(
    programId: string,
    questionId: string,
    answer: string
  ): Promise<SubmitAnswerResult> {
    // 1. 取得 Task
    const tasks = await this.taskRepo.findByProgram(programId);
    if (!tasks || tasks.length === 0) {
      throw new Error('No task found for program');
    }

    const task = tasks[0]; // Assessment 只有一個 task
    const questions = (task.content as any).questions || [];
    
    // 2. 找到題目並檢查答案
    const question = questions.find((q: any) => q.id === questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    const isCorrect = question.correct_answer === answer;

    // 3. 記錄互動
    const interaction: IInteraction = {
      timestamp: new Date().toISOString(),
      type: 'user_input',
      content: {
        questionId,
        selectedAnswer: answer,
        isCorrect,
        timeSpent: this.calculateTimeSpent(task)
      }
    };

    const updatedInteractions = [...task.interactions, interaction];
    await this.taskRepo.updateInteractions(task.id, updatedInteractions);

    return {
      isCorrect,
      questionId,
      selectedAnswer: answer,
      correctAnswer: isCorrect ? undefined : question.correct_answer
    };
  }

  /**
   * 完成評估
   */
  async completeAssessment(programId: string): Promise<CompleteAssessmentResult> {
    // 1. 取得 Program 和 Task
    const program = await this.programRepo.findById(programId);
    if (!program) {
      throw new Error('Program not found');
    }

    const tasks = await this.taskRepo.findByProgram(programId);
    if (!tasks || tasks.length === 0) {
      throw new Error('No task found');
    }

    const task = tasks[0];

    // 2. 計算分數
    const scoreData = this.calculateScore(task);
    
    // 3. 更新 Program
    const completedProgram = await this.programRepo.complete(programId);

    // 4. 創建 Evaluation
    const evaluation = await this.evaluationRepo.create({
      userId: program.userId,
      programId,
      taskId: task.id,
      mode: 'assessment',
      evaluationType: 'program',
      evaluationSubtype: 'assessment_complete',
      score: scoreData.totalScore,
      maxScore: 100,
      domainScores: scoreData.domainScores,
      feedbackText: this.generateFeedback(scoreData),
      feedbackData: {
        correctAnswers: scoreData.correctAnswers,
        totalQuestions: scoreData.totalQuestions,
        timeSpent: task.timeSpentSeconds
      },
      aiAnalysis: {},
      timeTakenSeconds: task.timeSpentSeconds,
      createdAt: new Date().toISOString(),
      pblData: {},
      discoveryData: {},
      assessmentData: {
        questions: scoreData.questionResults
      },
      metadata: {}
    });

    // 5. 判斷是否通過
    const scenario = await this.scenarioRepo.findById(program.scenarioId);
    const passingScore = scenario?.assessmentData?.passingScore || 60;
    const passed = scoreData.totalScore >= passingScore;

    return {
      program: completedProgram,
      evaluation,
      passed,
      score: scoreData.totalScore,
      domainScores: scoreData.domainScores
    };
  }

  /**
   * 取得進度
   */
  async getProgress(programId: string): Promise<AssessmentProgress> {
    const program = await this.programRepo.findById(programId);
    if (!program) {
      throw new Error('Program not found');
    }

    const tasks = await this.taskRepo.findByProgram(programId);
    const task = tasks?.[0];
    
    if (!task) {
      throw new Error('No task found');
    }

    const answeredQuestions = task.interactions.filter(
      i => i.type === 'user_input' && i.content?.questionId
    ).length;

    const totalQuestions = program.assessmentData?.selectedQuestions?.length || 0;
    const timeStarted = new Date(program.assessmentData?.timeStarted || program.startedAt || '').getTime();
    const timeElapsed = Math.floor((Date.now() - timeStarted) / 1000);
    const timeLimit = (program.assessmentData?.timeLimit || 15) * 60; // Convert to seconds
    const timeRemaining = Math.max(0, timeLimit - timeElapsed);

    return {
      programId,
      status: program.status,
      answeredQuestions,
      totalQuestions,
      timeElapsed,
      timeRemaining,
      currentScore: this.calculateCurrentScore(task)
    };
  }

  // Helper methods

  private selectQuestions(scenario: IScenario, language: string): any[] {
    const questionBank = scenario.assessmentData?.questionBankByLanguage?.[language] || 
                        scenario.assessmentData?.questionBankByLanguage?.['en'] || 
                        [];
    
    const totalQuestions = scenario.assessmentData?.totalQuestions || 12;
    
    // Simple random selection for now
    // TODO: Implement domain-based selection
    const shuffled = [...questionBank].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, totalQuestions);
  }

  private calculateTimeSpent(task: ITask): number {
    const lastInteraction = task.interactions[task.interactions.length - 1];
    if (!lastInteraction) return 0;
    
    const startTime = new Date(task.startedAt || task.createdAt).getTime();
    const currentTime = new Date(lastInteraction.timestamp).getTime();
    return Math.floor((currentTime - startTime) / 1000);
  }

  private calculateScore(task: ITask): {
    totalScore: number;
    domainScores: Record<string, number>;
    correctAnswers: number;
    totalQuestions: number;
    questionResults: any[];
  } {
    const interactions = task.interactions.filter(i => i.type === 'user_input');
    const correctAnswers = interactions.filter(i => i.content?.isCorrect).length;
    const totalQuestions = interactions.length;
    const totalScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    // TODO: Calculate domain scores based on question domains
    const domainScores = {
      overall: totalScore
    };

    return {
      totalScore,
      domainScores,
      correctAnswers,
      totalQuestions,
      questionResults: interactions.map(i => i.content)
    };
  }

  private calculateCurrentScore(task: ITask): number {
    const scoreData = this.calculateScore(task);
    return scoreData.totalScore;
  }

  private generateFeedback(scoreData: any): string {
    const percentage = scoreData.totalScore;
    
    if (percentage >= 90) {
      return 'Excellent! You have demonstrated strong AI literacy.';
    } else if (percentage >= 70) {
      return 'Good job! You have a solid understanding of AI concepts.';
    } else if (percentage >= 50) {
      return 'Fair performance. Consider reviewing the areas where you struggled.';
    } else {
      return 'Keep learning! Review the fundamental AI concepts and try again.';
    }
  }
}