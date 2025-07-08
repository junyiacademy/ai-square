/**
 * Assessment Service Implementation for V2
 * Handles exam scenarios with multiple attempts
 */

import { BaseLearningService, ServiceContext } from './base.service';
import { 
  SourceContent, 
  Scenario, 
  Program, 
  Task, 
  Log, 
  Evaluation 
} from '@/lib/v2/interfaces/base';

export class AssessmentService extends BaseLearningService {
  /**
   * Create a new assessment attempt (program)
   */
  async createAssessmentAttempt(
    userId: string,
    sourceContent: SourceContent,
    attemptType: 'practice' | 'formal',
    config?: {
      timeLimit?: number;
      instantFeedback?: boolean;
      allowSkip?: boolean;
      randomizeQuestions?: boolean;
    }
  ): Promise<{ scenario: Scenario; program: Program }> {
    // Get or create scenario
    let scenario = await this.repositories.scenario.findActiveByUserAndSource(
      userId,
      sourceContent.id
    );

    if (!scenario) {
      scenario = await this.startScenario(
        { userId, language: 'en' },
        sourceContent
      );
    }

    // Count existing attempts
    const existingPrograms = await this.repositories.program.findByScenario(scenario.id);
    const attemptNumber = existingPrograms.filter(
      p => p.config.attempt_type === attemptType
    ).length + 1;

    // Create new program (attempt)
    const program = await this.repositories.program.create({
      scenario_id: scenario.id,
      title: attemptType === 'practice' 
        ? `Practice Round ${attemptNumber}`
        : `Formal Assessment ${attemptNumber}`,
      description: attemptType === 'practice'
        ? 'Practice assessment with instant feedback'
        : 'Formal assessment for certification',
      program_order: existingPrograms.length,
      status: 'active',
      config: {
        attempt_type: attemptType,
        attempt_number: attemptNumber,
        time_limit: config?.timeLimit,
        instant_feedback: config?.instantFeedback ?? (attemptType === 'practice'),
        allow_skip: config?.allowSkip ?? (attemptType === 'practice'),
        randomize_questions: config?.randomizeQuestions ?? false,
        started_at: new Date().toISOString()
      },
      metadata: {
        total_questions: sourceContent.metadata.questions?.length || 0,
        time_spent: 0,
        current_question: 0
      },
      started_at: new Date().toISOString()
    });

    // Create tasks (questions) for this attempt
    await this.createAssessmentTasks(program, sourceContent, config?.randomizeQuestions);

    // Log assessment start
    await this.logActivity({
      scenario_id: scenario.id,
      program_id: program.id,
      user_id: userId,
      log_type: 'completion',
      activity: 'assessment_started',
      data: {
        attempt_type: attemptType,
        attempt_number: attemptNumber,
        total_questions: program.metadata.total_questions
      }
    });

    return { scenario, program };
  }

  /**
   * Create initial programs (not used for assessment, handled by createAssessmentAttempt)
   */
  protected async createInitialPrograms(
    scenario: Scenario,
    source: SourceContent,
    context: ServiceContext
  ): Promise<void> {
    // Assessment doesn't create initial programs
    // Each attempt is created on-demand via createAssessmentAttempt
  }

  /**
   * Create assessment tasks (questions) for a program
   */
  private async createAssessmentTasks(
    program: Program,
    source: SourceContent,
    randomize?: boolean
  ): Promise<void> {
    const questions = source.metadata.questions || [];
    
    // Randomize if requested
    const orderedQuestions = randomize 
      ? [...questions].sort(() => Math.random() - 0.5)
      : questions;

    for (let i = 0; i < orderedQuestions.length; i++) {
      const question = orderedQuestions[i];
      
      await this.repositories.task.create({
        program_id: program.id,
        title: `Question ${i + 1}`,
        description: question.text,
        instructions: question.instructions || 'Select the best answer',
        task_order: i,
        type: 'quiz',
        required_ksa: question.required_ksa || [],
        config: {
          question_id: question.id,
          question_text: question.text,
          options: question.options,
          correct_answer: question.correct_answer,
          points: question.points || 1,
          explanation: question.explanation,
          time_limit: question.time_limit
        },
        metadata: {
          domain: question.domain,
          difficulty: question.difficulty,
          can_skip: program.config.allow_skip
        },
        status: i === 0 ? 'active' : 'pending'
      });
    }
  }

