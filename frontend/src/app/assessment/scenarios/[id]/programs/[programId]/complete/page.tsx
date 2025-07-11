'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AssessmentResults from '@/components/assessment/AssessmentResults';
import { AssessmentResult, AssessmentData, UserAnswer, DomainScores } from '@/types/assessment';
interface Evaluation {
  id: string;
  score: number;
  feedback: string;
  dimensions: Array<{
    name: string;
    score: number;
    feedback: string;
    metadata?: {
      knowledge?: string[];
      skills?: string[];
      attitudes?: string[];
    };
  }>;
  metadata?: {
    completionTime?: number;
    totalQuestions?: number;
    correctAnswers?: number;
    level?: string;
    recommendations?: string[];
    certificateEligible?: boolean;
    domainScores?: Record<string, number>;
    ksaAnalysis?: {
      knowledge: { score: number; strong: string[]; weak: string[] };
      skills: { score: number; strong: string[]; weak: string[] };
      attitudes: { score: number; strong: string[]; weak: string[] };
    };
  };
}

export default function AssessmentCompletePage({ 
  params 
}: { 
  params: Promise<{ id: string; programId: string }> 
}) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [programId, setProgramId] = useState<string>('');
  const [scenarioId, setScenarioId] = useState<string>('');
  const [taskData, setTaskData] = useState<{ questions: any[]; interactions: any[] } | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    params.then(p => {
      setProgramId(p.programId);
      setScenarioId(p.id);
      loadEvaluation(p.programId);
    });
  }, [params]);

  const loadEvaluation = async (progId: string) => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      const res = await fetch(`/api/assessment/programs/${progId}/evaluation`, {
        credentials: 'include',
        headers
      });
      const data = await res.json();
      setEvaluation(data.evaluation);
      
      // Also load the task to get questions and answers
      const programRes = await fetch(`/api/assessment/programs/${progId}`, {
        credentials: 'include',
        headers
      });
      const programData = await programRes.json();
      
      if (programData.currentTask) {
        // Store task data in state instead of localStorage
        setTaskData({
          questions: programData.currentTask.content.questions || [],
          interactions: programData.currentTask.interactions || []
        });
      }
    } catch (error) {
      console.error('Failed to load evaluation:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Assessment Not Completed</h3>
          <p className="text-gray-600 mb-6">
            This assessment hasn't been completed yet. Please complete all questions and submit your answers to view the results.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => router.push(`/assessment/scenarios/${scenarioId}/programs/${programId}`)}
              className="w-full bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
            >
              Continue Assessment
            </button>
            <button 
              onClick={() => router.push(`/assessment/scenarios/${scenarioId}`)}
              className="w-full bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200"
            >
              Back to Scenario
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Use task data from state
  if (!taskData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  // Convert evaluation to AssessmentResult format
  const defaultDomainScores: DomainScores = {
    engaging_with_ai: 0,
    creating_with_ai: 0,
    managing_with_ai: 0,
    designing_with_ai: 0
  };
  
  const domainScores = evaluation.metadata?.domainScores 
    ? {
        engaging_with_ai: evaluation.metadata.domainScores.engaging_with_ai || 0,
        creating_with_ai: evaluation.metadata.domainScores.creating_with_ai || 0,
        managing_with_ai: evaluation.metadata.domainScores.managing_with_ai || 0,
        designing_with_ai: evaluation.metadata.domainScores.designing_with_ai || 0
      }
    : defaultDomainScores;
    
  const assessmentResult: AssessmentResult = {
    overallScore: evaluation.score,
    domainScores,
    totalQuestions: evaluation.metadata?.totalQuestions || 0,
    correctAnswers: evaluation.metadata?.correctAnswers || 0,
    timeSpentSeconds: evaluation.metadata?.completionTime || 0,
    completedAt: new Date(),
    level: (evaluation.metadata?.level || 'beginner') as 'beginner' | 'intermediate' | 'advanced' | 'expert',
    recommendations: evaluation.metadata?.recommendations || []
  };

  // Convert interactions to UserAnswer format
  const userAnswers: UserAnswer[] = taskData.interactions
    .filter((i: any) => i.type === 'assessment_answer')
    .map((interaction: any) => ({
      questionId: interaction.content.questionId,
      selectedAnswer: interaction.content.selectedAnswer as 'a' | 'b' | 'c' | 'd',
      timeSpent: interaction.content.timeSpent || 0,
      isCorrect: interaction.content.isCorrect || false
    }));

  // Create assessment data structure for domains
  const assessmentData: AssessmentData = {
    assessment_config: {
      total_questions: 12,
      time_limit_minutes: 15,
      passing_score: 60,
      domains: ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai']
    },
    domains: {
      engaging_with_ai: {
        name: 'Engaging with AI',
        description: 'Understanding and effectively communicating with AI systems',
        questions: 3
      },
      creating_with_ai: {
        name: 'Creating with AI',
        description: 'Using AI tools to enhance creativity and productivity',
        questions: 3
      },
      managing_with_ai: {
        name: 'Managing with AI',
        description: 'Understanding AI limitations, privacy, and ethical considerations',
        questions: 3
      },
      designing_with_ai: {
        name: 'Designing with AI',
        description: 'Strategic thinking about AI implementation and innovation',
        questions: 3
      }
    },
    questions: taskData.questions || []
  };

  return (
    <AssessmentResults
      result={assessmentResult}
      domains={assessmentData.domains}
      onRetake={() => router.push(`/assessment/scenarios/${scenarioId}`)}
      questions={assessmentData.questions}
      userAnswers={userAnswers}
      isReview={true}
    />
  );
}