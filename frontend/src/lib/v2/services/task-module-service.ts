/**
 * Task Module Service V2
 * 處理模組化任務的創建、編排和動態生成
 */

import { 
  ITaskModule, 
  TaskModuleFactory, 
  TaskModuleType,
  TaskArrangement,
  TaskConfiguration,
  DynamicTaskGenerator,
  TaskGenerationContext
} from '../types/task-modules';
import { Task, Program } from '../types';
import { TaskRepositoryV2 } from '../repositories/task-repository';
import { DatabaseConnection } from '../utils/database';

export class TaskModuleService implements DynamicTaskGenerator {
  private taskRepo: TaskRepositoryV2;

  constructor(private db: DatabaseConnection) {
    this.taskRepo = new TaskRepositoryV2(db);
  }

  /**
   * 創建模組化任務並加入到 Program
   */
  async createModularTask(
    programId: string,
    moduleType: TaskModuleType,
    moduleConfig: any,
    taskMetadata?: any
  ): Promise<Task> {
    // 使用工廠創建任務模組
    const module = TaskModuleFactory.createModule(moduleType, moduleConfig);
    
    // 轉換為 Task 實體
    const task = await this.taskRepo.create({
      program_id: programId,
      code: `task_${module.id}`,
      title: module.title,
      description: moduleConfig.description || module.title,
      instructions: module.instructions,
      task_type: this.mapModuleTypeToTaskType(moduleType),
      task_variant: this.mapModuleTypeToVariant(moduleType),
      module_type: moduleType,
      module_config: module.config,
      evaluation_method: module.evaluation_method,
      order_index: await this.getNextOrderIndex(programId),
      is_active: true,
      metadata: {
        ...taskMetadata,
        module_id: module.id
      }
    });

    return task;
  }

  /**
   * 為 Program 創建任務集合（固定編排）
   */
  async createFixedTaskSet(
    programId: string,
    taskModules: Array<{
      type: TaskModuleType;
      config: any;
      metadata?: any;
    }>
  ): Promise<Task[]> {
    const tasks: Task[] = [];
    
    for (let i = 0; i < taskModules.length; i++) {
      const { type, config, metadata } = taskModules[i];
      const task = await this.createModularTask(
        programId,
        type,
        config,
        { ...metadata, order: i }
      );
      tasks.push(task);
    }

    return tasks;
  }

  /**
   * 動態生成任務（用於 Discovery）
   */
  async generateTask(context: TaskGenerationContext): Promise<ITaskModule> {
    // 根據上下文選擇合適的任務類型
    const moduleType = this.selectModuleType(context);
    
    // 生成任務配置
    const config = await this.generateTaskConfig(moduleType, context);
    
    // 創建任務模組
    return TaskModuleFactory.createModule(moduleType, config);
  }

  /**
   * 建議下一個任務（用於自適應學習）
   */
  async suggestNextTask(
    completedTasks: ITaskModule[],
    userPerformance: any
  ): Promise<ITaskModule> {
    // 分析用戶表現
    const analysis = this.analyzePerformance(completedTasks, userPerformance);
    
    // 選擇適合的任務類型
    let nextModuleType: TaskModuleType;
    if (analysis.needsMorePractice) {
      nextModuleType = 'multiple_choice'; // 簡單的練習
    } else if (analysis.readyForChallenge) {
      nextModuleType = 'code_writing'; // 挑戰性任務
    } else {
      nextModuleType = 'conversation'; // 互動式學習
    }

    // 生成任務配置
    const config = await this.generateAdaptiveTaskConfig(
      nextModuleType,
      analysis
    );

    return TaskModuleFactory.createModule(nextModuleType, config);
  }

  /**
   * 創建複合任務（包含多個子模組）
   */
  async createCompositeTask(
    programId: string,
    title: string,
    subModules: Array<{
      type: TaskModuleType;
      config: any;
    }>
  ): Promise<Task> {
    const modules = subModules.map(({ type, config }) => 
      TaskModuleFactory.createModule(type, config)
    );

    return this.createModularTask(
      programId,
      'composite',
      {
        title,
        sub_modules: modules,
        completion_rule: 'all'
      }
    );
  }

