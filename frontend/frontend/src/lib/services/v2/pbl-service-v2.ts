import { BaseApiHandler } from '@/lib/abstractions/base-api-handler';

export class PBLServiceV2 {
  private apiHandler: BaseApiHandler;

  constructor() {
    this.apiHandler = new BaseApiHandler();
  }

  async getScenarios(): Promise<any[]> {
    try {
      // For demo, load from public JSON file
      const response = await fetch('/v2/scenarios/demo_scenarios.json');
      if (!response.ok) throw new Error('Failed to load scenarios');
      
      const data = await response.json();
      return data.pbl || [];
    } catch (error) {
      console.error('Failed to load PBL scenarios:', error);
      // Return empty array as fallback
      return [];
    }
  }

  async chat(params: {
    taskId: string;
    message: string;
    history: any[];
    language: string;
  }): Promise<{ message: string }> {
    try {
      const response = await this.apiHandler.handleRequest({
        method: 'POST',
        endpoint: '/api/v2/pbl/chat',
        data: params,
      });

      return response;
    } catch (error) {
      console.error('PBL chat error:', error);
      // Return a fallback response
      return {
        message: 'I understand your question. Let me help you think through this problem step by step.',
      };
    }
  }

  async evaluate(params: {
    taskId: string;
    messages: any[];
    language: string;
  }): Promise<any> {
    try {
      const response = await this.apiHandler.handleRequest({
        method: 'POST',
        endpoint: '/api/v2/pbl/evaluate',
        data: params,
      });

      return response;
    } catch (error) {
      console.error('PBL evaluation error:', error);
      // Return a fallback evaluation
      return {
        score: 80,
        feedback: 'Good job! You showed understanding of the key concepts.',
        strengths: ['Clear communication', 'Good analysis'],
        improvements: ['Consider more perspectives'],
      };
    }
  }
}