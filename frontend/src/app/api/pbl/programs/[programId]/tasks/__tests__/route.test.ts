import { NextRequest } from 'next/server';
import { GET } from '../route';
import { getUnifiedAuth } from '@/lib/auth/unified-auth';
import { createRepositoryFactory } from '@/lib/db/repositories/factory';

// Mock dependencies
jest.mock('@/lib/auth/unified-auth', () => ({
  getUnifiedAuth: jest.fn(),
  createUnauthorizedResponse: jest.fn(() => ({
    json: () => Promise.resolve({ success: false, error: 'Authentication required' }),
    status: 401
  }))
}));
jest.mock('@/lib/db/repositories/factory');

const mockGetUnifiedAuth = getUnifiedAuth as jest.MockedFunction<typeof getUnifiedAuth>;
const mockCreateRepositoryFactory = createRepositoryFactory as jest.Mocked<typeof createRepositoryFactory>;

describe('GET /api/pbl/programs/[programId]/tasks', () => {
  const validProgramId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const invalidProgramId = 'invalid-uuid';
  const mockUserEmail = 'test@example.com';
  const mockUserId = 'user-123-456';

  let mockProgramRepo: any;
  let mockTaskRepo: any;
  let mockUserRepo: any;
  let mockRepositoryFactory: any;

  const mockUser = {
    id: mockUserId,
    email: mockUserEmail,
    name: 'Test User'
  };

  const mockProgram = {
    id: validProgramId,
    userId: mockUserId,
    scenarioId: 'scenario-123',
    status: 'active' as const
  };

  const mockTasks = [
    {
      id: 'task-1',
      programId: validProgramId,
      title: { en: 'Task 1' },
      type: 'question' as const,
      status: 'pending' as const
    },
    {
      id: 'task-2',
      programId: validProgramId,
      title: { en: 'Task 2' },
      type: 'chat' as const,
      status: 'completed' as const
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockProgramRepo = {
      findById: jest.fn()
    };
    
    mockTaskRepo = {
      findByProgram: jest.fn()
    };
    
    mockUserRepo = {
      findByEmail: jest.fn()
    };

    mockRepositoryFactory = {
      getProgramRepository: jest.fn().mockReturnValue(mockProgramRepo),
      getTaskRepository: jest.fn().mockReturnValue(mockTaskRepo),
      getUserRepository: jest.fn().mockReturnValue(mockUserRepo)
    };

    (createRepositoryFactory as any).getProgramRepository = jest.fn().mockReturnValue(mockProgramRepo);
    (createRepositoryFactory as any).getTaskRepository = jest.fn().mockReturnValue(mockTaskRepo);
    (createRepositoryFactory as any).getUserRepository = jest.fn().mockReturnValue(mockUserRepo);
  });

  const createMockRequest = () => {
    return new NextRequest(`http://localhost/api/pbl/programs/${validProgramId}/tasks`, {
      method: 'GET'
    });
  };

  const createMockParams = (programId: string = validProgramId) => 
    Promise.resolve({ programId });

  // Test 1-5: Program ID validation tests
  it('should return 400 for invalid UUID format', async () => {
    const request = createMockRequest();
    const params = createMockParams(invalidProgramId);

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Invalid program ID format. UUID required.'
    });
  });

  it('should return 400 for empty program ID', async () => {
    const request = createMockRequest();
    const params = createMockParams('');

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Invalid program ID format. UUID required.'
    });
  });

  it('should return 400 for program ID with wrong format', async () => {
    const request = createMockRequest();
    const params = createMockParams('123-456-789');

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Invalid program ID format. UUID required.'
    });
  });

  it('should return 400 for program ID with special characters', async () => {
    const request = createMockRequest();
    const params = createMockParams('f47ac10b-58cc-4372-a567-0e02b2c3d47@');

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Invalid program ID format. UUID required.'
    });
  });

  it('should return 400 for program ID that is too long', async () => {
    const request = createMockRequest();
    const params = createMockParams('f47ac10b-58cc-4372-a567-0e02b2c3d479-extra');

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({
      success: false,
      error: 'Invalid program ID format. UUID required.'
    });
  });

  // Test 6-10: Authentication tests
  it('should return 401 when no session exists', async () => {
    mockGetUnifiedAuth.mockResolvedValue(null);
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'Authentication required'
    });
  });

  it('should return 401 when session has no user', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ user: null } as any);
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'Authentication required'
    });
  });

  it('should return 401 when session user has no email', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { name: 'Test User' } as any 
    });
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'Authentication required'
    });
  });

  it('should return 401 when session user email is empty', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: '', name: 'Test User' } as any 
    });
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'Authentication required'
    });
  });

  it('should return 401 when session user email is undefined', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: undefined, name: 'Test User' } as any 
    });
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({
      success: false,
      error: 'Authentication required'
    });
  });

  // Test 11-15: User lookup tests
  it('should return 404 when user is not found by email', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    mockUserRepo.findByEmail.mockResolvedValue(null);
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({
      success: false,
      error: 'User not found'
    });
    expect(mockUserRepo.findByEmail).toHaveBeenCalledWith(mockUserEmail);
  });

  it('should return 404 when user lookup returns undefined', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    mockUserRepo.findByEmail.mockResolvedValue(undefined);
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({
      success: false,
      error: 'User not found'
    });
  });

  it('should handle user lookup database error', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    mockUserRepo.findByEmail.mockRejectedValue(new Error('Database connection failed'));
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to fetch tasks'
    });
  });

  it('should handle user with missing id field', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    const userWithoutId = { email: mockUserEmail, name: 'Test User' };
    mockUserRepo.findByEmail.mockResolvedValue(userWithoutId);
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({
      success: false,
      error: 'Access denied'
    });
  });

  it('should handle user with null id field', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    const userWithNullId = { id: null, email: mockUserEmail, name: 'Test User' };
    mockUserRepo.findByEmail.mockResolvedValue(userWithNullId);
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({
      success: false,
      error: 'Access denied'
    });
  });

  // Test 16-20: Program validation tests
  it('should return 404 when program does not exist', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.findById.mockResolvedValue(null);
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({
      success: false,
      error: 'Program not found'
    });
    expect(mockProgramRepo.findById).toHaveBeenCalledWith(validProgramId);
  });

  it('should return 404 when program lookup returns undefined', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.findById.mockResolvedValue(undefined);
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({
      success: false,
      error: 'Program not found'
    });
  });

  it('should return 403 when program belongs to different user', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    const otherUserProgram = { ...mockProgram, userId: 'different-user-id' };
    mockProgramRepo.findById.mockResolvedValue(otherUserProgram);
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({
      success: false,
      error: 'Access denied'
    });
  });

  it('should return 403 when program has no userId', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    const programWithoutUserId = { ...mockProgram };
    programWithoutUserId.userId = undefined as any;
    mockProgramRepo.findById.mockResolvedValue(programWithoutUserId);
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({
      success: false,
      error: 'Access denied'
    });
  });

  it('should return 403 when program userId is null', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    const programWithNullUserId = { ...mockProgram, userId: null };
    mockProgramRepo.findById.mockResolvedValue(programWithNullUserId);
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({
      success: false,
      error: 'Access denied'
    });
  });

  // Test 21-25: Success cases
  it('should successfully return tasks for valid program', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockTasks);
    expect(mockTaskRepo.findByProgram).toHaveBeenCalledWith(validProgramId);
  });

  it('should return empty array when no tasks exist', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockTaskRepo.findByProgram.mockResolvedValue([]);
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('should handle large number of tasks', async () => {
    const manyTasks = Array.from({ length: 100 }, (_, i) => ({
      id: `task-${i}`,
      programId: validProgramId,
      title: { en: `Task ${i}` },
      type: 'question' as const,
      status: 'pending' as const
    }));
    
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockTaskRepo.findByProgram.mockResolvedValue(manyTasks);
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(100);
    expect(data[0].id).toBe('task-0');
    expect(data[99].id).toBe('task-99');
  });

  it('should handle tasks with complex data structures', async () => {
    const complexTasks = [
      {
        id: 'task-complex',
        programId: validProgramId,
        title: { en: 'Complex Task', zh: '复杂任务', es: 'Tarea Compleja' },
        type: 'creation' as const,
        status: 'active' as const,
        context: {
          difficulty: 'advanced',
          estimatedTime: 30,
          resources: ['video', 'document']
        },
        content: {
          instructions: 'Complete the advanced analysis',
          materials: { video: 'url1', doc: 'url2' }
        }
      }
    ];
    
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockTaskRepo.findByProgram.mockResolvedValue(complexTasks);
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(complexTasks);
  });

  it('should handle case-insensitive UUID validation', async () => {
    const upperCaseUUID = validProgramId.toUpperCase();
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockTaskRepo.findByProgram.mockResolvedValue(mockTasks);
    
    const request = createMockRequest();
    const params = createMockParams(upperCaseUUID);

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockTasks);
  });

  // Test 26-30: Error handling and edge cases
  it('should handle program repository database error', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.findById.mockRejectedValue(new Error('Database error'));
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to fetch tasks'
    });
  });

  it('should handle task repository database error', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    mockUserRepo.findByEmail.mockResolvedValue(mockUser);
    mockProgramRepo.findById.mockResolvedValue(mockProgram);
    mockTaskRepo.findByProgram.mockRejectedValue(new Error('Task fetch error'));
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to fetch tasks'
    });
  });

  it('should handle session service error', async () => {
    mockGetUnifiedAuth.mockRejectedValue(new Error('Session service error'));
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to fetch tasks'
    });
  });

  it('should handle repository factory initialization error', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    
    // Mock repository factory to throw error
    mockCreateRepositoryFactory.getProgramRepository = jest.fn().mockImplementation(() => {
      throw new Error('Repository factory error');
    });
    
    const request = createMockRequest();
    const params = createMockParams();

    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to fetch tasks'
    });
  });

  it('should handle params promise rejection', async () => {
    mockGetUnifiedAuth.mockResolvedValue({ 
      user: { email: mockUserEmail } as any 
    });
    
    const request = createMockRequest();
    const failingParams = Promise.reject(new Error('Params error'));

    const response = await GET(request, { params: failingParams });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Failed to fetch tasks'
    });
  });
});