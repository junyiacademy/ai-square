// PBL Scenario Schema for Vertex AI JSON Mode
export interface PBLScenarioSchema {
  scenario_info: ScenarioInfo;
  ksa_mapping?: KSAMapping;
  tasks: Task[];
}

export interface ScenarioInfo {
  id: string;
  title: string;
  title_zh?: string;
  title_es?: string;
  title_ja?: string;
  title_ko?: string;
  title_fr?: string;
  title_de?: string;
  title_ru?: string;
  title_it?: string;
  description: string;
  description_zh?: string;
  description_es?: string;
  description_ja?: string;
  description_ko?: string;
  description_fr?: string;
  description_de?: string;
  description_ru?: string;
  description_it?: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimated_duration: number;
  target_domains: (
    | "engaging_with_ai"
    | "creating_with_ai"
    | "managing_with_ai"
    | "designing_with_ai"
  )[];
  prerequisites: string[];
  prerequisites_zh?: string[];
  prerequisites_es?: string[];
  prerequisites_ja?: string[];
  prerequisites_ko?: string[];
  prerequisites_fr?: string[];
  prerequisites_de?: string[];
  prerequisites_ru?: string[];
  prerequisites_it?: string[];
  learning_objectives: string[];
  learning_objectives_zh?: string[];
  learning_objectives_es?: string[];
  learning_objectives_ja?: string[];
  learning_objectives_ko?: string[];
  learning_objectives_fr?: string[];
  learning_objectives_de?: string[];
  learning_objectives_ru?: string[];
  learning_objectives_it?: string[];
}

export interface KSAMapping {
  knowledge?: string[];
  skills?: string[];
  attitudes?: string[];
}

export interface Task {
  id: string;
  title: string;
  title_zh?: string;
  title_es?: string;
  title_ja?: string;
  title_ko?: string;
  title_fr?: string;
  title_de?: string;
  title_ru?: string;
  title_it?: string;
  description: string;
  description_zh?: string;
  description_es?: string;
  description_ja?: string;
  description_ko?: string;
  description_fr?: string;
  description_de?: string;
  description_ru?: string;
  description_it?: string;
  category: "research" | "analysis" | "creation" | "interaction";
  instructions: string[];
  instructions_zh?: string[];
  instructions_es?: string[];
  instructions_ja?: string[];
  instructions_ko?: string[];
  instructions_fr?: string[];
  instructions_de?: string[];
  instructions_ru?: string[];
  instructions_it?: string[];
  expected_outcome: string;
  expected_outcome_zh?: string;
  expected_outcome_es?: string;
  expected_outcome_ja?: string;
  expected_outcome_ko?: string;
  expected_outcome_fr?: string;
  expected_outcome_de?: string;
  expected_outcome_ru?: string;
  expected_outcome_it?: string;
  time_limit?: number;
  resources?: string[];
  resources_zh?: string[];
  resources_es?: string[];
  resources_ja?: string[];
  resources_ko?: string[];
  resources_fr?: string[];
  resources_de?: string[];
  resources_ru?: string[];
  resources_it?: string[];
  assessment_focus?: {
    primary?: string[];
    secondary?: string[];
  };
  ai_module?: {
    role: "assistant" | "evaluator" | "actor";
    model: string;
    persona: string;
    initial_prompt: string;
  };
}

