/**
 * V2 Task Module System
 * 定義各種可重用的任務模組類型
 */

// ===== 基礎任務模組介面 =====
export interface ITaskModule {
  id: string;
  module_type: TaskModuleType;
  title: string;
  instructions: string;
  config: Record<string, any>;
  validation_rules?: ValidationRule[];
  evaluation_method: EvaluationMethod;
  metadata?: Record<string, any>;
}

// ===== 任務模組類型 =====
export type TaskModuleType = 
  | 'multiple_choice'    // 選擇題
  | 'fill_in_blank'     // 填充題
  | 'short_answer'      // 簡答題
  | 'essay'             // 論述題
  | 'conversation'      // 對話題
  | 'code_writing'      // 程式創作題
  | 'creative_writing'  // 文字創作題
  | 'design'            // 設計題
  | 'file_upload'       // 檔案上傳題
  | 'peer_review'       // 同儕評審題
  | 'self_reflection'   // 自我反思題
  | 'composite';        // 複合題（包含多個子模組）

// ===== 評估方法 =====
export type EvaluationMethod = 
  | 'exact_match'       // 完全匹配（選擇題、填充題）
  | 'keyword_match'     // 關鍵字匹配
  | 'ai_evaluation'     // AI 評估（對話、創作）
  | 'rubric_based'      // 評分標準評估
  | 'peer_evaluation'   // 同儕評估
  | 'self_evaluation'   // 自我評估
  | 'composite';        // 綜合評估

// ===== 驗證規則 =====
export interface ValidationRule {
  type: 'required' | 'min_length' | 'max_length' | 'pattern' | 'custom';
  value?: any;
  message: string;
}

// ===== 具體的任務模組類型 =====

// 選擇題模組
export interface MultipleChoiceModule extends ITaskModule {
  module_type: 'multiple_choice';
  config: {
    question: string;
    options: Array<{
      id: string;
      text: string;
      is_correct?: boolean;  // 用於答案驗證
    }>;
    allow_multiple?: boolean;  // 是否允許多選
    randomize_options?: boolean;  // 是否隨機排列選項
    show_explanation?: boolean;  // 是否顯示解釋
    explanation?: string;
  };
  evaluation_method: 'exact_match';
}

// 填充題模組
export interface FillInBlankModule extends ITaskModule {
  module_type: 'fill_in_blank';
  config: {
    template: string;  // "The capital of {country} is {capital}"
    blanks: Array<{
      id: string;
      correct_answers: string[];  // 可接受的答案
      case_sensitive?: boolean;
      partial_credit?: boolean;
    }>;
  };
  evaluation_method: 'exact_match' | 'keyword_match';
}

// 對話題模組
export interface ConversationModule extends ITaskModule {
  module_type: 'conversation';
  config: {
    initial_prompt: string;
    ai_role: string;  // AI 扮演的角色
    conversation_goals: string[];  // 對話目標
    max_turns?: number;  // 最大對話輪數
    evaluation_rubric: {
      criteria: Array<{
        name: string;
        description: string;
        weight: number;
      }>;
    };
  };
  evaluation_method: 'ai_evaluation';
}

// 程式創作題模組
export interface CodeWritingModule extends ITaskModule {
  module_type: 'code_writing';
  config: {
    problem_statement: string;
    language: string;  // 'python', 'javascript', etc.
    starter_code?: string;
    test_cases?: Array<{
      input: any;
      expected_output: any;
      is_hidden?: boolean;
    }>;
    evaluation_criteria: {
      functionality: number;  // 權重
      code_quality: number;
      efficiency?: number;
    };
  };
  evaluation_method: 'rubric_based' | 'ai_evaluation';
}

// 創意寫作題模組
export interface CreativeWritingModule extends ITaskModule {
  module_type: 'creative_writing';
  config: {
    prompt: string;
    genre?: string;  // 'story', 'poem', 'essay', etc.
    constraints?: {
      min_words?: number;
      max_words?: number;
      required_elements?: string[];  // 必須包含的元素
    };
    evaluation_focus: string[];  // ['creativity', 'coherence', 'grammar']
  };
  evaluation_method: 'ai_evaluation';
}

// 複合題模組（包含多個子任務）
export interface CompositeModule extends ITaskModule {
  module_type: 'composite';
  config: {
    sub_modules: ITaskModule[];
    completion_rule: 'all' | 'any' | 'weighted';  // 完成規則
    weights?: number[];  // 各子模組權重
  };
  evaluation_method: 'composite';
}

// ===== 任務編排配置 =====
export interface TaskArrangement {
  program_id: string;
  arrangement_type: 'fixed' | 'dynamic' | 'adaptive';
  tasks: TaskConfiguration[];
  rules?: ArrangementRule[];
}

export interface TaskConfiguration {
  module: ITaskModule;
  order?: number;  // 固定順序（用於 fixed 類型）
  prerequisites?: string[];  // 前置任務 ID
  unlock_condition?: UnlockCondition;  // 解鎖條件
  is_optional?: boolean;  // 是否為選修
  weight?: number;  // 在總成績中的權重
}

