/**
 * Assessment Service V2
 * Implements virtual program structure for quick assessments
 */

import { BaseLearningServiceV2 } from './base-learning-service';
import { TrackWithHierarchy, QuickAssessmentOptions, Task } from '../types';
import { DatabaseConnection } from '../utils/database';

export class AssessmentServiceV2 extends BaseLearningServiceV2 {
  constructor(db: DatabaseConnection) {
    super(db);
  }

  getServiceName(): string {
    return 'Assessment Service';
  }

  getDefaultStructureType(): 'standard' | 'direct_task' | 'single_program' {
    return 'direct_task';
  }

  /**
   * Create a quick assessment with direct tasks
   */
  async createQuickAssessment(
    options: QuickAssessmentOptions
  ): Promise<TrackWithHierarchy> {
    // Generate tasks from questions
    const tasks = options.questions.map((q, index) => ({
      code: `q${index + 1}`,
      title: `Question ${index + 1}`,
      description: q.question,
      instructions: this.getInstructionsForQuestionType(q.type),
      task_type: 'assessment' as const,
      task_variant: 'question' as const,
      order_index: index,
      is_active: true,
      estimated_minutes: this.getEstimatedTimeForQuestionType(q.type),
      metadata: {
        question_type: q.type,
        options: q.options,
        correct_answer: q.correct_answer,
        assessment_id: `assessment_${Date.now()}`
      }
    }));

    // Create track with direct task structure
    const track = await this.createTrack(
      {
        code: `assessment_${Date.now()}`,
        title: options.title,
        description: options.description,
        structure_type: 'direct_task',
        order_index: 0,
        is_active: true,
        metadata: {
          assessment_type: 'quick',
          difficulty: options.difficulty,
          time_limit: options.time_limit,
          domains: options.domains || [],
          total_questions: options.questions.length
        }
      },
      {
        structure_type: 'direct_task',
        tasks
      }
    );

    return track;
  }

  /**
   * Create an adaptive assessment that adjusts based on performance
   */
  async createAdaptiveAssessment(
    options: {
      title: string;
      description: string;
      domain: string;
      initial_difficulty: 'beginner' | 'intermediate' | 'advanced';
      max_questions: number;
    }
  ): Promise<TrackWithHierarchy> {
    // Start with initial questions
    const initialTasks = await this.generateAdaptiveQuestions(
      options.domain,
      options.initial_difficulty,
      3 // Start with 3 questions
    );

    const track = await this.createTrack(
      {
        code: `adaptive_${Date.now()}`,
        title: options.title,
        description: options.description,
        structure_type: 'direct_task',
        order_index: 0,
        is_active: true,
        metadata: {
          assessment_type: 'adaptive',
          domain: options.domain,
          initial_difficulty: options.initial_difficulty,
          max_questions: options.max_questions,
          adaptive_state: {
            current_difficulty: options.initial_difficulty,
            questions_answered: 0,
            performance_score: 0
          }
        }
      },
      {
        structure_type: 'direct_task',
        tasks: initialTasks
      }
    );

    return track;
  }

  /**
   * Add next question to adaptive assessment based on performance
   */
  async addAdaptiveQuestion(
    trackId: string,
    previousPerformance: {
      questionId: string;
      correct: boolean;
      timeSpent: number;
    }
  ): Promise<Task | null> {
    const track = await this.getTrackWithHierarchy(trackId);
    if (!track || !track.metadata?.adaptive_state) {
      throw new Error('Not an adaptive assessment');
    }

    const state = track.metadata.adaptive_state;
    const program = track.programs[0]; // Direct task structure

    // Update adaptive state
    state.questions_answered++;
    state.performance_score = this.updatePerformanceScore(
      state.performance_score,
      previousPerformance.correct
    );

    // Check if assessment is complete
    if (state.questions_answered >= track.metadata.max_questions) {
      return null; // Assessment complete
    }

    // Adjust difficulty based on performance
    const newDifficulty = this.adjustDifficulty(
      state.current_difficulty,
      state.performance_score
    );
    state.current_difficulty = newDifficulty;

    // Generate next question
    const nextQuestions = await this.generateAdaptiveQuestions(
      track.metadata.domain,
      newDifficulty,
      1
    );

    if (nextQuestions.length === 0) return null;

    // Create the next task
    const nextTask = await this.createTask(program.id, {
      ...nextQuestions[0],
      order_index: state.questions_answered
    });

    // Update track metadata
    await this.trackRepo.update(trackId, {
      metadata: {
        ...track.metadata,
        adaptive_state: state
      }
    });

    return nextTask;
  }

  /**
   * Create a certification assessment
   */
  async createCertificationAssessment(
    options: {
      certification_type: string;
      domains: string[];
      passing_score: number;
      time_limit: number;
    }
  ): Promise<TrackWithHierarchy> {
    // Generate comprehensive assessment covering all domains
    const tasks: any[] = [];
    
    for (const domain of options.domains) {
      const domainQuestions = await this.generateDomainQuestions(domain, 5);
      tasks.push(...domainQuestions);
    }

    const track = await this.createTrack(
      {
        code: `cert_${options.certification_type}_${Date.now()}`,
        title: `${options.certification_type} Certification Assessment`,
        description: `Comprehensive assessment for ${options.certification_type} certification`,
        structure_type: 'direct_task',
        order_index: 0,
        is_active: true,
        metadata: {
          assessment_type: 'certification',
          certification_type: options.certification_type,
          domains: options.domains,
          passing_score: options.passing_score,
          time_limit: options.time_limit,
          total_points: tasks.length * 10, // Assuming 10 points per question
          certification_status: 'in_progress'
        }
      },
      {
        structure_type: 'direct_task',
        tasks
      }
    );

    return track;
  }

