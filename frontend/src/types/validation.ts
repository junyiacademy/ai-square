// Validation Types

// KSA Data Structure
export interface KSAData {
  knowledge_codes?: {
    themes?: Record<string, KSATheme>;
    codes?: Record<string, KSACode>;
  };
  skills_codes?: {
    themes?: Record<string, KSATheme>;
    codes?: Record<string, KSACode>;
  };
  attitudes_codes?: {
    themes?: Record<string, KSATheme>;
    codes?: Record<string, KSACode>;
  };
}

export interface KSATheme {
  theme: string;
  theme_zhTW?: string;
  theme_zhCN?: string;
  theme_pt?: string;
  theme_ar?: string;
  theme_id?: string;
  theme_th?: string;
  theme_es?: string;
  theme_ja?: string;
  theme_ko?: string;
  theme_fr?: string;
  theme_de?: string;
  theme_ru?: string;
  theme_it?: string;
}

export interface KSACode {
  code: string;
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
  theme: string;
}

// Domain Data Structure
export interface DomainsData {
  domains?: Record<string, Domain>;
}

export interface Domain {
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
  competencies?: Record<string, Competency>;
}

export interface Competency {
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
  knowledge?: string[];
  skills?: string[];
  attitudes?: string[];
}

// Assessment Data Structure
export interface AssessmentData {
  questions?: AssessmentQuestion[];
}

export interface AssessmentQuestion {
  id: string;
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
  domain: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  type: 'multiple_choice' | 'likert_scale' | 'true_false';
  options?: string[];
  correct_answer?: string | number;
}

// PBL Data Structure  
export interface PBLData {
  scenario_info?: {
    id: string;
    title: string;
    description: string;
    estimated_duration: number;
  };
  stages?: PBLStage[];
}

export interface PBLStage {
  id: string;
  title: string;
  title_zhTW?: string;
  title_zhCN?: string;
  title_pt?: string;
  title_ar?: string;
  title_id?: string;
  title_th?: string;
  title_es?: string;
  title_ja?: string;
  title_ko?: string;
  title_fr?: string;
  title_de?: string;
  title_ru?: string;
  title_it?: string;
  tasks?: PBLTask[];
}

export interface PBLTask {
  id: string;
  title: string;
  description: string;
  estimated_duration: number;
}