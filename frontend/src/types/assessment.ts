export interface AssessmentQuestion {
  id: string;
  domain: 'engaging_with_ai' | 'creating_with_ai' | 'managing_with_ai' | 'designing_with_ai';
  difficulty: 'basic' | 'intermediate' | 'advanced';
  type: 'multiple_choice';
  question: string;
  question_zhTW?: string;
  question_zhCN?: string;
  question_pt?: string;
  question_ar?: string;
  question_id?: string;
  question_th?: string;
  question_es?: string;
  question_ja?: string;
  question_ko?: string;
  question_fr?: string;
  question_de?: string;
  question_ru?: string;
  question_it?: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  options_zhTW?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  options_zhCN?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  options_pt?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  options_ar?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  options_id?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  options_th?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  options_es?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  options_ja?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  options_ko?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  options_fr?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  options_de?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  options_ru?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  options_it?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correct_answer: 'a' | 'b' | 'c' | 'd';
  explanation: string;
  ksa_mapping: {
    knowledge: string[];
    skills: string[];
    attitudes: string[];
  };
}

export interface AssessmentDomain {
  name: string;
  name_zhTW?: string;
  name_zhCN?: string;
  name_pt?: string;
  name_ar?: string;
  name_id?: string;
  name_th?: string;
  name_es?: string;
  name_ja?: string;
  name_ko?: string;
  name_fr?: string;
  name_de?: string;
  name_ru?: string;
  name_it?: string;
  description: string;
  questions: number;
}

export interface AssessmentConfig {
  id: string;
  title: string;
  description: string;
  total_questions: number;
  time_limit_minutes: number;
  passing_score: number;
  domains: {
    [key: string]: {
      description: string;
      questions: number;
    };
  };
}

export interface AssessmentTask {
  id: string;
  title: string;
  description: string;
  time_limit_minutes: number;
  questions: AssessmentQuestion[];
}

export interface AssessmentData {
  assessment_config: AssessmentConfig;
  tasks: AssessmentTask[];
  // Legacy support - will be removed
  domains?: {
    engaging_with_ai: AssessmentDomain;
    creating_with_ai: AssessmentDomain;
    managing_with_ai: AssessmentDomain;
    designing_with_ai: AssessmentDomain;
  };
  questions?: AssessmentQuestion[];
}

export interface UserAnswer {
  questionId: string;
  selectedAnswer: 'a' | 'b' | 'c' | 'd';
  timeSpent: number;
  isCorrect: boolean;
}

export interface DomainScores {
  engaging_with_ai: number;
  creating_with_ai: number;
  managing_with_ai: number;
  designing_with_ai: number;
}

export interface AssessmentResult {
  overallScore: number;
  domainScores: DomainScores;
  totalQuestions: number;
  correctAnswers: number;
  timeSpentSeconds: number;
  completedAt: Date;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  recommendations: string[];
  ksaAnalysis?: {
    knowledge: {
      score: number;
      strong: string[];
      weak: string[];
    };
    skills: {
      score: number;
      strong: string[];
      weak: string[];
    };
    attitudes: {
      score: number;
      strong: string[];
      weak: string[];
    };
  };
}

export interface RadarChartData {
  domain: string;
  score: number;
  fullMark: 100;
}