// Convert TypeScript interface to JSON Schema for Vertex AI
export const PBL_SCENARIO_JSON_SCHEMA = {
  type: "object",
  properties: {
    scenario_info: {
      type: "object",
      required: [
        "id",
        "title",
        "description",
        "difficulty",
        "estimated_duration",
        "target_domains",
        "prerequisites",
        "learning_objectives",
      ],
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        title_zh: { type: "string" },
        title_es: { type: "string" },
        title_ja: { type: "string" },
        title_ko: { type: "string" },
        title_fr: { type: "string" },
        title_de: { type: "string" },
        title_ru: { type: "string" },
        title_it: { type: "string" },
        description: { type: "string" },
        description_zh: { type: "string" },
        description_es: { type: "string" },
        description_ja: { type: "string" },
        description_ko: { type: "string" },
        description_fr: { type: "string" },
        description_de: { type: "string" },
        description_ru: { type: "string" },
        description_it: { type: "string" },
        difficulty: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
        },
        estimated_duration: { type: "number" },
        target_domains: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "engaging_with_ai",
              "creating_with_ai",
              "managing_with_ai",
              "designing_with_ai",
            ],
          },
        },
        prerequisites: { type: "array", items: { type: "string" } },
        prerequisites_zh: { type: "array", items: { type: "string" } },
        prerequisites_es: { type: "array", items: { type: "string" } },
        prerequisites_ja: { type: "array", items: { type: "string" } },
        prerequisites_ko: { type: "array", items: { type: "string" } },
        prerequisites_fr: { type: "array", items: { type: "string" } },
        prerequisites_de: { type: "array", items: { type: "string" } },
        prerequisites_ru: { type: "array", items: { type: "string" } },
        prerequisites_it: { type: "array", items: { type: "string" } },
        learning_objectives: { type: "array", items: { type: "string" } },
        learning_objectives_zh: { type: "array", items: { type: "string" } },
        learning_objectives_es: { type: "array", items: { type: "string" } },
        learning_objectives_ja: { type: "array", items: { type: "string" } },
        learning_objectives_ko: { type: "array", items: { type: "string" } },
        learning_objectives_fr: { type: "array", items: { type: "string" } },
        learning_objectives_de: { type: "array", items: { type: "string" } },
        learning_objectives_ru: { type: "array", items: { type: "string" } },
        learning_objectives_it: { type: "array", items: { type: "string" } },
      },
    },
    ksa_mapping: {
      type: "object",
      properties: {
        knowledge: { type: "array", items: { type: "string" } },
        skills: { type: "array", items: { type: "string" } },
        attitudes: { type: "array", items: { type: "string" } },
      },
    },
    tasks: {
      type: "array",
      items: {
        type: "object",
        required: [
          "id",
          "title",
          "description",
          "category",
          "instructions",
          "expected_outcome",
        ],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          title_zh: { type: "string" },
          title_es: { type: "string" },
          title_ja: { type: "string" },
          title_ko: { type: "string" },
          title_fr: { type: "string" },
          title_de: { type: "string" },
          title_ru: { type: "string" },
          title_it: { type: "string" },
          description: { type: "string" },
          description_zh: { type: "string" },
          description_es: { type: "string" },
          description_ja: { type: "string" },
          description_ko: { type: "string" },
          description_fr: { type: "string" },
          description_de: { type: "string" },
          description_ru: { type: "string" },
          description_it: { type: "string" },
          category: {
            type: "string",
            enum: ["research", "analysis", "creation", "interaction"],
          },
          instructions: { type: "array", items: { type: "string" } },
          instructions_zh: { type: "array", items: { type: "string" } },
          instructions_es: { type: "array", items: { type: "string" } },
          instructions_ja: { type: "array", items: { type: "string" } },
          instructions_ko: { type: "array", items: { type: "string" } },
          instructions_fr: { type: "array", items: { type: "string" } },
          instructions_de: { type: "array", items: { type: "string" } },
          instructions_ru: { type: "array", items: { type: "string" } },
          instructions_it: { type: "array", items: { type: "string" } },
          expected_outcome: { type: "string" },
          expected_outcome_zh: { type: "string" },
          expected_outcome_es: { type: "string" },
          expected_outcome_ja: { type: "string" },
          expected_outcome_ko: { type: "string" },
          expected_outcome_fr: { type: "string" },
          expected_outcome_de: { type: "string" },
          expected_outcome_ru: { type: "string" },
          expected_outcome_it: { type: "string" },
          time_limit: { type: "number" },
          resources: { type: "array", items: { type: "string" } },
          resources_zh: { type: "array", items: { type: "string" } },
          resources_es: { type: "array", items: { type: "string" } },
          resources_ja: { type: "array", items: { type: "string" } },
          resources_ko: { type: "array", items: { type: "string" } },
          resources_fr: { type: "array", items: { type: "string" } },
          resources_de: { type: "array", items: { type: "string" } },
          resources_ru: { type: "array", items: { type: "string" } },
          resources_it: { type: "array", items: { type: "string" } },
          assessment_focus: {
            type: "object",
            properties: {
              primary: { type: "array", items: { type: "string" } },
              secondary: { type: "array", items: { type: "string" } },
            },
          },
          ai_module: {
            type: "object",
            properties: {
              role: {
                type: "string",
                enum: ["assistant", "evaluator", "actor"],
              },
              model: { type: "string" },
              persona: { type: "string" },
              initial_prompt: { type: "string" },
            },
          },
        },
      },
    },
  },
  required: ["scenario_info", "tasks"],
};
