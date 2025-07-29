/**
 * Tests for PBL chat route with service layer integration
 * Following TDD approach
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { learningServiceFactory } from '@/lib/services/learning-service-factory';

jest.mock('@/lib/services/learning-service-factory');

describe('POST /api/pbl/chat', () => {
  const mockProgramId = 'prog-123';
  const mockTaskId = 'task-123';
  
  const mockTaskResult = {
    taskId: mockTaskId,
    success: true,
    score: 0,
    feedback: "That's a good observation! Let me help you explore this problem further.",
    nextTaskAvailable: false,
    metadata: {
      aiResponse: {
        message: "That's a good observation!",
        hints: ["Consider the stakeholders"],
        nextSteps: ["Research similar solutions"]
      },
      isComplete: false
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Using new service layer', () => {
    it('should use PBLLearningService to submit response', async () => {
      // Arrange
      const mockPBLService = {
        submitResponse: jest.fn().mockResolvedValue(mockTaskResult)
      };
      
      (learningServiceFactory.getService as jest.Mock).mockReturnValue(mockPBLService);

      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          programId: mockProgramId,
          taskId: mockTaskId,
          message: 'I think we should consider the environmental impact',
          language: 'en'
        })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(learningServiceFactory.getService).toHaveBeenCalledWith('pbl');
      expect(mockPBLService.submitResponse).toHaveBeenCalledWith(
        mockProgramId,
        mockTaskId,
        {
          message: 'I think we should consider the environmental impact',
          language: 'en'
        }
      );
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.aiResponse).toBeDefined();
    });

    it('should validate required fields', async () => {
      // Arrange
      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Missing required fields
          message: 'Test message'
        })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should handle service errors', async () => {
      // Arrange
      const mockPBLService = {
        submitResponse: jest.fn().mockRejectedValue(new Error('AI service unavailable'))
      };
      
      (learningServiceFactory.getService as jest.Mock).mockReturnValue(mockPBLService);

      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          programId: mockProgramId,
          taskId: mockTaskId,
          message: 'Test message',
          language: 'en'
        })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toContain('AI service unavailable');
    });

    it('should return AI response in correct format', async () => {
      // Arrange
      const mockPBLService = {
        submitResponse: jest.fn().mockResolvedValue(mockTaskResult)
      };
      
      (learningServiceFactory.getService as jest.Mock).mockReturnValue(mockPBLService);

      const request = new NextRequest('http://localhost/api/pbl/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          programId: mockProgramId,
          taskId: mockTaskId,
          message: 'Test message',
          language: 'en'
        })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(data.aiResponse).toEqual({
        message: "That's a good observation!",
        hints: ["Consider the stakeholders"],
        nextSteps: ["Research similar solutions"]
      });
      expect(data.isTaskComplete).toBe(false);
    });
  });
});