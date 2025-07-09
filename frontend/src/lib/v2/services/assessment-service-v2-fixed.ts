/**
 * Assessment Service V2 - Fixed Version
 * Projects come from YAML files, not created in GCS
 */

import { UnifiedStorageService } from './unified-storage.service';
import { Scenario, Program, Task } from '../schemas/unified.schema';
import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Assessment Project from YAML
interface AssessmentProject {
  id: string; // from YAML file name
  type: 'assessment';
  title: Record<string, string>;
  description: Record<string, string>;
  assessmentType: 'quick' | 'comprehensive' | 'adaptive' | 'certification';
  totalQuestions: number;
  passingScore: number;
  estimatedMinutes: number;
  domains: string[];
  questionPool: any[];
}

// Assessment Question from YAML
interface AssessmentQuestion {
  id: string;
  domain: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  type: 'multiple_choice' | 'short_answer' | 'essay';
  question: Record<string, string>;
  options?: Record<string, Record<string, string>>;
  correctAnswer: string;
  explanation: Record<string, string>;
  ksaMapping: {
    knowledge: string[];
    skills: string[];
    attitudes: string[];
  };
  points?: number;
}

interface AnswerHistoryEntry {
  timestamp: string;
  action: 'view' | 'answer' | 'change' | 'submit' | 'skip';
  answer?: any;
  timeSpent: number;
}

export class AssessmentServiceV2Fixed {
  constructor(private storage: UnifiedStorageService) {}

  // === Load Project from YAML ===
  
  async loadAssessmentProject(assessmentId: string): Promise<AssessmentProject | null> {
    try {
      // Load from YAML file
      const yamlPath = path.join(
        process.cwd(),
        'public',
        'assessment_data',
        assessmentId,
        `${assessmentId}_config.yaml`
      );
      
      const yamlContent = await fs.readFile(yamlPath, 'utf8');
      const data = yaml.load(yamlContent) as any;
      
      return {
        id: assessmentId,
        type: 'assessment',
        title: data.title || { en: assessmentId },
        description: data.description || { en: '' },
        assessmentType: data.assessmentType || 'comprehensive',
        totalQuestions: data.totalQuestions || 30,
        passingScore: data.passingScore || 70,
        estimatedMinutes: data.estimatedMinutes || 30,
        domains: data.domains || [],
        questionPool: [] // Will be loaded separately
      };
    } catch (error) {
      console.error(`Failed to load assessment project ${assessmentId}:`, error);
      return null;
    }
  }
  
  async loadAssessmentQuestions(assessmentId: string, lang: string = 'en'): Promise<AssessmentQuestion[]> {
    try {
      // Try language-specific file first
      let yamlPath = path.join(
        process.cwd(),
        'public',
        'assessment_data',
        assessmentId,
        `${assessmentId}_questions_${lang}.yaml`
      );
      
      // Fallback to English if not found
      try {
        await fs.access(yamlPath);
      } catch {
        yamlPath = path.join(
          process.cwd(),
          'public',
          'assessment_data',
          assessmentId,
          `${assessmentId}_questions_en.yaml`
        );
      }
      
      const yamlContent = await fs.readFile(yamlPath, 'utf8');
      const data = yaml.load(yamlContent) as any;
      
      return data.questions || [];
    } catch (error) {
      console.error(`Failed to load questions for ${assessmentId}:`, error);
      return [];
    }
  }

  // === Start Assessment (Create Scenario & Program) ===
  
  async startAssessment(
    userEmail: string, 
    assessmentId: string,
    config?: {
      language?: string;
      randomizeQuestions?: boolean;
    }
  ): Promise<{
    scenario: Scenario;
    program: Program;
    project: AssessmentProject;
  }> {
    // Load project from YAML
    const project = await this.loadAssessmentProject(assessmentId);
    if (!project) {
      throw new Error(`Assessment ${assessmentId} not found in YAML`);
    }
    
    // Check if user already has a scenario for this assessment
    const existingScenarios = await this.storage.getUserScenarios(userEmail);
    let scenario = existingScenarios.find(s => 
      s.type === 'assessment' && 
      s.metadata.assessmentId === assessmentId &&
      (s.status === 'active' || s.status === 'paused')
    );
    
    if (!scenario) {
      // Create new scenario
      scenario = await this.storage.createScenario(
        userEmail,
        assessmentId, // Using assessmentId as project_id
        {
          type: 'assessment',
          title: `${project.title[config?.language || 'en'] || project.title.en} - ${new Date().toLocaleDateString()}`,
          assessmentId,
          assessmentType: project.assessmentType,
          language: config?.language || 'en',
          startTime: new Date().toISOString()
        }
      );
      
      // Update to active
      scenario = await this.storage.updateScenario(scenario.id, {
        status: 'active',
        started_at: new Date().toISOString()
      });
    }
    
    // Get existing programs to determine attempt number
    const existingPrograms = await this.storage.getScenarioPrograms(scenario.id);
    const attemptNumber = existingPrograms.length + 1;
    
    // Create new program (attempt)
    const program = await this.storage.createProgram(
      scenario.id,
      `Attempt ${attemptNumber}`,
      attemptNumber,
      {
        language: config?.language || 'en',
        randomizeQuestions: config?.randomizeQuestions ?? true,
        totalQuestions: project.totalQuestions,
        passingScore: project.passingScore,
        timeLimit: project.estimatedMinutes
      },
      {
        startedAt: new Date().toISOString(),
        attemptNumber
      }
    );
    
    // Update program to active
    await this.storage.updateProgram(program.id, {
      status: 'active',
      started_at: new Date().toISOString()
    });
    
    return { scenario, program, project };
  }

