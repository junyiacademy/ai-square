/**
 * Tests for DomainScoreAggregationService
 * Handles domain score calculation and KSA analysis for assessment completion
 */

import { DomainScoreAggregationService } from '../domain-score-aggregation.service';
import type { AssessmentQuestion, AssessmentInteraction, DomainScore } from '@/types/assessment-types';

describe('DomainScoreAggregationService', () => {
  let service: DomainScoreAggregationService;

  beforeEach(() => {
    service = new DomainScoreAggregationService();
  });

  describe('calculateDomainScores', () => {
    it('should calculate domain scores from questions and answers', () => {
      const questions: AssessmentQuestion[] = [
        {
          id: 'q1',
          domain: 'engaging_with_ai',
          question: 'What is AI?',
          options: { a: 'Option A', b: 'Option B' },
          difficulty: 'easy',
          correct_answer: 'a',
          explanation: 'Explanation',
          ksa_mapping: {
            knowledge: ['ai_basics'],
            skills: ['critical_thinking'],
            attitudes: ['curiosity']
          }
        },
        {
          id: 'q2',
          domain: 'engaging_with_ai',
          question: 'What is ML?',
          options: { a: 'Option A', b: 'Option B' },
          difficulty: 'medium',
          correct_answer: 'b',
          explanation: 'Explanation',
          ksa_mapping: {
            knowledge: ['ml_basics'],
            skills: ['analysis'],
            attitudes: ['openness']
          }
        },
        {
          id: 'q3',
          domain: 'creating_with_ai',
          question: 'How to create?',
          options: { a: 'Option A', b: 'Option B' },
          difficulty: 'hard',
          correct_answer: 'a',
          explanation: 'Explanation',
          ksa_mapping: {
            knowledge: ['creation_basics'],
            skills: ['creativity'],
            attitudes: ['innovation']
          }
        }
      ];

      const answers: AssessmentInteraction[] = [
        {
          timestamp: '2024-01-01T00:00:00Z',
          type: 'assessment_answer',
          context: {
            questionId: 'q1',
            selectedAnswer: 'a',
            isCorrect: true,
            timeSpent: 10
          }
        },
        {
          timestamp: '2024-01-01T00:01:00Z',
          type: 'assessment_answer',
          context: {
            questionId: 'q2',
            selectedAnswer: 'a',
            isCorrect: false,
            timeSpent: 15
          }
        },
        {
          timestamp: '2024-01-01T00:02:00Z',
          type: 'assessment_answer',
          context: {
            questionId: 'q3',
            selectedAnswer: 'a',
            isCorrect: true,
            timeSpent: 20
          }
        }
      ];

      const domainScores = service.calculateDomainScores(questions, answers);

      expect(domainScores.size).toBe(4); // All 4 domains initialized

      const engagingScore = domainScores.get('engaging_with_ai');
      expect(engagingScore).toBeDefined();
      expect(engagingScore?.totalQuestions).toBe(2);
      expect(engagingScore?.correctAnswers).toBe(1);
      expect(engagingScore?.score).toBe(50); // 1/2 = 50%

      const creatingScore = domainScores.get('creating_with_ai');
      expect(creatingScore).toBeDefined();
      expect(creatingScore?.totalQuestions).toBe(1);
      expect(creatingScore?.correctAnswers).toBe(1);
      expect(creatingScore?.score).toBe(100); // 1/1 = 100%
    });

    it('should collect KSA mappings from questions', () => {
      const questions: AssessmentQuestion[] = [
        {
          id: 'q1',
          domain: 'engaging_with_ai',
          question: 'Question 1',
          options: { a: 'A' },
          difficulty: 'easy',
          correct_answer: 'a',
          explanation: 'Exp',
          ksa_mapping: {
            knowledge: ['k1', 'k2'],
            skills: ['s1'],
            attitudes: ['a1']
          }
        }
      ];

      const answers: AssessmentInteraction[] = [
        {
          timestamp: '2024-01-01T00:00:00Z',
          type: 'assessment_answer',
          context: {
            questionId: 'q1',
            selectedAnswer: 'a',
            isCorrect: true,
            timeSpent: 10
          }
        }
      ];

      const domainScores = service.calculateDomainScores(questions, answers);
      const engagingScore = domainScores.get('engaging_with_ai');

      expect(engagingScore?.ksa.knowledge.size).toBe(2);
      expect(engagingScore?.ksa.knowledge.has('k1')).toBe(true);
      expect(engagingScore?.ksa.knowledge.has('k2')).toBe(true);
      expect(engagingScore?.ksa.skills.has('s1')).toBe(true);
      expect(engagingScore?.ksa.attitudes.has('a1')).toBe(true);
    });

    it('should handle questions without KSA mappings', () => {
      const questions: AssessmentQuestion[] = [
        {
          id: 'q1',
          domain: 'engaging_with_ai',
          question: 'Question',
          options: { a: 'A' },
          difficulty: 'easy',
          correct_answer: 'a',
          explanation: 'Exp'
        }
      ];

      const answers: AssessmentInteraction[] = [
        {
          timestamp: '2024-01-01T00:00:00Z',
          type: 'assessment_answer',
          context: {
            questionId: 'q1',
            selectedAnswer: 'a',
            isCorrect: true,
            timeSpent: 10
          }
        }
      ];

      const domainScores = service.calculateDomainScores(questions, answers);
      const engagingScore = domainScores.get('engaging_with_ai');

      expect(engagingScore?.totalQuestions).toBe(1);
      expect(engagingScore?.ksa.knowledge.size).toBe(0);
    });

    it('should initialize all four domains even if no questions', () => {
      const domainScores = service.calculateDomainScores([], []);

      expect(domainScores.size).toBe(4);
      expect(domainScores.has('engaging_with_ai')).toBe(true);
      expect(domainScores.has('creating_with_ai')).toBe(true);
      expect(domainScores.has('managing_with_ai')).toBe(true);
      expect(domainScores.has('designing_with_ai')).toBe(true);
    });
  });

  describe('analyzeKSAPerformance', () => {
    it('should separate correct and incorrect KSA mappings', () => {
      const questions: AssessmentQuestion[] = [
        {
          id: 'q1',
          domain: 'engaging_with_ai',
          question: 'Q1',
          options: { a: 'A' },
          difficulty: 'easy',
          correct_answer: 'a',
          explanation: 'Exp',
          ksa_mapping: {
            knowledge: ['k1'],
            skills: ['s1'],
            attitudes: ['a1']
          }
        },
        {
          id: 'q2',
          domain: 'engaging_with_ai',
          question: 'Q2',
          options: { a: 'A' },
          difficulty: 'easy',
          correct_answer: 'a',
          explanation: 'Exp',
          ksa_mapping: {
            knowledge: ['k2'],
            skills: ['s2'],
            attitudes: ['a2']
          }
        }
      ];

      const answers: AssessmentInteraction[] = [
        {
          timestamp: '2024-01-01T00:00:00Z',
          type: 'assessment_answer',
          context: {
            questionId: 'q1',
            selectedAnswer: 'a',
            isCorrect: true,
            timeSpent: 10
          }
        },
        {
          timestamp: '2024-01-01T00:01:00Z',
          type: 'assessment_answer',
          context: {
            questionId: 'q2',
            selectedAnswer: 'b',
            isCorrect: false,
            timeSpent: 15
          }
        }
      ];

      const analysis = service.analyzeKSAPerformance(questions, answers);

      expect(analysis.correctKSA.knowledge.has('k1')).toBe(true);
      expect(analysis.correctKSA.skills.has('s1')).toBe(true);
      expect(analysis.correctKSA.attitudes.has('a1')).toBe(true);

      expect(analysis.incorrectKSA.knowledge.has('k2')).toBe(true);
      expect(analysis.incorrectKSA.skills.has('s2')).toBe(true);
      expect(analysis.incorrectKSA.attitudes.has('a2')).toBe(true);
    });

    it('should calculate KSA scores correctly', () => {
      const questions: AssessmentQuestion[] = [
        {
          id: 'q1',
          domain: 'engaging_with_ai',
          question: 'Q1',
          options: { a: 'A' },
          difficulty: 'easy',
          correct_answer: 'a',
          explanation: 'Exp',
          ksa_mapping: { knowledge: ['k1'] }
        },
        {
          id: 'q2',
          domain: 'engaging_with_ai',
          question: 'Q2',
          options: { a: 'A' },
          difficulty: 'easy',
          correct_answer: 'a',
          explanation: 'Exp',
          ksa_mapping: { knowledge: ['k1', 'k2'] }
        }
      ];

      const answers: AssessmentInteraction[] = [
        {
          timestamp: '2024-01-01T00:00:00Z',
          type: 'assessment_answer',
          context: { questionId: 'q1', selectedAnswer: 'a', isCorrect: true, timeSpent: 10 }
        },
        {
          timestamp: '2024-01-01T00:01:00Z',
          type: 'assessment_answer',
          context: { questionId: 'q2', selectedAnswer: 'b', isCorrect: false, timeSpent: 15 }
        }
      ];

      const analysis = service.analyzeKSAPerformance(questions, answers);

      // k1 appears in both correct and incorrect, k2 only in incorrect
      // Total: 2 knowledge items, correct: 1 (k1)
      expect(analysis.ksaScores.knowledge).toBe(50); // 1/2 = 50%
    });

    it('should identify weak KSA areas', () => {
      const questions: AssessmentQuestion[] = [
        {
          id: 'q1',
          domain: 'engaging_with_ai',
          question: 'Q1',
          options: { a: 'A' },
          difficulty: 'easy',
          correct_answer: 'a',
          explanation: 'Exp',
          ksa_mapping: { knowledge: ['weak_k'] }
        }
      ];

      const answers: AssessmentInteraction[] = [
        {
          timestamp: '2024-01-01T00:00:00Z',
          type: 'assessment_answer',
          context: { questionId: 'q1', selectedAnswer: 'b', isCorrect: false, timeSpent: 10 }
        }
      ];

      const analysis = service.analyzeKSAPerformance(questions, answers);

      expect(analysis.weakKSA.knowledge.has('weak_k')).toBe(true);
    });

    it('should handle empty data gracefully', () => {
      const analysis = service.analyzeKSAPerformance([], []);

      expect(analysis.correctKSA.knowledge.size).toBe(0);
      expect(analysis.ksaScores.knowledge).toBe(0);
      expect(analysis.ksaScores.skills).toBe(0);
      expect(analysis.ksaScores.attitudes).toBe(0);
    });
  });

  describe('calculateOverallScore', () => {
    it('should calculate overall score correctly', () => {
      const totalQuestions = 10;
      const correctAnswers = 7;

      const score = service.calculateOverallScore(totalQuestions, correctAnswers);

      expect(score).toBe(70);
    });

    it('should return 0 if no questions', () => {
      const score = service.calculateOverallScore(0, 0);
      expect(score).toBe(0);
    });

    it('should round to nearest integer', () => {
      const score = service.calculateOverallScore(3, 2);
      expect(score).toBe(67); // 2/3 = 66.67 -> 67
    });
  });

  describe('determineLevel', () => {
    it('should return expert for score >= 80', () => {
      expect(service.determineLevel(80)).toBe('expert');
      expect(service.determineLevel(100)).toBe('expert');
    });

    it('should return advanced for score >= 70', () => {
      expect(service.determineLevel(70)).toBe('advanced');
      expect(service.determineLevel(79)).toBe('advanced');
    });

    it('should return intermediate for score >= 50', () => {
      expect(service.determineLevel(50)).toBe('intermediate');
      expect(service.determineLevel(69)).toBe('intermediate');
    });

    it('should return beginner for score < 50', () => {
      expect(service.determineLevel(0)).toBe('beginner');
      expect(service.determineLevel(49)).toBe('beginner');
    });
  });

  describe('generateRecommendations', () => {
    it('should recommend improvement for weak domains', () => {
      const domainScores = new Map<string, DomainScore>([
        ['engaging_with_ai', {
          domain: 'engaging_with_ai',
          totalQuestions: 10,
          correctAnswers: 4,
          score: 40,
          competencies: new Set(),
          ksa: { knowledge: new Set(), skills: new Set(), attitudes: new Set() }
        }],
        ['creating_with_ai', {
          domain: 'creating_with_ai',
          totalQuestions: 10,
          correctAnswers: 8,
          score: 80,
          competencies: new Set(),
          ksa: { knowledge: new Set(), skills: new Set(), attitudes: new Set() }
        }]
      ]);

      const recommendations = service.generateRecommendations(domainScores, 60);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('engaging with ai'))).toBe(true);
    });

    it('should return general recommendations for low scores', () => {
      const domainScores = new Map<string, DomainScore>();
      const recommendations = service.generateRecommendations(domainScores, 50);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('AI literacy'))).toBe(true);
    });

    it('should recommend advanced content for high scores', () => {
      const domainScores = new Map<string, DomainScore>();
      const recommendations = service.generateRecommendations(domainScores, 85);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('mentor') || r.includes('latest'))).toBe(true);
    });

    it('should limit to 4 recommendations', () => {
      const domainScores = new Map<string, DomainScore>();
      const recommendations = service.generateRecommendations(domainScores, 50);

      expect(recommendations.length).toBeLessThanOrEqual(4);
    });
  });

  describe('generateFeedback', () => {
    it('should generate excellent feedback for high scores', () => {
      const feedback = service.generateFeedback(85, 'expert');
      expect(feedback).toContain('Excellent');
      expect(feedback).toContain('expert');
    });

    it('should generate good feedback for medium-high scores', () => {
      const feedback = service.generateFeedback(75, 'advanced');
      expect(feedback).toContain('Great');
      expect(feedback).toContain('advanced');
    });

    it('should generate encouraging feedback for medium scores', () => {
      const feedback = service.generateFeedback(65, 'intermediate');
      expect(feedback).toContain('Good');
      expect(feedback).toContain('intermediate');
    });

    it('should generate supportive feedback for low scores', () => {
      const feedback = service.generateFeedback(45, 'beginner');
      expect(feedback).toContain('starting point');
      expect(feedback).toContain('beginner');
    });
  });
});
