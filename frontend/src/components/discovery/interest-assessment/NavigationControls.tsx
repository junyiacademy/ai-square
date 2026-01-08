import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface NavigationControlsProps {
  canGoPrevious: boolean;
  canGoNext: boolean;
  isAnimating: boolean;
  isLastQuestion: boolean;
  selectedCount: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function NavigationControls({
  canGoPrevious,
  canGoNext,
  isAnimating,
  isLastQuestion,
  selectedCount,
  onPrevious,
  onNext,
}: NavigationControlsProps) {
  return (
    <div className="flex justify-between items-center flex-shrink-0">
      {/* Selection indicator */}
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center flex-1 mx-4"
        >
          <p className="text-sm text-purple-600 font-medium">
            已選擇 {selectedCount} 個選項
          </p>
        </motion.div>
      )}

      {/* Previous button */}
      <motion.button
        onClick={onPrevious}
        disabled={!canGoPrevious || isAnimating}
        whileHover={canGoPrevious ? { scale: 1.05 } : {}}
        whileTap={canGoPrevious ? { scale: 0.95 } : {}}
        className={`
          flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200
          ${
            canGoPrevious && !isAnimating
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
              : "bg-gray-50 text-gray-400 cursor-not-allowed"
          }
        `}
      >
        <ChevronLeft className="w-5 h-5" />
        <span>上一題</span>
      </motion.button>

      {/* Next button */}
      <motion.button
        onClick={onNext}
        disabled={!canGoNext || isAnimating}
        whileHover={canGoNext ? { scale: 1.05 } : {}}
        whileTap={canGoNext ? { scale: 0.95 } : {}}
        className={`
          flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200
          ${
            canGoNext && !isAnimating
              ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-xl"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }
        `}
      >
        <span>{isLastQuestion ? "完成分析" : "下一題"}</span>
        {!isLastQuestion && <ChevronRight className="w-5 h-5" />}
      </motion.button>
    </div>
  );
}
