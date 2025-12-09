/**
 * Type definitions for Knowledge Graph visualization
 */

import * as d3 from 'd3';
import { AssessmentResult } from '../../../types/assessment';

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: 'domain' | 'competency' | 'ksa-theme' | 'ksa-code' | 'ksa-subcode';
  name: string;
  score?: number;
  mastery?: number; // For KSA codes: 0=red, 1=yellow, 2=green
  ksaType?: 'knowledge' | 'skills' | 'attitudes';
  parentCode?: string; // For subcodes like K1.1, parent would be K1
  details?: {
    summary?: string;
    explanation?: string;
    correct?: number;
    total?: number;
    questions?: string[];
    theme?: string;
  };
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  value: number;
}

export interface KSAMastery {
  correct: number;
  total: number;
  questions: string[];
}

export interface KSAMaps {
  kMap: Record<string, { summary: string; theme: string; explanation?: string }>;
  sMap: Record<string, { summary: string; theme: string; explanation?: string }>;
  aMap: Record<string, { summary: string; theme: string; explanation?: string }>;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface GraphDimensions {
  width: number;
  height: number;
}

export interface KnowledgeGraphProps {
  result: AssessmentResult;
  questions?: unknown[];
  userAnswers?: unknown[];
  domainsData?: unknown[] | null;
  ksaMaps?: KSAMaps | null;
}
