/**
 * Unit tests for Validation types
 * Tests validation-related type definitions for KSA, domains, assessments, and PBL data structures
 */

import type {
  KSAData,
  KSATheme,
  KSACode,
  DomainsData,
  Domain,
  Competency,
  AssessmentData,
  AssessmentQuestion,
  PBLData,
  PBLStage,
  PBLTask
} from '../validation';

describe('Validation Types', () => {
  describe('KSATheme interface', () => {
    it('should define KSA theme with multi-language support', () => {
      const theme: KSATheme = {
        theme: 'AI Fundamentals',
        theme_zhTW: 'AI基礎',
        theme_zhCN: 'AI基础',
        theme_pt: 'Fundamentos de IA',
        theme_ar: 'أساسيات الذكاء الاصطناعي',
        theme_id: 'Dasar-dasar AI',
        theme_th: 'พื้นฐาน AI',
        theme_es: 'Fundamentos de IA',
        theme_ja: 'AI の基礎',
        theme_ko: 'AI 기초',
        theme_fr: 'Fondamentaux de l\'IA',
        theme_de: 'AI-Grundlagen',
        theme_ru: 'Основы ИИ',
        theme_it: 'Fondamenti di IA'
      };

      expect(theme.theme).toBe('AI Fundamentals');
      expect(theme.theme_zhTW).toBe('AI基礎');
      expect(theme.theme_pt).toBe('Fundamentos de IA');
      expect(theme.theme_es).toBe('Fundamentos de IA');
      expect(theme.theme_ja).toBe('AI の基礎');
      expect(theme.theme_ko).toBe('AI 기초');
      expect(theme.theme_fr).toBe('Fondamentaux de l\'IA');
      expect(theme.theme_de).toBe('AI-Grundlagen');
      expect(theme.theme_ru).toBe('Основы ИИ');
      expect(theme.theme_it).toBe('Fondamenti di IA');
    });

    it('should allow minimal theme with only base language', () => {
      const minimalTheme: KSATheme = {
        theme: 'Basic Theme'
      };

      expect(minimalTheme.theme).toBe('Basic Theme');
      expect(minimalTheme.theme_zhTW).toBeUndefined();
      expect(minimalTheme.theme_es).toBeUndefined();
    });
  });

  describe('KSACode interface', () => {
    it('should define KSA code with complete multi-language support', () => {
      const ksaCode: KSACode = {
        code: 'K1.1',
        name: 'Understanding AI Basics',
        name_zhTW: '了解AI基礎',
        name_zhCN: '了解AI基础',
        name_pt: 'Entendendo os Fundamentos de IA',
        name_ar: 'فهم أساسيات الذكاء الاصطناعي',
        name_id: 'Memahami Dasar-dasar AI',
        name_th: 'เข้าใจพื้นฐาน AI',
        name_es: 'Entendiendo los Fundamentos de IA',
        name_ja: 'AI の基礎を理解する',
        name_ko: 'AI 기초 이해하기',
        name_fr: 'Comprendre les bases de l\'IA',
        name_de: 'AI-Grundlagen verstehen',
        name_ru: 'Понимание основ ИИ',
        name_it: 'Comprendere le basi dell\'IA',
        theme: 'AI Fundamentals'
      };

      expect(ksaCode.code).toBe('K1.1');
      expect(ksaCode.name).toBe('Understanding AI Basics');
      expect(ksaCode.theme).toBe('AI Fundamentals');
      expect(ksaCode.name_zhTW).toBe('了解AI基礎');
      expect(ksaCode.name_pt).toContain('Fundamentos');
      expect(ksaCode.name_ja).toContain('基礎');
    });

    it('should allow KSA code with minimal fields', () => {
      const minimalCode: KSACode = {
        code: 'S2.1',
        name: 'Critical Thinking',
        theme: 'Thinking Skills'
      };

      expect(minimalCode.code).toBe('S2.1');
      expect(minimalCode.name).toBe('Critical Thinking');
      expect(minimalCode.theme).toBe('Thinking Skills');
      expect(minimalCode.name_zhTW).toBeUndefined();
    });
  });

  describe('KSAData interface', () => {
    it('should define complete KSA data structure', () => {
      const ksaData: KSAData = {
        knowledge_codes: {
          themes: {
            'fundamentals': {
              theme: 'AI Fundamentals',
              theme_zhTW: 'AI基礎'
            },
            'ethics': {
              theme: 'AI Ethics',
              theme_zhTW: 'AI倫理'
            }
          },
          codes: {
            'K1.1': {
              code: 'K1.1',
              name: 'Understanding AI',
              name_zhTW: '了解AI',
              theme: 'fundamentals'
            },
            'K2.1': {
              code: 'K2.1',
              name: 'AI Ethics Principles',
              name_zhTW: 'AI倫理原則',
              theme: 'ethics'
            }
          }
        },
        skills_codes: {
          themes: {
            'analysis': {
              theme: 'Analysis Skills',
              theme_zhTW: '分析技能'
            }
          },
          codes: {
            'S1.1': {
              code: 'S1.1',
              name: 'Critical Analysis',
              name_zhTW: '批判性分析',
              theme: 'analysis'
            }
          }
        },
        attitudes_codes: {
          themes: {
            'ethics': {
              theme: 'Ethical Attitudes',
              theme_zhTW: '倫理態度'
            }
          },
          codes: {
            'A1.1': {
              code: 'A1.1',
              name: 'Ethical Awareness',
              name_zhTW: '倫理意識',
              theme: 'ethics'
            }
          }
        }
      };

      expect(ksaData.knowledge_codes?.themes).toBeDefined();
      expect(ksaData.knowledge_codes?.codes).toBeDefined();
      expect(Object.keys(ksaData.knowledge_codes?.themes || {})).toHaveLength(2);
      expect(Object.keys(ksaData.knowledge_codes?.codes || {})).toHaveLength(2);
      expect(ksaData.skills_codes?.codes?.['S1.1'].name).toBe('Critical Analysis');
      expect(ksaData.attitudes_codes?.codes?.['A1.1'].theme).toBe('ethics');
    });

    it('should allow empty KSA data structure', () => {
      const emptyKSAData: KSAData = {};

      expect(emptyKSAData.knowledge_codes).toBeUndefined();
      expect(emptyKSAData.skills_codes).toBeUndefined();
      expect(emptyKSAData.attitudes_codes).toBeUndefined();
    });
  });

  describe('Competency interface', () => {
    it('should define competency with multi-language support and KSA mappings', () => {
      const competency: Competency = {
        name: 'AI System Design',
        name_zhTW: 'AI系統設計',
        name_zhCN: 'AI系统设计',
        name_pt: 'Design de Sistemas de IA',
        name_ar: 'تصميم أنظمة الذكاء الاصطناعي',
        name_id: 'Desain Sistem AI',
        name_th: 'การออกแบบระบบ AI',
        name_es: 'Diseño de Sistemas de IA',
        name_ja: 'AIシステム設計',
        name_ko: 'AI 시스템 설계',
        name_fr: 'Conception de systèmes d\'IA',
        name_de: 'AI-Systemdesign',
        name_ru: 'Проектирование систем ИИ',
        name_it: 'Progettazione di sistemi di IA',
        knowledge: ['K1.1', 'K2.3', 'K3.2'],
        skills: ['S1.1', 'S2.2', 'S3.1'],
        attitudes: ['A1.1', 'A2.1']
      };

      expect(competency.name).toBe('AI System Design');
      expect(competency.name_zhTW).toBe('AI系統設計');
      expect(competency.name_pt).toContain('Sistemas');
      expect(competency.knowledge).toHaveLength(3);
      expect(competency.skills).toHaveLength(3);
      expect(competency.attitudes).toHaveLength(2);
      expect(competency.knowledge).toContain('K1.1');
      expect(competency.skills).toContain('S1.1');
      expect(competency.attitudes).toContain('A1.1');
    });

    it('should allow competency with minimal fields', () => {
      const minimalCompetency: Competency = {
        name: 'Basic Competency'
      };

      expect(minimalCompetency.name).toBe('Basic Competency');
      expect(minimalCompetency.knowledge).toBeUndefined();
      expect(minimalCompetency.skills).toBeUndefined();
      expect(minimalCompetency.attitudes).toBeUndefined();
    });
  });

  describe('Domain interface', () => {
    it('should define domain with competencies', () => {
      const domain: Domain = {
        name: 'Engaging with AI',
        name_zhTW: '與AI互動',
        name_es: 'Interacción con IA',
        name_ja: 'AIとの関わり',
        competencies: {
          'comp1': {
            name: 'AI Interaction',
            name_zhTW: 'AI互動',
            knowledge: ['K1.1'],
            skills: ['S1.1'],
            attitudes: ['A1.1']
          },
          'comp2': {
            name: 'AI Communication',
            name_zhTW: 'AI溝通',
            knowledge: ['K1.2'],
            skills: ['S1.2']
          }
        }
      };

      expect(domain.name).toBe('Engaging with AI');
      expect(domain.name_zhTW).toBe('與AI互動');
      expect(domain.competencies).toBeDefined();
      expect(Object.keys(domain.competencies || {})).toHaveLength(2);
      expect(domain.competencies?.['comp1'].name).toBe('AI Interaction');
      expect(domain.competencies?.['comp2'].knowledge).toContain('K1.2');
    });
  });

  describe('DomainsData interface', () => {
    it('should define domains data structure', () => {
      const domainsData: DomainsData = {
        domains: {
          'engaging_with_ai': {
            name: 'Engaging with AI',
            name_zhTW: '與AI互動',
            competencies: {
              'interaction': {
                name: 'AI Interaction',
                knowledge: ['K1.1'],
                skills: ['S1.1']
              }
            }
          },
          'creating_with_ai': {
            name: 'Creating with AI',
            name_zhTW: '與AI創造',
            competencies: {
              'creation': {
                name: 'AI-Assisted Creation',
                knowledge: ['K2.1'],
                skills: ['S2.1']
              }
            }
          }
        }
      };

      expect(domainsData.domains).toBeDefined();
      expect(Object.keys(domainsData.domains || {})).toHaveLength(2);
      expect(domainsData.domains?.['engaging_with_ai'].name).toBe('Engaging with AI');
      expect(domainsData.domains?.['creating_with_ai'].name_zhTW).toBe('與AI創造');
    });
  });

  describe('AssessmentQuestion interface', () => {
    it('should define assessment question with multi-language support', () => {
      const question: AssessmentQuestion = {
        id: 'q1',
        question: 'What is artificial intelligence?',
        question_zhTW: '什麼是人工智慧？',
        question_zhCN: '什么是人工智能？',
        question_pt: 'O que é inteligência artificial?',
        question_ar: 'ما هو الذكاء الاصطناعي؟',
        question_id: 'Apa itu kecerdasan buatan?',
        question_th: 'ปัญญาประดิษฐ์คืออะไร?',
        question_es: '¿Qué es la inteligencia artificial?',
        question_ja: '人工知能とは何ですか？',
        question_ko: '인공지능이란 무엇인가요?',
        question_fr: 'Qu\'est-ce que l\'intelligence artificielle?',
        question_de: 'Was ist künstliche Intelligenz?',
        question_ru: 'Что такое искусственный интеллект?',
        question_it: 'Cos\'è l\'intelligenza artificiale?',
        domain: 'engaging_with_ai',
        difficulty: 'beginner',
        type: 'multiple_choice',
        options: [
          'A computer program that mimics human intelligence',
          'A robot that looks like a human',
          'A type of advanced calculator',
          'A science fiction concept'
        ],
        correct_answer: 'A computer program that mimics human intelligence'
      };

      expect(question.id).toBe('q1');
      expect(question.question).toBe('What is artificial intelligence?');
      expect(question.question_zhTW).toBe('什麼是人工智慧？');
      expect(question.question_es).toBe('¿Qué es la inteligencia artificial?');
      expect(question.domain).toBe('engaging_with_ai');
      expect(question.difficulty).toBe('beginner');
      expect(question.type).toBe('multiple_choice');
      expect(question.options).toHaveLength(4);
      expect(question.correct_answer).toContain('computer program');
    });

    it('should define different question types', () => {
      const likertQuestion: AssessmentQuestion = {
        id: 'q2',
        question: 'How confident are you with AI tools?',
        domain: 'engaging_with_ai',
        difficulty: 'intermediate',
        type: 'likert_scale',
        options: ['Very Low', 'Low', 'Medium', 'High', 'Very High']
      };

      const trueFalseQuestion: AssessmentQuestion = {
        id: 'q3',
        question: 'AI systems are always objective.',
        domain: 'managing_ai',
        difficulty: 'advanced',
        type: 'true_false',
        correct_answer: 'false'
      };

      expect(likertQuestion.type).toBe('likert_scale');
      expect(likertQuestion.options).toHaveLength(5);
      expect(trueFalseQuestion.type).toBe('true_false');
      expect(trueFalseQuestion.correct_answer).toBe('false');
    });

    it('should allow minimal question structure', () => {
      const minimalQuestion: AssessmentQuestion = {
        id: 'q4',
        question: 'Basic question',
        domain: 'creating_with_ai',
        difficulty: 'beginner',
        type: 'multiple_choice'
      };

      expect(minimalQuestion.id).toBe('q4');
      expect(minimalQuestion.options).toBeUndefined();
      expect(minimalQuestion.correct_answer).toBeUndefined();
    });
  });

  describe('AssessmentData interface', () => {
    it('should define assessment data structure', () => {
      const assessmentData: AssessmentData = {
        questions: [
          {
            id: 'q1',
            question: 'What is AI?',
            domain: 'engaging_with_ai',
            difficulty: 'beginner',
            type: 'multiple_choice'
          },
          {
            id: 'q2',
            question: 'How do you rate AI ethics importance?',
            domain: 'designing_ai',
            difficulty: 'intermediate',
            type: 'likert_scale'
          }
        ]
      };

      expect(assessmentData.questions).toHaveLength(2);
      expect(assessmentData.questions?.[0].id).toBe('q1');
      expect(assessmentData.questions?.[1].type).toBe('likert_scale');
    });

    it('should allow empty assessment data', () => {
      const emptyAssessment: AssessmentData = {};

      expect(emptyAssessment.questions).toBeUndefined();
    });
  });

  describe('PBLTask interface', () => {
    it('should define PBL task structure', () => {
      const pblTask: PBLTask = {
        id: 'task1',
        title: 'Stakeholder Analysis',
        description: 'Identify and analyze stakeholders in the AI healthcare scenario.',
        estimated_duration: 30
      };

      expect(pblTask.id).toBe('task1');
      expect(pblTask.title).toBe('Stakeholder Analysis');
      expect(pblTask.description).toContain('stakeholders');
      expect(pblTask.estimated_duration).toBe(30);
    });
  });

  describe('PBLStage interface', () => {
    it('should define PBL stage with multi-language support', () => {
      const pblStage: PBLStage = {
        id: 'stage1',
        title: 'Analysis Phase',
        title_zhTW: '分析階段',
        title_zhCN: '分析阶段',
        title_pt: 'Fase de Análise',
        title_ar: 'مرحلة التحليل',
        title_id: 'Fase Analisis',
        title_th: 'ขั้นตอนการวิเคราะห์',
        title_es: 'Fase de Análisis',
        title_ja: '分析段階',
        title_ko: '분석 단계',
        title_fr: 'Phase d\'analyse',
        title_de: 'Analysephase',
        title_ru: 'Этап анализа',
        title_it: 'Fase di analisi',
        tasks: [
          {
            id: 'task1',
            title: 'Initial Analysis',
            description: 'Perform initial analysis',
            estimated_duration: 20
          },
          {
            id: 'task2',
            title: 'Deep Dive',
            description: 'Conduct detailed analysis',
            estimated_duration: 40
          }
        ]
      };

      expect(pblStage.id).toBe('stage1');
      expect(pblStage.title).toBe('Analysis Phase');
      expect(pblStage.title_zhTW).toBe('分析階段');
      expect(pblStage.title_es).toBe('Fase de Análisis');
      expect(pblStage.title_ja).toBe('分析段階');
      expect(pblStage.tasks).toHaveLength(2);
      expect(pblStage.tasks?.[0].title).toBe('Initial Analysis');
    });

    it('should allow PBL stage without tasks', () => {
      const stageWithoutTasks: PBLStage = {
        id: 'stage2',
        title: 'Empty Stage',
        title_zhTW: '空階段'
      };

      expect(stageWithoutTasks.id).toBe('stage2');
      expect(stageWithoutTasks.tasks).toBeUndefined();
    });
  });

  describe('PBLData interface', () => {
    it('should define complete PBL data structure', () => {
      const pblData: PBLData = {
        scenario_info: {
          id: 'scenario1',
          title: 'AI Ethics Scenario',
          description: 'A comprehensive scenario about AI ethics in healthcare',
          estimated_duration: 120
        },
        stages: [
          {
            id: 'stage1',
            title: 'Understanding',
            title_zhTW: '理解',
            tasks: [
              {
                id: 'task1',
                title: 'Read Scenario',
                description: 'Read and understand the scenario',
                estimated_duration: 15
              }
            ]
          },
          {
            id: 'stage2',
            title: 'Analysis',
            title_zhTW: '分析',
            tasks: [
              {
                id: 'task2',
                title: 'Stakeholder Analysis',
                description: 'Identify key stakeholders',
                estimated_duration: 30
              }
            ]
          }
        ]
      };

      expect(pblData.scenario_info?.id).toBe('scenario1');
      expect(pblData.scenario_info?.title).toBe('AI Ethics Scenario');
      expect(pblData.scenario_info?.estimated_duration).toBe(120);
      expect(pblData.stages).toHaveLength(2);
      expect(pblData.stages?.[0].title).toBe('Understanding');
      expect(pblData.stages?.[1].tasks).toHaveLength(1);
    });

    it('should allow minimal PBL data', () => {
      const minimalPBL: PBLData = {};

      expect(minimalPBL.scenario_info).toBeUndefined();
      expect(minimalPBL.stages).toBeUndefined();
    });
  });

  describe('Type validation and edge cases', () => {
    it('should handle various difficulty levels', () => {
      const difficulties: Array<'beginner' | 'intermediate' | 'advanced'> = [
        'beginner', 'intermediate', 'advanced'
      ];

      difficulties.forEach(difficulty => {
        const question: AssessmentQuestion = {
          id: `q-${difficulty}`,
          question: `Question for ${difficulty} level`,
          domain: 'engaging_with_ai',
          difficulty,
          type: 'multiple_choice'
        };

        expect(question.difficulty).toBe(difficulty);
      });
    });

    it('should handle various question types', () => {
      const questionTypes: Array<'multiple_choice' | 'likert_scale' | 'true_false'> = [
        'multiple_choice', 'likert_scale', 'true_false'
      ];

      questionTypes.forEach(type => {
        const question: AssessmentQuestion = {
          id: `q-${type}`,
          question: `Question of type ${type}`,
          domain: 'creating_with_ai',
          difficulty: 'beginner',
          type
        };

        expect(question.type).toBe(type);
      });
    });

    it('should handle numeric correct answers', () => {
      const numericQuestion: AssessmentQuestion = {
        id: 'q-numeric',
        question: 'On a scale of 1-5, how important is AI ethics?',
        domain: 'designing_ai',
        difficulty: 'intermediate',
        type: 'likert_scale',
        correct_answer: 5
      };

      expect(typeof numericQuestion.correct_answer).toBe('number');
      expect(numericQuestion.correct_answer).toBe(5);
    });
  });

  describe('Type exports validation', () => {
    it('should export all validation types', () => {
      // Type assertion tests to ensure all types are properly exported
      const ksaData = {} as KSAData;
      const ksaTheme = {} as KSATheme;
      const ksaCode = {} as KSACode;
      const domainsData = {} as DomainsData;
      const domain = {} as Domain;
      const competency = {} as Competency;
      const assessmentData = {} as AssessmentData;
      const assessmentQuestion = {} as AssessmentQuestion;
      const pblData = {} as PBLData;
      const pblStage = {} as PBLStage;
      const pblTask = {} as PBLTask;

      // If types are properly defined, these should not throw
      expect(ksaData).toBeDefined();
      expect(ksaTheme).toBeDefined();
      expect(ksaCode).toBeDefined();
      expect(domainsData).toBeDefined();
      expect(domain).toBeDefined();
      expect(competency).toBeDefined();
      expect(assessmentData).toBeDefined();
      expect(assessmentQuestion).toBeDefined();
      expect(pblData).toBeDefined();
      expect(pblStage).toBeDefined();
      expect(pblTask).toBeDefined();
    });
  });
});
