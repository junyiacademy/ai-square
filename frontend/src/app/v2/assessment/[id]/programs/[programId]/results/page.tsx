'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { 
  Trophy, 
  XCircle, 
  Clock, 
  Target, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  BarChart3
} from 'lucide-react';

interface ResultsData {
  program: {
    id: string;
    name: string;
    status: string;
    metadata: {
      results: {
        totalScore: number;
        maxScore: number;
        percentage: number;
        passed: boolean;
        timeSpent: number;
        correctCount: number;
        totalCount: number;
        byDomain: Record<string, {
          correct: number;
          total: number;
          percentage: number;
        }>;
      };
    };
  };
}

export default function AssessmentResultsPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const assessmentId = params.id as string;
  const programId = params.programId as string;

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<ResultsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, [programId]);

  const loadResults = async () => {
    try {
      const response = await fetch(`/api/v2/assessment/programs/${programId}`);
      if (!response.ok) {
        throw new Error('Failed to load results');
      }
      const data = await response.json();
      
      if (!data.data.metadata?.results) {
        throw new Error('Results not available yet');
      }
      
      setResults({ program: data.data });
      setLoading(false);
    } catch (error) {
      console.error('Error loading results:', error);
      setError('Failed to load results');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Results not found'}</p>
          <button
            onClick={() => router.push(`/v2/assessment/${assessmentId}`)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Assessment
          </button>
        </div>
      </div>
    );
  }

  const { results: res } = results.program.metadata;
  const minutes = Math.floor(res.timeSpent / 60);
  const seconds = res.timeSpent % 60;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
            res.passed ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {res.passed ? (
              <Trophy className="w-10 h-10 text-green-600" />
            ) : (
              <XCircle className="w-10 h-10 text-red-600" />
            )}
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {res.passed ? 'Congratulations!' : 'Assessment Complete'}
          </h1>
          
          <p className="text-xl text-gray-600">
            {res.passed 
              ? 'You passed the assessment!'
              : 'Keep practicing to improve your score.'}
          </p>
        </div>

        {/* Score Card */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <div className="text-center mb-6">
            <div className="text-5xl font-bold text-gray-900 mb-2">
              {res.percentage}%
            </div>
            <p className="text-gray-600">
              {res.correctCount} out of {res.totalCount} questions correct
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-6 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-5 h-5 text-gray-500" />
              </div>
              <p className="text-sm text-gray-500">Time Spent</p>
              <p className="font-semibold">{minutes}:{seconds.toString().padStart(2, '0')}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Target className="w-5 h-5 text-gray-500" />
              </div>
              <p className="text-sm text-gray-500">Score</p>
              <p className="font-semibold">{res.totalScore}/{res.maxScore}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {res.passed ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              <p className="text-sm text-gray-500">Status</p>
              <p className={`font-semibold ${res.passed ? 'text-green-600' : 'text-red-600'}`}>
                {res.passed ? 'Passed' : 'Not Passed'}
              </p>
            </div>
          </div>
        </div>

        {/* Domain Breakdown */}
        {Object.keys(res.byDomain).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance by Domain</h2>
            <div className="space-y-3">
              {Object.entries(res.byDomain).map(([domain, stats]) => (
                <div key={domain}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {domain.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm text-gray-600">
                      {stats.correct}/{stats.total} ({stats.percentage}%)
                    </span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        stats.percentage >= 70 ? 'bg-green-500' : 
                        stats.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${stats.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push(`/v2/assessment/${assessmentId}`)}
            className="flex-1 px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Assessment
          </button>
          
          <button
            onClick={() => router.push(`/v2/assessment/${assessmentId}/start`)}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Retake Assessment
          </button>
        </div>

        {/* Recommendations */}
        {!res.passed && (
          <div className="mt-6 bg-yellow-50 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-yellow-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Recommendations
            </h3>
            <ul className="space-y-2 text-sm text-yellow-800">
              <li>• Review the domains where you scored below 70%</li>
              <li>• Take practice quizzes to improve your understanding</li>
              <li>• Read the explanations for questions you got wrong</li>
              <li>• Retake the assessment when you feel ready</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}