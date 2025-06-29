import { GoogleAuth } from 'google-auth-library';
import { AIModule, ConversationTurn, ProcessLog } from '@/types/pbl';
import path from 'path';

export interface GeminiServerConfig {
  model?: string;
  systemPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    totalTokenCount?: number;
  };
}

export interface GeminiServerResponse {
  content: string;
  tokensUsed?: number;
  processingTime: number;
}

// Gemini API configuration
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com';
const GEMINI_API_VERSION = 'v1beta';

export class GeminiServerService {
  private auth: GoogleAuth;
  private model: string;
  private chatHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  private config: GeminiServerConfig;
  private startTime: number = 0;

  constructor(config: GeminiServerConfig) {
    this.config = config;
    this.model = config.model || 'gemini-2.5-flash';
    
    // Initialize Google Auth with service account
    const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                       path.join(process.cwd(), 'ai-square-key.json');
    
    this.auth = new GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/generative-language']
    });

    // Initialize chat with system prompt
    this.chatHistory = [
      {
        role: 'user',
        parts: [{ text: `System: ${config.systemPrompt}` }]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I will act according to the given instructions.' }]
      }
    ];
  }

  private async getAccessToken(): Promise<string> {
    const client = await this.auth.getClient();
    const accessToken = await client.getAccessToken();
    
    if (!accessToken.token) {
      throw new Error('Failed to get access token');
    }
    
    return accessToken.token;
  }

  private async makeRequest(endpoint: string, body: Record<string, unknown>): Promise<GeminiApiResponse> {
    const token = await this.getAccessToken();
    const url = `${GEMINI_API_BASE}/${GEMINI_API_VERSION}/${endpoint}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<GeminiApiResponse>;
  }

  async sendMessage(message: string, context?: Record<string, unknown>): Promise<GeminiServerResponse> {
    this.startTime = Date.now();

    try {
      // Add context if provided
      let fullMessage = message;
      if (context) {
        fullMessage = `Context: ${JSON.stringify(context)}\n\nUser: ${message}`;
      }

      // Add user message to history
      this.chatHistory.push({
        role: 'user',
        parts: [{ text: fullMessage }]
      });

      // Prepare request body
      const requestBody = {
        contents: this.chatHistory,
        generationConfig: {
          temperature: this.config.temperature || 0.7,
          topP: this.config.topP || 0.8,
          topK: this.config.topK || 40,
          maxOutputTokens: this.config.maxOutputTokens || 2048,
        }
      };

      // Make API request
      const response = await this.makeRequest(
        `models/${this.model}:generateContent`,
        requestBody
      );

      // Extract response text
      const aiResponse = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (!aiResponse) {
        throw new Error('No response from Gemini API');
      }

      // Add AI response to history
      this.chatHistory.push({
        role: 'model',
        parts: [{ text: aiResponse }]
      });

      const processingTime = Date.now() - this.startTime;

      return {
        content: aiResponse,
        processingTime,
        // Token usage from API response if available
        tokensUsed: response.usageMetadata?.totalTokenCount || 
                   Math.ceil((message.length + aiResponse.length) / 4)
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
    return this.chatHistory.map(item => ({
      role: item.role,
      content: item.parts[0].text || ''
    }));
  }

  // Reset chat session
  resetChat(systemPrompt?: string) {
    const prompt = systemPrompt || this.chatHistory[0].parts[0].text;
    this.chatHistory = [
      {
        role: 'user',
        parts: [{ text: prompt }]
      },
      {
        role: 'model',
        parts: [{ text: 'Understood. I will act according to the given instructions.' }]
      }
    ];
  }
}

// Factory function to create Gemini service for PBL modules
export function createPBLGeminiServerService(
  aiModule: AIModule,
  stageContext: {
    stageName: string;
    stageType: string;
    taskTitle: string;
    taskInstructions: string[];
  }
): GeminiServerService {
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

  return new GeminiServerService({
    model: aiModule.model,
    systemPrompt,
    temperature: 0.7,
    maxOutputTokens: 1024,
  });
}

// Convert Gemini response to PBL conversation turn
export function geminiServerResponseToConversation(
  response: GeminiServerResponse,
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
        model: 'gemini-2.5-flash',
        prompt: '', // Will be filled by caller
        response: response.content,
        tokensUsed: response.tokensUsed || 0
      },
      timeSpent: response.processingTime / 1000 // Convert to seconds
    }
  };

  return { ...conversation, processLog };
}