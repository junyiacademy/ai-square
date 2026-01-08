/**
 * Service for orchestrating assessment program completion
 * Handles validation, data collection, evaluation creation, and program updates
 */

import type { ITask, IProgram, IEvaluation } from "@/types/unified-learning";
import type {
  AssessmentQuestion,
  AssessmentInteraction,
  DomainScore,
} from "@/types/assessment-types";
import {
  fromIInteraction,
  isAssessmentInteraction,
} from "@/types/assessment-types";
import type {
  ITaskRepository,
  IProgramRepository,
  IEvaluationRepository,
  IUserRepository,
} from "@/lib/repositories/interfaces";

export interface CompletionValidationResult {
  alreadyCompleted: boolean;
  evaluationId?: string;
  score?: number;
}

export interface AssessmentCompletionStatus {
  isComplete: boolean;
  totalQuestions: number;
  answeredQuestions: number;
  missingQuestions?: number;
}

export interface QuestionsAndAnswers {
  questions: AssessmentQuestion[];
  answers: AssessmentInteraction[];
}

export interface EvaluationData {
  userId: string;
  programId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  level: string;
  completionTime: number;
  recommendations: string[];
  domainScores: Map<string, DomainScore>;
  ksaAnalysis: {
    knowledge: { score: number; strong: string[]; weak: string[] };
    skills: { score: number; strong: string[]; weak: string[] };
    attitudes: { score: number; strong: string[]; weak: string[] };
  };
  feedbackText: string;
}

export class AssessmentCompletionService {
  constructor(
    private taskRepo: ITaskRepository,
    private programRepo: IProgramRepository,
    private evaluationRepo: IEvaluationRepository,
    private userRepo: IUserRepository,
  ) {}

  /**
   * Check if assessment is already completed and has an evaluation
   * Returns existing evaluation if found
   */
  async validateCompletion(
    program: IProgram,
  ): Promise<CompletionValidationResult | null> {
    // Check if program is already completed with evaluation
    if (program.status === "completed" && program.metadata?.evaluationId) {
      const existingEvaluation = await this.evaluationRepo.findById?.(
        program.metadata.evaluationId as string,
      );
      if (existingEvaluation) {
        return {
          alreadyCompleted: true,
          evaluationId: existingEvaluation.id,
          score: existingEvaluation.score,
        };
      }
    }

    // Check if there's already an evaluation for this program
    const existingEvaluations = await this.evaluationRepo.findByProgram(
      program.id,
    );
    const existingAssessmentEval = existingEvaluations.find(
      (e) => e.evaluationType === "assessment_complete",
    );

    if (existingAssessmentEval) {
      // Update program to mark as completed if not already
      if (program.status !== "completed") {
        await this.programRepo.update?.(program.id, {
          metadata: {
            ...program.metadata,
            evaluationId: existingAssessmentEval.id,
            score: existingAssessmentEval.score,
          },
        });
        await this.programRepo.update?.(program.id, { status: "completed" });
      }

      return {
        alreadyCompleted: true,
        evaluationId: existingAssessmentEval.id,
        score: existingAssessmentEval.score,
      };
    }

    return null;
  }

  /**
   * Check if all questions have been answered
   */
  async checkAssessmentCompletion(
    tasks: ITask[],
  ): Promise<AssessmentCompletionStatus> {
    let totalExpectedQuestions = 0;
    let totalAnsweredQuestions = 0;

    for (const task of tasks) {
      const taskQuestions =
        (task.content as { questions?: AssessmentQuestion[] })?.questions ||
        (task.metadata as { questions?: AssessmentQuestion[] })?.questions ||
        [];
      totalExpectedQuestions += taskQuestions.length;

      const interactions = Array.isArray(task.interactions)
        ? task.interactions
        : [];
      const taskAnswers = interactions.filter((i) => {
        if (isAssessmentInteraction(i as unknown as AssessmentInteraction))
          return true;
        return (
          i.type === "system_event" &&
          typeof i.content === "object" &&
          i.content !== null &&
          "eventType" in i.content &&
          i.content.eventType === "assessment_answer"
        );
      });
      totalAnsweredQuestions += taskAnswers.length;
    }

    return {
      isComplete: totalAnsweredQuestions >= totalExpectedQuestions,
      totalQuestions: totalExpectedQuestions,
      answeredQuestions: totalAnsweredQuestions,
      missingQuestions: totalExpectedQuestions - totalAnsweredQuestions,
    };
  }

