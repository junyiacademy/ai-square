/**
 * Unit Tests for Scenario Initialization APIs
 * Tests the initialization functionality for Assessment, PBL, and Discovery scenarios
 * Main features tested: clean flag, force flag, error handling
 * Test file name: scenario-initialization.test.ts
 */

import { NextRequest } from 'next/server';
import { POST as initPBL } from '../init-pbl/route';
import { POST as initAssessment } from '../init-assessment/route';
import { POST as initDiscovery } from '../init-discovery/route';

// Mock the repository factory
const mockFindByMode = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/lib/repositories/base/repository-factory', () => ({
  repositoryFactory: {
    getScenarioRepository: () => ({
      findByMode: mockFindByMode,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
    })
  }
}));

// Mock fs and yaml
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('yaml content'),
}));

jest.mock('fs/promises', () => ({
  readdir: jest.fn().mockResolvedValue([]),
  stat: jest.fn().mockResolvedValue({ isDirectory: () => true }),
  readFile: jest.fn().mockResolvedValue('yaml content'),
}));

jest.mock('yaml', () => ({
  parse: jest.fn().mockReturnValue({
    assessment_config: {
      total_questions: 12,
      time_limit_minutes: 15,
      passing_score: 60,
      domains: {}
    },
    tasks: []
  }),
}));

