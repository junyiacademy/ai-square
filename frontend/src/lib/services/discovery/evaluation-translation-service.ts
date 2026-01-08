import { TranslationService } from "@/lib/services/translation-service";
import { repositoryFactory } from "@/lib/repositories/base/repository-factory";

export interface ProcessedEvaluation {
  id: string;
  score: number;
  feedback: string;
  feedbackVersions: Record<string, string>;
  evaluatedAt: string;
}

export interface EvaluationRecord {
  id: string;
  score: number;
  feedbackText?: string;
  createdAt: string;
  feedbackData?: unknown;
  metadata?: unknown;
}

/**
 * Service for handling evaluation feedback translation
 * Manages multilingual feedback versions and caching
 */
export class EvaluationTranslationService {
  /**
   * Get feedback in requested language, translating if necessary
   */
  static async getOrTranslateFeedback(
    evaluation: EvaluationRecord,
    requestedLanguage: string,
    careerType: string,
    taskId: string,
    taskMetadata: Record<string, unknown>,
  ): Promise<ProcessedEvaluation> {
    const existingVersions = this.extractExistingVersions(evaluation);

    // If requested language exists, return it
    if (existingVersions[requestedLanguage]) {
      return this.buildProcessedEvaluation(
        evaluation,
        existingVersions[requestedLanguage],
        existingVersions,
      );
    }

    // Need to translate
    try {
      const { sourceFeedback, sourceLanguage } = this.determineSourceFeedback(
        existingVersions,
        evaluation.feedbackText,
      );

      // If both source and target are English, no translation needed
      if (requestedLanguage === "en" && sourceLanguage === "en") {
        return this.buildProcessedEvaluation(evaluation, sourceFeedback, {
          ...existingVersions,
          en: sourceFeedback,
        });
      }

      // Translate
      const translationService = new TranslationService();
      const translatedFeedback = await translationService.translateFeedback(
        sourceFeedback,
        requestedLanguage,
        careerType,
      );

      // Update task metadata with new translation
      const updatedVersions = {
        ...existingVersions,
        [requestedLanguage]: translatedFeedback,
      };

      const taskRepo = repositoryFactory.getTaskRepository();
      await taskRepo.update?.(taskId, {
        metadata: {
          ...taskMetadata,
          evaluationFeedbackVersions: updatedVersions,
        },
      });

      return this.buildProcessedEvaluation(
        evaluation,
        translatedFeedback,
        updatedVersions,
      );
    } catch (error) {
      console.error("Translation failed:", error);

      // Fallback to best available language
      const fallbackFeedback = TranslationService.getFeedbackByLanguage(
        existingVersions,
        requestedLanguage,
        "en",
      );

      return this.buildProcessedEvaluation(
        evaluation,
        fallbackFeedback || evaluation.feedbackText || "",
        existingVersions,
      );
    }
  }

  /**
   * Extract existing feedback versions from evaluation
   * Priority: feedbackData > metadata.feedbackVersions
   */
  static extractExistingVersions(
    evaluation: EvaluationRecord,
  ): Record<string, string> {
    const fromFeedbackData = evaluation.feedbackData as Record<
      string,
      string
    > | null;
    const fromMetadata = (
      evaluation.metadata as { feedbackVersions?: Record<string, string> }
    )?.feedbackVersions;

    return (fromFeedbackData || fromMetadata || {}) as Record<string, string>;
  }

  /**
   * Build processed evaluation response
   */
  static buildProcessedEvaluation(
    evaluation: EvaluationRecord,
    feedback: string,
    feedbackVersions: Record<string, string>,
  ): ProcessedEvaluation {
    return {
      id: evaluation.id,
      score: evaluation.score,
      feedback,
      feedbackVersions,
      evaluatedAt: evaluation.createdAt,
    };
  }

  /**
   * Determine source feedback and language for translation
   * Prefers English version, falls back to feedbackText
   */
  static determineSourceFeedback(
    existingVersions: Record<string, string>,
    feedbackText: string | undefined,
  ): { sourceFeedback: string; sourceLanguage: string } {
    if (existingVersions["en"]) {
      return {
        sourceFeedback: existingVersions["en"],
        sourceLanguage: "en",
      };
    }

    if (feedbackText) {
      return {
        sourceFeedback: feedbackText,
        sourceLanguage: "en",
      };
    }

    throw new Error("No source feedback available for translation");
  }
}
