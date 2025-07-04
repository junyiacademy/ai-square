'use client';

import React, { useState, useEffect, useRef } from 'react';
import TaskWorkflow from './TaskWorkflow';
import SelfAssessmentForm from './evaluation/SelfAssessmentForm';
import PeerReviewForm from './evaluation/PeerReviewForm';
import MentorFeedbackForm from './evaluation/MentorFeedbackForm';
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
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  AcademicCapIcon,
  PencilIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import DiscoveryHeader from './DiscoveryHeader';
import { 
  EvaluationCriteria, 
  SelfAssessment, 
  PeerReview, 
  MentorFeedback,
  DEFAULT_EVALUATION_CRITERIA 
} from '@/types/evaluation-system';
import { UserDataService } from '@/lib/services/user-data-service';

interface UserAchievements {
  badges: string[];
  totalXp: number;
  level: number;
  completedTasks: string[];
}

interface ExplorationWorkspaceProps {
  pathId: string;
  workspaceId?: string; // Add workspace ID to save answers
  achievements: UserAchievements;
  onTaskComplete: (taskId: string, xpGained: number, skillsGained: string[], answer?: string) => void;
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
  workspaceId,
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
  const [activeEvaluationView, setActiveEvaluationView] = useState<'self' | 'peer' | 'mentor' | null>(null);
  const [userDataService] = useState(() => new UserDataService());
  const [taskAnswers, setTaskAnswers] = useState<Record<string, any>>({});
  const [currentTaskAnswer, setCurrentTaskAnswer] = useState<string>('');
  const [isViewMode, setIsViewMode] = useState(false); // True when viewing completed task in completed workspace
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Temporary hardcoded data for testing
  const pathDataMap: Record<string, PathData> = {
    content_creator: {
      title: "內容創作者",
      skills: ["內容策劃", "視覺設計", "文案寫作", "社群媒體行銷"],
      aiAssistants: ["創意總監", "內容策略師", "社群經理"],
      tasks: [
        {
          id: "content_planning",
          title: "內容策劃與規劃",
          description: "制定吸引目標受眾的內容策略",
          duration: "20 分鐘"
        },
        {
          id: "visual_creation",
          title: "視覺內容創作",
          description: "使用 AI 工具創作吸睛的視覺內容",
          duration: "25 分鐘"
        },
        {
          id: "engagement_analysis",
          title: "互動分析與優化",
          description: "分析內容表現並優化策略",
          duration: "20 分鐘"
        }
      ]
    },
    youtuber: {
      title: "YouTuber",
      skills: ["影片製作", "剪輯技巧", "觀眾互動", "頻道經營"],
      aiAssistants: ["影片製作人", "內容顧問", "數據分析師"],
      tasks: [
        {
          id: "video_planning",
          title: "影片企劃",
          description: "設計吸引人的影片主題和腳本",
          duration: "20 分鐘"
        },
        {
          id: "content_production",
          title: "內容製作",
          description: "拍攝和編輯高品質影片",
          duration: "30 分鐘"
        },
        {
          id: "audience_engagement",
          title: "觀眾互動",
          description: "建立和維護觀眾社群",
          duration: "15 分鐘"
        }
      ]
    },
    app_developer: {
      title: "應用程式開發者",
      skills: ["程式設計", "UI/UX設計", "測試調試", "版本控制"],
      aiAssistants: ["程式設計助手", "調試專家", "架構顧問"],
      tasks: [
        {
          id: "app_planning",
          title: "應用程式規劃",
          description: "設計應用程式架構和功能",
          duration: "25 分鐘"
        },
        {
          id: "ui_development",
          title: "介面開發",
          description: "使用 AI 輔助開發使用者介面",
          duration: "30 分鐘"
        },
        {
          id: "testing",
          title: "測試與優化",
          description: "測試應用程式並優化效能",
          duration: "20 分鐘"
        }
      ]
    },
    game_designer: {
      title: "遊戲設計師",
      skills: ["遊戲設計", "關卡設計", "平衡調整", "玩家心理"],
      aiAssistants: ["遊戲設計師", "關卡編輯器", "測試協調員"],
      tasks: [
        {
          id: "game_concept",
          title: "遊戲概念設計",
          description: "創造引人入勝的遊戲概念",
          duration: "20 分鐘"
        },
        {
          id: "level_design",
          title: "關卡設計",
          description: "設計有趣且具挑戰性的關卡",
          duration: "25 分鐘"
        },
        {
          id: "playtesting",
          title: "遊戲測試",
          description: "測試遊戲並收集反饋",
          duration: "20 分鐘"
        }
      ]
    },
    tech_entrepreneur: {
      title: "科技創業家",
      skills: ["商業策略", "技術願景", "團隊領導", "創新思維"],
      aiAssistants: ["商業顧問", "技術策略師", "市場分析師"],
      tasks: [
        {
          id: "business_model",
          title: "商業模式設計",
          description: "設計可持續的商業模式",
          duration: "25 分鐘"
        },
        {
          id: "tech_planning",
          title: "技術路線規劃",
          description: "規劃產品的技術發展路線",
          duration: "25 分鐘"
        },
        {
          id: "pitch_deck",
          title: "投資簡報製作",
          description: "製作吸引投資者的簡報",
          duration: "20 分鐘"
        }
      ]
    },
    startup_founder: {
      title: "創業家",
      skills: ["商業開發", "市場洞察", "資源整合", "風險管理"],
      aiAssistants: ["創業導師", "市場專家", "財務顧問"],
      tasks: [
        {
          id: "market_research",
          title: "市場研究",
          description: "深入了解目標市場需求",
          duration: "20 分鐘"
        },
        {
          id: "mvp_planning",
          title: "MVP 規劃",
          description: "設計最小可行產品",
          duration: "25 分鐘"
        },
        {
          id: "growth_strategy",
          title: "成長策略",
          description: "制定產品成長策略",
          duration: "20 分鐘"
        }
      ]
    },
    data_analyst: {
      title: "數據分析師",
      skills: ["數據分析", "統計建模", "視覺化", "洞察發現"],
      aiAssistants: ["數據科學家", "統計專家", "視覺化設計師"],
      tasks: [
        {
          id: "data_exploration",
          title: "數據探索",
          description: "探索並理解數據集",
          duration: "20 分鐘"
        },
        {
          id: "analysis_design",
          title: "分析設計",
          description: "設計有效的分析方法",
          duration: "25 分鐘"
        },
        {
          id: "insights_presentation",
          title: "洞察呈現",
          description: "將分析結果轉化為洞察",
          duration: "20 分鐘"
        }
      ]
    },
    ux_designer: {
      title: "UX 設計師",
      skills: ["用戶研究", "原型設計", "互動設計", "可用性測試"],
      aiAssistants: ["設計導師", "用戶研究員", "原型工具專家"],
      tasks: [
        {
          id: "user_research",
          title: "用戶研究",
          description: "了解用戶需求和痛點",
          duration: "20 分鐘"
        },
        {
          id: "prototype_design",
          title: "原型設計",
          description: "設計互動原型",
          duration: "30 分鐘"
        },
        {
          id: "usability_testing",
          title: "可用性測試",
          description: "測試並優化設計",
          duration: "15 分鐘"
        }
      ]
    },
    product_manager: {
      title: "產品經理",
      skills: ["產品規劃", "需求分析", "專案管理", "跨部門協作"],
      aiAssistants: ["產品策略師", "專案管理師", "數據分析師"],
      tasks: [
        {
          id: "requirement_analysis",
          title: "需求分析",
          description: "分析並定義產品需求",
          duration: "25 分鐘"
        },
        {
          id: "roadmap_planning",
          title: "路線圖規劃",
          description: "制定產品發展路線圖",
          duration: "20 分鐘"
        },
        {
          id: "feature_prioritization",
          title: "功能優先級",
          description: "評估並排序功能優先級",
          duration: "20 分鐘"
        }
      ]
    },
    ai_developer: {
      title: "AI 開發者",
      skills: ["機器學習", "深度學習", "模型優化", "AI 應用開發"],
      aiAssistants: ["AI 研究員", "模型訓練師", "部署專家"],
      tasks: [
        {
          id: "model_selection",
          title: "模型選擇",
          description: "選擇適合的 AI 模型",
          duration: "20 分鐘"
        },
        {
          id: "training_optimization",
          title: "訓練優化",
          description: "優化模型訓練過程",
          duration: "30 分鐘"
        },
        {
          id: "deployment_planning",
          title: "部署規劃",
          description: "規劃 AI 模型部署策略",
          duration: "15 分鐘"
        }
      ]
    }
  };

