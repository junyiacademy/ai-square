/**
 * PBL Learning Service
 * 
 * 實作統一學習架構中的 PBL (Problem-Based Learning) 模組
 * 負責處理問題導向學習的業務邏輯
 */

import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import type { 
  IProgram, 
  ITask, 
  IEvaluation,
  IInteraction
} from '@/types/unified-learning';
import type { TaskType } from '@/types/database';
import type { 
  BaseLearningService,
  LearningOptions,
  LearningProgress,
  TaskResult,
  CompletionResult
} from './base-learning-service';

export interface PBLScenarioData {
  taskTemplates: Array<{
    id: string;
    title: Record<string, string>;
    description?: Record<string, string>;
    type: TaskType;
    ksaCodes?: string[];
    aiModules?: string[];
    estimatedTime?: number;
    objectives?: string[];
  }>;
  ksaMappings?: Array<{
    code: string;
    competency: string;
    domain: string;
  }>;
}

export class PBLLearningService implements BaseLearningService {
  private scenarioRepo = repositoryFactory.getScenarioRepository();
  private programRepo = repositoryFactory.getProgramRepository();
  private taskRepo = repositoryFactory.getTaskRepository();
  private evaluationRepo = repositoryFactory.getEvaluationRepository();

  async startLearning(
    userId: string, 
    scenarioId: string, 
    options?: LearningOptions
  ): Promise<IProgram> {
    // 1. 載入 Scenario
    const scenario = await this.scenarioRepo.findById(scenarioId);
    if (!scenario) {
      throw new Error('Scenario not found');
    }

    // 2. 驗證是 PBL 類型
    if (scenario.mode !== 'pbl' || !scenario.pblData) {
      throw new Error('Scenario is not a PBL scenario');
    }

    // 取得任務模板（從 scenario.task_templates 而非 pblData）
    const taskTemplates = scenario.taskTemplates || [];

    // 3. 創建 Program
    const program = await this.programRepo.create({
      userId,
      scenarioId,
      mode: 'pbl',
      status: 'active',
      currentTaskIndex: 0,
      completedTaskCount: 0,
      totalTaskCount: taskTemplates.length,
      totalScore: 0,
      domainScores: {},
      xpEarned: 0,
      badgesEarned: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      timeSpentSeconds: 0,
      pblData: {
        language: options?.language || 'en',
        currentPhase: 'understanding'
      },
      discoveryData: {},
      assessmentData: {},
      metadata: {
        language: options?.language || 'en'
      }
    });

    // 4. 創建 Tasks
    for (let i = 0; i < taskTemplates.length; i++) {
      const template = taskTemplates[i];
      
      // Handle both string and multilingual title/description formats
      const title = typeof template.title === 'string' 
        ? { en: template.title } 
        : template.title;
      
      const description = typeof template.description === 'string'
        ? template.description
        : template.description?.[options?.language || 'en'] || template.description?.en || '';
      
      await this.taskRepo.create({
        programId: program.id,
        scenarioId: scenarioId,  // Add missing scenarioId
        mode: 'pbl',
        taskIndex: i,
        title: title,
        type: template.type || 'chat',
        status: i === 0 ? 'active' : 'pending',
        content: {
          instructions: description,
          objectives: template.objectives || [],
          ksaCodes: template.ksaCodes || [],
          aiModules: template.aiModules || []
        },
        interactions: [],
        interactionCount: 0,
        userResponse: {},
        score: 0,
        maxScore: 100,
        allowedAttempts: 3,
        attemptCount: 0,
        timeSpentSeconds: 0,
        aiConfig: {
          modules: template.aiModules || ['tutor', 'evaluator']
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pblData: {
          phase: i === 0 ? 'understanding' : i === 1 ? 'exploring' : 'creating',
          ksaCodes: template.ksaCodes || []
        },
        discoveryData: {},
        assessmentData: {},
        metadata: {}
      });
    }

    return program;
  }

  async getProgress(programId: string): Promise<LearningProgress> {
    const program = await this.programRepo.findById(programId);
    if (!program) {
      throw new Error('Program not found');
    }

    const tasks = await this.taskRepo.findByProgram(programId);
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const currentTask = tasks.find(t => t.status === 'active');
    
    // 計算總時間
    const totalTimeSpent = tasks.reduce((sum, task) => sum + task.timeSpentSeconds, 0);
    
    // 估算剩餘時間（每個未完成任務約30分鐘）
    const remainingTasks = tasks.filter(t => t.status !== 'completed').length;
    const estimatedTimeRemaining = remainingTasks * 30 * 60; // 30 minutes per task

    return {
      programId,
      status: program.status === 'abandoned' ? 'expired' : program.status as 'pending' | 'active' | 'completed' | 'expired',
      currentTaskIndex: program.currentTaskIndex,
      totalTasks: program.totalTaskCount,
      completedTasks,
      score: program.totalScore,
      timeSpent: totalTimeSpent,
      estimatedTimeRemaining,
      metadata: {
        currentTaskId: currentTask?.id,
        currentPhase: (program.pblData as Record<string, unknown>)?.currentPhase,
        ksaProgress: await this.calculateKSAProgress(tasks)
      }
    };
  }

  async submitResponse(
    programId: string, 
    taskId: string, 
    response: Record<string, unknown>
  ): Promise<TaskResult> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // 創建新的互動記錄
    const interaction: IInteraction = {
      timestamp: new Date().toISOString(),
      type: 'user_input',
      content: response
    };

    // 更新互動記錄
    const updatedInteractions = [...task.interactions, interaction];
    await this.taskRepo.updateInteractions(taskId, updatedInteractions);

    // AI 導師回應（目前使用模擬回應）
    const aiResponse = await this.generateAIResponse(task, response);
    const aiInteraction: IInteraction = {
      timestamp: new Date().toISOString(),
      type: 'ai_response',
      content: aiResponse
    };

    // 再次更新加入 AI 回應
    await this.taskRepo.updateInteractions(taskId, [...updatedInteractions, aiInteraction]);

    // 判斷任務是否完成
    const isTaskComplete = await this.isTaskComplete(task, response);
    if (isTaskComplete) {
      await this.taskRepo.updateStatus?.(taskId, 'completed');
      
      // 自動開啟下一個任務
      const program = await this.programRepo.findById(programId);
      if (program && program.currentTaskIndex < program.totalTaskCount - 1) {
        await this.programRepo.updateProgress(programId, program.currentTaskIndex + 1);
        
        // 啟動下一個任務
        const tasks = await this.taskRepo.findByProgram(programId);
        const nextTask = tasks[program.currentTaskIndex + 1];
        if (nextTask) {
          await this.taskRepo.updateStatus?.(nextTask.id, 'active');
        }
      }
    }

    return {
      taskId,
      success: true,
      score: isTaskComplete ? 100 : 0,
      feedback: aiResponse.feedback as string || 'Good progress!',
      nextTaskAvailable: isTaskComplete,
      metadata: {
        aiResponse,
        isComplete: isTaskComplete
      }
    };
  }

