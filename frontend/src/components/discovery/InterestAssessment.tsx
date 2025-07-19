'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface AssessmentResults {
  tech: number;
  creative: number;
  business: number;
}

interface InterestAssessmentProps {
  onComplete: (results: AssessmentResults, answers?: Record<string, string[]>) => void;
}

interface QuestionOption {
  id: string;
  text: string;
  weight: {
    tech: number;
    creative: number;
    business: number;
  };
}

interface Question {
  id: string;
  text: string;
  options: QuestionOption[];
}

export default function InterestAssessment({ onComplete }: InterestAssessmentProps) {
  const { t } = useTranslation('discovery');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  // Get questions from translation with proper typing
  const questionsData = t('interestAssessment.questions', { returnObjects: true }) as Question[];
  const totalQuestions = questionsData.length;

  const currentQuestion = questionsData[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const canGoNext = answers[currentQuestion.id] && answers[currentQuestion.id].length > 0;
  const canGoPrevious = currentQuestionIndex > 0;
  
  // Load selected options for current question
  React.useEffect(() => {
    setSelectedOptions(answers[currentQuestion.id] || []);
  }, [currentQuestionIndex, currentQuestion.id, answers]);

  const handleOptionSelect = (optionId: string) => {
    setSelectedOptions(prev => {
      if (prev.includes(optionId)) {
        // Remove if already selected
        return prev.filter(id => id !== optionId);
      } else {
        // Add to selected options
        return [...prev, optionId];
      }
    });
    
    setAnswers(prev => {
      const currentAnswers = prev[currentQuestion.id] || [];
      if (currentAnswers.includes(optionId)) {
        // Remove if already selected
        return {
          ...prev,
          [currentQuestion.id]: currentAnswers.filter(id => id !== optionId)
        };
      } else {
        // Add to selected options
        return {
          ...prev,
          [currentQuestion.id]: [...currentAnswers, optionId]
        };
      }
    });
  };


  const handleNext = async () => {
    if (!canGoNext || isAnimating) return;
    
    setIsAnimating(true);
    
    if (isLastQuestion) {
      // Calculate results
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
  };

  const handlePrevious = () => {
    if (!canGoPrevious || isAnimating) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentQuestionIndex(prev => prev - 1);
      setIsAnimating(false);
    }, 300);
  };

  const calculateResults = (): AssessmentResults => {
    const scores = { tech: 0, creative: 0, business: 0 };
    
    questionsData.forEach(question => {
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
  };


  return (
    <div className="relative h-screen overflow-hidden">
      {/* 動態背景 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200 rounded-full opacity-20 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-200 rounded-full opacity-20 blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 h-full flex flex-col max-w-4xl mx-auto px-4 py-4">
        {/* Compact Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-4 flex-shrink-0"
        >
          <div className="flex items-center justify-center space-x-3 mb-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-lg"
            >
              <SparklesIcon className="w-6 h-6 text-white" />
            </motion.div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              AI 興趣分析儀
            </h2>
          </div>
          <p className="text-sm text-gray-600 font-medium">
            讓 AI 深度分析你的潛能和興趣方向
          </p>
        </motion.div>

        {/* 遊戲化進度指示器 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-4 flex-shrink-0"
        >
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center space-x-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <span className="text-white text-xs font-bold">{currentQuestionIndex + 1}</span>
              </motion.div>
              <span className="text-sm font-bold text-gray-800">AI 興趣分析中</span>
            </div>
            
            <div className="text-right">
              <div className="text-lg font-bold text-purple-600">
                {Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%
              </div>
            </div>
          </div>
          
          {/* 3D 進度條 */}
          <div className="relative w-full h-3 bg-gray-200 rounded-full shadow-inner border border-gray-300 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-full shadow-lg"
              animate={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {/* 進度條光效 */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>
            
            {/* 里程碑指示器 */}
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-between px-1">
              {Array.from({ length: totalQuestions }, (_, i) => (
                <motion.div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                    i <= currentQuestionIndex
                      ? 'bg-white border-purple-200 shadow-lg'
                      : 'bg-gray-300 border-gray-400'
                  }`}
                  animate={i === currentQuestionIndex ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.5 }}
                  style={{ marginLeft: i === 0 ? '0' : 'auto', marginRight: i === totalQuestions - 1 ? '0' : 'auto' }}
                >
                  {i <= currentQuestionIndex && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 bg-purple-500 rounded-full m-0.5"
                    />
                  )}
                </motion.div>
              ))}
            </div>
          </div>
          
        </motion.div>

        {/* Question Card - Scrollable content */}
        <div className="flex-1 overflow-y-auto mb-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.95 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-6 border border-white/20"
            >
              {/* 動態題目顯示 */}
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mb-6"
              >
              {/* 題目編號和類型 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center space-x-3 mb-4"
              >
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg">
                  問題 {currentQuestionIndex + 1}
                </div>
                <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-lg text-sm font-medium">
                  興趣傾向分析
                </div>
              </motion.div>
              
                <motion.h3
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-3"
                >
                  {currentQuestion.text}
                </motion.h3>
              
                {/* 題目提示 */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm text-gray-600 font-medium"
                >
                  🤔 選擇所有符合你想法的選項（可多選），沒有標準答案！
                </motion.p>
              </motion.div>

              {/* 選項列表 */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="space-y-3"
              >
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedOptions.includes(option.id);
                
                const handleAnswer = () => {
                  handleOptionSelect(option.id);
                };
                
                return (
                  <motion.div
                    key={option.id}
                    initial={{ opacity: 0, x: -50, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ 
                      duration: 0.5, 
                      delay: index * 0.15,
                      type: "spring",
                      stiffness: 100
                    }}
                  >
                    <motion.button
                      onClick={handleAnswer}
                      whileHover={{ 
                        scale: 1.02,
                        boxShadow: "0 8px 25px rgba(168, 85, 247, 0.15)"
                      }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        relative w-full p-4 text-left rounded-xl border-2 transition-all duration-300 group overflow-hidden
                        ${isSelected
                          ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-800 shadow-lg'
                          : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-gradient-to-br hover:from-purple-25 hover:to-white'
                        }
                      `}
                    >
                      {/* 按鈕背景發光效果 */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
                        animate={isSelected ? { opacity: [0, 0.1, 0] } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      
                      {/* 選中指示器 */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-4 right-4 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center shadow-lg"
                        >
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.1 }}
                            className="text-white text-sm font-bold"
                          >
                            ✓
                          </motion.div>
                        </motion.div>
                      )}

                      <div className="relative z-10">
                        <div className="flex items-start space-x-4">
                          {/* 更炫的選擇指示器 */}
                          <motion.div
                            className={`
                              mt-1 w-8 h-8 rounded-xl border-3 transition-all duration-300 flex items-center justify-center
                              ${isSelected
                                ? 'border-purple-500 bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg'
                                : 'border-gray-300 bg-white group-hover:border-purple-400'
                              }
                            `}
                            whileHover={{ scale: 1.1 }}
                            animate={isSelected ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 0.3 }}
                          >
                            {isSelected && (
                              <motion.svg
                                initial={{ scale: 0, rotate: -90 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="w-5 h-5 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </motion.svg>
                            )}
                          </motion.div>
                          
                          <div className="flex-1">
                            <span className={`font-semibold text-base transition-colors ${
                              isSelected ? 'text-purple-800' : 'text-gray-800 group-hover:text-purple-700'
                            }`}>
                              {option.text}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  </motion.div>
                );
                })}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>


        {/* Navigation Buttons */}
        <div className="flex justify-between items-center flex-shrink-0">
          {/* 選擇提示 */}
          {selectedOptions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center flex-1 mx-4"
            >
              <p className="text-sm text-purple-600 font-medium">
                已選擇 {selectedOptions.length} 個選項
              </p>
            </motion.div>
          )}
          <motion.button
            onClick={handlePrevious}
            disabled={!canGoPrevious || isAnimating}
            whileHover={canGoPrevious ? { scale: 1.05 } : {}}
            whileTap={canGoPrevious ? { scale: 0.95 } : {}}
            className={`
              flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200
              ${canGoPrevious && !isAnimating
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <ChevronLeftIcon className="w-5 h-5" />
            <span>上一題</span>
          </motion.button>

          <motion.button
            onClick={handleNext}
            disabled={!canGoNext || isAnimating}
            whileHover={canGoNext ? { scale: 1.05 } : {}}
            whileTap={canGoNext ? { scale: 0.95 } : {}}
            className={`
              flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200
              ${canGoNext && !isAnimating
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-xl' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <span>
              {isLastQuestion ? '完成分析' : '下一題'}
            </span>
            {!isLastQuestion && <ChevronRightIcon className="w-5 h-5" />}
          </motion.button>
        </div>

        {/* Question Indicators */}
        <div className="flex justify-center space-x-2 mt-4 flex-shrink-0">
          {Array.from({ length: totalQuestions }).map((_, index) => (
            <motion.div
              key={index}
              className={`
                w-3 h-3 rounded-full transition-all duration-200
                ${index <= currentQuestionIndex 
                  ? 'bg-purple-500' 
                  : 'bg-gray-200'
                }
              `}
              animate={index === currentQuestionIndex ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.5 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}