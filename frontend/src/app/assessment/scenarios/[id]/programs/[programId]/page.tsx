'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Clock, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Question {
  id: string;
  domain: string;
  question: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  difficulty?: 'basic' | 'intermediate' | 'advanced';
}

interface Task {
  id: string;
  title: string;
  content: {
    questions: Question[];
    timeLimit?: number;
  };
  interactions: Array<{
    type: string;
    content: any;
  }>;
}

interface Program {
  id: string;
  scenarioId: string;
  status: string;
  startedAt: string;
  metadata?: {
    timeLimit?: number;
    startTime?: number;
  };
}

export default function AssessmentProgramPage({ 
  params 
}: { 
  params: { id: string; programId: string } 
}) {
  const [program, setProgram] = useState<Program | null>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();

  // Load program state
  useEffect(() => {
    loadProgramState();
  }, [params.programId]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          if (prev === 1) {
            completeAssessment();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const loadProgramState = async () => {
    try {
      const res = await fetch(`/api/assessment/programs/${params.programId}`);
      const data = await res.json();
      
      setProgram(data.program);
      setCurrentTask(data.currentTask);
      
      // Restore answers from interactions
      const savedAnswers = data.currentTask.interactions
        .filter((i: any) => i.type === 'assessment_answer')
        .reduce((acc: any, i: any) => ({
          ...acc,
          [i.content.questionId]: i.content.selectedAnswer
        }), {});
      
      setAnswers(savedAnswers);
      setCurrentQuestionIndex(Object.keys(savedAnswers).length);
      
      // Calculate remaining time
      if (data.program.metadata?.timeLimit && data.program.metadata?.startTime) {
        const elapsed = Date.now() - data.program.metadata.startTime;
        const totalTime = data.program.metadata.timeLimit * 1000; // Convert to ms
        const remaining = Math.max(0, totalTime - elapsed);
        setTimeRemaining(Math.floor(remaining / 1000));
      }
    } catch (error) {
      console.error('Failed to load program:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (questionId: string, answer: string) => {
    try {
      // Save answer locally first
      setAnswers({ ...answers, [questionId]: answer });
      
      // Submit to server
      await fetch(`/api/assessment/programs/${params.programId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: currentTask?.id,
          questionId,
          answer,
          questionIndex: currentQuestionIndex,
          timeSpent: calculateTimeSpent()
        })
      });
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  const calculateTimeSpent = () => {
    if (!program?.metadata?.startTime) return 0;
    return Math.floor((Date.now() - program.metadata.startTime) / 1000);
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < (currentTask?.content.questions.length || 0)) {
      setCurrentQuestionIndex(index);
    }
  };

  const completeAssessment = async () => {
    if (submitting) return;
    
    setSubmitting(true);
    try {
      await fetch(`/api/assessment/programs/${params.programId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: currentTask?.id
        })
      });
      
      router.push(`/assessment/scenarios/${params.id}/programs/${params.programId}/complete`);
    } catch (error) {
      console.error('Failed to complete assessment:', error);
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-3xl">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded mb-8"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const currentQuestion = currentTask?.content.questions[currentQuestionIndex];
  const totalQuestions = currentTask?.content.questions.length || 0;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </span>
          {timeRemaining !== null && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              <span className={timeRemaining < 300 ? 'text-red-600 font-semibold' : ''}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>
        <Progress 
          value={(currentQuestionIndex + 1) / totalQuestions * 100} 
          className="h-2"
        />
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <Card className="p-8 mb-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline">{currentQuestion.domain.replace(/_/g, ' ')}</Badge>
              {currentQuestion.difficulty && (
                <Badge 
                  variant="secondary"
                  className={
                    currentQuestion.difficulty === 'advanced' ? 'bg-purple-100' :
                    currentQuestion.difficulty === 'intermediate' ? 'bg-blue-100' :
                    'bg-green-100'
                  }
                >
                  {currentQuestion.difficulty}
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-semibold mb-6">
              {currentQuestion.question}
            </h2>
          </div>

          <RadioGroup 
            value={answers[currentQuestion.id] || ''} 
            onValueChange={(value) => submitAnswer(currentQuestion.id, value)}
            className="space-y-4"
          >
            {Object.entries(currentQuestion.options).map(([key, option]) => (
              <div key={key} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                <RadioGroupItem value={key} id={`option-${key}`} className="mt-0.5" />
                <Label htmlFor={`option-${key}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button 
          variant="outline" 
          onClick={() => goToQuestion(currentQuestionIndex - 1)}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>

        <div className="flex gap-2">
          {Array.from({ length: Math.min(5, totalQuestions) }, (_, i) => {
            const index = Math.max(0, Math.min(currentQuestionIndex - 2, totalQuestions - 5)) + i;
            if (index >= totalQuestions) return null;
            
            return (
              <Button
                key={index}
                variant={index === currentQuestionIndex ? "default" : "outline"}
                size="sm"
                className="w-10 h-10 p-0"
                onClick={() => goToQuestion(index)}
              >
                {index + 1}
              </Button>
            );
          }).filter(Boolean)}
        </div>

        {isLastQuestion ? (
          <Button 
            onClick={completeAssessment}
            disabled={!answers[currentQuestion?.id || ''] || submitting}
          >
            {submitting ? 'Submitting...' : 'Finish Assessment'}
          </Button>
        ) : (
          <Button 
            onClick={() => goToQuestion(currentQuestionIndex + 1)}
            disabled={!answers[currentQuestion?.id || '']}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Warning for unanswered questions */}
      {isLastQuestion && Object.keys(answers).length < totalQuestions && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-yellow-800">
              You have {totalQuestions - Object.keys(answers).length} unanswered questions
            </p>
            <p className="text-yellow-700">
              Make sure to answer all questions before finishing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}