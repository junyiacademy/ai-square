'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface ScenarioDetails {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedDuration: number;
  targetDomain: string[];
  prerequisites: string[];
  learningObjectives: string[];
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    instructions: string[];
    expectedOutcome: string;
    timeLimit?: number;
  }>;
}

interface UserProgram {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  status: 'in_progress' | 'completed' | 'paused';
  startedAt: string;
  updatedAt: string;
  totalTasks: number;
  evaluatedTasks: number;
  overallScore?: number;
  taskCount?: number;
  completedTaskCount?: number;
  lastActivity?: string;
}

export default function ScenarioDetailsPage() {
  const { t, i18n } = useTranslation(['pbl']);
  const params = useParams();
  const scenarioId = params.id as string;
  
  const [scenario, setScenario] = useState<ScenarioDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [userPrograms, setUserPrograms] = useState<UserProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchScenarioDetails = async () => {
      try {
        const response = await fetch(`/api/pbl/scenarios/${scenarioId}?lang=${i18n.language}`);
        const data = await response.json();
        
        if (data.success) {
          setScenario(data.data);
        }
      } catch (error) {
        console.error('Error fetching scenario details:', error);
      } finally {
        setLoading(false);
      }
    };

    const fetchUserPrograms = async () => {
      try {
        const response = await fetch(`/api/pbl/user-programs?scenarioId=${scenarioId}&lang=${i18n.language}`);
        const data = await response.json();
        
        if (data.success && data.programs) {
          setUserPrograms(data.programs);
          // Select the most recent program by default
          if (data.programs.length > 0) {
            setSelectedProgramId(data.programs[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching user programs:', error);
      }
    };

    fetchScenarioDetails();
    fetchUserPrograms();
  }, [scenarioId, i18n.language]);

  const getDifficultyBadge = (difficulty: string) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    return colors[difficulty as keyof typeof colors] || colors.intermediate;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      research: '🔍',
      analysis: '📊',
      creation: '✏️',
      interaction: '💬',
      general: '📚'
    };
    return icons[category as keyof typeof icons] || '📚';
  };


  const handleStartProgram = async (programId?: string) => {
    if (!scenario || isStarting) return;
    
    setIsStarting(true);
    try {
      if (programId) {
        // Continue existing program
        const program = userPrograms.find(p => p.id === programId);
        if (program) {
          // Navigate to the learning page with existing program
          const firstTaskId = scenario.tasks[0]?.id || 'task-1';
          router.push(`/pbl/scenarios/${scenarioId}/program/${programId}/tasks/${firstTaskId}/learn`);
        }
      } else {
        // Start new program (will be created on first message)
        const tempProgramId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const firstTaskId = scenario.tasks[0]?.id || 'task-1';
        router.push(`/pbl/scenarios/${scenarioId}/program/${tempProgramId}/tasks/${firstTaskId}/learn?isNew=true`);
      }
    } catch (error) {
      console.error('Error starting program:', error);
      alert(t('details.errorStarting'));
      setIsStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t('details.scenarioNotFound')}</p>
          <Link href="/pbl" className="text-blue-600 hover:text-blue-700">
            {t('details.backToPBL')}
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
              <Link href="/pbl" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                {t('details.breadcrumb.pbl')}
              </Link>
            </li>
            <li className="text-gray-400 dark:text-gray-600">/</li>
            <li className="text-gray-900 dark:text-white">{scenario.title}</li>
          </ol>
        </nav>

        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {scenario.title}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
                {scenario.description}
              </p>
              
              {/* Metadata */}
              <div className="flex flex-wrap gap-4 mb-6">
                <div className="flex items-center">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyBadge(scenario.difficulty)}`}>
                    {t(`level.${scenario.difficulty}`)}
                  </span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{scenario.estimatedDuration} {t('details.minutes')}</span>
                </div>
              </div>

              {/* Programs Section */}
              {userPrograms.length > 0 && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    {t('details.existingPrograms')}
                  </h3>
                  <div className="space-y-2">
                    {userPrograms.map((program, index) => (
                      <div
                        key={program.id}
                        className="p-4 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {index === 0 ? t('details.latestProgram') : `${t('details.program')} ${index + 1}`}
                            </span>
                            <span className={`ml-3 text-xs px-2 py-1 rounded-full ${
                              program.status === 'completed' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : program.status === 'in_progress'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {t(`history.status.${program.status}`)}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <div>
                            {t('details.progress')}: {program.evaluatedTasks}/{program.taskCount || program.totalTasks} {t('details.tasks')}
                            {program.overallScore > 0 && (
                              <>
                                <span className="mx-2">•</span>
                                <span className="font-medium">
                                  {t('pbl:learn.overallScore')}: {program.overallScore}%
                                </span>
                              </>
                            )}
                          </div>
                          <div>
                            {t('details.started')}: {new Date(program.startedAt).toLocaleDateString()}
                            {program.evaluatedTasks > 0 && (
                              <>
                                <span className="mx-2">•</span>
                                {t('pbl:history.tasksEvaluated')}: {program.evaluatedTasks}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleStartProgram(program.id)}
                            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                          >
                            {t('details.continue')}
                          </button>
                          {(program.evaluatedTasks > 0 || program.status === 'completed') && (
                            <button
                              onClick={() => router.push(`/pbl/scenarios/${scenarioId}/program/${program.id}/complete`)}
                              className="text-sm px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors font-medium"
                            >
                              {t('details.goToCompletion')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => handleStartProgram()}
                  disabled={isStarting}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStarting ? t('details.starting') : t('details.startNewProgram')}
                </button>
                <Link
                  href="/pbl"
                  className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('details.backToScenarios')}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Learning Objectives */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="text-2xl mr-2">🎯</span>
              {t('details.learningObjectives')}
            </h2>
            <ul className="space-y-2">
              {scenario.learningObjectives.map((objective, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">{objective}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Prerequisites */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <span className="text-2xl mr-2">📋</span>
              {t('details.prerequisites')}
            </h2>
            <ul className="space-y-2">
              {scenario.prerequisites.map((prereq, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span className="text-gray-600 dark:text-gray-300">{prereq}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Learning Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            {t('details.learningTasks')}
          </h2>

          {/* Tasks List */}
          <div className="space-y-4">
            {scenario.tasks.map((task, taskIndex) => (
              <div key={task.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-medium text-gray-900 dark:text-white">
                    {taskIndex + 1}. {task.title}
                  </h5>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {getCategoryIcon(task.category)}
                    </span>
                    {task.timeLimit && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {task.timeLimit} min
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  {task.description}
                </p>
                
                {/* Instructions */}
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    {t('details.instructions')}
                  </p>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    {task.instructions.map((instruction, i) => (
                      <li key={i} className="flex items-start">
                        <span className="text-gray-400 mr-2">•</span>
                        {instruction}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Expected Outcome */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                    {t('details.expectedOutcome')}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {task.expectedOutcome}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}