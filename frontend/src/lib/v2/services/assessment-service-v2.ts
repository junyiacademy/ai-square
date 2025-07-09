/**
 * Assessment Service V2
 * Built on top of Unified Storage Service
 */

import { UnifiedStorageService } from './unified-storage.service';
import { LearningProject, Scenario, Program, Task } from '../schemas/unified.schema';
import { v4 as uuidv4 } from 'uuid';

// Assessment-specific types
interface AssessmentQuestion {
  id: string;
  domain: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  type: 'multiple_choice' | 'short_answer' | 'essay';
  question: Record<string, string>; // multi-language
  options?: Record<string, Record<string, string>>; // multi-language
  correctAnswer: string;
  explanation: Record<string, string>; // multi-language
  ksaMapping: {
    knowledge: string[];
    skills: string[];
    attitudes: string[];
  };
  points: number;
}

interface AnswerHistoryEntry {
  timestamp: string;
  action: 'view' | 'answer' | 'change' | 'submit' | 'skip';
  answer?: any;
  timeSpent: number; // seconds since last action
}

export class AssessmentServiceV2 {
  constructor(private storage: UnifiedStorageService) {}

  // === Project (Exam) Management ===
  
  async createAssessmentProject(
    code: string,
    title: string,
    description: string,
    metadata: {
      assessmentType: 'quick' | 'comprehensive' | 'adaptive' | 'certification';
      totalQuestions: number;
      passingScore: number;
      estimatedMinutes: number;
      domains: string[];
      competencies: string[];
    }
  ): Promise<LearningProject> {
    return this.storage.createProject({
      type: 'assessment',
      code,
      title,
      description,
      objectives: [`Complete assessment with ${metadata.passingScore}% or higher`],
      prerequisites: [],
      metadata,
      is_active: true
    });
  }
  
  async getAssessmentProject(code: string): Promise<LearningProject | null> {
    const project = await this.storage.getProjectByCode(code);
    if (project && project.type === 'assessment') {
      return project;
    }
    return null;
  }
  
  async getAllAssessmentProjects(): Promise<LearningProject[]> {
    return this.storage.getAllProjects('assessment');
  }

  // === Scenario (User's Assessment Journey) ===
  
  async startAssessment(userEmail: string, projectCode: string): Promise<{
    scenario: Scenario;
    program: Program;
  }> {
    const project = await this.getAssessmentProject(projectCode);
    if (!project) {
      throw new Error(`Assessment project ${projectCode} not found`);
    }
    
    // Create or get scenario
    const scenario = await this.storage.createScenario(
      userEmail,
      project.id,
      {
        language: 'en',
        startTime: new Date().toISOString()
      }
    );
    
    // Update scenario status to active
    if (scenario.status === 'created') {
      await this.storage.updateScenario(scenario.id, {
        status: 'active',
        started_at: new Date().toISOString()
      });
    }
    
    // Create a new program (assessment attempt)
    const existingPrograms = await this.storage.getScenarioPrograms(scenario.id);
    const attemptNumber = existingPrograms.length + 1;
    
    const program = await this.storage.createProgram(
      scenario.id,
      `Attempt ${attemptNumber}`,
      attemptNumber,
      {
        totalQuestions: project.metadata.totalQuestions,
        passingScore: project.metadata.passingScore,
        timeLimit: project.metadata.estimatedMinutes
      },
      {
        startedAt: new Date().toISOString()
      }
    );
    
    return { scenario, program };
  }
  
  async getUserAssessmentHistory(userEmail: string): Promise<{
    scenarios: Scenario[];
    programsByScenario: Record<string, Program[]>;
  }> {
    const scenarios = await this.storage.getUserScenarios(userEmail);
    const assessmentScenarios = scenarios.filter(s => s.type === 'assessment');
    
    const programsByScenario: Record<string, Program[]> = {};
    
    for (const scenario of assessmentScenarios) {
      programsByScenario[scenario.id] = await this.storage.getScenarioPrograms(scenario.id);
    }
    
    return { scenarios: assessmentScenarios, programsByScenario };
  }

  // === Task (Question) Management ===
  
  async createQuestionsForProgram(
    programId: string,
    questions: AssessmentQuestion[]
  ): Promise<Task[]> {
    const tasks: Task[] = [];
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const task = await this.storage.createTask(
        programId,
        `Question ${i + 1}`,
        i + 1,
        'quiz',
        {
          question,
          answerHistory: [] as AnswerHistoryEntry[]
        },
        {
          sourceQuestionId: question.id,
          domain: question.domain,
          difficulty: question.difficulty,
          points: question.points
        }
      );
      
      tasks.push(task);
    }
    
