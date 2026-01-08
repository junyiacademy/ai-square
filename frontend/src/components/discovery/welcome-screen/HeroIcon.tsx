"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export default function HeroIcon() {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <motion.div
      animate={{
        rotateY: 360,
        scale: isHovering ? 1.1 : 1,
      }}
      transition={{
        rotateY: { duration: 8, repeat: Infinity, ease: "linear" },
        scale: { duration: 0.2 },
      }}
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => setIsHovering(false)}
      className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-3xl mb-4 shadow-2xl shadow-purple-500/50"
      style={{ transformStyle: "preserve-3d" }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      >
        <Sparkles className="w-12 h-12 text-white" />
      </motion.div>
    </motion.div>
  );
}
