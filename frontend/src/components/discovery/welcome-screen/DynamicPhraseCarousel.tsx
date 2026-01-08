"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DynamicPhraseCarouselProps {
  phrases: string[];
  intervalMs?: number;
}

export default function DynamicPhraseCarousel({
  phrases,
  intervalMs = 3000,
}: DynamicPhraseCarouselProps) {
  const [currentPhrase, setCurrentPhrase] = useState(0);

  useEffect(() => {
    if (phrases.length === 0) return;

    const interval = setInterval(() => {
      setCurrentPhrase((prev) => (prev + 1) % phrases.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [phrases.length, intervalMs]);

  if (phrases.length === 0) {
    return <div data-testid="phrase-carousel" className="mb-8" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-8"
      data-testid="phrase-carousel"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPhrase}
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.8 }}
          transition={{ duration: 0.5 }}
          className="text-lg md:text-xl font-medium text-purple-300 mb-4"
        >
          {phrases[currentPhrase]}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
