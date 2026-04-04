"use client";

import React, { useEffect, useRef, useState } from "react";
import { Trophy, Star, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface LevelUpModalProps {
  isOpen: boolean;
  newLevel: number;
  xpEarned?: number;
  onClose: () => void;
}

const LEVEL_NAMES: Record<number, string> = {
  1: "見習技師",
  2: "學徒工程師",
  3: "初級工程師",
  4: "中級工程師",
  5: "資深工程師",
  6: "專家",
  7: "大師",
  8: "傳說",
  9: "先驅者",
  10: "創世者",
};

function getLevelName(level: number, t: (k: string, opts?: Record<string, unknown>) => string): string {
  const key = String(Math.min(level, 10));
  const translated = t(`gamification.levelName.${key}`, { defaultValue: "" });
  if (translated && translated !== `gamification.levelName.${key}`) {
    return translated;
  }
  return LEVEL_NAMES[level] || LEVEL_NAMES[10];
}

export default function LevelUpModal({
  isOpen,
  newLevel,
  xpEarned,
  onClose,
}: LevelUpModalProps) {
  const { t } = useTranslation("discovery");
  const [showContent, setShowContent] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(timer);
    }
    setShowContent(false);
  }, [isOpen]);

  // Auto-close after 5 seconds
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  // Confetti effect using CSS animation (no external dependency needed)
  useEffect(() => {
    if (!isOpen) return;

    // Simple confetti using canvas
    const canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pieces: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    const colors = [
      "#9333ea",
      "#3b82f6",
      "#f59e0b",
      "#10b981",
      "#ef4444",
      "#ec4899",
    ];

    for (let i = 0; i < 80; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: -10,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    let animId: number;
    const startTime = Date.now();

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      pieces.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.vy += 0.05; // gravity

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2);
        ctx.restore();
      });

      if (Date.now() - startTime < 3000) {
        animId = requestAnimationFrame(animate);
      } else {
        document.body.removeChild(canvas);
      }
    };

    animate();

    confettiRef.current = () => {
      cancelAnimationFrame(animId);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    };

    return () => {
      cancelAnimationFrame(animId);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    };
  }, [isOpen]);

  const levelName = getLevelName(newLevel, t);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 15 }}
            className="relative bg-gradient-to-b from-purple-600 to-blue-600 rounded-3xl p-8 max-w-sm mx-4 text-center text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Stars animation */}
            <div className="relative">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                    x: [0, (i % 2 === 0 ? 1 : -1) * (30 + i * 15)],
                    y: [0, -40 - i * 10],
                  }}
                  transition={{
                    delay: 0.3 + i * 0.15,
                    duration: 1.5,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                </motion.div>
              ))}

              {/* Trophy with glow */}
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", damping: 10 }}
                className="inline-flex items-center justify-center w-20 h-20 bg-yellow-400 rounded-full mb-4 shadow-lg shadow-yellow-400/50"
              >
                <Trophy className="w-10 h-10 text-yellow-800" />
              </motion.div>
            </div>

            {/* Level Up Content */}
            {showContent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <p className="text-purple-200 text-sm font-medium mb-1 uppercase tracking-widest">
                  {t("gamification.levelUp")}
                </p>
                <div className="text-7xl font-black mb-2 drop-shadow-lg">
                  {newLevel}
                </div>
                <div className="text-xl font-bold text-yellow-300 mb-3">
                  {levelName}
                </div>
                {xpEarned !== undefined && (
                  <div className="inline-flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 text-sm mb-3">
                    <span className="text-yellow-300 font-bold">+{xpEarned} XP</span>
                  </div>
                )}
                <p className="text-purple-100 text-sm">
                  {t("gamification.levelUp")} — {levelName}
                </p>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
