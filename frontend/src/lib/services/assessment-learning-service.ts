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
import type { 
  BaseLearningService,
  LearningOptions,
  LearningProgress,
  TaskResult,
  CompletionResult
} from './base-learning-service';

export type StartAssessmentResult = IProgram;

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

export class AssessmentLearningService implements BaseLearningService {
  private scenarioRepo = repositoryFactory.getScenarioRepository();
  private programRepo = repositoryFactory.getProgramRepository();
  private taskRepo = repositoryFactory.getTaskRepository();
  private evaluationRepo = repositoryFactory.getEvaluationRepository();

  // Implement BaseLearningService interface methods
  async startLearning(userId: string, scenarioId: string, options?: LearningOptions): Promise<IProgram> {
    const language = options?.language || 'en';
    const result = await this.startAssessment(userId, scenarioId, language);
    return result; // StartAssessmentResult is already IProgram
  }

  async submitResponse(programId: string, taskId: string, response: Record<string, unknown>): Promise<TaskResult> {
    const questionId = response.questionId as string;
    const answer = response.answer as string;
    const result = await this.submitAnswer(programId, questionId, answer);
    
    return {
      taskId,
      success: true,
      score: result.isCorrect ? 100 : 0,
      feedback: result.isCorrect ? 'Correct!' : `Incorrect. The correct answer is ${result.correctAnswer}`,
      nextTaskAvailable: false,
      metadata: result as unknown as Record<string, unknown>
    };
  }

  async completeLearning(programId: string): Promise<CompletionResult> {
    const result = await this.completeAssessment(programId);
    return {
      program: result.program,
      evaluation: result.evaluation,
      passed: result.passed,
      finalScore: result.score,
      metadata: {
        domainScores: result.domainScores
      }
    };
  }

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
      title: scenario.taskTemplates?.[0]?.title || { en: 'Assessment' },
      type: 'question',
      status: 'active',
      content: {
        instructions: 'Complete the assessment',
        context: {
          questions,
          timeLimit: (scenario.assessmentData as Record<string, unknown>)?.timeLimitMinutes || 15,
          language
        },
        // Also keep questions at root level for backward compatibility
        questions,
        timeLimit: (scenario.assessmentData as Record<string, unknown>)?.timeLimitMinutes || 15
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
    const content = task.content as Record<string, unknown>;
    const questions = (content.questions as Array<Record<string, unknown>>) || [];
    
    // 2. 找到題目並檢查答案
    const question = questions.find((q: Record<string, unknown>) => q.id === questionId);
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
      correctAnswer: isCorrect ? undefined : question.correct_answer as string
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
      feedbackText: this.generateSimpleFeedback(scoreData as Record<string, unknown>),
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
    const passingScore = (scenario?.assessmentData as Record<string, unknown>)?.passingScore as number || 60;
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
   * 取得下一個任務
   */
  async getNextTask(programId: string): Promise<ITask | null> {
    // Assessment only has one task
    const tasks = await this.taskRepo.findByProgram(programId);
    return tasks?.[0] || null;
  }

  /**
   * 評估任務表現
   */
  async evaluateTask(taskId: string): Promise<IEvaluation> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const scoreData = this.calculateScore(task);
    const evaluation = await this.evaluationRepo.create({
      userId: '', // Will be filled from task
      programId: task.programId,
      taskId: task.id,
      mode: 'assessment',
      evaluationType: 'task',
      evaluationSubtype: 'task_complete',
      score: scoreData.totalScore,
      maxScore: 100,
      domainScores: scoreData.domainScores,
      feedbackText: this.generateSimpleFeedback(scoreData as Record<string, unknown>),
      feedbackData: {
        correctAnswers: scoreData.correctAnswers,
        totalQuestions: scoreData.totalQuestions
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

    return evaluation;
  }

  /**
   * 產生學習回饋
   */
  async generateFeedback(
    evaluationId: string,
    language: string
  ): Promise<string> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) {
      throw new Error('Evaluation not found');
    }

    // Return pre-generated feedback for now
    // TODO: Implement AI-based feedback generation with language support
    // For now, we acknowledge the language parameter for future use
    void language; // Mark as intentionally unused
    return evaluation.feedbackText || 'Good job!';
  }

  /**
   * 取得進度
   */
  async getProgress(programId: string): Promise<LearningProgress> {
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
      i => i.type === 'user_input' && (i.content as Record<string, unknown>)?.questionId
    ).length;

    const assessmentData = program.assessmentData as Record<string, unknown> || {};
    const selectedQuestions = assessmentData.selectedQuestions as string[] || [];
    const totalQuestions = selectedQuestions.length;
    const timeStartedValue = assessmentData.timeStarted as string || program.startedAt || '';
    const timeStarted = new Date(timeStartedValue).getTime();
    const timeElapsed = Math.floor((Date.now() - timeStarted) / 1000);
    const timeLimit = ((assessmentData.timeLimit as number) || 15) * 60; // Convert to seconds
    const timeRemaining = Math.max(0, timeLimit - timeElapsed);

    return {
      programId,
      status: program.status === 'abandoned' ? 'expired' : program.status as 'pending' | 'active' | 'completed' | 'expired',
      currentTaskIndex: program.currentTaskIndex,
      totalTasks: program.totalTaskCount,
      completedTasks: program.completedTaskCount,
      score: this.calculateCurrentScore(task),
      timeSpent: timeElapsed,
      estimatedTimeRemaining: timeRemaining,
      metadata: {
        answeredQuestions,
        totalQuestions,
        timeElapsed,
        timeRemaining,
        currentScore: this.calculateCurrentScore(task)
      }
    };
  }

