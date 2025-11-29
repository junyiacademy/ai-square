/**
 * Constants for KSA Knowledge Graph
 * Extracted from KSAKnowledgeGraph.tsx for better maintainability
 */

import { CategoryConfig, GraphCategory } from './graph-types';

/**
 * Category configurations with positions and colors
 */
export const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    id: 'knowledge',
    label: 'Knowledge',
    angle: -Math.PI / 2, // Top
    color: '#3b82f6' // Blue
  },
  {
    id: 'skills',
    label: 'Skills',
    angle: Math.PI / 6, // Bottom right
    color: '#10b981' // Green
  },
  {
    id: 'attitudes',
    label: 'Attitudes',
    angle: (5 * Math.PI) / 6, // Bottom left
    color: '#a855f7' // Purple
  }
];

/**
 * Color palette for the graph
 */
export const GRAPH_COLORS = {
  center: '#6366f1', // Indigo
  knowledge: '#3b82f6', // Blue
  skills: '#10b981', // Green
  attitudes: '#a855f7', // Purple
  scoreHigh: '#10b981', // Green (≥80%)
  scoreMedium: '#f59e0b', // Amber (60-79%)
  scoreLow: '#ef4444', // Red (<60%)
  link: '#e5e7eb', // Gray
  default: '#9ca3af' // Gray
} as const;

/**
 * Score thresholds for performance levels
 */
export const SCORE_THRESHOLDS = {
  excellent: 80,
  good: 60
} as const;

/**
 * Graph configuration constants
 */
export const GRAPH_CONFIG = {
  zoom: {
    scaleExtent: [0.5, 3] as [number, number],
    transitionDuration: 750,
    focusScale: 1.5
  },
  force: {
    chargeStrength: -300,
    linkDistanceMultiplier: 0.15,
    centerLinkMultiplier: 1.5,
    collisionRadiusMultiplier: 0.08
  },
  node: {
    centerRadiusMultiplier: 1.5,
    categoryRadiusMultiplier: 1.25,
    baseRadiusMultiplier: 0.04,
    strokeWidth: 2,
    selectedStrokeWidth: 4
  },
  layout: {
    categoryRadiusMultiplier: 0.3,
    aspectRatio: 0.75,
    padding: 48
  },
  animation: {
    selectionDuration: 300,
    zoomDuration: 750
  }
} as const;

/**
 * Get color for a score based on thresholds
 */
export function getScoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.excellent) return GRAPH_COLORS.scoreHigh;
  if (score >= SCORE_THRESHOLDS.good) return GRAPH_COLORS.scoreMedium;
  return GRAPH_COLORS.scoreLow;
}

/**
 * Get status information for a score
 */
export function getScoreStatus(score: number): {
  text: string;
  icon: string;
  color: string;
} {
  if (score >= SCORE_THRESHOLDS.excellent) {
    return {
      text: 'Excellent',
      icon: '✓',
      color: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
    };
  }
  if (score >= SCORE_THRESHOLDS.good) {
    return {
      text: 'Good',
      icon: '!',
      color: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
    };
  }
  return {
    text: 'Needs Improvement',
    icon: '✗',
    color: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
  };
}

/**
 * Get Tailwind color class for a score
 */
export function getScoreColorClass(score: number): string {
  if (score >= SCORE_THRESHOLDS.excellent) {
    return 'text-green-600 dark:text-green-400';
  }
  if (score >= SCORE_THRESHOLDS.good) {
    return 'text-amber-600 dark:text-amber-400';
  }
  return 'text-red-600 dark:text-red-400';
}

/**
 * Get category color
 */
export function getCategoryColor(category: GraphCategory): string {
  return GRAPH_COLORS[category] || GRAPH_COLORS.default;
}
