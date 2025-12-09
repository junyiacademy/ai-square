'use client';

import { useTranslation } from 'react-i18next';
import { AssessmentQuestion } from '../../../types/assessment';

interface QuizExplanationProps {
  question: AssessmentQuestion;
  selectedAnswer: 'a' | 'b' | 'c' | 'd' | null;
  isCorrect: boolean;
  showExplanation: boolean;
  hasAnswered: boolean;
  isLastQuestion: boolean;
  onSubmit: () => void;
  onNext: () => void;
}

export function QuizExplanation({
  question,
  selectedAnswer,
  isCorrect,
  showExplanation,
  hasAnswered,
  isLastQuestion,
  onSubmit,
  onNext
}: QuizExplanationProps) {
  const { t } = useTranslation('assessment');

  return (
    <div className="lg:w-96">
      <div className="bg-white rounded-lg shadow-sm p-8 sticky top-8">
        {showExplanation ? (
          <div className="space-y-4 mb-6">
            <div className={`text-center p-4 rounded-lg ${
              isCorrect
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}>
              <div className="text-2xl mb-2">
                {isCorrect ? '✓' : '✗'}
              </div>
              <div className="font-semibold">
                {isCorrect ? t('quiz.correct') : t('quiz.incorrect')}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">{t('quiz.explanation')}</h4>
              <p className="text-blue-800 text-sm">{question.explanation}</p>
            </div>

            {question.ksa_mapping && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">{t('quiz.ksaMapping')}</h4>
                <div className="space-y-2 text-sm">
                  {question.ksa_mapping?.knowledge?.length > 0 && (
                    <div className="flex items-start">
                      <span className="font-medium text-gray-700 mr-2">{t('quiz.knowledge')}:</span>
                      <span className="text-gray-600">{question.ksa_mapping?.knowledge?.join(', ')}</span>
                    </div>
                  )}
                  {question.ksa_mapping?.skills?.length > 0 && (
                    <div className="flex items-start">
                      <span className="font-medium text-gray-700 mr-2">{t('quiz.skills')}:</span>
                      <span className="text-gray-600">{question.ksa_mapping?.skills?.join(', ')}</span>
                    </div>
                  )}
                  {question.ksa_mapping?.attitudes?.length > 0 && (
                    <div className="flex items-start">
                      <span className="font-medium text-gray-700 mr-2">{t('quiz.attitudes')}:</span>
                      <span className="text-gray-600">{question.ksa_mapping?.attitudes?.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
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

        <div className="border-t pt-6">
          <div className="text-sm text-gray-500 mb-4 text-center">
            {!hasAnswered ? t('quiz.selectAnswer') : ''}
          </div>
          <div className="flex flex-col space-y-3">
            {!hasAnswered ? (
              <button
                onClick={onSubmit}
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
                onClick={onNext}
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
  );
}
