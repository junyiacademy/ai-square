import { AssessmentResult, AssessmentDomain, RadarChartData } from '@/types/assessment';
import { DynamicDomainRadarChart } from '@/lib/dynamic-imports';
import { DomainBreakdownCards } from '../DomainBreakdownCards';

interface OverviewTabProps {
  result: AssessmentResult;
  radarData: RadarChartData[];
  domains: {
    engaging_with_ai: AssessmentDomain;
    creating_with_ai: AssessmentDomain;
    managing_with_ai: AssessmentDomain;
    designing_with_ai: AssessmentDomain;
  };
  getDomainName: (domainKey: string) => string;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function OverviewTab({ result, radarData, domains, getDomainName, t }: OverviewTabProps) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('results.skillRadar')}
        </h3>
        <div className="bg-gray-50 rounded-lg p-6">
          <DynamicDomainRadarChart data={radarData} />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('results.summary')}
        </h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">
            {t('results.summaryText', {
              level: t(`level.${result.level}`),
              score: result.overallScore,
              correct: result.correctAnswers,
              total: result.totalQuestions
            })}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('results.domainBreakdown')}
        </h3>
        <DomainBreakdownCards
          domainScores={result.domainScores}
          domains={domains}
          getDomainName={getDomainName}
        />
      </div>
    </div>
  );
}
