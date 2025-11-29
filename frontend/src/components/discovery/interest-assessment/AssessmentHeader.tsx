import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function AssessmentHeader() {
  return (
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
          <Sparkles className="w-6 h-6 text-white" />
        </motion.div>
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          AI 興趣分析儀
        </h2>
      </div>
      <p className="text-sm text-gray-600 font-medium">
        讓 AI 深度分析你的潛能和興趣方向
      </p>
    </motion.div>
  );
}
