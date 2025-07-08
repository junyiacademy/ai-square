'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ScenarioWithHierarchy, ProgramWithTasks } from '@/lib/v2/types';
import { 
  ArrowLeft, 
  Plus, 
  PlayCircle, 
  Clock, 
  CheckCircle, 
  Circle,
  AlertCircle
} from 'lucide-react';

export default function ScenarioProgramsPage() {
  const router = useRouter();
  const params = useParams();
  const scenarioId = params.scenarioId as string;
  
  const [scenario, setScenario] = useState<ScenarioWithHierarchy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingProgram, setCreatingProgram] = useState(false);

  useEffect(() => {
    loadScenario();
  }, [scenarioId]);

  const loadScenario = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from the API
      // For now, we'll use mock data
      const response = await fetch(`/api/v2/scenarios/${scenarioId}`);
      if (!response.ok) {
        throw new Error('Failed to load scenario');
      }
      const data = await response.json();
      setScenario(data.scenario);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scenario');
      // For demo, use mock data
      setScenario(getMockScenario(scenarioId));
    } finally {
      setLoading(false);
    }
  };

  const createNewProgram = async () => {
    try {
      setCreatingProgram(true);
      // In a real implementation, this would create a new program via API
      const newProgramId = `prog_${Date.now()}`;
      router.push(`/v2/scenarios/${scenarioId}/programs/${newProgramId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create program');
    } finally {
      setCreatingProgram(false);
    }
  };

  const navigateToProgram = (programId: string) => {
    router.push(`/v2/scenarios/${scenarioId}/programs/${programId}`);
  };

  const getProgramStatus = (program: ProgramWithTasks) => {
    if (!program.tasks || program.tasks.length === 0) return 'empty';
    
    const completedTasks = program.tasks.filter(t => 
      t.metadata?.status === 'completed'
    ).length;
    
    if (completedTasks === 0) return 'not_started';
    if (completedTasks === program.tasks.length) return 'completed';
    return 'in_progress';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'not_started':
        return <Circle className="w-5 h-5 text-gray-400" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600 text-center">
          <p className="text-xl font-semibold mb-2">Scenario not found</p>
          <button
            onClick={() => router.push('/v2/scenarios')}
            className="text-blue-600 hover:underline"
          >
            Back to scenarios
          </button>
        </div>
      </div>
    );
  }

  const learningType = scenario.metadata?.learning_type || 'pbl';
  const existingPrograms = scenario.programs || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/v2/scenarios')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to scenarios
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{scenario.title}</h1>
          <p className="text-gray-600">{scenario.description}</p>
          
          <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
            <span className="capitalize">{learningType}</span>
            <span>•</span>
            <span>{scenario.metadata?.difficulty || 'intermediate'}</span>
            {scenario.metadata?.estimated_duration && (
              <>
                <span>•</span>
                <span>{scenario.metadata.estimated_duration} min</span>
              </>
            )}
          </div>
        </div>

        {/* Programs Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {learningType === 'pbl' && 'Learning Programs'}
              {learningType === 'discovery' && 'Career Scenarios'}
              {learningType === 'assessment' && 'Assessment Sessions'}
            </h2>
            <button
              onClick={createNewProgram}
              disabled={creatingProgram}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {learningType === 'pbl' && 'Start New Program'}
              {learningType === 'discovery' && 'Start New Exploration'}
              {learningType === 'assessment' && 'Start New Assessment'}
            </button>
          </div>

          {existingPrograms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                No programs started yet. Create your first one to begin learning!
              </p>
              <button
                onClick={createNewProgram}
                disabled={creatingProgram}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <PlayCircle className="w-5 h-5" />
                Start Learning
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {existingPrograms.map((program, index) => {
                const status = getProgramStatus(program);
                const taskCount = program.tasks?.length || 0;
                const completedCount = program.tasks?.filter(t => 
                  t.metadata?.status === 'completed'
                ).length || 0;
                
                return (
                  <div
                    key={program.id}
                    onClick={() => navigateToProgram(program.id)}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(status)}
                          <h3 className="text-lg font-medium">
                            {program.title || `Program ${index + 1}`}
                          </h3>
                        </div>
                        
                        {program.description && (
                          <p className="text-gray-600 text-sm mb-2">{program.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{completedCount}/{taskCount} tasks completed</span>
                          <span>•</span>
                          <span>Created {new Date(program.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <PlayCircle className="w-5 h-5 text-blue-600 ml-4" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Section */}
        {scenario.metadata?.domains && (
          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Learning Domains</h3>
            <div className="flex flex-wrap gap-2">
              {scenario.metadata.domains.map((domain: string) => (
                <span
                  key={domain}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                >
                  {domain.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Mock data helper
function getMockScenario(scenarioId: string): ScenarioWithHierarchy {
  return {
    id: scenarioId,
    user_id: 'user_demo',
    project_id: 'proj_demo',
    code: 'demo-scenario',
    title: 'Demo Scenario',
    description: 'This is a demo scenario for testing',
    structure_type: 'standard',
    order_index: 0,
    is_active: true,
    metadata: {
      learning_type: 'pbl',
      difficulty: 'intermediate',
      domains: ['engaging_with_ai', 'creating_with_ai'],
      language: 'en',
      estimated_duration: 60
    },
    created_at: new Date(),
    updated_at: new Date(),
    programs: [
      {
        id: 'prog_demo_1',
        scenario_id: scenarioId,
        code: 'foundation',
        title: 'Foundation Program',
        description: 'Learn the basics',
        difficulty_level: 'beginner',
        order_index: 0,
        is_active: true,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-01'),
        tasks: [
          {
            id: 'task_1',
            program_id: 'prog_demo_1',
            code: 'intro',
            title: 'Introduction',
            description: 'Get started with the basics',
            instructions: 'Follow the guide',
            task_type: 'learning',
            order_index: 0,
            is_active: true,
            metadata: { status: 'completed' },
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 'task_2',
            program_id: 'prog_demo_1',
            code: 'practice',
            title: 'Practice',
            description: 'Apply what you learned',
            instructions: 'Complete the exercises',
            task_type: 'practice',
            order_index: 1,
            is_active: true,
            metadata: { status: 'in_progress' },
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      }
    ]
  };
}