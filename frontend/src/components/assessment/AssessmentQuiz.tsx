'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AssessmentQuestion, AssessmentDomain, UserAnswer } from '../../types/assessment';

interface AssessmentQuizProps {
  questions: AssessmentQuestion[];
  domains: {
    engaging_with_ai: AssessmentDomain;
    creating_with_ai: AssessmentDomain;
    managing_with_ai: AssessmentDomain;
    designing_with_ai: AssessmentDomain;
  };
  onComplete: (answers: UserAnswer[]) => void;
  timeLimit: number; // in minutes
  initialAnswers?: UserAnswer[]; // For resuming assessment
}

export default function AssessmentQuiz({ questions, onComplete, timeLimit, initialAnswers = [] }: AssessmentQuizProps) {
  const { t } = useTranslation('assessment');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialAnswers.length || 0);
  const [answers, setAnswers] = useState<UserAnswer[]>(initialAnswers);
  const [selectedAnswer, setSelectedAnswer] = useState<'a' | 'b' | 'c' | 'd' | null>(null);
  const [timeLeft, setTimeLeft] = useState(() => (timeLimit || 15) * 60); // convert to seconds with default
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date());
  const [showExplanation, setShowExplanation] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Track previous questions to detect task changes
  const [prevQuestionIds, setPrevQuestionIds] = useState<string>('');
  
  // Reset state when questions change (new task)
  useEffect(() => {
    const currentQuestionIds = questions.map(q => q.id).join(',');
    
    if (prevQuestionIds && prevQuestionIds !== currentQuestionIds) {
      console.log('New task detected, resetting quiz state');
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setHasAnswered(false);
      setQuestionStartTime(new Date());
      setTimeLeft(timeLimit * 60);
    }
    
    setPrevQuestionIds(currentQuestionIds);
  }, [questions, prevQuestionIds, timeLimit]);

  // Check if current question is already answered
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

  // Create handleComplete with useCallback to avoid dependency issues
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

  // Timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      handleComplete();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, handleComplete]);

  // Reset question start time when question changes
  useEffect(() => {
    setQuestionStartTime(new Date());
  }, [currentQuestionIndex]);

  // Remove unused function - using direct field access instead

  const getQuestionText = useCallback(() => {
    // 問題已經在 API 層翻譯過了，直接使用 question 字段
    return currentQuestion.question;
  }, [currentQuestion]);

  const getOptionsText = useCallback(() => {
    // 選項已經在 API 層翻譯過了，直接使用 options 字段
    return currentQuestion.options;
  }, [currentQuestion]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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

  // Removed duplicate handleComplete function - now using useCallback version above

  const getDomainName = (domainKey: string) => {
    // 使用 i18n 系統來獲取領域名稱翻譯
    return t(`domains.${domainKey}`);
  };

  // Guard against missing questions
  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{t('error.noQuestions', 'No questions available')}</p>
        </div>
      </div>
    );
  }

  const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Guard against missing current question
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
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {t('quiz.title')}
            </h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                {t('quiz.question')} {currentQuestionIndex + 1} / {questions.length}
              </div>
              <div className={`text-sm font-medium ${timeLeft < 300 ? 'text-red-600' : 'text-gray-600'}`}>
                {t('quiz.timeLeft')}: {formatTime(timeLeft)}
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Question and Options */}
          <div className="flex-1 bg-white rounded-lg shadow-sm p-8">
            {/* Domain Badge */}
            <div className="mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {getDomainName(currentQuestion.domain)}
              </span>
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                {t(`difficulty.${currentQuestion.difficulty}`)}
              </span>
            </div>

            {/* Question */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {getQuestionText()}
              </h2>
            </div>

            {/* Options */}
            <div className="space-y-4">
              {Object.entries(getOptionsText()).map(([key, text]) => {
                const isCorrect = key === currentQuestion.correct_answer;
                const isSelected = selectedAnswer === key;
                const showResult = hasAnswered;
                
                return (
                  <button
                    key={key}
                    onClick={() => !hasAnswered && handleAnswerSelect(key as 'a' | 'b' | 'c' | 'd')}
                    disabled={hasAnswered}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                      showResult && isCorrect
                        ? 'border-green-500 bg-green-50'
                        : showResult && isSelected && !isCorrect
                        ? 'border-red-500 bg-red-50'
                        : isSelected
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    } ${hasAnswered ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-start">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 mt-0.5 ${
                        showResult && isCorrect
                          ? 'border-green-500 bg-green-500'
                          : showResult && isSelected && !isCorrect
                          ? 'border-red-500 bg-red-500'
                          : isSelected
                          ? 'border-indigo-500 bg-indigo-500'
                          : 'border-gray-300'
                      }`}>
                        {showResult && isCorrect ? (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : showResult && isSelected && !isCorrect ? (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        ) : isSelected ? (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        ) : null}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium text-gray-700 mr-2">
                          {key.toUpperCase()}.
                        </span>
                        <span className={`${
                          showResult && isCorrect
                            ? 'text-green-900 font-medium'
                            : showResult && isSelected && !isCorrect
                            ? 'text-red-900'
                            : 'text-gray-900'
                        }`}>{text}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column - Explanation and Navigation */}
          <div className="lg:w-96">
            <div className="bg-white rounded-lg shadow-sm p-8 sticky top-8">
              {/* Show explanation after answering */}
              {showExplanation ? (
                <div className="space-y-4 mb-6">
                  {/* Result Indicator */}
                  <div className={`text-center p-4 rounded-lg ${
                    selectedAnswer === currentQuestion.correct_answer
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}>
                    <div className="text-2xl mb-2">
                      {selectedAnswer === currentQuestion.correct_answer ? '✓' : '✗'}
                    </div>
                    <div className="font-semibold">
                      {selectedAnswer === currentQuestion.correct_answer 
                        ? t('quiz.correct') 
                        : t('quiz.incorrect')}
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">{t('quiz.explanation')}</h4>
                    <p className="text-blue-800 text-sm">{currentQuestion.explanation}</p>
                  </div>
                  
                  {/* KSA Mapping */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">{t('quiz.ksaMapping')}</h4>
                    <div className="space-y-2 text-sm">
                      {currentQuestion.ksa_mapping.knowledge.length > 0 && (
                        <div className="flex items-start">
                          <span className="font-medium text-gray-700 mr-2">{t('quiz.knowledge')}:</span>
                          <span className="text-gray-600">{currentQuestion.ksa_mapping.knowledge.join(', ')}</span>
                        </div>
                      )}
                      {currentQuestion.ksa_mapping.skills.length > 0 && (
                        <div className="flex items-start">
                          <span className="font-medium text-gray-700 mr-2">{t('quiz.skills')}:</span>
                          <span className="text-gray-600">{currentQuestion.ksa_mapping.skills.join(', ')}</span>
                        </div>
                      )}
                      {currentQuestion.ksa_mapping.attitudes.length > 0 && (
                        <div className="flex items-start">
                          <span className="font-medium text-gray-700 mr-2">{t('quiz.attitudes')}:</span>
                          <span className="text-gray-600">{currentQuestion.ksa_mapping.attitudes.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 mb-6">
                  <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-sm">{t('quiz.selectAnswerToSeeExplanation')}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="border-t pt-6">
                <div className="text-sm text-gray-500 mb-4 text-center">
                  {!hasAnswered ? t('quiz.selectAnswer') : ''}
                </div>
                <div className="flex flex-col space-y-3">
                  {!hasAnswered ? (
                    <button
                      onClick={handleAnswerSubmit}
                      disabled={!selectedAnswer}
                      className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                        selectedAnswer
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {t('quiz.submit')}
                    </button>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="w-full px-6 py-3 rounded-lg font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      {isLastQuestion ? t('quiz.finish') : t('quiz.next')}
                      {!isLastQuestion && (
                        <svg className="inline-block ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}