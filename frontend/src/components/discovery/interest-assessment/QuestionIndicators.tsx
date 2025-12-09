import { motion } from 'framer-motion';

interface QuestionIndicatorsProps {
  totalQuestions: number;
  currentQuestion: number;
}

export function QuestionIndicators({ totalQuestions, currentQuestion }: QuestionIndicatorsProps) {
  return (
    <div className="flex justify-center space-x-2 mt-4 flex-shrink-0">
      {Array.from({ length: totalQuestions }).map((_, index) => (
        <motion.div
          key={index}
          className={`
            w-3 h-3 rounded-full transition-all duration-200
            ${index <= currentQuestion
              ? 'bg-purple-500'
              : 'bg-gray-200'
            }
          `}
          animate={index === currentQuestion ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.5 }}
        />
      ))}
    </div>
  );
}