  /**
   * Calculate assessment results
   */
  async calculateAssessmentResults(
    trackId: string,
    responses: Array<{
      taskId: string;
      answer: any;
      timeSpent: number;
    }>
  ): Promise<{
    score: number;
    percentage: number;
    passed: boolean;
    feedback: string;
    detailedResults: Array<{
      taskId: string;
      correct: boolean;
      points: number;
      feedback: string;
    }>;
  }> {
    const track = await this.getTrackWithHierarchy(trackId);
    if (!track) throw new Error('Assessment not found');

    const program = track.programs[0];
    const tasks = program.tasks;
    const detailedResults: any[] = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const response of responses) {
      const task = tasks.find(t => t.id === response.taskId);
      if (!task) continue;

      const result = this.evaluateAnswer(
        response.answer,
        task.metadata?.correct_answer,
        task.metadata?.question_type
      );

      const points = result.correct ? 10 : 0;
      totalScore += points;
      maxScore += 10;

      detailedResults.push({
        taskId: response.taskId,
        correct: result.correct,
        points,
        feedback: result.feedback
      });
    }

    const percentage = (totalScore / maxScore) * 100;
    const passingScore = track.metadata?.passing_score || 70;
    const passed = percentage >= passingScore;

    return {
      score: totalScore,
      percentage,
      passed,
      feedback: this.generateOverallFeedback(percentage, passed),
      detailedResults
    };
  }

  // Helper methods
  private getInstructionsForQuestionType(type: string): string {
    switch (type) {
      case 'multiple_choice':
        return 'Select the best answer from the options below.';
      case 'short_answer':
        return 'Provide a brief answer in your own words.';
      case 'essay':
        return 'Write a detailed response explaining your answer.';
      default:
        return 'Answer the question to the best of your ability.';
    }
  }

  private getEstimatedTimeForQuestionType(type: string): number {
    switch (type) {
      case 'multiple_choice':
        return 2;
      case 'short_answer':
        return 5;
      case 'essay':
        return 10;
      default:
        return 5;
    }
  }

  private async generateAdaptiveQuestions(
    domain: string,
    difficulty: string,
    count: number
  ): Promise<any[]> {
    // In a real implementation, this would use AI to generate questions
    const questions = [];
    for (let i = 0; i < count; i++) {
      questions.push({
        code: `adaptive_q_${Date.now()}_${i}`,
        title: `${difficulty} ${domain} Question`,
        description: `This is a ${difficulty} level question about ${domain}`,
        instructions: 'Answer this question based on your understanding.',
        task_type: 'assessment',
        task_variant: 'question',
        is_active: true,
        estimated_minutes: 5,
        metadata: {
          question_type: 'multiple_choice',
          difficulty,
          domain,
          generated: true
        }
      });
    }
    return questions;
  }

  private async generateDomainQuestions(domain: string, count: number): Promise<any[]> {
    // Similar to generateAdaptiveQuestions but for certification
    return this.generateAdaptiveQuestions(domain, 'intermediate', count);
  }

  private updatePerformanceScore(currentScore: number, correct: boolean): number {
    // Simple scoring: +1 for correct, -0.5 for incorrect
    return correct ? currentScore + 1 : Math.max(0, currentScore - 0.5);
  }

  private adjustDifficulty(
    current: string,
    performanceScore: number
  ): 'beginner' | 'intermediate' | 'advanced' {
    const difficulties = ['beginner', 'intermediate', 'advanced'];
    const currentIndex = difficulties.indexOf(current);
    
    if (performanceScore > 2 && currentIndex < 2) {
      return difficulties[currentIndex + 1] as any;
    } else if (performanceScore < -1 && currentIndex > 0) {
      return difficulties[currentIndex - 1] as any;
    }
    
    return current as any;
  }

  private evaluateAnswer(
    userAnswer: any,
    correctAnswer: any,
    questionType: string
  ): { correct: boolean; feedback: string } {
    // Simple evaluation logic - in reality, would use AI for complex answers
    if (questionType === 'multiple_choice') {
      const correct = userAnswer === correctAnswer;
      return {
        correct,
        feedback: correct ? 'Correct!' : 'Incorrect. Review this topic.'
      };
    }
    
    // For other types, would need AI evaluation
    return {
      correct: true, // Placeholder
      feedback: 'Answer recorded for review.'
    };
  }

  private generateOverallFeedback(percentage: number, passed: boolean): string {
    if (passed) {
      if (percentage >= 90) {
        return 'Excellent performance! You have demonstrated mastery of the material.';
      } else if (percentage >= 80) {
        return 'Great job! You have a strong understanding of the concepts.';
      } else {
        return 'Congratulations! You passed the assessment.';
      }
    } else {
      return 'You did not meet the passing score. Review the material and try again.';
    }
  }
}