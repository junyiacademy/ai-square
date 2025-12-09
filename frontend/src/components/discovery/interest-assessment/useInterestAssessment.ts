import { useState, useEffect, useCallback } from 'react';
import type { Question, AssessmentResults } from './types';

interface UseInterestAssessmentProps {
  questions: Question[];
  onComplete: (results: AssessmentResults, answers?: Record<string, string[]>) => void;
}

export function useInterestAssessment({ questions, onComplete }: UseInterestAssessmentProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const canGoNext = !!(currentQuestion && answers[currentQuestion.id] && answers[currentQuestion.id].length > 0);
  const canGoPrevious = currentQuestionIndex > 0;

  // Load selected options for current question
  useEffect(() => {
    setSelectedOptions(answers[currentQuestion?.id] || []);
  }, [currentQuestionIndex, currentQuestion?.id, answers]);

  const calculateResults = useCallback((): AssessmentResults => {
    const scores = { tech: 0, creative: 0, business: 0 };

    questions.forEach(question => {
      const selectedOptionIds = answers[question.id] || [];
      selectedOptionIds.forEach(selectedOptionId => {
        const selectedOption = question.options.find(opt => opt.id === selectedOptionId);
        if (selectedOption) {
          scores.tech += selectedOption.weight.tech;
          scores.creative += selectedOption.weight.creative;
          scores.business += selectedOption.weight.business;
        }
      });
    });

    // Calculate total score
    const totalScore = scores.tech + scores.creative + scores.business;

    // Convert to percentages
    if (totalScore > 0) {
      scores.tech = Math.round((scores.tech / totalScore) * 100);
      scores.creative = Math.round((scores.creative / totalScore) * 100);
      scores.business = Math.round((scores.business / totalScore) * 100);

      // Ensure percentages add up to 100
      const sum = scores.tech + scores.creative + scores.business;
      if (sum !== 100) {
        // Adjust the highest score to make it exactly 100
        const maxKey = Object.keys(scores).reduce((a, b) =>
          scores[a as keyof typeof scores] > scores[b as keyof typeof scores] ? a : b
        ) as keyof typeof scores;
        scores[maxKey] += (100 - sum);
      }
    } else {
      // Default values if no selections
      scores.tech = 33;
      scores.creative = 33;
      scores.business = 34;
    }

    return scores;
  }, [questions, answers]);

  const handleOptionSelect = useCallback((optionId: string) => {
    setSelectedOptions(prev => {
      if (prev.includes(optionId)) {
        return prev.filter(id => id !== optionId);
      } else {
        return [...prev, optionId];
      }
    });

    setAnswers(prev => {
      const currentAnswers = prev[currentQuestion.id] || [];
      if (currentAnswers.includes(optionId)) {
        return {
          ...prev,
          [currentQuestion.id]: currentAnswers.filter(id => id !== optionId)
        };
      } else {
        return {
          ...prev,
          [currentQuestion.id]: [...currentAnswers, optionId]
        };
      }
    });
  }, [currentQuestion]);

  const handleNext = useCallback(async () => {
    if (!canGoNext || isAnimating) return;

    setIsAnimating(true);

    if (isLastQuestion) {
      const results = calculateResults();
      setTimeout(() => {
        onComplete(results, answers);
      }, 300);
    } else {
      setTimeout(() => {
        setCurrentQuestionIndex(prev => prev + 1);
        setIsAnimating(false);
      }, 300);
    }
  }, [canGoNext, isAnimating, isLastQuestion, calculateResults, onComplete, answers]);

  const handlePrevious = useCallback(() => {
    if (!canGoPrevious || isAnimating) return;

    setIsAnimating(true);
    setTimeout(() => {
      setCurrentQuestionIndex(prev => prev - 1);
      setIsAnimating(false);
    }, 300);
  }, [canGoPrevious, isAnimating]);

  return {
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
  };
}
