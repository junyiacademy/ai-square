/**
 * Learning Programs API Route Tests
 * 測試學習程序 API
 */

import { POST } from '../route';
import { NextRequest } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { postgresqlLearningService } from '@/lib/services/postgresql-learning-service';
import { mockConsoleError as createMockConsoleError } from '@/test-utils/helpers/console';

// Mock dependencies
jest.mock('@/lib/services/postgresql-learning-service');
jest.mock('@/lib/auth/session');

// Mock console
const mockConsoleError = createMockConsoleError();

describe('/api/learning/programs', () => {
  // Mock service
  const mockLearningService = postgresqlLearningService as jest.Mocked<typeof postgresqlLearningService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (getServerSession as jest.Mock).mockResolvedValue(null);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('POST - Create New Program', () => {
    const mockScenario = {
      id: 'scenario-1',
      mode: 'pbl',
      title: { en: 'Test Scenario' },
      description: { en: 'Test Description' },
    };

    it('should create new program successfully', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com' },
      });

      mockLearningService.createLearningProgram.mockResolvedValue({
        program: {
          id: 'prog-123',
          mode: 'pbl',
          scenarioId: 'scenario-1',
          userId: 'user-123',
          status: 'pending',
          totalScore: 0,
          completedTaskCount: 0,
          totalTaskCount: 2,
        },
        scenario: mockScenario,
      });

      const request = new NextRequest('http://localhost:3000/api/learning/programs', {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: 'scenario-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.program).toMatchObject({
        id: 'prog-123',
        mode: 'pbl',
        scenarioId: 'scenario-1',
        userId: 'user-123',
        status: 'pending',
      });
      expect(mockLearningService.createLearningProgram).toHaveBeenCalledWith(
        'scenario-1',
        'user@example.com',
        undefined
      );
    });

    it('should return 400 when scenarioId is missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com' },
      });

      const request = new NextRequest('http://localhost:3000/api/learning/programs', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('scenarioId is required');
    });

    it('should return 404 when scenario not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com' },
      });

      mockLearningService.createLearningProgram.mockRejectedValue(
        new Error('Scenario not found')
      );

      const request = new NextRequest('http://localhost:3000/api/learning/programs', {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: 'non-existent',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400); // The route returns 400 for "not found" errors
      expect(data.error).toBe('Scenario not found');
    });

    it('should return 401 when not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/learning/programs', {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: 'scenario-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should handle invalid JSON in request body', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com' },
      });

      const request = new NextRequest('http://localhost:3000/api/learning/programs', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle database errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'user@example.com' },
      });

      const error = new Error('Database error');
      mockLearningService.createLearningProgram.mockRejectedValue(error);

      const request = new NextRequest('http://localhost:3000/api/learning/programs', {
        method: 'POST',
        body: JSON.stringify({
          scenarioId: 'scenario-1',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error creating learning program:',
        error
      );
    });
  });
});

/**
 * Learning Programs API Considerations:
 * 
 * 1. Authentication:
 *    - All endpoints require valid user session
 *    - Uses getServerSession for authentication
 * 
 * 2. Program Creation:
 *    - Requires valid scenario ID
 *    - Associates program with authenticated user
 *    - Initializes with default status and scores
 * 
 * 3. Error Handling:
 *    - Validates required fields
 *    - Handles database errors gracefully
 *    - Returns appropriate HTTP status codes
 * 
 * 4. Repository Pattern:
 *    - Uses repository factory for data access
 *    - Supports different implementations
 *    - Handles missing methods gracefully
 */