'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  colorGradient: string;
  glowColor: string;
  index?: number;
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  colorGradient,
  glowColor,
  index = 0
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotateY: -30 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
      whileHover={{
        y: -10,
        rotateY: 5,
        transition: { duration: 0.2 }
      }}
      className={`relative group bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50 ${glowColor} shadow-2xl hover:shadow-3xl transition-all duration-300`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Glow border */}
      <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${colorGradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300`} />

      {/* Icon */}
      <motion.div
        whileHover={{ scale: 1.1, rotateZ: 5 }}
        className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${colorGradient} rounded-xl mb-4 shadow-lg group-hover:shadow-xl transition-shadow`}
      >
        <Icon className="w-6 h-6 text-white" />
      </motion.div>

      <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-200 transition-colors">
        {title}
      </h3>

      <p className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors leading-relaxed">
        {description}
      </p>

      {/* Decorative element */}
      <motion.div
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1]
        }}
        transition={{
          rotate: { duration: 10, repeat: Infinity, ease: "linear" },
          scale: { duration: 2, repeat: Infinity }
        }}
        className="absolute top-4 right-4 w-3 h-3 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full opacity-60"
      />
    </motion.div>
  );
}