  // Get path data from hardcoded map or try translation
  let typedPathData = pathDataMap[pathId];
  
  if (!typedPathData) {
    // Try to get from translations as fallback
    const translatedData = t(`careers.${pathId}`, { returnObjects: true });
    if (translatedData && typeof translatedData === 'object' && translatedData.tasks) {
      typedPathData = translatedData as PathData;
    }
  }

  // If still no data, show error
  if (!typedPathData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Path data not found for: {pathId}</p>
          <p className="text-sm text-gray-500 mb-4">Available paths: content_creator, youtuber, app_developer, game_designer, tech_entrepreneur, startup_founder, data_analyst, ux_designer, product_manager, ai_developer</p>
          <button
            onClick={onBackToPaths}
            className="inline-flex items-center space-x-2 text-purple-600 hover:text-purple-700 font-medium"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>{t('workspace.backToPaths')}</span>
          </button>
        </div>
      </div>
    );
  }
  
  const currentTask = typedPathData.tasks[currentTaskIndex];
  const isLastTask = currentTaskIndex === typedPathData.tasks.length - 1;

  // Load task answers when workspace ID is available
  useEffect(() => {
    const loadTaskAnswers = async () => {
      if (workspaceId && typedPathData) {
        // Run migration once on first load
        const { migrateTaskAnswers } = await import('@/lib/utils/migrate-task-answers');
        migrateTaskAnswers();
        
        const answers: Record<string, any> = {};
        
        // Load all task answers for this workspace
        for (const task of typedPathData.tasks) {
          const answer = await userDataService.getTaskAnswer(workspaceId, task.id);
          if (answer) {
            answers[task.id] = answer;
          }
        }
        
        setTaskAnswers(answers);
        
        // Set current task answer if exists
        if (currentTask && answers[currentTask.id]) {
          setCurrentTaskAnswer(answers[currentTask.id].answer);
        } else {
          setCurrentTaskAnswer(''); // Clear if no answer exists
        }
      }
    };
    
    loadTaskAnswers();
  }, [workspaceId, pathId, currentTaskIndex]);

  // Initialize AI greeting - only when pathId changes
  useEffect(() => {
    if (typedPathData) {
      const greetingMessage: ChatMessage = {
        id: '1',
        sender: 'ai',
        text: t('aiAssistant.greeting', {
          role: typedPathData.aiAssistants[0] || 'Assistant',
          path: typedPathData.title
        }),
        timestamp: new Date()
      };
      setChatMessages([greetingMessage]);
    }
  }, [pathId, t]); // Remove typedPathData from dependencies

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleStartTask = async () => {
    setIsTaskActive(true);
    setTaskProgress(0);
    
    // For editing completed tasks, ensure we have the answer loaded
    if (workspaceCompletedTasks.includes(currentTask.id)) {
      // If editing a completed task, load the answer if not already loaded
      if (!taskAnswers[currentTask.id] && workspaceId) {
        setIsLoadingAnswer(true);
        const answer = await userDataService.getTaskAnswer(workspaceId, currentTask.id);
        
        if (answer) {
          setTaskAnswers(prev => ({
            ...prev,
            [currentTask.id]: answer
          }));
          setCurrentTaskAnswer(answer.answer);
        } else {
          // No saved answer, but task is completed - allow editing with empty content
          console.log('Task is completed but no answer saved - allowing edit with empty content');
        }
        setIsLoadingAnswer(false);
      }
    }
    
    // Show workflow after answer is loaded
    setShowWorkflow(true);
    
    // Add AI task introduction
    const taskIntroMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'ai',
      text: workspaceCompletedTasks.includes(currentTask.id) 
        ? taskAnswers[currentTask.id]?.answer 
          ? '讓我們來編輯這個任務的答案。你之前的答案已經載入。'
          : '這個任務已完成但沒有保存答案。你可以現在補充答案。'
        : '太好了！讓我們開始這個任務。我會在旁邊協助你完成每個步驟。',
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, taskIntroMessage]);
  };

  const handleProgressUpdate = React.useCallback((progress: number) => {
    setTaskProgress(progress);
  }, []);

  const handleCompleteTask = async (taskAnswer?: string) => {
    setIsTaskActive(false);
    setShowWorkflow(false);
    
    // Save task answer if workspace ID is available
    if (workspaceId && taskAnswer && typeof taskAnswer === 'string') {
      const answer = {
        taskId: currentTask.id,
        answer: String(taskAnswer), // Ensure it's a string
        submittedAt: new Date().toISOString()
      };
      
      await userDataService.saveTaskAnswer(workspaceId, answer);
      
      setTaskAnswers(prev => ({
        ...prev,
        [currentTask.id]: answer
      }));
      setCurrentTaskAnswer(String(taskAnswer));
    }
    
    // Calculate XP and skills
    const xpGained = 50 + (currentTaskIndex * 10);
    const skillsGained = typedPathData.skills.slice(0, 2); // Award first 2 skills
    
    // Call parent callback with answer
    onTaskComplete(currentTask.id, xpGained, skillsGained, taskAnswer);
    
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
    if (newCompletedCount === typedPathData.tasks.length) {
      // All tasks completed
      const congratsMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `🎉 恭喜！你已經完成了所有任務！這個工作區已標記為「已完成」。`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, congratsMessage]);
      
      // Don't auto-navigate - let user decide when to leave
    } else {
      // Auto move to next incomplete task
      const nextIncompleteIndex = typedPathData.tasks.findIndex((task, index) => 
        index > currentTaskIndex && !workspaceCompletedTasks.includes(task.id)
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
      const nextIncompleteIndex = typedPathData.tasks.findIndex((task, index) => 
        index > currentTaskIndex && !workspaceCompletedTasks.includes(task.id)
      );
      
      if (nextIncompleteIndex !== -1) {
        setCurrentTaskIndex(nextIncompleteIndex);
      } else {
        // If no incomplete tasks after current, wrap around to find any incomplete
        const firstIncompleteIndex = typedPathData.tasks.findIndex((task) => 
          !workspaceCompletedTasks.includes(task.id)
        );
        
        if (firstIncompleteIndex !== -1 && firstIncompleteIndex !== currentTaskIndex) {
          setCurrentTaskIndex(firstIncompleteIndex);
        }
      }
      
      setTaskProgress(0);
      setIsTaskActive(false);
    }
  };
  
  const handleTaskClick = async (index: number) => {
    // Allow switching to any task
    if (index !== currentTaskIndex || !isTaskActive) {
      setCurrentTaskIndex(index);
      setTaskProgress(0);
      setIsTaskActive(false);
      setShowWorkflow(false);
      
      // Always allow edit mode for any task
      setIsViewMode(false);
      
      // Load previous answer if available
      const task = typedPathData.tasks[index];
      if (taskAnswers[task.id]) {
        setCurrentTaskAnswer(taskAnswers[task.id].answer);
      } else {
        setCurrentTaskAnswer('');
        
        // Try to load answer from storage
        if (workspaceId) {
          const answer = await userDataService.getTaskAnswer(workspaceId, task.id);
          if (answer) {
            setTaskAnswers(prev => ({
              ...prev,
              [task.id]: answer
            }));
            setCurrentTaskAnswer(answer.answer);
          }
        }
      }
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
            pathTitle: typedPathData.title,
            currentTask: currentTask.title,
            currentTaskDescription: currentTask.description,
            taskProgress: Math.round(taskProgress),
            taskIndex: currentTaskIndex + 1,
            totalTasks: typedPathData.tasks.length,
            completedTasks: completedTasksCount,
            aiRole: typedPathData.aiAssistants[0] || 'AI Assistant',
            skills: typedPathData.skills,
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
      return `你好！我是你的 ${typedPathData.aiAssistants[0] || 'AI 助手'}。雖然目前連線有些問題，但我會盡力協助你完成「${currentTask.title}」這個任務。有什麼需要幫助的嗎？`;
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


  // Get completed tasks for this specific workspace from localStorage
  const [workspaceCompletedTasks, setWorkspaceCompletedTasks] = useState<string[]>([]);
  
  useEffect(() => {
    const loadWorkspaceData = async () => {
      if (workspaceId) {
        const userData = await userDataService.loadUserData();
        if (userData) {
          const workspace = userData.workspaceSessions.find(ws => ws.id === workspaceId);
          if (workspace) {
            setWorkspaceCompletedTasks(workspace.completedTasks || []);
          }
        }
      }
    };
    loadWorkspaceData();
  }, [workspaceId]);
  
  const completedTasksCount = workspaceCompletedTasks.length;

  // Evaluation handlers
  const handleSelfAssessmentSubmit = async (assessment: Omit<SelfAssessment, 'id' | 'submittedAt'>) => {
    try {
      const fullAssessment: SelfAssessment = {
        ...assessment,
        id: `${Date.now()}_self`,
        submittedAt: new Date().toISOString()
      };
      
      await userDataService.saveEvaluation('self_assessments', fullAssessment.id, fullAssessment);
      setActiveEvaluationView(null);
      
      // Add success message to chat
      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'ai',
        text: '太棒了！你的自我評估已經成功提交。這個反思過程對你的學習很有價值。',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, successMessage]);
    } catch (error) {
      console.error('Failed to save self assessment:', error);
    }
  };

  const handleSelfAssessmentDraft = async (assessment: Omit<SelfAssessment, 'id' | 'submittedAt'>) => {
    try {
      const draftAssessment: SelfAssessment = {
        ...assessment,
        id: `${Date.now()}_self_draft`,
        submittedAt: new Date().toISOString()
      };
      
      await userDataService.saveEvaluation('self_assessments_drafts', draftAssessment.id, draftAssessment);
    } catch (error) {
      console.error('Failed to save self assessment draft:', error);
    }
  };

  const handlePeerReviewSubmit = async (review: Omit<PeerReview, 'id' | 'submittedAt'>) => {
    try {
      const fullReview: PeerReview = {
        ...review,
        id: `${Date.now()}_peer`,
        submittedAt: new Date().toISOString()
      };
      
      await userDataService.saveEvaluation('peer_reviews', fullReview.id, fullReview);
      setActiveEvaluationView(null);
      
      // Add success message to chat
      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'ai',
        text: '感謝你提供的同儕評審！建設性的回饋對彼此的學習都很重要。',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, successMessage]);
    } catch (error) {
      console.error('Failed to save peer review:', error);
    }
  };

  const handleMentorFeedbackSubmit = async (feedback: Omit<MentorFeedback, 'id' | 'submittedAt'>) => {
    try {
      const fullFeedback: MentorFeedback = {
        ...feedback,
        id: `${Date.now()}_mentor`,
        submittedAt: new Date().toISOString()
      };
      
      await userDataService.saveEvaluation('mentor_feedback', fullFeedback.id, fullFeedback);
      setActiveEvaluationView(null);
      
      // Add success message to chat
      const successMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'ai',
        text: '專業導師回饋已成功提交！這些深度洞察將幫助學生更好地成長。',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, successMessage]);
    } catch (error) {
      console.error('Failed to save mentor feedback:', error);
    }
  };

  const handleMentorFeedbackDraft = async (feedback: Omit<MentorFeedback, 'id' | 'submittedAt'>) => {
    try {
      const draftFeedback: MentorFeedback = {
        ...feedback,
        id: `${Date.now()}_mentor_draft`,
        submittedAt: new Date().toISOString()
      };
      
      await userDataService.saveEvaluation('mentor_feedback_drafts', draftFeedback.id, draftFeedback);
    } catch (error) {
      console.error('Failed to save mentor feedback draft:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Discovery Header */}
      <DiscoveryHeader 
        hasAssessmentResults={true}
        workspaceCount={1}
        achievementCount={achievements.badges.length}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              {typedPathData.title} Workspace
            </h1>
            <button
              onClick={onBackToPaths}
              className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>返回路徑</span>
            </button>
          </div>
        
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
                {completedTasksCount}/{typedPathData.tasks.length} 任務完成
              </p>
            </div>
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(completedTasksCount / typedPathData.tasks.length) * 100}%` }}
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
                {isLoadingAnswer ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="text-center">
                      <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-gray-600">載入答案中...</p>
                    </div>
                  </div>
                ) : (
                  <TaskWorkflow
                    key={`${currentTask.id}-${taskAnswers[currentTask.id]?.answer ? 'loaded' : 'empty'}`} // Force re-render when answer loads
                    taskId={currentTask.id}
                    taskTitle={currentTask.title}
                    onComplete={handleCompleteTask}
                    onProgressUpdate={handleProgressUpdate}
                    previousAnswer={taskAnswers[currentTask.id]?.answer || currentTaskAnswer}
                    isEditMode={workspaceCompletedTasks.includes(currentTask.id) && !isViewMode}
                  />
                )}
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

            {/* Show previous answer if task is completed */}
            {workspaceCompletedTasks.includes(currentTask.id) && taskAnswers[currentTask.id] && !showWorkflow && (
              <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-start space-x-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-green-900 mb-2">
                      {isViewMode ? '任務答案（查看模式）' : '此任務已完成'}
                    </h4>
                    <div className="bg-white p-3 rounded-lg">
                      {(() => {
                        try {
                          const answer = taskAnswers[currentTask.id].answer;
                          const parsed = typeof answer === 'string' && answer.startsWith('{') ? JSON.parse(answer) : null;
                          
                          if (parsed && parsed.steps) {
                            // Display structured answer - show the workflow in view mode
                            return (
                              <div>
                                <p className="text-sm text-gray-600 mb-3">點擊步驟查看不同階段的答案：</p>
                                <TaskWorkflow
                                  key={`view-${currentTask.id}`}
                                  taskId={currentTask.id}
                                  taskTitle={currentTask.title}
                                  onComplete={() => {}} // No-op in view mode
                                  onProgressUpdate={() => {}} // No-op in view mode
                                  previousAnswer={taskAnswers[currentTask.id]?.answer}
                                  isEditMode={false}
                                  isViewOnlyMode={true} // New prop for view-only mode
                                />
                              </div>
                            );
                          } else {
                            // Display simple answer (backward compatibility)
                            return (
                              <>
                                <p className="text-sm text-gray-600 mb-1">你的答案：</p>
                                <p className="text-gray-800 whitespace-pre-wrap">{answer}</p>
                              </>
                            );
                          }
                        } catch (e) {
                          // Fallback for non-JSON answers
                          return (
                            <>
                              <p className="text-sm text-gray-600 mb-1">你的答案：</p>
                              <p className="text-gray-800 whitespace-pre-wrap">{taskAnswers[currentTask.id].answer}</p>
                            </>
                          );
                        }
                      })()}
                      <p className="text-xs text-gray-500 mt-3 pt-3 border-t">
                        提交時間：{new Date(taskAnswers[currentTask.id].submittedAt).toLocaleString('zh-TW')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Task Actions */}
            {!showWorkflow && (
              <div className="flex space-x-3">
                {!isTaskActive && !workspaceCompletedTasks.includes(currentTask.id) ? (
                  // Start button for incomplete tasks
                  <motion.button
                    onClick={handleStartTask}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <PlayIcon className="w-5 h-5" />
                    <span>{t('workspace.startTask')}</span>
                  </motion.button>
                ) : taskProgress >= 100 && !workspaceCompletedTasks.includes(currentTask.id) ? (
                  // Complete button for tasks in progress
                  <motion.button
                    onClick={() => handleCompleteTask(currentTaskAnswer)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <CheckIcon className="w-5 h-5" />
                    <span>{t('workspace.completeTask')}</span>
                  </motion.button>
                ) : workspaceCompletedTasks.includes(currentTask.id) && !isViewMode ? (
                  // Edit button for completed tasks when workspace is not completed
                  <motion.button
                    onClick={handleStartTask}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center space-x-2 bg-yellow-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
                  >
                    <PencilIcon className="w-5 h-5" />
                    <span>編輯答案</span>
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
              {taskProgress >= 100 && workspaceCompletedTasks.includes(currentTask.id) && completedTasksCount === typedPathData.tasks.length && onViewAchievements && (
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
              {typedPathData.tasks.map((task, index) => {
                const isCompleted = workspaceCompletedTasks.includes(task.id);
                const isCurrent = index === currentTaskIndex;
                const isClickable = true; // Allow all tasks to be clickable
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
                              {isCompleted ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskClick(index);
                                  }}
                                  className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors flex items-center space-x-1"
                                >
                                  {completedTasksCount === typedPathData.tasks.length ? (
                                    <>
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      <span>查看</span>
                                    </>
                                  ) : (
                                    <>
                                      <PencilIcon className="w-3 h-3" />
                                      <span>編輯</span>
                                    </>
                                  )}
                                </button>
                              ) : !isCurrent && (
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

          {/* Evaluation Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <ClipboardDocumentListIcon className="w-5 h-5 text-purple-600" />
              <span>學習評估</span>
            </h3>
            
            {/* Evaluation Type Tabs */}
            <div className="flex space-x-2 mb-6">
              <button
                onClick={() => setActiveEvaluationView(activeEvaluationView === 'self' ? null : 'self')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeEvaluationView === 'self'
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <ClipboardDocumentListIcon className="w-4 h-4" />
                <span>自我評估</span>
              </button>
              
              <button
                onClick={() => setActiveEvaluationView(activeEvaluationView === 'peer' ? null : 'peer')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeEvaluationView === 'peer'
                    ? 'bg-green-100 text-green-700 border-2 border-green-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <UserGroupIcon className="w-4 h-4" />
                <span>同儕互評</span>
              </button>
              
              <button
                onClick={() => setActiveEvaluationView(activeEvaluationView === 'mentor' ? null : 'mentor')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeEvaluationView === 'mentor'
                    ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <AcademicCapIcon className="w-4 h-4" />
                <span>導師回饋</span>
              </button>
            </div>

            {/* Evaluation Forms */}
            {activeEvaluationView === 'self' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <SelfAssessmentForm
                  taskId={currentTask.id}
                  workspaceId={pathId}
                  criteria={DEFAULT_EVALUATION_CRITERIA}
                  onSubmit={handleSelfAssessmentSubmit}
                  onSaveDraft={handleSelfAssessmentDraft}
                  onCancel={() => setActiveEvaluationView(null)}
                />
              </motion.div>
            )}

            {activeEvaluationView === 'peer' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <PeerReviewForm
                  taskId={currentTask.id}
                  workspaceId={pathId}
                  revieweeId="demo-student"
                  revieweeName="示範學生"
                  criteria={DEFAULT_EVALUATION_CRITERIA}
                  submissionContent="這是示範的學生作品內容，包含了任務相關的學習成果和思考過程..."
                  onSubmit={handlePeerReviewSubmit}
                  onCancel={() => setActiveEvaluationView(null)}
                />
              </motion.div>
            )}

            {activeEvaluationView === 'mentor' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <MentorFeedbackForm
                  taskId={currentTask.id}
                  workspaceId={pathId}
                  studentId="demo-student"
                  studentName="示範學生"
                  criteria={DEFAULT_EVALUATION_CRITERIA}
                  submissionContent="這是示範的學生作品內容，包含了任務相關的學習成果和思考過程..."
                  onSubmit={handleMentorFeedbackSubmit}
                  onSaveDraft={handleMentorFeedbackDraft}
                  onCancel={() => setActiveEvaluationView(null)}
                />
              </motion.div>
            )}

            {/* Evaluation Description */}
            {!activeEvaluationView && (
              <div className="text-center py-8">
                <div className="max-w-md mx-auto">
                  <ClipboardDocumentListIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">多元評估系統</h4>
                  <p className="text-gray-600 text-sm mb-4">
                    選擇評估方式來深化學習體驗：自我反思、同儕互評或專業導師指導
                  </p>
                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex items-center justify-center space-x-2">
                      <ClipboardDocumentListIcon className="w-4 h-4 text-blue-500" />
                      <span>自我評估：反思學習過程和成果</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <UserGroupIcon className="w-4 h-4 text-green-500" />
                      <span>同儕互評：交流學習心得與建議</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <AcademicCapIcon className="w-4 h-4 text-purple-500" />
                      <span>導師回饋：專業指導與建議</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
              <span>AI 導師在線中 • 隨時為你解答 {typedPathData.title} 相關問題</span>
            </div>
          </motion.div>
        </div>
      </div>
      </div>
    </div>
  );
}