import { motion, AnimatePresence } from 'framer-motion';
import { OptionButton } from './OptionButton';
import type { Question } from './types';

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  selectedOptions: string[];
  onOptionSelect: (optionId: string) => void;
}

export function QuestionCard({ question, questionIndex, selectedOptions, onOptionSelect }: QuestionCardProps) {
  return (
    <div className="flex-1 overflow-y-auto mb-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={questionIndex}
          initial={{ opacity: 0, x: 50, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -50, scale: 0.95 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-6 border border-white/20"
        >
          {/* Question Header */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-6"
          >
            {/* Question Number and Type */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center space-x-3 mb-4"
            >
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg">
                問題 {questionIndex + 1}
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
              {question.text}
            </motion.h3>

            {/* Question Hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm text-gray-600 font-medium"
            >
              🤔 選擇所有符合你想法的選項（可多選），沒有標準答案！
            </motion.p>
          </motion.div>

          {/* Options List */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            {question.options.map((option, index) => (
              <OptionButton
                key={option.id}
                option={option}
                isSelected={selectedOptions.includes(option.id)}
                index={index}
                onSelect={onOptionSelect}
              />
            ))}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
