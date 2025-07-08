import { BaseApiHandler } from '@/lib/abstractions/base-api-handler';

export class DiscoveryServiceV2 {
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
      return data.discovery || [];
    } catch (error) {
      console.error('Failed to load Discovery scenarios:', error);
      return [];
    }
  }

  async explore(params: {
    taskId: string;
    query: string;
    history: any[];
    language: string;
  }): Promise<{ message: string }> {
    try {
      const response = await this.apiHandler.handleRequest({
        method: 'POST',
        endpoint: '/api/v2/discovery/explore',
        data: params,
      });

      return response;
    } catch (error) {
      console.error('Discovery explore error:', error);
      // Return a fallback response
      return {
        message: 'That\'s an interesting exploration! Let me share some insights about what you\'ve discovered.',
      };
    }
  }

  async summarize(params: {
    taskId: string;
    explorations: any[];
    language: string;
  }): Promise<any> {
    try {
      const response = await this.apiHandler.handleRequest({
        method: 'POST',
        endpoint: '/api/v2/discovery/summarize',
        data: params,
      });

      return response;
    } catch (error) {
      console.error('Discovery summarize error:', error);
      // Return a fallback summary
      return {
        summary: 'You explored various aspects of the topic and showed good curiosity.',
        keyInsights: ['Explored multiple angles', 'Asked thoughtful questions'],
        learningOutcomes: ['Better understanding of AI capabilities'],
      };
    }
  }
}