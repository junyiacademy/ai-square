'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { PBLCompletionSkeleton } from '@/components/pbl/loading-skeletons';
import {
  CompletionHeader,
  TabNavigation,
  QualitativeFeedbackSection,
  ScoreCardsGrid,
  TaskDetailsSection,
  CertificateView,
  ActionButtons
} from '@/components/pbl/completion';
import type {
  CompletionData,
  ScenarioData,
  QualitativeFeedback
} from '@/types/pbl-completion';
import { authenticatedFetch } from '@/lib/utils/authenticated-fetch';

// Add print styles - optimized for color printing with background graphics
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @media print {
      @page {
        margin: 0;
        size: A4;
        color: color;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        color-scheme: light;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      header, nav, footer, .print\\:hidden {
        display: none !important;
      }

      .no-print {
        display: none !important;
      }

      .certificate-container {
        display: block !important;
        width: 100% !important;
        min-height: 100vh !important;
        page-break-after: avoid !important;
        margin: 0 !important;
        padding: 1cm !important;
        box-shadow: none !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      .certificate-container * {
        visibility: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      main {
        padding: 0 !important;
        min-height: auto !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export default function ProgramCompletePage() {
  const params = useParams();
  const { t, i18n } = useTranslation(['pbl', 'common', 'assessment']);

  const programId = params.programId as string;
  const scenarioId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'certificate'>('results');

  // Check if all tasks are evaluated
  const allTasksEvaluated = completionData ?
    (completionData.evaluatedTasks === completionData.totalTasks && completionData.totalTasks > 0) :
    false;

  // Use ref to prevent duplicate API calls
  const loadingRef = useRef(false);
  const feedbackGeneratingRef = useRef(false);
  const isMountedRef = useRef(false);

  useEffect(() => {
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    loadProgramData();
    loadUserData();

    // Detect iPad/tablet for print layout
    const detectTablet = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOS = /ipad|iphone|ipod/.test(userAgent);
      const isAndroidTablet = /android/.test(userAgent) && !/mobile/.test(userAgent);
      const hasTouchPoints = navigator.maxTouchPoints && navigator.maxTouchPoints > 2;

      return isIOS || isAndroidTablet || (hasTouchPoints && window.innerWidth >= 768);
    };

    if (detectTablet()) {
      const certificatePrint = document.querySelector('.certificate-print');
      if (certificatePrint) {
        certificatePrint.classList.add('is-tablet');
      }
    }

    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        // User data exists but we don't auto-fill name for certificates
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Watch for language changes and reload scenario data + generate feedback if needed
  useEffect(() => {
    if (!completionData) return;

    const currentLang = i18n.language;

    // Reload scenario data for new language
    const reloadScenarioForLanguage = async () => {
      try {
        const scenarioRes = await fetch(`/api/pbl/scenarios/${scenarioId}?lang=${currentLang}`);
        if (scenarioRes.ok) {
          const scenarioResult = await scenarioRes.json();
          setScenarioData(scenarioResult.data);
        }
      } catch (error) {
        console.error('Error reloading scenario for language:', error);
      }
    };

    reloadScenarioForLanguage();

    // Check if feedback exists for current language
    const feedback = completionData.qualitativeFeedback as Record<string, {
      content?: QualitativeFeedback;
      isValid?: boolean;
    }> | QualitativeFeedback | undefined;

    const hasFeedbackForCurrentLang =
      (feedback && 'overallAssessment' in feedback) ||
      (feedback && currentLang in feedback && (feedback as Record<string, { content?: QualitativeFeedback }>)[currentLang]?.content?.overallAssessment);

    if (!hasFeedbackForCurrentLang && !feedbackGeneratingRef.current && !generatingFeedback) {
      generateFeedback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const loadProgramData = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      setLoading(true);

      const currentLang = i18n.language;
      const [scenarioRes, completionRes] = await Promise.all([
        fetch(`/api/pbl/scenarios/${scenarioId}?lang=${currentLang}`),
        fetch(`/api/pbl/completion?programId=${programId}&scenarioId=${scenarioId}`)
      ]);

      if (scenarioRes.ok) {
        const scenarioResult = await scenarioRes.json();
        setScenarioData(scenarioResult.data);
      }

      if (!completionRes.ok) {
        const updateRes = await authenticatedFetch(`/api/pbl/completion`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ programId, scenarioId })
        });

        if (updateRes.ok) {
          const retryResponse = await authenticatedFetch(`/api/pbl/completion?programId=${programId}&scenarioId=${scenarioId}`);
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            if (data.success && data.data) {
              setCompletionData(data.data);

              const feedback = data.data.qualitativeFeedback;
              const currentLang = i18n.language;
              const hasFeedback = feedback?.overallAssessment ||
                                  (feedback?.[currentLang]?.content?.overallAssessment);

              if (!hasFeedback && !feedbackGeneratingRef.current) {
                generateFeedback();
              }
            }
          }
        }
      } else {
        const data = await completionRes.json();
        if (data.success && data.data) {
          setCompletionData(data.data);

          const feedback = data.data.qualitativeFeedback;
          const currentLang = i18n.language;
          const hasFeedback = feedback?.overallAssessment ||
                              (feedback?.[currentLang]?.content?.overallAssessment);

          if (!hasFeedback && !feedbackGeneratingRef.current) {
            generateFeedback();
          }
        }
      }

    } catch (error) {
      console.error('Error loading program data:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const generateFeedback = async (forceRegenerate = false) => {
    if (feedbackGeneratingRef.current) return;
    feedbackGeneratingRef.current = true;

    try {
      setGeneratingFeedback(true);

      const currentLang = i18n.language;
      const response = await authenticatedFetch('/api/pbl/generate-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language,
        },
        body: JSON.stringify({
          programId,
          scenarioId,
          forceRegenerate,
          language: currentLang,
        }),
      });

      const result = await response.json();

      if (result.success && result.feedback) {
        const currentLang = i18n.language;
        setCompletionData((prev) => {
          if (!prev) return null;

          const feedbackWrapper = {
            content: result.feedback,
            isValid: true,
            generatedAt: new Date().toISOString()
          };

          const isMultiLang = typeof prev.qualitativeFeedback === 'object' &&
                             !('overallAssessment' in (prev.qualitativeFeedback as QualitativeFeedback));

          if (isMultiLang) {
            return {
              ...prev,
              qualitativeFeedback: {
                ...(prev.qualitativeFeedback as unknown as Record<string, unknown>),
                [currentLang]: feedbackWrapper
              } as unknown as CompletionData['qualitativeFeedback']
            };
          } else {
            return {
              ...prev,
              qualitativeFeedback: {
                [currentLang]: feedbackWrapper
              } as unknown as CompletionData['qualitativeFeedback']
            };
          }
        });
      } else {
        throw new Error(result.error || 'Failed to generate feedback');
      }
    } catch (error) {
      console.error('Error generating feedback:', error);
    } finally {
      setGeneratingFeedback(false);
      feedbackGeneratingRef.current = false;
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return t('pbl:complete.timeFormat.hours', { hours, minutes });
    } else if (minutes > 0) {
      return t('pbl:complete.timeFormat.minutes', { minutes, seconds: remainingSeconds });
    }
    return t('pbl:complete.timeFormat.seconds', { seconds: remainingSeconds });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PBLCompletionSkeleton />
        </div>
      </main>
    );
  }

  // Calculate scenario title from data
  const scenarioTitle = (() => {
    if (!scenarioData) return 'Scenario';

    const title = scenarioData.title;

    if (typeof title === 'object' && title !== null && !Array.isArray(title)) {
      const titleObj = title as Record<string, string>;

      return titleObj[i18n.language] ||
             titleObj['zhTW'] ||
             titleObj['zh-TW'] ||
             titleObj['zh_TW'] ||
             titleObj['en'] ||
             Object.values(titleObj)[0] ||
             'Scenario';
    }

    if (i18n.language === 'zhTW' || i18n.language === 'zh-TW') {
      return scenarioData.title_zhTW || scenarioData.title || 'Scenario';
    }
    return scenarioData.title || 'Scenario';
  })();

  if (!completionData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">{t('pbl:complete.noDataFound')}</p>
          <Link
            href={`/pbl/scenarios/${scenarioId}`}
            className="mt-4 inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            {t('pbl:complete.backToPBL')}
          </Link>
        </div>
      </div>
    );
  }

  // Extract feedback for current language
  const currentLang = i18n.language;
  const feedbackData = completionData?.qualitativeFeedback as Record<string, {
    content?: QualitativeFeedback;
    isValid?: boolean;
  }> | QualitativeFeedback | undefined;

  let currentFeedback: QualitativeFeedback | undefined;
  if (feedbackData && 'overallAssessment' in feedbackData) {
    currentFeedback = feedbackData as QualitativeFeedback;
  } else if (feedbackData && currentLang in feedbackData) {
    const langData = (feedbackData as Record<string, { content?: QualitativeFeedback }>)[currentLang];
    currentFeedback = langData?.content;
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Congratulations Header - hide when printing */}
        <div className="no-print">
          <CompletionHeader scenarioTitle={scenarioTitle} />
        </div>

        {/* Tab Navigation - hide when printing */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          allTasksEvaluated={allTasksEvaluated}
        />

        {/* Results Tab Content - hide when printing */}
        {activeTab === 'results' && (
          <div className="no-print">
            {/* Qualitative Feedback Section */}
            <QualitativeFeedbackSection
              feedback={currentFeedback}
              generatingFeedback={generatingFeedback}
              onRegenerateFeedback={() => generateFeedback(true)}
            />

            {/* Three Column Layout */}
            <ScoreCardsGrid
              completionData={completionData}
              formatDuration={formatDuration}
            />

            {/* Task Details */}
            <TaskDetailsSection
              completionData={completionData}
              formatDuration={formatDuration}
            />

            {/* Action Buttons */}
            <ActionButtons scenarioId={scenarioId} />
          </div>
        )}

        {/* Certificate Tab Content */}
        {activeTab === 'certificate' && (
          <CertificateView
            scenarioTitle={scenarioTitle}
            allTasksEvaluated={allTasksEvaluated}
          />
        )}
      </div>
    </main>
  );
}
