import { motion } from "framer-motion";

interface ProgressIndicatorProps {
  currentQuestion: number;
  totalQuestions: number;
}

export function ProgressIndicator({
  currentQuestion,
  totalQuestions,
}: ProgressIndicatorProps) {
  const progress = Math.round(((currentQuestion + 1) / totalQuestions) * 100);

  return (
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
            <span className="text-white text-xs font-bold">
              {currentQuestion + 1}
            </span>
          </motion.div>
          <span className="text-sm font-bold text-gray-800">AI 興趣分析中</span>
        </div>

        <div className="text-right">
          <div className="text-lg font-bold text-purple-600">{progress}%</div>
        </div>
      </div>

      {/* 3D Progress Bar */}
      <div className="relative w-full h-3 bg-gray-200 rounded-full shadow-inner border border-gray-300 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-full shadow-lg"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Progress bar glow effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>

        {/* Milestone indicators */}
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-between px-1">
          {Array.from({ length: totalQuestions }, (_, i) => (
            <motion.div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                i <= currentQuestion
                  ? "bg-white border-purple-200 shadow-lg"
                  : "bg-gray-300 border-gray-400"
              }`}
              animate={i === currentQuestion ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.5 }}
              style={{
                marginLeft: i === 0 ? "0" : "auto",
                marginRight: i === totalQuestions - 1 ? "0" : "auto",
              }}
            >
              {i <= currentQuestion && (
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
  );
}
