'use client';

import { useTranslation } from 'react-i18next';
import { StageResult } from '@/types/pbl';

interface KSADiagnosticReportProps {
  stageResults: StageResult[];
  ksaMapping?: {
    knowledge: string[];
    skills: string[];
    attitudes: string[];
  };
}

// KSA descriptions mapping
const KSA_DESCRIPTIONS = {
  'K1.1': 'Understanding AI capabilities',
  'K1.2': 'AI limitations awareness',
  'K2.1': 'Effective prompting techniques',
  'K2.3': 'AI content evaluation',
  'S1.1': 'Basic AI interaction',
  'S1.2': 'Advanced prompting',
  'S2.1': 'Content creation with AI',
  'S2.3': 'AI-assisted analysis',
  'A1.1': 'Curiosity about AI',
  'A1.2': 'Critical thinking',
  'A2.1': 'Responsible AI use'
};

export default function KSADiagnosticReport({ stageResults }: KSADiagnosticReportProps) {
  const { t } = useTranslation(['pbl']);

  // Aggregate KSA scores across all stages
  const aggregateKSAScores = () => {
    const ksaScoreMap: { [ksa: string]: number[] } = {};
    
    stageResults.forEach(result => {
      if (result.ksaAchievement) {
        Object.entries(result.ksaAchievement).forEach(([ksa, achievement]) => {
          if (!ksaScoreMap[ksa]) {
            ksaScoreMap[ksa] = [];
          }
          ksaScoreMap[ksa].push(achievement.score);
        });
      }
    });

    // Calculate average scores
    const avgScores: { [ksa: string]: number } = {};
    Object.entries(ksaScoreMap).forEach(([ksa, scores]) => {
      avgScores[ksa] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    });

    return avgScores;
  };

  const ksaScores = aggregateKSAScores();
  
  // Group by category
  const groupedScores = {
    knowledge: [] as { code: string; score: number; description: string }[],
    skills: [] as { code: string; score: number; description: string }[],
    attitudes: [] as { code: string; score: number; description: string }[]
  };

  Object.entries(ksaScores).forEach(([ksa, score]) => {
    const category = ksa.charAt(0) === 'K' ? 'knowledge' : 
                    ksa.charAt(0) === 'S' ? 'skills' : 'attitudes';
    
    groupedScores[category].push({
      code: ksa,
      score,
      description: KSA_DESCRIPTIONS[ksa as keyof typeof KSA_DESCRIPTIONS] || ksa
    });
  });

  // Sort by score (descending)
  Object.keys(groupedScores).forEach(category => {
    groupedScores[category as keyof typeof groupedScores].sort((a, b) => b.score - a.score);
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-100 dark:border-gray-700">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 flex items-center">
        <span className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full mr-3"></span>
        {t('complete.ksaDiagnosticReport')}
      </h2>

      <div className="space-y-8">
        {/* Knowledge Section */}
        <div>
          <h3 className="text-lg font-medium text-blue-600 dark:text-blue-400 mb-4">
            {t('complete.knowledge')}
          </h3>
          <div className="space-y-3">
            {groupedScores.knowledge.map(item => (
              <div key={item.code} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <span className="font-medium text-gray-900 dark:text-white mr-2">
                      {item.code}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.description}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getScoreBarColor(item.score)}`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
                <span className={`ml-4 font-bold ${getScoreColor(item.score)}`}>
                  {item.score}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Skills Section */}
        <div>
          <h3 className="text-lg font-medium text-green-600 dark:text-green-400 mb-4">
            {t('complete.skills')}
          </h3>
          <div className="space-y-3">
            {groupedScores.skills.map(item => (
              <div key={item.code} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <span className="font-medium text-gray-900 dark:text-white mr-2">
                      {item.code}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.description}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getScoreBarColor(item.score)}`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
                <span className={`ml-4 font-bold ${getScoreColor(item.score)}`}>
                  {item.score}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Attitudes Section */}
        <div>
          <h3 className="text-lg font-medium text-purple-600 dark:text-purple-400 mb-4">
            {t('complete.attitudes')}
          </h3>
          <div className="space-y-3">
            {groupedScores.attitudes.map(item => (
              <div key={item.code} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <span className="font-medium text-gray-900 dark:text-white mr-2">
                      {item.code}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.description}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getScoreBarColor(item.score)}`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
                <span className={`ml-4 font-bold ${getScoreColor(item.score)}`}>
                  {item.score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Insights */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">
          {t('complete.diagnosticInsights')}
        </h4>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-start">
            <span className="text-green-500 mr-2">•</span>
            {t('complete.strongestAreas')}: {
              [...groupedScores.knowledge, ...groupedScores.skills, ...groupedScores.attitudes]
                .sort((a, b) => b.score - a.score)
                .slice(0, 3)
                .map(item => `${item.code} (${item.score}%)`)
                .join(', ')
            }
          </li>
          <li className="flex items-start">
            <span className="text-orange-500 mr-2">•</span>
            {t('complete.areasForImprovement')}: {
              [...groupedScores.knowledge, ...groupedScores.skills, ...groupedScores.attitudes]
                .sort((a, b) => a.score - b.score)
                .slice(0, 3)
                .map(item => `${item.code} (${item.score}%)`)
                .join(', ')
            }
          </li>
        </ul>
      </div>
    </div>
  );
}