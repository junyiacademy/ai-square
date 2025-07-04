'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CheckCircleIcon,
  SparklesIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

interface AssessmentResults {
  tech: number;
  creative: number;
  business: number;
}

interface InterestAssessmentProps {
  onComplete: (results: AssessmentResults) => void;
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
  const { t } = useTranslation('careerDiscovery');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  // Get questions from translation with proper typing
  const questionsData = t('interestAssessment.questions', { returnObjects: true }) as Question[];
  const totalQuestions = questionsData.length;

  const currentQuestion = questionsData[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
  const canGoNext = answers[currentQuestion.id];
  const canGoPrevious = currentQuestionIndex > 0;

  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId);
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionId
    }));

    // 自動進入下一題，增加互動時間
    setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedOption(null);
      } else {
        handleComplete();
      }
    }, 1200); // 增加延遲時間讓用戶看到動畫
  };

  const handleComplete = () => {
    const results = calculateResults();
    onComplete(results);
  };

  const handleNext = async () => {
    if (!canGoNext || isAnimating) return;
    
    setIsAnimating(true);
    
    if (isLastQuestion) {
      // Calculate results
      const results = calculateResults();
      setTimeout(() => {
        onComplete(results);
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
      const selectedOptionId = answers[question.id];
      if (selectedOptionId) {
        const selectedOption = question.options.find(opt => opt.id === selectedOptionId);
        if (selectedOption) {
          scores.tech += selectedOption.weight.tech;
          scores.creative += selectedOption.weight.creative;
          scores.business += selectedOption.weight.business;
        }
      }
    });

    return scores;
  };

  const progressPercentage = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <div className="relative min-h-screen">
      {/* 動態背景 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200 rounded-full opacity-20 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-200 rounded-full opacity-20 blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mb-6 shadow-2xl"
          >
            <SparklesIcon className="w-10 h-10 text-white" />
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            🔍 AI 興趣分析儀
          </h2>
          <p className="text-xl text-gray-600 mb-6 font-medium">
            🎯 讓 AI 深度分析你的職業潛能和興趣方向
          </p>
          <p className="text-gray-500 max-w-2xl mx-auto">
            透過科學化的問題設計，我們會即時分析你的回答並生成個人化的職業建議
          </p>
        </motion.div>

        {/* 遊戲化進度指示器 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-10"
        >
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <span className="text-white text-xs font-bold">{currentQuestionIndex + 1}</span>
              </motion.div>
              <span className="text-lg font-bold text-gray-800">AI 興趣分析中</span>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">進度</div>
              <div className="text-xl font-bold text-purple-600">
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
          
          {/* 激勵消息 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-3 text-center"
          >
            <span className="text-sm text-purple-600 font-medium">
              {currentQuestionIndex === 0 && '🎆 開始你的職業探索之旅！'}
              {currentQuestionIndex === 1 && '🚀 做得好！繼續探索你的興趣'}
              {currentQuestionIndex === 2 && '✨ 很棒！AI 正在分析你的傾向'}
              {currentQuestionIndex === 3 && '🎉 最後一題！即將揭曉你的職業方向'}
            </span>
          </motion.div>
        </motion.div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 mb-10 border border-white/20"
          >
            {/* 動態題目顯示 */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="mb-10"
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
                className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-4"
              >
                {currentQuestion.text}
              </motion.h3>
              
              {/* 題目提示 */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-gray-600 font-medium"
              >
                🤔 選擇最符合你想法的選項，沒有標準答案！
              </motion.p>
            </motion.div>

            {/* 選項列表 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-4"
            >
              {currentQuestion.options.map((option, index) => {
                const isSelected = answers[currentQuestion.id] === option.id;
                
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
                        relative w-full p-6 text-left rounded-2xl border-2 transition-all duration-300 group overflow-hidden
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
                            <span className={`font-semibold text-lg transition-colors ${
                              isSelected ? 'text-purple-800' : 'text-gray-800 group-hover:text-purple-700'
                            }`}>
                              {option.text}
                            </span>
                            
                            {/* 選項的微妙特色描述 */}
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ 
                                height: isSelected ? 'auto' : 0,
                                opacity: isSelected ? 1 : 0
                              }}
                              transition={{ duration: 0.3 }}
                              className="mt-2 text-sm text-purple-600 font-medium overflow-hidden"
                            >
                              ✨ 很棒的選擇！這會影響你的職業方向分析
                            </motion.div>
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

        {/* 選擇確認反饋 */}
        <AnimatePresence>
          {selectedOption && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="text-center p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border-2 border-purple-200 shadow-lg mb-8"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 mx-auto mb-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-white text-sm font-bold"
                >
                  AI
                </motion.div>
              </motion.div>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-purple-700 font-bold text-lg mb-2"
              >
                🎯 精彩的選擇！
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-purple-600 font-medium"
              >
                AI 正在深度分析你的興趣模式和職業傾向...
              </motion.p>
              
              {/* 分析進度指示 */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1, delay: 0.6 }}
                className="mt-4 h-2 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full mx-auto max-w-xs"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
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
        <div className="flex justify-center space-x-2 mt-8">
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