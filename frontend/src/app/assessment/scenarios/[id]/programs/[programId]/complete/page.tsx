'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AssessmentResults from '@/components/assessment/AssessmentResults';
import { AssessmentResult, AssessmentData, UserAnswer } from '@/types/assessment';
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
      // Check if user is logged in via localStorage
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const userData = localStorage.getItem('user');
      
      let queryParams = '';
      if (isLoggedIn === 'true' && userData) {
        const user = JSON.parse(userData);
        queryParams = `?userEmail=${encodeURIComponent(user.email)}&userId=${user.id}`;
      }
      
      const res = await fetch(`/api/assessment/programs/${progId}/evaluation${queryParams}`);
      const data = await res.json();
      setEvaluation(data.evaluation);
      
      // Also load the task to get questions and answers
      const programRes = await fetch(`/api/assessment/programs/${progId}${queryParams}`);
      const programData = await programRes.json();
      
      if (programData.currentTask) {
        // Store task data for later use
        localStorage.setItem('assessmentTaskData', JSON.stringify({
          questions: programData.currentTask.content.questions || [],
          interactions: programData.currentTask.interactions || []
        }));
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
        <div className="text-center">
          <p className="text-red-600 mb-4">Evaluation not found.</p>
          <button 
            onClick={() => router.push('/assessment/scenarios')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  // Get task data from localStorage
  const taskDataStr = localStorage.getItem('assessmentTaskData');
  const taskData = taskDataStr ? JSON.parse(taskDataStr) : { questions: [], interactions: [] };

  // Convert evaluation to AssessmentResult format
  const assessmentResult: AssessmentResult = {
    overallScore: evaluation.score,
    domainScores: evaluation.metadata?.domainScores || {
      engaging_with_ai: 0,
      creating_with_ai: 0,
      managing_with_ai: 0,
      designing_with_ai: 0
    },
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