    return tasks;
  }
  
  async recordAnswer(
    taskId: string,
    action: 'view' | 'answer' | 'change' | 'submit' | 'skip',
    answer?: any
  ): Promise<Task> {
    const task = await this.storage.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    const answerHistory = task.config.answerHistory || [];
    const lastEntry = answerHistory[answerHistory.length - 1];
    const lastTimestamp = lastEntry ? new Date(lastEntry.timestamp).getTime() : new Date(task.created_at).getTime();
    const now = Date.now();
    const timeSpent = Math.floor((now - lastTimestamp) / 1000);
    
    const newEntry: AnswerHistoryEntry = {
      timestamp: new Date().toISOString(),
      action,
      answer,
      timeSpent
    };
    
    answerHistory.push(newEntry);
    
    const updates: Partial<Task> = {
      config: {
        ...task.config,
        answerHistory
      }
    };
    
    // Update task status based on action
    if (!task.started_at && action !== 'view') {
      updates.started_at = new Date().toISOString();
      updates.status = 'active';
    }
    
    if (action === 'submit') {
      updates.status = 'completed';
      updates.completed_at = new Date().toISOString();
      updates.metadata = {
        ...task.metadata,
        finalAnswer: answer,
        totalTimeSpent: answerHistory.reduce((sum, entry) => sum + entry.timeSpent, 0)
      };
    }
    
    if (action === 'skip') {
      updates.status = 'skipped';
    }
    
    return this.storage.updateTask(taskId, updates);
  }
  
  async evaluateTask(taskId: string): Promise<{
    isCorrect: boolean;
    score: number;
    explanation: Record<string, string>;
  }> {
    const task = await this.storage.getTask(taskId);
    if (!task || task.type !== 'quiz') {
      throw new Error(`Task ${taskId} not found or not a quiz`);
    }
    
    const question = task.config.question as AssessmentQuestion;
    const userAnswer = task.metadata.finalAnswer;
    
    const isCorrect = userAnswer === question.correctAnswer;
    const score = isCorrect ? question.points : 0;
    
    // Update task with evaluation result
    await this.storage.updateTask(taskId, {
      metadata: {
        ...task.metadata,
        isCorrect,
        score,
        evaluated: true,
        evaluatedAt: new Date().toISOString()
      }
    });
    
    return {
      isCorrect,
      score,
      explanation: question.explanation
    };
  }

  // === Program Completion ===
  
  async completeProgram(programId: string): Promise<{
    program: Program;
    results: {
      totalScore: number;
      maxScore: number;
      percentage: number;
      passed: boolean;
      timeSpent: number;
      byDomain: Record<string, { correct: number; total: number; percentage: number }>;
    };
  }> {
    const program = await this.storage.getProgram(programId);
    if (!program) {
      throw new Error(`Program ${programId} not found`);
    }
    
    const tasks = await this.storage.getProgramTasks(programId);
    
    // Calculate results
    let totalScore = 0;
    let maxScore = 0;
    let totalTimeSpent = 0;
    const domainStats: Record<string, { correct: number; total: number }> = {};
    
    for (const task of tasks) {
      const question = task.config.question as AssessmentQuestion;
      const points = question.points;
      maxScore += points;
      
      if (task.metadata.isCorrect) {
        totalScore += points;
      }
      
      totalTimeSpent += task.metadata.totalTimeSpent || 0;
      
      // Domain stats
      const domain = task.metadata.domain;
      if (!domainStats[domain]) {
        domainStats[domain] = { correct: 0, total: 0 };
      }
      domainStats[domain].total++;
      if (task.metadata.isCorrect) {
        domainStats[domain].correct++;
      }
    }
    
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const passed = percentage >= (program.config.passingScore || 70);
    
    // Calculate domain percentages
    const byDomain: Record<string, { correct: number; total: number; percentage: number }> = {};
    for (const [domain, stats] of Object.entries(domainStats)) {
      byDomain[domain] = {
        ...stats,
        percentage: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
      };
    }
    
    // Update program with results
    const updatedProgram = await this.storage.updateProgram(programId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      metadata: {
        ...program.metadata,
        results: {
          totalScore,
          maxScore,
          percentage,
          passed,
          timeSpent: totalTimeSpent,
          byDomain
        }
      }
    });
    
    // Update scenario if all programs are complete
    const scenario = await this.storage.getScenario(program.scenario_id);
    if (scenario) {
      const allPrograms = await this.storage.getScenarioPrograms(scenario.id);
      const allComplete = allPrograms.every(p => p.status === 'completed');
      
      if (allComplete) {
        await this.storage.updateScenario(scenario.id, {
          status: 'completed',
          completed_at: new Date().toISOString()
        });
      }
    }
    
    return {
      program: updatedProgram,
      results: {
        totalScore,
        maxScore,
        percentage,
        passed,
        timeSpent: totalTimeSpent,
        byDomain
      }
    };
  }

  // === Utility Methods ===
  
  async getProgramWithDetails(programId: string): Promise<{
    program: Program | null;
    scenario: Scenario | null;
    project: LearningProject | null;
    tasks: Task[];
    results?: any;
  }> {
    const program = await this.storage.getProgram(programId);
    if (!program) {
      return { program: null, scenario: null, project: null, tasks: [] };
    }
    
    const [scenario, tasks] = await Promise.all([
      this.storage.getScenario(program.scenario_id),
      this.storage.getProgramTasks(programId)
    ]);
    
    let project: LearningProject | null = null;
    if (scenario) {
      project = await this.storage.getProject(scenario.project_id);
    }
    
    return {
      program,
      scenario,
      project,
      tasks,
      results: program.metadata.results
    };
  }
}