  /**
   * Collect all questions and answers from tasks
   */
  async collectQuestionsAndAnswers(
    tasks: ITask[],
  ): Promise<QuestionsAndAnswers> {
    let allAnswers: AssessmentInteraction[] = [];
    let allQuestions: AssessmentQuestion[] = [];

    for (const task of tasks) {
      // Collect answers
      const interactions = Array.isArray(task.interactions)
        ? task.interactions
        : [];
      const taskAnswers = interactions
        .map((i) => {
          const converted = fromIInteraction(i);
          if (converted) return converted;
          if (isAssessmentInteraction(i as unknown as AssessmentInteraction)) {
            return i as unknown as AssessmentInteraction;
          }
          return null;
        })
        .filter((i): i is AssessmentInteraction => i !== null);

      // Collect questions
      const rawQuestions =
        (task.content as { questions?: Record<string, unknown>[] })
          ?.questions ||
        (task.metadata as { questions?: Record<string, unknown>[] })
          ?.questions ||
        [];

      const taskQuestions: AssessmentQuestion[] = rawQuestions.map(
        (q: Record<string, unknown>) =>
          ({
            ...q,
            domain: (q.domainId || q.domain) as string, // Map domainId to domain
          }) as AssessmentQuestion,
      );

      allAnswers = [...allAnswers, ...taskAnswers];
      allQuestions = [...allQuestions, ...taskQuestions];
    }

    return { questions: allQuestions, answers: allAnswers };
  }

  /**
   * Complete all pending tasks
   */
  async completeAllTasks(tasks: ITask[]): Promise<void> {
    for (const task of tasks) {
      if (task.status !== "completed") {
        await this.taskRepo.updateStatus?.(task.id, "completed");
      }
    }
  }

  /**
   * Create evaluation record
   */
  async createEvaluation(data: EvaluationData): Promise<IEvaluation> {
    return await this.evaluationRepo.create({
      userId: data.userId,
      programId: data.programId,
      mode: "assessment",
      evaluationType: "assessment_complete",
      score: data.score,
      maxScore: 100,
      timeTakenSeconds: data.completionTime,
      feedbackText: data.feedbackText,
      feedbackData: {},
      domainScores: Array.from(data.domainScores.values()).reduce(
        (acc, ds) => {
          acc[ds.domain] = ds.score;
          return acc;
        },
        {} as Record<string, number>,
      ),
      aiAnalysis: {},
      pblData: {},
      discoveryData: {},
      assessmentData: {
        totalQuestions: data.totalQuestions,
        correctAnswers: data.correctAnswers,
        domainScores: Array.from(data.domainScores.values()).map((ds) => ({
          name: ds.domain,
          score: ds.score,
          maxScore: 100,
        })),
      },
      metadata: {
        completionTime: data.completionTime,
        totalQuestions: data.totalQuestions,
        correctAnswers: data.correctAnswers,
        level: data.level,
        recommendations: data.recommendations,
        certificateEligible: data.score >= 60,
        domainScores: Object.fromEntries(
          Array.from(data.domainScores.entries()).map(([domain, ds]) => [
            domain,
            ds.score,
          ]),
        ),
        ksaAnalysis: data.ksaAnalysis,
      },
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Update program with completion data
   */
  async updateProgramCompletion(
    program: IProgram,
    evaluationId: string,
    score: number,
    completionTime: number,
  ): Promise<void> {
    await this.programRepo.update?.(program.id, {
      metadata: {
        ...program.metadata,
        score,
        completionTime,
        evaluationId,
      },
    });
    await this.programRepo.update?.(program.id, { status: "completed" });
  }

  /**
   * Calculate time spent on assessment
   */
  calculateCompletionTime(program: IProgram): number {
    const startTime =
      program.metadata?.createdAt ||
      program.metadata?.startTime ||
      (program.startedAt ? Date.parse(program.startedAt.toString()) : null) ||
      (program.createdAt ? Date.parse(program.createdAt.toString()) : null) ||
      Date.now();

    return Math.floor((Date.now() - (startTime as number)) / 1000);
  }
}
