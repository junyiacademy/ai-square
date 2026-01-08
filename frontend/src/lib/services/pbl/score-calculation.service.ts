/**
 * Service for calculating scores in PBL programs
 * Handles overall scores, domain scores, and KSA (Knowledge/Skills/Attitudes) scores
 */

interface EvaluationWithScore {
  score?: number | string | null;
  domainScores?: Record<string, number>;
  metadata?: {
    domainScores?: Record<string, number>;
    ksaScores?: {
      knowledge?: number;
      skills?: number;
      attitudes?: number;
    };
  };
  pblData?: {
    ksaScores?: {
      knowledge?: number;
      skills?: number;
      attitudes?: number;
    };
  };
}

interface KSAScores {
  knowledge: number;
  skills: number;
  attitudes: number;
}

export class ScoreCalculationService {
  /**
   * Calculate overall score from task evaluations
   * Handles both numeric and string scores (from PostgreSQL)
   */
  calculateOverallScore(evaluations: EvaluationWithScore[]): number {
    const validScores = evaluations
      .map((e) => {
        const score = e.score;
        // Convert string scores from PostgreSQL to numbers
        if (typeof score === "string") {
          return parseFloat(score);
        }
        return score;
      })
      .filter(
        (score): score is number =>
          typeof score === "number" && !isNaN(score) && score >= 0,
      );

    if (validScores.length === 0) {
      return 0;
    }

    const sum = validScores.reduce(
      (acc: number, score: number) => acc + score,
      0,
    );
    return Math.round((sum ?? 0) / validScores.length);
  }

  /**
   * Calculate domain scores (e.g., math, science, english)
   * Aggregates scores across all evaluations
   */
  calculateDomainScores(
    evaluations: EvaluationWithScore[],
  ): Record<string, number> {
    const domainScores: Record<string, number> = {};
    const domainCounts: Record<string, number> = {};

    evaluations.forEach((evaluation) => {
      // Check both domainScores (direct property) and metadata.domainScores
      const evalDomainScores =
        evaluation.domainScores || evaluation.metadata?.domainScores;

      if (evalDomainScores && typeof evalDomainScores === "object") {
        Object.entries(evalDomainScores).forEach(([domain, score]) => {
          if (typeof score === "number" && !isNaN(score)) {
            if (!domainScores[domain]) {
              domainScores[domain] = 0;
              domainCounts[domain] = 0;
            }
            domainScores[domain] += score;
            domainCounts[domain]++;
          }
        });
      }
    });

    // Average domain scores
    Object.keys(domainScores).forEach((domain) => {
      if (domainCounts[domain] > 0) {
        domainScores[domain] = Math.round(
          domainScores[domain] / domainCounts[domain],
        );
      } else {
        domainScores[domain] = 0;
      }
    });

    return domainScores;
  }

  /**
   * Calculate KSA (Knowledge, Skills, Attitudes) scores
   * Checks pblData.ksaScores first, then falls back to metadata.ksaScores
   */
  calculateKSAScores(evaluations: EvaluationWithScore[]): KSAScores {
    const ksaScores: KSAScores = {
      knowledge: 0,
      skills: 0,
      attitudes: 0,
    };

    let ksaCount = 0;

    evaluations.forEach((evaluation) => {
      // Check both pblData.ksaScores (where it's actually stored) and metadata.ksaScores (fallback)
      const scores =
        evaluation.pblData?.ksaScores || evaluation.metadata?.ksaScores;

      if (scores && typeof scores === "object") {
        // Only count if at least one KSA value exists
        if (
          scores.knowledge !== undefined ||
          scores.skills !== undefined ||
          scores.attitudes !== undefined
        ) {
          ksaScores.knowledge += scores.knowledge || 0;
          ksaScores.skills += scores.skills || 0;
          ksaScores.attitudes += scores.attitudes || 0;
          ksaCount++;
        }
      }
    });

    if (ksaCount > 0) {
      ksaScores.knowledge = Math.round(ksaScores.knowledge / ksaCount);
      ksaScores.skills = Math.round(ksaScores.skills / ksaCount);
      ksaScores.attitudes = Math.round(ksaScores.attitudes / ksaCount);
    }

    return ksaScores;
  }
}
