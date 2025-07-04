'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface PathItem {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  path: string;
  screenshot: string;
  keyFeatures: string[];
  userNeed: string;
}

const pathData: PathItem[] = [
  {
    id: 1,
    title: '儀表板',
    subtitle: '學習指揮中心',
    description: '一站式掌握您的 AI 學習全貌，追蹤進度、查看成就、規劃下一步。',
    path: '/dashboard',
    screenshot: '/screenshots/1-dashboard.png',
    keyFeatures: [
      'AI 素養進度視覺化',
      '學習統計一目了然',
      '個人化推薦行動',
      '快速功能導航'
    ],
    userNeed: '我想知道我的學習成效如何？'
  },
  {
    id: 2,
    title: '評估',
    subtitle: 'AI 素養測驗',
    description: '25 題專業評估，深入了解您在 AI 四大領域的能力水平。',
    path: '/assessment',
    screenshot: '/screenshots/2-assessment.png',
    keyFeatures: [
      '四大 AI 素養領域',
      '25 題情境式題目',
      '雷達圖能力分析',
      '個人化建議報告'
    ],
    userNeed: '我的 AI 能力在哪個程度？'
  },
  {
    id: 3,
    title: '學習路徑',
    subtitle: '個人化成長計畫',
    description: '基於您的評估結果，推薦最適合的學習內容與進度安排。',
    path: '/learning-path',
    screenshot: '/screenshots/3-learning-path.png',
    keyFeatures: [
      '客製化課程推薦',
      '分級學習內容',
      '循序漸進規劃',
      '彈性學習時程'
    ],
    userNeed: '什麼課程適合我？'
  },
  {
    id: 4,
    title: 'PBL 實作',
    subtitle: '真實情境練習',
    description: '9 大實務情境，在 AI 導師陪伴下，做中學習 AI 應用。',
    path: '/pbl',
    screenshot: '/screenshots/4-pbl.png',
    keyFeatures: [
      'AI 機器人開發',
      'AI 穩定幣交易',
      'AI 求職訓練',
      '即時 AI 輔導'
    ],
    userNeed: '如何實際應用 AI？'
  },
  {
    id: 5,
    title: 'AI 顧問',
    subtitle: '隨時諮詢支援',
    description: '24/7 智能學習夥伴，記得您的學習脈絡，提供個人化建議。',
    path: '/chat',
    screenshot: '/screenshots/5-chat.png',
    keyFeatures: [
      '持續對話記憶',
      '個人化學習建議',
      '多輪深度對話',
      '學習問題解答'
    ],
    userNeed: '遇到問題找誰問？'
  },
  {
    id: 6,
    title: 'Discovery 探索',
    subtitle: '個人化職涯冒險',
    description: '透過 AI 評估找到適合的職涯路徑，在遊戲化的冒險中培養專業技能。',
    path: '/discovery',
    screenshot: '/screenshots/6-discovery.png',
    keyFeatures: [
      'AI 職涯匹配評估',
      '無限任務生成系統',
      '遊戲化學習體驗',
      '動態任務調整難度'
    ],
    userNeed: '哪個職涯方向適合我？'
  }
];

export default function JourneyPage() {
  const [selectedPath, setSelectedPath] = useState<number>(1);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                AI Square 用戶旅程
              </h1>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                六大關鍵路徑，打造完整 AI 學習體驗
              </p>
            </div>
            <Link
              href="/"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              立即體驗
            </Link>
          </div>
        </div>
      </div>

      {/* Journey Navigation */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto py-4">
            {pathData.map((path) => (
              <button
                key={path.id}
                onClick={() => setSelectedPath(path.id)}
                className={`flex items-center space-x-3 px-6 py-3 rounded-lg whitespace-nowrap transition-all ${
                  selectedPath === path.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                <span className="text-2xl font-bold">{path.id}</span>
                <div className="text-left">
                  <div className="font-semibold">{path.title}</div>
                  <div className="text-sm opacity-80">{path.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {pathData.map((path) => (
          <div
            key={path.id}
            className={`${selectedPath === path.id ? 'block' : 'hidden'}`}
          >
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Text Content */}
              <div className="space-y-8">
                <div>
                  <div className="flex items-center space-x-4 mb-4">
                    <span className="text-5xl font-bold text-blue-600">{path.id}</span>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {path.title}
                      </h2>
                      <p className="text-xl text-gray-600 dark:text-gray-400">
                        {path.subtitle}
                      </p>
                    </div>
                  </div>
                  <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                    {path.description}
                  </p>
                </div>

                {/* User Need */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
                    解決的用戶需求
                  </h3>
                  <p className="text-xl text-blue-800 dark:text-blue-400">
                    「{path.userNeed}」
                  </p>
                </div>

                {/* Key Features */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    核心功能
                  </h3>
                  <ul className="space-y-3">
                    {path.keyFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <svg className="w-6 h-6 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-4">
                  <Link
                    href={path.path}
                    className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    立即體驗此功能
                  </Link>
                  <button
                    onClick={() => {
                      const next = path.id < 6 ? path.id + 1 : 1;
                      setSelectedPath(next);
                    }}
                    className="px-8 py-4 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors font-semibold"
                  >
                    下一個路徑 →
                  </button>
                </div>
              </div>

              {/* Screenshot */}
              <div className="relative">
                <div className="rounded-xl overflow-hidden shadow-2xl">
                  <img 
                    src={path.screenshot}
                    alt={`${path.title} 截圖`}
                    className="w-full h-auto"
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 bg-blue-600 text-white rounded-full w-20 h-20 flex items-center justify-center font-bold text-2xl shadow-lg">
                  {path.id}/6
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Overview */}
      <div className="bg-gray-100 dark:bg-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center">
            完整學習循環
          </h3>
          <div className="flex flex-wrap justify-center items-center gap-4">
            {pathData.map((path, index) => (
              <div key={path.id} className="flex items-center">
                <button
                  onClick={() => setSelectedPath(path.id)}
                  className="px-6 py-3 bg-white dark:bg-slate-700 rounded-lg shadow hover:shadow-lg transition-all cursor-pointer"
                >
                  <span className="font-bold text-blue-600">{path.id}.</span>
                  <span className="ml-2 text-gray-700 dark:text-gray-300">{path.title}</span>
                </button>
                {index < pathData.length - 1 && (
                  <svg className="w-8 h-8 text-gray-400 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}