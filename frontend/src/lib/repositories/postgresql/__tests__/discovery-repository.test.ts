/**
 * Tests for PostgreSQLDiscoveryRepository.ts
 */

import { PostgreSQLDiscoveryRepository } from '../discovery-repository';
import type { Pool } from 'pg';

describe('PostgreSQLDiscoveryRepository', () => {
  let pool: jest.Mocked<Pool>;
  let repo: PostgreSQLDiscoveryRepository;
  let client: { query: jest.Mock; release: jest.Mock };

  beforeEach(() => {
    client = { query: jest.fn(), release: jest.fn() };
    pool = {
      connect: jest.fn().mockResolvedValue(client),
    } as unknown as jest.Mocked<Pool>;
    repo = new PostgreSQLDiscoveryRepository(pool as unknown as Pool);
  });

  function scenarioRow(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'sc1',
      status: 'active',
      version: '1.0',
      source_type: 'yaml',
      source_path: '/path.yml',
      source_id: 'slug-a',
      source_metadata: { a: 1 },
      title: { en: 'Career A' },
      description: { en: 'Desc' },
      objectives: [],
      difficulty: 'beginner',
      estimated_minutes: 45,
      prerequisites: [],
      task_templates: [
        { id: 't1', title: { en: 'Task 1' }, type: 'question', description: { en: 'd1' } },
      ],
      task_count: 1,
      xp_rewards: { done: 10 },
      unlock_requirements: {},
      pbl_data: {},
      discovery_data: {
        careerPath: 'data_analyst',
        requiredSkills: ['sql', 'python'],
        careerLevel: 'entry',
        relatedCareers: ['bi_analyst'],
      },
      assessment_data: {},
      ai_modules: {},
      resources: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      metadata: {},
      ...overrides,
    } as Record<string, unknown>;
  }

  it('findCareerPathById maps row to IDiscoveryScenario with discovery defaults', async () => {
    client.query.mockResolvedValueOnce({ rows: [scenarioRow()] });
    const result = await repo.findCareerPathById('sc1');
    expect(pool.connect).toHaveBeenCalled();
    expect(client.query).toHaveBeenCalled();
    expect(result?.id).toBe('sc1');
    expect(result?.mode).toBe('discovery');
    expect(result?.title).toEqual({ en: 'Career A' });
    expect(result?.discoveryData.careerPath).toBe('data_analyst');
    expect(result?.discoveryData.requiredSkills).toEqual(['sql', 'python']);
    // defaults present
    expect(result?.discoveryData.industryInsights).toEqual({});
    expect(result?.discoveryData.careerLevel).toBe('entry');
  });

  it('findCareerPathBySlug returns null when no rows', async () => {
    client.query.mockResolvedValueOnce({ rows: [] });
    const result = await repo.findCareerPathBySlug('missing');
    expect(result).toBeNull();
  });

  it('findCareerPaths maps multiple rows and sorts by created_at desc in query', async () => {
    const rowA = scenarioRow({ id: 'scA', source_id: 'slug-a' });
    const rowB = scenarioRow({ id: 'scB', source_id: 'slug-b' });
    client.query.mockResolvedValueOnce({ rows: [rowA, rowB] });
    const list = await repo.findCareerPaths();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(2);
    expect(list[0].id).toBe('scA');
    expect(list[1].id).toBe('scB');
    expect(list[0].taskTemplates[0]).toEqual(
      expect.objectContaining({ id: 't1', title: { en: 'Task 1' }, type: 'question' })
    );
  });

  it('maps minimal discovery_data with defaults (empty requiredSkills, default careerLevel)', async () => {
    client.query.mockResolvedValueOnce({ rows: [scenarioRow({ discovery_data: {} })] });
    const result = await repo.findCareerPathById('sc1');
    expect(result?.discoveryData.requiredSkills).toEqual([]);
    expect(result?.discoveryData.careerLevel).toBe('intermediate');
    expect(result?.discoveryData.careerPath).toBe('');
  });
});