  /**
   * 範例：創建 PBL 的任務集
   */
  async createPBLTaskSet(programId: string, stage: 'foundation' | 'advanced') {
    if (stage === 'foundation') {
      return this.createFixedTaskSet(programId, [
        {
          type: 'conversation',
          config: {
            title: 'Understanding AI Basics',
            initial_prompt: 'Let\'s explore what AI is and how it works',
            ai_role: 'AI Tutor',
            conversation_goals: [
              'Understand AI definition',
              'Explore AI applications',
              'Discuss AI limitations'
            ]
          }
        },
        {
          type: 'multiple_choice',
          config: {
            title: 'AI Concepts Quiz',
            questions: [
              {
                question: 'What is Machine Learning?',
                options: [
                  { id: 'a', text: 'A type of AI that learns from data' },
                  { id: 'b', text: 'A programming language' },
                  { id: 'c', text: 'A database system' }
                ],
                correct_answer: 'a'
              }
            ]
          }
        },
        {
          type: 'creative_writing',
          config: {
            title: 'Reflect on AI Impact',
            prompt: 'Write about how AI might change your field of work',
            constraints: {
              min_words: 200,
              max_words: 500
            }
          }
        }
      ]);
    } else {
      // Advanced stage tasks
      return this.createFixedTaskSet(programId, [
        {
          type: 'code_writing',
          config: {
            title: 'Implement a Simple AI Algorithm',
            problem_statement: 'Create a basic decision tree classifier',
            language: 'python',
            starter_code: 'class DecisionTree:\n    def __init__(self):\n        pass'
          }
        },
        {
          type: 'composite',
          config: {
            title: 'AI Project Design',
            sub_modules: [
              {
                type: 'creative_writing',
                config: {
                  title: 'Project Proposal',
                  prompt: 'Write a proposal for an AI solution'
                }
              },
              {
                type: 'design',
                config: {
                  title: 'System Architecture',
                  requirements: ['Data flow', 'AI components', 'User interface']
                }
              }
            ]
          }
        }
      ]);
    }
  }

  /**
   * 範例：動態生成 Discovery 任務
   */
  async generateDiscoveryTask(
    programId: string,
    career: string,
    scenario: string,
    userInterest?: string
  ): Promise<Task> {
    const context: TaskGenerationContext = {
      program_type: 'discovery',
      user_level: 'intermediate',
      topic: `${career} - ${scenario}`,
      constraints: {
        career,
        scenario,
        user_interest: userInterest
      }
    };

    const module = await this.generateTask(context);
    
    return this.createModularTask(
      programId,
      module.module_type as TaskModuleType,
      module.config,
      {
        is_dynamic: true,
        generated_context: context
      }
    );
  }

  /**
   * 範例：創建 Assessment 任務集
   */
  async createAssessmentTaskSet(
    programId: string,
    questions: Array<{
      text: string;
      options: Array<{ id: string; text: string }>;
      correct: string;
    }>
  ) {
    const tasks = questions.map((q, index) => ({
      type: 'multiple_choice' as TaskModuleType,
      config: {
        title: `Question ${index + 1}`,
        question: q.text,
        options: q.options.map(opt => ({
          ...opt,
          is_correct: opt.id === q.correct
        })),
        show_explanation: true
      }
    }));

    return this.createFixedTaskSet(programId, tasks);
  }

  // ===== 輔助方法 =====

  private async getNextOrderIndex(programId: string): Promise<number> {
    const tasks = await this.taskRepo.findByProgram(programId);
    return tasks.length;
  }

  private mapModuleTypeToTaskType(moduleType: TaskModuleType): Task['task_type'] {
    const typeMap: Record<string, Task['task_type']> = {
      'multiple_choice': 'assessment',
      'fill_in_blank': 'assessment',
      'short_answer': 'assessment',
      'essay': 'practice',
      'conversation': 'learning',
      'code_writing': 'practice',
      'creative_writing': 'practice',
      'design': 'practice',
      'composite': 'practice'
    };
    return typeMap[moduleType] || 'learning';
  }

