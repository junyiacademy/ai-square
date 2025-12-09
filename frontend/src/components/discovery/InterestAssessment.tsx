'use client';

import { useTranslation } from 'react-i18next';
import { AssessmentBackground } from './interest-assessment/AssessmentBackground';
import { AssessmentHeader } from './interest-assessment/AssessmentHeader';
import { ProgressIndicator } from './interest-assessment/ProgressIndicator';
import { QuestionCard } from './interest-assessment/QuestionCard';
import { NavigationControls } from './interest-assessment/NavigationControls';
import { QuestionIndicators } from './interest-assessment/QuestionIndicators';
import { useInterestAssessment } from './interest-assessment/useInterestAssessment';
import type { Question, InterestAssessmentProps } from './interest-assessment/types';

export default function InterestAssessment({ onComplete }: InterestAssessmentProps) {
  const { t } = useTranslation('discovery');

  // Get questions from translation with proper typing
  const questionsData = t('interestAssessment.questions', { returnObjects: true }) as Question[];

  const {
    currentQuestionIndex,
    currentQuestion,
    totalQuestions,
    isLastQuestion,
    canGoNext,
    canGoPrevious,
    isAnimating,
    selectedOptions,
    handleOptionSelect,
    handleNext,
    handlePrevious,
  } = useInterestAssessment({ questions: questionsData, onComplete });


  return (
    <div className="relative h-screen overflow-hidden">
      <AssessmentBackground />

      <div className="relative z-10 h-full flex flex-col max-w-4xl mx-auto px-4 py-4">
        <AssessmentHeader />

        <ProgressIndicator
          currentQuestion={currentQuestionIndex}
          totalQuestions={totalQuestions}
        />

        <QuestionCard
          question={currentQuestion}
          questionIndex={currentQuestionIndex}
          selectedOptions={selectedOptions}
          onOptionSelect={handleOptionSelect}
        />

        <NavigationControls
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          isAnimating={isAnimating}
          isLastQuestion={isLastQuestion}
          selectedCount={selectedOptions.length}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />

        <QuestionIndicators
          totalQuestions={totalQuestions}
          currentQuestion={currentQuestionIndex}
        />
      </div>
    </div>
  );
}
