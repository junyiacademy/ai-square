'use client';

import { useTranslation } from 'react-i18next';
import type { QualitativeFeedback } from '@/types/pbl-completion';

interface QualitativeFeedbackSectionProps {
  feedback: QualitativeFeedback | undefined;
  generatingFeedback: boolean;
  onRegenerateFeedback?: () => void;
}

export function QualitativeFeedbackSection({
  feedback,
  generatingFeedback,
  onRegenerateFeedback
}: QualitativeFeedbackSectionProps) {
  const { t } = useTranslation('pbl');

  if (!feedback && !generatingFeedback) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
      {generatingFeedback ? (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {t('complete.generatingFeedback', 'Generating personalized feedback...')}
          </p>
        </div>
      ) : feedback ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {t('complete.qualitativeFeedback', 'Personalized Feedback')}
            </h2>
            {process.env.NODE_ENV === 'development' && onRegenerateFeedback && (
              <button
                onClick={onRegenerateFeedback}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Regenerate feedback (Dev only)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>

          {/* Overall Assessment */}
          <div className="mb-6">
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              {feedback.overallAssessment}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Strengths */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
              <h3 className="text-lg font-medium text-green-900 dark:text-green-100 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('complete.strengths', 'Your Strengths')}
              </h3>
              <div className="space-y-3">
                {feedback.strengths?.map((strength, index) => (
                  <div key={index}>
                    <h4 className="font-medium text-green-800 dark:text-green-200">
                      {strength.area}
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {strength.description}
                    </p>
                    {strength.example && (
                      <p className="text-sm text-green-600 dark:text-green-400 italic mt-2 pl-4 border-l-2 border-green-300 dark:border-green-600">
                        &ldquo;{strength.example}&rdquo;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Areas for Improvement */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {t('complete.areasForImprovement', 'Growth Opportunities')}
              </h3>
              <div className="space-y-3">
                {feedback.areasForImprovement?.map((area, index) => (
                  <div key={index}>
                    <h4 className="font-medium text-blue-800 dark:text-blue-200">
                      {area.area}
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {area.description}
                    </p>
                    {area.suggestion && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 flex items-start">
                        <svg className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {area.suggestion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Next Steps */}
          {feedback.nextSteps && feedback.nextSteps.length > 0 && (
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-purple-900 dark:text-purple-100 mb-4">
                {t('complete.nextSteps', 'Recommended Next Steps')}
              </h3>
              <ul className="space-y-2">
                {feedback.nextSteps.map((step, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-purple-600 dark:text-purple-400 mr-2">
                      {index + 1}.
                    </span>
                    <span className="text-purple-800 dark:text-purple-200">
                      {step}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Encouragement */}
          {feedback.encouragement && (
            <div className="text-center p-6 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg">
              <p className="text-lg text-gray-800 dark:text-gray-200 italic">
                &ldquo;{feedback.encouragement}&rdquo;
              </p>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
