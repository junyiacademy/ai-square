'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SparklesIcon
} from '@heroicons/react/24/outline';

// Ikigai 四大支柱
interface IkigaiDimensions {
  passion: string[];      // 你熱愛什麼 (Love + Good at)
  mission: string[];      // 你的使命 (Love + World needs)
  profession: string[];   // 你的專業 (Good at + Paid for)
  vocation: string[];     // 你的志業 (World needs + Paid for)
  ikigai?: string;        // 四者交集的甜蜜點
}

// 探索階段
enum ExplorationPhase {
  INITIAL_CHOICE = 'initial_choice',    // 選擇探索模式
  OPEN_CHAT = 'open_chat',              // 開放式對話
  DEEP_DISCOVERY = 'deep_discovery',    // 深度探索
  PATTERN_ANALYSIS = 'pattern_analysis', // 模式分析
  STORY_CREATION = 'story_creation',    // 故事線生成
  PATH_SELECTION = 'path_selection'     // 路徑選擇
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface StoryPath {
  id: string;
  title: string;
  narrative: string;
  ikigaiAlignment: number;
  challenges: string[];
  rewards: string[];
  firstSteps: string[];
  visualMetaphor: string;
}

interface IkigaiExplorerProps {
  onComplete?: (profile: IkigaiDimensions, selectedPath: StoryPath) => void;
  onBack?: () => void;
}

export default function IkigaiExplorer({ onComplete, onBack }: IkigaiExplorerProps) {
  const { } = useTranslation('discovery');
  const [phase, setPhase] = useState<ExplorationPhase>(ExplorationPhase.INITIAL_CHOICE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [ikigaiProfile] = useState<Partial<IkigaiDimensions>>({
    passion: [],
    mission: [],
    profession: [],
    vocation: []
  });
  const [storyPaths, setStoryPaths] = useState<StoryPath[]>([]);
  const [refreshCount, setRefreshCount] = useState(0);
  const [cooldownTime, setCooldownTime] = useState(0);

  // 初始化歡迎訊息
  useEffect(() => {
    if (phase === ExplorationPhase.OPEN_CHAT && messages.length === 0) {
      const welcomeMessage: Message = {
        id: '1',
        role: 'assistant',
        content: '嗨！我想了解你內心真正的渴望。如果時間和金錢都不是問題，你最想做什麼？或是做什麼事情會讓你最開心？',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [phase, messages.length]);

  // 冷卻計時器
  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setTimeout(() => {
        setCooldownTime(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownTime]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isThinking) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    // 模擬 AI 回應（實際實作時會呼叫 Vertex AI）
    setTimeout(() => {
      const aiResponse = generateAIResponse(userMessage.content, messages.length);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsThinking(false);

      // 檢查是否應該進入下一階段
      if (messages.length >= 6) {
        analyzeAndGenerateStories();
      }
    }, 1500);
  };

  const generateAIResponse = (userInput: string, messageCount: number): string => {
    // 基於對話進度的動態回應
    const responses = {
      initial: [
        '聽起來很棒！那麼在這方面，有什麼是別人常說你做得特別好的？即使是很小的事也沒關係。',
        '很有意思！你覺得做這件事的什麼部分最讓你有成就感？',
        '真的很特別！如果要把這種快樂分享給別人，你會怎麼做？'
      ],
      middle: [
        '我開始看到一些模式了。如果用你的這個能力來改變世界，你最想解決什麼問題？',
        '很有洞察力！想像一下，有個人因為你的努力而改變了生活，那會是什麼樣子？',
        '這讓我想到一個問題：什麼樣的人會最需要你提供的價值？'
      ],
      deep: [
        '我們快要找到你的 Ikigai 了！你覺得這個世界願意為你的獨特貢獻付出什麼樣的回報？',
        '非常接近了！如果把你說的這些結合起來，你理想中的一天會是什麼樣子？',
        '太棒了！讓我為你生成幾個可能的故事線...'
      ]
    };

    if (messageCount < 3) {
      return responses.initial[Math.floor(Math.random() * responses.initial.length)];
    } else if (messageCount < 6) {
      return responses.middle[Math.floor(Math.random() * responses.middle.length)];
    } else {
      return responses.deep[Math.floor(Math.random() * responses.deep.length)];
    }
  };

  const analyzeAndGenerateStories = () => {
    setPhase(ExplorationPhase.PATTERN_ANALYSIS);
    
    // 模擬分析過程
    setTimeout(() => {
      // 生成示例故事線
      const mockStoryPaths: StoryPath[] = [
        {
          id: '1',
          title: '數位園丁',
          narrative: '培育線上社群，讓創意種子在數位土壤中開花結果。你將成為連結創作者與受眾的橋樑，用科技澆灌每一個創意靈魂。',
          ikigaiAlignment: 92,
          challenges: ['建立初始社群', '維持社群活力', '平衡商業與理想'],
          rewards: ['看見他人成長', '創造歸屬感', '可持續收入'],
          firstSteps: ['選擇一個你熱愛的創意領域', '建立第一個小型線上社群'],
          visualMetaphor: '🌱'
        },
        {
          id: '2',
          title: '故事編織者',
          narrative: '用 AI 技術賦予故事新的生命，創造跨越文化的敘事體驗。你的使命是讓每個人都能成為故事的主角。',
          ikigaiAlignment: 88,
          challenges: ['掌握 AI 工具', '保持人性溫度', '創新敘事形式'],
          rewards: ['激發想像力', '文化交流', '創意自由'],
          firstSteps: ['學習一個 AI 創作工具', '創作你的第一個互動故事'],
          visualMetaphor: '📚'
        },
        {
          id: '3',
          title: '未來學習設計師',
          narrative: '重新定義學習體驗，讓知識傳遞像遊戲一樣有趣。你將打造讓人們愛上學習的創新方式。',
          ikigaiAlignment: 85,
          challenges: ['理解學習心理', '技術整合', '評估學習成效'],
          rewards: ['改變生命軌跡', '知識民主化', '持續創新'],
          firstSteps: ['設計一個微型學習體驗', '找到第一批測試學習者'],
          visualMetaphor: '🎓'
        }
      ];

      setStoryPaths(mockStoryPaths);
      setPhase(ExplorationPhase.STORY_CREATION);
    }, 2000);
  };

  const handleRefreshStories = () => {
    if (refreshCount >= 3 || cooldownTime > 0) return;
    
    setRefreshCount(prev => prev + 1);
    setCooldownTime(5);
    analyzeAndGenerateStories();
  };

  const handleSelectPath = (path: StoryPath) => {
    // 完成選擇
    if (onComplete) {
      onComplete(ikigaiProfile as IkigaiDimensions, path);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50 relative">
      {/* Ikigai 視覺化背景 */}
      <div className="fixed right-8 top-8 w-64 h-64 opacity-10">
        <IkigaiDiagram data={ikigaiProfile} />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {/* 選擇探索模式 */}
          {phase === ExplorationPhase.INITIAL_CHOICE && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <h2 className="text-4xl font-bold mb-8">選擇你的探索方式</h2>
              
              <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                {/* 傳統評估 */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onBack}
                  className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-transparent hover:border-purple-200"
                >
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-bold mb-2">快速評估</h3>
                  <p className="text-gray-600">回答預設問題，快速找到適合的路徑</p>
                  <p className="text-sm text-purple-600 mt-4">⏱ 5-10 分鐘</p>
                </motion.button>

                {/* Ikigai 探索 */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPhase(ExplorationPhase.OPEN_CHAT)}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-purple-300"
                >
                  <div className="text-6xl mb-4">💭</div>
                  <h3 className="text-xl font-bold mb-2">Ikigai 深度探索</h3>
                  <p className="text-gray-600">透過開放對話，找到你的人生意義</p>
                  <p className="text-sm text-purple-600 mt-4">✨ 15-20 分鐘</p>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* 開放式對話 */}
          {phase === ExplorationPhase.OPEN_CHAT && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                <h3 className="text-2xl font-bold mb-4 flex items-center">
                  <SparklesIcon className="w-6 h-6 mr-2 text-purple-600" />
                  Ikigai 探索之旅
                </h3>
                
                {/* 對話區域 */}
                <div className="h-96 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg">
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                        message.role === 'user' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-200 text-gray-800'
                      }`}>
                        {message.content}
                      </div>
                    </motion.div>
                  ))}
                  
                  {isThinking && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-gray-200 px-4 py-3 rounded-2xl">
                        <div className="flex space-x-2">
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                            className="w-2 h-2 bg-gray-500 rounded-full"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                            className="w-2 h-2 bg-gray-500 rounded-full"
                          />
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                            className="w-2 h-2 bg-gray-500 rounded-full"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* 輸入區域 */}
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="分享你的想法..."
                    className="flex-1 px-4 py-3 border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-500"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isThinking}
                    className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50"
                  >
                    發送
                  </motion.button>
                </div>

                {/* 建議回覆 */}
                {messages.length === 1 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {['我想創造美好的事物', '我想幫助別人成長', '我想解決複雜問題', '我想說故事'].map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => setInputValue(suggestion)}
                        className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 分析中 */}
          {phase === ExplorationPhase.PATTERN_ANALYSIS && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center"
              >
                <SparklesIcon className="w-10 h-10 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold mb-4">正在分析你的 Ikigai 模式...</h3>
              <p className="text-gray-600">AI 正在理解你的熱情、才能、使命和價值</p>
            </motion.div>
          )}

          {/* 故事線選擇 */}
          {phase === ExplorationPhase.STORY_CREATION && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-3xl font-bold text-center mb-8">你的可能故事線 ✨</h2>
              
              <div className="grid gap-6 mb-6">
                {storyPaths.map((path, index) => (
                  <StoryCard
                    key={path.id}
                    path={path}
                    delay={index * 0.2}
                    onSelect={() => handleSelectPath(path)}
                  />
                ))}
              </div>

              {/* 刷新按鈕 */}
              <div className="text-center">
                <button
                  onClick={handleRefreshStories}
                  disabled={refreshCount >= 3 || cooldownTime > 0}
                  className={`px-6 py-3 rounded-lg font-medium ${
                    cooldownTime > 0 || refreshCount >= 3
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {cooldownTime > 0 
                    ? `${cooldownTime}秒後可刷新` 
                    : refreshCount >= 3
                    ? '已達刷新上限'
                    : '💭 換一批故事線'
                  }
                </button>
                {refreshCount > 0 && refreshCount < 3 && (
                  <p className="text-sm text-gray-500 mt-2">
                    剩餘刷新次數：{3 - refreshCount}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// 故事卡片組件
function StoryCard({ path, delay, onSelect }: {
  path: StoryPath;
  delay: number;
  onSelect: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      whileHover={{ scale: 1.02 }}
      onClick={onSelect}
      className="bg-white rounded-2xl shadow-xl p-8 cursor-pointer hover:shadow-2xl transition-all"
    >
      {/* 視覺隱喻 */}
      <div className="text-6xl mb-4">{path.visualMetaphor}</div>
      
      <h3 className="text-2xl font-bold mb-3">{path.title}</h3>
      <p className="text-gray-600 mb-6">{path.narrative}</p>
      
      {/* Ikigai 契合度 */}
      <div className="flex items-center mb-6">
        <span className="text-sm text-gray-500 mr-2">Ikigai 契合度</span>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${path.ikigaiAlignment}%` }}
            transition={{ duration: 1, delay: delay + 0.5 }}
          />
        </div>
        <span className="ml-2 text-sm font-bold text-purple-600">
          {path.ikigaiAlignment}%
        </span>
      </div>
      
      {/* 第一步預覽 */}
      <div className="bg-purple-50 rounded-lg p-4">
        <h4 className="font-semibold text-purple-900 mb-2">第一步：</h4>
        <ul className="space-y-1">
          {path.firstSteps.map((step, i) => (
            <li key={i} className="text-sm text-purple-700 flex items-start">
              <span className="mr-2">•</span>
              {step}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

// Ikigai 圖表組件
function IkigaiDiagram({ data }: { data: Partial<IkigaiDimensions> }) {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      {/* 四個圓圈 */}
      <circle cx="150" cy="150" r="100" fill="#8B5CF6" opacity="0.2" />
      <circle cx="250" cy="150" r="100" fill="#EC4899" opacity="0.2" />
      <circle cx="150" cy="250" r="100" fill="#3B82F6" opacity="0.2" />
      <circle cx="250" cy="250" r="100" fill="#10B981" opacity="0.2" />
      
      {/* 標籤 */}
      <text x="100" y="100" textAnchor="middle" className="fill-purple-600 text-sm font-bold">
        熱愛
      </text>
      <text x="300" y="100" textAnchor="middle" className="fill-pink-600 text-sm font-bold">
        擅長
      </text>
      <text x="100" y="300" textAnchor="middle" className="fill-blue-600 text-sm font-bold">
        世界需要
      </text>
      <text x="300" y="300" textAnchor="middle" className="fill-green-600 text-sm font-bold">
        能獲得回報
      </text>
      
      {/* 中心 Ikigai */}
      <text x="200" y="200" textAnchor="middle" className="fill-gray-800 text-lg font-bold">
        Ikigai
      </text>
    </svg>
  );
}