/**
 * AI Prompt Templates for Scenario Generation
 * Templates for generating PBL, Discovery, and Assessment scenarios using Vertex AI
 */

import type { CourseGenerationInput } from "@/types/prompt-to-course";

/**
 * System prompt for scenario generation
 */
const SYSTEM_PROMPT = `You are an expert educational content designer specializing in AI literacy and adaptive learning systems. Your task is to generate high-quality YAML scenario files based on user requirements.

CRITICAL RULES:
1. Output ONLY valid YAML - no markdown, no explanations
2. Use proper YAML indentation (2 spaces)
3. All text fields with translations must use Record<string, string> format
4. Generate UUID v4 for scenario ID
5. Include proper timestamps in ISO 8601 format
6. Follow the exact schema structure provided

MULTILINGUAL FIELD FORMAT:
All title, description, and text content fields MUST be objects with language keys:
en: "English text"
zhTW: "繁體中文文字"

NEVER use plain strings for these fields!`;

/**
 * Get prompt template by mode
 */
export function getPromptByMode(input: CourseGenerationInput): string {
  switch (input.mode) {
    case "pbl":
      return generatePBLPrompt(input);
    case "discovery":
      return generateDiscoveryPrompt(input);
    case "assessment":
      return generateAssessmentPrompt(input);
    default:
      throw new Error(`Unknown mode: ${input.mode}`);
  }
}

/**
 * PBL scenario prompt template
 */
function generatePBLPrompt(input: CourseGenerationInput): string {
  return `${SYSTEM_PROMPT}

Generate a Problem-Based Learning (PBL) scenario with the following requirements:

INPUT:
- Scenario ID: ${input.scenarioId}
- Title: ${input.title}
- Description: ${input.description}
- Difficulty: ${input.difficulty}
- Estimated Time: ${input.estimatedMinutes} minutes
- Number of Tasks: ${input.taskCount}
- Target Domains: ${input.targetDomains.join(", ")}
- Prerequisites: ${input.prerequisites?.join(", ") || "None"}
- Language: ${input.language}

REQUIRED YAML STRUCTURE:
\`\`\`yaml
id: "<uuid-v4>"
mode: pbl
status: draft
version: "1.0.0"

sourceType: ai_generated
sourceMetadata:
  generator: "vertex-ai-gemini-2.5-flash"
  timestamp: "<ISO-8601-timestamp>"
  userPrompt: "${input.description}"

title:
  en: "${input.title}"
  zhTW: "<traditional-chinese-translation>"

description:
  en: "${input.description}"
  zhTW: "<traditional-chinese-translation>"

objectives:
  en:
    - "<objective-1>"
    - "<objective-2>"
  zhTW:
    - "<traditional-chinese-objective-1>"
    - "<traditional-chinese-objective-2>"

difficulty: ${input.difficulty}
estimatedMinutes: ${input.estimatedMinutes}
prerequisites: ${JSON.stringify(input.prerequisites || [])}

taskTemplates:
  - id: "task-1"
    title:
      en: "<task-title>"
      zhTW: "<traditional-chinese-task-title>"
    type: analysis # or creation, chat, reflection
    description:
      en: "<task-description>"
      zhTW: "<traditional-chinese-task-description>"
  # ... ${input.taskCount} tasks total

xpRewards:
  task_completion: 100
  bonus_thinking: 50

pblData:
  scenario:
    context:
      en: "<realistic-context>"
      zhTW: "<traditional-chinese-context>"
    challenge:
      en: "<main-challenge>"
      zhTW: "<traditional-chinese-challenge>"
    roles:
      - "<role-1>"
      - "<role-2>"
  stages:
    - id: "explore"
      name:
        en: "Exploration"
        zhTW: "探索"
      type: explore
      description:
        en: "<stage-description>"
        zhTW: "<traditional-chinese-stage-description>"
      taskIds: ["task-1", "task-2"]
    # ... more stages (explore, analyze, create, evaluate, reflect)

discoveryData: {}
assessmentData: {}

aiModules:
  default:
    model: "gemini-2.5-flash"
    persona: "<helpful-ai-persona>"
    temperature: 0.7

resources:
  - type: reference
    title:
      en: "<resource-title>"
      zhTW: "<traditional-chinese-resource-title>"
    url: "<url>"

createdAt: "<ISO-8601-timestamp>"
updatedAt: "<ISO-8601-timestamp>"

metadata:
  creator: "ai-generator"
  targetDomains: ${JSON.stringify(input.targetDomains)}
\`\`\`

IMPORTANT GUIDELINES:
1. Create ${input.taskCount} diverse tasks covering different cognitive levels
2. Design realistic, engaging problem scenarios
3. Include clear learning objectives aligned with AI literacy framework
4. Provide multilingual content (English and Traditional Chinese)
5. Ensure tasks progress from basic understanding to complex application
6. Include appropriate AI module configuration for interactive guidance
7. Add relevant resources and references

Generate the complete YAML now (output YAML only, no explanations):`;
}

