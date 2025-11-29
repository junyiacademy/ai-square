'use client';

import React from 'react';
import { Zap, Cpu, Rocket, Database, Flame, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  FloatingParticles,
  DynamicPhraseCarousel,
  StartButton,
  FeatureCard,
  HeroIcon
} from './welcome-screen';

interface WelcomeScreenProps {
  onStartJourney: () => void;
}

export default function WelcomeScreen({ onStartJourney }: WelcomeScreenProps) {
  const { t } = useTranslation('discovery');

  const phrases = t('welcomeScreen.phrases', { returnObjects: true }) as string[];

  const features = [
    {
      key: 'immersive',
      icon: Rocket,
      color: 'from-purple-500 to-pink-500',
      glow: 'shadow-purple-500/25'
    },
    {
      key: 'ai_powered',
      icon: Cpu,
      color: 'from-blue-500 to-cyan-500',
      glow: 'shadow-blue-500/25'
    },
    {
      key: 'real_time',
      icon: Zap,
      color: 'from-green-500 to-emerald-500',
      glow: 'shadow-green-500/25'
    }
  ];

  return (
    <div className="relative h-screen overflow-hidden flex items-center justify-center">
      <FloatingParticles />

      {/* 漸層背景 */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.1),transparent_70%)]" />

      <div className="relative z-10 text-center text-white px-4 w-full max-h-screen overflow-y-auto py-8">
        <DynamicPhraseCarousel phrases={phrases} />

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <HeroIcon />

          <motion.h1
            className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent"
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {t('welcomeScreen.title')}
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-gray-300 mb-4 max-w-3xl mx-auto font-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {t('welcomeScreen.subtitle')}
          </motion.p>

          <StartButton onClick={onStartJourney} label={t('welcomeScreen.startJourney')} />

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
              <Star className="w-4 h-4" />
            </motion.div>
            <span className="text-sm">{t('welcomeScreen.instantFeedback')}</span>
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
            >
              <Star className="w-4 h-4" />
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
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.key}
              icon={feature.icon}
              title={t(`welcomeScreen.features.${feature.key}.title`)}
              description={t(`welcomeScreen.features.${feature.key}.description`)}
              colorGradient={feature.color}
              glowColor={feature.glow}
              index={index}
            />
          ))}
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
              <Database className="w-5 h-5" />
            </motion.div>
            <span className="text-sm">{t('welcomeScreen.readyToRedefine')}</span>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Flame className="w-5 h-5 text-orange-400" />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
