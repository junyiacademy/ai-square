'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AssessmentQuiz from '../../components/assessment/AssessmentQuiz';
import AssessmentResults from '../../components/assessment/AssessmentResults';
import { AssessmentData, UserAnswer, AssessmentResult } from '../../types/assessment';

export default function AssessmentPage() {
  const { t, i18n } = useTranslation('assessment');
  const [assessmentData, setAssessmentData] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<'intro' | 'quiz' | 'results'>('intro');
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssessmentData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/assessment?lang=${i18n.language}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        const data = await response.json();
        console.log('Assessment data loaded:', data);
        setAssessmentData(data);
      } catch (error) {
        console.error('Failed to fetch assessment data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchAssessmentData();
  }, [i18n.language]);

  const handleStartAssessment = () => {
    console.log('Start assessment clicked');
    console.log('Current assessment data:', assessmentData);
    if (assessmentData) {
      setCurrentStep('quiz');
      setStartTime(new Date());
    } else {
      console.error('No assessment data available');
    }
  };

  // 當語言改變時，如果正在測驗中，重新載入並回到介紹頁
  useEffect(() => {
    if (currentStep === 'quiz') {
      setCurrentStep('intro');
      setUserAnswers([]);
      setAssessmentResult(null);
      setStartTime(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]); // Only reset when language changes, not currentStep

  const handleQuizComplete = (answers: UserAnswer[]) => {
    setUserAnswers(answers);
    
    if (assessmentData) {
      const result = calculateAssessmentResult(answers, assessmentData);
      setAssessmentResult(result);
      setCurrentStep('results');
      
      // Update user's assessment completion status
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.hasCompletedAssessment = true;
        localStorage.setItem('user', JSON.stringify(user));
      }
    }
  };

  const calculateAssessmentResult = (answers: UserAnswer[], data: AssessmentData): AssessmentResult => {
    const domainScores = {
      engaging_with_ai: 0,
      creating_with_ai: 0,
      managing_with_ai: 0,
      designing_with_ai: 0,
    };

    const domainTotals = {
      engaging_with_ai: 0,
      creating_with_ai: 0,
      managing_with_ai: 0,
      designing_with_ai: 0,
    };

    // Calculate scores by domain
    answers.forEach(answer => {
      const question = data.questions.find(q => q.id === answer.questionId);
      if (question) {
        domainTotals[question.domain]++;
        if (answer.selectedAnswer === question.correct_answer) {
          domainScores[question.domain]++;
        }
      }
    });

    // Convert to percentages
    const domainPercentages = Object.keys(domainScores).reduce((acc, domain) => {
      const domainKey = domain as keyof typeof domainScores;
      acc[domainKey] = domainTotals[domainKey] > 0 
        ? (domainScores[domainKey] / domainTotals[domainKey]) * 100 
        : 0;
      return acc;
    }, {} as typeof domainScores);

    const totalCorrect = Object.values(domainScores).reduce((sum, score) => sum + score, 0);
    const totalQuestions = answers.length;
    const overallScore = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    const endTime = new Date();
    const timeSpent = startTime ? Math.round((endTime.getTime() - startTime.getTime()) / 1000) : 0;

    return {
      overallScore: Math.round(overallScore),
      domainScores: {
        engaging_with_ai: Math.round(domainPercentages.engaging_with_ai),
        creating_with_ai: Math.round(domainPercentages.creating_with_ai),
        managing_with_ai: Math.round(domainPercentages.managing_with_ai),
        designing_with_ai: Math.round(domainPercentages.designing_with_ai),
      },
      totalQuestions,
      correctAnswers: totalCorrect,
      timeSpentSeconds: timeSpent,
      completedAt: endTime,
      level: getAssessmentLevel(overallScore),
      recommendations: generateRecommendations(domainPercentages, data)
    };
  };

  const getAssessmentLevel = (score: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' => {
    if (score >= 85) return 'expert';
    if (score >= 70) return 'advanced';
    if (score >= 55) return 'intermediate';
    return 'beginner';
  };

  const generateRecommendations = (scores: { [key: string]: number }, data: AssessmentData): string[] => {
    const recommendations: string[] = [];
    const sortedDomains = Object.entries(scores).sort(([,a], [,b]) => a - b);

    // Recommend improvement areas for lowest scoring domains
    sortedDomains.slice(0, 2).forEach(([domain]) => {
      const domainInfo = data.domains[domain as keyof typeof data.domains];
      const domainName = getTranslatedField(i18n.language, domainInfo, 'name') as string;
      const domainDescription = getTranslatedField(i18n.language, domainInfo, 'description') as string;
      
      const recommendationKey = `results.recommendations.${domain}`;
      const recommendation = t(recommendationKey, { 
        defaultValue: `${t('results.recommendations.focusOn')} ${domainName}: ${domainDescription}`
      });
      
      recommendations.push(recommendation);
    });

    return recommendations;
  };
  
  // Helper function to get translated fields
  const getTranslatedField = (lang: string, item: unknown, fieldName: string): string => {
    if (!item) return '';
    
    const obj = item as Record<string, unknown>;
    
    if (lang === 'zhTW') {
      return (obj[`${fieldName}_zhTW`] || obj[fieldName] || '') as string;
    }
    
    const langCode = lang.split('-')[0];
    if (langCode !== 'en') {
      return (obj[`${fieldName}_${langCode}`] || obj[fieldName] || '') as string;
    }
    
    return (obj[fieldName] || '') as string;
  };

  const handleRetakeAssessment = () => {
    setCurrentStep('intro');
    setUserAnswers([]);
    setAssessmentResult(null);
    setStartTime(null);
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{t('errorLoading')}</p>
          <p className="text-gray-600 mt-2">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!assessmentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{t('errorLoading')}</p>
        </div>
      </div>
    );
  }

  console.log('Current step:', currentStep);
  console.log('Assessment data questions:', assessmentData?.questions?.length);

  return (
    <main className="min-h-screen bg-gray-50">
      {currentStep === 'intro' && (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-6">
                {t('title')}
              </h1>
              <p className="text-lg text-gray-600 mb-8">
                {t('description')}
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    {t('assessmentInfo.title')}
                  </h3>
                  <ul className="text-blue-700 space-y-2 text-left">
                    <li>• {t('assessmentInfo.questions', { count: assessmentData.assessment_config.total_questions })}</li>
                    <li>• {t('assessmentInfo.timeLimit', { minutes: assessmentData.assessment_config.time_limit_minutes })}</li>
                    <li>• {t('assessmentInfo.domains', { count: 4 })}</li>
                    <li>• {t('assessmentInfo.immediate')}</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    {t('benefits.title')}
                  </h3>
                  <ul className="text-green-700 space-y-2 text-left">
                    <li>• {t('benefits.personalized')}</li>
                    <li>• {t('benefits.skillGaps')}</li>
                    <li>• {t('benefits.radarChart')}</li>
                    <li>• {t('benefits.recommendations')}</li>
                  </ul>
                </div>
              </div>
              
              <button
                onClick={handleStartAssessment}
                className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                {t('startAssessment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'quiz' && assessmentData && (
        <AssessmentQuiz
          questions={assessmentData.questions}
          domains={assessmentData.domains}
          onComplete={handleQuizComplete}
          timeLimit={assessmentData.assessment_config.time_limit_minutes}
        />
      )}

      {currentStep === 'results' && assessmentResult && (
        <AssessmentResults
          result={assessmentResult}
          domains={assessmentData.domains}
          onRetake={handleRetakeAssessment}
          questions={assessmentData.questions}
          userAnswers={userAnswers}
        />
      )}
    </main>
  );
}