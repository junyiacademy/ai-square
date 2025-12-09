import { AssessmentDomain, DomainScores } from '@/types/assessment';

interface DomainBreakdownCardsProps {
  domainScores: DomainScores;
  domains: {
    engaging_with_ai: AssessmentDomain;
    creating_with_ai: AssessmentDomain;
    managing_with_ai: AssessmentDomain;
    designing_with_ai: AssessmentDomain;
  };
  getDomainName: (domainKey: string) => string;
}

export function DomainBreakdownCards({ domainScores, domains, getDomainName }: DomainBreakdownCardsProps) {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 55) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Object.entries(domainScores).map(([domainKey, score]) => {
        const domain = domains[domainKey as keyof typeof domains];
        return (
          <div key={domainKey} className="border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold text-gray-900">
                {getDomainName(domainKey)}
              </h4>
              <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                {score}%
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {domain.description}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${score}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
