'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AssessmentQuestion, UserAnswer } from '../../types/assessment';

interface QuestionReviewProps {
  questions: AssessmentQuestion[];
  userAnswers: UserAnswer[];
  selectedQuestionIds: string[];
  onClose: () => void;
}

export default function QuestionReview({ 
  questions = [], 
  userAnswers = [], 
  selectedQuestionIds = [],
  onClose 
}: QuestionReviewProps) {
  const { t } = useTranslation('assessment');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter questions based on selected IDs (with safety check)
  const selectedQuestions = questions.filter(q => q && q.id && selectedQuestionIds.includes(q.id));
  
  if (selectedQuestions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('results.questionReview.title')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="text-center text-gray-500 py-8">
          <p>{t('results.questionReview.noQuestions')}</p>
          {selectedQuestionIds.length > 0 && (
            <p className="text-sm mt-2 text-gray-400">
              {t('results.questionReview.questionsNotFound')}
            </p>
          )}
        </div>
      </div>
    );
  }

  const currentQuestion = selectedQuestions[currentIndex];
  const userAnswer = currentQuestion ? userAnswers.find(a => a && a.questionId === currentQuestion.id) : undefined;

  // If no current question, show empty state
  if (!currentQuestion) {
    return (
      <div className="p-4 text-center text-gray-500">
        {t('results.questionReview.noQuestions')}
      </div>
    );
  }

  const handleNext = () => {
    if (currentIndex < selectedQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const getOptionClass = (option: string) => {
    if (!userAnswer) return 'border-gray-300 hover:bg-gray-50';
    
    if (option === currentQuestion.correct_answer) {
      return 'border-green-500 bg-green-50';
    }
    if (option === userAnswer.selectedAnswer && !userAnswer.isCorrect) {
      return 'border-red-500 bg-red-50';
    }
    return 'border-gray-300';
  };

  const getOptionIcon = (option: string) => {
    if (!userAnswer) return null;
    
    if (option === currentQuestion.correct_answer) {
      return <span className="text-green-600">✓</span>;
    }
    if (option === userAnswer.selectedAnswer && !userAnswer.isCorrect) {
      return <span className="text-red-600">✗</span>;
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-h-[calc(100vh-2rem)] overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('results.questionReview.title')}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Question Navigation */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-600">
          {t('results.questionReview.questionNumber', { 
            current: currentIndex + 1, 
            total: selectedQuestions.length 
          })}
        </span>
        <div className="flex gap-2">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('results.questionReview.previous')}
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === selectedQuestions.length - 1}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('results.questionReview.next')}
          </button>
        </div>
      </div>

      {/* Question Content */}
      <div className="space-y-4">
        {/* Question */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              currentQuestion.difficulty === 'basic' ? 'bg-green-100 text-green-800' :
              currentQuestion.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {t(`difficulty.${currentQuestion.difficulty}`)}
            </span>
            <span className="text-sm text-gray-500">
              {t(`domains.${currentQuestion.domain}`)}
            </span>
          </div>
          <p className="text-gray-900 font-medium">{currentQuestion.question}</p>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {Object.entries(currentQuestion.options).map(([key, value]) => (
            <div
              key={key}
              className={`p-3 border rounded-lg flex items-start justify-between ${getOptionClass(key)}`}
            >
              <div className="flex items-start">
                <span className="font-medium mr-2">{key.toUpperCase()}.</span>
                <span>{value}</span>
              </div>
              {getOptionIcon(key)}
            </div>
          ))}
        </div>

        {/* User Answer Status */}
        {userAnswer && (
          <div className={`p-3 rounded-lg ${
            userAnswer.isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {userAnswer.isCorrect ? 
              t('results.questionReview.correct') : 
              t('results.questionReview.incorrect')
            }
          </div>
        )}

        {/* Explanation */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">{t('quiz.explanation')}</h4>
          <p className="text-blue-800">{currentQuestion.explanation}</p>
        </div>

        {/* KSA Mapping */}
        {currentQuestion.ksa_mapping && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">{t('quiz.ksaMapping')}</h4>
            <div className="space-y-2">
              {currentQuestion.ksa_mapping.knowledge.length > 0 && (
                <div className="flex items-start">
                  <span className="text-blue-600 font-medium mr-2">{t('quiz.knowledge')}:</span>
                  <span className="text-gray-700">{currentQuestion.ksa_mapping.knowledge.join(', ')}</span>
                </div>
              )}
              {currentQuestion.ksa_mapping.skills.length > 0 && (
                <div className="flex items-start">
                  <span className="text-green-600 font-medium mr-2">{t('quiz.skills')}:</span>
                  <span className="text-gray-700">{currentQuestion.ksa_mapping.skills.join(', ')}</span>
                </div>
              )}
              {currentQuestion.ksa_mapping.attitudes.length > 0 && (
                <div className="flex items-start">
                  <span className="text-purple-600 font-medium mr-2">{t('quiz.attitudes')}:</span>
                  <span className="text-gray-700">{currentQuestion.ksa_mapping.attitudes.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Practice Mode */}
      <div className="mt-6 pt-4 border-t">
        <p className="text-sm text-gray-600 mb-3">
          {t('results.questionReview.practicePrompt')}
        </p>
        <div className="space-y-2">
          <button 
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
            onClick={() => {
              // Navigate to assessment page for practice
              window.location.href = '/assessment';
            }}
          >
            {t('results.questionReview.practiceAgain')}
          </button>
          <button 
            className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            onClick={onClose}
          >
            {t('results.questionReview.closeReview')}
          </button>
        </div>
      </div>
    </div>
  );
}