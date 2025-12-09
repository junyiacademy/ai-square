'use client';

import { useState, useEffect, useCallback } from 'react';
import { AssessmentQuestion, AssessmentDomain, UserAnswer } from '../../types/assessment';
import { QuizHeader } from './quiz/QuizHeader';
import { QuizQuestion } from './quiz/QuizQuestion';
import { QuizExplanation } from './quiz/QuizExplanation';
import { useQuizTimer } from './quiz/useQuizTimer';
import { useTranslation } from 'react-i18next';

interface AssessmentQuizProps {
  questions: AssessmentQuestion[];
  domains: {
    engaging_with_ai: AssessmentDomain;
    creating_with_ai: AssessmentDomain;
    managing_with_ai: AssessmentDomain;
    designing_with_ai: AssessmentDomain;
  };
  onComplete: (answers: UserAnswer[]) => void;
  timeLimit: number;
  initialAnswers?: UserAnswer[];
}

export default function AssessmentQuiz({
  questions,
  onComplete,
  timeLimit,
  initialAnswers = []
}: AssessmentQuizProps) {
  const { t } = useTranslation('assessment');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialAnswers.length || 0);
  const [answers, setAnswers] = useState<UserAnswer[]>(initialAnswers);
  const [selectedAnswer, setSelectedAnswer] = useState<'a' | 'b' | 'c' | 'd' | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date());
  const [showExplanation, setShowExplanation] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [prevQuestionIds, setPrevQuestionIds] = useState<string>('');

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  const handleComplete = useCallback(() => {
    if (selectedAnswer) {
      const timeSpent = Math.round((new Date().getTime() - questionStartTime.getTime()) / 1000);
      const userAnswer: UserAnswer = {
        questionId: currentQuestion.id,
        selectedAnswer,
        timeSpent,
        isCorrect: selectedAnswer === currentQuestion.correct_answer
      };
      onComplete([...answers, userAnswer]);
    } else {
      onComplete(answers);
    }
  }, [selectedAnswer, questionStartTime, currentQuestion, answers, onComplete]);

  const { timeLeft, setTimeLeft } = useQuizTimer({ timeLimit, onTimeUp: handleComplete });

  useEffect(() => {
    const currentQuestionIds = questions.map(q => q.id).join(',');
    if (prevQuestionIds && prevQuestionIds !== currentQuestionIds) {
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setHasAnswered(false);
      setQuestionStartTime(new Date());
      setTimeLeft(timeLimit * 60);
    }
    setPrevQuestionIds(currentQuestionIds);
  }, [questions, prevQuestionIds, timeLimit, setTimeLeft]);

  useEffect(() => {
    if (!currentQuestion) return;
    const existingAnswer = answers.find(a => a.questionId === currentQuestion.id);
    if (existingAnswer) {
      setSelectedAnswer(existingAnswer.selectedAnswer);
      setHasAnswered(true);
      setShowExplanation(true);
    } else {
      setSelectedAnswer(null);
      setHasAnswered(false);
      setShowExplanation(false);
    }
  }, [currentQuestionIndex, currentQuestion, answers]);

  useEffect(() => {
    setQuestionStartTime(new Date());
  }, [currentQuestionIndex]);

  const handleAnswerSelect = (answer: 'a' | 'b' | 'c' | 'd') => {
    setSelectedAnswer(answer);
  };

  const handleAnswerSubmit = () => {
    if (selectedAnswer && !hasAnswered) {
      setHasAnswered(true);
      setShowExplanation(true);
    }
  };

  const handleNext = () => {
    if (selectedAnswer) {
      const timeSpent = Math.round((new Date().getTime() - questionStartTime.getTime()) / 1000);
      const userAnswer: UserAnswer = {
        questionId: currentQuestion.id,
        selectedAnswer,
        timeSpent,
        isCorrect: selectedAnswer === currentQuestion.correct_answer
      };

      const newAnswers = [...answers, userAnswer];
      setAnswers(newAnswers);

      if (isLastQuestion) {
        onComplete(newAnswers);
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setShowExplanation(false);
        setHasAnswered(false);
      }
    }
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{t('error.noQuestions', 'No questions available')}</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{t('error.questionNotFound', 'Question not found')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <QuizHeader
          currentQuestionIndex={currentQuestionIndex}
          totalQuestions={questions.length}
          timeLeft={timeLeft}
        />

        <div className="flex flex-col lg:flex-row gap-6">
          <QuizQuestion
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            hasAnswered={hasAnswered}
            onAnswerSelect={handleAnswerSelect}
          />

          <QuizExplanation
            question={currentQuestion}
            selectedAnswer={selectedAnswer}
            isCorrect={selectedAnswer === currentQuestion.correct_answer}
            showExplanation={showExplanation}
            hasAnswered={hasAnswered}
            isLastQuestion={isLastQuestion}
            onSubmit={handleAnswerSubmit}
            onNext={handleNext}
          />
        </div>
      </div>
    </div>
  );
}
