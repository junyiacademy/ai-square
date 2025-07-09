'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Loader2, ChevronLeft, ChevronRight, Clock, CheckCircle } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  order_index: number;
  type: string;
  status: string;
  config: {
    question: {
      id: string;
      question: string;
      options: Record<string, string>;
      correctAnswer: string;
      explanation: Record<string, string>;
      domain: string;
      difficulty: string;
    };
    answerHistory: Array<{
      timestamp: string;
      action: string;
      answer?: string;
      timeSpent: number;
    }>;
  };
  metadata: {
    finalAnswer?: string;
    isCorrect?: boolean;
    score?: number;
  };
}

interface Program {
  id: string;
  name: string;
  status: string;
  config: {
    totalQuestions: number;
    passingScore: number;
    timeLimit: number;
  };
  metadata: {
    results?: {
      totalScore: number;
      percentage: number;
      passed: boolean;
    };
  };
}

export default function AssessmentProgramPage() {
  const router = useRouter();
  const params = useParams();
  const { t, i18n } = useTranslation();
  const assessmentId = params.id as string;
  const programId = params.programId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [program, setProgram] = useState<Program | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState<string>('');
  const [startTime] = useState(Date.now());
  const [timeSpent, setTimeSpent] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadProgramAndTasks();
  }, [programId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const loadProgramAndTasks = async () => {
    try {
      // Load program details
      const programResponse = await fetch(`/api/v2/assessment/programs/${programId}`);
      if (!programResponse.ok) {
        throw new Error('Failed to load program');
      }
      const programData = await programResponse.json();
      setProgram(programData.data);

      // Load tasks
      const tasksResponse = await fetch(`/api/v2/assessment/programs/${programId}/tasks`);
      if (!tasksResponse.ok) {
        throw new Error('Failed to load tasks');
      }
      const tasksData = await tasksResponse.json();
      const sortedTasks = tasksData.data.sort((a: Task, b: Task) => a.order_index - b.order_index);
      setTasks(sortedTasks);

      // Set current answer if task already has one
      if (sortedTasks.length > 0 && sortedTasks[0].metadata?.finalAnswer) {
        setCurrentAnswer(sortedTasks[0].metadata.finalAnswer);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading program:', error);
      setError('Failed to load assessment');
      setLoading(false);
    }
  };

  const handleAnswerSelect = async (answer: string) => {
    setCurrentAnswer(answer);
    
    // Record answer
    try {
      await fetch(`/api/v2/assessment/tasks/${tasks[currentTaskIndex].id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer })
      });
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  const handleNext = async () => {
    if (!currentAnswer) return;

    // Submit current answer
    await submitCurrentAnswer();

    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
      const nextTask = tasks[currentTaskIndex + 1];
      setCurrentAnswer(nextTask.metadata?.finalAnswer || '');
    }
  };

  const handlePrevious = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(prev => prev - 1);
      const prevTask = tasks[currentTaskIndex - 1];
      setCurrentAnswer(prevTask.metadata?.finalAnswer || '');
    }
  };

  const submitCurrentAnswer = async () => {
    try {
      await fetch(`/api/v2/assessment/tasks/${tasks[currentTaskIndex].id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: currentAnswer })
      });
      
      // Update local task state
      const updatedTasks = [...tasks];
      updatedTasks[currentTaskIndex] = {
        ...updatedTasks[currentTaskIndex],
        status: 'completed',
        metadata: {
          ...updatedTasks[currentTaskIndex].metadata,
          finalAnswer: currentAnswer
        }
      };
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!currentAnswer) return;
    
    setIsSubmitting(true);
    
    try {
      // Submit final answer
      await submitCurrentAnswer();
      
      // Complete the program
      const completeResponse = await fetch(`/api/v2/assessment/programs/${programId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!completeResponse.ok) {
        throw new Error('Failed to complete assessment');
      }
      
      const { data } = await completeResponse.json();
      
      // Redirect to results page
      router.push(`/v2/assessment/${assessmentId}/programs/${programId}/results`);
      
    } catch (error) {
      console.error('Error completing assessment:', error);
      setError('Failed to submit assessment');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !program || tasks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'No tasks found'}</p>
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

  const currentTask = tasks[currentTaskIndex];
  const question = currentTask.config.question;
  const progress = ((currentTaskIndex + 1) / tasks.length) * 100;
  const answeredCount = tasks.filter(t => t.metadata?.finalAnswer).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{program.name}</h1>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
              </span>
              <span>Question {currentTaskIndex + 1} of {tasks.length}</span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                {answeredCount} answered
              </span>
            </div>
          </div>
          
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {question.question}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="px-2 py-1 bg-gray-100 rounded">
                {question.domain.replace(/_/g, ' ')}
              </span>
              <span className="px-2 py-1 bg-gray-100 rounded">
                {question.difficulty}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(question.options).map(([key, value]) => (
              <label
                key={key}
                className={`block p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  currentAnswer === key
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="answer"
                  value={key}
                  checked={currentAnswer === key}
                  onChange={() => handleAnswerSelect(key)}
                  className="sr-only"
                />
                <div className="flex items-center">
                  <span className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                    {key.toUpperCase()}
                  </span>
                  <span className="ml-3 text-gray-700">{value}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentTaskIndex === 0}
            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
              currentTaskIndex === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="text-sm text-gray-600">
            {tasks.filter(t => t.metadata?.finalAnswer).length} of {tasks.length} answered
          </div>

          {currentTaskIndex === tasks.length - 1 ? (
            <button
              onClick={handleSubmitAssessment}
              disabled={!currentAnswer || isSubmitting}
              className={`px-6 py-2 rounded-lg font-medium ${
                !currentAnswer || isSubmitting
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Assessment'
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!currentAnswer}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                !currentAnswer
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}