  /**
   * Evaluate assessment response (quiz answer)
   */
  protected async evaluateResponse(
    task: Task,
    response: any,
    log: Log
  ): Promise<Evaluation> {
    // Assessment uses standard answer checking
    const isCorrect = response.answer === task.config.correct_answer;
    const score = isCorrect ? (task.config.points || 1) : 0;
    const maxScore = task.config.points || 1;

    // Create evaluation
    const evaluation = await this.repositories.evaluation.create({
      log_id: log.id,
      scenario_id: log.scenario_id,
      task_id: task.id,
      evaluation_type: 'quiz',
      input: {
        question: task.config.question_text,
        selected_answer: response.answer,
        time_spent: response.time_spent || 0
      },
      result: {
        is_correct: isCorrect,
        correct_answer: task.config.correct_answer,
        explanation: task.config.explanation
      },
      scores: {
        points: score,
        max_points: maxScore,
        percentage: (score / maxScore) * 100
      },
      feedback: {
        immediate: isCorrect ? 'Correct!' : 'Incorrect',
        explanation: task.config.explanation
      },
      evaluated_by: 'system'
    });

    // Update program metadata with time spent
    const program = await this.repositories.program.findById(task.program_id);
    if (program && response.time_spent) {
      await this.repositories.program.update(program.id, {
        metadata: {
          ...program.metadata,
          time_spent: (program.metadata.time_spent || 0) + response.time_spent
        }
      });
    }

    return evaluation;
  }

  /**
   * Submit answer for current question
   */
  async submitAnswer(
    taskId: string,
    userId: string,
    answer: string,
    timeSpent?: number
  ): Promise<{
    evaluation: Evaluation;
    feedback?: string;
    nextTask?: Task;
  }> {
    const task = await this.repositories.task.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const program = await this.repositories.program.findById(task.program_id);
    if (!program) {
      throw new Error('Program not found');
    }

    // Submit response
    const evaluation = await this.submitTaskResponse(
      taskId,
      userId,
      { answer, time_spent: timeSpent }
    );

    // Prepare response
    const result: any = { evaluation };

    // Add feedback if instant feedback is enabled
    if (program.config.instant_feedback) {
      result.feedback = evaluation.feedback?.explanation;
    }

    // Get next task
    const nextTask = await this.repositories.task.getNextTask(
      task.program_id,
      task.task_order
    );

    if (nextTask) {
      // Activate next task
      await this.repositories.task.update(nextTask.id, {
        status: 'active',
        started_at: new Date().toISOString()
      });
      result.nextTask = nextTask;
    } else {
      // Assessment completed
      await this.completeAssessment(program.id, userId);
    }

    return result;
  }

  /**
   * Complete assessment and calculate final score
   */
  private async completeAssessment(programId: string, userId: string): Promise<void> {
    const program = await this.repositories.program.findById(programId);
    if (!program) return;

    // Get all evaluations for this program
    const tasks = await this.repositories.task.findByProgram(programId);
    const evaluations: Evaluation[] = [];
    
    for (const task of tasks) {
      const taskEvals = await this.repositories.evaluation.findByTask(task.id);
      evaluations.push(...taskEvals);
    }

    // Calculate final score
    const totalPoints = evaluations.reduce((sum, e) => sum + (e.scores.points || 0), 0);
    const maxPoints = evaluations.reduce((sum, e) => sum + (e.scores.max_points || 1), 0);
    const percentage = maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0;

    // Determine level
    const level = percentage >= 90 ? 'Expert' 
                : percentage >= 75 ? 'Proficient'
                : percentage >= 60 ? 'Intermediate'
                : 'Beginner';

    // Update program as completed
    await this.repositories.program.update(programId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      metadata: {
        ...program.metadata,
        final_score: percentage,
        total_points: totalPoints,
        max_points: maxPoints,
        level: level
      }
    });

