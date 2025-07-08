'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Clock, 
  Target, 
  TrendingUp, 
  Calendar,
  ChevronRight,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  Brain,
  Loader2
} from 'lucide-react';
import { AssessmentStorageService } from '@/lib/v2/services/assessment-storage.service';
import { AssessmentSession } from '@/lib/v2/schemas/assessment.schema';

interface AssessmentAttempt {
  id: string;
  completedAt: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number;
  passed: boolean;
  performance: 'excellent' | 'good' | 'satisfactory' | 'needs-improvement';
  domainScores: Record<string, number>;
  ksaScores: {
    knowledge: number;
    skills: number;
    attitudes: number;
  };
}

// Mock assessment configurations (same as in the assessment page)
const assessmentConfigs: Record<string, {
  title: string;
  type: string;
  totalQuestions: number;
}> = {
  'quick-literacy': { title: 'Quick AI Literacy Check', type: 'quick', totalQuestions: 10 },
  'comprehensive': { title: 'Comprehensive AI Literacy Assessment', type: 'comprehensive', totalQuestions: 30 },
  'engaging-domain': { title: 'Engaging with AI - Domain Assessment', type: 'domain', totalQuestions: 15 },
  'creating-domain': { title: 'Creating with AI - Domain Assessment', type: 'domain', totalQuestions: 18 },
  'managing-domain': { title: 'Managing with AI - Domain Assessment', type: 'domain', totalQuestions: 15 },
  'adaptive-personalized': { title: 'Adaptive AI Literacy Assessment', type: 'adaptive', totalQuestions: 20 }
};

export default function AssessmentResultsPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const assessmentConfig = assessmentConfigs[assessmentId] || { 
    title: 'AI Literacy Assessment', 
    type: 'comprehensive',
    totalQuestions: 30 
  };
  
  useEffect(() => {
    loadAssessmentHistory();
  }, [assessmentId]);
  
  const loadAssessmentHistory = async () => {
    try {
      setLoading(true);
      
      // Get assessment history for the user
      const response = await fetch(`/api/v2/assessment/history?assessmentId=${assessmentId}`);
      if (!response.ok) {
        throw new Error('Failed to load assessment history');
      }
      
      const data = await response.json();
      setAttempts(data.attempts || []);
    } catch (err) {
      console.error('Error loading assessment history:', err);
      setError('Failed to load assessment history');
    } finally {
      setLoading(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };
  
  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'excellent':
        return 'text-green-700 bg-green-100';
      case 'good':
        return 'text-blue-700 bg-blue-100';
      case 'satisfactory':
        return 'text-yellow-700 bg-yellow-100';
      case 'needs-improvement':
        return 'text-red-700 bg-red-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const calculateAverageScore = () => {
    if (attempts.length === 0) return 0;
    const total = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
    return Math.round(total / attempts.length);
  };
  
  const getBestScore = () => {
    if (attempts.length === 0) return 0;
    return Math.max(...attempts.map(a => a.score));
  };
  
  const getImprovementTrend = () => {
    if (attempts.length < 2) return 0;
    const recent = attempts.slice(0, 3);
    const older = attempts.slice(-3);
    const recentAvg = recent.reduce((sum, a) => sum + a.score, 0) / recent.length;
    const olderAvg = older.reduce((sum, a) => sum + a.score, 0) / older.length;
    return recentAvg - olderAvg;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading assessment history...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
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
  
  const trend = getImprovementTrend();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/v2/assessment')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
          >
            ← Back to Assessments
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{assessmentConfig.title}</h1>
          <p className="text-gray-600">View your assessment history and track your progress</p>
        </div>
        
        {attempts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Attempts Yet</h2>
            <p className="text-gray-600 mb-6">You haven't taken this assessment yet. Start now to track your AI literacy progress!</p>
            <button
              onClick={() => router.push(`/v2/assessment/${assessmentId}`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Take Assessment
            </button>
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Total Attempts</h3>
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{attempts.length}</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Average Score</h3>
                  <Target className="w-5 h-5 text-gray-400" />
                </div>
                <p className={`text-2xl font-bold ${getScoreColor(calculateAverageScore())}`}>
                  {calculateAverageScore()}%
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Best Score</h3>
                  <Award className="w-5 h-5 text-gray-400" />
                </div>
                <p className={`text-2xl font-bold ${getScoreColor(getBestScore())}`}>
                  {getBestScore()}%
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Progress Trend</h3>
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-bold ${
                    trend > 5 ? 'text-green-600' : 
                    trend < -5 ? 'text-red-600' : 
                    'text-gray-600'
                  }`}>
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
                  </p>
                  {trend > 5 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : trend < -5 ? (
                    <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
                  ) : (
                    <span className="text-xs text-gray-500">Stable</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Attempts List */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Assessment History</h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {attempts.map((attempt, index) => (
                  <div
                    key={attempt.id}
                    className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/v2/assessment/${assessmentId}/results/${attempt.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            Attempt #{attempts.length - index}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            getPerformanceColor(attempt.performance)
                          }`}>
                            {attempt.performance.charAt(0).toUpperCase() + attempt.performance.slice(1).replace('-', ' ')}
                          </span>
                          {attempt.passed ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(attempt.completedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatTime(attempt.timeSpent)}
                          </span>
                          <span>
                            {attempt.correctAnswers}/{attempt.totalQuestions} correct
                          </span>
                        </div>
                        
                        {/* Domain Scores Preview */}
                        <div className="mt-3 flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Domains:</span>
                            {Object.entries(attempt.domainScores).slice(0, 2).map(([domain, score]) => (
                              <span
                                key={domain}
                                className={`text-xs px-2 py-1 rounded ${
                                  score >= 80 ? 'bg-green-100 text-green-700' :
                                  score >= 60 ? 'bg-blue-100 text-blue-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {domain.split('_')[0]}: {score}%
                              </span>
                            ))}
                            {Object.keys(attempt.domainScores).length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{Object.keys(attempt.domainScores).length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`text-3xl font-bold ${getScoreColor(attempt.score)}`}>
                            {attempt.score}%
                          </p>
                          <p className="text-sm text-gray-500">Overall Score</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Actions */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => router.push(`/v2/assessment/${assessmentId}`)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                Take Assessment Again
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}