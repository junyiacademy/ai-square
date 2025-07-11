'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AssessmentQuiz from '@/components/assessment/AssessmentQuiz';
import { AssessmentQuestion, AssessmentDomain, UserAnswer } from '@/types/assessment';

interface Task {
  id: string;
  title: string;
  content: {
    questions: AssessmentQuestion[];
    timeLimit?: number;
  };
  interactions: Array<{
    type: string;
    content: any;
  }>;
}

interface Program {
  id: string;
  scenarioId: string;
  status: string;
  startedAt: string;
  metadata?: {
    timeLimit?: number;
    startTime?: number;
    language?: string;
  };
}

export default function AssessmentProgramPage({ 
  params 
}: { 
  params: Promise<{ id: string; programId: string }> 
}) {
  const [program, setProgram] = useState<Program | null>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [programId, setProgramId] = useState<string>('');
  const [scenarioId, setScenarioId] = useState<string>('');
  const domains = {
    engaging_with_ai: { name: 'Engaging with AI', description: '', questions: 0 },
    creating_with_ai: { name: 'Creating with AI', description: '', questions: 0 },
    managing_with_ai: { name: 'Managing with AI', description: '', questions: 0 },
    designing_with_ai: { name: 'Designing with AI', description: '', questions: 0 }
  };
  const router = useRouter();
  const { t, i18n } = useTranslation('assessment');

  // Load program state
  useEffect(() => {
    params.then(p => {
      setProgramId(p.programId);
      setScenarioId(p.id);
      loadProgramState(p.programId);
    });
  }, [params]);

  const loadProgramState = async (progId: string) => {
    try {
      // Check if user is logged in via localStorage
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const sessionToken = localStorage.getItem('ai_square_session');
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (sessionToken) {
        headers['x-session-token'] = sessionToken;
      }
      
      const res = await fetch(`/api/assessment/programs/${progId}`, {
        credentials: 'include', // Include cookies for authentication
        headers
      });
      
      if (!res.ok) {
        console.error('Failed to load program:', res.status);
        return;
      }
      
      const data = await res.json();
      
      if (data.program) {
        setProgram(data.program);
        setCurrentTask(data.currentTask);
        
        // Update language if program has language metadata
        if (data.program.metadata?.language && data.program.metadata.language !== i18n.language) {
          await i18n.changeLanguage(data.program.metadata.language);
        }
      }
    } catch (error) {
      console.error('Failed to load program:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = async (answers: UserAnswer[]) => {
    setSubmitting(true); // Show loading state
    try {
      // Filter out already submitted answers
      const existingAnswerIds = currentTask?.interactions
        .filter((i: any) => i.type === 'assessment_answer')
        .map((i: any) => i.content.questionId) || [];
      
      const newAnswers = answers.filter(a => !existingAnswerIds.includes(a.questionId));
      
      // Batch submit new answers
      if (newAnswers.length > 0) {
        await fetch(`/api/assessment/programs/${programId}/batch-answers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify({
            taskId: currentTask?.id,
            answers: newAnswers.map(a => ({
              questionId: a.questionId,
              answer: a.selectedAnswer,
              timeSpent: a.timeSpent
            }))
          })
        });
      }
      
      // Complete the assessment
      await fetch(`/api/assessment/programs/${programId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          taskId: currentTask?.id
        })
      });
      
      // Navigate to complete page
      router.push(`/assessment/scenarios/${scenarioId}/programs/${programId}/complete`);
    } catch (error) {
      console.error('Failed to complete assessment:', error);
      setSubmitting(false); // Hide loading on error
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

  if (!currentTask || !currentTask.content.questions || currentTask.content.questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{t('errorLoading')}</p>
        </div>
      </div>
    );
  }

  // Calculate time limit from program metadata
  const timeLimit = program?.metadata?.timeLimit || 15; // Default 15 minutes

  return (
    <main className="min-h-screen bg-gray-50">
      {submitting ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('submittingAssessment', 'Submitting your assessment...')}</h2>
            <p className="text-gray-600">{t('pleaseWait', 'Please wait while we process your results')}</p>
          </div>
        </div>
      ) : (
        <AssessmentQuiz
          questions={currentTask.content.questions}
          domains={domains}
          onComplete={handleQuizComplete}
          timeLimit={timeLimit}
          // Pass saved answers from interactions
          initialAnswers={currentTask.interactions
            .filter((i: any) => i.type === 'assessment_answer')
            .reduce((acc: any, i: any) => {
              acc.push({
                questionId: i.content.questionId,
                selectedAnswer: i.content.selectedAnswer,
                timeSpent: i.content.timeSpent || 0,
                isCorrect: i.content.isCorrect || false
              });
              return acc;
            }, [])}
        />
      )}
    </main>
  );
}