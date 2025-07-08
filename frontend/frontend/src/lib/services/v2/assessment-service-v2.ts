import { BaseApiHandler } from '@/lib/abstractions/base-api-handler';

export class AssessmentServiceV2 {
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
      return data.assessment || [];
    } catch (error) {
      console.error('Failed to load Assessment scenarios:', error);
      return [];
    }
  }

  async evaluate(params: {
    taskId: string;
    answer: string;
    language: string;
  }): Promise<{ correct: boolean; feedback: string }> {
    try {
      const response = await this.apiHandler.handleRequest({
        method: 'POST',
        endpoint: '/api/v2/assessment/evaluate',
        data: params,
      });

      return response;
    } catch (error) {
      console.error('Assessment evaluate error:', error);
      
      // For demo, check if answer is correct based on demo data
      // In production, this would be handled by the backend
      const isCorrect = params.answer === 'option_b'; // Demo correct answer
      
      return {
        correct: isCorrect,
        feedback: isCorrect 
          ? 'Correct! Machine learning is indeed a method where computers learn from data without explicit programming.'
          : 'Not quite. Machine learning specifically refers to computers learning from data patterns.',
      };
    }
  }

  async getProgress(userId: string): Promise<any> {
    try {
      const response = await this.apiHandler.handleRequest({
        method: 'GET',
        endpoint: `/api/v2/assessment/progress/${userId}`,
      });

      return response;
    } catch (error) {
      console.error('Assessment progress error:', error);
      return {
        completed: 0,
        total: 0,
        scores: [],
      };
    }
  }
}