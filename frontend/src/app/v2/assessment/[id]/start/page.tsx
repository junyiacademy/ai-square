'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

export default function AssessmentStartPage() {
  const router = useRouter();
  const params = useParams();
  const { i18n } = useTranslation();
  const assessmentId = params.id as string;

  useEffect(() => {
    startAssessment();
  }, [assessmentId]);

  const startAssessment = async () => {
    try {
      const response = await fetch('/api/v2/assessment/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId,
          language: i18n.language
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to start assessment:', error);
        router.push(`/v2/assessment/${assessmentId}`);
        return;
      }

      const { data } = await response.json();
      
      // Redirect to the program page
      router.push(`/v2/assessment/${assessmentId}/programs/${data.programId}`);
      
    } catch (error) {
      console.error('Error starting assessment:', error);
      router.push(`/v2/assessment/${assessmentId}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Starting assessment...</p>
      </div>
    </div>
  );
}