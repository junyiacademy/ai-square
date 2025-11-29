'use client';

import { type TFunction } from 'i18next';
import { Scenario, Task, DomainType } from '@/types/pbl';
import { StarRating } from '@/components/shared/StarRating';
import { getQualitativeRating, getLocalizedField } from '@/app/pbl/scenarios/[id]/programs/[programId]/tasks/[taskId]/utils/task-helpers';

interface KSAScores {
  knowledge: number;
  skills: number;
  attitudes: number;
}

interface ConversationInsight {
  quote: string;
  suggestion: string;
}

interface ConversationInsights {
  effectiveExamples?: ConversationInsight[];
  improvementAreas?: ConversationInsight[];
}

interface TaskEvaluation {
  score: number;
  domainScores?: Record<DomainType, number>;
  ksaScores?: KSAScores;
  strengths?: string[];
  improvements?: string[];
  conversationInsights?: ConversationInsights;
}

interface MobileTaskInfoViewProps {
  currentTask: Task;
  scenario: Scenario;
  taskIndex: number;
  evaluation: TaskEvaluation | null;
  language: string;
  onCompleteTask: () => void;
  t: TFunction;
}

export function MobileTaskInfoView({
  currentTask,
  scenario,
  taskIndex,
  evaluation,
  language,
  onCompleteTask,
  t
}: MobileTaskInfoViewProps) {
  return (
    <div className="h-full bg-white dark:bg-gray-800 p-6 overflow-y-auto">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {t('pbl:learn.task')} {taskIndex + 1}: {(() => {
          const title = currentTask.title;
          if (typeof title === 'object' && title !== null && !Array.isArray(title)) {
            const titleObj = title as Record<string, string>;
            return titleObj[language] || titleObj['en'] || Object.values(titleObj)[0] || '';
          }
          return getLocalizedField(currentTask as unknown as Record<string, unknown>, 'title', language);
        })()}
      </h2>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            {t('pbl:learn.description')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {(() => {
              const description = currentTask.description;
              if (typeof description === 'object' && description !== null && !Array.isArray(description)) {
                const descObj = description as Record<string, string>;
                return descObj[language] || descObj['en'] || Object.values(descObj)[0] || '';
              }
              return language === 'zhTW'
                ? (currentTask.description_zhTW || currentTask.description || '')
                : (currentTask.description || '');
            })()}
          </p>
        </div>

        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            {t('pbl:learn.instructions')}
          </h3>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            {Array.isArray(currentTask.instructions) ? currentTask.instructions.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            )) : (
              <li>{t('pbl:learn.noInstructionsAvailable')}</li>
            )}
          </ul>
        </div>

        {currentTask.expectedOutcome && (
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              {t('pbl:details.expectedOutcome')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {language === 'zhTW'
                ? (currentTask.expectedOutcome_zhTW || currentTask.expectedOutcome)
                : currentTask.expectedOutcome}
            </p>
          </div>
        )}
      </div>

      {/* Evaluation Results */}
      {evaluation && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-4">
            {t('pbl:learn.evaluationResults', 'Evaluation Results')}
          </h3>

          {/* Overall Score */}
          <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('pbl:learn.overallScore')}
              </h4>
              {(() => {
                const rating = getQualitativeRating(evaluation.score);
                return (
                  <span className={`text-3xl font-bold ${rating.color}`}>
                    {t(rating.i18nKey)}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Domain Scores */}
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {t('pbl:complete.domainScores')}
            </h4>
            <div className="space-y-2">
              {evaluation.domainScores && (() => {
                const domainOrder: DomainType[] = ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai'];
                const targetDomainsList = scenario?.targetDomains || [];

                return domainOrder.map(domain => {
                  const isTargetDomain = targetDomainsList.length === 0 || targetDomainsList.includes(domain);
                  const score = isTargetDomain ? evaluation.domainScores![domain] : undefined;
                  const isNA = !isTargetDomain || score === undefined || score === null;
                  return (
                    <div key={domain} className={`flex items-center justify-between ${!isTargetDomain ? 'opacity-50' : ''}`}>
                      <span className={`text-sm ${!isTargetDomain ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-600 dark:text-gray-400'}`}>
                        {t(`assessment:domains.${domain}`)}
                      </span>
                      <div className="flex items-center">
                        {isNA ? (
                          <span className="text-sm text-gray-400 dark:text-gray-500 w-36 text-right italic">
                            N/A
                          </span>
                        ) : (
                          <StarRating score={Number(score)} size="sm" />
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* KSA Scores */}
          {evaluation.ksaScores && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                {t('pbl:complete.ksaScores', 'KSA Scores')}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('pbl:complete.knowledge')}
                  </span>
                  <StarRating score={evaluation.ksaScores.knowledge} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('pbl:complete.skills')}
                  </span>
                  <StarRating score={evaluation.ksaScores.skills} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('pbl:complete.attitudes')}
                  </span>
                  <StarRating score={evaluation.ksaScores.attitudes} size="sm" />
                </div>
              </div>
            </div>
          )}

          {/* Conversation Insights */}
          {evaluation.conversationInsights &&
           ((evaluation.conversationInsights.effectiveExamples &&
             Array.isArray(evaluation.conversationInsights.effectiveExamples) &&
             evaluation.conversationInsights.effectiveExamples.length > 0) ||
            (evaluation.conversationInsights.improvementAreas &&
             Array.isArray(evaluation.conversationInsights.improvementAreas) &&
             evaluation.conversationInsights.improvementAreas.length > 0)) && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                {t('pbl:learn.conversationInsights', 'Conversation Insights')}
              </h4>

              {evaluation.conversationInsights.effectiveExamples &&
               Array.isArray(evaluation.conversationInsights.effectiveExamples) &&
               evaluation.conversationInsights.effectiveExamples.length > 0 && (
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">
                    {t('pbl:learn.effectiveExamples', 'What worked well:')}
                  </h5>
                  <div className="space-y-2">
                    {evaluation.conversationInsights.effectiveExamples.map((example, idx) => (
                      <div key={idx} className="bg-white dark:bg-gray-800 p-2 rounded">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                          &ldquo;{example.quote}&rdquo;
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          ✓ {example.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {evaluation.conversationInsights.improvementAreas &&
               Array.isArray(evaluation.conversationInsights.improvementAreas) &&
               evaluation.conversationInsights.improvementAreas.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">
                    {t('pbl:learn.improvementExamples', 'Areas for improvement:')}
                  </h5>
                  <div className="space-y-2">
                    {evaluation.conversationInsights.improvementAreas.map((area, idx) => (
                      <div key={idx} className="bg-white dark:bg-gray-800 p-2 rounded">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                          &ldquo;{area.quote}&rdquo;
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          → {area.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Strengths & Improvements */}
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('pbl:complete.strengths')}
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {evaluation.strengths && evaluation.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('pbl:complete.improvements')}
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {evaluation.improvements && evaluation.improvements.map((improvement, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-yellow-500 mr-2">•</span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onCompleteTask}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          {scenario && taskIndex < scenario.tasks.length - 1
            ? t('pbl:learn.nextTask', 'Next Task')
            : t('pbl:learn.completeProgram', 'Complete Program')}
        </button>
      </div>
    </div>
  );
}
