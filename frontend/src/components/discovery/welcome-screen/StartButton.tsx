"use client";

import React from "react";
import { motion } from "framer-motion";
import { Rocket } from "lucide-react";

interface StartButtonProps {
  onClick: () => void;
  label: string;
}

export default function StartButton({ onClick, label }: StartButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{
        scale: 1.05,
        boxShadow: "0 0 30px rgba(168, 85, 247, 0.6)",
      }}
      whileTap={{ scale: 0.98 }}
      className="group relative inline-flex items-center space-x-3 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-2xl shadow-purple-500/30 border border-purple-400/30 backdrop-blur-sm"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Rocket className="w-6 h-6" />
      </motion.div>
      <span className="relative z-10">{label}</span>

      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400 to-cyan-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
        animate={{
          background: [
            "linear-gradient(45deg, #a855f7, #3b82f6)",
            "linear-gradient(45deg, #3b82f6, #06b6d4)",
            "linear-gradient(45deg, #06b6d4, #a855f7)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.button>
  );
}
