'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X, CheckCircle, XCircle } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correct_answer?: string;
  explanation?: string;
  type?: string;
}

interface UserAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  timestamp?: Date;
}

interface QuestionReviewProps {
  questions: Question[];
  userAnswers: UserAnswer[];
  selectedQuestionIds: string[];
  onClose: () => void;
  title?: string;
}

export function QuestionReview({ 
  questions, 
  userAnswers, 
  selectedQuestionIds,
  onClose,
  title = "Related Questions"
}: QuestionReviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter questions based on selected IDs
  const selectedQuestions = questions.filter(q => selectedQuestionIds.includes(q.id));
  
  if (selectedQuestions.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center text-gray-500 py-8">
          No questions available for this node
        </div>
      </div>
    );
  }

  const currentQuestion = selectedQuestions[currentIndex];
  const userAnswer = userAnswers.find(a => a.questionId === currentQuestion.id);

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

  const getOptionClass = (optionKey: string) => {
    if (!userAnswer) return 'border-gray-300 hover:bg-gray-50';
    
    const isUserChoice = userAnswer.answer === optionKey;
    const isCorrect = currentQuestion.correct_answer === optionKey;
    
    if (isUserChoice && isCorrect) {
      return 'border-green-500 bg-green-50 text-green-900'; // User chose correct
    } else if (isUserChoice && !isCorrect) {
      return 'border-red-500 bg-red-50 text-red-900'; // User chose wrong
    } else if (!isUserChoice && isCorrect) {
      return 'border-green-300 bg-green-25 text-green-700'; // Correct answer not chosen
    }
    return 'border-gray-300'; // Other options
  };

  const getOptionIcon = (optionKey: string) => {
    if (!userAnswer) return null;
    
    const isUserChoice = userAnswer.answer === optionKey;
    const isCorrect = currentQuestion.correct_answer === optionKey;
    
    if (isUserChoice && isCorrect) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else if (isUserChoice && !isCorrect) {
      return <XCircle className="w-5 h-5 text-red-600" />;
    } else if (!isUserChoice && isCorrect) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Question Navigation */}
        <div className="flex items-center justify-between mt-3">
          <div className="text-sm text-gray-600">
            Question {currentIndex + 1} of {selectedQuestions.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className={`p-2 rounded-lg transition-colors ${
                currentIndex === 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === selectedQuestions.length - 1}
              className={`p-2 rounded-lg transition-colors ${
                currentIndex === selectedQuestions.length - 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="p-6">
        {/* Question */}
        <div className="mb-6">
          <h4 className="text-base font-medium text-gray-900 mb-4 leading-relaxed">
            {currentQuestion.question}
          </h4>
          
          {/* Answer Status */}
          {userAnswer && (
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-4 ${
              userAnswer.isCorrect 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {userAnswer.isCorrect ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Correct
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4" />
                  Incorrect
                </>
              )}
            </div>
          )}
        </div>

        {/* Options */}
        {currentQuestion.options && (
          <div className="space-y-3 mb-6">
            {Object.entries(currentQuestion.options).map(([optionKey, optionText]) => (
              <div
                key={optionKey}
                className={`p-4 rounded-lg border-2 transition-colors ${getOptionClass(optionKey)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-sm font-medium flex items-center justify-center mt-0.5">
                    {optionKey.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">{optionText}</p>
                  </div>
                  <div className="flex-shrink-0">
                    {getOptionIcon(optionKey)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Explanation */}
        {currentQuestion.explanation && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-medium text-blue-900 mb-2">Explanation</h5>
            <p className="text-sm text-blue-800 leading-relaxed">
              {currentQuestion.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Progress Indicators */}
      <div className="px-6 py-3 bg-gray-50 border-t">
        <div className="flex gap-1">
          {selectedQuestions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentIndex
                  ? 'bg-blue-600'
                  : index < currentIndex
                  ? 'bg-blue-300'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}