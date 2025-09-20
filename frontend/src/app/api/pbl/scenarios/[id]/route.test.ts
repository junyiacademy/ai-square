/**
 * TDD Test for PBL Scenarios API - Multilingual Learning Objectives
 *
 * Test Scenario: API should return learning objectives in requested language
 * - Test 1: Should return Chinese objectives when lang=zhTW
 * - Test 2: Should fallback to English when Chinese not available
 * - Test 3: Should handle empty database objectives by using YAML fallback
 */

import { GET } from './route';
import { NextRequest } from 'next/server';

// Mock the repository and services
jest.mock('@/lib/repositories/base/repository-factory');
jest.mock('@/lib/services/scenario-index-service');
jest.mock('@/lib/services/scenario-index-builder');

describe('PBL Scenarios API - Multilingual Learning Objectives', () => {
  const mockScenarioId = 'test-scenario-uuid';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('RED: Should return Chinese learning objectives when lang=zhTW', async () => {
    // Arrange: Mock scenario with YAML data containing Chinese objectives
    const mockScenario = {
      id: mockScenarioId,
      title: { en: 'Test Scenario', zhTW: '測試情境' },
      description: { en: 'Test Description', zhTW: '測試描述' },
      objectives: [], // Empty database objectives to trigger YAML fallback
      pblData: {
        scenario_info: {
          learning_objectives: [
            '體會晶片在生活中的無所不在，並連結其原料「矽」與自然的「沙子」',
            '理解晶片的核心是作為「開關」的「電晶體」，其關鍵在於「半導體」可控制電流的特性',
            '認識「摩爾定律」的基本概念，並解釋為何科技產品能持續地變快、變小'
          ]
        }
      },
      taskTemplates: []
    };

    // Mock repository to return our test scenario
    const mockRepositoryFactory = require('@/lib/repositories/base/repository-factory');
    mockRepositoryFactory.repositoryFactory = {
      getScenarioRepository: () => ({
        findById: jest.fn().mockResolvedValue(mockScenario)
      })
    };

    // Mock URL with Chinese language parameter
    const url = `http://localhost:3010/api/pbl/scenarios/${mockScenarioId}?lang=zhTW`;
    const request = new NextRequest(url);
    const params = Promise.resolve({ id: mockScenarioId });

    // Act: Call the API
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert: Should return Chinese learning objectives
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.learningObjectives).toEqual([
      '體會晶片在生活中的無所不在，並連結其原料「矽」與自然的「沙子」',
      '理解晶片的核心是作為「開關」的「電晶體」，其關鍵在於「半導體」可控制電流的特性',
      '認識「摩爾定律」的基本概念，並解釋為何科技產品能持續地變快、變小'
    ]);
  });

  test('Should handle database objectives when available', async () => {
    // Arrange: Mock scenario with database objectives
    const mockScenario = {
      id: mockScenarioId,
      title: { en: 'Test Scenario', zhTW: '測試情境' },
      description: { en: 'Test Description', zhTW: '測試描述' },
      objectives: [
        'Database objective 1',
        'Database objective 2'
      ],
      pblData: {
        scenario_info: {
          learning_objectives: ['Should not use this']
        }
      },
      taskTemplates: []
    };

    const mockRepositoryFactory = require('@/lib/repositories/base/repository-factory');
    mockRepositoryFactory.repositoryFactory = {
      getScenarioRepository: () => ({
        findById: jest.fn().mockResolvedValue(mockScenario)
      })
    };

    const url = `http://localhost:3010/api/pbl/scenarios/${mockScenarioId}?lang=en`;
    const request = new NextRequest(url);
    const params = Promise.resolve({ id: mockScenarioId });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert: Should prefer database objectives over YAML
    expect(data.data.learningObjectives).toEqual([
      'Database objective 1',
      'Database objective 2'
    ]);
  });

  test('Should fallback to English when requested language not available', async () => {
    // Arrange: Mock scenario with only English YAML objectives
    const mockScenario = {
      id: mockScenarioId,
      title: { en: 'Test Scenario' },
      description: { en: 'Test Description' },
      objectives: [],
      pblData: {
        scenario_info: {
          learning_objectives: [
            'Understand semiconductor basics',
            'Learn about transistors',
            'Explore Moore\'s Law'
          ]
        }
      },
      taskTemplates: []
    };

    const mockRepositoryFactory = require('@/lib/repositories/base/repository-factory');
    mockRepositoryFactory.repositoryFactory = {
      getScenarioRepository: () => ({
        findById: jest.fn().mockResolvedValue(mockScenario)
      })
    };

    // Request Korean but only English available
    const url = `http://localhost:3010/api/pbl/scenarios/${mockScenarioId}?lang=ko`;
    const request = new NextRequest(url);
    const params = Promise.resolve({ id: mockScenarioId });

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert: Should return English objectives as fallback
    expect(data.data.learningObjectives).toEqual([
      'Understand semiconductor basics',
      'Learn about transistors',
      'Explore Moore\'s Law'
    ]);
  });
});
