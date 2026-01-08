export interface AssessmentResults {
  tech: number;
  creative: number;
  business: number;
}

export interface QuestionOption {
  id: string;
  text: string;
  weight: {
    tech: number;
    creative: number;
    business: number;
  };
}

export interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
}

export interface InterestAssessmentProps {
  onComplete: (
    results: AssessmentResults,
    answers?: Record<string, string[]>,
  ) => void;
}
