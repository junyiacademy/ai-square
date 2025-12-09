'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
}

interface FloatingParticlesProps {
  count?: number;
}

const COLOR_PALETTE = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function FloatingParticles({ count = 10 }: FloatingParticlesProps) {
  const [particles, setParticles] = useState<FloatingParticle[]>([]);

  useEffect(() => {
    const newParticles: FloatingParticle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 2 + 1,
        color: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]
      });
    }
    setParticles(newParticles);
  }, [count]);

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        y: (particle.y + particle.speed) % 100
      })));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 -z-10">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full opacity-20"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
          }}
          animate={{
            y: [`${particle.y}%`, `${(particle.y + 10) % 100}%`],
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{
            duration: particle.speed * 2,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
}
