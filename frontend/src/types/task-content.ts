/**
 * Type definitions for task content structures
 */

// Assessment task content types
export interface AssessmentQuestion {
  id: string;
  domain: string;
  question: string;
  options: Record<string, string>;
  difficulty: string;
  correct_answer: string;
  explanation: string;
  ksa_mapping?: {
    knowledge?: string[];
    skills?: string[];
    attitudes?: string[];
  };
}

export interface AssessmentTaskContext {
  questions: AssessmentQuestion[];
  timeLimit: number;
  language: string;
  domainId: string;
}

// Discovery task content types
export interface DiscoveryTaskContext {
  xp?: number;
  careerType?: string;
  [key: string]: unknown;
}

// PBL task content types
export interface PBLTaskContext {
  scenario?: string;
  objectives?: string[];
  [key: string]: unknown;
}

// System event content types
export interface AssessmentAnswerContent {
  eventType: "assessment_answer";
  questionId: string;
  questionIndex?: number;
  selectedAnswer: string;
  answer?: string;
  isCorrect: boolean;
  timeSpent?: number;
  ksa_mapping?: {
    knowledge?: string[];
    skills?: string[];
    attitudes?: string[];
  };
}

export interface AIResponseContent {
  message?: string;
  completed?: boolean;
  feedback?: string;
  [key: string]: unknown;
}

export interface UserInputContent {
  message: string;
  [key: string]: unknown;
}

export type InteractionContent =
  | AssessmentAnswerContent
  | AIResponseContent
  | UserInputContent
  | Record<string, unknown>;

// Type guards
export function isAssessmentAnswerContent(
  content: unknown,
): content is AssessmentAnswerContent {
  return (
    typeof content === "object" &&
    content !== null &&
    "eventType" in content &&
    (content as Record<string, unknown>).eventType === "assessment_answer"
  );
}

export function hasQuestions(
  context: unknown,
): context is { questions: unknown[] } {
  return (
    typeof context === "object" &&
    context !== null &&
    "questions" in context &&
    Array.isArray((context as Record<string, unknown>).questions)
  );
}

export function hasXP(context: unknown): context is { xp: number } {
  return (
    typeof context === "object" &&
    context !== null &&
    "xp" in context &&
    typeof (context as Record<string, unknown>).xp === "number"
  );
}

export function hasCareerType(
  metadata: unknown,
): metadata is { careerType: string } {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "careerType" in metadata &&
    typeof (metadata as Record<string, unknown>).careerType === "string"
  );
}