describe('Scenario Initialization APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Assessment Init API', () => {
    it('should delete all assessment scenarios when clean=true', async () => {
      // Arrange: Setup existing scenarios
      const existingScenarios = [
        { id: 'scenario-1', mode: 'assessment', status: 'active' },
        { id: 'scenario-2', mode: 'assessment', status: 'active' },
        { id: 'scenario-3', mode: 'assessment', status: 'archived' }
      ];
      mockFindByMode.mockResolvedValue(existingScenarios);
      mockCreate.mockResolvedValue({ id: 'new-scenario' });

      // Act: Call init with clean flag
      const request = new NextRequest('http://localhost:3001/api/admin/init-assessment', {
        method: 'POST',
        body: JSON.stringify({ clean: true })
      });
      const response = await initAssessment(request);
      const result = await response.json();

      // Assert: All scenarios should be deleted
      expect(mockDelete).toHaveBeenCalledTimes(3);
      expect(mockDelete).toHaveBeenCalledWith('scenario-1');
      expect(mockDelete).toHaveBeenCalledWith('scenario-2');
      expect(mockDelete).toHaveBeenCalledWith('scenario-3');
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
    });

    it('should not delete scenarios when clean=false', async () => {
      // Arrange
      const existingScenarios = [
        { id: 'scenario-1', mode: 'assessment', status: 'active', sourceId: 'ai_literacy' }
      ];
      mockFindByMode.mockResolvedValue(existingScenarios);
      mockUpdate.mockResolvedValue(existingScenarios[0]);

      // Act
      const request = new NextRequest('http://localhost:3001/api/admin/init-assessment', {
        method: 'POST',
        body: JSON.stringify({ clean: false })
      });
      const response = await initAssessment(request);
      const result = await response.json();

      // Assert
      expect(mockDelete).not.toHaveBeenCalled();
      expect(result.action).toBe('updated');
    });

    it('should create new scenario after cleaning', async () => {
      // Arrange
      mockFindByMode.mockResolvedValue([
        { id: 'old-scenario', mode: 'assessment', status: 'active' }
      ]);
      mockCreate.mockResolvedValue({ id: 'new-scenario' });

      // Act
      const request = new NextRequest('http://localhost:3001/api/admin/init-assessment', {
        method: 'POST',
        body: JSON.stringify({ clean: true })
      });
      const response = await initAssessment(request);
      const result = await response.json();

      // Assert
      expect(mockDelete).toHaveBeenCalledWith('old-scenario');
      expect(mockCreate).toHaveBeenCalled();
      expect(result.scenarioId).toBe('new-scenario');
    });
  });

  describe('PBL Init API', () => {
    it('should delete all PBL scenarios when clean=true', async () => {
      // Arrange
      const existingScenarios = [
        { id: 'pbl-1', mode: 'pbl', status: 'active' },
        { id: 'pbl-2', mode: 'pbl', status: 'active' }
      ];
      mockFindByMode.mockResolvedValue(existingScenarios);

      // Act
      const request = new NextRequest('http://localhost:3001/api/admin/init-pbl', {
        method: 'POST',
        body: JSON.stringify({ clean: true })
      });
      const response = await initPBL(request);
      const result = await response.json();

      // Assert
      expect(mockDelete).toHaveBeenCalledTimes(2);
      expect(mockDelete).toHaveBeenCalledWith('pbl-1');
      expect(mockDelete).toHaveBeenCalledWith('pbl-2');
      expect(result.success).toBe(true);
    });

    it('should not delete scenarios when clean is not provided', async () => {
      // Arrange
      mockFindByMode.mockResolvedValue([]);

      // Act
      const request = new NextRequest('http://localhost:3001/api/admin/init-pbl', {
        method: 'POST',
        body: JSON.stringify({})
      });
      await initPBL(request);

      // Assert
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe('Discovery Init API', () => {
    it('should delete all discovery scenarios when clean=true', async () => {
      // Arrange
      const existingScenarios = [
        { id: 'discovery-1', mode: 'discovery', status: 'active' },
        { id: 'discovery-2', mode: 'discovery', status: 'archived' },
        { id: 'discovery-3', mode: 'discovery', status: 'active' }
      ];
      mockFindByMode.mockResolvedValue(existingScenarios);

      // Act
      const request = new NextRequest('http://localhost:3001/api/admin/init-discovery', {
        method: 'POST',
        body: JSON.stringify({ clean: true })
      });
      const response = await initDiscovery(request);
      const result = await response.json();

      // Assert
      expect(mockDelete).toHaveBeenCalledTimes(3);
      expect(mockDelete).toHaveBeenCalledWith('discovery-1');
      expect(mockDelete).toHaveBeenCalledWith('discovery-2');
      expect(mockDelete).toHaveBeenCalledWith('discovery-3');
      expect(result.success).toBe(true);
    });

    it('should handle empty scenario list when cleaning', async () => {
      // Arrange
      mockFindByMode.mockResolvedValue([]);

      // Act
      const request = new NextRequest('http://localhost:3001/api/admin/init-discovery', {
        method: 'POST',
        body: JSON.stringify({ clean: true })
      });
      const response = await initDiscovery(request);
      const result = await response.json();

      // Assert
      expect(mockDelete).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle delete errors gracefully', async () => {
      // Arrange
      mockFindByMode.mockResolvedValue([
        { id: 'scenario-1', mode: 'assessment', status: 'active' }
      ]);
      mockDelete.mockRejectedValue(new Error('Database error'));

      // Act
      const request = new NextRequest('http://localhost:3001/api/admin/init-assessment', {
        method: 'POST',
        body: JSON.stringify({ clean: true })
      });
      const response = await initAssessment(request);
      const result = await response.json();

      // Assert - should continue and create new scenario even if delete failed
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
    });

    it('should continue processing even if one delete fails', async () => {
      // Arrange
      const scenarios = [
        { id: 'scenario-1', mode: 'pbl', status: 'active' },
        { id: 'scenario-2', mode: 'pbl', status: 'active' },
        { id: 'scenario-3', mode: 'pbl', status: 'active' }
      ];
      mockFindByMode.mockResolvedValue(scenarios);
      
      // Make second delete fail
      mockDelete
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Delete failed'))
        .mockResolvedValueOnce(true);

      // Act
      const request = new NextRequest('http://localhost:3001/api/admin/init-pbl', {
        method: 'POST',
        body: JSON.stringify({ clean: true })
      });
      const response = await initPBL(request);

      // Assert - should still try to delete all
      expect(mockDelete).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integration', () => {
    it('should clean and reinitialize all modes', async () => {
      // Arrange
      mockFindByMode.mockImplementation((mode) => {
        switch(mode) {
          case 'pbl': return Promise.resolve([{ id: 'pbl-1', mode: 'pbl' }]);
          case 'assessment': return Promise.resolve([{ id: 'assess-1', mode: 'assessment' }]);
          case 'discovery': return Promise.resolve([{ id: 'disc-1', mode: 'discovery' }]);
          default: return Promise.resolve([]);
        }
      });
      mockCreate.mockResolvedValue({ id: 'new-id' });

      // Act - Clean all three modes
      const pblRequest = new NextRequest('http://localhost:3001/api/admin/init-pbl', {
        method: 'POST',
        body: JSON.stringify({ clean: true })
      });
      const assessRequest = new NextRequest('http://localhost:3001/api/admin/init-assessment', {
        method: 'POST',
        body: JSON.stringify({ clean: true })
      });
      const discRequest = new NextRequest('http://localhost:3001/api/admin/init-discovery', {
        method: 'POST',
        body: JSON.stringify({ clean: true })
      });

      const [pblRes, assessRes, discRes] = await Promise.all([
        initPBL(pblRequest),
        initAssessment(assessRequest),
        initDiscovery(discRequest)
      ]);

      const [pblResult, assessResult, discResult] = await Promise.all([
        pblRes.json(),
        assessRes.json(),
        discRes.json()
      ]);

      // Assert
      expect(mockDelete).toHaveBeenCalledWith('pbl-1');
      expect(mockDelete).toHaveBeenCalledWith('assess-1');
      expect(mockDelete).toHaveBeenCalledWith('disc-1');
      expect(pblResult.success).toBe(true);
      expect(assessResult.success).toBe(true);
      expect(discResult.success).toBe(true);
    });
  });
});