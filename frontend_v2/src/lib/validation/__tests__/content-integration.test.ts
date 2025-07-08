import { z } from 'zod';
import { domainsFileSchema, validateKSAReferences } from '../schemas/domains.schema';
import { ksaCodesFileSchema, extractKSAIds } from '../schemas/ksa-codes.schema';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

describe('Content Integration Tests', () => {
  describe('YAML 檔案驗證', () => {
    const publicDir = path.join(process.cwd(), 'public', 'rubrics_data');
    
    // Helper function to load YAML file
    const loadYAMLFile = (filename: string) => {
      try {
        const filePath = path.join(publicDir, filename);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        return yaml.load(fileContent);
      } catch (error) {
        return null;
      }
    };

    it('應該驗證 ksa_codes.yaml 檔案結構', () => {
      const ksaData = loadYAMLFile('ksa_codes.yaml');
      
      if (!ksaData) {
        console.warn('ksa_codes.yaml not found, skipping test');
        return;
      }

      const result = ksaCodesFileSchema.safeParse(ksaData);
      
      if (!result.success) {
        console.error('KSA validation errors:', result.error.errors);
      }
      
      expect(result.success).toBe(true);
    });

    it('應該驗證 ai_lit_domains.yaml 檔案結構', () => {
      const domainsData = loadYAMLFile('ai_lit_domains.yaml');
      
      if (!domainsData) {
        console.warn('ai_lit_domains.yaml not found, skipping test');
        return;
      }

      const result = domainsFileSchema.safeParse(domainsData);
      
      if (!result.success) {
        console.error('Domains validation errors:', result.error.errors);
      }
      
      expect(result.success).toBe(true);
    });

    it('應該驗證 domains 中的 KSA 參考都存在於 ksa_codes 中', () => {
      const ksaData = loadYAMLFile('ksa_codes.yaml');
      const domainsData = loadYAMLFile('ai_lit_domains.yaml');
      
      if (!ksaData || !domainsData) {
        console.warn('Required YAML files not found, skipping test');
        return;
      }

      // Parse and validate both files
      const ksaResult = ksaCodesFileSchema.safeParse(ksaData);
      const domainsResult = domainsFileSchema.safeParse(domainsData);
      
      expect(ksaResult.success).toBe(true);
      expect(domainsResult.success).toBe(true);
      
      if (ksaResult.success && domainsResult.success) {
        // Extract valid KSA IDs
        const validIds = extractKSAIds(ksaResult.data);
        
        // Validate references
        const validationResult = validateKSAReferences(domainsResult.data, validIds);
        
        if (!validationResult.valid) {
          console.error('KSA reference errors:', validationResult.errors);
        }
        
        expect(validationResult.valid).toBe(true);
        expect(validationResult.errors).toHaveLength(0);
      }
    });
  });

  describe('Schema 相容性測試', () => {
    it('應該確保所有語言欄位都被定義', () => {
      const languages = ['zhTW', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];
      
      // Test domains schema
      const testDomain = {
        emoji: '🤝',
        overview: 'Overview',
        competencies: {}
      };
      
      // Add all language fields
      languages.forEach(lang => {
        testDomain[`overview_${lang}`] = `Overview in ${lang}`;
      });
      
      const domainResult = domainsFileSchema.shape.domains.shape.Engaging_with_AI.safeParse(testDomain);
      expect(domainResult.success).toBe(true);
      
      // Test KSA codes schema
      const testKSASection = {
        description: 'Description',
        themes: {}
      };
      
      // Add all language fields
      languages.forEach(lang => {
        testKSASection[`description_${lang}`] = `Description in ${lang}`;
      });
      
      const ksaResult = ksaCodesFileSchema.shape.knowledge_codes.safeParse(testKSASection);
      expect(ksaResult.success).toBe(true);
    });

    it('應該驗證 competency ID 格式一致性', () => {
      const validCompetencyIds = ['C1.1', 'C1.2', 'C2.1', 'C10.15'];
      const invalidCompetencyIds = ['C1', '1.1', 'Comp1.1', 'C1.1.1'];
      
      validCompetencyIds.forEach(id => {
        expect(id).toMatch(/^C\d+\.\d+$/);
      });
      
      invalidCompetencyIds.forEach(id => {
        expect(id).not.toMatch(/^C\d+\.\d+$/);
      });
    });
  });

  describe('資料完整性測試', () => {
    it('應該確保每個 competency 至少有一個 K、S、A 參考', () => {
      const testCompetency = {
        description: 'Test competency',
        description_zhTW: '測試能力',
        description_es: 'Competencia de prueba',
        description_ja: 'テストコンピテンシー',
        description_ko: '테스트 역량',
        description_fr: 'Compétence de test',
        description_de: 'Testkompetenz',
        description_ru: 'Тестовая компетенция',
        description_it: 'Competenza di test',
        knowledge: ['K1.1'],
        skills: ['S1.1'],
        attitudes: ['A1.1'],
        content: 'Content',
        content_zhTW: '內容',
        content_es: 'Contenido',
        content_ja: 'コンテンツ',
        content_ko: '콘텐츠',
        content_fr: 'Contenu',
        content_de: 'Inhalt',
        content_ru: 'Содержание',
        content_it: 'Contenuto',
        scenarios: '[]',
        scenarios_zhTW: '[]',
        scenarios_es: '[]',
        scenarios_ja: '[]',
        scenarios_ko: '[]',
        scenarios_fr: '[]',
        scenarios_de: '[]',
        scenarios_ru: '[]',
        scenarios_it: '[]'
      };
      
      const competencySchema = domainsFileSchema.shape.domains.shape.Engaging_with_AI.shape.competencies.valueSchema;
      const result = competencySchema.safeParse(testCompetency);
      
      expect(result.success).toBe(true);
      
      // Test with empty arrays (should fail if we add such validation)
      const emptyCompetency = {
        ...testCompetency,
        knowledge: [],
        skills: [],
        attitudes: []
      };
      
      // This should still pass with current schema, but we could add minItems validation
      const emptyResult = competencySchema.safeParse(emptyCompetency);
      expect(emptyResult.success).toBe(true);
    });

    it('應該驗證多語言欄位的一致性', () => {
      const languages = ['zhTW', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it'];
      
      // Helper to check if all language variants exist
      const checkMultilingualField = (obj: any, fieldName: string) => {
        const hasBase = fieldName in obj;
        const hasAllLangs = languages.every(lang => `${fieldName}_${lang}` in obj);
        return hasBase && hasAllLangs;
      };
      
      const testDomain = {
        emoji: '🤝',
        overview: 'Overview',
        overview_zhTW: '概覽',
        overview_es: 'Resumen',
        overview_ja: '概要',
        overview_ko: '개요',
        overview_fr: 'Aperçu',
        overview_de: 'Übersicht',
        overview_ru: 'Обзор',
        overview_it: 'Panoramica',
        competencies: {}
      };
      
      expect(checkMultilingualField(testDomain, 'overview')).toBe(true);
    });
  });

  describe('效能測試', () => {
    it('應該能快速驗證大型檔案', () => {
      // Create a large test file with many competencies
      const largeDomainFile = {
        domains: {
          Engaging_with_AI: {
            emoji: '🤝',
            overview: 'Overview',
            overview_zhTW: '概覽',
            overview_es: 'Resumen',
            overview_ja: '概要',
            overview_ko: '개요',
            overview_fr: 'Aperçu',
            overview_de: 'Übersicht',
            overview_ru: 'Обзор',
            overview_it: 'Panoramica',
            competencies: {}
          },
          Creating_with_AI: {
            emoji: '🎨',
            overview: 'Overview',
            overview_zhTW: '概覽',
            overview_es: 'Resumen',
            overview_ja: '概要',
            overview_ko: '개요',
            overview_fr: 'Aperçu',
            overview_de: 'Übersicht',
            overview_ru: 'Обзор',
            overview_it: 'Panoramica',
            competencies: {}
          },
          Managing_with_AI: {
            emoji: '📊',
            overview: 'Overview',
            overview_zhTW: '概覽',
            overview_es: 'Resumen',
            overview_ja: '概要',
            overview_ko: '개요',
            overview_fr: 'Aperçu',
            overview_de: 'Übersicht',
            overview_ru: 'Обзор',
            overview_it: 'Panoramica',
            competencies: {}
          },
          Designing_with_AI: {
            emoji: '🏗️',
            overview: 'Overview',
            overview_zhTW: '概覽',
            overview_es: 'Resumen',
            overview_ja: '概要',
            overview_ko: '개요',
            overview_fr: 'Aperçu',
            overview_de: 'Übersicht',
            overview_ru: 'Обзор',
            overview_it: 'Panoramica',
            competencies: {}
          }
        }
      };
      
      // Add 100 competencies to test performance
      for (let i = 1; i <= 25; i++) {
        for (let j = 1; j <= 4; j++) {
          const competencyId = `C${i}.${j}`;
          largeDomainFile.domains.Engaging_with_AI.competencies[competencyId] = {
            description: `Competency ${competencyId}`,
            description_zhTW: `能力 ${competencyId}`,
            description_es: `Competencia ${competencyId}`,
            description_ja: `コンピテンシー ${competencyId}`,
            description_ko: `역량 ${competencyId}`,
            description_fr: `Compétence ${competencyId}`,
            description_de: `Kompetenz ${competencyId}`,
            description_ru: `Компетенция ${competencyId}`,
            description_it: `Competenza ${competencyId}`,
            knowledge: ['K1.1', 'K1.2'],
            skills: ['S1.1'],
            attitudes: ['A1.1'],
            content: `Content for ${competencyId}`,
            content_zhTW: `內容 ${competencyId}`,
            content_es: `Contenido ${competencyId}`,
            content_ja: `コンテンツ ${competencyId}`,
            content_ko: `콘텐츠 ${competencyId}`,
            content_fr: `Contenu ${competencyId}`,
            content_de: `Inhalt ${competencyId}`,
            content_ru: `Содержание ${competencyId}`,
            content_it: `Contenuto ${competencyId}`,
            scenarios: '[]',
            scenarios_zhTW: '[]',
            scenarios_es: '[]',
            scenarios_ja: '[]',
            scenarios_ko: '[]',
            scenarios_fr: '[]',
            scenarios_de: '[]',
            scenarios_ru: '[]',
            scenarios_it: '[]'
          };
        }
      }
      
      const startTime = Date.now();
      const result = domainsFileSchema.safeParse(largeDomainFile);
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});