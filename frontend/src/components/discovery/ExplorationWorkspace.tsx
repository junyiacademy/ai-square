'use client';

import React, { useState, useEffect, useRef } from 'react';
import TaskWorkflow from './TaskWorkflow';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon,
  PlayIcon,
  CheckIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  ClockIcon,
  CpuChipIcon,
  TrophyIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface UserAchievements {
  badges: string[];
  totalXp: number;
  level: number;
  completedTasks: string[];
}

interface ExplorationWorkspaceProps {
  pathId: string;
  achievements: UserAchievements;
  onTaskComplete: (taskId: string, xpGained: number, skillsGained: string[]) => void;
  onBackToPaths: () => void;
  onViewAchievements?: () => void;
}

interface Task {
  id: string;
  title: string;
  description: string;
  duration: string;
}

interface PathData {
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

export default function ExplorationWorkspace({ 
  pathId, 
  achievements, 
  onTaskComplete, 
  onBackToPaths,
  onViewAchievements 
}: ExplorationWorkspaceProps) {
  const { t } = useTranslation('discovery');
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isTaskActive, setIsTaskActive] = useState(false);
  const [taskProgress, setTaskProgress] = useState(0);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Get path data from translations
  const pathData = t(`paths.${pathId}`, { returnObjects: true }) as PathData;
  const currentTask = pathData.tasks[currentTaskIndex];
  const isLastTask = currentTaskIndex === pathData.tasks.length - 1;

