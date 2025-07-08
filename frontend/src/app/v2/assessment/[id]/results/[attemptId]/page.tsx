'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Clock, 
  Target, 
  CheckCircle,
  XCircle,
  ChevronRight,
  ChevronLeft,
  Info,
  Brain,
  Award,
  Loader2,
  AlertCircle,
  BookOpen,
  TrendingUp,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  DynamicRadar as Radar,
  DynamicRadarChart as RadarChart,
  DynamicPolarGrid as PolarGrid,
  DynamicPolarAngleAxis as PolarAngleAxis,
  DynamicPolarRadiusAxis as PolarRadiusAxis,
  DynamicResponsiveContainer as ResponsiveContainer
} from '@/lib/dynamic-imports';
import { AssessmentSession } from '@/lib/v2/schemas/assessment.schema';

interface DetailedQuestion {
  id: string;
  question: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correctAnswer: string;
  userAnswer: string | null;
  isCorrect: boolean;
  explanation: string;
  domain: string;
  difficulty: string;
  timeSpent: number;
  ksa: {
    knowledge: string[];
    skills: string[];
    attitudes: string[];
  };
}

export default function AssessmentDetailedResultsPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.id as string;
  const attemptId = params.attemptId as string;
  
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [questions, setQuestions] = useState<DetailedQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'insights'>('overview');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showExplanations, setShowExplanations] = useState(true);
  
  useEffect(() => {
    loadAssessmentDetails();
  }, [attemptId]);
  
  const loadAssessmentDetails = async () => {
    try {
      setLoading(true);
      
      // Load assessment session details
      const response = await fetch(`/api/v2/assessment/session/${attemptId}`);
      if (!response.ok) {
        throw new Error('Failed to load assessment details');
      }
      
      const data = await response.json();
      setSession(data.session);
      setQuestions(data.questions || []);
    } catch (err) {
      console.error('Error loading assessment details:', err);
      setError('Failed to load assessment details');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading assessment details...</p>
        </div>
      </div>
    );
  }
  
  if (error || !session || !session.results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error || 'Assessment details not found'}</p>
          <button
            onClick={() => router.push(`/v2/assessment/${assessmentId}/results`)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }
  
  const { results } = session;
  const currentQ = questions[currentQuestion];
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'basic':
        return 'text-green-600 bg-green-100';
      case 'intermediate':
        return 'text-yellow-600 bg-yellow-100';
      case 'advanced':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };
  
  const domainNames: Record<string, string> = {
    engaging_with_ai: 'Engaging with AI',
    creating_with_ai: 'Creating with AI',
    managing_with_ai: 'Managing with AI',
    designing_with_ai: 'Designing with AI'
  };
  
  const radarData = Object.entries(results.domainScores).map(([domain, score]) => ({
    domain: domainNames[domain],
    score,
    fullMark: 100
  }));
  
  // Calculate question statistics by domain
  const domainStats = questions.reduce((acc, q) => {
    if (!acc[q.domain]) {
      acc[q.domain] = { correct: 0, total: 0 };
    }
    acc[q.domain].total++;
    if (q.isCorrect) acc[q.domain].correct++;
    return acc;
  }, {} as Record<string, { correct: number; total: number }>);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/v2/assessment/${assessmentId}/results`)}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to All Results
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Detailed Assessment Results</h1>
              <p className="text-gray-600">Completed on {formatDate(session.completedAt!)}</p>
            </div>
            {results.certificate && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Award className="w-5 h-5" />
                  <span className="font-medium">Certificate Earned!</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Verification: {results.certificate.verificationCode}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Summary Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className={`text-4xl font-bold ${
                results.overallScore >= 80 ? 'text-green-600' :
                results.overallScore >= 60 ? 'text-blue-600' :
                results.overallScore >= 40 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {results.overallScore}%
              </div>
              <div className="text-sm text-gray-500 mt-1">Overall Score</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {results.correctAnswers}/{results.totalQuestions}
              </div>
              <div className="text-sm text-gray-500 mt-1">Correct Answers</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {formatTime(results.timeSpent)}
              </div>
              <div className="text-sm text-gray-500 mt-1">Time Spent</div>
            </div>
            
            <div className="text-center">
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                results.performance === 'excellent' ? 'text-green-700 bg-green-100' :
                results.performance === 'good' ? 'text-blue-700 bg-blue-100' :
                results.performance === 'satisfactory' ? 'text-yellow-700 bg-yellow-100' :
                'text-red-700 bg-red-100'
              }`}>
                {results.performance.charAt(0).toUpperCase() + results.performance.slice(1).replace('-', ' ')}
              </div>
              <div className="text-sm text-gray-500 mt-1">Performance</div>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="border-b">
            <nav className="flex">
              {(['overview', 'questions', 'insights'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab === 'overview' && 'Performance Overview'}
                  {tab === 'questions' && 'Question Review'}
                  {tab === 'insights' && 'Learning Insights'}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Domain Performance */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Domain Performance</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Radar Chart */}
                    <div className="bg-gray-50 rounded-lg p-6">
                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="domain" tick={{ fontSize: 12 }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} />
                          <Radar
                            name="Your Score"
                            dataKey="score"
                            stroke="#4f46e5"
                            fill="#4f46e5"
                            fillOpacity={0.3}
                            strokeWidth={2}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Domain Details */}
                    <div className="space-y-3">
                      {Object.entries(results.domainScores).map(([domain, score]) => (
                        <div key={domain} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">
                              {domainNames[domain]}
                            </h4>
                            <span className="text-lg font-bold text-gray-900">{score}%</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>
                              {domainStats[domain]?.correct || 0}/{domainStats[domain]?.total || 0} correct
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              score >= 80 ? 'bg-green-100 text-green-700' :
                              score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Improvement'}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                score >= 80 ? 'bg-green-500' :
                                score >= 60 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${score}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* KSA Breakdown */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">KSA Assessment</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-6 text-center">
                      <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-blue-600">{results.ksaScores.knowledge}%</div>
                      <div className="text-sm font-medium text-blue-800">Knowledge</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-6 text-center">
                      <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-green-600">{results.ksaScores.skills}%</div>
                      <div className="text-sm font-medium text-green-800">Skills</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-6 text-center">
                      <Brain className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <div className="text-3xl font-bold text-purple-600">{results.ksaScores.attitudes}%</div>
                      <div className="text-sm font-medium text-purple-800">Attitudes</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'questions' && (
              <div className="space-y-6">
                {/* Question Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Question {currentQuestion + 1} of {questions.length}
                  </h3>
                  <button
                    onClick={() => setShowExplanations(!showExplanations)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    {showExplanations ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {showExplanations ? 'Hide' : 'Show'} Explanations
                  </button>
                </div>
                
                {/* Question Grid */}
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-6">
                  {questions.map((q, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestion(index)}
                      className={`aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                        index === currentQuestion
                          ? 'ring-2 ring-blue-500 bg-blue-50'
                          : q.isCorrect
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                
                {/* Current Question */}
                {currentQ && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          getDifficultyColor(currentQ.difficulty)
                        }`}>
                          {currentQ.difficulty}
                        </span>
                        <span className="text-sm text-gray-500">
                          Domain: {domainNames[currentQ.domain]}
                        </span>
                      </div>
                      {currentQ.isCorrect ? (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600" />
                      )}
                    </div>
                    
                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                      {currentQ.question}
                    </h4>
                    
                    {/* Options */}
                    <div className="space-y-3 mb-4">
                      {Object.entries(currentQ.options).map(([key, value]) => {
                        const isUserAnswer = currentQ.userAnswer === key;
                        const isCorrectAnswer = currentQ.correctAnswer === key;
                        
                        return (
                          <div
                            key={key}
                            className={`p-4 rounded-lg border-2 ${
                              isCorrectAnswer
                                ? 'border-green-500 bg-green-50'
                                : isUserAnswer && !isCorrectAnswer
                                ? 'border-red-500 bg-red-50'
                                : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                isCorrectAnswer
                                  ? 'bg-green-500 text-white'
                                  : isUserAnswer && !isCorrectAnswer
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {key.toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <p className="text-gray-700">{value}</p>
                                {isUserAnswer && !isCorrectAnswer && (
                                  <p className="text-xs text-red-600 mt-1">Your answer</p>
                                )}
                                {isCorrectAnswer && (
                                  <p className="text-xs text-green-600 mt-1">Correct answer</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Explanation */}
                    {showExplanations && currentQ.explanation && (
                      <div className="bg-blue-50 rounded-lg p-4 mt-4">
                        <div className="flex items-start gap-2">
                          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h5 className="font-medium text-blue-900 mb-1">Explanation</h5>
                            <p className="text-sm text-blue-800">{currentQ.explanation}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Question Stats */}
                    <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Time spent: {formatTime(currentQ.timeSpent)}
                      </span>
                      {currentQ.ksa && (
                        <span>
                          KSA: K({currentQ.ksa.knowledge.length}) 
                          S({currentQ.ksa.skills.length}) 
                          A({currentQ.ksa.attitudes.length})
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                    disabled={currentQuestion === 0}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      currentQuestion === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    {questions.filter(q => q.isCorrect).length} correct, {questions.filter(q => !q.isCorrect).length} incorrect
                  </span>
                  
                  <button
                    onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                    disabled={currentQuestion === questions.length - 1}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      currentQuestion === questions.length - 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            
            {activeTab === 'insights' && (
              <div className="space-y-6">
                {/* Strengths */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Your Strengths
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(results.domainScores)
                      .filter(([_, score]) => score >= 80)
                      .map(([domain, score]) => (
                        <div key={domain} className="bg-green-50 rounded-lg p-4">
                          <h4 className="font-medium text-green-900">
                            {domainNames[domain]} - {score}%
                          </h4>
                          <p className="text-sm text-green-700 mt-1">
                            Excellent performance! You demonstrated strong understanding in this domain.
                          </p>
                        </div>
                      ))}
                    {Object.entries(results.domainScores).filter(([_, score]) => score >= 80).length === 0 && (
                      <p className="text-gray-600 italic">Continue practicing to develop strong areas!</p>
                    )}
                  </div>
                </div>
                
                {/* Areas for Improvement */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-600" />
                    Areas for Improvement
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(results.domainScores)
                      .filter(([_, score]) => score < 60)
                      .map(([domain, score]) => (
                        <div key={domain} className="bg-orange-50 rounded-lg p-4">
                          <h4 className="font-medium text-orange-900">
                            {domainNames[domain]} - {score}%
                          </h4>
                          <p className="text-sm text-orange-700 mt-1">
                            Focus on strengthening your understanding in this area through practice and study.
                          </p>
                        </div>
                      ))}
                    {Object.entries(results.domainScores).filter(([_, score]) => score < 60).length === 0 && (
                      <p className="text-gray-600 italic">Great job! All domains show good understanding.</p>
                    )}
                  </div>
                </div>
                
                {/* Difficulty Analysis */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance by Difficulty</h3>
                  <div className="space-y-3">
                    {['basic', 'intermediate', 'advanced'].map(difficulty => {
                      const difficultyQuestions = questions.filter(q => q.difficulty === difficulty);
                      const correct = difficultyQuestions.filter(q => q.isCorrect).length;
                      const total = difficultyQuestions.length;
                      const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
                      
                      if (total === 0) return null;
                      
                      return (
                        <div key={difficulty} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 capitalize">{difficulty} Questions</h4>
                            <span className={`text-lg font-bold ${
                              percentage >= 80 ? 'text-green-600' :
                              percentage >= 60 ? 'text-blue-600' :
                              'text-orange-600'
                            }`}>
                              {percentage}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>{correct}/{total} correct</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                percentage >= 80 ? 'bg-green-500' :
                                percentage >= 60 ? 'bg-blue-500' :
                                'bg-orange-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Next Steps */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Next Steps</h3>
                  <div className="bg-blue-50 rounded-lg p-6">
                    <ul className="space-y-3">
                      {results.overallScore < 60 && (
                        <>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-blue-800">Review fundamental AI concepts before retaking the assessment</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-blue-800">Focus on domains scoring below 60% for targeted improvement</span>
                          </li>
                        </>
                      )}
                      {results.overallScore >= 60 && results.overallScore < 80 && (
                        <>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-blue-800">Practice with advanced scenarios to strengthen your skills</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-blue-800">Review explanations for incorrect answers to deepen understanding</span>
                          </li>
                        </>
                      )}
                      {results.overallScore >= 80 && (
                        <>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-blue-800">Explore specialized domain assessments for deeper expertise</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-blue-800">Consider mentoring others or contributing to AI literacy education</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push(`/v2/assessment/${assessmentId}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Retake Assessment
          </button>
          <button
            onClick={() => router.push(`/v2/assessment/${assessmentId}/results`)}
            className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 border border-gray-300 transition-colors font-medium"
          >
            View All Attempts
          </button>
        </div>
      </div>
    </div>
  );
}