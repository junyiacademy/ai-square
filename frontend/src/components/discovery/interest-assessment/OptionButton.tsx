import { motion } from "framer-motion";
import type { QuestionOption } from "./types";

interface OptionButtonProps {
  option: QuestionOption;
  isSelected: boolean;
  index: number;
  onSelect: (optionId: string) => void;
}

export function OptionButton({
  option,
  isSelected,
  index,
  onSelect,
}: OptionButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        delay: index * 0.15,
        type: "spring",
        stiffness: 100,
      }}
    >
      <motion.button
        onClick={() => onSelect(option.id)}
        whileHover={{
          scale: 1.02,
          boxShadow: "0 8px 25px rgba(168, 85, 247, 0.15)",
        }}
        whileTap={{ scale: 0.98 }}
        className={`
          relative w-full p-4 text-left rounded-xl border-2 transition-all duration-300 group overflow-hidden
          ${
            isSelected
              ? "border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-800 shadow-lg"
              : "border-gray-200 bg-white hover:border-purple-300 hover:bg-gradient-to-br hover:from-purple-25 hover:to-white"
          }
        `}
      >
        {/* Background glow effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
          animate={isSelected ? { opacity: [0, 0.1, 0] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Selection indicator (top right) */}
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
            {/* Checkbox indicator */}
            <motion.div
              className={`
                mt-1 w-8 h-8 rounded-xl border-3 transition-all duration-300 flex items-center justify-center
                ${
                  isSelected
                    ? "border-purple-500 bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg"
                    : "border-gray-300 bg-white group-hover:border-purple-400"
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
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </motion.svg>
              )}
            </motion.div>

            <div className="flex-1">
              <span
                className={`font-semibold text-base transition-colors ${
                  isSelected
                    ? "text-purple-800"
                    : "text-gray-800 group-hover:text-purple-700"
                }`}
              >
                {option.text}
              </span>
            </div>
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}
