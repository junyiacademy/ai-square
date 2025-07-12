'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { ChartBarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
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
import type { AssessmentResults, AssessmentSession } from '@/lib/types/user-data';
import DiscoveryHeader from '@/components/discovery/DiscoveryHeader';

export default function EvaluationPage() {
  const { t } = useTranslation(['discovery', 'navigation']);
  const router = useRouter();
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResults | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [achievementCount, setAchievementCount] = useState(0);
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<string, string[]>>({});
  const [workspaceCount, setWorkspaceCount] = useState(0);

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
        setWorkspaceCount(userData?.workspaceSessions?.length || 0);
        
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Discovery Header with Navigation */}
      <DiscoveryHeader 
        hasAssessmentResults={!!assessmentResults}
        achievementCount={achievementCount}
        workspaceCount={workspaceCount}
      />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {assessmentResults ? (
          <div className="py-4">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="w-6 h-6" />
                  <div>
                    <h2 className="text-xl font-bold">評估完成！</h2>
                    <p className="text-purple-100 text-sm">以下是你的興趣評估結果與答題紀錄</p>
                  </div>
                </div>
              </div>
              
              {/* Results Summary */}
              <div className="p-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">你的傾向分析</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded bg-blue-50">
                    <div className="text-lg font-bold text-blue-600">{assessmentResults.tech}%</div>
                    <div className="text-xs text-gray-600">科技</div>
                  </div>
                  <div className="text-center p-2 rounded bg-purple-50">
                    <div className="text-lg font-bold text-purple-600">{assessmentResults.creative}%</div>
                    <div className="text-xs text-gray-600">創意</div>
                  </div>
                  <div className="text-center p-2 rounded bg-green-50">
                    <div className="text-lg font-bold text-green-600">{assessmentResults.business}%</div>
                    <div className="text-xs text-gray-600">商業</div>
                  </div>
                </div>
              </div>
              
              {/* Questions and Answers */}
              {Object.keys(assessmentAnswers).length > 0 && (
                <div className="p-4 border-b border-gray-200 max-h-64 overflow-y-auto">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">你的答題紀錄</h3>
                  <div className="space-y-3">
                    {(t('interestAssessment.questions', { returnObjects: true }) as any[]).map((question: any, index: number) => {
                      const selectedOptions = assessmentAnswers[question.id] || [];
                      if (selectedOptions.length === 0) return null;
                      
                      return (
                        <div key={question.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-purple-600 text-white rounded-full text-xs flex items-center justify-center font-medium">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm mb-1">{question.text}</p>
                              <div className="space-y-0.5">
                                {selectedOptions.map(optionId => {
                                  const option = question.options.find((opt: any) => opt.id === optionId);
                                  return option ? (
                                    <div key={optionId} className="flex items-center space-x-1">
                                      <CheckCircleIcon className="w-3 h-3 text-green-500 flex-shrink-0" />
                                      <span className="text-xs text-gray-700">{option.text}</span>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="p-3 bg-gray-50">
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => window.location.href = '/discovery/scenarios'}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200 text-sm font-medium"
                  >
                    查看冒險副本
                  </button>
                  <button
                    onClick={handleRetakeAssessment}
                    className="bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-300 text-sm font-medium"
                  >
                    重新評估
                  </button>
                </div>
              </div>
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