export interface ArrangementRule {
  type: 'sequential' | 'branching' | 'random' | 'adaptive';
  condition?: string;  // 條件表達式
  action: string;  // 執行動作
}

export interface UnlockCondition {
  type: 'score_threshold' | 'time_based' | 'completion' | 'custom';
  value: any;
}

// ===== 動態任務生成介面 =====
export interface DynamicTaskGenerator {
  generateTask(
    context: TaskGenerationContext
  ): Promise<ITaskModule>;
  
  suggestNextTask(
    completedTasks: ITaskModule[],
    userPerformance: UserPerformance
  ): Promise<ITaskModule>;
}

export interface TaskGenerationContext {
  program_type: string;
  user_level: string;
  topic: string;
  constraints?: Record<string, any>;
  previous_tasks?: ITaskModule[];
}

export interface UserPerformance {
  average_score: number;
  strengths: string[];
  weaknesses: string[];
  completion_time: number;
  engagement_level: number;
}

// ===== 任務模組工廠 =====
export class TaskModuleFactory {
  static createModule(type: TaskModuleType, config: any): ITaskModule {
    switch (type) {
      case 'multiple_choice':
        return this.createMultipleChoice(config);
      case 'fill_in_blank':
        return this.createFillInBlank(config);
      case 'conversation':
        return this.createConversation(config);
      case 'code_writing':
        return this.createCodeWriting(config);
      case 'creative_writing':
        return this.createCreativeWriting(config);
      case 'composite':
        return this.createComposite(config);
      default:
        throw new Error(`Unknown task module type: ${type}`);
    }
  }

  private static createMultipleChoice(config: any): MultipleChoiceModule {
    // 實作選擇題模組創建邏輯
    return {
      id: `mc_${Date.now()}`,
      module_type: 'multiple_choice',
      title: config.title,
      instructions: config.instructions || 'Select the correct answer',
      config: config,
      evaluation_method: 'exact_match'
    };
  }

  private static createFillInBlank(config: any): FillInBlankModule {
    // 實作填充題模組創建邏輯
    return {
      id: `fib_${Date.now()}`,
      module_type: 'fill_in_blank',
      title: config.title,
      instructions: config.instructions || 'Fill in the blanks',
      config: config,
      evaluation_method: 'exact_match'
    };
  }

  private static createConversation(config: any): ConversationModule {
    // 實作對話題模組創建邏輯
    return {
      id: `conv_${Date.now()}`,
      module_type: 'conversation',
      title: config.title,
      instructions: config.instructions || 'Engage in a conversation',
      config: config,
      evaluation_method: 'ai_evaluation'
    };
  }

  private static createCodeWriting(config: any): CodeWritingModule {
    // 實作程式創作題模組創建邏輯
    return {
      id: `code_${Date.now()}`,
      module_type: 'code_writing',
      title: config.title,
      instructions: config.instructions || 'Write code to solve the problem',
      config: config,
      evaluation_method: 'rubric_based'
    };
  }

  private static createCreativeWriting(config: any): CreativeWritingModule {
    // 實作創意寫作題模組創建邏輯
    return {
      id: `write_${Date.now()}`,
      module_type: 'creative_writing',
      title: config.title,
      instructions: config.instructions || 'Write creatively',
      config: config,
      evaluation_method: 'ai_evaluation'
    };
  }

  private static createComposite(config: any): CompositeModule {
    // 實作複合題模組創建邏輯
    return {
      id: `comp_${Date.now()}`,
      module_type: 'composite',
      title: config.title,
      instructions: config.instructions || 'Complete all parts',
      config: config,
      evaluation_method: 'composite'
    };
  }
}

// ===== 使用範例 =====
/*
// 1. 創建一個選擇題
const mcQuestion = TaskModuleFactory.createModule('multiple_choice', {
  title: 'AI Ethics Question',
  question: 'What is the most important consideration in AI development?',
  options: [
    { id: 'a', text: 'Performance', is_correct: false },
    { id: 'b', text: 'Ethics and Safety', is_correct: true },
    { id: 'c', text: 'Profitability', is_correct: false }
  ],
  explanation: 'Ethics and safety should always be the primary consideration.'
});

// 2. 創建一個對話題
const conversationTask = TaskModuleFactory.createModule('conversation', {
  title: 'Discuss AI in Healthcare',
  initial_prompt: 'Let\'s explore how AI can improve healthcare...',
  ai_role: 'Healthcare AI Expert',
  conversation_goals: [
    'Understand current AI applications in healthcare',
    'Discuss ethical considerations',
    'Explore future possibilities'
  ]
});

// 3. 創建一個複合題（包含多個子任務）
const compositeTask = TaskModuleFactory.createModule('composite', {
  title: 'Complete AI Project Assessment',
  sub_modules: [
    mcQuestion,
    conversationTask,
    TaskModuleFactory.createModule('creative_writing', {
      title: 'Write an AI Ethics Policy',
      prompt: 'Draft a brief AI ethics policy for a healthcare startup',
      constraints: { min_words: 200, max_words: 500 }
    })
  ],
  completion_rule: 'all'
});
*/