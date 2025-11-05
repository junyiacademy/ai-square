'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import Image from 'next/image';
import { PBLCompletionSkeleton } from '@/components/pbl/loading-skeletons';
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
        /* Force color printing */
        color: color;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        /* Force color mode */
        color-scheme: light;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      /* Hide navigation, headers, footers */
      header, nav, footer, .print\\:hidden {
        display: none !important;
      }

      /* Hide all sections with no-print class */
      .no-print {
        display: none !important;
      }

      /* Show certificate container with all backgrounds and borders */
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

      /* Ensure certificate content is visible with all colors and backgrounds */
      .certificate-container * {
        visibility: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      /* Preserve all colors, gradients, borders */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      /* Hide main container backgrounds except certificate */
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
  // const router = useRouter();
  const { t, i18n } = useTranslation(['pbl', 'common', 'assessment']);

  const programId = params.programId as string;
  const scenarioId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [scenarioData, setScenarioData] = useState<ScenarioData | null>(null);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<'results' | 'certificate'>('results');
  const [userName, setUserName] = useState<string>('');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editableName, setEditableName] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  // const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Check if all tasks are evaluated
  const allTasksEvaluated = completionData ?
    (completionData.evaluatedTasks === completionData.totalTasks && completionData.totalTasks > 0) :
    false;

  // Use ref to prevent duplicate API calls
  const loadingRef = useRef(false);
  const feedbackGeneratingRef = useRef(false);
  const isMountedRef = useRef(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if already mounted (handles StrictMode double mount)
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
      // Add .is-tablet class to certificate print element
      const certificatePrint = document.querySelector('.certificate-print');
      if (certificatePrint) {
        certificatePrint.classList.add('is-tablet');
      }
    }

    // Cleanup function for StrictMode
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUserName('');
        setEditableName('');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Watch for language changes and reload scenario data + generate feedback if needed
  useEffect(() => {
    if (!completionData) return;

    const currentLang = i18n.language;

    // Reload scenario data for new language (to get translated title)
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
      (feedback && 'overallAssessment' in feedback) || // Old format
      (feedback && currentLang in feedback && (feedback as Record<string, { content?: QualitativeFeedback }>)[currentLang]?.content?.overallAssessment); // New format

    // If no feedback for current language and not currently generating, trigger generation
    if (!hasFeedbackForCurrentLang && !feedbackGeneratingRef.current && !generatingFeedback) {
      generateFeedback();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]); // Only re-run when language changes

  const loadProgramData = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      setLoading(true);

      // Load both scenario and completion data in parallel
      const currentLang = i18n.language;
      const [scenarioRes, completionRes] = await Promise.all([
        fetch(`/api/pbl/scenarios/${scenarioId}?lang=${currentLang}`),
        fetch(`/api/pbl/completion?programId=${programId}&scenarioId=${scenarioId}`)
      ]);

      // Process scenario data
      if (scenarioRes.ok) {
        const scenarioResult = await scenarioRes.json();
        setScenarioData(scenarioResult.data);
      }

      // Process completion data
      if (!completionRes.ok) {
        // If completion.json doesn't exist, try to create it
        const updateRes = await authenticatedFetch(`/api/pbl/completion`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ programId, scenarioId })
        });

        if (updateRes.ok) {
          // Try to get the newly created completion data
          const retryResponse = await authenticatedFetch(`/api/pbl/completion?programId=${programId}&scenarioId=${scenarioId}`);
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            if (data.success && data.data) {
              setCompletionData(data.data);

              // Generate feedback if not exists
              // Check for both old format (direct overallAssessment) and new format (language-wrapped)
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

          // Generate feedback if not exists
          // Check for both old format (direct overallAssessment) and new format (language-wrapped)
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
        // Update completion data with the new feedback
        const currentLang = i18n.language;
        setCompletionData((prev) => {
          if (!prev) return null;

          // Store feedback with wrapper structure to match DB format
          const feedbackWrapper = {
            content: result.feedback,
            isValid: true,
            generatedAt: new Date().toISOString()
          };

          // Handle multi-language feedback format
          const isMultiLang = typeof prev.qualitativeFeedback === 'object' &&
                             !('overallAssessment' in (prev.qualitativeFeedback as QualitativeFeedback));

          if (isMultiLang) {
            // New multi-language format - update the specific language
            return {
              ...prev,
              qualitativeFeedback: {
                ...(prev.qualitativeFeedback as unknown as Record<string, unknown>),
                [currentLang]: feedbackWrapper
              } as unknown as CompletionData['qualitativeFeedback']
            };
          } else {
            // Migrate from old format to new format
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
      // Error generating feedback
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

  const handleDownloadPDF = async () => {
    if (!editableName) {
      alert(t('pbl:complete.certificate.pleaseEnterName', 'Please enter your name first'));
      return;
    }

    setIsGeneratingPDF(true);

    try {
      const response = await fetch('/api/pbl/certificate/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentName: editableName,
          scenarioTitle: scenarioTitle,
          completionDate: new Date().toLocaleDateString(i18n.language === 'zhTW' ? 'zh-TW' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          language: i18n.language === 'zhTW' ? 'zhTW' : 'en',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Download PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${editableName}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDF download error:', error);
      alert(t('pbl:complete.certificate.downloadFailed', 'Failed to download PDF. Please try again.'));
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  // Unused function - keeping for potential future use
  // const getScoreBgColor = (score: number) => {
  //   if (score >= 90) return 'bg-green-600';
  //   if (score >= 80) return 'bg-blue-600';
  //   if (score >= 70) return 'bg-yellow-600';
  //   if (score >= 50) return 'bg-orange-600';
  //   return 'bg-red-600';
  // };

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
      // Handle multilingual object format {en: "...", zhTW: "...", zh-TW: "..."}
      const titleObj = title as Record<string, string>;

      // Try multiple language key formats
      return titleObj[i18n.language] ||
             titleObj['zhTW'] ||
             titleObj['zh-TW'] ||
             titleObj['zh_TW'] ||
             titleObj['en'] ||
             Object.values(titleObj)[0] ||
             'Scenario';
    }

    // Fallback to suffix-based format or direct string
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

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Congratulations Header - hide when printing */}
        <div className="no-print">
        {/* Celebration Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <svg className="w-24 h-24 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('pbl:complete.congratulations')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {t('pbl:complete.scenarioCompleted', { title: scenarioTitle })}
          </p>
        </div>
        </div>

        {/* Tab Navigation - hide when printing */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-8 no-print">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab('results')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'results'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                {t('pbl:complete.results')}
              </button>
              <button
                onClick={() => allTasksEvaluated && setActiveTab('certificate')}
                disabled={!allTasksEvaluated}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${
                  !allTasksEvaluated
                    ? 'border-transparent text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : activeTab === 'certificate'
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <span>{t('pbl:complete.certificate.title')}</span>
                {!allTasksEvaluated && (
                  <>
                    <span className="text-xs">🔒</span>
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      ({t('pbl:complete.certificate.requireAllTasks', '需完成所有任務')})
                    </span>
                  </>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Results Tab Content - hide when printing */}
        {activeTab === 'results' && (
          <div className="no-print">
            {/* Qualitative Feedback Section */}
            {(() => {
              // Extract feedback for current language from multi-language structure
              const currentLang = i18n.language;
              const feedbackData = completionData?.qualitativeFeedback as Record<string, {
                content?: QualitativeFeedback;
                isValid?: boolean;
              }> | QualitativeFeedback | undefined;

              // Handle both old single-language format and new multi-language format
              let feedback: QualitativeFeedback | undefined;
              if (feedbackData && 'overallAssessment' in feedbackData) {
                // Old format - direct QualitativeFeedback
                feedback = feedbackData as QualitativeFeedback;
              } else if (feedbackData && currentLang in feedbackData) {
                // New format - multi-language with wrapper
                const langData = (feedbackData as Record<string, { content?: QualitativeFeedback }>)[currentLang];
                feedback = langData?.content;
              }

              const hasFeedback = feedback?.overallAssessment;

              return (hasFeedback || generatingFeedback) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
              {generatingFeedback ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('pbl:complete.generatingFeedback', 'Generating personalized feedback...')}
                  </p>
                </div>
              ) : feedback ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {t('pbl:complete.qualitativeFeedback', 'Personalized Feedback')}
                    </h2>
                    {process.env.NODE_ENV === 'development' && (
                      <button
                        onClick={() => {
                          // Force regenerate feedback
                          generateFeedback(true);
                        }}
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
                      {t('pbl:complete.strengths', 'Your Strengths')}
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
                      {t('pbl:complete.areasForImprovement', 'Growth Opportunities')}
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
                      {t('pbl:complete.nextSteps', 'Recommended Next Steps')}
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
        })()}

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Overall Score */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('pbl:complete.overallScore')}
            </h3>
            <div className="text-center mb-4">
              <p className={`text-5xl font-bold ${getScoreColor(completionData.overallScore || 0)}`}>
                {completionData.overallScore || 0}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {completionData.evaluatedTasks}/{completionData.totalTasks} {t('pbl:history.tasksEvaluated')}
              </p>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('pbl:complete.conversationCount')}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {completionData.tasks?.reduce((sum, task) =>
                    sum + (task.log?.interactions?.length || 0), 0) || 0} {t('pbl:history.times')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('pbl:complete.totalTimeSpent')}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {formatDuration(completionData.totalTimeSeconds || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Middle Column - Domain Scores */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('pbl:complete.domainScores')}
            </h3>
            {completionData.domainScores && (
              <div className="space-y-4">
                {['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai']
                  .filter(domain => completionData.domainScores?.[domain] !== undefined)
                  .map((domain) => {
                    const score = completionData.domainScores?.[domain] || 0;
                    return (
                      <div key={domain}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t(`assessment:domains.${domain}`)}
                          </span>
                          <span className={`text-sm font-medium ${getScoreColor(score)}`}>
                            {score}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              domain === 'engaging_with_ai' ? 'bg-blue-600' :
                              domain === 'creating_with_ai' ? 'bg-green-600' :
                              domain === 'managing_with_ai' ? 'bg-yellow-600' :
                              'bg-purple-600'
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Right Column - KSA Scores */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('pbl:complete.ksaSummary')}
            </h3>
            {completionData.ksaScores && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('pbl:complete.knowledge')}
                    </span>
                    <span className={`text-sm font-medium ${getScoreColor(completionData.ksaScores.knowledge)}`}>
                      {completionData.ksaScores.knowledge}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${completionData.ksaScores.knowledge}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('pbl:complete.skills')}
                    </span>
                    <span className={`text-sm font-medium ${getScoreColor(completionData.ksaScores.skills)}`}>
                      {completionData.ksaScores.skills}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${completionData.ksaScores.skills}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t('pbl:complete.attitudes')}
                    </span>
                    <span className={`text-sm font-medium ${getScoreColor(completionData.ksaScores.attitudes)}`}>
                      {completionData.ksaScores.attitudes}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${completionData.ksaScores.attitudes}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* Task Details */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            {t('pbl:complete.taskSummary')}
          </h2>

          <div className="space-y-6">
            {completionData.tasks?.map((task, index) => {
              const taskTitle = (() => {
                const title = task.taskTitle;
                if (typeof title === 'object' && title !== null && !Array.isArray(title)) {
                  // Handle multilingual object format {en: "...", zh: "..."}
                  const titleObj = title as Record<string, string>;
                  return titleObj[i18n.language] || titleObj['en'] || Object.values(titleObj)[0] || task.taskId;
                }
                return title || task.taskId;
              })();

              return (
                <div key={task.taskId} className="border-l-4 border-purple-600 pl-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        {task.taskIndex || index + 1}. {taskTitle}
                      </h3>

                      {/* Task Metadata */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatDuration(task.progress?.timeSpentSeconds || 0)}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          {task.log?.interactions?.filter((i) => i.type === 'user').length || 0} {t('pbl:complete.conversations')}
                        </span>
                        {task.evaluation && (
                          <span className={`font-medium ${getScoreColor(task.evaluation.score)}`}>
                            {t('pbl:learn.overallScore')}: {task.evaluation.score}%
                          </span>
                        )}
                      </div>

                      {/* Task Evaluation Details - Collapsible */}
                      {task.evaluation && (
                        <details className="mt-4">
                          <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            {t('pbl:complete.viewEvaluationDetails', '查看評估詳情')}
                          </summary>
                        <div className="mt-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                          {/* Two Column Layout for Domain & KSA Scores */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Domain Scores Column */}
                            {task.evaluation.domainScores && (
                              <div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                  {t('pbl:complete.domainScores')}:
                                </div>
                                <div className="space-y-3">
                                  {['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai']
                                    .filter(domain => task.evaluation?.domainScores?.[domain] !== undefined)
                                    .map((domain) => {
                                      const score = task.evaluation?.domainScores?.[domain] || 0;
                                      return (
                                        <div key={domain}>
                                          <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                              {t(`assessment:domains.${domain}`)}
                                            </span>
                                            <span className={`text-sm font-bold ${getScoreColor(score)}`}>
                                              {score}%
                                            </span>
                                          </div>
                                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                            <div
                                              className={`h-2 rounded-full ${
                                                domain === 'engaging_with_ai' ? 'bg-blue-500' :
                                                domain === 'creating_with_ai' ? 'bg-green-500' :
                                                domain === 'managing_with_ai' ? 'bg-orange-500' :
                                                'bg-purple-500'
                                              }`}
                                              style={{ width: `${score}%` }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            )}

                            {/* KSA Scores Column */}
                            {task.evaluation.ksaScores && Object.keys(task.evaluation.ksaScores).length > 0 && (
                              <div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                  {t('pbl:complete.ksa')}:
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('pbl:complete.knowledge')}
                                      </span>
                                      <span className={`text-sm font-bold ${getScoreColor(task.evaluation.ksaScores?.knowledge || 0)}`}>
                                        {task.evaluation.ksaScores?.knowledge || 0}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                      <div
                                        className="bg-blue-500 h-2 rounded-full"
                                        style={{ width: `${task.evaluation.ksaScores?.knowledge || 0}%` }}
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('pbl:complete.skills')}
                                      </span>
                                      <span className={`text-sm font-bold ${getScoreColor(task.evaluation.ksaScores?.skills || 0)}`}>
                                        {task.evaluation.ksaScores?.skills || 0}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                      <div
                                        className="bg-green-500 h-2 rounded-full"
                                        style={{ width: `${task.evaluation.ksaScores?.skills || 0}%` }}
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('pbl:complete.attitudes')}
                                      </span>
                                      <span className={`text-sm font-bold ${getScoreColor(task.evaluation.ksaScores?.attitudes || 0)}`}>
                                        {task.evaluation.ksaScores?.attitudes || 0}%
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                      <div
                                        className="bg-purple-500 h-2 rounded-full"
                                        style={{ width: `${task.evaluation.ksaScores?.attitudes || 0}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Conversation Insights */}
                          {task.evaluation.conversationInsights && (
                            <div className="mb-3">
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('pbl:learn.conversationInsights')}
                              </h4>
                              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                {/* Effective Examples */}
                                {task.evaluation?.conversationInsights?.effectiveExamples &&
                                 Array.isArray(task.evaluation.conversationInsights.effectiveExamples) &&
                                 task.evaluation.conversationInsights.effectiveExamples.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                                      {t('pbl:learn.effectiveExamples')}
                                    </p>
                                    {task.evaluation.conversationInsights.effectiveExamples.map((example, idx) => (
                                      <div key={idx} className="bg-green-50 dark:bg-green-900/20 rounded p-2 mb-1">
                                        <p className="text-xs italic border-l-2 border-green-300 dark:border-green-500 pl-2 mb-1">
                                          &ldquo;{example.quote}&rdquo;
                                        </p>
                                        <p className="text-xs">{example.suggestion}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Improvement Areas */}
                                {task.evaluation.conversationInsights.improvementAreas &&
                                 Array.isArray(task.evaluation.conversationInsights.improvementAreas) &&
                                 task.evaluation.conversationInsights.improvementAreas.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                                      {t('pbl:learn.improvementExamples')}
                                    </p>
                                    {task.evaluation.conversationInsights.improvementAreas.map((area, idx) => (
                                      <div key={idx} className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2 mb-1">
                                        <p className="text-xs italic border-l-2 border-yellow-300 dark:border-yellow-500 pl-2 mb-1">
                                          &ldquo;{area.quote}&rdquo;
                                        </p>
                                        <p className="text-xs">{area.suggestion}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Strengths */}
                          {task.evaluation.strengths &&
                           Array.isArray(task.evaluation.strengths) &&
                           task.evaluation.strengths.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('pbl:complete.strengths')}
                              </h4>
                              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                {task.evaluation.strengths.map((strength, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-green-500 mr-2">✓</span>
                                    {strength}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Areas for Improvement */}
                          {task.evaluation.improvements &&
                           Array.isArray(task.evaluation.improvements) &&
                           task.evaluation.improvements.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('pbl:complete.improvements')}
                              </h4>
                              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                {task.evaluation.improvements.map((improvement, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <span className="text-yellow-500 mr-2">•</span>
                                    {improvement}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        </details>
                      )}

                      {/* Practice Records - 做題紀錄 */}
                      {task.log?.interactions && task.log.interactions.length > 0 && (
                        <details className="mt-4">
                          <summary className="cursor-pointer text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {t('pbl:complete.viewPracticeRecords', '查看做題紀錄')}
                            <span className="text-xs text-gray-500">
                              ({task.log.interactions.length} {t('pbl:complete.interactions', '次互動')})
                            </span>
                          </summary>
                          <div className="mt-3 space-y-2 max-h-96 overflow-y-auto border-l-2 border-purple-200 dark:border-purple-800 pl-4">
                            {task.log.interactions.map((interaction, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-lg text-sm ${
                                  interaction.type === 'user'
                                    ? 'bg-blue-50 dark:bg-blue-900/20 ml-4'
                                    : 'bg-gray-50 dark:bg-gray-800 mr-4'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className="font-medium text-xs text-gray-500 dark:text-gray-400">
                                    {interaction.type === 'user'
                                      ? '👤 ' + t('pbl:complete.yourAnswer', '你的回答')
                                      : '🤖 ' + t('pbl:complete.aiFeedback', 'AI 回饋')}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    #{idx + 1}
                                  </span>
                                </div>
                                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                  {typeof interaction.message === 'string'
                                    ? interaction.message
                                    : JSON.stringify(interaction.message)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/pbl/scenarios/${scenarioId}`}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-center"
              >
                {t('pbl:complete.retryScenario')}
              </Link>
            </div>
          </div>
        )}

        {/* Certificate Tab Content */}
        {activeTab === 'certificate' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="max-w-5xl mx-auto">
              {/* Display Version - Only visible on screen */}
              <div ref={certificateRef} className="relative border-4 sm:border-6 lg:border-8 border-double border-purple-600 p-8 sm:p-12 lg:p-16 rounded-lg bg-gradient-to-br from-white via-purple-50 to-white certificate-display">
                {/* Decorative corner elements */}
                <div className="absolute top-4 left-4 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border-t-2 border-l-2 sm:border-t-3 sm:border-l-3 lg:border-t-4 lg:border-l-4 border-purple-400"></div>
                <div className="absolute top-4 right-4 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border-t-2 border-r-2 sm:border-t-3 sm:border-r-3 lg:border-t-4 lg:border-r-4 border-purple-400"></div>
                <div className="absolute bottom-4 left-4 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border-b-2 border-l-2 sm:border-b-3 sm:border-l-3 lg:border-b-4 lg:border-l-4 border-purple-400"></div>
                <div className="absolute bottom-4 right-4 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 border-b-2 border-r-2 sm:border-b-3 sm:border-r-3 lg:border-b-4 lg:border-r-4 border-purple-400"></div>

                {/* Title */}
                <div className="text-center mb-6 sm:mb-8 lg:mb-12">
                  <h2 className="text-4xl sm:text-4xl lg:text-5xl font-serif font-bold text-purple-700 mb-3 sm:mb-3 lg:mb-4">
                    {t('pbl:complete.certificate.title')}
                  </h2>
                  <div className="w-24 sm:w-24 lg:w-32 h-0.5 sm:h-0.5 lg:h-1 bg-purple-600 mx-auto"></div>
                </div>

                {/* Certificate of Completion text */}
                <div className="text-center mb-6 sm:mb-8">
                  <p className="text-base sm:text-lg text-gray-700">
                    {t('pbl:complete.certificate.certifies')}
                  </p>
                </div>

                {/* Student name - red border box with edit capability (border changes when name is filled) */}
                <div className="text-center mb-6 sm:mb-8">
                  <div
                    onClick={() => !isEditingName && setIsEditingName(true)}
                    className={`inline-block border-2 px-6 py-3 w-[90%] max-w-sm sm:px-10 sm:py-4 sm:w-auto sm:min-w-80 lg:px-12 lg:min-w-96 relative group bg-white cursor-pointer transition-all hover:shadow-md ${
                      editableName ? 'border-purple-400' : 'border-red-500'
                    }`}
                  >
                    {isEditingName ? (
                      <input
                        type="text"
                        value={editableName}
                        onChange={(e) => setEditableName(e.target.value)}
                        onBlur={() => setIsEditingName(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsEditingName(false);
                          }
                        }}
                        autoFocus
                        placeholder={t('pbl:complete.certificate.enterYourName', 'Enter your name')}
                        className="text-2xl sm:text-2xl lg:text-4xl font-serif font-bold text-gray-900 bg-transparent border-none outline-none text-center w-full placeholder:text-gray-300"
                      />
                    ) : (
                      <>
                        {editableName ? (
                          <p className="text-2xl sm:text-2xl lg:text-4xl font-serif font-bold text-gray-900">
                            {editableName}
                          </p>
                        ) : (
                          <p className="text-2xl sm:text-2xl lg:text-4xl font-serif text-gray-300 italic">
                            {t('pbl:complete.certificate.clickToEnterName', 'Click to enter your name')}
                          </p>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsEditingName(true);
                          }}
                          className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={t('pbl:complete.certificate.editName', 'Edit name')}
                        >
                          <svg className="w-5 h-5 text-gray-400 hover:text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Completion statement */}
                <div className="text-center mb-6 sm:mb-6">
                  <p className="text-base sm:text-lg text-gray-700">
                    {t('pbl:complete.certificate.hasCompleted')}
                  </p>
                </div>

                {/* Scenario title - elegant box */}
                <div className="text-center mb-6 sm:mb-8 px-4 sm:px-0">
                  <div className="inline-block bg-purple-50 border-2 border-purple-300 px-6 py-3 sm:px-6 sm:py-3 lg:px-8 lg:py-4 rounded w-[90%] max-w-sm sm:w-auto sm:min-w-72 lg:min-w-96">
                    <p className="text-lg sm:text-xl lg:text-2xl font-semibold text-purple-900 break-words">{scenarioTitle}</p>
                  </div>
                </div>

                {/* Course description */}
                <div className="text-center mb-6 sm:mb-8 lg:mb-12">
                  <p className="text-sm sm:text-base text-gray-600">
                    {t('pbl:complete.certificate.courseType')}
                  </p>
                </div>

                {/* Date section */}
                <div className="text-center mb-8 sm:mb-10 lg:mb-12">
                  <p className="text-sm sm:text-sm text-gray-600 mb-2 sm:mb-2">
                    {t('pbl:complete.certificate.completionDate')}
                  </p>
                  <p className="text-xl sm:text-xl lg:text-2xl font-semibold text-gray-900">
                    {new Date().toLocaleDateString(i18n.language === 'zhTW' ? 'zh-TW' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                {/* Footer with logos and signatures */}
                <div className="grid grid-cols-2 gap-8 sm:gap-12 lg:gap-16 mt-8 sm:mt-12 lg:mt-16 pt-6 sm:pt-6 lg:pt-8 border-t border-gray-300">
                  <div className="text-center">
                    <div className="border-t-2 border-gray-400 pt-3 sm:pt-3 lg:pt-4 mb-2 sm:mb-2 lg:mb-3">
                      <div className="flex items-center justify-center gap-2 sm:gap-2 lg:gap-3 mb-2 sm:mb-1 lg:mb-2">
                        <Image
                          src="/images/junyi_logo.jpg"
                          alt="Junyi Academy Logo"
                          width={80}
                          height={40}
                          className="object-contain w-14 h-7 sm:w-16 sm:h-8 lg:w-20 lg:h-10"
                        />
                        <p className="text-sm sm:text-sm lg:text-base font-semibold text-gray-700">
                          {t('pbl:complete.certificate.junyiAcademy')}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs sm:text-xs text-gray-500">
                      {t('pbl:complete.certificate.provider')}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="border-t-2 border-gray-400 pt-3 sm:pt-3 lg:pt-4 mb-2 sm:mb-2 lg:mb-3">
                      <div className="flex items-center justify-center gap-2 sm:gap-2 lg:gap-3 mb-2 sm:mb-1 lg:mb-2">
                        <Image
                          src="/images/logo.png"
                          alt="AI Square Logo"
                          width={80}
                          height={40}
                          className="object-contain w-14 h-7 sm:w-16 sm:h-8 lg:w-20 lg:h-10"
                        />
                        <p className="text-sm sm:text-sm lg:text-base font-semibold text-gray-700">
                          {t('pbl:complete.certificate.aiSquare')}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs sm:text-xs text-gray-500">
                      {t('pbl:complete.certificate.platform')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Print-Only Version - Hidden on screen, only visible when printing */}
              <div className="certificate-print hidden">
                {/* Same certificate structure but with fixed print sizing */}
                <div className="certificate-print-content">
                  {/* Decorative corner elements */}
                  <div className="certificate-corner certificate-corner-tl"></div>
                  <div className="certificate-corner certificate-corner-tr"></div>
                  <div className="certificate-corner certificate-corner-bl"></div>
                  <div className="certificate-corner certificate-corner-br"></div>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      {/* Title */}
                      <div style={{ marginBottom: '12px' }}>
                        <h2 style={{ fontSize: '32px', fontFamily: 'serif', fontWeight: 'bold', color: 'rgb(147, 51, 234)', marginBottom: '8px' }}>
                          {t('pbl:complete.certificate.title')}
                        </h2>
                        <div style={{ width: '80px', height: '2px', background: 'rgb(147, 51, 234)', margin: '0 auto' }}></div>
                      </div>

                      {/* Certificate of Completion text */}
                      <div style={{ marginBottom: '10px' }}>
                        <p style={{ fontSize: '14px', color: 'rgb(55, 65, 81)' }}>
                          {t('pbl:complete.certificate.certifies')}
                        </p>
                      </div>

                      {/* Student name */}
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'inline-block', border: '2px solid rgb(167, 139, 250)', padding: '6px 28px', background: 'white' }}>
                          <p style={{ fontSize: '22px', fontFamily: 'serif', fontWeight: 'bold', color: 'rgb(17, 24, 39)' }}>
                            {editableName || t('pbl:complete.certificate.enterYourName', 'Name')}
                          </p>
                        </div>
                      </div>

                      {/* Completion statement */}
                      <div style={{ marginBottom: '10px' }}>
                        <p style={{ fontSize: '14px', color: 'rgb(55, 65, 81)' }}>
                          {t('pbl:complete.certificate.hasCompleted')}
                        </p>
                      </div>

                      {/* Scenario title */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'inline-block', background: 'rgb(243, 232, 255)', border: '2px solid rgb(216, 180, 254)', padding: '10px 20px', borderRadius: '4px' }}>
                          <p style={{ fontSize: '18px', fontWeight: '600', color: 'rgb(88, 28, 135)' }}>{scenarioTitle}</p>
                        </div>
                      </div>

                      {/* Course description */}
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ fontSize: '13px', color: 'rgb(75, 85, 99)' }}>
                          {t('pbl:complete.certificate.courseType')}
                        </p>
                      </div>

                      {/* Date section */}
                      <div style={{ marginBottom: '18px' }}>
                        <p style={{ fontSize: '13px', color: 'rgb(75, 85, 99)', marginBottom: '6px' }}>
                          {t('pbl:complete.certificate.completionDate')}
                        </p>
                        <p style={{ fontSize: '16px', fontWeight: '600', color: 'rgb(17, 24, 39)' }}>
                          {new Date().toLocaleDateString(i18n.language === 'zhTW' ? 'zh-TW' : 'en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>

                      {/* Footer with logos */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', paddingTop: '12px', borderTop: '1px solid rgb(209, 213, 219)', marginTop: '12px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ borderTop: '2px solid rgb(156, 163, 175)', paddingTop: '8px', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                              <img
                                src="/images/junyi_logo.jpg"
                                alt="Junyi Academy Logo"
                                width="48"
                                height="24"
                                style={{ objectFit: 'contain', display: 'block' }}
                              />
                              <p style={{ fontSize: '12px', fontWeight: '600', color: 'rgb(55, 65, 81)' }}>
                                {t('pbl:complete.certificate.junyiAcademy')}
                              </p>
                            </div>
                          </div>
                          <p style={{ fontSize: '10px', color: 'rgb(107, 114, 128)' }}>
                            {t('pbl:complete.certificate.provider')}
                          </p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ borderTop: '2px solid rgb(156, 163, 175)', paddingTop: '8px', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                              <img
                                src="/images/logo.png"
                                alt="AI Square Logo"
                                width="48"
                                height="24"
                                style={{ objectFit: 'contain', display: 'block' }}
                              />
                              <p style={{ fontSize: '12px', fontWeight: '600', color: 'rgb(55, 65, 81)' }}>
                                {t('pbl:complete.certificate.aiSquare')}
                              </p>
                            </div>
                          </div>
                          <p style={{ fontSize: '10px', color: 'rgb(107, 114, 128)' }}>
                            {t('pbl:complete.certificate.platform')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4 print:hidden">
                {/* Download PDF button (recommended) */}
                <div className="relative inline-block group">
                  <button
                    onClick={handleDownloadPDF}
                    disabled={!editableName || isGeneratingPDF}
                    className={`px-8 py-3 rounded-lg font-medium transition-colors shadow-lg flex items-center gap-2 ${
                      editableName && !isGeneratingPDF
                        ? 'bg-purple-600 text-white hover:bg-purple-700 cursor-pointer'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isGeneratingPDF ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>{t('pbl:complete.certificate.generating', 'Generating...')}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {t('pbl:complete.certificate.downloadPDF', 'Download PDF')}
                      </>
                    )}
                  </button>
                  {!editableName && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {t('pbl:complete.certificate.pleaseEnterName', 'Please enter your name first')}
                    </div>
                  )}
                </div>

                {/* Print button (alternative) - Hidden on mobile and tablet */}
                <div className="relative inline-block group hidden md:block">
                  <button
                    onClick={() => window.print()}
                    disabled={!editableName}
                    className={`px-8 py-3 rounded-lg font-medium transition-colors shadow-lg flex items-center gap-2 ${
                      editableName
                        ? 'bg-white text-purple-600 border-2 border-purple-600 hover:bg-purple-50 cursor-pointer'
                        : 'bg-gray-100 text-gray-400 border-2 border-gray-300 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    {t('pbl:complete.certificate.print', 'Print')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
