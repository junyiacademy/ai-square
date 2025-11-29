'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { authenticatedFetch } from '@/lib/utils/authenticated-fetch';
import { useScenarioData } from './hooks/useScenarioData';
import { ScenarioHeader } from './components/ScenarioHeader';
import { ScenarioOverviewSections } from './components/ScenarioOverviewSections';
import { LearningTasksSection } from './components/LearningTasksSection';

export default function ScenarioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t, i18n } = useTranslation(['pbl', 'common']);
  const scenarioId = params.id as string;

  // Use custom hook for data fetching
  const { scenario, userPrograms, loading } = useScenarioData(scenarioId, i18n.language);

  // Local state
  const [isStarting, setIsStarting] = useState(false);
  const [isProgramsCollapsed, setIsProgramsCollapsed] = useState(false);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);

  const isScenarioInteractive = useMemo(() => {
    if (!scenario) return false;

    const title =
      typeof scenario.title === 'string'
        ? scenario.title
        : scenario.title?.[i18n.language] || scenario.title?.en || '';

    const normalizedTitle = title?.toLowerCase?.() || '';

    if (normalizedTitle.includes('semiconductor')) return true;
    if (title?.includes('半導體')) return true;
    if (title?.includes('半导体')) return true;

    return false;
  }, [scenario, i18n.language]);

  // Load Hour of Code tracking image for semiconductor scenario
  useEffect(() => {
    if (scenarioId === '7fc0aa9b-6294-46a3-a954-45331ab026b3') {
      const trackingImg = new Image();
      trackingImg.src = 'https://studio.code.org/api/hour/begin_aisquare.png';
      trackingImg.onload = () => console.log('[Hour of Code] Tracking image loaded');
      trackingImg.onerror = () => console.warn('[Hour of Code] Tracking image failed to load');
    }
  }, [scenarioId]);

  // Helper function to get data from scenario metadata
  const getScenarioData = (key: string, fallback: unknown = null) => {
    // First check top-level scenario properties
    if (scenario && key in scenario) {
      return (scenario as unknown as Record<string, unknown>)[key];
    }
    // Then check metadata
    return (scenario?.metadata as Record<string, unknown>)?.[key] || fallback;
  };

  // Convert YouTube URL to embed format (kept for future use)
  // const getYouTubeEmbedUrl = (url: string): string | null => {
  //   const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
  //   const match = url.match(regex);
  //   if (match && match[1]) {
  //     return `https://www.youtube.com/embed/${match[1]}`;
  //   }
  //   return null;
  // };

  // Handle video link click
  const handleVideoClick = (url: string) => {
    // For now, just open in new tab to avoid CSP issues
    window.open(url, '_blank', 'noopener,noreferrer');

    // Original modal code (commented out for now)
    // const embedUrl = getYouTubeEmbedUrl(url);
    // if (embedUrl) {
    //   setVideoModalUrl(embedUrl);
    // } else {
    //   window.open(url, '_blank', 'noopener,noreferrer');
    // }
  };

const handleStartProgram = async (programId?: string) => {
    if (!isScenarioInteractive) {
      return;
    }

    if (!scenario) return;

    setIsStarting(true);
    try {
      if (programId) {
        // Continue existing program
        const program = userPrograms.find(p => p.id === programId);
        if (program) {
          // Get the current task or the first task
          const currentTaskIndex = program.currentTaskIndex || 0;
          const taskIds = (program.metadata?.taskIds as string[]) || [];
          const targetTaskId = taskIds[currentTaskIndex] || taskIds[0];

          if (!targetTaskId) {
            console.error('No task ID found for navigation in program:', program);
            alert(t('details.errorStarting', 'Error starting program - no tasks found'));
            setIsStarting(false);
            return;
          }
          router.push(`/pbl/scenarios/${scenarioId}/programs/${programId}/tasks/${targetTaskId}`);
        }
      } else {
        // Create new program
        const response = await authenticatedFetch(`/api/pbl/scenarios/${scenarioId}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            language: i18n.language
          })
        });

        if (!response.ok) {
          throw new Error('Failed to create program');
        }

        const data = await response.json();
        if (data.id) {
          // Navigate to the first task using the UUID from created tasks
          const firstTaskId = data.tasks?.[0]?.id || data.taskIds?.[0];
          if (!firstTaskId) {
            console.error('No task ID found in created program:', data);
            alert(t('details.errorStarting', 'Error starting program - no tasks created'));
            setIsStarting(false);
            return;
          }
          router.push(`/pbl/scenarios/${scenarioId}/programs/${data.id}/tasks/${firstTaskId}`);
        }
      }
    } catch (error) {
      console.error('Error starting program:', error);
      // Enhanced error message prompting user to re-login
      const errorMessage = t('details.errorStarting', 'Error starting program') +
        '\n\n' +
        t('details.reloginPrompt', 'Please try logging out and logging in again to refresh your session.') +
        '\n\n' +
        t('details.reloginHint', '請先登出，再重新登入以刷新您的會話。');
      alert(errorMessage);
    } finally {
      setIsStarting(false);
    }
  };

  // Helper function for domain translation
  const getDomainTranslation = (domain: string) => {
    return t(`domains.${domain}`, { ns: 'pbl', defaultValue: domain });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!scenario) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t('details.scenarioNotFound', 'Scenario not found')}</p>
          <Link href="/pbl/scenarios" className="text-blue-600 hover:text-blue-700">
            {t('details.backToScenarios', 'Back to Scenarios')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link href="/pbl/scenarios" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                {t('pbl', 'PBL')}
              </Link>
            </li>
            <li className="text-gray-400 dark:text-gray-600">/</li>
            <li className="text-gray-900 dark:text-white">{typeof scenario.title === 'string' ? scenario.title : (scenario.title[i18n.language] || scenario.title.en || '')}</li>
          </ol>
        </nav>

        {/* Header Section */}
        <ScenarioHeader
          scenario={scenario}
          userPrograms={userPrograms}
          scenarioId={scenarioId}
          isScenarioInteractive={isScenarioInteractive}
          isStarting={isStarting}
          isProgramsCollapsed={isProgramsCollapsed}
          setIsProgramsCollapsed={setIsProgramsCollapsed}
          handleStartProgram={handleStartProgram}
          getScenarioData={getScenarioData}
        />

        {/* Overview Sections */}
        <ScenarioOverviewSections
          scenario={scenario}
          getScenarioData={getScenarioData}
          handleVideoClick={handleVideoClick}
          getDomainTranslation={getDomainTranslation}
        />

        {/* Learning Tasks */}
        <LearningTasksSection
          tasks={(getScenarioData('tasks', []) as Record<string, unknown>[])}
          ksaMapping={(getScenarioData('ksaMapping') as Record<string, unknown> | null)}
        />

      </div>

      {/* Video Modal */}
      {videoModalUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl">
            <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('common:video', 'Video')}
              </h3>
              <button
                onClick={() => setVideoModalUrl(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="relative pb-[56.25%]">
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={videoModalUrl}
                title="YouTube video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
