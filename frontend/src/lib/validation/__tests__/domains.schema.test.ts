import { z } from 'zod';
import { 
  domainsFileSchema, 
  validateKSAReferences,
  type DomainsFile 
} from '../schemas/domains.schema';

describe('Domains Schema Validation', () => {
  describe('domainsFileSchema', () => {
    it('應該驗證有效的 domains 檔案結構', () => {
      const validDomainsFile = {
        domains: {
          Engaging_with_AI: {
            emoji: '🤝',
            overview: 'Overview text',
            overview_zhTW: '概覽文字',
            overview_es: 'Texto de resumen',
            overview_ja: '概要テキスト',
            overview_ko: '개요 텍스트',
            overview_fr: 'Texte de présentation',
            overview_de: 'Übersichtstext',
            overview_ru: 'Обзорный текст',
            overview_it: 'Testo di panoramica',
            competencies: {
              'C1.1': {
                description: 'Competency description',
                description_zhTW: '能力描述',
                description_es: 'Descripción de competencia',
                description_ja: 'コンピテンシーの説明',
                description_ko: '역량 설명',
                description_fr: 'Description de compétence',
                description_de: 'Kompetenzbeschreibung',
                description_ru: 'Описание компетенции',
                description_it: 'Descrizione della competenza',
                knowledge: ['K1.1', 'K1.2'],
                skills: ['S1.1'],
                attitudes: ['A1.1'],
                content: 'Content text',
                content_zhTW: '內容文字',
                content_es: 'Texto de contenido',
                content_ja: 'コンテンツテキスト',
                content_ko: '콘텐츠 텍스트',
                content_fr: 'Texte du contenu',
                content_de: 'Inhaltstext',
                content_ru: 'Текст содержания',
                content_it: 'Testo del contenuto',
                scenarios: ["Scenario 1", "Scenario 2"],
                scenarios_zhTW: ["情境 1", "情境 2"],
                scenarios_es: ["Escenario 1", "Escenario 2"],
                scenarios_ja: ["シナリオ 1", "シナリオ 2"],
                scenarios_ko: ["시나리오 1", "시나리오 2"],
                scenarios_fr: ["Scénario 1", "Scénario 2"],
                scenarios_de: ["Szenario 1", "Szenario 2"],
                scenarios_ru: ["Сценарий 1", "Сценарий 2"],
                scenarios_it: ["Scenario 1", "Scenario 2"]
              }
            }
          },
          Creating_with_AI: {
            emoji: '🎨',
            overview: 'Creating overview',
            overview_zhTW: '創作概覽',
            overview_es: 'Resumen de creación',
            overview_ja: '創造の概要',
            overview_ko: '창작 개요',
            overview_fr: 'Aperçu de création',
            overview_de: 'Erstellungsübersicht',
            overview_ru: 'Обзор создания',
            overview_it: 'Panoramica della creazione',
            competencies: {}
          },
          Managing_with_AI: {
            emoji: '📊',
            overview: 'Managing overview',
            overview_zhTW: '管理概覽',
            overview_es: 'Resumen de gestión',
            overview_ja: '管理の概要',
            overview_ko: '관리 개요',
            overview_fr: 'Aperçu de gestion',
            overview_de: 'Verwaltungsübersicht',
            overview_ru: 'Обзор управления',
            overview_it: 'Panoramica della gestione',
            competencies: {}
          },
          Designing_with_AI: {
            emoji: '🏗️',
            overview: 'Designing overview',
            overview_zhTW: '設計概覽',
            overview_es: 'Resumen de diseño',
            overview_ja: 'デザインの概要',
            overview_ko: '설계 개요',
            overview_fr: 'Aperçu de conception',
            overview_de: 'Entwurfsübersicht',
            overview_ru: 'Обзор проектирования',
            overview_it: 'Panoramica del design',
            competencies: {}
          }
        }
      };

      const result = domainsFileSchema.safeParse(validDomainsFile);
      expect(result.success).toBe(true);
      if (result.success) {
        // Check scenarios are arrays
        const competency = result.data.domains.Engaging_with_AI.competencies['C1.1'];
        expect(Array.isArray(competency.scenarios)).toBe(true);
        expect(competency.scenarios).toEqual(['Scenario 1', 'Scenario 2']);
      }
    });

    it('應該拒絕缺少必要領域的檔案', () => {
      const invalidFile = {
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
          }
          // Missing other required domains
        }
      };

      const result = domainsFileSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
    });

    it('應該驗證 competency 的 KSA 參考格式', () => {
      const fileWithInvalidKSA = {
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
            competencies: {
              'C1.1': {
                description: 'Description',
                description_zhTW: '描述',
                description_es: 'Descripción',
                description_ja: '説明',
                description_ko: '설명',
                description_fr: 'Description',
                description_de: 'Beschreibung',
                description_ru: 'Описание',
                description_it: 'Descrizione',
                knowledge: ['INVALID_K'], // Invalid format
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
              }
            }
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

      const result = domainsFileSchema.safeParse(fileWithInvalidKSA);
      expect(result.success).toBe(false);
    });

    it('應該處理 scenarios 字串轉換為陣列', () => {
      const fileWithScenarios = {
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
            competencies: {
              'C1.1': {
                description: 'Description',
                description_zhTW: '描述',
                description_es: 'Descripción',
                description_ja: '説明',
                description_ko: '설명',
                description_fr: 'Description',
                description_de: 'Beschreibung',
                description_ru: 'Описание',
                description_it: 'Descrizione',
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
                scenarios: 'Scenario 1\nScenario 2\nScenario 3', // Newline separated
                scenarios_zhTW: '["情境 1", "情境 2"]', // JSON array
                scenarios_es: 'Escenario 1\nEscenario 2',
                scenarios_ja: '["シナリオ 1"]',
                scenarios_ko: '시나리오 1',
                scenarios_fr: '["Scénario 1", "Scénario 2"]',
                scenarios_de: 'Szenario 1\nSzenario 2',
                scenarios_ru: '["Сценарий 1"]',
                scenarios_it: 'Scenario 1'
              }
            }
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

      const result = domainsFileSchema.safeParse(fileWithScenarios);
      expect(result.success).toBe(true);
      if (result.success) {
        const competency = result.data.domains.Engaging_with_AI.competencies['C1.1'];
        // Check newline-separated conversion
        expect(competency.scenarios).toEqual(['Scenario 1', 'Scenario 2', 'Scenario 3']);
        // Check JSON array conversion
        expect(competency.scenarios_zhTW).toEqual(['情境 1', '情境 2']);
        // Check single line conversion
        expect(competency.scenarios_ko).toEqual(['시나리오 1']);
      }
    });
  });

  describe('validateKSAReferences', () => {
    const validKSAIds = {
      knowledgeIds: ['K1.1', 'K1.2', 'K2.1'],
      skillIds: ['S1.1', 'S1.2', 'S2.1'],
      attitudeIds: ['A1.1', 'A1.2', 'A2.1']
    };

    const createValidDomainsFile = (): DomainsFile => ({
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
          competencies: {
            'C1.1': {
              description: 'Description',
              description_zhTW: '描述',
              description_es: 'Descripción',
              description_ja: '説明',
              description_ko: '설명',
              description_fr: 'Description',
              description_de: 'Beschreibung',
              description_ru: 'Описание',
              description_it: 'Descrizione',
              knowledge: ['K1.1', 'K1.2'],
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
              scenarios: ['Scenario 1'],
              scenarios_zhTW: ['情境 1'],
              scenarios_es: ['Escenario 1'],
              scenarios_ja: ['シナリオ 1'],
              scenarios_ko: ['시나리오 1'],
              scenarios_fr: ['Scénario 1'],
              scenarios_de: ['Szenario 1'],
              scenarios_ru: ['Сценарий 1'],
              scenarios_it: ['Scenario 1']
            }
          }
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
    });

    it('應該驗證有效的 KSA 參考', () => {
      const domainsFile = createValidDomainsFile();
      const result = validateKSAReferences(domainsFile, validKSAIds);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('應該檢測無效的 knowledge 參考', () => {
      const domainsFile = createValidDomainsFile();
      domainsFile.domains.Engaging_with_AI.competencies['C1.1'].knowledge = ['K1.1', 'K9.9'];
      
      const result = validateKSAReferences(domainsFile, validKSAIds);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid knowledge reference K9.9 in Engaging_with_AI.C1.1');
    });

    it('應該檢測無效的 skills 參考', () => {
      const domainsFile = createValidDomainsFile();
      domainsFile.domains.Engaging_with_AI.competencies['C1.1'].skills = ['S1.1', 'S9.9'];
      
      const result = validateKSAReferences(domainsFile, validKSAIds);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid skill reference S9.9 in Engaging_with_AI.C1.1');
    });

    it('應該檢測無效的 attitudes 參考', () => {
      const domainsFile = createValidDomainsFile();
      domainsFile.domains.Engaging_with_AI.competencies['C1.1'].attitudes = ['A1.1', 'A9.9'];
      
      const result = validateKSAReferences(domainsFile, validKSAIds);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid attitude reference A9.9 in Engaging_with_AI.C1.1');
    });

    it('應該檢測多個錯誤', () => {
      const domainsFile = createValidDomainsFile();
      domainsFile.domains.Engaging_with_AI.competencies['C1.1'].knowledge = ['K9.9'];
      domainsFile.domains.Engaging_with_AI.competencies['C1.1'].skills = ['S9.9'];
      domainsFile.domains.Engaging_with_AI.competencies['C1.1'].attitudes = ['A9.9'];
      
      const result = validateKSAReferences(domainsFile, validKSAIds);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });
});