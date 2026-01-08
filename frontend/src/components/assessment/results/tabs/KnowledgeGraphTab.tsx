import {
  AssessmentResult,
  AssessmentQuestion,
  UserAnswer,
} from "@/types/assessment";
import CompetencyKnowledgeGraph from "../../CompetencyKnowledgeGraph";
import type { KsaMaps } from "@/hooks/assessment/useAssessmentData";

interface KnowledgeGraphTabProps {
  result: AssessmentResult;
  questions: AssessmentQuestion[];
  userAnswers: UserAnswer[];
  domainsData: unknown[] | null;
  ksaMaps: KsaMaps | null;
}

export function KnowledgeGraphTab({
  result,
  questions,
  userAnswers,
  domainsData,
  ksaMaps,
}: KnowledgeGraphTabProps) {
  return (
    <div className="space-y-6">
      <CompetencyKnowledgeGraph
        result={result}
        questions={questions}
        userAnswers={userAnswers}
        domainsData={domainsData}
        ksaMaps={ksaMaps}
      />
    </div>
  );
}
