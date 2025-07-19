'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AssessmentResult, AssessmentDomain, RadarChartData, AssessmentQuestion, UserAnswer } from '../../types/assessment';
import { DynamicDomainRadarChart } from '@/lib/dynamic-imports';
import CompetencyKnowledgeGraph from './CompetencyKnowledgeGraph';
import { contentService } from '@/services/content-service';
import { formatDateWithLocale } from '@/utils/locale';

interface AssessmentResultsProps {
  result: AssessmentResult;
  domains: {
    engaging_with_ai: AssessmentDomain;
    creating_with_ai: AssessmentDomain;
    managing_with_ai: AssessmentDomain;
    designing_with_ai: AssessmentDomain;
  };
  onRetake: () => void;
  questions?: AssessmentQuestion[]; // 用於 KSA 分析
  userAnswers?: UserAnswer[]; // 用於詳細分析
  isReview?: boolean; // 是否為歷史記錄查看模式
}

interface KSAAnalysis {
  knowledge: { code: string; count: number; competencies: string[] }[];
  skills: { code: string; count: number; competencies: string[] }[];
  attitudes: { code: string; count: number; competencies: string[] }[];
}

export default function AssessmentResults({ result, domains, onRetake, questions = [], userAnswers = [], isReview = false }: AssessmentResultsProps) {
  const { t, i18n } = useTranslation('assessment');
  const [activeTab, setActiveTab] = useState<'overview' | 'recommendations' | 'ksa' | 'knowledge-graph'>('overview');
  const [domainsData, setDomainsData] = useState<unknown[] | null>(null);
  const [ksaMaps, setKsaMaps] = useState<{
    kMap: Record<string, { summary: string; theme: string; explanation?: string }>;
    sMap: Record<string, { summary: string; theme: string; explanation?: string }>;
    aMap: Record<string, { summary: string; theme: string; explanation?: string }>;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);

  // Fetch domain and KSA data for knowledge graph
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await contentService.getRelationsTree(i18n.language);
        setDomainsData(data.domains);
        setKsaMaps({
          kMap: data.kMap as Record<string, { summary: string; theme: string; explanation?: string }>,
          sMap: data.sMap as Record<string, { summary: string; theme: string; explanation?: string }>,
          aMap: data.aMap as Record<string, { summary: string; theme: string; explanation?: string }>
        });
      } catch (error) {
        console.error('Failed to fetch domains data:', error);
      }
    };
    fetchData();
  }, [i18n.language]);

  // Check for logged in user
  useEffect(() => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userData = localStorage.getItem('user');
    
    if (isLoggedIn === 'true' && userData) {
      const user = JSON.parse(userData);
      // Use user ID instead of email
      setCurrentUser({
        id: String(user.id),
        email: user.email
      });
    }
    // If not logged in, don't set any user
  }, []);

  const getDomainName = useCallback((domainKey: string) => {
    // 使用 i18n 系統來獲取領域名稱翻譯
    return t(`domains.${domainKey}`);
  }, [t]);

  const radarData: RadarChartData[] = Object.entries(result.domainScores).map(([domain, score]) => ({
    domain: getDomainName(domain),
    score,
    fullMark: 100
  }));

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'expert': return 'text-green-700 bg-green-100';
      case 'advanced': return 'text-blue-700 bg-blue-100';
      case 'intermediate': return 'text-yellow-700 bg-yellow-100';
      case 'beginner': return 'text-gray-700 bg-gray-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 55) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Analyze KSA codes from answered questions
  const analyzeKSA = useCallback((): KSAAnalysis => {
    const ksaMap: { [key: string]: { type: 'knowledge' | 'skills' | 'attitudes'; competencies: Set<string> } } = {};

    // Process each answered question
    userAnswers.forEach((answer) => {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question || !answer.isCorrect) return; // Only count correct answers

      // Get the question's KSA mapping
      const { knowledge = [], skills = [], attitudes = [] } = question.ksa_mapping || {};

      // Process knowledge codes
      knowledge.forEach((code: string) => {
        if (!ksaMap[code]) {
          ksaMap[code] = { type: 'knowledge', competencies: new Set() };
        }
        ksaMap[code].competencies.add(question.id);
      });

      // Process skills codes
      skills.forEach((code: string) => {
        if (!ksaMap[code]) {
          ksaMap[code] = { type: 'skills', competencies: new Set() };
        }
        ksaMap[code].competencies.add(question.id);
      });

      // Process attitudes codes
      attitudes.forEach((code: string) => {
        if (!ksaMap[code]) {
          ksaMap[code] = { type: 'attitudes', competencies: new Set() };
        }
        ksaMap[code].competencies.add(question.id);
      });
    });

    // Convert to analysis format
    const analysis: KSAAnalysis = {
      knowledge: [],
      skills: [],
      attitudes: []
    };

    Object.entries(ksaMap).forEach(([code, data]) => {
      const item = {
        code,
        count: data.competencies.size,
        competencies: Array.from(data.competencies)
      };

      if (data.type === 'knowledge') {
        analysis.knowledge.push(item);
      } else if (data.type === 'skills') {
        analysis.skills.push(item);
      } else if (data.type === 'attitudes') {
        analysis.attitudes.push(item);
      }
    });

    // Sort by count (descending)
    analysis.knowledge.sort((a, b) => b.count - a.count);
    analysis.skills.sort((a, b) => b.count - a.count);
    analysis.attitudes.sort((a, b) => b.count - a.count);

    return analysis;
  }, [questions, userAnswers]);

  const handleSaveResults = useCallback(async () => {
    console.log('=== Save button clicked ===');
    console.log('Current user:', currentUser);
    console.log('Is saved:', isSaved);
    
    if (!currentUser || isSaved) return;
    
    setIsSaving(true);
    setSaveMessage(null);
    
    const requestBody = {
      userId: currentUser.id,
      userEmail: currentUser.email,
      language: i18n.language,
      answers: userAnswers,
      questions: questions, // Include questions for KSA mapping
      result: {
        ...result,
        timeSpentSeconds: result.timeSpentSeconds,
      },
    };
    
    console.log('Sending request to API with body:', requestBody);
    
    try {
      const response = await fetch('/api/assessment/results', {
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
        
        // Also update progress in GCS
        if (currentUser.email) {
          try {
            await fetch('/api/users/update-progress', {
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
  }, [currentUser, isSaved, userAnswers, questions, result, i18n.language, t]);

  // Auto-save when component mounts (assessment completed)
  useEffect(() => {
    // Only auto-save if user is logged in and result hasn't been saved yet
    // Don't auto-save in review mode
    if (currentUser && !isSaved && result && !isReview) {
      console.log('Auto-saving assessment result...');
      handleSaveResults();
    }
  }, [currentUser, isSaved, result, isReview, handleSaveResults]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t('results.title')}
          </h1>
          <p className="text-lg text-gray-600">
            {t('results.subtitle')}
          </p>
        </div>

        {/* Overall Score Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center">
            <div className="mb-6">
              <div className={`text-6xl font-bold mb-2 ${getScoreColor(result.overallScore)}`}>
                {result.overallScore}%
              </div>
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-medium ${getLevelColor(result.level)}`}>
                {t(`level.${result.level}`)}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {result.correctAnswers}/{result.totalQuestions}
                </div>
                <div className="text-sm text-gray-600">
                  {t('results.correctAnswers')}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {formatTime(result.timeSpentSeconds)}
                </div>
                <div className="text-sm text-gray-600">
                  {t('results.timeSpent')}
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {formatDateWithLocale(new Date(result.completedAt), i18n.language)}
                </div>
                <div className="text-sm text-gray-600">
                  {t('results.completedAt')}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              {['overview', 'recommendations', 'knowledge-graph'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t(`results.tabs.${tab}`)}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t('results.skillRadar')}
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <DynamicDomainRadarChart data={radarData} />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t('results.summary')}
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800">
                      {t('results.summaryText', { 
                        level: t(`level.${result.level}`),
                        score: result.overallScore,
                        correct: result.correctAnswers,
                        total: result.totalQuestions
                      })}
                    </p>
                  </div>
                </div>

                {/* Domain Breakdown - merged from domains tab */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t('results.domainBreakdown')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(result.domainScores).map(([domainKey, score]) => {
                      const domain = domains[domainKey as keyof typeof domains];
                      return (
                        <div key={domainKey} className="border border-gray-200 rounded-lg p-6">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-semibold text-gray-900">
                              {getDomainName(domainKey)}
                            </h4>
                            <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                              {score}%
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-4">
                            {domain.description}
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${score}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}


            {/* Recommendations Tab */}
            {activeTab === 'recommendations' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('results.personalizedRecommendations')}
                </h3>
                <div className="space-y-4">
                  {result.recommendations.map((recommendation, index) => (
                    <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-800">{recommendation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">
                    {t('results.nextSteps')}
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• {t('results.nextStep1')}</li>
                    <li>• {t('results.nextStep2')}</li>
                    <li>• {t('results.nextStep3')}</li>
                  </ul>
                </div>
              </div>
            )}


            {/* Knowledge Graph Tab */}
            {activeTab === 'knowledge-graph' && (
              <div className="space-y-6">
                <CompetencyKnowledgeGraph
                  result={result}
                  questions={questions}
                  userAnswers={userAnswers}
                  domainsData={domainsData}
                  ksaMaps={ksaMaps}
                />
              </div>
            )}
          </div>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            saveMessage.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {saveMessage.type === 'success' ? (
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{saveMessage.text}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          <div className="flex justify-center gap-4 flex-wrap">
            {/* Only show save button for non-logged in users or if auto-save failed */}
            {/* Hide save button in review mode */}
            {!isReview && (!currentUser || !isSaved) && (
              <button
                onClick={handleSaveResults}
                disabled={isSaving || isSaved}
                className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                  isSaved
                    ? 'bg-green-600 text-white cursor-not-allowed'
                    : isSaving
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isSaving ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('results.saving')}
                  </span>
                ) : isSaved ? (
                  <span className="flex items-center">
                    <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {t('results.saved')}
                  </span>
                ) : (
                  t('results.saveResults')
                )}
              </button>
            )}
            {/* View Learning Path button - only show if user is logged in and assessment is saved */}
            {currentUser && isSaved && (
              <button
                onClick={() => {
                  // Save assessment result to localStorage for learning path page
                  localStorage.setItem('assessmentResult', JSON.stringify(result));
                  // Navigate to learning path
                  window.location.href = '/learning-path';
                }}
                className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center"
              >
                {t('results.viewLearningPath')}
                <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
            <button
              onClick={onRetake}
              className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              {t('results.retakeAssessment')}
            </button>
            <button
              onClick={() => window.print()}
              className="bg-gray-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              {t('results.downloadReport')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}