/**
 * Gemini AI Service Implementation
 * 基於 BaseAIService 的 Google Gemini 實作
 */

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { 
  BaseAIService, 
  AIServiceOptions, 
  AIResponse, 
  ChatMessage 
} from '@/lib/abstractions/base-ai-service';

export class GeminiAIServiceImpl extends BaseAIService {
  protected readonly serviceName = 'GeminiAI';
  protected readonly defaultModel = 'gemini-1.5-flash';
  
  private genAI: GoogleGenerativeAI;
  private models: Map<string, GenerativeModel> = new Map();

  constructor(apiKey?: string) {
    super();
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('Gemini API key is required');
    }
    this.genAI = new GoogleGenerativeAI(key);
  }

  private getModel(modelName?: string): GenerativeModel {
    const name = modelName || this.defaultModel;
    
    if (!this.models.has(name)) {
      this.models.set(name, this.genAI.getGenerativeModel({ model: name }));
    }
    
    return this.models.get(name)!;
  }

  protected async callTextGeneration(
    prompt: string,
    options: AIServiceOptions
  ): Promise<AIResponse<string>> {
    try {
      const model = this.getModel(options.model);
      
      const generationConfig = {
        temperature: options.temperature,
        topK: options.topK,
        topP: options.topP,
        maxOutputTokens: options.maxTokens,
      };

      const result = await this.withTimeout(
        model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig,
        }),
        options.timeout || this.defaultOptions.timeout!
      );

      const response = await result.response;
      const text = response.text();
      
      // 計算 token 使用量（Gemini 不直接提供，需要估算）
      const promptTokens = this.estimateTokens(prompt);
      const completionTokens = this.estimateTokens(text);
      const totalTokens = promptTokens + completionTokens;

      return {
        success: true,
        data: text,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCost: this.estimateCost(totalTokens, options.model || this.defaultModel)
        },
        metadata: {
          model: options.model || this.defaultModel,
          processingTime: 0 // 將由基類填充
        }
      };
    } catch (error) {
      return this.handleError(error, 'callTextGeneration');
    }
  }

  protected async callChatCompletion(
    messages: ChatMessage[],
    options: AIServiceOptions
  ): Promise<AIResponse<string>> {
    try {
      const model = this.getModel(options.model);
      
      // 轉換訊息格式
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const generationConfig = {
        temperature: options.temperature,
        topK: options.topK,
        topP: options.topP,
        maxOutputTokens: options.maxTokens,
      };

      const chat = model.startChat({
        generationConfig,
        history: contents.slice(0, -1), // 除了最後一個訊息外的所有訊息作為歷史
      });

      const lastMessage = messages[messages.length - 1];
      const result = await this.withTimeout(
        chat.sendMessage(lastMessage.content),
        options.timeout || this.defaultOptions.timeout!
      );

      const response = await result.response;
      const text = response.text();
      
      // 估算 token 使用量
      const promptTokens = messages.reduce((sum, msg) => sum + this.estimateTokens(msg.content), 0);
      const completionTokens = this.estimateTokens(text);
      const totalTokens = promptTokens + completionTokens;

      return {
        success: true,
        data: text,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCost: this.estimateCost(totalTokens, options.model || this.defaultModel)
        },
        metadata: {
          model: options.model || this.defaultModel,
          processingTime: 0
        }
      };
    } catch (error) {
      return this.handleError(error, 'callChatCompletion');
    }
  }

  protected async callStructuredGeneration<T>(
    prompt: string,
    schema: unknown,
    options: AIServiceOptions
  ): Promise<AIResponse<T>> {
    try {
      // Gemini 1.5 支援 JSON 模式
      const model = this.getModel(options.model || 'gemini-1.5-pro');
      
      const enhancedPrompt = `${prompt}\n\nPlease respond with valid JSON that matches this schema:\n${JSON.stringify(schema, null, 2)}`;
      
      const generationConfig = {
        temperature: options.temperature || 0.1, // 降低溫度以獲得更一致的結構
        topK: options.topK,
        topP: options.topP,
        maxOutputTokens: options.maxTokens,
        responseMimeType: 'application/json',
      };

      const result = await this.withTimeout(
        model.generateContent({
          contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
          generationConfig,
        }),
        options.timeout || this.defaultOptions.timeout!
      );

      const response = await result.response;
      const text = response.text();
      
      // 解析 JSON
      let parsedData: T;
      try {
        parsedData = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Failed to parse JSON response: ${parseError}`);
      }

      // 計算 token 使用量
      const promptTokens = this.estimateTokens(enhancedPrompt);
      const completionTokens = this.estimateTokens(text);
      const totalTokens = promptTokens + completionTokens;

      return {
        success: true,
        data: parsedData,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
          estimatedCost: this.estimateCost(totalTokens, options.model || 'gemini-1.5-pro')
        },
        metadata: {
          model: options.model || 'gemini-1.5-pro',
          processingTime: 0
        }
      };
    } catch (error) {
      return this.handleError(error, 'callStructuredGeneration');
    }
  }

  protected async *callStreamGeneration(
    prompt: string,
    options: AIServiceOptions
  ): AsyncGenerator<string, void, unknown> {
    const model = this.getModel(options.model);
    
    const generationConfig = {
      temperature: options.temperature,
      topK: options.topK,
      topP: options.topP,
      maxOutputTokens: options.maxTokens,
    };

    const result = await model.generateContentStream({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        yield chunkText;
      }
    }
  }

  protected estimateCost(tokens: number, model: string): number {
    // Gemini pricing (approximate)
    const pricing: Record<string, number> = {
      'gemini-1.5-flash': 0.00015, // per 1K tokens
      'gemini-1.5-pro': 0.0025,    // per 1K tokens
      'gemini-pro': 0.001,         // per 1K tokens
    };
    
    const rate = pricing[model] || 0.001;
    return (tokens / 1000) * rate;
  }
}

// 建立單例
let geminiServiceInstance: GeminiAIServiceImpl | null = null;

export const getGeminiService = (): GeminiAIServiceImpl => {
  if (!geminiServiceInstance) {
    geminiServiceInstance = new GeminiAIServiceImpl();
  }
  return geminiServiceInstance;
};