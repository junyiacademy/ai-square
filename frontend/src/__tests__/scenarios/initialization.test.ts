/**
 * Scenario Initialization Tests
 * 測試 YAML → Scenarios 資料庫初始化流程
 * 
 * TDD: Red → Green → Refactor
 */

import { Pool } from 'pg';
import { PostgreSQLScenarioRepository } from '@/lib/repositories/postgresql/scenario-repository';
import type { IScenario } from '@/types/unified-learning';

describe('Scenario Initialization', () => {
  let pool: Pool;
  let scenarioRepo: PostgreSQLScenarioRepository;

  beforeAll(async () => {
    // 使用測試資料庫
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'ai_square_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    scenarioRepo = new PostgreSQLScenarioRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Assessment Scenarios', () => {
    it('should have assessment scenarios loaded from YAML', async () => {
      // Act
      const scenarios = await scenarioRepo.findByMode('assessment');

      // Assert
      expect(scenarios.length).toBeGreaterThan(0);
      expect(scenarios[0].mode).toBe('assessment');
    });

    it('should have multilingual titles for assessment scenarios', async () => {
      // Act
      const scenarios = await scenarioRepo.findByMode('assessment');
      const scenario = scenarios[0];

      // Assert
      expect(scenario.title).toBeDefined();
      expect(scenario.title.en).toBeDefined();
      expect(scenario.title.zhTW).toBeDefined();
      expect(scenario.title.en).not.toBe('');
      expect(scenario.title.zhTW).not.toBe('');
    });

    it('should have proper source reference for YAML files', async () => {
      // Act
      const scenarios = await scenarioRepo.findByMode('assessment');
      const scenario = scenarios[0];

      // Assert
      expect(scenario.sourceType).toBe('yaml');
      expect(scenario.sourcePath).toContain('.yaml');
      expect(scenario.sourceMetadata).toBeDefined();
    });

    it('should have assessment-specific data', async () => {
      // Act
      const scenarios = await scenarioRepo.findByMode('assessment');
      const scenario = scenarios[0];

      // Assert
      expect(scenario.assessmentData).toBeDefined();
      expect(scenario.assessmentData?.passingScore).toBeGreaterThan(0);
      expect(scenario.assessmentData?.totalQuestions).toBeGreaterThan(0);
      expect(scenario.assessmentData?.domains).toBeDefined();
    });
  });

  describe('PBL Scenarios', () => {
    it('should have PBL scenarios loaded from YAML', async () => {
      // Act
      const scenarios = await scenarioRepo.findByMode('pbl');

      // Assert
      expect(scenarios.length).toBeGreaterThan(0);
      expect(scenarios[0].mode).toBe('pbl');
    });

    it('should have KSA mappings for PBL scenarios', async () => {
      // Act
      const scenarios = await scenarioRepo.findByMode('pbl');
      const scenario = scenarios[0];

      // Assert
      expect(scenario.pblData).toBeDefined();
      expect(scenario.pblData?.ksaMapping).toBeDefined();
      expect((scenario.pblData?.ksaMapping as Record<string, unknown>)?.knowledge).toBeInstanceOf(Array);
      expect((scenario.pblData?.ksaMapping as Record<string, unknown>)?.skills).toBeInstanceOf(Array);
      expect((scenario.pblData?.ksaMapping as Record<string, unknown>)?.attitudes).toBeInstanceOf(Array);
    });

    it('should have AI modules configuration', async () => {
      // Act
      const scenarios = await scenarioRepo.findByMode('pbl');
      const scenario = scenarios[0];

      // Assert
      expect(scenario.aiModules).toBeDefined();
      expect(scenario.aiModules?.tutor).toBeDefined();
      expect((scenario.aiModules?.tutor as Record<string, unknown>)?.enabled).toBe(true);
      expect((scenario.aiModules?.tutor as Record<string, unknown>)?.model).toBe('gemini-2.5-flash');
    });
  });

  describe('Discovery Scenarios', () => {
    it('should have discovery scenarios loaded', async () => {
      // Act
      const scenarios = await scenarioRepo.findByMode('discovery');

      // Assert
      expect(scenarios.length).toBeGreaterThan(0);
      expect(scenarios[0].mode).toBe('discovery');
    });

    it('should have career paths and exploration data', async () => {
      // Act
      const scenarios = await scenarioRepo.findByMode('discovery');
      const scenario = scenarios[0];

      // Assert
      expect(scenario.discoveryData).toBeDefined();
      expect((scenario.discoveryData as Record<string, unknown>)?.careerPaths).toBeInstanceOf(Array);
      expect(((scenario.discoveryData as Record<string, unknown>)?.careerPaths as Array<unknown>).length).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity', () => {
    it('should have unique IDs for all scenarios', async () => {
      // Act
      const allScenarios = await scenarioRepo.findAll();
      const ids = allScenarios.map(s => s.id);
      const uniqueIds = new Set(ids);

      // Assert
      expect(ids.length).toBe(uniqueIds.size);
    });

    it('should have valid task templates', async () => {
      // Act
      const allScenarios = await scenarioRepo.findAll();

      // Assert
      allScenarios.forEach(scenario => {
        expect(scenario.taskTemplates).toBeInstanceOf(Array);
        
        scenario.taskTemplates.forEach(template => {
          expect(template.id).toBeDefined();
          expect(template.title).toBeDefined();
          expect(template.type).toMatch(/^(question|chat|creation|analysis|exploration|research|interaction)$/);
        });
      });
    });

    it('should have proper timestamps', async () => {
      // Act
      const allScenarios = await scenarioRepo.findAll();

      // Assert
      allScenarios.forEach(scenario => {
        expect(scenario.createdAt).toBeDefined();
        expect(scenario.updatedAt).toBeDefined();
        expect(new Date(scenario.createdAt)).toBeInstanceOf(Date);
        expect(new Date(scenario.updatedAt)).toBeInstanceOf(Date);
      });
    });
  });

  describe('Query Performance', () => {
    it('should find scenarios by source path efficiently', async () => {
      // Arrange
      const startTime = Date.now();

      // Act
      const scenario = await scenarioRepo.findBySourcePath('assessment_data/ai_literacy/questions_en.yaml');
      const duration = Date.now() - startTime;

      // Assert
      expect(scenario).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be fast with proper indexing
    });

    it('should support pagination for large datasets', async () => {
      // Act
      const page1 = await scenarioRepo.findAll({ limit: 10, offset: 0 });
      const page2 = await scenarioRepo.findAll({ limit: 10, offset: 10 });

      // Assert
      expect(page1.length).toBeLessThanOrEqual(10);
      expect(page2.length).toBeLessThanOrEqual(10);
      
      // Ensure different results
      if (page1.length > 0 && page2.length > 0) {
        expect(page1[0].id).not.toBe(page2[0].id);
      }
    });
  });
});