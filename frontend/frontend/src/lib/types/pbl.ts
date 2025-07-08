export type ScenarioType = 'pbl' | 'discovery' | 'assessment';

export interface BaseScenario {
  id: string;
  title: string;
  description: string;
  type: ScenarioType;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tasks?: any[];
  [key: string]: any; // For localized fields
}

export interface PBLTask {
  id: string;
  title: string;
  description?: string;
  scenario?: string;
  background?: string;
  resources?: Resource[];
  order?: number;
  [key: string]: any; // For localized fields
}

export interface DiscoveryTask {
  id: string;
  title: string;
  description?: string;
  prompt?: string;
  hints?: string[];
  order?: number;
  [key: string]: any; // For localized fields
}

export interface AssessmentTask {
  id: string;
  title: string;
  description?: string;
  question?: string;
  context?: string;
  options?: AssessmentOption[];
  correctAnswer?: string;
  order?: number;
  [key: string]: any; // For localized fields
}

export interface AssessmentOption {
  id: string;
  text: string;
  label?: string;
  [key: string]: any; // For localized fields
}

export interface Resource {
  title: string;
  url: string;
  description?: string;
  type?: 'article' | 'video' | 'document' | 'tool';
  [key: string]: any; // For localized fields
}