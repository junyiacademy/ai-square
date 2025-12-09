import { useState, useEffect, useCallback } from 'react';
import { AssessmentResult, AssessmentQuestion, UserAnswer } from '@/types/assessment';
import { authenticatedFetch } from '@/lib/utils/authenticated-fetch';
import type { CurrentUser } from './useCurrentUser';

interface UseAssessmentSaveProps {
  currentUser: CurrentUser | null;
  result: AssessmentResult;
  userAnswers: UserAnswer[];
  questions: AssessmentQuestion[];
  language: string;
  isReview: boolean;
}

export function useAssessmentSave({
  currentUser,
  result,
  userAnswers,
  questions,
  language,
  isReview
}: UseAssessmentSaveProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const handleSaveResults = useCallback(async (t: (key: string, options?: Record<string, unknown>) => string) => {
    console.log('=== Save button clicked ===');
    console.log('Current user:', currentUser);
    console.log('Is saved:', isSaved);

    if (!currentUser || isSaved) return;

    setIsSaving(true);
    setSaveMessage(null);

    const requestBody = {
      userId: currentUser.id,
      userEmail: currentUser.email,
      language,
      answers: userAnswers,
      questions,
      result: {
        ...result,
        timeSpentSeconds: result.timeSpentSeconds,
      },
    };

    console.log('Sending request to API with body:', requestBody);

    try {
      const response = await authenticatedFetch('/api/assessment/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSaved(true);
        setSaveMessage({
          type: 'success',
          text: t('results.saveSuccess', { assessmentId: data.assessmentId }),
        });

        if (currentUser.email) {
          try {
            await authenticatedFetch('/api/users/update-progress', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: currentUser.email,
                stage: 'assessment',
                data: { result }
              })
            });
          } catch (error) {
            console.error('Failed to update GCS progress:', error);
          }
        }
      } else {
        setSaveMessage({
          type: 'error',
          text: t('results.saveError', { error: data.error }),
        });
      }
    } catch (error) {
      console.error('Error saving results:', error);
      setSaveMessage({
        type: 'error',
        text: t('results.saveError', { error: 'Network error' }),
      });
    } finally {
      setIsSaving(false);
    }
  }, [currentUser, isSaved, userAnswers, questions, result, language]);

  useEffect(() => {
    if (currentUser && !isSaved && result && !isReview) {
      console.log('Auto-saving assessment result...');
      const mockT = (key: string, options?: Record<string, unknown>) => {
        if (key === 'results.saveSuccess') return `Results saved successfully: ${options?.assessmentId}`;
        if (key === 'results.saveError') return `Failed to save results: ${options?.error}`;
        return key;
      };
      handleSaveResults(mockT);
    }
  }, [currentUser, isSaved, result, isReview, handleSaveResults]);

  return {
    isSaving,
    saveMessage,
    isSaved,
    handleSaveResults
  };
}