/**
 * Discovery scenario prompt template
 */
function generateDiscoveryPrompt(input: CourseGenerationInput): string {
  return `${SYSTEM_PROMPT}

Generate a Discovery (Career Exploration) scenario with the following requirements:

INPUT:
- Scenario ID: ${input.scenarioId}
- Career Path: ${input.title}
- Description: ${input.description}
- Difficulty: ${input.difficulty}
- Estimated Time: ${input.estimatedMinutes} minutes
- Number of Tasks: ${input.taskCount}
- Target Domains: ${input.targetDomains.join(", ")}
- Language: ${input.language}

REQUIRED YAML STRUCTURE:
\`\`\`yaml
id: "<uuid-v4>"
mode: discovery
status: draft
version: "1.0.0"

sourceType: ai_generated
sourceMetadata:
  generator: "vertex-ai-gemini-2.5-flash"
  timestamp: "<ISO-8601-timestamp>"

title:
  en: "${input.title}"
  zhTW: "<traditional-chinese-translation>"

description:
  en: "${input.description}"
  zhTW: "<traditional-chinese-translation>"

objectives:
  en:
    - "<career-objective-1>"
    - "<career-objective-2>"
  zhTW:
    - "<traditional-chinese-objective-1>"
    - "<traditional-chinese-objective-2>"

difficulty: ${input.difficulty}
estimatedMinutes: ${input.estimatedMinutes}
prerequisites: []

taskTemplates:
  - id: "task-1"
    title:
      en: "<exploration-task-title>"
      zhTW: "<traditional-chinese-task-title>"
    type: chat # or analysis, creation, reflection
    description:
      en: "<task-description>"
      zhTW: "<traditional-chinese-task-description>"
  # ... ${input.taskCount} tasks total

xpRewards:
  task_completion: 150
  milestone_bonus: 300

discoveryData:
  careerPath: "${input.title}"
  requiredSkills:
    - "<skill-1>"
    - "<skill-2>"
    - "<skill-3>"
  industryInsights:
    growthRate: "<percentage>"
    demandLevel: "high" # or medium, low
    futureOutlook: "<outlook-description>"
  careerLevel: ${input.difficulty === "beginner" ? "entry" : input.difficulty === "advanced" ? "senior" : "intermediate"}
  estimatedSalaryRange:
    min: <min-salary>
    max: <max-salary>
    currency: "USD"
  relatedCareers:
    - "<related-career-1>"
    - "<related-career-2>"
  dayInLife:
    en: "<day-in-life-description>"
    zhTW: "<traditional-chinese-day-in-life>"
  challenges:
    en:
      - "<challenge-1>"
      - "<challenge-2>"
    zhTW:
      - "<traditional-chinese-challenge-1>"
      - "<traditional-chinese-challenge-2>"
  rewards:
    en:
      - "<reward-1>"
      - "<reward-2>"
    zhTW:
      - "<traditional-chinese-reward-1>"
      - "<traditional-chinese-reward-2>"

pblData: {}
assessmentData: {}

aiModules:
  careerMentor:
    model: "gemini-2.5-flash"
    persona: "<career-mentor-persona>"
    temperature: 0.8

resources:
  - type: industry_report
    title:
      en: "<report-title>"
      zhTW: "<traditional-chinese-report-title>"
    url: "<url>"

createdAt: "<ISO-8601-timestamp>"
updatedAt: "<ISO-8601-timestamp>"

metadata:
  careerCategory: "<category>"
  targetDomains: ${JSON.stringify(input.targetDomains)}
\`\`\`

IMPORTANT GUIDELINES:
1. Create ${input.taskCount} engaging career exploration tasks
2. Include realistic career insights and industry data
3. Design tasks that help learners discover if this career fits them
4. Provide multilingual content (English and Traditional Chinese)
5. Include day-in-life scenarios, challenges, and rewards
6. Add relevant salary information and career progression
7. Configure AI as a helpful career mentor

Generate the complete YAML now (output YAML only, no explanations):`;
}

