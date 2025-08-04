/**
 * Discovery Programs API Route Tests
 * 測試 Discovery Programs 創建與管理 API
 */

import { GET, POST } from '../route';
import { createMockNextRequest } from '@/test-utils/mock-next-request';
import type { IProgram } from '@/types/unified-learning';
import type { IDiscoveryProgram } from '@/types/discovery-types';

// Mock auth session
const mockGetServerSession = jest.fn();
jest.mock('@/lib/auth/session', () => ({
  getServerSession: () => mockGetServerSession()
}));

// Mock repository factory
jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getProgramRepository: jest.fn(),
    getScenarioRepository: jest.fn(),
    getUserRepository: jest.fn()
  }
}));

// Get mocked factory after mocking
import { repositoryFactory } from '@/lib/repositories/base/repository-factory';
const mockRepositoryFactory = repositoryFactory as jest.Mocked<typeof repositoryFactory>;

describe('Discovery Programs API', () => {
  let mockProgramRepo: any;
  let mockScenarioRepo: any;
  let mockUserRepo: any;

  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User'
  };

  const mockScenario = {
    id: 'scenario123',
    mode: 'discovery',
    status: 'active',
    title: { en: 'Software Developer' },
    description: { en: 'Build amazing apps' },
    discoveryData: {
      careerPath: 'software-developer',
      requiredSkills: ['JavaScript', 'Python'],
      careerLevel: 'intermediate'
    },
    taskTemplates: [
      { id: 'task1', title: 'Introduction', type: 'exploration' }
    ]
  };

  const mockProgram: IProgram = {
    id: 'prog123',
    scenarioId: 'scenario123',
    userId: 'user123',
    mode: 'discovery',
    status: 'active',
    currentTaskIndex: 0,
    completedTaskCount: 0,
    totalTaskCount: 1,
    totalScore: 0,
    domainScores: {},
    xpEarned: 0,
    badgesEarned: [],
    startedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    timeSpentSeconds: 0,
    pblData: {},
    discoveryData: {
      explorationPath: ['software-developer'],
      milestones: [],
      personalityMatch: 85,
      skillGapAnalysis: [
        { skill: 'JavaScript', currentLevel: 60, requiredLevel: 75, importance: 'critical', suggestedResources: [] }
      ],
      careerReadiness: 65
    },
    assessmentData: {},
    metadata: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock repositories
    mockProgramRepo = {
      create: jest.fn(),
      findByUser: jest.fn(),
      findById: jest.fn(),
      update: jest.fn()
    };

    mockScenarioRepo = {
      findById: jest.fn()
    };

    mockUserRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn()
    };

    // Setup mocks
    mockRepositoryFactory.getProgramRepository.mockReturnValue(mockProgramRepo);
    mockRepositoryFactory.getScenarioRepository.mockReturnValue(mockScenarioRepo);
    mockRepositoryFactory.getUserRepository.mockReturnValue(mockUserRepo);

    // Default auth
    mockGetServerSession.mockResolvedValue({ user: mockUser });
  });

  describe('POST /api/discovery/programs', () => {
    it('should create a new discovery program', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(mockScenario);
      mockProgramRepo.create.mockResolvedValue(mockProgram);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: 'scenario123' })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.program).toBeDefined();
      expect(data.data.program.mode).toBe('discovery');
      expect(data.data.program.discoveryData).toBeDefined();
    });

    it('should include skill gap analysis in new program', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(mockScenario);
      mockProgramRepo.create.mockResolvedValue(mockProgram);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: 'scenario123' })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data.data.program.discoveryData.skillGapAnalysis).toHaveLength(1);
      expect(data.data.program.discoveryData.skillGapAnalysis[0].skill).toBe('JavaScript');
    });

    it('should require authentication', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: 'scenario123' })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should validate scenario exists', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue(null);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: 'non-existent' })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe('Scenario not found');
    });

    it('should validate scenario is discovery mode', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      (mockScenarioRepo.findById as jest.Mock).mockResolvedValue({
        ...mockScenario,
        mode: 'pbl'
      });

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: 'scenario123' })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid scenario type');
    });
  });

  describe('GET /api/discovery/programs', () => {
    it('should return user discovery programs', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findByUser.mockResolvedValue([mockProgram]);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.programs).toHaveLength(1);
      expect(data.data.programs[0].mode).toBe('discovery');
    });

    it('should filter by status', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      const programs = [
        { ...mockProgram, status: 'active' },
        { ...mockProgram, id: 'prog456', status: 'completed' }
      ];
      mockProgramRepo.findByUser.mockResolvedValue(programs);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs?status=active');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.programs).toHaveLength(1);
      expect(data.data.programs[0].status).toBe('active');
    });

    it('should include progress metrics', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findByUser.mockResolvedValue([mockProgram]);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.programs[0].progress).toBeDefined();
      expect(data.data.programs[0].progress.completionRate).toBe(0);
      expect(data.data.programs[0].progress.careerReadiness).toBe(65);
    });

    it('should require authentication', async () => {
      // Arrange
      mockGetServerSession.mockResolvedValue(null);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should handle empty programs list', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockProgramRepo.findByUser.mockResolvedValue([]);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.programs).toHaveLength(0);
      expect(data.data.total).toBe(0);
    });

    it('should sort by most recent first', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      const olderProgram = {
        ...mockProgram,
        id: 'prog-old',
        lastActivityAt: '2024-01-01T00:00:00Z'
      };
      const newerProgram = {
        ...mockProgram,
        id: 'prog-new',
        lastActivityAt: '2024-12-01T00:00:00Z'
      };
      mockProgramRepo.findByUser.mockResolvedValue([olderProgram, newerProgram]);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs');

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.data.programs[0].id).toBe('prog-new');
      expect(data.data.programs[1].id).toBe('prog-old');
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      (mockScenarioRepo.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId: 'scenario123' })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should validate request body', async () => {
      // Arrange
      mockUserRepo.findByEmail.mockResolvedValue(mockUser);

      const request = createMockNextRequest('http://localhost:3000/api/discovery/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Missing scenarioId
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('Scenario ID is required');
    });
  });
});