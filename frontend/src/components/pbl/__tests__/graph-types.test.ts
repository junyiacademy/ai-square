/**
 * Tests for KSA Knowledge Graph Types
 * TDD Phase 1.4.1: Types and Constants
 */

import { GraphNode, GraphLink, GraphCategory } from '../graph-types';

describe('Graph Types', () => {
  describe('GraphNode', () => {
    it('should allow creating a center node', () => {
      const centerNode: GraphNode = {
        id: 'center',
        label: 'AI Literacy',
        category: 'center',
        fx: 400,
        fy: 300
      };

      expect(centerNode.category).toBe('center');
      expect(centerNode.fx).toBe(400);
      expect(centerNode.fy).toBe(300);
    });

    it('should allow creating a category node', () => {
      const categoryNode: GraphNode = {
        id: 'knowledge',
        label: 'Knowledge',
        category: 'knowledge',
        fx: 500,
        fy: 200
      };

      expect(categoryNode.category).toBe('knowledge');
      expect(categoryNode.score).toBeUndefined();
    });

    it('should allow creating a KSA node with score', () => {
      const ksaNode: GraphNode = {
        id: 'K1',
        label: 'K1',
        category: 'knowledge',
        score: 85
      };

      expect(ksaNode.score).toBe(85);
      expect(ksaNode.category).toBe('knowledge');
    });

    it('should have optional position properties', () => {
      const node: GraphNode = {
        id: 'test',
        label: 'Test',
        category: 'skills',
        x: 100,
        y: 200
      };

      expect(node.x).toBe(100);
      expect(node.y).toBe(200);
    });
  });

  describe('GraphLink', () => {
    it('should create a link between nodes', () => {
      const link: GraphLink = {
        source: 'center',
        target: 'knowledge'
      };

      expect(link.source).toBe('center');
      expect(link.target).toBe('knowledge');
    });

    it('should accept node objects as source and target', () => {
      const sourceNode: GraphNode = {
        id: 'center',
        label: 'Center',
        category: 'center'
      };

      const targetNode: GraphNode = {
        id: 'K1',
        label: 'K1',
        category: 'knowledge',
        score: 85
      };

      const link: GraphLink = {
        source: sourceNode,
        target: targetNode
      };

      expect((link.source as GraphNode).id).toBe('center');
      expect((link.target as GraphNode).id).toBe('K1');
    });
  });

  describe('GraphCategory', () => {
    it('should define valid category values', () => {
      const categories: GraphCategory[] = ['knowledge', 'skills', 'attitudes', 'center'];

      expect(categories).toContain('knowledge');
      expect(categories).toContain('skills');
      expect(categories).toContain('attitudes');
      expect(categories).toContain('center');
    });
  });
});
