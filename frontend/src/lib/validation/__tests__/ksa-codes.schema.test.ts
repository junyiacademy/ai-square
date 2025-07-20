import { z } from 'zod';
import { 
  ksaCodesFileSchema, 
  extractKSAIds,
  type KSACodesFile 
} from '../schemas/ksa-codes.schema';

describe('KSA Codes Schema Validation', () => {
  describe('ksaCodesFileSchema', () => {
    it('應該驗證有效的 KSA codes 檔案結構', () => {
      const validKSAFile = {
        knowledge_codes: {
          description: 'Knowledge codes description',
          description_zhTW: '知識代碼描述',
          description_es: 'Descripción de códigos de conocimiento',
          description_ja: '知識コードの説明',
          description_ko: '지식 코드 설명',
          description_fr: 'Description des codes de connaissance',
          description_de: 'Beschreibung der Wissenscodes',
          description_ru: 'Описание кодов знаний',
          description_it: 'Descrizione dei codici di conoscenza',
          themes: {
            'Theme_1': {
              codes: {
                'K1.1': {
                  summary: 'Knowledge summary',
                  summary_zhTW: '知識摘要',
                  summary_es: 'Resumen de conocimiento',
                  summary_ja: '知識の要約',
                  summary_ko: '지식 요약',
                  summary_fr: 'Résumé des connaissances',
                  summary_de: 'Wissenszusammenfassung',
                  summary_ru: 'Краткое изложение знаний',
                  summary_it: 'Riassunto delle conoscenze'
                },
                'K1.2': {
                  summary: 'Another knowledge summary',
                  summary_zhTW: '另一個知識摘要',
                  summary_es: 'Otro resumen de conocimiento',
                  summary_ja: '別の知識の要約',
                  summary_ko: '또 다른 지식 요약',
                  summary_fr: 'Un autre résumé des connaissances',
                  summary_de: 'Eine weitere Wissenszusammenfassung',
                  summary_ru: 'Еще одно краткое изложение знаний',
                  summary_it: 'Un altro riassunto delle conoscenze'
                }
              }
            }
          }
        },
        skills_codes: {
          description: 'Skills codes description',
          description_zhTW: '技能代碼描述',
          description_es: 'Descripción de códigos de habilidades',
          description_ja: 'スキルコードの説明',
          description_ko: '기술 코드 설명',
          description_fr: 'Description des codes de compétences',
          description_de: 'Beschreibung der Fertigkeitscodes',
          description_ru: 'Описание кодов навыков',
          description_it: 'Descrizione dei codici di competenze',
          themes: {
            'Theme_1': {
              codes: {
                'S1.1': {
                  summary: 'Skill summary',
                  summary_zhTW: '技能摘要',
                  summary_es: 'Resumen de habilidad',
                  summary_ja: 'スキルの要約',
                  summary_ko: '기술 요약',
                  summary_fr: 'Résumé des compétences',
                  summary_de: 'Fertigkeitszusammenfassung',
                  summary_ru: 'Краткое изложение навыков',
                  summary_it: 'Riassunto delle competenze'
                }
              }
            }
          }
        },
        attitudes_codes: {
          description: 'Attitudes codes description',
          description_zhTW: '態度代碼描述',
          description_es: 'Descripción de códigos de actitudes',
          description_ja: '態度コードの説明',
          description_ko: '태도 코드 설명',
          description_fr: 'Description des codes d\'attitudes',
          description_de: 'Beschreibung der Einstellungscodes',
          description_ru: 'Описание кодов отношений',
          description_it: 'Descrizione dei codici di atteggiamenti',
          themes: {
            'Theme_1': {
              codes: {
                'A1.1': {
                  summary: 'Attitude summary',
                  summary_zhTW: '態度摘要',
                  summary_es: 'Resumen de actitud',
                  summary_ja: '態度の要約',
                  summary_ko: '태도 요약',
                  summary_fr: 'Résumé des attitudes',
                  summary_de: 'Einstellungszusammenfassung',
                  summary_ru: 'Краткое изложение отношений',
                  summary_it: 'Riassunto degli atteggiamenti'
                }
              }
            }
          }
        }
      };

      const result = ksaCodesFileSchema.safeParse(validKSAFile);
      expect(result.success).toBe(true);
    });

    it('應該拒絕缺少必要欄位的檔案', () => {
      const invalidFile = {
        knowledge_codes: {
          description: 'Knowledge codes description',
          // Missing other language descriptions
          themes: {}
        },
        skills_codes: {
          description: 'Skills codes description',
          description_zhTW: '技能代碼描述',
          description_es: 'Descripción',
          description_ja: '説明',
          description_ko: '설명',
          description_fr: 'Description',
          description_de: 'Beschreibung',
          description_ru: 'Описание',
          description_it: 'Descrizione',
          themes: {}
        }
        // Missing attitudes_codes
      };

      const result = ksaCodesFileSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
    });

    it('應該驗證 KSA code ID 格式', () => {
      const fileWithInvalidIds = {
        knowledge_codes: {
          description: 'Knowledge codes description',
          description_zhTW: '知識代碼描述',
          description_es: 'Descripción',
          description_ja: '説明',
          description_ko: '설명',
          description_fr: 'Description',
          description_de: 'Beschreibung',
          description_ru: 'Описание',
          description_it: 'Descrizione',
          themes: {
            'Theme_1': {
              codes: {
                'INVALID_ID': { // Should be K#.#
                  summary: 'Summary',
                  summary_zhTW: '摘要',
                  summary_es: 'Resumen',
                  summary_ja: '要約',
                  summary_ko: '요약',
                  summary_fr: 'Résumé',
                  summary_de: 'Zusammenfassung',
                  summary_ru: 'Резюме',
                  summary_it: 'Riassunto'
                }
              }
            }
          }
        },
        skills_codes: {
          description: 'Skills codes description',
          description_zhTW: '技能代碼描述',
          description_es: 'Descripción',
          description_ja: '説明',
          description_ko: '설명',
          description_fr: 'Description',
          description_de: 'Beschreibung',
          description_ru: 'Описание',
          description_it: 'Descrizione',
          themes: {}
        },
        attitudes_codes: {
          description: 'Attitudes codes description',
          description_zhTW: '態度代碼描述',
          description_es: 'Descripción',
          description_ja: '説明',
          description_ko: '설명',
          description_fr: 'Description',
          description_de: 'Beschreibung',
          description_ru: 'Описание',
          description_it: 'Descrizione',
          themes: {}
        }
      };

      const result = ksaCodesFileSchema.safeParse(fileWithInvalidIds);
      expect(result.success).toBe(false);
    });

    it('應該允許多個主題和多個代碼', () => {
      const fileWithMultipleThemes = {
        knowledge_codes: {
          description: 'Knowledge codes description',
          description_zhTW: '知識代碼描述',
          description_es: 'Descripción',
          description_ja: '説明',
          description_ko: '설명',
          description_fr: 'Description',
          description_de: 'Beschreibung',
          description_ru: 'Описание',
          description_it: 'Descrizione',
          themes: {
            'Theme_1': {
              codes: {
                'K1.1': {
                  summary: 'Summary 1.1',
                  summary_zhTW: '摘要 1.1',
                  summary_es: 'Resumen 1.1',
                  summary_ja: '要約 1.1',
                  summary_ko: '요약 1.1',
                  summary_fr: 'Résumé 1.1',
                  summary_de: 'Zusammenfassung 1.1',
                  summary_ru: 'Резюме 1.1',
                  summary_it: 'Riassunto 1.1'
                },
                'K1.2': {
                  summary: 'Summary 1.2',
                  summary_zhTW: '摘要 1.2',
                  summary_es: 'Resumen 1.2',
                  summary_ja: '要約 1.2',
                  summary_ko: '요약 1.2',
                  summary_fr: 'Résumé 1.2',
                  summary_de: 'Zusammenfassung 1.2',
                  summary_ru: 'Резюме 1.2',
                  summary_it: 'Riassunto 1.2'
                }
              }
            },
            'Theme_2': {
              codes: {
                'K2.1': {
                  summary: 'Summary 2.1',
                  summary_zhTW: '摘要 2.1',
                  summary_es: 'Resumen 2.1',
                  summary_ja: '要約 2.1',
                  summary_ko: '요약 2.1',
                  summary_fr: 'Résumé 2.1',
                  summary_de: 'Zusammenfassung 2.1',
                  summary_ru: 'Резюме 2.1',
                  summary_it: 'Riassunto 2.1'
                }
              }
            }
          }
        },
        skills_codes: {
          description: 'Skills codes description',
          description_zhTW: '技能代碼描述',
          description_es: 'Descripción',
          description_ja: '説明',
          description_ko: '설명',
          description_fr: 'Description',
          description_de: 'Beschreibung',
          description_ru: 'Описание',
          description_it: 'Descrizione',
          themes: {
            'Theme_1': {
              codes: {
                'S1.1': {
                  summary: 'Skill 1.1',
                  summary_zhTW: '技能 1.1',
                  summary_es: 'Habilidad 1.1',
                  summary_ja: 'スキル 1.1',
                  summary_ko: '기술 1.1',
                  summary_fr: 'Compétence 1.1',
                  summary_de: 'Fertigkeit 1.1',
                  summary_ru: 'Навык 1.1',
                  summary_it: 'Competenza 1.1'
                }
              }
            }
          }
        },
        attitudes_codes: {
          description: 'Attitudes codes description',
          description_zhTW: '態度代碼描述',
          description_es: 'Descripción',
          description_ja: '説明',
          description_ko: '설명',
          description_fr: 'Description',
          description_de: 'Beschreibung',
          description_ru: 'Описание',
          description_it: 'Descrizione',
          themes: {
            'Theme_1': {
              codes: {
                'A1.1': {
                  summary: 'Attitude 1.1',
                  summary_zhTW: '態度 1.1',
                  summary_es: 'Actitud 1.1',
                  summary_ja: '態度 1.1',
                  summary_ko: '태도 1.1',
                  summary_fr: 'Attitude 1.1',
                  summary_de: 'Einstellung 1.1',
                  summary_ru: 'Отношение 1.1',
                  summary_it: 'Atteggiamento 1.1'
                }
              }
            }
          }
        }
      };

      const result = ksaCodesFileSchema.safeParse(fileWithMultipleThemes);
      expect(result.success).toBe(true);
    });
  });

  describe('extractKSAIds', () => {
    const createValidKSAFile = (): KSACodesFile => ({
      knowledge_codes: {
        description: 'Knowledge codes',
        description_zhTW: '知識代碼',
        description_es: 'Códigos de conocimiento',
        description_ja: '知識コード',
        description_ko: '지식 코드',
        description_fr: 'Codes de connaissance',
        description_de: 'Wissenscodes',
        description_ru: 'Коды знаний',
        description_it: 'Codici di conoscenza',
        themes: {
          'Theme_1': {
            codes: {
              'K1.1': {
                summary: 'Knowledge 1.1',
                summary_zhTW: '知識 1.1',
                summary_es: 'Conocimiento 1.1',
                summary_ja: '知識 1.1',
                summary_ko: '지식 1.1',
                summary_fr: 'Connaissance 1.1',
                summary_de: 'Wissen 1.1',
                summary_ru: 'Знание 1.1',
                summary_it: 'Conoscenza 1.1'
              },
              'K1.2': {
                summary: 'Knowledge 1.2',
                summary_zhTW: '知識 1.2',
                summary_es: 'Conocimiento 1.2',
                summary_ja: '知識 1.2',
                summary_ko: '지식 1.2',
                summary_fr: 'Connaissance 1.2',
                summary_de: 'Wissen 1.2',
                summary_ru: 'Знание 1.2',
                summary_it: 'Conoscenza 1.2'
              }
            }
          },
          'Theme_2': {
            codes: {
              'K2.1': {
                summary: 'Knowledge 2.1',
                summary_zhTW: '知識 2.1',
                summary_es: 'Conocimiento 2.1',
                summary_ja: '知識 2.1',
                summary_ko: '지식 2.1',
                summary_fr: 'Connaissance 2.1',
                summary_de: 'Wissen 2.1',
                summary_ru: 'Знание 2.1',
                summary_it: 'Conoscenza 2.1'
              }
            }
          }
        }
      },
      skills_codes: {
        description: 'Skills codes',
        description_zhTW: '技能代碼',
        description_es: 'Códigos de habilidades',
        description_ja: 'スキルコード',
        description_ko: '기술 코드',
        description_fr: 'Codes de compétences',
        description_de: 'Fertigkeitscodes',
        description_ru: 'Коды навыков',
        description_it: 'Codici di competenze',
        themes: {
          'Theme_1': {
            codes: {
              'S1.1': {
                summary: 'Skill 1.1',
                summary_zhTW: '技能 1.1',
                summary_es: 'Habilidad 1.1',
                summary_ja: 'スキル 1.1',
                summary_ko: '기술 1.1',
                summary_fr: 'Compétence 1.1',
                summary_de: 'Fertigkeit 1.1',
                summary_ru: 'Навык 1.1',
                summary_it: 'Competenza 1.1'
              },
              'S1.2': {
                summary: 'Skill 1.2',
                summary_zhTW: '技能 1.2',
                summary_es: 'Habilidad 1.2',
                summary_ja: 'スキル 1.2',
                summary_ko: '기술 1.2',
                summary_fr: 'Compétence 1.2',
                summary_de: 'Fertigkeit 1.2',
                summary_ru: 'Навык 1.2',
                summary_it: 'Competenza 1.2'
              }
            }
          }
        }
      },
      attitudes_codes: {
        description: 'Attitudes codes',
        description_zhTW: '態度代碼',
        description_es: 'Códigos de actitudes',
        description_ja: '態度コード',
        description_ko: '태도 코드',
        description_fr: 'Codes d\'attitudes',
        description_de: 'Einstellungscodes',
        description_ru: 'Коды отношений',
        description_it: 'Codici di atteggiamenti',
        themes: {
          'Theme_1': {
            codes: {
              'A1.1': {
                summary: 'Attitude 1.1',
                summary_zhTW: '態度 1.1',
                summary_es: 'Actitud 1.1',
                summary_ja: '態度 1.1',
                summary_ko: '태도 1.1',
                summary_fr: 'Attitude 1.1',
                summary_de: 'Einstellung 1.1',
                summary_ru: 'Отношение 1.1',
                summary_it: 'Atteggiamento 1.1'
              }
            }
          },
          'Theme_2': {
            codes: {
              'A2.1': {
                summary: 'Attitude 2.1',
                summary_zhTW: '態度 2.1',
                summary_es: 'Actitud 2.1',
                summary_ja: '態度 2.1',
                summary_ko: '태도 2.1',
                summary_fr: 'Attitude 2.1',
                summary_de: 'Einstellung 2.1',
                summary_ru: 'Отношение 2.1',
                summary_it: 'Atteggiamento 2.1'
              }
            }
          }
        }
      }
    });

    it('應該正確提取所有 KSA IDs', () => {
      const ksaFile = createValidKSAFile();
      const result = extractKSAIds(ksaFile);
      
      expect(result.knowledgeIds).toEqual(['K1.1', 'K1.2', 'K2.1']);
      expect(result.skillIds).toEqual(['S1.1', 'S1.2']);
      expect(result.attitudeIds).toEqual(['A1.1', 'A2.1']);
    });

    it('應該處理空的主題', () => {
      const ksaFile: KSACodesFile = {
        knowledge_codes: {
          description: 'Knowledge codes',
          description_zhTW: '知識代碼',
          description_es: 'Códigos',
          description_ja: 'コード',
          description_ko: '코드',
          description_fr: 'Codes',
          description_de: 'Codes',
          description_ru: 'Коды',
          description_it: 'Codici',
          themes: {}
        },
        skills_codes: {
          description: 'Skills codes',
          description_zhTW: '技能代碼',
          description_es: 'Códigos',
          description_ja: 'コード',
          description_ko: '코드',
          description_fr: 'Codes',
          description_de: 'Codes',
          description_ru: 'Коды',
          description_it: 'Codici',
          themes: {}
        },
        attitudes_codes: {
          description: 'Attitudes codes',
          description_zhTW: '態度代碼',
          description_es: 'Códigos',
          description_ja: 'コード',
          description_ko: '코드',
          description_fr: 'Codes',
          description_de: 'Codes',
          description_ru: 'Коды',
          description_it: 'Codici',
          themes: {}
        }
      };
      
      const result = extractKSAIds(ksaFile);
      
      expect(result.knowledgeIds).toEqual([]);
      expect(result.skillIds).toEqual([]);
      expect(result.attitudeIds).toEqual([]);
    });

    it('應該不重複相同的 IDs', () => {
      const ksaFile = createValidKSAFile();
      // 添加重複的 ID 到不同主題
      ksaFile.knowledge_codes.themes['Theme_3'] = {
        codes: {
          'K1.1': { // 重複的 ID
            summary: 'Duplicate',
            summary_zhTW: '重複',
            summary_es: 'Duplicado',
            summary_ja: '重複',
            summary_ko: '중복',
            summary_fr: 'Dupliqué',
            summary_de: 'Dupliziert',
            summary_ru: 'Дубликат',
            summary_it: 'Duplicato'
          }
        }
      };
      
      const result = extractKSAIds(ksaFile);
      
      // K1.1 應該只出現一次
      const k11Count = result.knowledgeIds.filter((id: string) => id === 'K1.1').length;
      expect(k11Count).toBe(1);
    });
  });
});