  // Initialize AI greeting - only when pathId changes
  useEffect(() => {
    const data = t(`paths.${pathId}`, { returnObjects: true }) as PathData;
    const greetingMessage: ChatMessage = {
      id: '1',
      sender: 'ai',
      text: t('aiAssistant.greeting', {
        role: data.aiAssistants[0] || 'Assistant',
        path: data.title
      }),
      timestamp: new Date()
    };
    setChatMessages([greetingMessage]);
  }, [pathId, t]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleStartTask = () => {
    setIsTaskActive(true);
    setShowWorkflow(true);
    setTaskProgress(0);
    
    // Add AI task introduction
    const taskIntroMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'ai',
      text: '太好了！讓我們開始這個任務。我會在旁邊協助你完成每個步驟。',
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, taskIntroMessage]);
  };

  const handleCompleteTask = () => {
    setIsTaskActive(false);
    setShowWorkflow(false);
    
    // Calculate XP and skills
    const xpGained = 50 + (currentTaskIndex * 10);
    const skillsGained = pathData.skills.slice(0, 2); // Award first 2 skills
    
    // Call parent callback
    onTaskComplete(currentTask.id, xpGained, skillsGained);
    
    // Add completion message
    const completionMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'ai',
      text: `做得好！你完成了「${currentTask.title}」任務，獲得了 ${xpGained} XP！`,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, completionMessage]);
    
    // Check if all tasks are completed
    const newCompletedCount = completedTasksCount + 1;
    if (newCompletedCount === pathData.tasks.length) {
      // All tasks completed, navigate to achievements after a short delay
      setTimeout(() => {
        if (onViewAchievements) {
          onViewAchievements();
        }
      }, 1500);
    } else {
      // Auto move to next incomplete task
      const nextIncompleteIndex = pathData.tasks.findIndex((task, index) => 
        index > currentTaskIndex && !achievements.completedTasks.includes(task.id)
      );
      
      if (nextIncompleteIndex !== -1) {
        setTimeout(() => {
          setCurrentTaskIndex(nextIncompleteIndex);
          setTaskProgress(0);
        }, 1000);
      }
    }
  };

  const handleNextTask = () => {
    if (!isLastTask) {
      // Find next incomplete task
      const nextIncompleteIndex = pathData.tasks.findIndex((task, index) => 
        index > currentTaskIndex && !achievements.completedTasks.includes(task.id)
      );
      
      if (nextIncompleteIndex !== -1) {
        setCurrentTaskIndex(nextIncompleteIndex);
      } else {
        // If no incomplete tasks after current, wrap around to find any incomplete
        const firstIncompleteIndex = pathData.tasks.findIndex((task) => 
          !achievements.completedTasks.includes(task.id)
        );
        
        if (firstIncompleteIndex !== -1 && firstIncompleteIndex !== currentTaskIndex) {
          setCurrentTaskIndex(firstIncompleteIndex);
        }
      }
      
      setTaskProgress(0);
      setIsTaskActive(false);
    }
  };
  
  const handleTaskClick = (index: number) => {
    // Only allow clicking on incomplete tasks or current task
    if (index !== currentTaskIndex) {
      setCurrentTaskIndex(index);
      setTaskProgress(0);
      setIsTaskActive(false);
    }
  };

  const handleSendMessage = async () => {
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

    // Show typing indicator
    setIsTyping(true);
    
    try {
      // Call actual API for AI response
      const response = await fetch('/api/discovery/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage,
          context: {
            pathId,
            pathTitle: pathData.title,
            currentTask: currentTask.title,
            currentTaskDescription: currentTask.description,
            taskProgress: Math.round(taskProgress),
            taskIndex: currentTaskIndex + 1,
            totalTasks: pathData.tasks.length,
            completedTasks: completedTasksCount,
            aiRole: pathData.aiAssistants[0] || 'AI Assistant',
            skills: pathData.skills,
            language: 'zh-TW'
          }
        })
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      const data = await response.json();
      const aiResponse = data.response;
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiResponse,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      // Fallback to simple response if API fails
      const simpleResponse = await generateSimpleFallbackResponse(newMessage);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: simpleResponse,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // 簡單的 fallback 回應（當 API 失敗時使用）
  const generateSimpleFallbackResponse = async (userMessage: string): Promise<string> => {
    // 模擬處理時間
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const lowerMessage = userMessage.toLowerCase();
    
    // 基本意圖識別
    if (/(你好|哈囉|嗨|hi|hello)/i.test(lowerMessage)) {
      return `你好！我是你的 ${pathData.aiAssistants[0] || 'AI 助手'}。雖然目前連線有些問題，但我會盡力協助你完成「${currentTask.title}」這個任務。有什麼需要幫助的嗎？`;
    }
    
    if (/(謝謝|感謝|thank)/i.test(lowerMessage)) {
      return '不客氣！很高興能幫到你。繼續加油！';
    }
    
    if (/[?？]/.test(userMessage) || /(什麼|如何|怎麼|為什麼)/i.test(lowerMessage)) {
      return `這是個好問題！雖然我現在無法提供詳細回答（連線問題），但建議你可以：\n1. 仔細閱讀任務描述\n2. 嘗試不同的方法\n3. 相信你的直覺\n\n稍後連線恢復時，我會給你更詳細的指導。`;
    }
    
    // 預設回應
    return `我了解你的訊息。目前系統連線有些問題，但別擔心！你在「${currentTask.title}」上的進度很好。請繼續探索，有任何問題都可以隨時詢問。`;
  };


  const completedTasksCount = achievements.completedTasks.filter(taskId => 
    pathData.tasks.some(task => task.id === taskId)
  ).length;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {t('workspace.title', { path: pathData.title })}
        </h1>
        
        {/* Current Progress Overview */}
        <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <SparklesIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">目前任務</p>
              <p className="font-medium text-gray-900">{currentTask.title}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">整體進度</p>
              <p className="font-medium text-purple-700">
                {completedTasksCount}/{pathData.tasks.length} 任務完成
              </p>
            </div>
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(completedTasksCount / pathData.tasks.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
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

            {/* Show Workflow or Progress */}
            {showWorkflow ? (
              <div className="mb-6">
                <TaskWorkflow
                  taskId={currentTask.id}
                  taskTitle={currentTask.title}
                  onComplete={handleCompleteTask}
                  onProgressUpdate={setTaskProgress}
                />
              </div>
            ) : (
              isTaskActive && (
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
                  
                  {/* Progress bar */}
                  <div className="relative">
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <motion.div
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full"
                        animate={{ width: `${taskProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Task Actions */}
            {!showWorkflow && (
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
              
              {/* Show achievements button when current task is completed and all tasks are done */}
              {taskProgress >= 100 && achievements.completedTasks.includes(currentTask.id) && completedTasksCount === pathData.tasks.length && onViewAchievements && (
                <motion.button
                  onClick={onViewAchievements}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
                >
                  <TrophyIcon className="w-5 h-5" />
                  <span>查看成就</span>
                </motion.button>
              )}
              </div>
            )}
          </div>

          {/* Task List */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">所有任務</h3>
            <div className="space-y-2">
              {pathData.tasks.map((task, index) => {
                const isCompleted = achievements.completedTasks.includes(task.id);
                const isCurrent = index === currentTaskIndex;
                const isClickable = !isCompleted || isCurrent;
                const isTaskRunning = isTaskActive && isCurrent;
                
                return (
                  <motion.div
                    key={task.id}
                    onClick={() => isClickable && handleTaskClick(index)}
                    whileHover={isClickable && !isTaskRunning ? { scale: 1.02 } : {}}
                    whileTap={isClickable && !isTaskRunning ? { scale: 0.98 } : {}}
                    animate={{
                      height: isTaskRunning ? 'auto' : 'auto',
                      opacity: isTaskRunning ? 1 : (isCurrent && !isTaskActive) ? 1 : 0.8
                    }}
                    transition={{ duration: 0.3 }}
                    className={`
                      relative overflow-hidden rounded-xl border-2 transition-all duration-300 group
                      ${isCurrent 
                        ? isTaskRunning 
                          ? 'border-purple-500 bg-gradient-to-r from-purple-50 to-blue-50 shadow-lg' 
                          : 'border-purple-400 bg-purple-50'
                        : isCompleted
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 bg-gray-50 hover:border-purple-300'
                      }
                      ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                    `}
                  >
                    <div className="p-4">
                      <div className="flex items-center space-x-3">
                        {/* Status Icon with Animation */}
                        <div className="relative">
                          <div className={`
                            flex items-center justify-center w-8 h-8 rounded-full transition-all
                            ${isCurrent 
                              ? isTaskRunning
                                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg scale-110'
                                : 'bg-purple-500 text-white shadow-md'
                              : isCompleted
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-300 text-gray-600 group-hover:bg-gray-400'
                            }
                          `}>
                            {isCompleted ? (
                              <CheckIcon className="w-5 h-5" />
                            ) : isTaskRunning ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              >
                                <PlayIcon className="w-5 h-5" />
                              </motion.div>
                            ) : (
                              <span className="text-sm font-bold">{index + 1}</span>
                            )}
                          </div>
                          
                          {/* Running Indicator Ring */}
                          {isTaskRunning && (
                            <motion.div
                              className="absolute inset-0 rounded-full border-2 border-purple-400"
                              animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                              transition={{ duration: 2, repeat: Infinity }}
                            />
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <h4 className={`font-medium transition-all ${
                            isTaskRunning 
                              ? 'text-lg text-gray-900' 
                              : 'text-base text-gray-800 group-hover:text-gray-900'
                          }`}>
                            {task.title}
                          </h4>
                          
                          {/* Expanded content for active task */}
                          {isTaskRunning ? (
                            <div className="mt-2 space-y-2">
                              <p className="text-sm text-gray-600">{task.description}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-purple-600 font-medium flex items-center">
                                  <ClockIcon className="w-4 h-4 mr-1" />
                                  {task.duration}
                                </span>
                                <span className="text-sm text-purple-700 font-bold">任務進行中...</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-sm text-gray-600">{task.duration}</p>
                              {!isCompleted && !isCurrent && (
                                <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Hover effect for non-active tasks */}
                    {!isTaskRunning && !isCompleted && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                      />
                    )}
                  </motion.div>
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
            <div className="space-y-2">
              {chatMessages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 15, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
                >
                  <div className={`flex items-end space-x-2 max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {/* 頭像 */}
                    <div className="flex-shrink-0">
                      {message.sender === 'ai' ? (
                        <motion.div
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg"
                        >
                          <CpuChipIcon className="w-4 h-4 text-white" />
                        </motion.div>
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-white text-xs font-bold">你</span>
                        </div>
                      )}
                    </div>
                    
                    {/* 消息內容 */}
                    <div className="flex flex-col space-y-1">
                      {/* 消息氣泡 */}
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className={`relative overflow-hidden ${message.sender === 'user' ? 'ml-auto' : ''}`}
                      >
                        <div className={`
                          px-4 py-3 rounded-2xl text-sm
                          ${message.sender === 'user' 
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-br-sm shadow-md' 
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                          }
                        `}>
                          {/* 消息內容 */}
                          <div className="whitespace-pre-wrap break-words leading-relaxed">
                            {message.text}
                          </div>
                        </div>
                        
                        {/* AI 消息的打字機效果（僅新消息） */}
                        {message.sender === 'ai' && index === chatMessages.length - 1 && (
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0"
                            animate={{ 
                              opacity: [0, 0.3, 0],
                              x: ['-100%', '100%']
                            }}
                            transition={{ 
                              duration: 1.5,
                              ease: 'easeOut'
                            }}
                          />
                        )}
                      </motion.div>
                      
                      {/* 時間戳 - 更小更淡 */}
                      <div className={`text-xs text-gray-400 px-1 ${message.sender === 'user' ? 'text-right' : 'text-left'}`}>
                        {new Date(message.timestamp).toLocaleTimeString('zh-TW', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
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
              <span>AI 導師在線中 • 隨時為你解答 {pathData.title} 相關問題</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}