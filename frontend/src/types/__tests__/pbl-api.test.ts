/**
 * Unit tests for PBL API types
 * Tests all interfaces, types and API request/response structures
 */

import * as PBLApiTypes from '../pbl-api';
import type {
  ChatRequest,
  ChatMessage,
  ChatResponse,
  EvaluateRequest,
  EvaluateResponse,
  GenerateFeedbackRequest,
  GenerateFeedbackResponse,
  ScenarioListResponse,
  ScenarioDetailResponse,
  ProgramResponse,
  TaskLogRequest,
  TaskLogResponse,
  HistoryResponse
} from '../pbl-api';

describe('PBL API Types', () => {
  describe('ChatMessage interface', () => {
    it('should define user message structure', () => {
      const userMessage: ChatMessage = {
        role: 'user',
        content: 'What are the ethical implications of AI?',
        timestamp: '2024-01-01T12:00:00Z'
      };

      expect(userMessage.role).toBe('user');
      expect(userMessage.content).toBe('What are the ethical implications of AI?');
      expect(userMessage.timestamp).toBe('2024-01-01T12:00:00Z');
    });

    it('should define assistant message structure', () => {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: 'AI ethics involves considerations of fairness, transparency, and accountability.',
        timestamp: '2024-01-01T12:00:30Z'
      };

      expect(assistantMessage.role).toBe('assistant');
      expect(assistantMessage.content).toContain('ethics');
      expect(assistantMessage.timestamp).toBeDefined();
    });

    it('should define system message structure', () => {
      const systemMessage: ChatMessage = {
        role: 'system',
        content: 'You are an AI tutor helping with PBL scenarios.'
      };

      expect(systemMessage.role).toBe('system');
      expect(systemMessage.content).toContain('tutor');
      expect(systemMessage.timestamp).toBeUndefined();
    });

    it('should allow messages without timestamp', () => {
      const messageWithoutTimestamp: ChatMessage = {
        role: 'user',
        content: 'Hello, AI!'
      };

      expect(messageWithoutTimestamp.role).toBe('user');
      expect(messageWithoutTimestamp.timestamp).toBeUndefined();
    });
  });

  describe('ChatRequest interface', () => {
    it('should define complete chat request structure', () => {
      const mockScenario = {
        id: 'scenario-123',
        title: 'AI Ethics Scenario'
      } as any;

      const mockProgram = {
        id: 'program-456',
        userId: 'user-789'
      } as any;

      const mockTask = {
        id: 'task-101',
        title: 'Ethical Analysis'
      } as any;

      const chatRequest: ChatRequest = {
        messages: [
          { role: 'user', content: 'What should I consider?' },
          { role: 'assistant', content: 'Consider the stakeholders...' }
        ],
        scenario: mockScenario,
        program: mockProgram,
        task: mockTask,
        language: 'en'
      };

      expect(chatRequest.messages).toHaveLength(2);
      expect(chatRequest.scenario.id).toBe('scenario-123');
      expect(chatRequest.program.id).toBe('program-456');
      expect(chatRequest.task.id).toBe('task-101');
      expect(chatRequest.language).toBe('en');
    });

    it('should allow optional language field', () => {
      const minimalRequest: ChatRequest = {
        messages: [{ role: 'user', content: 'Test message' }],
        scenario: {} as any,
        program: {} as any,
        task: {} as any
      };

      expect(minimalRequest.messages).toHaveLength(1);
      expect(minimalRequest.language).toBeUndefined();
    });
  });

  describe('ChatResponse interface', () => {
    it('should define chat response structure', () => {
      const response: ChatResponse = {
        response: 'Based on the scenario, you should consider...',
        suggestions: [
          'Analyze the stakeholder impact',
          'Review ethical frameworks',
          'Consider long-term consequences'
        ]
      };

      expect(response.response).toContain('scenario');
      expect(response.suggestions).toHaveLength(3);
      expect(response.suggestions?.[0]).toContain('stakeholder');
    });

    it('should allow response without suggestions', () => {
      const simpleResponse: ChatResponse = {
        response: 'Thank you for your question.'
      };

      expect(simpleResponse.response).toBe('Thank you for your question.');
      expect(simpleResponse.suggestions).toBeUndefined();
    });
  });

  describe('EvaluateRequest interface', () => {
    it('should define evaluation request structure', () => {
      const evaluateRequest: EvaluateRequest = {
        taskId: 'task-123',
        programId: 'program-456',
        scenarioId: 'scenario-789',
        responses: {
          question1: 'My analysis of the ethical implications...',
          question2: 'The stakeholders affected include...',
          reflection: 'I learned that AI ethics requires...'
        },
        language: 'en'
      };

      expect(evaluateRequest.taskId).toBe('task-123');
      expect(evaluateRequest.programId).toBe('program-456');
      expect(evaluateRequest.scenarioId).toBe('scenario-789');
      expect(evaluateRequest.responses).toHaveProperty('question1');
      expect(evaluateRequest.language).toBe('en');
    });

    it('should allow optional language field', () => {
      const requestWithoutLanguage: EvaluateRequest = {
        taskId: 'task-123',
        programId: 'program-456',
        scenarioId: 'scenario-789',
        responses: { answer: 'test response' }
      };

      expect(requestWithoutLanguage.taskId).toBe('task-123');
      expect(requestWithoutLanguage.language).toBeUndefined();
    });

    it('should handle various response types', () => {
      const complexRequest: EvaluateRequest = {
        taskId: 'task-123',
        programId: 'program-456',
        scenarioId: 'scenario-789',
        responses: {
          textResponse: 'Written analysis',
          numericScore: 85,
          booleanChoice: true,
          arraySelection: ['option1', 'option3'],
          objectData: { category: 'ethics', priority: 'high' }
        }
      };

      expect(typeof complexRequest.responses.textResponse).toBe('string');
      expect(typeof complexRequest.responses.numericScore).toBe('number');
      expect(typeof complexRequest.responses.booleanChoice).toBe('boolean');
      expect(Array.isArray(complexRequest.responses.arraySelection)).toBe(true);
      expect(typeof complexRequest.responses.objectData).toBe('object');
    });
  });

  describe('EvaluateResponse interface', () => {
    it('should define evaluation response structure', () => {
      const evaluateResponse: EvaluateResponse = {
        evaluation: {
          score: 85,
          feedback: 'Excellent analysis of ethical considerations.',
          strengths: [
            'Clear identification of stakeholders',
            'Thoughtful consideration of consequences'
          ],
          improvements: [
            'Could explore more ethical frameworks',
            'Consider additional edge cases'
          ]
        },
        ksaMapping: {
          'K1.1': 90,
          'S2.3': 80,
          'A1.2': 85
        }
      };

      expect(evaluateResponse.evaluation.score).toBe(85);
      expect(evaluateResponse.evaluation.strengths).toHaveLength(2);
      expect(evaluateResponse.evaluation.improvements).toHaveLength(2);
      expect(evaluateResponse.ksaMapping?.['K1.1']).toBe(90);
    });

    it('should allow optional ksaMapping', () => {
      const responseWithoutKSA: EvaluateResponse = {
        evaluation: {
          score: 75,
          feedback: 'Good work on this task.',
          strengths: ['Clear thinking'],
          improvements: ['More detail needed']
        }
      };

      expect(responseWithoutKSA.evaluation.score).toBe(75);
      expect(responseWithoutKSA.ksaMapping).toBeUndefined();
    });
  });

  describe('GenerateFeedbackRequest interface', () => {
    it('should define feedback generation request structure', () => {
      const feedbackRequest: GenerateFeedbackRequest = {
        scenarioId: 'scenario-123',
        programId: 'program-456',
        language: 'zh',
        evaluations: [
          { taskId: 'task-1', score: 85, feedback: 'Good analysis' },
          { taskId: 'task-2', score: 78, feedback: 'Needs more depth' }
        ]
      };

      expect(feedbackRequest.scenarioId).toBe('scenario-123');
      expect(feedbackRequest.programId).toBe('program-456');
      expect(feedbackRequest.language).toBe('zh');
      expect(feedbackRequest.evaluations).toHaveLength(2);
      expect(feedbackRequest.evaluations?.[0].score).toBe(85);
    });

    it('should allow minimal request without evaluations', () => {
      const minimalRequest: GenerateFeedbackRequest = {
        scenarioId: 'scenario-123',
        programId: 'program-456'
      };

      expect(minimalRequest.scenarioId).toBe('scenario-123');
      expect(minimalRequest.language).toBeUndefined();
      expect(minimalRequest.evaluations).toBeUndefined();
    });
  });

  describe('GenerateFeedbackResponse interface', () => {
    it('should define feedback response structure', () => {
      const feedbackResponse: GenerateFeedbackResponse = {
        feedback: {
          summary: 'Overall, you demonstrated strong analytical skills.',
          strengths: [
            'Comprehensive stakeholder analysis',
            'Clear ethical reasoning'
          ],
          improvements: [
            'Consider more diverse perspectives',
            'Provide more concrete examples'
          ],
          nextSteps: [
            'Practice with more complex scenarios',
            'Study additional ethical frameworks'
          ]
        }
      };

      expect(feedbackResponse.feedback.summary).toContain('analytical');
      expect(feedbackResponse.feedback.strengths).toHaveLength(2);
      expect(feedbackResponse.feedback.improvements).toHaveLength(2);
      expect(feedbackResponse.feedback.nextSteps).toHaveLength(2);
    });
  });

  describe('ScenarioListResponse interface', () => {
    it('should define scenario list response structure', () => {
      const scenarioList: ScenarioListResponse = {
        scenarios: [
          { id: 'scenario-1', title: 'AI Ethics' } as any,
          { id: 'scenario-2', title: 'Data Privacy' } as any
        ],
        total: 2
      };

      expect(scenarioList.scenarios).toHaveLength(2);
      expect(scenarioList.total).toBe(2);
      expect(scenarioList.scenarios[0].id).toBe('scenario-1');
    });

    it('should handle empty scenario list', () => {
      const emptyList: ScenarioListResponse = {
        scenarios: [],
        total: 0
      };

      expect(emptyList.scenarios).toHaveLength(0);
      expect(emptyList.total).toBe(0);
    });
  });

  describe('ScenarioDetailResponse interface', () => {
    it('should define scenario detail response structure', () => {
      const scenarioDetail: ScenarioDetailResponse = {
        scenario: {
          id: 'scenario-123',
          title: 'AI Ethics Scenario'
        } as any,
        userProgress: {
          completedPrograms: ['program-1', 'program-2'],
          currentProgramId: 'program-3'
        }
      };

      expect(scenarioDetail.scenario.id).toBe('scenario-123');
      expect(scenarioDetail.userProgress?.completedPrograms).toHaveLength(2);
      expect(scenarioDetail.userProgress?.currentProgramId).toBe('program-3');
    });

    it('should allow response without user progress', () => {
      const detailWithoutProgress: ScenarioDetailResponse = {
        scenario: { id: 'scenario-456', title: 'Test Scenario' } as any
      };

      expect(detailWithoutProgress.scenario.id).toBe('scenario-456');
      expect(detailWithoutProgress.userProgress).toBeUndefined();
    });
  });

  describe('ProgramResponse interface', () => {
    it('should define program response structure', () => {
      const programResponse: ProgramResponse = {
        program: {
          id: 'program-123',
          scenarioId: 'scenario-456'
        } as any,
        progress: {
          completedTasks: ['task-1', 'task-2'],
          currentTaskId: 'task-3'
        }
      };

      expect(programResponse.program.id).toBe('program-123');
      expect(programResponse.progress.completedTasks).toHaveLength(2);
      expect(programResponse.progress.currentTaskId).toBe('task-3');
    });

    it('should handle progress without current task', () => {
      const responseWithoutCurrent: ProgramResponse = {
        program: { id: 'program-123' } as any,
        progress: {
          completedTasks: ['task-1', 'task-2', 'task-3']
        }
      };

      expect(responseWithoutCurrent.program.id).toBe('program-123');
      expect(responseWithoutCurrent.progress.completedTasks).toHaveLength(3);
      expect(responseWithoutCurrent.progress.currentTaskId).toBeUndefined();
    });
  });

  describe('TaskLogRequest interface', () => {
    it('should define task log request structure', () => {
      const logRequest: TaskLogRequest = {
        programId: 'program-123',
        taskId: 'task-456',
        action: 'interaction',
        data: {
          type: 'user_input',
          content: 'My response to the task',
          timestamp: '2024-01-01T12:00:00Z'
        }
      };

      expect(logRequest.programId).toBe('program-123');
      expect(logRequest.taskId).toBe('task-456');
      expect(logRequest.action).toBe('interaction');
      expect(logRequest.data?.type).toBe('user_input');
    });

    it('should allow request without data', () => {
      const minimalRequest: TaskLogRequest = {
        programId: 'program-123',
        taskId: 'task-456',
        action: 'start_task'
      };

      expect(minimalRequest.programId).toBe('program-123');
      expect(minimalRequest.data).toBeUndefined();
    });
  });

  describe('TaskLogResponse interface', () => {
    it('should define successful log response', () => {
      const successResponse: TaskLogResponse = {
        success: true,
        logId: 'log-789'
      };

      expect(successResponse.success).toBe(true);
      expect(successResponse.logId).toBe('log-789');
    });

    it('should define failed log response', () => {
      const failureResponse: TaskLogResponse = {
        success: false
      };

      expect(failureResponse.success).toBe(false);
      expect(failureResponse.logId).toBeUndefined();
    });
  });

  describe('HistoryResponse interface', () => {
    it('should define history response structure', () => {
      const historyResponse: HistoryResponse = {
        scenarios: [
          {
            scenario: { id: 'scenario-1', title: 'Ethics' } as any,
            completedPrograms: 2,
            totalPrograms: 3,
            lastActivity: '2024-01-01T12:00:00Z'
          },
          {
            scenario: { id: 'scenario-2', title: 'Privacy' } as any,
            completedPrograms: 1,
            totalPrograms: 1,
            lastActivity: '2024-01-02T12:00:00Z'
          }
        ]
      };

      expect(historyResponse.scenarios).toHaveLength(2);
      expect(historyResponse.scenarios[0].completedPrograms).toBe(2);
      expect(historyResponse.scenarios[0].totalPrograms).toBe(3);
      expect(historyResponse.scenarios[1].completedPrograms).toBe(1);
      expect(historyResponse.scenarios[1].totalPrograms).toBe(1);
    });

    it('should handle empty history', () => {
      const emptyHistory: HistoryResponse = {
        scenarios: []
      };

      expect(emptyHistory.scenarios).toHaveLength(0);
    });
  });

  describe('Type exports', () => {
    it('should export all expected types', () => {
      // Verify that all types are properly exported
      expect(typeof PBLApiTypes).toBe('object');
      
      // Test type constructor functions work (validates type existence)
      const chatMessage = {} as ChatMessage;
      const chatRequest = {} as ChatRequest;
      const chatResponse = {} as ChatResponse;
      const evaluateRequest = {} as EvaluateRequest;
      const evaluateResponse = {} as EvaluateResponse;
      const feedbackRequest = {} as GenerateFeedbackRequest;
      const feedbackResponse = {} as GenerateFeedbackResponse;
      const scenarioList = {} as ScenarioListResponse;
      const scenarioDetail = {} as ScenarioDetailResponse;
      const programResponse = {} as ProgramResponse;
      const taskLogRequest = {} as TaskLogRequest;
      const taskLogResponse = {} as TaskLogResponse;
      const historyResponse = {} as HistoryResponse;

      // If types are properly defined, these should not throw
      expect(chatMessage).toBeDefined();
      expect(chatRequest).toBeDefined();
      expect(chatResponse).toBeDefined();
      expect(evaluateRequest).toBeDefined();
      expect(evaluateResponse).toBeDefined();
      expect(feedbackRequest).toBeDefined();
      expect(feedbackResponse).toBeDefined();
      expect(scenarioList).toBeDefined();
      expect(scenarioDetail).toBeDefined();
      expect(programResponse).toBeDefined();
      expect(taskLogRequest).toBeDefined();
      expect(taskLogResponse).toBeDefined();
      expect(historyResponse).toBeDefined();
    });
  });
});