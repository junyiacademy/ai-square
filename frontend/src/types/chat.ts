// Chat-related type definitions

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message: string;
  message_count: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AssessmentResult {
  overallScore: number;
  domainScores: Record<string, number>;
  weakDomains?: string[];
}

export interface UserProgress {
  completedScenarios: number;
  totalScenarios: number;
  learningHours: number;
  currentStreak: number;
}

export interface PBLHistory {
  scenarioId: string;
  scenarioTitle: string;
  completedAt: string;
  score: number;
  domain: string;
  timeSpent: number;
}

export interface RecommendedScenario {
  id: string;
  title: string;
  difficulty: string;
  domain: string;
  reason: string;
  estimatedTime: number;
}

export interface QuickAction {
  icon: string;
  label: string;
  prompt: string;
}

export interface User {
  email: string;
  id: string;
  role: string;
}
