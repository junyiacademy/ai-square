/**
 * V2 Scenario Detail Page
 * Main learning interface for a specific scenario
 */

'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePrograms } from '@/lib/v2/hooks/usePrograms';
import { useTasks } from '@/lib/v2/hooks/useTasks';
import { LearningInterface } from '@/lib/v2/components/LearningInterface';
import { Loader2 } from 'lucide-react';

export default function ScenarioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scenarioId = params.scenarioId as string;

  // Fetch scenario data
  const [scenario, setScenario] = React.useState<any>(null);
  const [scenarioLoading, setScenarioLoading] = React.useState(true);
  const [scenarioError, setScenarioError] = React.useState<string | null>(null);

  // Fetch programs
  const {
    programs,
    activeProgram,
    loading: programsLoading,
    error: programsError,
    setActiveProgram
  } = usePrograms({ scenarioId, autoActivate: true });

  // Fetch tasks for active program
  const {
    tasks,
    activeTask,
    loading: tasksLoading,
    error: tasksError,
    setActiveTask,
    submitTask
  } = useTasks({ 
    programId: activeProgram?.id,
    autoActivate: true
  });

  // Fetch scenario details
  useEffect(() => {
    const fetchScenario = async () => {
      try {
        setScenarioLoading(true);
        const response = await fetch(`/api/v2/scenarios/${scenarioId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch scenario');
        }

        const data = await response.json();
        setScenario(data.scenario);
      } catch (err) {
        setScenarioError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setScenarioLoading(false);
      }
    };

    fetchScenario();
  }, [scenarioId]);

  // Loading state
  if (scenarioLoading || programsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-gray-600">Loading scenario...</p>
        </div>
      </div>
    );
  }

  // Error state
  const error = scenarioError || programsError || tasksError;
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-lg font-semibold text-red-900 mb-2">
              Error Loading Scenario
            </h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => router.push('/v2')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!scenario) {
    return null;
  }

  return (
    <LearningInterface
      scenario={scenario}
      programs={programs}
      tasks={tasks}
      activeProgram={activeProgram}
      activeTask={activeTask}
      onSelectProgram={setActiveProgram}
      onSelectTask={setActiveTask}
      onSubmitResponse={submitTask}
      onBack={() => router.push('/v2')}
    />
  );
}