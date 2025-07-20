'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import DiscoveryNavigation from '@/components/layout/DiscoveryNavigation';

// Dynamic import to avoid SSR issues
const InterestAssessment = dynamic(
  () => import('@/components/discovery/InterestAssessment'),
  { 
    ssr: false,
    loading: () => <div className="text-center py-8">載入中...</div>
  }
);

// Import types only
import type { AssessmentResults } from '@/lib/types/user-data';
import DiscoveryHeader from '@/components/discovery/DiscoveryHeader';

export default function EvaluationPage() {
  const { t } = useTranslation(['discovery', 'navigation']);
  const router = useRouter();
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [achievementCount, setAchievementCount] = useState(0);
  const [programCount, setProgramCount] = useState(0);
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string[]>>({});

  // Load existing assessment results
  useEffect(() => {
    const loadData = async () => {
      try {
        // Dynamic import to avoid webpack issues
        const { userDataService } = await import('@/lib/services/user-data-service');
        const userData = await userDataService.loadUserData();
        if (userData?.assessmentResults) {
          setAssessmentResults(userData.assessmentResults);
        }
        setAchievementCount(userData?.achievements?.badges?.length || 0);
        // Programs are stored in GCS in v2 architecture, not in userData
        setProgramCount(0); // TODO: Query from GCS if needed
        
        // Load the latest assessment session's answers
        if (userData?.assessmentSessions && userData.assessmentSessions.length > 0) {
          const latestSession = userData.assessmentSessions[userData.assessmentSessions.length - 1];
          if (latestSession.answers) {
            setAssessmentAnswers(latestSession.answers);
          }
        }
      } catch (error) {
        console.error('Failed to load assessment data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAssessmentComplete = async (results: AssessmentResults, answers?: Record<string, string[]>) => {
    setAssessmentResults(results);
    if (answers) {
      setAssessmentAnswers(answers);
    }
    
    // Save assessment session
    try {
      const { userDataService } = await import('@/lib/services/user-data-service');
      
      const assessmentSession = {
        id: `assessment_${Date.now()}`,
        createdAt: new Date().toISOString(),
        results: results,
        answers: answers || {}
      };
      
      await userDataService.addAssessmentSession(assessmentSession);
    } catch (error) {
      console.error('Failed to save assessment results:', error);
    }
  };
  
  
  

  const handleRetakeAssessment = () => {
    setAssessmentResults(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  const pageTitle = assessmentResults 
    ? t('discovery:evaluation.resultsTitle')
    : t('discovery:evaluation.title');

  const pageDescription = assessmentResults
    ? t('discovery:evaluation.resultsDescription')
    : t('discovery:evaluation.subtitle');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <DiscoveryHeader 
        hasAssessmentResults={!!assessmentResults}
        achievementCount={achievementCount}
      />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {assessmentResults ? (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t('discovery:evaluation.completedTitle')}
              </h2>
              <p className="text-gray-600">
                {t('discovery:evaluation.completedDescription')}
              </p>
            </div>

            <div className="space-y-6">
              {/* Tech Score */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 font-medium">
                    {t('discovery:evaluation.techInterest')}
                  </span>
                  <span className="text-gray-900 font-bold">
                    {assessmentResults.tech}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${assessmentResults.tech}%` }}
                  />
                </div>
              </div>

              {/* Creative Score */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 font-medium">
                    {t('discovery:evaluation.creativeInterest')}
                  </span>
                  <span className="text-gray-900 font-bold">
                    {assessmentResults.creative}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${assessmentResults.creative}%` }}
                  />
                </div>
              </div>

              {/* Business Score */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-700 font-medium">
                    {t('discovery:evaluation.businessInterest')}
                  </span>
                  <span className="text-gray-900 font-bold">
                    {assessmentResults.business}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${assessmentResults.business}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <button
                onClick={() => router.push('/discovery/scenarios')}
                className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                {t('discovery:evaluation.viewScenarios')}
              </button>
              
              <button
                onClick={handleRetakeAssessment}
                className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                {t('discovery:evaluation.retakeAssessment')}
              </button>
            </div>
          </div>
        ) : (
          <InterestAssessment onComplete={handleAssessmentComplete} />
        )}
      </div>

      {/* Navigation */}
      <DiscoveryNavigation />
    </div>
  );
}