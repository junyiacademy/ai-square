'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ScenarioWithHierarchy, Task, Log } from '@/lib/v2/types';
import { TaskPanel } from '@/lib/v2/components/TaskPanel';
import { ContentPanel } from '@/lib/v2/components/ContentPanel';
import { ActionPanel } from '@/lib/v2/components/ActionPanel';
import { ArrowLeft, Save } from 'lucide-react';

export default function LearningInterfacePage() {
  const router = useRouter();
  const params = useParams();
  const scenarioId = params.scenarioId as string;
  const programId = params.programId as string;
  
  const [scenario, setScenario] = useState<ScenarioWithHierarchy | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadScenarioAndProgram();
  }, [scenarioId, programId]);

  const loadScenarioAndProgram = async () => {
    try {
      setLoading(true);
      // In real implementation, fetch from API
      // For now, use mock data
      const mockScenario = getMockScenarioWithProgram(scenarioId, programId);
      setScenario(mockScenario);
      
      // Set first task as current if exists
      const program = mockScenario.programs.find(p => p.id === programId);
      if (program && program.tasks.length > 0) {
        setCurrentTaskId(program.tasks[0].id);
      }
    } catch (err) {
      console.error('Failed to load scenario:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSelect = (taskId: string) => {
    setCurrentTaskId(taskId);
    logAction('task_selected', { task_id: taskId });
  };

  const handleTaskComplete = async (taskId: string, evaluation: any) => {
    // Update task status
    if (scenario) {
      const updatedScenario = { ...scenario };
      const program = updatedScenario.programs.find(p => p.id === programId);
      if (program) {
        const task = program.tasks.find(t => t.id === taskId);
        if (task) {
          task.metadata = {
            ...task.metadata,
            status: 'completed',
            evaluation,
            completed_at: new Date().toISOString()
          };
        }
      }
      setScenario(updatedScenario);
    }
    
    // Log task completion
    logAction('task_completed', {
      task_id: taskId,
      evaluation,
      completed_at: new Date().toISOString()
    });
    
    // Save progress
    await saveProgress();
  };

  const handleProgramComplete = async () => {
    // Log program completion
    logAction('program_completed', {
      program_id: programId,
      completed_at: new Date().toISOString(),
      total_tasks: getCurrentProgram()?.tasks.length || 0
    });
    
    // Save and navigate back
    await saveProgress();
    router.push(`/v2/scenarios/${scenarioId}`);
  };

  const logAction = (action: string, data: any) => {
    const newLog: Log = {
      id: `log_${Date.now()}_${Math.random()}`,
      scenario_id: scenarioId,
      program_id: programId,
      task_id: currentTaskId || undefined,
      action,
      data,
      created_at: new Date(),
      updated_at: new Date()
    };
    setLogs(prev => [...prev, newLog]);
  };

  const saveProgress = async () => {
    try {
      setSaving(true);
      // In real implementation, save to backend
      // For now, save to localStorage
      const progressKey = `progress_${scenarioId}_${programId}`;
      const progress = {
        scenario_id: scenarioId,
        program_id: programId,
        current_task_id: currentTaskId,
        logs,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(progressKey, JSON.stringify(progress));
    } catch (err) {
      console.error('Failed to save progress:', err);
    } finally {
      setSaving(false);
    }
  };

  const getCurrentProgram = () => {
    return scenario?.programs.find(p => p.id === programId);
  };

  const getCurrentTask = () => {
    const program = getCurrentProgram();
    return program?.tasks.find(t => t.id === currentTaskId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!scenario || !getCurrentProgram()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-600 text-center">
          <p className="text-xl font-semibold mb-2">Program not found</p>
          <button
            onClick={() => router.push(`/v2/scenarios/${scenarioId}`)}
            className="text-blue-600 hover:underline"
          >
            Back to scenario
          </button>
        </div>
      </div>
    );
  }

  const program = getCurrentProgram()!;
  const currentTask = getCurrentTask();
  const learningType = scenario.metadata?.learning_type || 'pbl';

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/v2/scenarios/${scenarioId}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            
            <div>
              <h1 className="text-lg font-semibold">{scenario.title}</h1>
              <p className="text-sm text-gray-600">{program.title}</p>
            </div>
          </div>
          
          <button
            onClick={saveProgress}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Progress'}
          </button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Tasks */}
        <div className="w-80 bg-white border-r overflow-y-auto">
          <TaskPanel
            tasks={program.tasks}
            currentTaskId={currentTaskId}
            onTaskSelect={handleTaskSelect}
            onProgramComplete={handleProgramComplete}
          />
        </div>

        {/* Middle Panel - Content */}
        <div className="flex-1 bg-white overflow-y-auto">
          {currentTask ? (
            <ContentPanel
              task={currentTask}
              learningType={learningType}
              language={scenario.metadata?.language || 'en'}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a task to begin
            </div>
          )}
        </div>

        {/* Right Panel - Action */}
        <div className="w-96 bg-gray-50 border-l overflow-y-auto">
          {currentTask ? (
            <ActionPanel
              task={currentTask}
              learningType={learningType}
              onComplete={(evaluation) => handleTaskComplete(currentTask.id, evaluation)}
              onAction={(action, data) => logAction(action, data)}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              Select a task to see actions
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mock data helper
function getMockScenarioWithProgram(scenarioId: string, programId: string): ScenarioWithHierarchy {
  return {
    id: scenarioId,
    user_id: 'user_demo',
    project_id: 'proj_demo',
    code: 'demo-scenario',
    title: 'AI-Powered Job Search Mastery',
    description: 'Learn to leverage AI tools throughout your job search journey',
    structure_type: 'standard',
    order_index: 0,
    is_active: true,
    metadata: {
      learning_type: 'pbl',
      difficulty: 'intermediate',
      domains: ['engaging_with_ai', 'creating_with_ai'],
      language: 'en'
    },
    created_at: new Date(),
    updated_at: new Date(),
    programs: [
      {
        id: programId,
        scenario_id: scenarioId,
        code: 'foundation',
        title: 'Foundation - Understanding AI in Job Search',
        description: 'Learn the basics of using AI for job searching',
        difficulty_level: 'beginner',
        order_index: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
        tasks: [
          {
            id: 'task_1',
            program_id: programId,
            code: 'intro',
            title: 'Introduction to AI Job Search Tools',
            description: 'Discover how AI can revolutionize your job search process',
            instructions: 'In this lesson, you will learn about various AI tools available for job searching, including resume builders, job matching algorithms, and interview preparation assistants.',
            task_type: 'learning',
            order_index: 0,
            is_active: true,
            estimated_minutes: 15,
            metadata: {
              learning_objectives: [
                'Understand the role of AI in modern job searching',
                'Identify key AI tools for job seekers',
                'Learn best practices for using AI effectively'
              ],
              resources: [
                { type: 'video', title: 'AI Job Search Overview', url: '#' },
                { type: 'article', title: 'Top 10 AI Job Search Tools', url: '#' }
              ]
            },
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 'task_2',
            program_id: programId,
            code: 'resume_optimization',
            title: 'AI-Powered Resume Optimization',
            description: 'Learn to use AI to create and optimize your resume',
            instructions: 'Practice using AI tools to analyze and improve your resume for better job matches.',
            task_type: 'practice',
            order_index: 1,
            is_active: true,
            estimated_minutes: 20,
            metadata: {
              practice_steps: [
                'Upload your current resume',
                'Analyze with AI for improvements',
                'Implement suggested changes',
                'Compare before and after'
              ]
            },
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 'task_3',
            program_id: programId,
            code: 'job_matching',
            title: 'Smart Job Matching with AI',
            description: 'Use AI to find jobs that match your skills and interests',
            instructions: 'Learn how AI algorithms match candidates with job opportunities.',
            task_type: 'learning',
            order_index: 2,
            is_active: true,
            estimated_minutes: 15,
            created_at: new Date(),
            updated_at: new Date()
          },
          {
            id: 'task_4',
            program_id: programId,
            code: 'assessment',
            title: 'Knowledge Check',
            description: 'Test your understanding of AI job search concepts',
            instructions: 'Complete this assessment to verify your learning.',
            task_type: 'assessment',
            task_variant: 'quiz',
            order_index: 3,
            is_active: true,
            estimated_minutes: 10,
            metadata: {
              questions: [
                {
                  id: 'q1',
                  type: 'multiple_choice',
                  question: 'What is the primary benefit of using AI in job searching?',
                  options: [
                    'It guarantees you will get a job',
                    'It helps match your skills with relevant opportunities',
                    'It writes your resume for you',
                    'It conducts interviews on your behalf'
                  ],
                  correct_answer: 1
                }
              ]
            },
            created_at: new Date(),
            updated_at: new Date()
          }
        ]
      }
    ]
  };
}