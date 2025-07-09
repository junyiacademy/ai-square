'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { 
  Brain, 
  Clock, 
  BookOpen, 
  Award, 
  Target, 
  ChevronRight, 
  CheckCircle2,
  Circle,
  BarChart3,
  Sparkles
} from 'lucide-react';

interface AssessmentDetails {
  id: string;
  title: string;
  description: string;
  duration: number;
  questionCount: number;
  passingScore: number;
  domains: Array<{
    id: string;
    name: string;
    description: string;
    questionCount: number;
  }>;
}

interface CompletionRecord {
  id: string;
  completedAt: string;
  score: number;
  passed: boolean;
  timeSpent: number;
}

export default function AssessmentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { i18n, t } = useTranslation();
  const assessmentId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [assessmentDetails, setAssessmentDetails] = useState<AssessmentDetails | null>(null);
  const [completionHistory, setCompletionHistory] = useState<CompletionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssessmentDetails();
    loadCompletionHistory();
  }, [assessmentId, i18n.language]);

  const loadAssessmentDetails = async () => {
    try {
      const response = await fetch(`/api/v2/assessment/list?lang=${i18n.language}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const assessment = data.data.find((a: any) => a.id === assessmentId);
          if (assessment) {
            setAssessmentDetails(assessment);
          } else {
            setError('Assessment not found');
          }
        }
      }
    } catch (error) {
      console.error('Error loading assessment details:', error);
      setError('Failed to load assessment details');
    } finally {
      setLoading(false);
    }
  };

  const loadCompletionHistory = async () => {
    try {
      // Get user email from auth
      const authCheck = await fetch('/api/auth/check');
      if (!authCheck.ok) {
        console.log('User not authenticated');
        return;
      }
      
      const authData = await authCheck.json();
      if (!authData.authenticated || !authData.user?.email) {
        console.log('No user email found');
        return;
      }

      // Load user's assessment history
      const historyResponse = await fetch(`/api/v2/assessment/history?assessmentId=${assessmentId}`);
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        if (historyData.success && historyData.data) {
          // Transform the data to match our CompletionRecord interface
          const completions = historyData.data.map((session: any) => ({
            id: session.id,
            completedAt: session.completedAt || session.updatedAt,
            score: session.results?.overallScore || 0,
            passed: session.results?.passed || false,
            timeSpent: session.timeSpent || 0
          }));
          setCompletionHistory(completions);
        }
      }
    } catch (error) {
      console.error('Error loading completion history:', error);
    }
  };

  const handleStartNewAssessment = () => {
    router.push(`/v2/assessment/${assessmentId}/start`);
  };

  const handleViewResults = (completionId: string) => {
    router.push(`/v2/assessment/${assessmentId}/results/${completionId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !assessmentDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Assessment not found'}</p>
          <button
            onClick={() => router.push('/v2/assessment')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Assessments
          </button>
        </div>
      </div>
    );
  }

  const bestScore = completionHistory.length > 0 
    ? Math.max(...completionHistory.map(c => c.score))
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Brain className="w-8 h-8 text-purple-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{assessmentDetails.title}</h1>
              <p className="text-gray-600">{assessmentDetails.description}</p>
              
              <div className="flex items-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span>{assessmentDetails.duration} minutes</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <BookOpen className="w-4 h-4" />
                  <span>{assessmentDetails.questionCount} questions</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Target className="w-4 h-4" />
                  <span>Pass: {assessmentDetails.passingScore}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Details and Domains */}
          <div className="lg:col-span-2 space-y-6">
            {/* Assessment Domains */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Topics Covered</h2>
              <div className="space-y-3">
                {assessmentDetails.domains.map((domain) => (
                  <div key={domain.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{domain.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{domain.description}</p>
                      </div>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {domain.questionCount} questions
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* What to Expect */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">What to Expect</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Adaptive Questions</h3>
                    <p className="text-sm text-gray-600">Questions are tailored to assess your understanding across different difficulty levels</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Instant Feedback</h3>
                    <p className="text-sm text-gray-600">Get detailed explanations and insights after completing the assessment</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Certificate of Completion</h3>
                    <p className="text-sm text-gray-600">Earn a certificate when you achieve the passing score</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Progress and Actions */}
          <div className="space-y-6">
            {/* Your Progress */}
            {completionHistory.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Progress</h2>
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="text-3xl font-bold text-purple-600">{bestScore}%</div>
                    <p className="text-sm text-gray-600 mt-1">Best Score</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Attempts</span>
                      <span className="font-medium">{completionHistory.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Status</span>
                      <span className="font-medium text-green-600">Passed</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Recent Attempts</h3>
                    <div className="space-y-2">
                      {completionHistory.slice(0, 3).map((completion) => (
                        <button
                          key={completion.id}
                          onClick={() => handleViewResults(completion.id)}
                          className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {completion.passed ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                              ) : (
                                <Circle className="w-4 h-4 text-gray-400" />
                              )}
                              <span className="text-sm font-medium">{completion.score}%</span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(completion.completedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <button
                onClick={handleStartNewAssessment}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                {completionHistory.length > 0 ? 'Retake Assessment' : 'Start Assessment'}
                <ChevronRight className="w-5 h-5" />
              </button>
              
              {completionHistory.length > 0 && (
                <button
                  onClick={() => router.push(`/v2/assessment/${assessmentId}/results`)}
                  className="w-full mt-3 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  View All Results
                </button>
              )}
            </div>

            {/* Tips */}
            <div className="bg-blue-50 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Tips for Success</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Read each question carefully before answering</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>You can review and change answers before submitting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Take your time - focus on accuracy over speed</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}