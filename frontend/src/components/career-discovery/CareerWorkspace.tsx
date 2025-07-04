'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon,
  PlayIcon,
  CheckIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  ClockIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

interface UserAchievements {
  badges: string[];
  totalXp: number;
  level: number;
  completedTasks: string[];
}

interface CareerWorkspaceProps {
  careerId: string;
  achievements: UserAchievements;
  onTaskComplete: (taskId: string, xpGained: number, skillsGained: string[]) => void;
  onBackToCareers: () => void;
}

interface Task {
  id: string;
  title: string;
  description: string;
  duration: string;
}

interface CareerData {
  title: string;
  skills: string[];
  aiAssistants: string[];
  tasks: Task[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function CareerWorkspace({ 
  careerId, 
  achievements, 
  onTaskComplete, 
  onBackToCareers 
}: CareerWorkspaceProps) {
  const { t } = useTranslation('careerDiscovery');
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isTaskActive, setIsTaskActive] = useState(false);
  const [taskProgress, setTaskProgress] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Get career data from translations
  const careerData = t(`careers.${careerId}`, { returnObjects: true }) as CareerData;
  const currentTask = careerData.tasks[currentTaskIndex];
  const isLastTask = currentTaskIndex === careerData.tasks.length - 1;

  // Initialize AI greeting - only when careerId changes
  useEffect(() => {
    const data = t(`careers.${careerId}`, { returnObjects: true }) as CareerData;
    const greetingMessage: ChatMessage = {
      id: '1',
      sender: 'ai',
      text: t('aiAssistant.greeting', {
        role: data.aiAssistants[0] || 'Assistant',
        career: data.title
      }),
      timestamp: new Date()
    };
    setChatMessages([greetingMessage]);
  }, [careerId, t]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleStartTask = () => {
    setIsTaskActive(true);
    setTaskProgress(0);
    
    // Add AI task introduction
    const taskIntroMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'ai',
      text: t('aiAssistant.taskIntro'),
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, taskIntroMessage]);

    // Simulate task progress
    const progressInterval = setInterval(() => {
      setTaskProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  };

  const handleCompleteTask = () => {
    setIsTaskActive(false);
    
    // Calculate XP and skills
    const xpGained = 50 + (currentTaskIndex * 10);
    const skillsGained = careerData.skills.slice(0, 2); // Award first 2 skills
    
    // Call parent callback
    onTaskComplete(currentTask.id, xpGained, skillsGained);
    
    // Add completion message
    const completionMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'ai',
      text: getRandomEncouragement(),
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, completionMessage]);
  };