/**
 * Assessment scenario prompt template
 */
function generateAssessmentPrompt(input: CourseGenerationInput): string {
  return `${SYSTEM_PROMPT}

Generate an Assessment scenario with the following requirements:

INPUT:
- Scenario ID: ${input.scenarioId}
- Assessment Title: ${input.title}
- Description: ${input.description}
- Difficulty: ${input.difficulty}
- Estimated Time: ${input.estimatedMinutes} minutes
- Number of Questions: ${input.taskCount}
- Target Domains: ${input.targetDomains.join(", ")}
- Language: ${input.language}

REQUIRED YAML STRUCTURE:
\`\`\`yaml
id: "<uuid-v4>"
mode: assessment
status: draft
version: "1.0.0"

sourceType: ai_generated
sourceMetadata:
  generator: "vertex-ai-gemini-2.5-flash"
  timestamp: "<ISO-8601-timestamp>"

title:
  en: "${input.title}"
  zhTW: "<traditional-chinese-translation>"

description:
  en: "${input.description}"
  zhTW: "<traditional-chinese-translation>"

objectives:
  en:
    - "<assessment-objective-1>"
    - "<assessment-objective-2>"
  zhTW:
    - "<traditional-chinese-objective-1>"
    - "<traditional-chinese-objective-2>"

difficulty: ${input.difficulty}
estimatedMinutes: ${input.estimatedMinutes}
prerequisites: []

taskTemplates:
  - id: "q1"
    title:
      en: "<question-title>"
      zhTW: "<traditional-chinese-question-title>"
    type: quiz
    description:
      en: "<question-text>"
      zhTW: "<traditional-chinese-question-text>"
    options:
      en:
        - "<option-a>"
        - "<option-b>"
        - "<option-c>"
        - "<option-d>"
      zhTW:
        - "<traditional-chinese-option-a>"
        - "<traditional-chinese-option-b>"
        - "<traditional-chinese-option-c>"
        - "<traditional-chinese-option-d>"
    correctAnswer: 0 # index of correct option
    explanation:
      en: "<explanation>"
      zhTW: "<traditional-chinese-explanation>"
  # ... ${input.taskCount} questions total

xpRewards:
  correct_answer: 10
  perfect_score_bonus: 100

assessmentData:
  domains: ${JSON.stringify(input.targetDomains)}
  questionTypes: ["multiple_choice"]
  passingScore: 70
  timeLimit: ${input.estimatedMinutes * 60}
  randomizeQuestions: true
  showCorrectAnswers: true

pblData: {}
discoveryData: {}

aiModules: {}

resources: []

createdAt: "<ISO-8601-timestamp>"
updatedAt: "<ISO-8601-timestamp>"

metadata:
  assessmentType: "diagnostic" # or formative, summative
  targetDomains: ${JSON.stringify(input.targetDomains)}
\`\`\`

IMPORTANT GUIDELINES:
1. Create ${input.taskCount} well-designed multiple-choice questions
2. Ensure questions assess different cognitive levels (remember, understand, apply, analyze)
3. Provide clear, unambiguous options with one correct answer
4. Include explanations for correct answers
5. Provide multilingual content (English and Traditional Chinese)
6. Set appropriate passing score (70%) and time limit
7. Align questions with target domains

Generate the complete YAML now (output YAML only, no explanations):`;
}

/**
 * Get system prompt for Vertex AI
 */
export function getSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

/**
 * Few-shot examples for better generation (optional enhancement)
 */
export const FEW_SHOT_EXAMPLES = {
  pbl: `Example PBL scenario structure:
- Real-world problem context
- Clear challenge statement
- Multiple stages (explore → analyze → create → evaluate → reflect)
- Diverse task types (analysis, creation, chat, reflection)
- AI persona as guide/mentor
- Realistic resources and references`,

  discovery: `Example Discovery scenario structure:
- Career path overview with industry insights
- Required skills and competencies
- Day-in-life scenarios
- Challenges and rewards
- Salary ranges and career progression
- Related careers and opportunities
- AI career mentor guidance`,

  assessment: `Example Assessment scenario structure:
- Clear learning objectives to assess
- Multiple-choice questions with 4 options
- One correct answer with explanation
- Questions covering different cognitive levels
- Domain-aligned content
- Appropriate time limits
- Passing criteria`,
};
