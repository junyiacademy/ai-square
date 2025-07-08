/**
 * AI Service Interface for V2 Architecture
 */

export interface AIGenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  language?: string;
}

export interface AIEvaluationResult {
  scores: Record<string, number>;
  feedback: {
    summary: string;
    strengths: string[];
    improvements: string[];
  };
  ksa_achievement?: Record<string, number>;
  metadata?: Record<string, any>;
}

export interface IAIService {
  // Text generation
  generateText(prompt: string, options?: AIGenerationOptions): Promise<string>;
  
  // Task evaluation
  evaluateTaskResponse(params: {
    task: any;
    response: any;
    rubric?: any;
    required_ksa?: string[];
  }): Promise<AIEvaluationResult>;
  
  // Content generation for Discovery
  generateTask(context: {
    career: string;
    scenario_type: string;
    existing_tasks?: any[];
    user_interest?: string;
  }): Promise<{
    title: string;
    description: string;
    instructions?: string;
    type: string;
    metadata?: Record<string, any>;
  }>;
  
  // Feedback generation
  generateFeedback(params: {
    evaluation: AIEvaluationResult;
    task?: any;
    language?: string;
  }): Promise<string>;
  
  // Model info
  getModelInfo(): {
    provider: string;
    model: string;
    capabilities: string[];
  };
}