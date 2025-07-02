// PBL API Types
import { Task, Program, PBLScenario, Scenario } from './pbl';

// Chat API
export interface ChatRequest {
  messages: ChatMessage[];
  scenario: PBLScenario;
  program: Program;
  task: Task;
  language?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ChatResponse {
  response: string;
  suggestions?: string[];
}

// Evaluation API
export interface EvaluateRequest {
  taskId: string;
  programId: string;
  scenarioId: string;
  responses: Record<string, unknown>;
  language?: string;
}

export interface EvaluateResponse {
  evaluation: {
    score: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
  };
  ksaMapping?: Record<string, number>;
}

// Feedback API
export interface GenerateFeedbackRequest {
  scenarioId: string;
  programId: string;
  language?: string;
  evaluations?: Array<{
    taskId: string;
    score: number;
    feedback: string;
  }>;
}

export interface GenerateFeedbackResponse {
  feedback: {
    summary: string;
    strengths: string[];
    improvements: string[];
    nextSteps: string[];
  };
}

// Scenario API
export interface ScenarioListResponse {
  scenarios: PBLScenario[];
  total: number;
}

export interface ScenarioDetailResponse {
  scenario: PBLScenario;
  userProgress?: {
    completedPrograms: string[];
    currentProgramId?: string;
  };
}

// Program API
export interface ProgramResponse {
  program: Program;
  progress: {
    completedTasks: string[];
    currentTaskId?: string;
  };
}

// Task Log API
export interface TaskLogRequest {
  programId: string;
  taskId: string;
  action: string;
  data?: Record<string, unknown>;
}

export interface TaskLogResponse {
  success: boolean;
  logId?: string;
}

// History API
export interface HistoryResponse {
  scenarios: Array<{
    scenario: PBLScenario;
    completedPrograms: number;
    totalPrograms: number;
    lastActivity: string;
  }>;
}