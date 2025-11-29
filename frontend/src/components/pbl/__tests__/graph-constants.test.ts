/**
 * Tests for KSA Knowledge Graph Constants
 * TDD Phase 1.4.1: Types and Constants
 */

import {
  CATEGORY_CONFIGS,
  GRAPH_COLORS,
  SCORE_THRESHOLDS,
  GRAPH_CONFIG,
  getScoreColor,
  getScoreStatus,
  getCategoryColor
} from '../graph-constants';

describe('Graph Constants', () => {
  describe('CATEGORY_CONFIGS', () => {
    it('should define three categories', () => {
      expect(CATEGORY_CONFIGS).toHaveLength(3);
    });

    it('should define knowledge category at top (angle -π/2)', () => {
      const knowledge = CATEGORY_CONFIGS.find(c => c.id === 'knowledge');
      expect(knowledge).toBeDefined();
      expect(knowledge?.label).toBe('Knowledge');
      expect(knowledge?.angle).toBe(-Math.PI / 2);
      expect(knowledge?.color).toBe('#3b82f6');
    });

    it('should define skills category at bottom right', () => {
      const skills = CATEGORY_CONFIGS.find(c => c.id === 'skills');
      expect(skills).toBeDefined();
      expect(skills?.label).toBe('Skills');
      expect(skills?.angle).toBe(Math.PI / 6);
      expect(skills?.color).toBe('#10b981');
    });

    it('should define attitudes category at bottom left', () => {
      const attitudes = CATEGORY_CONFIGS.find(c => c.id === 'attitudes');
      expect(attitudes).toBeDefined();
      expect(attitudes?.label).toBe('Attitudes');
      expect(attitudes?.angle).toBe((5 * Math.PI) / 6);
      expect(attitudes?.color).toBe('#a855f7');
    });
  });

  describe('GRAPH_COLORS', () => {
    it('should define center color', () => {
      expect(GRAPH_COLORS.center).toBe('#6366f1');
    });

    it('should define category colors', () => {
      expect(GRAPH_COLORS.knowledge).toBe('#3b82f6');
      expect(GRAPH_COLORS.skills).toBe('#10b981');
      expect(GRAPH_COLORS.attitudes).toBe('#a855f7');
    });

    it('should define score colors (traffic light)', () => {
      expect(GRAPH_COLORS.scoreHigh).toBe('#10b981'); // Green
      expect(GRAPH_COLORS.scoreMedium).toBe('#f59e0b'); // Amber
      expect(GRAPH_COLORS.scoreLow).toBe('#ef4444'); // Red
    });

    it('should define link and default colors', () => {
      expect(GRAPH_COLORS.link).toBe('#e5e7eb');
      expect(GRAPH_COLORS.default).toBe('#9ca3af');
    });
  });

  describe('SCORE_THRESHOLDS', () => {
    it('should define excellent threshold at 80', () => {
      expect(SCORE_THRESHOLDS.excellent).toBe(80);
    });

    it('should define good threshold at 60', () => {
      expect(SCORE_THRESHOLDS.good).toBe(60);
    });
  });

  describe('GRAPH_CONFIG', () => {
    it('should define zoom scale extent', () => {
      expect(GRAPH_CONFIG.zoom.scaleExtent).toEqual([0.5, 3]);
    });

    it('should define force simulation parameters', () => {
      expect(GRAPH_CONFIG.force.chargeStrength).toBe(-300);
      expect(GRAPH_CONFIG.force.linkDistanceMultiplier).toBe(0.15);
      expect(GRAPH_CONFIG.force.centerLinkMultiplier).toBe(1.5);
      expect(GRAPH_CONFIG.force.collisionRadiusMultiplier).toBe(0.08);
    });

    it('should define node radius multipliers', () => {
      expect(GRAPH_CONFIG.node.centerRadiusMultiplier).toBe(1.5);
      expect(GRAPH_CONFIG.node.categoryRadiusMultiplier).toBe(1.25);
      expect(GRAPH_CONFIG.node.baseRadiusMultiplier).toBe(0.04);
    });

    it('should define layout parameters', () => {
      expect(GRAPH_CONFIG.layout.categoryRadiusMultiplier).toBe(0.3);
      expect(GRAPH_CONFIG.layout.aspectRatio).toBe(0.75);
      expect(GRAPH_CONFIG.layout.padding).toBe(48);
    });
  });

  describe('Helper Functions', () => {
    describe('getScoreColor', () => {
      it('should return green for scores >= 80', () => {
        expect(getScoreColor(80)).toBe('#10b981');
        expect(getScoreColor(90)).toBe('#10b981');
        expect(getScoreColor(100)).toBe('#10b981');
      });

      it('should return amber for scores 60-79', () => {
        expect(getScoreColor(60)).toBe('#f59e0b');
        expect(getScoreColor(70)).toBe('#f59e0b');
        expect(getScoreColor(79)).toBe('#f59e0b');
      });

      it('should return red for scores < 60', () => {
        expect(getScoreColor(0)).toBe('#ef4444');
        expect(getScoreColor(30)).toBe('#ef4444');
        expect(getScoreColor(59)).toBe('#ef4444');
      });
    });

    describe('getScoreStatus', () => {
      it('should return excellent status for scores >= 80', () => {
        const status = getScoreStatus(85);
        expect(status.text).toBe('Excellent');
        expect(status.icon).toBe('✓');
        expect(status.color).toContain('green');
      });

      it('should return good status for scores 60-79', () => {
        const status = getScoreStatus(70);
        expect(status.text).toBe('Good');
        expect(status.icon).toBe('!');
        expect(status.color).toContain('amber');
      });

      it('should return needs improvement status for scores < 60', () => {
        const status = getScoreStatus(50);
        expect(status.text).toBe('Needs Improvement');
        expect(status.icon).toBe('✗');
        expect(status.color).toContain('red');
      });
    });

    describe('getCategoryColor', () => {
      it('should return knowledge color', () => {
        expect(getCategoryColor('knowledge')).toBe('#3b82f6');
      });

      it('should return skills color', () => {
        expect(getCategoryColor('skills')).toBe('#10b981');
      });

      it('should return attitudes color', () => {
        expect(getCategoryColor('attitudes')).toBe('#a855f7');
      });

      it('should return center color for center category', () => {
        expect(getCategoryColor('center')).toBe('#6366f1');
      });
    });
  });
});