  const handleNextTask = () => {
    if (!isLastTask) {
      setCurrentTaskIndex(prev => prev + 1);
      setTaskProgress(0);
      setIsTaskActive(false);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: newMessage,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');

    // Simulate AI typing
    setIsTyping(true);
    setTimeout(() => {
      const aiResponse = generateAIResponse(newMessage);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiResponse,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const generateAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    const taskProgress = Math.round((currentTaskIndex + 1) / careerData.tasks.length * 100);
    
    // 動態生成不同情境的回應
    const responses = {
      help: [
        `🚀 當然！我是你的 AI 職業導師，專門負責「${currentTask.title}」這個挑戰。讓我們一起突破這個關卡！`,
        `💡 太好了！讓我用最新的 AI 分析來幫你解決這個問題。我已經為你準備了個人化的解決方案...`,
        `⚡ 檢測到求助信號！正在啟動專屬輔導模式...分析完成！這個任務的核心在於...`
      ],
      how: [
        `🎯 讓我用 AI 數據分析來拆解這個任務：\n步驟1⃣ 理解核心概念\n步驟2⃣ 實際操作練習\n步驟3⃣ 創新應用。你想從哪裡開始？`,
        `🧠 基於你目前 ${taskProgress}% 的進度，我建議採用「漸進式學習法」。首先我們來建立基礎認知框架...`,
        `🔍 AI 分析顯示：這個任務最適合用「實作導向」的方法。讓我為你設計一個個人化的學習路徑...`
      ],
      finish: [
        `🎉 Amazing！你剛剛完成了一個重要里程碑！這種解決問題的方式完全符合現代${careerData.title}的工作模式！`,
        `🌟 太厲害了！你展現的思維模式讓我想到業界頂尖的${careerData.title}。繼續保持這種創新精神！`,
        `🚀 恭喜突破！你剛才的表現已經超越了 80% 的同儕。這就是未來職場需要的能力！`
      ],
      encourage: [
        `💪 你的學習速度讓我印象深刻！目前進度 ${taskProgress}%，距離成為${careerData.title}專家又近了一步！`,
        `⭐ 這個問題很有挑戰性，但我看到你正在用正確的方法思考。${careerData.title}就是需要這種創新思維！`,
        `🎯 很好的問題！讓我用最新的產業趨勢來回答你...這正是現在${careerData.title}領域最熱門的話題！`
      ]
    };
    
    if (lowerMessage.includes('help') || lowerMessage.includes('幫助')) {
      return responses.help[Math.floor(Math.random() * responses.help.length)];
    } else if (lowerMessage.includes('how') || lowerMessage.includes('怎麼')) {
      return responses.how[Math.floor(Math.random() * responses.how.length)];
    } else if (lowerMessage.includes('finish') || lowerMessage.includes('完成')) {
      return responses.finish[Math.floor(Math.random() * responses.finish.length)];
    } else {
      return responses.encourage[Math.floor(Math.random() * responses.encourage.length)];
    }
  };

  const getRandomEncouragement = (): string => {
    // 使用內建的鼓勵語句，避免 translation 依賴性問題
    const encouragements = [
      `太棒了！你已經展現出真正的${careerData.title}思維。`,
      `優秀！這就是專業${careerData.title}的工作方式。`,
      `你的創意讓人印象深刻，非常適合${careerData.title}這個領域！`
    ];
    return encouragements[Math.floor(Math.random() * encouragements.length)];
  };

  const completedTasksCount = achievements.completedTasks.filter(taskId => 
    careerData.tasks.some(task => task.id === taskId)
  ).length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBackToCareers}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="font-medium">{t('workspace.backToCareers')}</span>
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 px-3 py-1 rounded-full">
              <span className="text-sm font-medium text-purple-700">
                {completedTasksCount}/{careerData.tasks.length} 任務完成
              </span>
            </div>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900">
          {t('workspace.title', { career: careerData.title })}
        </h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Task Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Task */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <SparklesIcon className="w-5 h-5 text-purple-600" />
                <span>{t('workspace.currentTask')}</span>
              </h2>
              <span className="text-sm text-gray-500 flex items-center space-x-1">
                <ClockIcon className="w-4 h-4" />
                <span>{currentTask.duration}</span>
              </span>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {currentTask.title}
              </h3>
              <p className="text-gray-600">
                {currentTask.description}
              </p>
            </div>

            {/* Task Progress - 遊戲化進度條 */}
            {isTaskActive && (
              <div className="mb-6">
                <div className="flex justify-between items-center text-sm mb-3">
                  <div className="flex items-center space-x-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full"
                    />
                    <span className="text-gray-700 font-medium">任務進行中</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-purple-600 font-bold">{Math.round(taskProgress)}%</span>
                    <span className="text-xs text-gray-500">完成度</span>
                  </div>
                </div>
                
                {/* 3D 風格進度條 */}
                <div className="relative">
                  <div className="w-full bg-gradient-to-r from-gray-200 to-gray-300 rounded-full h-4 shadow-inner border border-gray-300">
                    <motion.div
                      className="relative bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 h-full rounded-full shadow-lg border border-purple-300 overflow-hidden"
                      animate={{ width: `${taskProgress}%` }}
                      transition={{ duration: 0.1 }}
                    >
                      {/* 光效動畫 */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      />
                    </motion.div>
                  </div>
                  
                  {/* 進度里程碑 */}
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-between px-2">
                    {[25, 50, 75, 100].map((milestone) => (
                      <motion.div
                        key={milestone}
                        className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                          taskProgress >= milestone
                            ? 'bg-yellow-400 border-yellow-500 shadow-lg'
                            : 'bg-gray-300 border-gray-400'
                        }`}
                        animate={taskProgress >= milestone ? { scale: [1, 1.3, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      />
                    ))}
                  </div>
                </div>
                
                {/* 進度獎勵提示 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: taskProgress > 50 ? 1 : 0 }}
                  className="mt-2 text-center"
                >
                  <span className="text-xs text-green-600 font-medium">🎉 超過一半了！繼續加油！</span>
                </motion.div>
              </div>
            )}

            {/* Task Actions */}
            <div className="flex space-x-3">
              {!isTaskActive ? (
                <motion.button
                  onClick={handleStartTask}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
                >
                  <PlayIcon className="w-5 h-5" />
                  <span>{t('workspace.startTask')}</span>
                </motion.button>
              ) : taskProgress >= 100 ? (
                <motion.button
                  onClick={handleCompleteTask}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
                >
                  <CheckIcon className="w-5 h-5" />
                  <span>{t('workspace.completeTask')}</span>
                </motion.button>
              ) : null}

              {taskProgress >= 100 && !isLastTask && (
                <motion.button
                  onClick={handleNextTask}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center space-x-2 bg-gray-600 text-white px-6 py-3 rounded-xl font-medium"
                >
                  <span>{t('workspace.nextTask')}</span>
                </motion.button>
              )}
            </div>
          </div>

          {/* Task List */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">所有任務</h3>
            <div className="space-y-3">
              {careerData.tasks.map((task, index) => {
                const isCompleted = achievements.completedTasks.includes(task.id);
                const isCurrent = index === currentTaskIndex;
                
                return (
                  <div
                    key={task.id}
                    className={`
                      p-4 rounded-xl border-2 transition-all duration-200
                      ${isCurrent 
                        ? 'border-purple-500 bg-purple-50' 
                        : isCompleted
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`
                        flex items-center justify-center w-6 h-6 rounded-full
                        ${isCurrent 
                          ? 'bg-purple-500 text-white'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                        }
                      `}>
                        {isCompleted ? (
                          <CheckIcon className="w-4 h-4" />
                        ) : (
                          <span className="text-xs font-medium">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <p className="text-sm text-gray-600">{task.duration}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Assistant Chat */}
        <div className="bg-white rounded-2xl shadow-lg p-6 h-fit lg:sticky lg:top-6">
          <div className="flex items-center space-x-2 mb-4">
            <CpuChipIcon className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t('workspace.aiAssistant')}
            </h3>
          </div>
          
          {/* Chat Messages - 遊戲化聊天介面 */}
          <div 
            ref={chatContainerRef}
            className="h-80 overflow-y-auto mb-4 rounded-xl p-4 bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200 shadow-inner"
          >
            <div className="space-y-4">
              {chatMessages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 15, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-end space-x-2 ${message.sender === 'user' ? 'justify-end flex-row-reverse space-x-reverse' : 'justify-start'}`}
                >
                  {/* AI 頭像 */}
                  {message.sender === 'ai' && (
                    <motion.div
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg"
                    >
                      <CpuChipIcon className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                  
                  {/* 用戶頭像 */}
                  {message.sender === 'user' && (
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white text-xs font-bold">你</span>
                    </div>
                  )}
                  
                  {/* 消息氣泡 */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className={`
                      relative max-w-xs p-4 rounded-2xl text-sm font-medium shadow-lg
                      ${message.sender === 'user' 
                        ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white' 
                        : 'bg-white text-gray-800 border border-gray-200'
                      }
                    `}
                  >
                    {/* 消息內容 */}
                    <div className="relative z-10">
                      {message.text}
                    </div>
                    
                    {/* AI 消息的特效 */}
                    {message.sender === 'ai' && (
                      <motion.div
                        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-100 to-purple-100 opacity-0"
                        animate={{ opacity: [0, 0.3, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                    
                    {/* 消息尾巴 */}
                    <div className={`
                      absolute top-4 w-0 h-0
                      ${message.sender === 'user'
                        ? 'right-0 border-l-8 border-l-purple-600 border-t-4 border-b-4 border-t-transparent border-b-transparent'
                        : 'left-0 border-r-8 border-r-white border-t-4 border-b-4 border-t-transparent border-b-transparent'
                      }
                    `} />
                  </motion.div>
                </motion.div>
              ))}
              
              {/* AI 打字動畫 */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-end space-x-2 justify-start"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg"
                  >
                    <CpuChipIcon className="w-4 h-4 text-white" />
                  </motion.div>
                  
                  <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-lg">
                    <div className="flex space-x-1">
                      <motion.div
                        className="w-2 h-2 bg-purple-400 rounded-full"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-blue-400 rounded-full"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-cyan-400 rounded-full"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
          
          {/* Chat Input - 遊戲化輸入框 */}
          <div className="relative">
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="💬 向你的 AI 導師提問..."
                  className="w-full border-2 border-purple-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200 placeholder-gray-400"
                />
                
                {/* 輸入框發光效果 */}
                <motion.div
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 -z-10"
                  animate={{ opacity: newMessage.length > 0 ? 0.1 : 0 }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              
              <motion.button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                whileHover={newMessage.trim() ? { scale: 1.05 } : {}}
                whileTap={newMessage.trim() ? { scale: 0.95 } : {}}
                className="relative bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <motion.div
                  animate={newMessage.trim() ? { rotate: [0, 15, 0] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </motion.div>
                
                {/* 按鈕發光效果 */}
                {newMessage.trim() && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-white opacity-20"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </motion.button>
            </div>
            
            {/* 快捷建議按鈕 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: newMessage.length === 0 ? 1 : 0, y: newMessage.length === 0 ? 0 : 10 }}
              className="mt-3 flex flex-wrap gap-2"
            >
              {['需要幫助', '怎麼開始', '給我建議', '下一步'].map((suggestion) => (
                <motion.button
                  key={suggestion}
                  onClick={() => setNewMessage(suggestion)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors border border-purple-200"
                >
                  {suggestion}
                </motion.button>
              ))}
            </motion.div>
          </div>
          
          {/* AI 助手狀態提示 */}
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mt-3 text-center"
          >
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 bg-green-400 rounded-full"
              />
              <span>AI 導師在線中 • 隨時為你解答 {careerData.title} 相關問題</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}