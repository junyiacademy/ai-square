/**
 * Assessment Answer Distribution Validation Tests
 *
 * CRITICAL: These tests prevent pattern bias that allows students to game assessments.
 *
 * Context: User scored 12/12 by selecting all B options, revealing 100% bias.
 * This test ensures balanced answer distribution to maintain test validity.
 */

// Unmock fs for this test file
jest.unmock('fs');

import * as fs from 'fs';
import * as path from 'path';
import { load as yamlLoad } from 'js-yaml';

interface QuestionData {
  id: string;
  correct_answer: string;
  domain: string;
  difficulty: string;
  question: string;
}

interface TaskData {
  id: string;
  title: string;
  questions: QuestionData[];
}

interface AssessmentData {
  assessment_config: {
    id: string;
    total_questions: number;
  };
  tasks: TaskData[];
  metadata: {
    language: string;
  };
}

describe('Assessment Answer Distribution', () => {
  const assessmentPath = path.join(
    __dirname,
    '../../../../public/assessment_data/ai_literacy/ai_literacy_questions_en.yaml'
  );

  let data: AssessmentData;
  let questions: QuestionData[];
  let answers: string[];

  beforeAll(() => {
    try {
      const fileContent = fs.readFileSync(assessmentPath, 'utf8');
      data = yamlLoad(fileContent) as AssessmentData;

      questions = [];
      if (data.tasks) {
        data.tasks.forEach(task => {
          if (task.questions) {
            questions.push(...task.questions);
          }
        });
      }

      answers = questions.map(q => q.correct_answer.toLowerCase());
    } catch (error) {
      console.error('Failed to load assessment file:', error);
      throw error;
    }
  });

  describe('Pattern Bias Prevention', () => {
    it('should not have 100% bias toward any single option', () => {
      const distribution = getDistribution(answers);

      Object.entries(distribution).forEach(([option, count]) => {
        const percentage = (count / answers.length) * 100;
        expect(percentage).toBeLessThan(100);
      });
    });

    it('should not have >40% bias toward any single option', () => {
      const distribution = getDistribution(answers);

      Object.entries(distribution).forEach(([option, count]) => {
        const percentage = (count / answers.length) * 100;
        expect(percentage).toBeLessThanOrEqual(40);
      });
    });

    it('should prevent gaming with single-option strategy', () => {
      const distribution = getDistribution(answers);

      // Selecting all A, B, C, or D should not score >50%
      Object.entries(distribution).forEach(([option, count]) => {
        const score = (count / answers.length) * 100;
        expect(score).toBeLessThanOrEqual(50);
      });
    });
  });

  describe('Balanced Distribution', () => {
    it('should have answers distributed across all options', () => {
      const distribution = getDistribution(answers);
      const options = ['a', 'b', 'c', 'd'];

      options.forEach(option => {
        expect(distribution[option]).toBeGreaterThan(0);
      });
    });

    it('should target 25% distribution for 12 questions (3 each)', () => {
      const distribution = getDistribution(answers);
      const expectedCount = 3; // 25% of 12

      Object.entries(distribution).forEach(([option, count]) => {
        // Allow ±1 tolerance (2-4 questions per option)
        expect(count).toBeGreaterThanOrEqual(expectedCount - 1);
        expect(count).toBeLessThanOrEqual(expectedCount + 1);
      });
    });

    it('should keep each option within acceptable range (20-30%)', () => {
      const distribution = getDistribution(answers);

      Object.entries(distribution).forEach(([option, count]) => {
        const percentage = (count / answers.length) * 100;
        expect(percentage).toBeGreaterThanOrEqual(20);
        expect(percentage).toBeLessThanOrEqual(30);
      });
    });
  });

  describe('Pattern Detection', () => {
    it('should not follow sequential patterns (ABCDABCDABCD)', () => {
      const pattern = answers.join('');

      // Check for repeating sequences
      const hasSequentialPattern = /^(abcd)+$/i.test(pattern);
      expect(hasSequentialPattern).toBe(false);
    });

    it('should not have systematic patterns within domains', () => {
      const domains = groupByDomain(questions);

      Object.entries(domains).forEach(([domain, domainQuestions]) => {
        const domainAnswers = domainQuestions.map(q => q.correct_answer.toLowerCase());

        // Within a domain, answers should vary
        if (domainAnswers.length >= 3) {
          const uniqueAnswers = new Set(domainAnswers);
          expect(uniqueAnswers.size).toBeGreaterThan(1);
        }
      });
    });

    it('should not correlate difficulty with answer position', () => {
      const difficulties = groupByDifficulty(questions);

      Object.entries(difficulties).forEach(([difficulty, difficultyQuestions]) => {
        if (difficultyQuestions.length >= 3) {
          const difficultyAnswers = difficultyQuestions.map(q => q.correct_answer.toLowerCase());
          const uniqueAnswers = new Set(difficultyAnswers);

          // Should have variety within each difficulty level
          expect(uniqueAnswers.size).toBeGreaterThan(1);
        }
      });
    });
  });

  describe('Quality Metrics', () => {
    it('should have at least 12 questions', () => {
      expect(questions.length).toBeGreaterThanOrEqual(12);
    });

    it('should have all required fields for each question', () => {
      questions.forEach(q => {
        expect(q.id).toBeDefined();
        expect(q.correct_answer).toBeDefined();
        expect(q.domain).toBeDefined();
        expect(q.difficulty).toBeDefined();
        expect(q.question).toBeDefined();
      });
    });

    it('should have valid answer options (a, b, c, or d)', () => {
      const validOptions = ['a', 'b', 'c', 'd'];

      answers.forEach(answer => {
        expect(validOptions).toContain(answer);
      });
    });
  });

  describe('Distribution Report', () => {
    it('should generate valid distribution metrics', () => {
      const distribution = getDistribution(answers);
      const report = generateDistributionReport(distribution, answers.length);

      expect(report.total).toBe(questions.length);
      expect(report.hasBias).toBe(false);
      expect(Object.keys(report.percentages).length).toBe(4);
    });

    it('should flag bias if detected', () => {
      // Test with biased data
      const biasedAnswers = Array(10).fill('b').concat(['a', 'c']);
      const distribution = getDistribution(biasedAnswers);
      const report = generateDistributionReport(distribution, biasedAnswers.length);

      expect(report.hasBias).toBe(true);
    });

    it('should show actual distribution in report', () => {
      const distribution = getDistribution(answers);
      const report = generateDistributionReport(distribution, answers.length);

      // Log for manual inspection
      console.log('\n📊 Answer Distribution Report:');
      console.log(`Total Questions: ${report.total}`);
      Object.entries(report.distribution).forEach(([option, count]) => {
        const pct = report.percentages[option].toFixed(1);
        const bar = '█'.repeat(Math.round(report.percentages[option] / 5));
        console.log(`  Option ${option.toUpperCase()}: ${count} (${pct}%) ${bar}`);
      });
      console.log(`Has Bias: ${report.hasBias ? '🚨 YES' : '✅ NO'}\n`);

      expect(report).toBeDefined();
    });
  });
});

