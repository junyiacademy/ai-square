'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AssessmentResult, AssessmentDomain, RadarChartData, AssessmentQuestion, UserAnswer } from '../../types/assessment';
import { ResultsHeader } from './results/ResultsHeader';
import { SaveMessage } from './results/SaveMessage';
import { ActionButtons } from './results/ActionButtons';
import { OverviewTab } from './results/tabs/OverviewTab';
import { RecommendationsTab } from './results/tabs/RecommendationsTab';
import { KnowledgeGraphTab } from './results/tabs/KnowledgeGraphTab';
import { useCurrentUser } from '@/hooks/assessment/useCurrentUser';
import { useAssessmentData } from '@/hooks/assessment/useAssessmentData';
import { useAssessmentSave } from '@/hooks/assessment/useAssessmentSave';

interface AssessmentResultsProps {
  result: AssessmentResult;
  domains: {
    engaging_with_ai: AssessmentDomain;
    creating_with_ai: AssessmentDomain;
    managing_with_ai: AssessmentDomain;
    designing_with_ai: AssessmentDomain;
  };
  onRetake: () => void;
  questions?: AssessmentQuestion[];
  userAnswers?: UserAnswer[];
  isReview?: boolean;
}

export default function AssessmentResults({ result, domains, onRetake, questions = [], userAnswers = [], isReview = false }: AssessmentResultsProps) {
  const { t, i18n } = useTranslation('assessment');
  const [activeTab, setActiveTab] = useState<'overview' | 'recommendations' | 'knowledge-graph'>('overview');

  const currentUser = useCurrentUser();
  const { domainsData, ksaMaps } = useAssessmentData(i18n.language);
  const { isSaving, saveMessage, isSaved, handleSaveResults } = useAssessmentSave({
    currentUser,
    result,
    userAnswers,
    questions,
    language: i18n.language,
    isReview
  });

  const getDomainName = useCallback((domainKey: string) => {
    return t(`domains.${domainKey}`);
  }, [t]);

  const radarData: RadarChartData[] = Object.entries(result.domainScores).map(([domain, score]) => ({
    domain: getDomainName(domain),
    score,
    fullMark: 100
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t('results.title')}
          </h1>
          <p className="text-lg text-gray-600">
            {t('results.subtitle')}
          </p>
        </div>

        <ResultsHeader result={result} language={i18n.language} t={t} />

        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              {['overview', 'recommendations', 'knowledge-graph'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t(`results.tabs.${tab}`)}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <OverviewTab
                result={result}
                radarData={radarData}
                domains={domains}
                getDomainName={getDomainName}
                t={t}
              />
            )}

            {activeTab === 'recommendations' && (
              <RecommendationsTab recommendations={result.recommendations} t={t} />
            )}

            {activeTab === 'knowledge-graph' && (
              <KnowledgeGraphTab
                result={result}
                questions={questions}
                userAnswers={userAnswers}
                domainsData={domainsData}
                ksaMaps={ksaMaps}
              />
            )}
          </div>
        </div>

        {saveMessage && <SaveMessage type={saveMessage.type} text={saveMessage.text} />}

        <ActionButtons
          currentUser={currentUser}
          isSaved={isSaved}
          isSaving={isSaving}
          isReview={isReview}
          result={result}
          onRetake={onRetake}
          onSave={() => handleSaveResults(t)}
          t={t}
        />
      </div>
    </div>
  );
}
