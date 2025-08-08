import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../route';
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
import { 
  createAuthenticatedRequestWithCookie,
  createUnauthenticatedRequest,
  setupAPITestEnvironment,
  cleanupAPITestEnvironment
} from '@/test-utils/helpers/api-test-helpers';

// Mock dependencies
jest.mock('@/lib/repositories/base/repository-factory');

const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

describe('POST /api/pbl/programs/[programId]/update-timestamps', () => {
  const mockProgramId = 'program-123';
  const mockScenarioId = 'scenario-456';
  const mockUserEmail = 'test@example.com';

  let mockProgramRepo: any;
  let mockProgram: any;

  beforeAll(() => {
    setupAPITestEnvironment();
  });

  afterAll(() => {
    cleanupAPITestEnvironment();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockProgram = {
      id: mockProgramId,
      scenarioId: mockScenarioId,
      userId: 'user-123',
      status: 'active' as const,
      metadata: {
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    };

    mockProgramRepo = {
      findById: jest.fn(),
      update: jest.fn()
    };

    mockRepositoryFactory.getProgramRepository = jest.fn().mockReturnValue(mockProgramRepo);
  });

  const createMockParams = () => Promise.resolve({ programId: mockProgramId });

  // Test 1-5: Authentication tests
  it('should return 401 when no user cookie is present', async () => {
    const request = createUnauthenticatedRequest(
      'http://localhost/api/pbl/programs/program-123/update-timestamps',
      'POST',
      { scenarioId: mockScenarioId }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'User authentication required'
    });
  });

  it('should return 401 when user cookie is invalid JSON', async () => {
    const request = createUnauthenticatedRequest(
      'http://localhost/api/pbl/programs/program-123/update-timestamps',
      'POST',
      { scenarioId: mockScenarioId }
    );
    request.cookies.set('user', 'invalid-json');
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'User authentication required'
    });
  });

  it('should return 401 when user cookie missing email', async () => {
    const request = createUnauthenticatedRequest(
      'http://localhost/api/pbl/programs/program-123/update-timestamps',
      'POST',
      { scenarioId: mockScenarioId }
    );
    request.cookies.set('user', JSON.stringify({ name: 'Test User' }));
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'User authentication required'
    });
  });

  it('should handle empty user cookie', async () => {
    const request = createUnauthenticatedRequest(
      'http://localhost/api/pbl/programs/program-123/update-timestamps',
      'POST',
      { scenarioId: mockScenarioId }
    );
    request.cookies.set('user', '');
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'User authentication required'
    });
  });

  it('should handle malformed user cookie gracefully', async () => {
    const request = createUnauthenticatedRequest(
      'http://localhost/api/pbl/programs/program-123/update-timestamps',
      'POST',
      { scenarioId: mockScenarioId }
    );
    request.cookies.set('user', '{"email":}');
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'User authentication required'
    });
  });

  // Test 6-10: Request body validation tests
  it('should return 400 when request body is empty', async () => {
    const request = createAuthenticatedRequestWithCookie(
      'http://localhost/api/pbl/programs/program-123/update-timestamps',
      'POST',
      {},
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Scenario ID is required'
    });
  });

  it('should return 400 when scenarioId is missing', async () => {
    const request = createAuthenticatedRequestWithCookie(
      'http://localhost/api/pbl/programs/program-123/update-timestamps',
      'POST',
      { someOtherField: 'value' },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Scenario ID is required'
    });
  });

  it('should return 400 when scenarioId is null', async () => {
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: null },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Scenario ID is required'
    });
  });

  it('should return 400 when scenarioId is empty string', async () => {
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: '' },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Scenario ID is required'
    });
  });

  it('should handle malformed JSON request body', async () => {
    // This test ensures the route handles JSON parsing errors
    const request = new NextRequest('http://localhost/api/pbl/programs/program-123/update-timestamps', {
      method: 'POST',
      body: 'invalid-json'
    });
    request.cookies.set('user', JSON.stringify({ email: mockUserEmail }));
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to update timestamps'
    });
  });

  // Test 11-15: Program validation tests
  it('should return 404 when program does not exist', async () => {
    mockProgramRepo.findById.mockResolvedValue(null);
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({
      success: false,
      error: 'Program not found'
    });
    expect(mockProgramRepo.findById).toHaveBeenCalledWith(mockProgramId);
  });

  it('should return 404 when program scenarioId does not match', async () => {
    const mismatchedProgram = { ...mockProgram, scenarioId: 'different-scenario' };
    mockProgramRepo.findById.mockResolvedValue(mismatchedProgram);
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({
      success: false,
      error: 'Program not found'
    });
  });

  it('should handle undefined program response', async () => {
    mockProgramRepo.findById.mockResolvedValue(undefined);
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({
      success: false,
      error: 'Program not found'
    });
  });

  it('should handle program with missing scenarioId', async () => {
    const programWithoutScenario = { ...mockProgram, scenarioId: undefined };
    mockProgramRepo.findById.mockResolvedValue(programWithoutScenario);
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({
      success: false,
      error: 'Program not found'
    });
  });

  it('should handle program with null scenarioId', async () => {
    const programWithNullScenario = { ...mockProgram, scenarioId: null };
    mockProgramRepo.findById.mockResolvedValue(programWithNullScenario);
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({
      success: false,
      error: 'Program not found'
    });
  });

  // Test 16-20: Success cases
  it('should successfully update program timestamps', async () => {
    const updatedProgram = {
      ...mockProgram,
      metadata: {
        ...mockProgram.metadata,
        startedAt: expect.any(String),
        updatedAt: expect.any(String)
      }
    };
    
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockProgramRepo.update.mockResolvedValue(updatedProgram);
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.program).toBeDefined();
    expect(mockProgramRepo.update).toHaveBeenCalledWith(mockProgramId, {
      metadata: {
        ...mockProgram.metadata,
        startedAt: expect.any(String),
        updatedAt: expect.any(String)
      }
    });
  });

  it('should preserve existing metadata while updating timestamps', async () => {
    const programWithExistingMetadata = {
      ...mockProgram,
      metadata: {
        createdAt: '2024-01-01T00:00:00.000Z',
        customField: 'customValue',
        score: 85
      }
    };
    
    mockProgramRepo.findById.mockResolvedValue(programWithExistingMetadata);
    mockProgramRepo.update.mockResolvedValue(programWithExistingMetadata);
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    await POST(request, { params });

    expect(mockProgramRepo.update).toHaveBeenCalledWith(mockProgramId, {
      metadata: {
        createdAt: '2024-01-01T00:00:00.000Z',
        customField: 'customValue',
        score: 85,
        startedAt: expect.any(String),
        updatedAt: expect.any(String)
      }
    });
  });

  it('should handle program with no metadata', async () => {
    const programWithoutMetadata = { ...mockProgram };
    delete programWithoutMetadata.metadata;
    
    mockProgramRepo.findById.mockResolvedValue(programWithoutMetadata);
    mockProgramRepo.update.mockResolvedValue(programWithoutMetadata);
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    await POST(request, { params });

    expect(mockProgramRepo.update).toHaveBeenCalledWith(mockProgramId, {
      metadata: {
        startedAt: expect.any(String),
        updatedAt: expect.any(String)
      }
    });
  });

  it('should handle program with empty metadata object', async () => {
    const programWithEmptyMetadata = { ...mockProgram, metadata: {} };
    
    mockProgramRepo.findById.mockResolvedValue(programWithEmptyMetadata);
    mockProgramRepo.update.mockResolvedValue(programWithEmptyMetadata);
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    await POST(request, { params });

    expect(mockProgramRepo.update).toHaveBeenCalledWith(mockProgramId, {
      metadata: {
        startedAt: expect.any(String),
        updatedAt: expect.any(String)
      }
    });
  });

  it('should return updated program data', async () => {
    const updatedProgram = {
      ...mockProgram,
      metadata: {
        ...mockProgram.metadata,
        startedAt: '2024-01-02T10:30:00.000Z',
        updatedAt: '2024-01-02T10:30:00.000Z'
      }
    };
    
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockProgramRepo.update.mockResolvedValue(updatedProgram);
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(data).toEqual({
      success: true,
      program: updatedProgram
    });
  });

  // Test 21-25: Error handling tests
  it('should handle database findById error', async () => {
    mockProgramRepo.findById.mockRejectedValue(new Error('Database connection error'));
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to update timestamps'
    });
  });

  it('should handle database update error', async () => {
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockProgramRepo.update.mockRejectedValue(new Error('Update failed'));
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to update timestamps'
    });
  });

  it('should handle repository factory error', async () => {
    mockRepositoryFactory.getProgramRepository.mockImplementation(() => {
      throw new Error('Repository initialization failed');
    });
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to update timestamps'
    });
  });

  it('should handle update method not available error', async () => {
    const repoWithoutUpdate = {
      findById: jest.fn().mockResolvedValue(mockProgram),
      findByUser: jest.fn().mockResolvedValue([]),
      findByScenario: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue(mockProgram),
      updateProgress: jest.fn().mockResolvedValue(mockProgram),
      complete: jest.fn().mockResolvedValue(mockProgram)
      // No update method
    };
    
    mockRepositoryFactory.getProgramRepository.mockReturnValue(repoWithoutUpdate);
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Update operation not supported'
    });
  });

  it('should handle params promise rejection', async () => {
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: mockUserEmail }
    );
    
    const failingParams = Promise.reject(new Error('Params error'));

    const response = await POST(request, { params: failingParams });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to update timestamps'
    });
  });

  // Test 26-30: Edge cases and additional validations
  it('should handle extra fields in request body', async () => {
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockProgramRepo.update.mockResolvedValue(mockProgram);
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { 
        scenarioId: mockScenarioId,
        extraField: 'should be ignored',
        maliciousCode: '<script>alert("hack")</script>'
      },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should handle special characters in user email', async () => {
    const specialEmail = 'user+test@example-domain.com';
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockProgramRepo.update.mockResolvedValue(mockProgram);
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: specialEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should handle very long scenario ID', async () => {
    const longScenarioId = 'a'.repeat(1000);
    const programWithLongScenarioId = { ...mockProgram, scenarioId: longScenarioId };
    
    mockProgramRepo.findById.mockResolvedValue(programWithLongScenarioId);
    mockProgramRepo.update.mockResolvedValue(programWithLongScenarioId);
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: longScenarioId },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should handle unicode characters in scenario ID', async () => {
    const unicodeScenarioId = 'scenario-测试-🎯';
    const programWithUnicodeId = { ...mockProgram, scenarioId: unicodeScenarioId };
    
    mockProgramRepo.findById.mockResolvedValue(programWithUnicodeId);
    mockProgramRepo.update.mockResolvedValue(programWithUnicodeId);
    
    const request = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: unicodeScenarioId },
      { email: mockUserEmail }
    );
    const params = createMockParams();

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should generate different timestamps on subsequent calls', async () => {
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    
    // First call
    let capturedUpdate1: any;
    mockProgramRepo.update.mockImplementationOnce((id: string, updates: unknown) => {
      capturedUpdate1 = updates;
      return Promise.resolve(mockProgram);
    });
    
    const request1 = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: mockUserEmail }
    );
    const params1 = createMockParams();

    await POST(request1, { params: params1 });
    
    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 1));
    
    // Second call
    let capturedUpdate2: any;
    mockProgramRepo.update.mockImplementationOnce((id: string, updates: unknown) => {
      capturedUpdate2 = updates;
      return Promise.resolve(mockProgram);
    });
    
    const request2 = createAuthenticatedRequestWithCookie(
      "http://localhost/api/pbl/programs/program-123/update-timestamps",
      "POST",
      { scenarioId: mockScenarioId },
      { email: mockUserEmail }
    );
    const params2 = createMockParams();

    await POST(request2, { params: params2 });

    // Timestamps should be different
    expect(capturedUpdate1.metadata.startedAt).not.toBe(capturedUpdate2.metadata.startedAt);
    expect(capturedUpdate1.metadata.updatedAt).not.toBe(capturedUpdate2.metadata.updatedAt);
  });
});