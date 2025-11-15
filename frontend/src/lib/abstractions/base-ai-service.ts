/**
 * Base AI Service Abstraction
 * Provides a unified interface for different AI service implementations
 */

export interface IAIResponse {
  content: string;
  metadata?: Record<string, unknown>;
}

export interface IAIRequest {
  prompt: string;
  context?: Record<string, unknown>;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export abstract class BaseAIService {
  abstract generateContent(request: IAIRequest): Promise<IAIResponse>;
  abstract generateChat(messages: Array<{ role: string; content: string }>): Promise<IAIResponse>;
  abstract evaluateResponse(prompt: string, response: string, criteria: string[]): Promise<number>;
}
