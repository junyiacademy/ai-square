import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIModule, ConversationTurn, ProcessLog } from '@/types/pbl';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export interface GeminiChatConfig {
  model: string;
  systemPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

export interface GeminiResponse {
  content: string;
  tokensUsed?: number;
  processingTime: number;
}

export class GeminiService {
  private model;
  private chat;
  private startTime: number = 0;

  constructor(config: GeminiChatConfig) {
    this.model = genAI.getGenerativeModel({
      model: config.model || 'gemini-pro',
      generationConfig: {
        temperature: config.temperature || 0.7,
        topP: config.topP || 0.8,
        topK: config.topK || 40,
        maxOutputTokens: config.maxOutputTokens || 2048,
      },
    });

    // Initialize chat with system prompt
    this.chat = this.model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: `System: ${config.systemPrompt}` }],
        },
        {
          role: 'model',
          parts: [{ text: 'Understood. I will act according to the given instructions.' }],
        },
      ],
    });
  }

  async sendMessage(message: string, context?: Record<string, unknown>): Promise<GeminiResponse> {
    this.startTime = Date.now();

    try {
      // Add context if provided
      let fullMessage = message;
      if (context) {
        fullMessage = `Context: ${JSON.stringify(context)}\n\nUser: ${message}`;
      }

      const result = await this.chat.sendMessage(fullMessage);
      const response = await result.response;
      const text = response.text();

      const processingTime = Date.now() - this.startTime;

      return {
        content: text,
        processingTime,
        // Note: Token counting is not directly available in Gemini API
        // This is an estimation based on character count
        tokensUsed: Math.ceil((message.length + text.length) / 4)
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error('Failed to get AI response');
    }
  }

  async evaluateResponse(
    userInput: string,
    expectedOutcome: string,
    rubricCriteria?: string[]
  ): Promise<{
    score: number;
    feedback: string;
    suggestions: string[];
  }> {
    const evaluationPrompt = `
Evaluate the following user response based on the expected outcome and criteria:

User Response: "${userInput}"
Expected Outcome: "${expectedOutcome}"
${rubricCriteria ? `Evaluation Criteria: ${rubricCriteria.join(', ')}` : ''}

Please provide:
1. A score from 0-100
2. Constructive feedback
3. Specific suggestions for improvement

Format your response as JSON with keys: score, feedback, suggestions (array)
`;

    try {
      const response = await this.sendMessage(evaluationPrompt);
      
      // Parse JSON response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const evaluation = JSON.parse(jsonMatch[0]);
        return {
          score: evaluation.score || 0,
          feedback: evaluation.feedback || '',
          suggestions: evaluation.suggestions || []
        };
      }

      // Fallback if JSON parsing fails
      return {
        score: 70,
        feedback: 'Good effort. Continue practicing.',
        suggestions: ['Review the task requirements', 'Consider different approaches']
      };
    } catch (error) {
      console.error('Evaluation error:', error);
      return {
        score: 0,
        feedback: 'Unable to evaluate response',
        suggestions: []
      };
    }
  }

  // Get chat history for session recovery
  getChatHistory(): Array<{ role: string; content: string }> {
    return this.chat._history.map(item => ({
      role: item.role,
      content: item.parts[0].text || ''
    }));
  }

  // Reset chat session
  resetChat(systemPrompt?: string) {
    const prompt = systemPrompt || this.chat._history[0].parts[0].text;
    this.chat = this.model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
        {
          role: 'model',
          parts: [{ text: 'Understood. I will act according to the given instructions.' }],
        },
      ],
    });
  }
}

// Factory function to create Gemini service for PBL modules
export function createPBLGeminiService(
  aiModule: AIModule,
  stageContext: {
    stageName: string;
    stageType: string;
    taskTitle: string;
    taskInstructions: string[];
  }
): GeminiService {
  const systemPrompt = `
You are ${aiModule.persona || 'an AI assistant'} helping with a Problem-Based Learning scenario.

Current Stage: ${stageContext.stageName} (${stageContext.stageType})
Current Task: ${stageContext.taskTitle}

Task Instructions:
${stageContext.taskInstructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}

Your role is to:
- Guide the learner through the task
- Provide helpful feedback and suggestions
- Ask probing questions to deepen understanding
- Encourage critical thinking
- Stay in character as ${aiModule.persona || 'a helpful assistant'}

Remember to be supportive, educational, and adapt to the learner's level.
`;

  return new GeminiService({
    model: aiModule.model,
    systemPrompt,
    temperature: 0.7,
    maxOutputTokens: 1024,
  });
}

// Convert Gemini response to PBL conversation turn
export function geminiResponseToConversation(
  response: GeminiResponse,
  sessionId: string,
  stageId: string
): ConversationTurn & { processLog: ProcessLog } {
  const timestamp = new Date();
  
  const conversation: ConversationTurn = {
    id: `ai-${timestamp.getTime()}`,
    timestamp,
    role: 'ai',
    content: response.content,
    metadata: {
      processingTime: response.processingTime,
      tokensUsed: response.tokensUsed
    }
  };

  const processLog: ProcessLog = {
    id: `log-${timestamp.getTime()}`,
    timestamp,
    sessionId,
    stageId,
    actionType: 'interaction',
    detail: {
      aiInteraction: {
        model: 'gemini-pro',
        prompt: '', // Will be filled by caller
        response: response.content,
        tokensUsed: response.tokensUsed || 0
      },
      timeSpent: response.processingTime / 1000 // Convert to seconds
    }
  };

  return { ...conversation, processLog };
}