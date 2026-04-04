"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface XpFloatingAnimationProps {
  xpEarned: number | null;
  onComplete: () => void;
}

export default function XpFloatingAnimation({ xpEarned, onComplete }: XpFloatingAnimationProps) {
  return (
    <AnimatePresence>
      {xpEarned !== null && xpEarned > 0 && (
        <motion.div
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -80, scale: 1.5 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          onAnimationComplete={onComplete}
          className="fixed bottom-32 right-8 z-40 pointer-events-none"
        >
          <span className="text-2xl font-bold text-yellow-500 drop-shadow-lg">
            +{xpEarned} XP
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