  private mapModuleTypeToVariant(moduleType: TaskModuleType): Task['task_variant'] {
    if (['multiple_choice', 'fill_in_blank', 'short_answer'].includes(moduleType)) {
      return 'question';
    }
    if (['conversation', 'creative_writing'].includes(moduleType)) {
      return 'exploration';
    }
    return 'standard';
  }

  private selectModuleType(context: TaskGenerationContext): TaskModuleType {
    // 根據上下文選擇合適的任務類型
    if (context.program_type === 'discovery') {
      // Discovery 偏好互動和探索型任務
      const types: TaskModuleType[] = [
        'conversation',
        'creative_writing',
        'design'
      ];
      return types[Math.floor(Math.random() * types.length)];
    }
    
    // 其他情況
    return 'multiple_choice';
  }

  private async generateTaskConfig(
    moduleType: TaskModuleType,
    context: TaskGenerationContext
  ): Promise<any> {
    // 這裡應該調用 AI 來生成任務配置
    // 現在返回模擬資料
    switch (moduleType) {
      case 'conversation':
        return {
          title: `Explore ${context.topic}`,
          initial_prompt: `Let's discuss ${context.topic}`,
          ai_role: 'Expert Guide',
          conversation_goals: [
            `Understand ${context.topic}`,
            'Apply to real scenarios',
            'Reflect on learning'
          ]
        };
      
      case 'creative_writing':
        return {
          title: `Reflect on ${context.topic}`,
          prompt: `Write about your experience with ${context.topic}`,
          constraints: {
            min_words: 150,
            max_words: 300
          }
        };
      
      default:
        return {
          title: `Task for ${context.topic}`,
          description: 'Complete this task'
        };
    }
  }

  private analyzePerformance(
    completedTasks: ITaskModule[],
    userPerformance: any
  ): any {
    // 分析用戶表現
    const avgScore = userPerformance.average_score || 0;
    const completionRate = completedTasks.length / 10; // 假設目標是 10 個任務

    return {
      needsMorePractice: avgScore < 70,
      readyForChallenge: avgScore > 85 && completionRate > 0.5,
      strengths: userPerformance.strengths || [],
      weaknesses: userPerformance.weaknesses || []
    };
  }

  private async generateAdaptiveTaskConfig(
    moduleType: TaskModuleType,
    analysis: any
  ): Promise<any> {
    // 根據分析結果生成適應性任務配置
    const difficulty = analysis.needsMorePractice ? 'easy' : 
                      analysis.readyForChallenge ? 'hard' : 'medium';

    return {
      title: `Adaptive ${moduleType} Task`,
      difficulty,
      focus_areas: analysis.weaknesses,
      build_on: analysis.strengths
    };
  }
}

// ===== 使用範例 =====
/*
const taskService = new TaskModuleService(db);

// 1. PBL: 創建固定的任務集
const pblTasks = await taskService.createPBLTaskSet(programId, 'foundation');

// 2. Discovery: 動態生成任務
const discoveryTask = await taskService.generateDiscoveryTask(
  programId,
  'AI Product Manager',
  'Daily Routine',
  'I want to learn about stakeholder communication'
);

// 3. Assessment: 創建測驗題目
const assessmentTasks = await taskService.createAssessmentTaskSet(
  programId,
  [
    {
      text: 'What is AI?',
      options: [
        { id: 'a', text: 'Artificial Intelligence' },
        { id: 'b', text: 'Advanced Internet' }
      ],
      correct: 'a'
    }
  ]
);

// 4. 創建複合任務
const compositeTask = await taskService.createCompositeTask(
  programId,
  'Complete AI Understanding',
  [
    { type: 'conversation', config: { ... } },
    { type: 'multiple_choice', config: { ... } },
    { type: 'creative_writing', config: { ... } }
  ]
);
*/