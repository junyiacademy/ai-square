import { GoogleAuth } from 'google-auth-library';
import { VertexAI } from '@google-cloud/vertexai';
import { AIModule, ConversationTurn, ProcessLog } from '@/types/pbl';
import path from 'path';

export interface VertexAIConfig {
  model?: string;
  systemPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
}

export interface VertexAIResponse {
  content: string;
  tokensUsed?: number;
  processingTime: number;
}

// Vertex AI configuration - read at runtime not module load time
export class VertexAIService {
  private auth: GoogleAuth;
  private model: string;
  private chatHistory: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  private config: VertexAIConfig;
  private startTime: number = 0;
  private projectId: string;
  private location: string;

  constructor(config: VertexAIConfig) {
    this.config = config;
    this.model = config.model || 'gemini-2.5-flash';
    // Read environment variables at construction time, not module load time
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || '';
    this.location = process.env.VERTEX_AI_LOCATION || 'us-central1';
    
    if (!this.projectId && process.env.NODE_ENV !== 'test') {
      throw new Error('GOOGLE_CLOUD_PROJECT environment variable is required');
    }
    
    // Initialize Google Auth with service account
    const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                       path.join(process.cwd(), 'ai-square-key.json');
    
    this.auth = new GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
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
    // In test environment, return mock token
    if (process.env.NODE_ENV === 'test') {
      return 'mock-token';
    }
    
    const client = await this.auth.getClient();
    const accessToken = await client.getAccessToken();
    
    if (!accessToken.token) {
      throw new Error('Failed to get access token');
    }
    
    return accessToken.token;
  }

  private async makeRequest(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    // In test environment, return mock response (check this first)
    if (process.env.NODE_ENV === 'test') {
      return {
        candidates: [{
          content: {
            parts: [{
              text: 'Mock AI response',
            }],
          },
        }],
      };
    }
    
    // 確保在服務器端執行
    if (typeof window !== 'undefined') {
      throw new Error('Vertex AI service must only run on server side');
    }
    
    const token = await this.getAccessToken();
    const url = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.model}:generateContent`;
    
    // Add timeout support with AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25 second timeout
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.text();
        // 不要在錯誤訊息中洩露敏感資訊
        console.error('Vertex AI request failed:', { status: response.status, projectId: this.projectId });
        throw new Error(`Vertex AI error: ${response.status} - ${error}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeout);
      if ((error as Error).name === 'AbortError') {
        throw new Error('Vertex AI request timed out after 25 seconds');
      }
      throw error;
    }
  }

  async sendMessage(message: string, context?: Record<string, unknown>): Promise<VertexAIResponse> {
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
          maxOutputTokens: this.config.maxOutputTokens || 4096,
        }
      };

      // Make API request
      const response = await this.makeRequest(requestBody);

      // Extract response text
      const candidates = response.candidates as Array<{
        content?: { parts?: Array<{ text?: string }> }
      }> | undefined;
      const aiResponse = candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (!aiResponse) {
        console.error('Vertex AI response structure:', JSON.stringify(response, null, 2));
        console.error('Candidates:', response.candidates);
        throw new Error(`No response from Vertex AI. Response structure: ${JSON.stringify(response)}`);
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
        tokensUsed: (response.usageMetadata as { totalTokenCount?: number } | undefined)?.totalTokenCount || 
                   Math.ceil((message.length + aiResponse.length) / 4)
      };
    } catch (error) {
      console.error('Vertex AI error:', error);
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
          feedback: evaluation.feedbackText || '',
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

// Factory function to create Vertex AI service for PBL modules
export function createPBLVertexAIService(
  aiModule: AIModule,
  stageContext: {
    stageName: string;
    stageType: string;
    taskTitle: string;
    taskInstructions: string[];
  },
  language: string = 'en'
): VertexAIService {
  const languageInstruction = language === 'zhTW' 
    ? 'IMPORTANT: Always respond in Traditional Chinese (繁體中文). Do not mix languages.'
    : 'IMPORTANT: Always respond in English only. Do not mix languages.';

  const systemPrompt = `
You are ${aiModule.persona || 'an AI assistant'} helping with a Problem-Based Learning scenario.

${languageInstruction}

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

  return new VertexAIService({
    model: aiModule.model,
    systemPrompt,
    temperature: 0.7,
    maxOutputTokens: 4096, // 增加到 4096 以支援更詳細的回應
  });
}

// Convert Vertex AI response to PBL conversation turn
export function vertexAIResponseToConversation(
  response: VertexAIResponse,
  sessionId: string,
  stageId: string,
  taskId?: string
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
      timeSpent: response.processingTime / 1000, // Convert to seconds
      taskId // Include task ID if provided
    }
  };

  return { ...conversation, processLog };
}

// Get VertexAI client instance
export function getVertexAI(): VertexAI {
  return new VertexAI({
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
  });
}