  // === Create Tasks from Questions ===
  
  async createTasksForProgram(
    programId: string,
    assessmentId: string,
    config?: {
      language?: string;
      questionCount?: number;
      randomize?: boolean;
    }
  ): Promise<Task[]> {
    const program = await this.storage.getProgram(programId);
    if (!program) {
      throw new Error(`Program ${programId} not found`);
    }
    
    // Load questions from YAML
    const allQuestions = await this.loadAssessmentQuestions(
      assessmentId,
      config?.language || program.config.language || 'en'
    );
    
    // Select questions
    let selectedQuestions = [...allQuestions];
    
    // Randomize if needed
    if (config?.randomize ?? program.config.randomizeQuestions) {
      selectedQuestions.sort(() => Math.random() - 0.5);
    }
    
    // Limit to question count
    const questionCount = config?.questionCount || program.config.totalQuestions || 30;
    selectedQuestions = selectedQuestions.slice(0, questionCount);
    
    // Create tasks
    const tasks: Task[] = [];
    for (let i = 0; i < selectedQuestions.length; i++) {
      const question = selectedQuestions[i];
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
          points: question.points || 1
        }
      );
      
      tasks.push(task);
    }
    
    return tasks;
  }

  // === Record Answer with History ===
  
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
    
    // Update task status
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

  // === Evaluate Task ===
  
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
    const score = isCorrect ? (question.points || 1) : 0;
    
    // Update task with evaluation
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

  // === Complete Program ===
  
  async completeProgram(programId: string): Promise<{
    program: Program;
    results: {
      totalScore: number;
      maxScore: number;
      percentage: number;
      passed: boolean;
      timeSpent: number;
      correctCount: number;
      totalCount: number;
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
    let correctCount = 0;
    const domainStats: Record<string, { correct: number; total: number }> = {};
    
    for (const task of tasks) {
      if (task.status === 'completed') {
        const points = task.metadata.points || 1;
        maxScore += points;
        
        if (task.metadata.isCorrect) {
          totalScore += points;
          correctCount++;
        }
        
        totalTimeSpent += task.metadata.totalTimeSpent || 0;
        
        // Domain stats
        const domain = task.metadata.domain;
        if (domain) {
          if (!domainStats[domain]) {
            domainStats[domain] = { correct: 0, total: 0 };
          }
          domainStats[domain].total++;
          if (task.metadata.isCorrect) {
            domainStats[domain].correct++;
          }
        }
      }
    }
    
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentage >= (program.config.passingScore || 70);
    
    // Calculate domain percentages
    const byDomain: Record<string, { correct: number; total: number; percentage: number }> = {};
    for (const [domain, stats] of Object.entries(domainStats)) {
      byDomain[domain] = {
        ...stats,
        percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
      };
    }
    
    // Update program with results
    const results = {
      totalScore,
      maxScore,
      percentage,
      passed,
      timeSpent: totalTimeSpent,
      correctCount,
      totalCount: tasks.filter(t => t.status === 'completed').length,
      byDomain
    };
    
    const updatedProgram = await this.storage.updateProgram(programId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      metadata: {
        ...program.metadata,
        completedAt: new Date().toISOString(),
        results
      }
    });
    
    return { program: updatedProgram, results };
  }

  // === Get User History ===
  
  async getUserAssessmentHistory(userEmail: string): Promise<{
    scenarios: Array<{
      scenario: Scenario;
      programs: Program[];
      latestAttempt?: Program;
    }>;
  }> {
    const scenarios = await this.storage.getUserScenarios(userEmail);
    const assessmentScenarios = scenarios.filter(s => s.type === 'assessment');
    
    const result = [];
    
    for (const scenario of assessmentScenarios) {
      const programs = await this.storage.getScenarioPrograms(scenario.id);
      const latestAttempt = programs
        .filter(p => p.status === 'completed')
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
      
      result.push({
        scenario,
        programs,
        latestAttempt
      });
    }
    
    return { scenarios: result };
  }
}