// Helper functions

function getDistribution(answers: string[]): Record<string, number> {
  const distribution: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };

  answers.forEach(answer => {
    distribution[answer] = (distribution[answer] || 0) + 1;
  });

  return distribution;
}

function groupByDomain(questions: QuestionData[]): Record<string, QuestionData[]> {
  return questions.reduce((acc, q) => {
    if (!acc[q.domain]) acc[q.domain] = [];
    acc[q.domain].push(q);
    return acc;
  }, {} as Record<string, QuestionData[]>);
}

function groupByDifficulty(questions: QuestionData[]): Record<string, QuestionData[]> {
  return questions.reduce((acc, q) => {
    if (!acc[q.difficulty]) acc[q.difficulty] = [];
    acc[q.difficulty].push(q);
    return acc;
  }, {} as Record<string, QuestionData[]>);
}

interface DistributionReport {
  total: number;
  distribution: Record<string, number>;
  percentages: Record<string, number>;
  hasBias: boolean;
}

function generateDistributionReport(
  distribution: Record<string, number>,
  total: number
): DistributionReport {
  const percentages: Record<string, number> = {};
  let hasBias = false;

  Object.entries(distribution).forEach(([option, count]) => {
    const percentage = (count / total) * 100;
    percentages[option] = percentage;

    if (percentage > 40) {
      hasBias = true;
    }
  });

  return {
    total,
    distribution,
    percentages,
    hasBias
  };
}