  // Helper methods

  private selectQuestions(scenario: IScenario, language: string): Array<Record<string, unknown>> {
    const assessmentData = scenario.assessmentData as Record<string, unknown> || {};
    
    console.log('selectQuestions - assessmentData keys:', Object.keys(assessmentData));
    console.log('selectQuestions - assessmentData.questionBank type:', typeof assessmentData.questionBank);
    
    let allQuestions: Array<Record<string, unknown>> = [];
    
    // Check for questionBankByLanguage first (multi-language format)
    const questionBankByLanguage = assessmentData.questionBankByLanguage as Record<string, Array<Record<string, unknown>>>;
    
    if (questionBankByLanguage && (questionBankByLanguage[language] || questionBankByLanguage['en'])) {
      // Format 1: questionBankByLanguage
      console.log('Using questionBankByLanguage format');
      allQuestions = questionBankByLanguage[language] || questionBankByLanguage['en'] || [];
    } else if (assessmentData.questionBank) {
      // Format 2: questionBank (domain-grouped structure)
      console.log('Using questionBank format');
      const questionBank = assessmentData.questionBank;
      
      // PostgreSQL JSONB might return as object or array
      let bankArray: Array<Record<string, unknown>> = [];
      
      if (Array.isArray(questionBank)) {
        bankArray = questionBank;
      } else if (typeof questionBank === 'object' && questionBank !== null) {
        // If it's an object, try to convert it to array
        // Check if it has numeric keys (like {0: {...}, 1: {...}})
        const keys = Object.keys(questionBank);
        if (keys.every(k => !isNaN(Number(k)))) {
          // It's an array-like object
          bankArray = Object.values(questionBank) as Array<Record<string, unknown>>;
        } else {
          // It might be a single domain object
          bankArray = [questionBank as Record<string, unknown>];
        }
      }
      
      console.log(`questionBank converted to array with ${bankArray.length} domains`);
      
      // Extract questions from all domains
      allQuestions = bankArray.flatMap((domain: Record<string, unknown>) => {
        const domainQuestions = domain.questions as Array<Record<string, unknown>> || [];
        console.log(`Domain ${domain.id}: ${domainQuestions.length} questions`);
        return domainQuestions.map(q => ({
          ...q,
          domainId: domain.id // Add domain ID to each question
        }));
      });
    }
    
    console.log(`Found ${allQuestions.length} questions total`);
    
    if (allQuestions.length === 0) {
      console.error('No questions found. AssessmentData:', JSON.stringify(assessmentData, null, 2));
      throw new Error('No questions found in assessment data');
    }
    
    const totalQuestions = (assessmentData.totalQuestions as number) || 12;
    
    // Simple random selection for now
    // TODO: Implement domain-based selection
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(totalQuestions, shuffled.length));
    
    console.log(`Selected ${selected.length} questions`);
    return selected;
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
    questionResults: Array<Record<string, unknown>>;
  } {
    const interactions = task.interactions.filter(i => i.type === 'user_input');
    const correctAnswers = interactions.filter(i => (i.content as Record<string, unknown>)?.isCorrect).length;
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
      questionResults: interactions.map(i => i.content) as Record<string, unknown>[]
    };
  }

  private calculateCurrentScore(task: ITask): number {
    const scoreData = this.calculateScore(task);
    return scoreData.totalScore;
  }

  private generateSimpleFeedback(scoreData: Record<string, unknown>): string {
    const percentage = scoreData.totalScore as number;
    
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