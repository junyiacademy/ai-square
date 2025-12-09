/**
 * Type definitions for KSA Knowledge Graph
 * Extracted from KSAKnowledgeGraph.tsx for better maintainability
 */

import * as d3 from 'd3';

/**
 * Valid categories for graph nodes
 */
export type GraphCategory = 'knowledge' | 'skills' | 'attitudes' | 'center';

/**
 * Node in the force-directed graph
 * Extends D3's SimulationNodeDatum for physics simulation
 */
export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  category: GraphCategory;
  score?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

/**
 * Link between two nodes in the graph
 * Extends D3's SimulationLinkDatum for physics simulation
 */
export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

/**
 * Props for KSAKnowledgeGraph component
 */
export interface KSAKnowledgeGraphProps {
  ksaScores: {
    [ksa: string]: {
      score: number;
      category: 'knowledge' | 'skills' | 'attitudes';
    };
  };
  title: string;
  ksaMapping?: {
    [ksa: string]: {
      code: string;
      description: string;
      level?: string;
    };
  };
}

/**
 * Dimensions for the graph canvas
 */
export interface GraphDimensions {
  width: number;
  height: number;
}

/**
 * Category configuration for graph layout
 */
export interface CategoryConfig {
  id: GraphCategory;
  label: string;
  angle: number;
  color: string;
}
