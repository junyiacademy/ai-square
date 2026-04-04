"use client";

import React, { useEffect } from "react";
import { Trophy, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AchievementToastProps {
  achievement: {
    id: string;
    name: string;
    xpReward: number;
  } | null;
  onDismiss: () => void;
}

export default function AchievementToast({ achievement, onDismiss }: AchievementToastProps) {
  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (achievement) {
      const timer = setTimeout(onDismiss, 4000);
      return () => clearTimeout(timer);
    }
  }, [achievement, onDismiss]);

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          initial={{ opacity: 0, y: -100, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -100, x: "-50%" }}
          transition={{ type: "spring", damping: 20 }}
          className="fixed top-4 left-1/2 z-50 max-w-sm w-full"
        >
          <div className="bg-white rounded-xl shadow-xl border border-yellow-200 p-4 mx-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-yellow-600 uppercase tracking-wider">
                  Achievement Unlocked
                </p>
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {achievement.name}
                </p>
                <p className="text-xs text-gray-500">
                  +{achievement.xpReward} XP
                </p>
              </div>

              <button
                onClick={onDismiss}
                className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