  async completeLearning(programId: string): Promise<CompletionResult> {
    const program = await this.programRepo.findById(programId);
    if (!program) {
      throw new Error('Program not found');
    }

    // 獲取所有任務
    const tasks = await this.taskRepo.findByProgram(programId);
    
    // 計算總分
    const totalScore = tasks.reduce((sum, task) => sum + task.score, 0) / tasks.length;
    
    // 創建總結評估
    const evaluation = await this.evaluationRepo.create({
      userId: program.userId,
      programId,
      taskId: '', // Program level evaluation
      mode: 'pbl',
      evaluationType: 'summative',
      evaluationSubtype: 'program_complete',
      score: totalScore,
      maxScore: 100,
      domainScores: await this.calculateDomainScores(tasks),
      feedbackText: await this.generateCompletionFeedback(program, tasks),
      feedbackData: {
        completedTasks: tasks.length,
        totalTime: tasks.reduce((sum, t) => sum + t.timeSpentSeconds, 0),
        ksaAchieved: await this.calculateKSAProgress(tasks)
      },
      aiAnalysis: {},
      timeTakenSeconds: tasks.reduce((sum, t) => sum + t.timeSpentSeconds, 0),
      createdAt: new Date().toISOString(),
      pblData: {
        phases: ['understanding', 'exploring', 'creating'],
        completedPhases: 3
      },
      discoveryData: {},
      assessmentData: {},
      metadata: {}
    });

    // 更新 Program 狀態
    await this.programRepo.complete(programId);

    return {
      program,
      evaluation,
      passed: totalScore >= 70,
      finalScore: totalScore,
      metadata: {
        ksaProgress: await this.calculateKSAProgress(tasks),
        timeSpent: tasks.reduce((sum, t) => sum + t.timeSpentSeconds, 0),
        completedTasks: tasks.filter(t => t.status === 'completed').length
      }
    };
  }