    // Log completion
    await this.logActivity({
      scenario_id: program.scenario_id,
      program_id: programId,
      user_id: userId,
      log_type: 'completion',
      activity: 'assessment_completed',
      data: {
        attempt_type: program.config.attempt_type,
        attempt_number: program.config.attempt_number,
        score: percentage,
        level: level,
        time_spent: program.metadata.time_spent,
        questions_answered: evaluations.length
      }
    });

    // Check if scenario should be completed
    const scenario = await this.repositories.scenario.findById(program.scenario_id);
    if (scenario && program.config.attempt_type === 'formal' && percentage >= 70) {
      await this.repositories.scenario.update(scenario.id, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });
    }
  }

  /**
   * Get assessment results for a program
   */
  async getAssessmentResults(programId: string): Promise<{
    program: Program;
    summary: {
      score: number;
      level: string;
      timeSpent: number;
      questionsAnswered: number;
      correctAnswers: number;
    };
    byDomain: Record<string, { correct: number; total: number; percentage: number }>;
    questions: Array<{
      question: string;
      selected: string;
      correct: string;
      isCorrect: boolean;
      points: number;
      domain?: string;
    }>;
  }> {
    const program = await this.repositories.program.findById(programId);
    if (!program) {
      throw new Error('Program not found');
    }

    const tasks = await this.repositories.task.findByProgram(programId);
    const questionResults = [];
    const domainStats: Record<string, { correct: number; total: number }> = {};
    let correctAnswers = 0;

    for (const task of tasks) {
      const evaluations = await this.repositories.evaluation.findByTask(task.id);
      const evaluation = evaluations[0]; // Should only have one per task
      
      if (evaluation) {
        const isCorrect = evaluation.result.is_correct;
        const domain = task.metadata.domain || 'general';
        
        questionResults.push({
          question: task.config.question_text,
          selected: evaluation.input.selected_answer,
          correct: evaluation.result.correct_answer,
          isCorrect: isCorrect,
          points: evaluation.scores.points || 0,
          domain: domain
        });

        if (isCorrect) correctAnswers++;

        // Update domain stats
        if (!domainStats[domain]) {
          domainStats[domain] = { correct: 0, total: 0 };
        }
        domainStats[domain].total++;
        if (isCorrect) domainStats[domain].correct++;
      }
    }

    // Calculate domain percentages
    const byDomain: Record<string, any> = {};
    for (const [domain, stats] of Object.entries(domainStats)) {
      byDomain[domain] = {
        ...stats,
        percentage: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0
      };
    }

    return {
      program,
      summary: {
        score: program.metadata.final_score || 0,
        level: program.metadata.level || 'Not completed',
        timeSpent: program.metadata.time_spent || 0,
        questionsAnswered: questionResults.length,
        correctAnswers: correctAnswers
      },
      byDomain,
      questions: questionResults
    };
  }

  /**
   * Get assessment history for a user
   */
  async getAssessmentHistory(userId: string, sourceId: string): Promise<{
    attempts: Array<{
      program: Program;
      score: number;
      level: string;
      date: string;
      type: 'practice' | 'formal';
    }>;
    bestScore: number;
    averageScore: number;
    totalAttempts: number;
    improvement: number;
  }> {
    const scenario = await this.repositories.scenario.findActiveByUserAndSource(userId, sourceId);
    if (!scenario) {
      return {
        attempts: [],
        bestScore: 0,
        averageScore: 0,
        totalAttempts: 0,
        improvement: 0
      };
    }

    const programs = await this.repositories.program.findByScenario(scenario.id);
    const completedPrograms = programs.filter(p => p.status === 'completed');
    
    const attempts = completedPrograms.map(p => ({
      program: p,
      score: p.metadata.final_score || 0,
      level: p.metadata.level || 'Unknown',
      date: p.completed_at || p.created_at,
      type: p.config.attempt_type as 'practice' | 'formal'
    }));

    // Sort by date
    attempts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate statistics
    const scores = attempts.map(a => a.score);
    const bestScore = Math.max(...scores, 0);
    const averageScore = scores.length > 0 
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
      : 0;
    
    // Calculate improvement (first vs last score)
    const improvement = scores.length >= 2 
      ? scores[scores.length - 1] - scores[0]
      : 0;

    return {
      attempts,
      bestScore,
      averageScore,
      totalAttempts: attempts.length,
      improvement
    };
  }
}