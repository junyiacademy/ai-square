/**
 * Unit tests for PBL types
 * Tests all PBL v2 Problem-Based Learning type definitions
 */

import type {
  DomainType,
  DifficultyLevel,
  TaskCategory,
  ModalityFocus,
  AIRole,
  ProgramStatus,
  TaskStatus,
  InteractionType,
  KSAMapping,
  AIModule,
  Task,
  Scenario,
  PBLScenario,
  ScenarioListItem,
  Program,
  ProgramMetadata,
  TaskMetadata,
  TaskInteraction,
  TaskLog,
  TaskProgress,
  ProgramSummary,
  ConversationTurn,
  ProcessLog,
  CreateProgramResponse,
  SaveTaskLogRequest,
  SaveTaskProgressRequest,
  GetProgramHistoryResponse
} from '../pbl';

describe('PBL Types', () => {
  describe('Enum Types', () => {
    it('should define DomainType values', () => {
      const domains: DomainType[] = [
        'engaging_with_ai',
        'creating_with_ai',
        'managing_with_ai',
        'designing_with_ai'
      ];

      expect(domains).toHaveLength(4);
      expect(domains).toContain('engaging_with_ai');
      expect(domains).toContain('creating_with_ai');
      expect(domains).toContain('managing_with_ai');
      expect(domains).toContain('designing_with_ai');

      // Test type assignment
      const domain1: DomainType = 'engaging_with_ai';
      const domain2: DomainType = 'designing_with_ai';
      expect(domain1).toBe('engaging_with_ai');
      expect(domain2).toBe('designing_with_ai');
    });

    it('should define DifficultyLevel values', () => {
      const difficulties: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];

      expect(difficulties).toHaveLength(3);
      expect(difficulties).toContain('beginner');
      expect(difficulties).toContain('intermediate');
      expect(difficulties).toContain('advanced');

      // Test type assignment
      const easy: DifficultyLevel = 'beginner';
      const hard: DifficultyLevel = 'advanced';
      expect(easy).toBe('beginner');
      expect(hard).toBe('advanced');
    });

    it('should define TaskCategory values', () => {
      const categories: TaskCategory[] = ['research', 'analysis', 'creation', 'interaction'];

      expect(categories).toHaveLength(4);
      expect(categories).toContain('research');
      expect(categories).toContain('analysis');
      expect(categories).toContain('creation');
      expect(categories).toContain('interaction');

      // Test type assignment
      const category1: TaskCategory = 'analysis';
      const category2: TaskCategory = 'creation';
      expect(category1).toBe('analysis');
      expect(category2).toBe('creation');
    });

    it('should define ModalityFocus values', () => {
      const modalities: ModalityFocus[] = ['reading', 'writing', 'listening', 'speaking', 'mixed'];

      expect(modalities).toHaveLength(5);
      expect(modalities).toContain('reading');
      expect(modalities).toContain('writing');
      expect(modalities).toContain('listening');
      expect(modalities).toContain('speaking');
      expect(modalities).toContain('mixed');

      // Test type assignment
      const reading: ModalityFocus = 'reading';
      const mixed: ModalityFocus = 'mixed';
      expect(reading).toBe('reading');
      expect(mixed).toBe('mixed');
    });

    it('should define AIRole values', () => {
      const roles: AIRole[] = ['assistant', 'evaluator', 'actor'];

      expect(roles).toHaveLength(3);
      expect(roles).toContain('assistant');
      expect(roles).toContain('evaluator');
      expect(roles).toContain('actor');

      // Test type assignment
      const role1: AIRole = 'assistant';
      const role2: AIRole = 'evaluator';
      expect(role1).toBe('assistant');
      expect(role2).toBe('evaluator');
    });

    it('should define ProgramStatus values', () => {
      const statuses: ProgramStatus[] = ['draft', 'in_progress', 'completed'];

      expect(statuses).toHaveLength(3);
      expect(statuses).toContain('draft');
      expect(statuses).toContain('in_progress');
      expect(statuses).toContain('completed');

      // Test type assignment
      const status1: ProgramStatus = 'draft';
      const status2: ProgramStatus = 'completed';
      expect(status1).toBe('draft');
      expect(status2).toBe('completed');
    });

    it('should define TaskStatus values', () => {
      const statuses: TaskStatus[] = ['not_started', 'in_progress', 'completed'];

      expect(statuses).toHaveLength(3);
      expect(statuses).toContain('not_started');
      expect(statuses).toContain('in_progress');
      expect(statuses).toContain('completed');

      // Test type assignment
      const status1: TaskStatus = 'not_started';
      const status2: TaskStatus = 'in_progress';
      expect(status1).toBe('not_started');
      expect(status2).toBe('in_progress');
    });

    it('should define InteractionType values', () => {
      const types: InteractionType[] = ['user', 'ai', 'system'];

      expect(types).toHaveLength(3);
      expect(types).toContain('user');
      expect(types).toContain('ai');
      expect(types).toContain('system');

      // Test type assignment
      const type1: InteractionType = 'user';
      const type2: InteractionType = 'system';
      expect(type1).toBe('user');
      expect(type2).toBe('system');
    });
  });

  describe('KSAMapping interface', () => {
    it('should define KSA mapping structure', () => {
      const ksaMapping: KSAMapping = {
        knowledge: ['K1.1', 'K2.3', 'K3.1'],
        skills: ['S1.2', 'S2.1', 'S3.3'],
        attitudes: ['A1.1', 'A2.2', 'A3.1']
      };

      expect(ksaMapping.knowledge).toHaveLength(3);
      expect(ksaMapping.skills).toHaveLength(3);
      expect(ksaMapping.attitudes).toHaveLength(3);
      expect(ksaMapping.knowledge[0]).toBe('K1.1');
      expect(ksaMapping.skills[0]).toBe('S1.2');
      expect(ksaMapping.attitudes[0]).toBe('A1.1');
    });

    it('should allow empty KSA arrays', () => {
      const emptyKSA: KSAMapping = {
        knowledge: [],
        skills: [],
        attitudes: []
      };

      expect(emptyKSA.knowledge).toHaveLength(0);
      expect(emptyKSA.skills).toHaveLength(0);
      expect(emptyKSA.attitudes).toHaveLength(0);
    });
  });

  describe('AIModule interface', () => {
    it('should define AI module structure', () => {
      const aiModule: AIModule = {
        role: 'assistant',
        model: 'gemini-2.5-flash',
        persona: 'friendly_tutor',
        initialPrompt: 'You are an AI tutor helping students learn about AI ethics.'
      };

      expect(aiModule.role).toBe('assistant');
      expect(aiModule.model).toBe('gemini-2.5-flash');
      expect(aiModule.persona).toBe('friendly_tutor');
      expect(aiModule.initialPrompt).toContain('ethics');
    });

    it('should allow minimal AI module', () => {
      const minimalModule: AIModule = {
        role: 'evaluator',
        model: 'gpt-4'
      };

      expect(minimalModule.role).toBe('evaluator');
      expect(minimalModule.model).toBe('gpt-4');
      expect(minimalModule.persona).toBeUndefined();
      expect(minimalModule.initialPrompt).toBeUndefined();
    });
  });

  describe('Task interface', () => {
    it('should define complete task structure with multi-language support', () => {
      const task: Task = {
        id: 'task-123',
        title: 'Ethical Analysis Task',
        title_zhTW: '道德分析任務',
        title_zhCN: '道德分析任务',
        title_pt: 'Tarefa de Análise Ética',
        title_ar: 'مهمة التحليل الأخلاقي',
        title_id: 'Tugas Analisis Etis',
        title_th: 'งานวิเคราะห์จริยธรรม',
        description: 'Analyze the ethical implications of AI decision-making in healthcare.',
        description_zhTW: '分析AI在醫療決策中的道德影響。',
        description_pt: 'Analisar as implicações éticas da tomada de decisão por IA na saúde.',
        category: 'analysis',
        instructions: [
          'Read the healthcare scenario',
          'Identify key stakeholders',
          'Analyze ethical considerations',
          'Propose solutions'
        ],
        instructions_zhTW: [
          '閱讀醫療情境',
          '識別關鍵利益相關者',
          '分析倫理考量',
          '提出解決方案'
        ],
        expectedOutcome: 'A comprehensive ethical analysis with stakeholder considerations.',
        expectedOutcome_zhTW: '包含利益相關者考量的全面倫理分析。',
        timeLimit: 45,
        resources: [
          'AI Ethics in Healthcare Guidelines',
          'Stakeholder Analysis Framework'
        ],
        assessmentFocus: {
          primary: ['K1.1', 'S2.3', 'A1.2'],
          secondary: ['K2.1', 'S1.3']
        },
        focusKSA: ['K1.1', 'S2.3', 'A1.2', 'K2.1', 'S1.3'],
        aiModule: {
          role: 'assistant',
          model: 'gemini-2.5-flash',
          persona: 'healthcare_ethics_tutor',
          initialPrompt: 'You are an AI tutor specializing in healthcare ethics.'
        }
      };

      expect(task.id).toBe('task-123');
      expect(task.title).toBe('Ethical Analysis Task');
      expect(task.title_zhTW).toBe('道德分析任務');
      expect(task.category).toBe('analysis');
      expect(task.instructions).toHaveLength(4);
      expect(task.timeLimit).toBe(45);
      expect(task.resources).toHaveLength(2);
      expect(task.assessmentFocus.primary).toHaveLength(3);
      expect(task.focusKSA).toHaveLength(5);
      expect(task.aiModule?.role).toBe('assistant');
    });

    it('should allow minimal task structure', () => {
      const minimalTask: Task = {
        id: 'task-456',
        title: 'Simple Task',
        description: 'A basic task',
        category: 'research',
        instructions: ['Do the task'],
        expectedOutcome: 'Task completed',
        assessmentFocus: {
          primary: ['K1.1'],
          secondary: []
        }
      };

      expect(minimalTask.id).toBe('task-456');
      expect(minimalTask.title).toBe('Simple Task');
      expect(minimalTask.timeLimit).toBeUndefined();
      expect(minimalTask.resources).toBeUndefined();
      expect(minimalTask.aiModule).toBeUndefined();
    });
  });

  describe('Scenario interface', () => {
    it('should define complete scenario structure', () => {
      const scenario: Scenario = {
        id: 'scenario-123',
        title: 'AI Ethics in Healthcare',
        title_zhTW: '醫療中的AI倫理',
        title_pt: 'Ética de IA em Saúde',
        description: 'Explore ethical considerations when implementing AI in healthcare systems.',
        description_zhTW: '探索在醫療系統中實施AI時的倫理考量。',
        targetDomains: ['engaging_with_ai', 'designing_with_ai'],
        difficulty: 'intermediate',
        estimatedDuration: 90,
        prerequisites: ['Basic understanding of AI', 'Healthcare fundamentals'],
        learningObjectives: [
          'Understand AI ethics principles',
          'Apply ethical frameworks to healthcare AI',
          'Evaluate stakeholder impacts'
        ],
        learningObjectives_zhTW: [
          '了解AI倫理原則',
          '將倫理框架應用於醫療AI',
          '評估利益相關者影響'
        ],
        ksaMapping: {
          knowledge: ['K1.1', 'K2.3'],
          skills: ['S1.2', 'S3.1'],
          attitudes: ['A1.1', 'A2.2']
        },
        tasks: [
          {
            id: 'task-1',
            title: 'Stakeholder Analysis',
            description: 'Identify healthcare stakeholders',
            category: 'analysis',
            instructions: ['List stakeholders'],
            expectedOutcome: 'Stakeholder list',
            assessmentFocus: { primary: ['K1.1'], secondary: [] }
          },
          {
            id: 'task-2',
            title: 'Ethical Framework Application',
            description: 'Apply ethical frameworks',
            category: 'analysis',
            instructions: ['Apply frameworks'],
            expectedOutcome: 'Framework analysis',
            assessmentFocus: { primary: ['S1.2'], secondary: [] }
          }
        ]
      };

      expect(scenario.id).toBe('scenario-123');
      expect(scenario.title).toBe('AI Ethics in Healthcare');
      expect(scenario.targetDomains).toContain('engaging_with_ai');
      expect(scenario.difficulty).toBe('intermediate');
      expect(scenario.estimatedDuration).toBe(90);
      expect(scenario.prerequisites).toHaveLength(2);
      expect(scenario.learningObjectives).toHaveLength(3);
      expect(scenario.ksaMapping.knowledge).toContain('K1.1');
      expect(scenario.tasks).toHaveLength(2);
    });
  });

  describe('PBLScenario type alias', () => {
    it('should be equivalent to Scenario interface', () => {
      const scenario: Scenario = {
        id: 'test',
        title: 'Test',
        description: 'Test',
        targetDomains: ['engaging_with_ai'],
        difficulty: 'beginner',
        estimatedDuration: 30,
        learningObjectives: ['Test objective'],
        ksaMapping: { knowledge: [], skills: [], attitudes: [] },
        tasks: []
      };

      // Should be assignable to PBLScenario
      const pblScenario: PBLScenario = scenario;
      expect(pblScenario.id).toBe('test');
      expect(pblScenario.title).toBe('Test');
    });
  });

  describe('ScenarioListItem interface', () => {
    it('should define scenario list item structure', () => {
      const listItem: ScenarioListItem = {
        id: 'scenario-456',
        title: 'Data Privacy Scenario',
        title_zhTW: '數據隱私情境',
        description: 'Learn about data privacy in AI systems.',
        description_zhTW: '了解AI系統中的數據隱私。',
        targetDomains: ['managing_with_ai'],
        difficulty: 'advanced',
        estimatedDuration: 120,
        taskCount: 5,
        tags: ['privacy', 'data', 'security']
      };

      expect(listItem.id).toBe('scenario-456');
      expect(listItem.title).toBe('Data Privacy Scenario');
      expect(listItem.targetDomains).toContain('managing_with_ai');
      expect(listItem.difficulty).toBe('advanced');
      expect(listItem.taskCount).toBe(5);
      expect(listItem.tags).toHaveLength(3);
    });
  });

  describe('Program interface', () => {
    it('should define program structure', () => {
      const program: Program = {
        id: 'program-123',
        scenarioId: 'scenario-456',
        userId: 'user-789',
        userEmail: 'user@example.com',
        startedAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T14:30:00Z',
        completedAt: '2024-01-01T15:00:00Z',
        status: 'completed',
        totalTasks: 3,
        currentTaskId: 'task-3',
        language: 'en',
        taskIds: ['task-1-uuid', 'task-2-uuid', 'task-3-uuid']
      };

      expect(program.id).toBe('program-123');
      expect(program.scenarioId).toBe('scenario-456');
      expect(program.userId).toBe('user-789');
      expect(program.status).toBe('completed');
      expect(program.totalTasks).toBe(3);
      expect(program.taskIds).toHaveLength(3);
    });
  });

  describe('TaskInteraction interface', () => {
    it('should define task interaction structure', () => {
      const interaction: TaskInteraction = {
        timestamp: '2024-01-01T12:00:00Z',
        type: 'user',
        content: 'I think the main stakeholders in this healthcare AI scenario are patients, doctors, and healthcare administrators.',
        metadata: {
          model: 'gemini-2.5-flash',
          tokensUsed: 150,
          responseTime: 2500
        }
      };

      expect(interaction.timestamp).toBe('2024-01-01T12:00:00Z');
      expect(interaction.type).toBe('user');
      expect(interaction.content).toContain('stakeholders');
      expect(interaction.metadata?.model).toBe('gemini-2.5-flash');
      expect(interaction.metadata?.tokensUsed).toBe(150);
    });

    it('should allow interaction without metadata', () => {
      const simpleInteraction: TaskInteraction = {
        timestamp: '2024-01-01T12:01:00Z',
        type: 'ai',
        content: 'That\'s an excellent analysis of the stakeholders involved.'
      };

      expect(simpleInteraction.type).toBe('ai');
      expect(simpleInteraction.metadata).toBeUndefined();
    });
  });

  describe('TaskLog interface', () => {
    it('should define task log structure', () => {
      const taskLog: TaskLog = {
        taskId: 'task-123',
        programId: 'program-456',
        interactions: [
          {
            timestamp: '2024-01-01T12:00:00Z',
            type: 'user',
            content: 'Start analysis'
          },
          {
            timestamp: '2024-01-01T12:05:00Z',
            type: 'ai',
            content: 'Good start, continue...'
          }
        ],
        totalInteractions: 2,
        lastInteractionAt: '2024-01-01T12:05:00Z'
      };

      expect(taskLog.taskId).toBe('task-123');
      expect(taskLog.programId).toBe('program-456');
      expect(taskLog.interactions).toHaveLength(2);
      expect(taskLog.totalInteractions).toBe(2);
      expect(taskLog.lastInteractionAt).toBe('2024-01-01T12:05:00Z');
    });
  });

  describe('TaskProgress interface', () => {
    it('should define task progress structure', () => {
      const progress: TaskProgress = {
        taskId: 'task-123',
        programId: 'program-456',
        status: 'completed',
        startedAt: '2024-01-01T11:30:00Z',
        completedAt: '2024-01-01T12:30:00Z',
        timeSpentSeconds: 3600,
        score: 85,
        feedback: 'Excellent analysis with comprehensive stakeholder consideration.',
        ksaScores: {
          'K1.1': 88,
          'S2.3': 82,
          'A1.2': 90
        },
        evaluationDetails: {
          strengths: ['Thorough analysis', 'Clear reasoning'],
          improvements: ['Consider more perspectives', 'Provide examples'],
          nextSteps: ['Practice with complex scenarios']
        }
      };

      expect(progress.taskId).toBe('task-123');
      expect(progress.status).toBe('completed');
      expect(progress.timeSpentSeconds).toBe(3600);
      expect(progress.score).toBe(85);
      expect(progress.ksaScores?.['K1.1']).toBe(88);
      expect(progress.evaluationDetails?.strengths).toHaveLength(2);
    });
  });

  describe('ConversationTurn interface', () => {
    it('should define conversation turn structure', () => {
      const turn: ConversationTurn = {
        id: 'turn-123',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        role: 'user',
        content: 'What are the key ethical considerations?',
        metadata: {
          processingTime: 1500,
          tokensUsed: 200
        }
      };

      expect(turn.id).toBe('turn-123');
      expect(turn.timestamp).toBeInstanceOf(Date);
      expect(turn.role).toBe('user');
      expect(turn.content).toContain('ethical');
      expect(turn.metadata?.processingTime).toBe(1500);
    });
  });

  describe('API Response Types', () => {
    it('should define CreateProgramResponse', () => {
      const response: CreateProgramResponse = {
        success: true,
        programId: 'program-123',
        program: {
          id: 'program-123',
          scenarioId: 'scenario-456',
          userId: 'user-789',
          userEmail: 'user@example.com',
          startedAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:00:00Z',
          status: 'in_progress',
          totalTasks: 3,
          language: 'en'
        },
        firstTaskId: 'task-1'
      };

      expect(response.success).toBe(true);
      expect(response.programId).toBe('program-123');
      expect(response.program.id).toBe('program-123');
      expect(response.firstTaskId).toBe('task-1');
    });

    it('should define SaveTaskLogRequest', () => {
      const request: SaveTaskLogRequest = {
        programId: 'program-123',
        taskId: 'task-456',
        interaction: {
          timestamp: '2024-01-01T12:00:00Z',
          type: 'user',
          content: 'My response to the task'
        },
        scenarioId: 'scenario-789',
        taskTitle: 'Analysis Task'
      };

      expect(request.programId).toBe('program-123');
      expect(request.taskId).toBe('task-456');
      expect(request.interaction.type).toBe('user');
      expect(request.scenarioId).toBe('scenario-789');
      expect(request.taskTitle).toBe('Analysis Task');
    });

    it('should define GetProgramHistoryResponse', () => {
      const response: GetProgramHistoryResponse = {
        success: true,
        programs: [
          {
            program: {
              id: 'program-1',
              scenarioId: 'scenario-1',
              userId: 'user-123',
              userEmail: 'user@example.com',
              startedAt: '2024-01-01T10:00:00Z',
              updatedAt: '2024-01-01T12:00:00Z',
              status: 'completed',
              totalTasks: 2,
              language: 'en',
              scenarioTitle: 'Test Scenario'
            },
            tasks: [
              {
                metadata: {
                  taskId: 'task-1',
                  programId: 'program-1',
                  title: 'Task 1',
                  status: 'completed',
                  attempts: 1
                },
                progress: {
                  taskId: 'task-1',
                  programId: 'program-1',
                  status: 'completed',
                  timeSpentSeconds: 1800
                },
                interactionCount: 5
              }
            ],
            overallScore: 85,
            totalTimeSeconds: 3600,
            completionRate: 100
          }
        ],
        totalPrograms: 1
      };

      expect(response.success).toBe(true);
      expect(response.programs).toHaveLength(1);
      expect(response.programs[0].program.id).toBe('program-1');
      expect(response.programs[0].tasks).toHaveLength(1);
      expect(response.totalPrograms).toBe(1);
    });
  });

  describe('Type exports validation', () => {
    it('should export all expected PBL types', () => {
      // Type assertion tests to ensure all types are properly exported
      const domainType = 'engaging_with_ai' as DomainType;
      const difficultyLevel = 'beginner' as DifficultyLevel;
      const taskCategory = 'analysis' as TaskCategory;
      const modalityFocus = 'reading' as ModalityFocus;
      const aiRole = 'assistant' as AIRole;
      const programStatus = 'in_progress' as ProgramStatus;
      const taskStatus = 'not_started' as TaskStatus;
      const interactionType = 'user' as InteractionType;
      
      const ksaMapping = {} as KSAMapping;
      const aiModule = {} as AIModule;
      const task = {} as Task;
      const scenario = {} as Scenario;
      const pblScenario = {} as PBLScenario;
      const scenarioListItem = {} as ScenarioListItem;
      const program = {} as Program;
      const programMetadata = {} as ProgramMetadata;
      const taskMetadata = {} as TaskMetadata;
      const taskInteraction = {} as TaskInteraction;
      const taskLog = {} as TaskLog;
      const taskProgress = {} as TaskProgress;
      const programSummary = {} as ProgramSummary;
      const conversationTurn = {} as ConversationTurn;
      const processLog = {} as ProcessLog;
      const createProgramResponse = {} as CreateProgramResponse;
      const saveTaskLogRequest = {} as SaveTaskLogRequest;
      const saveTaskProgressRequest = {} as SaveTaskProgressRequest;
      const getProgramHistoryResponse = {} as GetProgramHistoryResponse;

      // If types are properly defined, these should not throw
      expect(domainType).toBeDefined();
      expect(difficultyLevel).toBeDefined();
      expect(taskCategory).toBeDefined();
      expect(modalityFocus).toBeDefined();
      expect(aiRole).toBeDefined();
      expect(programStatus).toBeDefined();
      expect(taskStatus).toBeDefined();
      expect(interactionType).toBeDefined();
      expect(ksaMapping).toBeDefined();
      expect(aiModule).toBeDefined();
      expect(task).toBeDefined();
      expect(scenario).toBeDefined();
      expect(pblScenario).toBeDefined();
      expect(scenarioListItem).toBeDefined();
      expect(program).toBeDefined();
      expect(programMetadata).toBeDefined();
      expect(taskMetadata).toBeDefined();
      expect(taskInteraction).toBeDefined();
      expect(taskLog).toBeDefined();
      expect(taskProgress).toBeDefined();
      expect(programSummary).toBeDefined();
      expect(conversationTurn).toBeDefined();
      expect(processLog).toBeDefined();
      expect(createProgramResponse).toBeDefined();
      expect(saveTaskLogRequest).toBeDefined();
      expect(saveTaskProgressRequest).toBeDefined();
      expect(getProgramHistoryResponse).toBeDefined();
    });
  });
});