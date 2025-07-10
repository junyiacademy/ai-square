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
  const [programId, setProgramId] = useState<string>('');
  const [scenarioId, setScenarioId] = useState<string>('');
  const [domains, setDomains] = useState<Record<string, AssessmentDomain>>({});
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

  // Load assessment domains
  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const response = await fetch(`/api/assessment?lang=${i18n.language}`, {
          credentials: 'include' // Include cookies for authentication
        });
        const data = await response.json();
        setDomains(data.domains || {});
      } catch (error) {
        console.error('Failed to fetch domains:', error);
      }
    };
    fetchDomains();
  }, [i18n.language]);

  const loadProgramState = async (progId: string) => {
    try {
      const res = await fetch(`/api/assessment/programs/${progId}`, {
        credentials: 'include' // Include cookies for authentication
      });
      const data = await res.json();
      
      setProgram(data.program);
      setCurrentTask(data.currentTask);
      
      // Update language if program has language metadata
      if (data.program.metadata?.language && data.program.metadata.language !== i18n.language) {
        await i18n.changeLanguage(data.program.metadata.language);
      }
    } catch (error) {
      console.error('Failed to load program:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = async (answers: UserAnswer[]) => {
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
          headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          taskId: currentTask?.id
        })
      });
      
      // Navigate to complete page
      router.push(`/assessment/scenarios/${scenarioId}/programs/${programId}/complete`);
    } catch (error) {
      console.error('Failed to complete assessment:', error);
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
    </main>
  );
}