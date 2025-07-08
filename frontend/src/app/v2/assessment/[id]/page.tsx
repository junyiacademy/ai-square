'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AssessmentServiceV2 } from '@/lib/v2/services/assessment-service';
import { AssessmentUIService } from '@/lib/v2/services/assessment-ui-service';
import { GCSStorageService } from '@/lib/v2/services/gcs-storage-service';
import { CompletionInterface } from '@/lib/v2/components/CompletionInterface';
import { SpecializedCompletionUI } from '@/lib/v2/components/SpecializedCompletionUI';

// Mock assessment configurations
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

export default function AssessmentPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [assessmentResults, setAssessmentResults] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [startTime] = useState(Date.now());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [autoSaveIntervalId, setAutoSaveIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Get assessment configuration
  const assessmentConfig = assessmentConfigs[assessmentId] || { 
    title: 'AI Literacy Assessment', 
    type: 'comprehensive',
    totalQuestions: 30 
  };

  useEffect(() => {
    initializeAssessment();
    
    // Cleanup on unmount
    return () => {
      if (autoSaveIntervalId) {
        clearInterval(autoSaveIntervalId);
      }
    };
  }, []);

  // Auto-save when answers change
  useEffect(() => {
    if (sessionId && Object.keys(answers).length > 0 && !assessmentComplete) {
      const debounceTimer = setTimeout(() => {
        saveProgress(sessionId);
      }, 5000); // Save 5 seconds after last change
      
      return () => clearTimeout(debounceTimer);
    }
  }, [answers, sessionId, assessmentComplete]);

  const initializeAssessment = async () => {
    try {
      setLoading(true);
      
      // Create a new assessment session
      const sessionResponse = await fetch('/api/v2/assessment/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType: assessmentConfig.type,
          assessmentId: assessmentId,
          language: 'en' // TODO: Get from user preferences
        })
      });

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json();
        console.error('Session creation error:', errorData);
        throw new Error(`Failed to create assessment session: ${errorData.error || 'Unknown error'}`);
      }

      const { sessionId: newSessionId, config } = await sessionResponse.json();
      setSessionId(newSessionId);

      // Load questions for the assessment
      const questionsResponse = await fetch(`/api/v2/assessment/questions?type=${assessmentConfig.type}&id=${assessmentId}&limit=${assessmentConfig.totalQuestions}`);
      if (!questionsResponse.ok) {
        const errorText = await questionsResponse.text();
        console.error('Questions API error:', errorText);
        throw new Error('Failed to load questions');
      }
      
      const data = await questionsResponse.json();
      console.log('Loaded questions:', data.questions?.length);
      
      // Limit questions based on assessment type
      const limitedQuestions = data.questions?.slice(0, assessmentConfig.totalQuestions) || [];
      setQuestions(limitedQuestions);
      
      // Set up auto-save interval (every 30 seconds)
      const intervalId = setInterval(() => {
        if (newSessionId && Object.keys(answers).length > 0) {
          saveProgress(newSessionId);
        }
      }, 30000);
      
      setAutoSaveIntervalId(intervalId);
    } catch (err) {
      console.error('Error initializing assessment:', err);
      setError('Failed to initialize assessment');
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (currentSessionId: string) => {
    try {
      const responses = questions.map((q, index) => ({
        questionId: q.id,
        answer: answers[q.id] || null,
        timeSpent: Math.floor(timeSpent / Math.max(index + 1, 1))
      }));

      await fetch('/api/v2/assessment/session', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          responses
        })
      });
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  };

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // Save final progress before submitting
      if (sessionId) {
        await saveProgress(sessionId);
      }
      
      // Calculate results
      const responses = questions.map(q => ({
        questionId: q.id,
        answer: answers[q.id] || null,
        timeSpent: Math.floor(timeSpent / questions.length) // Average time per question
      }));

      // Save to GCS and calculate results
      const response = await fetch('/api/v2/assessment/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          assessmentId,
          assessmentType: assessmentConfig.type,
          responses,
          totalTimeSpent: timeSpent,
          completedAt: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to submit assessment');
      
      const results = await response.json();
      setAssessmentResults(results);
      setAssessmentComplete(true);
      setLoading(false);
    } catch (err) {
      console.error('Error submitting assessment:', err);
      setError('Failed to submit assessment');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
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

  if (assessmentComplete && assessmentResults) {
    // Update the recommendedActions with proper navigation
    const enhancedResults = {
      ...assessmentResults,
      recommendedActions: [
        {
          label: 'View Detailed Results',
          action: () => router.push(`/v2/assessment/${assessmentId}/results/${assessmentResults.sessionId || sessionId}`),
          variant: 'primary' as const
        },
        {
          label: 'View All Results',
          action: () => router.push(`/v2/assessment/${assessmentId}/results`),
          variant: 'secondary' as const
        },
        {
          label: 'Retake Assessment',
          action: () => window.location.reload(),
          variant: 'secondary' as const
        }
      ]
    };
    
    return (
      <SpecializedCompletionUI
        type="assessment"
        scenarioTitle={assessmentConfig.title}
        programTitle={`${assessmentConfig.type.charAt(0).toUpperCase() + assessmentConfig.type.slice(1)} AI Knowledge Evaluation`}
        data={enhancedResults}
        onClose={() => router.push('/v2/assessment')}
      />
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No questions available for this assessment.</p>
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

  const currentQ = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Assessment UI */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{assessmentConfig.title}</h1>
            <div className="text-sm text-gray-600">
              Time: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="mb-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              currentQ.difficulty === 'basic' ? 'bg-green-100 text-green-800' :
              currentQ.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {currentQ.difficulty}
            </span>
            <span className="ml-2 text-sm text-gray-500">
              Domain: {currentQ.domain.replace(/_/g, ' ')}
            </span>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {currentQ.question}
          </h2>

          {/* Options */}
          <div className="space-y-3">
            {Object.entries(currentQ.options).map(([key, value]) => (
              <button
                key={key}
                onClick={() => handleAnswerSelect(currentQ.id, key)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  answers[currentQ.id] === key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    answers[currentQ.id] === key
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {key.toUpperCase()}
                  </div>
                  <p className="text-gray-700">{value as string}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              currentQuestion === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentQuestion
                    ? 'w-8 bg-blue-600'
                    : answers[questions[index]?.id]
                    ? 'bg-blue-300'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < questions.length}
              className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                Object.keys(answers).length < questions.length
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Submit Assessment
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}