  async getNextTask(programId: string): Promise<ITask | null> {
    const tasks = await this.taskRepo.findByProgram(programId);
    return tasks.find(t => t.status === 'active') || null;
  }

  async evaluateTask(taskId: string): Promise<IEvaluation> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // 評估任務表現
    const score = this.calculateTaskScore(task);
    
    const evaluation = await this.evaluationRepo.create({
      userId: '', // Will be filled from program
      programId: task.programId,
      taskId: task.id,
      mode: 'pbl',
      evaluationType: 'formative',
      evaluationSubtype: 'task_complete',
      score,
      maxScore: 100,
      domainScores: {},
      feedbackText: this.generateTaskFeedback(task, score),
      feedbackData: {
        interactions: task.interactions.length,
        timeSpent: task.timeSpentSeconds,
        ksaCodes: (task.pblData as Record<string, unknown>)?.ksaCodes || []
      },
      aiAnalysis: {},
      timeTakenSeconds: task.timeSpentSeconds,
      createdAt: new Date().toISOString(),
      pblData: {
        phase: (task.pblData as Record<string, unknown>)?.phase,
        ksaCodes: (task.pblData as Record<string, unknown>)?.ksaCodes || []
      },
      discoveryData: {},
      assessmentData: {},
      metadata: {}
    });

