/**
 * Service for aggregating domain scores and KSA analysis in assessments
 * Handles calculation of domain-specific performance and KSA mappings
 */

import type {
  AssessmentQuestion,
  AssessmentInteraction,
  DomainScore,
} from "@/types/assessment-types";

interface KSASet {
  knowledge: Set<string>;
  skills: Set<string>;
  attitudes: Set<string>;
}

export interface KSAAnalysis {
  correctKSA: KSASet;
  incorrectKSA: KSASet;
  weakKSA: KSASet;
  ksaScores: {
    knowledge: number;
    skills: number;
    attitudes: number;
  };
}

export class DomainScoreAggregationService {
  private readonly DOMAINS = [
    "engaging_with_ai",
    "creating_with_ai",
    "managing_with_ai",
    "designing_with_ai",
  ];

  /**
   * Calculate domain scores from questions and answers
   */
  calculateDomainScores(
    questions: AssessmentQuestion[],
    answers: AssessmentInteraction[],
  ): Map<string, DomainScore> {
    const domainScores = new Map<string, DomainScore>();

    // Initialize all four domains
    this.DOMAINS.forEach((domain) => {
      domainScores.set(domain, {
        domain,
        totalQuestions: 0,
        correctAnswers: 0,
        score: 0,
        competencies: new Set(),
        ksa: {
          knowledge: new Set(),
          skills: new Set(),
          attitudes: new Set(),
        },
      });
    });

    // Process each answer
    answers.forEach((answer) => {
      const questionId = answer.context.questionId;
      const question = questions.find((q) => q.id === questionId);

      if (question?.domain) {
        const domainScore = domainScores.get(question.domain);
        if (domainScore) {
          domainScore.totalQuestions++;
          if (answer.context.isCorrect) {
            domainScore.correctAnswers++;
          }

          // Collect KSA mappings
          if (question.ksa_mapping) {
            question.ksa_mapping.knowledge?.forEach((k) =>
              domainScore.ksa.knowledge.add(k),
            );
            question.ksa_mapping.skills?.forEach((s) =>
              domainScore.ksa.skills.add(s),
            );
            question.ksa_mapping.attitudes?.forEach((a) =>
              domainScore.ksa.attitudes.add(a),
            );
          }
        }
      }
    });

    // Calculate scores
    domainScores.forEach((domainScore) => {
      if (domainScore.totalQuestions > 0) {
        domainScore.score = Math.round(
          (domainScore.correctAnswers / domainScore.totalQuestions) * 100,
        );
      }
    });

    return domainScores;
  }

  /**
   * Analyze KSA performance - separate correct vs incorrect
   */
  analyzeKSAPerformance(
    questions: AssessmentQuestion[],
    answers: AssessmentInteraction[],
  ): KSAAnalysis {
    const correctKSA: KSASet = {
      knowledge: new Set(),
      skills: new Set(),
      attitudes: new Set(),
    };

    const incorrectKSA: KSASet = {
      knowledge: new Set(),
      skills: new Set(),
      attitudes: new Set(),
    };

    // Analyze each answer
    answers.forEach((answer) => {
      const question = questions.find(
        (q) => q.id === answer.context.questionId,
      );
      if (question?.ksa_mapping) {
        const targetKSA = answer.context.isCorrect ? correctKSA : incorrectKSA;

        question.ksa_mapping.knowledge?.forEach((k) =>
          targetKSA.knowledge.add(k),
        );
        question.ksa_mapping.skills?.forEach((s) => targetKSA.skills.add(s));
        question.ksa_mapping.attitudes?.forEach((a) =>
          targetKSA.attitudes.add(a),
        );
      }
    });

    // Calculate all KSA items
    const allKnowledge = new Set([
      ...correctKSA.knowledge,
      ...incorrectKSA.knowledge,
    ]);
    const allSkills = new Set([...correctKSA.skills, ...incorrectKSA.skills]);
    const allAttitudes = new Set([
      ...correctKSA.attitudes,
      ...incorrectKSA.attitudes,
    ]);

    // Identify weak areas (only incorrect, not correct)
    const weakKSA: KSASet = {
      knowledge: new Set(),
      skills: new Set(),
      attitudes: new Set(),
    };

    incorrectKSA.knowledge.forEach((k) => {
      if (!correctKSA.knowledge.has(k)) weakKSA.knowledge.add(k);
    });
    incorrectKSA.skills.forEach((s) => {
      if (!correctKSA.skills.has(s)) weakKSA.skills.add(s);
    });
    incorrectKSA.attitudes.forEach((a) => {
      if (!correctKSA.attitudes.has(a)) weakKSA.attitudes.add(a);
    });

    // Calculate KSA scores
    const ksaScores = {
      knowledge:
        allKnowledge.size > 0
          ? Math.round((correctKSA.knowledge.size / allKnowledge.size) * 100)
          : 0,
      skills:
        allSkills.size > 0
          ? Math.round((correctKSA.skills.size / allSkills.size) * 100)
          : 0,
      attitudes:
        allAttitudes.size > 0
          ? Math.round((correctKSA.attitudes.size / allAttitudes.size) * 100)
          : 0,
    };

    return { correctKSA, incorrectKSA, weakKSA, ksaScores };
  }

  /**
   * Calculate overall score
   */
  calculateOverallScore(
    totalQuestions: number,
    correctAnswers: number,
  ): number {
    if (totalQuestions === 0) return 0;
    return Math.round((correctAnswers / totalQuestions) * 100);
  }

  /**
   * Determine proficiency level based on score
   */
  determineLevel(score: number): string {
    if (score >= 80) return "expert";
    if (score >= 70) return "advanced";
    if (score >= 50) return "intermediate";
    return "beginner";
  }

  /**
   * Generate recommendations based on performance
   */
  generateRecommendations(
    domainScores: Map<string, DomainScore>,
    overallScore: number,
  ): string[] {
    const recommendations: string[] = [];

    // Find weak domains
    const weakDomains = Array.from(domainScores.entries())
      .filter(([, ds]) => ds.score < 60)
      .sort((a, b) => a[1].score - b[1].score);

    if (weakDomains.length > 0) {
      weakDomains.forEach(([domain]) => {
        const domainName = domain.replace(/_/g, " ").toLowerCase();
        recommendations.push(
          `Focus on improving your ${domainName} skills through hands-on practice`,
        );
      });
    }

    // General recommendations based on score
    if (overallScore < 60) {
      recommendations.push("Review the fundamental concepts of AI literacy");
      recommendations.push("Take introductory courses on AI basics");
    } else if (overallScore < 80) {
      recommendations.push("Practice with more advanced AI scenarios");
      recommendations.push("Explore real-world AI applications in your field");
    } else {
      recommendations.push("Consider mentoring others in AI literacy");
      recommendations.push(
        "Stay updated with latest AI developments and best practices",
      );
    }

    return recommendations.slice(0, 4);
  }

  /**
   * Generate overall feedback text
   */
  generateFeedback(score: number, level: string): string {
    if (score >= 80) {
      return `Excellent performance! You've demonstrated ${level} level AI literacy with strong understanding across all domains.`;
    } else if (score >= 70) {
      return `Great job! You've shown ${level} level proficiency in AI literacy. Keep building on your strengths.`;
    } else if (score >= 60) {
      return `Good effort! You've achieved ${level} level AI literacy. Focus on the areas marked for improvement.`;
    } else {
      return `You've completed the assessment at ${level} level. This is a great starting point for your AI literacy journey.`;
    }
  }
}
