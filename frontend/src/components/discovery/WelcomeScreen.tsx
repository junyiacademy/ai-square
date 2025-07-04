'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlayIcon,
  SparklesIcon,
  BoltIcon,
  CpuChipIcon,
  RocketLaunchIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline';
import { 
  FireIcon,
  StarIcon
} from '@heroicons/react/24/solid';

interface WelcomeScreenProps {
  onStartJourney: () => void;
}

interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  color: string;
}

export default function WelcomeScreen({ onStartJourney }: WelcomeScreenProps) {
  const { t } = useTranslation('discovery');
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  // 動態標語輪播
  const phrases = [
    '🚀 進入無限冒險',
    '🎮 體驗 AI 驅動的冒險副本',
    '✨ 重新定義你的冒險旅程',
    '🌟 開啟無限可能的未來',
    '💫 沉浸式冒險體驗'
  ];

  // 初始化浮動粒子 - 減少粒子數量避免性能問題
  useEffect(() => {
    const newParticles: FloatingParticle[] = [];
    for (let i = 0; i < 10; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 2 + 1,
        color: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'][Math.floor(Math.random() * 5)]
      });
    }
    setParticles(newParticles);
  }, []);

  // 粒子動畫
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        y: (particle.y + particle.speed) % 100
      })));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // 標語輪播
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhrase(prev => (prev + 1) % phrases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [phrases.length]);

  const features = [
    {
      key: 'immersive',
      icon: RocketLaunchIcon,
      color: 'from-purple-500 to-pink-500',
      glow: 'shadow-purple-500/25'
    },
    {
      key: 'ai_powered', 
      icon: CpuChipIcon,
      color: 'from-blue-500 to-cyan-500',
      glow: 'shadow-blue-500/25'
    },
    {
      key: 'real_time',
      icon: BoltIcon,
      color: 'from-green-500 to-emerald-500',
      glow: 'shadow-green-500/25'
    }
  ];

  return (
    <div className="relative h-screen overflow-hidden flex items-center justify-center">
      {/* 動態背景粒子 */}
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

      {/* 漸層背景 */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.1),transparent_70%)]" />

      <div className="relative z-10 text-center text-white px-4 w-full max-h-screen overflow-y-auto py-8">
        {/* 動態標語 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8"
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

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          {/* 3D 旋轉圖標 */}
          <motion.div
            animate={{ 
              rotateY: 360,
              scale: isHovering ? 1.1 : 1
            }}
            transition={{ 
              rotateY: { duration: 8, repeat: Infinity, ease: "linear" },
              scale: { duration: 0.2 }
            }}
            onHoverStart={() => setIsHovering(true)}
            onHoverEnd={() => setIsHovering(false)}
            className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 rounded-3xl mb-4 shadow-2xl shadow-purple-500/50"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <SparklesIcon className="w-12 h-12 text-white" />
            </motion.div>
          </motion.div>
          
          <motion.h1 
            className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
            animate={{ 
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] 
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            冒險世界
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-gray-300 mb-4 max-w-3xl mx-auto font-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            🎮 像玩遊戲一樣冒險你的未來 • AI 驅動的沉浸式體驗
          </motion.p>
          
          {/* 發光啟動按鈕 */}
          <motion.button
            onClick={onStartJourney}
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 0 30px rgba(168, 85, 247, 0.6)"
            }}
            whileTap={{ scale: 0.98 }}
            className="group relative inline-flex items-center space-x-3 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-2xl shadow-purple-500/30 border border-purple-400/30 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <RocketLaunchIcon className="w-6 h-6" />
            </motion.div>
            <span className="relative z-10">開始冒險之旅</span>
            
            {/* 按鈕光效 */}
            <motion.div
              className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400 to-cyan-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"
              animate={{
                background: [
                  'linear-gradient(45deg, #a855f7, #3b82f6)',
                  'linear-gradient(45deg, #3b82f6, #06b6d4)',
                  'linear-gradient(45deg, #06b6d4, #a855f7)'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.button>
          
          {/* 互動提示 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-6 flex items-center justify-center space-x-2 text-purple-300"
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <StarIcon className="w-4 h-4" />
            </motion.div>
            <span className="text-sm">即時 AI 回饋 • 個人化體驗 • 零傳統考試</span>
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            >
              <StarIcon className="w-4 h-4" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Gaming Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            
            return (
              <motion.div
                key={feature.key}
                initial={{ opacity: 0, y: 20, rotateY: -30 }}
                animate={{ opacity: 1, y: 0, rotateY: 0 }}
                transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
                whileHover={{ 
                  y: -10, 
                  rotateY: 5,
                  transition: { duration: 0.2 }
                }}
                className={`relative group bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-lg rounded-2xl p-6 border border-gray-700/50 ${feature.glow} shadow-2xl hover:shadow-3xl transition-all duration-300`}
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* 發光邊框 */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300`} />
                
                {/* 圖標 */}
                <motion.div
                  whileHover={{ scale: 1.1, rotateZ: 5 }}
                  className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl mb-4 shadow-lg group-hover:shadow-xl transition-shadow`}
                >
                  <Icon className="w-6 h-6 text-white" />
                </motion.div>
                
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-200 transition-colors">
                  {feature.key === 'immersive' && '🎮 沉浸式體驗'}
                  {feature.key === 'ai_powered' && '🤖 AI 驅動'}
                  {feature.key === 'real_time' && '⚡ 即時反饋'}
                </h3>
                
                <p className="text-sm text-gray-300 group-hover:text-gray-200 transition-colors leading-relaxed">
                  {feature.key === 'immersive' && '像玩 AAA 遊戲一樣的視覺效果和互動體驗，告別無聊的傳統模式'}
                  {feature.key === 'ai_powered' && '最先進的 AI 技術提供個人化指導，每個決定都會影響你的未來發展路徑'}
                  {feature.key === 'real_time' && '每個動作立即獲得智能回饋，實時調整冒險策略和未來建議'}
                </p>
                
                {/* 裝飾元素 */}
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
          })}
        </motion.div>
        
        {/* 底部 CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-8 text-center"
        >
          <div className="flex items-center justify-center space-x-4 text-purple-300">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <CircleStackIcon className="w-5 h-5" />
            </motion.div>
            <span className="text-sm">準備好重新定義你的未來了嗎？</span>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <FireIcon className="w-5 h-5 text-orange-400" />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}