    return evaluation;
  }

  async generateFeedback(evaluationId: string, language: string): Promise<string> {
    const evaluation = await this.evaluationRepo.findById(evaluationId);
    if (!evaluation) {
      throw new Error('Evaluation not found');
    }

    // TODO: 整合 AI 服務生成個人化回饋
    // 目前返回預設回饋
    const templates = {
      en: `Great job! You scored ${evaluation.score}% on this task. ${evaluation.feedbackText}`,
      zh: `做得好！你在這個任務中獲得了 ${evaluation.score}% 的分數。${evaluation.feedbackText}`,
      es: `¡Buen trabajo! Obtuviste ${evaluation.score}% en esta tarea. ${evaluation.feedbackText}`
    };

    return templates[language as keyof typeof templates] || templates.en;
  }

  // Private helper methods

  private async generateAIResponse(
    task: ITask, 
    userResponse: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // TODO: 整合 AI 服務
    void userResponse; // Mark as intentionally unused for now
    // 目前返回模擬回應
    const phase = (task.pblData as Record<string, unknown>)?.phase || 'understanding';
    
    const responses = {
      understanding: {
        message: "That's a good observation! Let me help you explore this problem further. What aspects of this challenge do you find most interesting?",
        feedback: "You're showing good understanding of the problem.",
        hints: ["Consider the stakeholders involved", "Think about the impact"],
        nextSteps: ["Research similar solutions", "Identify key requirements"]
      },
      exploring: {
        message: "Excellent research! Your approach shows critical thinking. Have you considered how different solutions might affect various users?",
        feedback: "Your exploration is thorough and well-structured.",
        hints: ["Compare pros and cons", "Consider scalability"],
        nextSteps: ["Prototype your solution", "Get feedback"]
      },
      creating: {
        message: "Your solution is innovative! I can see you've put thought into the implementation. How would you measure its success?",
        feedback: "Creative problem-solving demonstrated.",
        hints: ["Think about metrics", "Consider user testing"],
        nextSteps: ["Refine based on feedback", "Plan next iteration"]
      }
    };

    return responses[phase as keyof typeof responses] || responses.understanding;
  }

  private async isTaskComplete(
    task: ITask, 
    response: Record<string, unknown>
  ): Promise<boolean> {
    // 簡單的完成判斷邏輯
    // TODO: 實作更複雜的評估邏輯
    
    // 檢查是否有明確的完成信號
    if (response.isComplete === true) {
      return true;
    }

    // 檢查互動次數（至少3次對話）
    if (task.interactions.length >= 6) { // 3 user inputs + 3 AI responses
      return true;
    }

    // 檢查是否包含所需的關鍵元素
    const requiredElements = ['problem', 'solution', 'implementation'];
    const responseText = JSON.stringify(response).toLowerCase();
    const hasAllElements = requiredElements.every(element => 
      responseText.includes(element)
    );

    return hasAllElements;
  }

  private calculateTaskScore(task: ITask): number {
    // 基於互動品質計算分數
    const interactionScore = Math.min(task.interactions.length * 10, 40);
    
    // 基於時間投入計算分數（適中最好）
    const timeMinutes = task.timeSpentSeconds / 60;
    const timeScore = timeMinutes < 5 ? 10 : 
                     timeMinutes > 60 ? 20 : 
                     30;
    
    // 基於任務完成度
    const completionScore = task.status === 'completed' ? 30 : 0;
    
    return interactionScore + timeScore + completionScore;
  }

  private generateTaskFeedback(task: ITask, score: number): string {
    if (score >= 80) {
      return "Excellent work! You demonstrated deep understanding and creative problem-solving.";
    } else if (score >= 60) {
      return "Good effort! You showed solid understanding of the concepts.";
    } else {
      return "Keep working on it! Consider exploring the problem from different angles.";
    }
  }

  private async calculateKSAProgress(tasks: ITask[]): Promise<Record<string, number>> {
    const ksaProgress: Record<string, number> = {};
    
    for (const task of tasks) {
      const ksaCodes = (task.pblData as Record<string, unknown>)?.ksaCodes as string[] || [];
      for (const code of ksaCodes) {
        if (task.status === 'completed') {
          ksaProgress[code] = (ksaProgress[code] || 0) + 1;
        }
      }
    }
    
    return ksaProgress;
  }

  private async calculateDomainScores(tasks: ITask[]): Promise<Record<string, number>> {
    // 簡化的領域分數計算
    const domains = ['Engaging_with_AI', 'Creating_with_AI', 'Managing_AI', 'Designing_AI'];
    const scores: Record<string, number> = {};
    
    for (const domain of domains) {
      // 每個領域基於相關任務的平均分數
      const relevantTasks = tasks.filter(t => 
        JSON.stringify(t.content).includes(domain)
      );
      
      if (relevantTasks.length > 0) {
        scores[domain] = relevantTasks.reduce((sum, t) => sum + t.score, 0) / relevantTasks.length;
      } else {
        scores[domain] = 0;
      }
    }
    
    return scores;
  }

  private async generateCompletionFeedback(program: IProgram, tasks: ITask[]): Promise<string> {
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalScore = tasks.reduce((sum, t) => sum + t.score, 0) / tasks.length;
    
    return `Congratulations on completing the PBL scenario! You completed ${completedTasks} out of ${tasks.length} tasks with an average score of ${totalScore.toFixed(1)}%. Your problem-solving journey showed growth in understanding, exploration, and creative solutions.`;
  }
}