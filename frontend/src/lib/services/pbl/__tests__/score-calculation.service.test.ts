import { describe, it, expect } from '@jest/globals';
import { ScoreCalculationService } from '../score-calculation.service';

describe('ScoreCalculationService', () => {
  const service = new ScoreCalculationService();

  describe('calculateOverallScore', () => {
    it('should calculate average of valid numeric scores', () => {
      const evaluations = [
        { score: 80 },
        { score: 90 },
        { score: 70 }
      ];
      const result = service.calculateOverallScore(evaluations);
      expect(result).toBe(80); // (80+90+70)/3 = 80
    });

    it('should handle string scores from PostgreSQL', () => {
      const evaluations = [
        { score: '85' },
        { score: '95' },
        { score: '75' }
      ];
      const result = service.calculateOverallScore(evaluations);
      expect(result).toBe(85);
    });

    it('should filter out invalid scores', () => {
      const evaluations = [
        { score: 80 },
        { score: null },
        { score: undefined },
        { score: NaN },
        { score: 90 }
      ];
      const result = service.calculateOverallScore(evaluations);
      expect(result).toBe(85); // (80+90)/2
    });

    it('should return 0 for empty array', () => {
      const result = service.calculateOverallScore([]);
      expect(result).toBe(0);
    });

    it('should return 0 when all scores are invalid', () => {
      const evaluations = [
        { score: null },
        { score: undefined },
        { score: NaN }
      ];
      const result = service.calculateOverallScore(evaluations);
      expect(result).toBe(0);
    });
  });

  describe('calculateDomainScores', () => {
    it('should aggregate domain scores from evaluations', () => {
      const evaluations: Array<{ score?: number; domainScores?: Record<string, number> }> = [
        { score: 80, domainScores: { math: 80, science: 70 } },
        { score: 90, domainScores: { math: 90, science: 80 } },
        { score: 70, domainScores: { math: 70, english: 85 } }
      ];
      const result = service.calculateDomainScores(evaluations);
      expect(result).toEqual({
        math: 80,    // (80+90+70)/3
        science: 75, // (70+80)/2
        english: 85  // 85/1
      });
    });

    it('should handle metadata.domainScores fallback', () => {
      const evaluations = [
        { score: 80, metadata: { domainScores: { math: 80 } } },
        { score: 90, domainScores: { math: 90 } }
      ];
      const result = service.calculateDomainScores(evaluations);
      expect(result.math).toBe(85);
    });

    it('should filter out invalid scores', () => {
      const evaluations = [
        { score: 80, domainScores: { math: 80, invalid: NaN } },
        { score: 90, domainScores: { math: 90, invalid: null as unknown as number } }
      ];
      const result = service.calculateDomainScores(evaluations);
      expect(result).toEqual({ math: 85 });
    });

    it('should return empty object for evaluations without domain scores', () => {
      const evaluations = [
        { score: 80 },
        { score: 90 }
      ];
      const result = service.calculateDomainScores(evaluations);
      expect(result).toEqual({});
    });
  });

  describe('calculateKSAScores', () => {
    it('should calculate average KSA scores from pblData', () => {
      const evaluations = [
        { pblData: { ksaScores: { knowledge: 80, skills: 70, attitudes: 90 } } },
        { pblData: { ksaScores: { knowledge: 90, skills: 80, attitudes: 70 } } }
      ];
      const result = service.calculateKSAScores(evaluations);
      expect(result).toEqual({
        knowledge: 85,
        skills: 75,
        attitudes: 80
      });
    });

    it('should handle metadata.ksaScores fallback', () => {
      const evaluations = [
        { metadata: { ksaScores: { knowledge: 80, skills: 70, attitudes: 90 } } },
        { pblData: { ksaScores: { knowledge: 90, skills: 80, attitudes: 70 } } }
      ];
      const result = service.calculateKSAScores(evaluations);
      expect(result).toEqual({
        knowledge: 85,
        skills: 75,
        attitudes: 80
      });
    });

    it('should handle partial KSA data', () => {
      const evaluations = [
        { pblData: { ksaScores: { knowledge: 80 } } },
        { pblData: { ksaScores: { skills: 90 } } }
      ];
      const result = service.calculateKSAScores(evaluations);
      expect(result).toEqual({
        knowledge: 40, // 80/2 (averaged across both even though second has 0)
        skills: 45,    // 90/2
        attitudes: 0
      });
    });

    it('should return zeros for evaluations without KSA scores', () => {
      const evaluations = [
        { score: 80 },
        { score: 90 }
      ];
      const result = service.calculateKSAScores(evaluations);
      expect(result).toEqual({
        knowledge: 0,
        skills: 0,
        attitudes: 0
      });
    });
  });
});
