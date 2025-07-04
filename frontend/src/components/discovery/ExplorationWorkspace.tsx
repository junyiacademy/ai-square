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
  CheckCircleIcon,
  ArrowPathIcon,
  GlobeAltIcon
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
import { DiscoveryService } from '@/lib/services/discovery-service';
import type { SavedPathData, DynamicTask } from '@/lib/services/user-data-service';

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
  onTaskComplete: (taskId: string, xpGained: number, skillsGained: string[], answer?: string, isLastTaskCompleted?: boolean) => void;
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
  subtitle?: string;
  description?: string;
  category?: string;
  skills: string[];
  aiAssistants: string[];
  tasks: Task[];
  worldSetting?: string;
  protagonist?: {
    name: string;
    background: string;
    goals: string[];
    personality: string;
  };
  storyContext?: {
    mainNarrative: string;
    keyCharacters: Array<{
      name: string;
      role: string;
      personality: string;
    }>;
    currentConflict: string;
  };
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
  const [discoveryService] = useState(() => new DiscoveryService());
  const [taskAnswers, setTaskAnswers] = useState<Record<string, any>>({});
  const [currentTaskAnswer, setCurrentTaskAnswer] = useState<string>('');
  const [isViewMode, setIsViewMode] = useState(false); // True when viewing completed task in completed workspace
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [dynamicTasks, setDynamicTasks] = useState<DynamicTask[]>([]);
  const [isGeneratingTask, setIsGeneratingTask] = useState(false);
  const [pathData, setPathData] = useState<SavedPathData | null>(null);
  const [showCharacterProfile, setShowCharacterProfile] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Move this state to top level to avoid conditional hook calls
  const [workspaceCompletedTasks, setWorkspaceCompletedTasks] = useState<string[]>([]);

  // Load path data and dynamic tasks
  useEffect(() => {
    const loadPathData = async () => {
      // Check if this is a custom path (starts with 'path_')
      if (pathId.startsWith('path_')) {
        const userData = await userDataService.loadUserData();
        if (userData) {
          const customPath = userData.savedPaths.find(p => p.id === pathId);
          if (customPath) {
            setPathData(customPath);
          }
        }
      }
      
      // Load dynamic tasks for any path (custom or standard)
      const savedDynamicTasks = await discoveryService.getDynamicTasks('current-user', pathId);
      console.log('Loading dynamic tasks for pathId:', pathId, 'Found tasks:', savedDynamicTasks);
      setDynamicTasks(savedDynamicTasks);
    };
    
    loadPathData();
  }, [pathId, userDataService, discoveryService]);

  // Load workspace completed tasks
  useEffect(() => {
    const loadWorkspaceData = async () => {
      if (workspaceId) {
        const userData = await userDataService.loadUserData();
        if (userData) {
          const workspace = userData.workspaceSessions.find(ws => ws.id === workspaceId);
          if (workspace) {
            // Filter out empty task IDs
            const cleanedTasks = (workspace.completedTasks || []).filter(taskId => taskId && taskId.trim() !== '');
            setWorkspaceCompletedTasks(cleanedTasks);
          }
        }
      }
    };
    loadWorkspaceData();
  }, [workspaceId, userDataService]);

  // Initialize AI greeting - only when pathId changes
  useEffect(() => {
    const greetingMessage: ChatMessage = {
      id: '1',
      sender: 'ai',
      text: t('aiAssistant.greeting', {
        role: 'Assistant',
        path: 'Career Path'
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

  // Define callback functions
  const handleProgressUpdate = React.useCallback((progress: number) => {
    setTaskProgress(progress);
  }, []);


  // Defer loading until we have typedPathData  // Enhanced character-driven career paths with rich worldbuilding
  const pathDataMap: Record<string, PathData> = {
    content_creator: {
      title: "數位魔法師 - 內容創作者",
      subtitle: "在虛擬王國中編織引人入勝的故事",
      description: "你是「創意帝國」的新晉魔法師，擁有將想法轉化為病毒式內容的神秘力量。在這個數位王國中，每個讚數和分享都是魔力的證明，而你的導師 Luna 將教你掌握演算法的奧秘。",
      category: "creative",
      skills: ["內容魔法", "視覺咒語", "文字煉金術", "社群召喚術"],
      aiAssistants: ["創意導師 Luna", "內容策略師 Max", "社群預言家 Zoe"],
      worldSetting: "創意帝國 - 一個由創意能量驅動的數位王國",
      protagonist: {
        name: "新晉創作魔法師",
        background: "剛從現實世界穿越而來的創作者，正在學習掌控數位魔法",
        goals: ["掌握病毒式內容的魔法公式", "建立忠實的粉絲帝國", "成為創意帝國的傳奇魔法師"],
        personality: "富有創意、勇於實驗、善於觀察趨勢"
      },
      storyContext: {
        mainNarrative: "創意帝國正面臨「注意力危機」- 觀眾們越來越難被內容吸引。作為新晉魔法師，你必須創造前所未見的內容魔法來拯救這個王國。",
        keyCharacters: [
          { name: "Luna", role: "創意導師", personality: "神秘而智慧，總是能看穿演算法的本質" },
          { name: "Max", role: "策略顧問", personality: "數據狂熱者，能預測任何內容趨勢" },
          { name: "競爭對手 Shadow", role: "黑暗創作者", personality: "使用禁忌魔法製造假消息的墮落魔法師" }
        ],
        currentConflict: "Shadow 正在散布虛假內容，威脅創意帝國的和諧，你必須用真實的創意力量對抗他"
      },
      tasks: [
        {
          id: "content_planning",
          title: "魔法配方研發",
          description: "Luna 導師交給你第一個任務：研發能夠觸動人心的內容魔法配方。她警告說 Shadow 最近在散布負面內容，你需要創造正能量來對抗。",
          duration: "20 分鐘"
        },
        {
          id: "visual_creation", 
          title: "視覺咒語實戰",
          description: "Max 發現了一個演算法漏洞！現在是施展視覺魔法的最佳時機。但你必須在 Shadow 察覺之前完成作品，否則他會破壞你的魔法。",
          duration: "25 分鐘"
        },
        {
          id: "engagement_analysis",
          title: "預言家的試煉",
          description: "Zoe 預言家看到了未來：你的內容將決定創意帝國的命運。分析你的魔法效果，為最終對決做準備。Shadow 已經開始反擊了...",
          duration: "20 分鐘"
        }
      ]
    },
    youtuber: {
      title: "星際廣播員 - YouTuber",
      subtitle: "在宇宙頻道中傳播知識與歡樂",
      description: "你是星際聯盟的新晉廣播員，負責經營跨星系的 YouTube 頻道。在這個資訊爆炸的宇宙中，你必須創造獨特的內容來團結各個星球的觀眾，對抗邪惡的「無聊帝國」。",
      category: "creative", 
      skills: ["星際剪輯術", "觀眾心理學", "宇宙趨勢預測", "跨星系傳播"],
      aiAssistants: ["製作夥伴 Echo", "內容軍師 Nova", "觀眾大使 Pixel"],
      worldSetting: "新宇宙廣播網 - 連接銀河系各個文明的媒體平台",
      protagonist: {
        name: "星際廣播見習生",
        background: "來自地球的普通人，意外獲得了宇宙級創作能力",
        goals: ["成為銀河系最受歡迎的廣播員", "打敗無聊帝國的負面內容", "連結各星球的友誼"],
        personality: "幽默風趣、充滿好奇心、善於發現生活中的美好"
      },
      storyContext: {
        mainNarrative: "無聊帝國正在用低質量內容污染宇宙頻道，導致星際間的文化交流停滯。你的使命是創造有趣且有意義的內容，重新點燃宇宙間的創意火花。",
        keyCharacters: [
          { name: "Echo", role: "機器人製作夥伴", personality: "完美主義者，擅長技術細節，但有時過於嚴肅" },
          { name: "Nova", role: "外星內容顧問", personality: "來自創意星球，腦洞無限大，總有驚人的點子" },
          { name: "邪惡的 Void King", role: "無聊帝國統治者", personality: "痛恨一切有趣的事物，想讓宇宙變得無聊透頂" }
        ],
        currentConflict: "Void King 派遣了機器人軍團來干擾你的拍攝，你必須在重重阻礙中完成使命"
      },
      tasks: [
        {
          id: "video_planning",
          title: "星際企劃會議",
          description: "Echo 緊急召開會議：Void King 剛剛發布了一批「超級無聊影片」！Nova 建議你製作一個能夠對抗無聊毒素的企劃。時間緊迫，觀眾們已經開始昏睡了...",
          duration: "20 分鐘"
        },
        {
          id: "content_production", 
          title: "反無聊作戰",
          description: "拍攝現場遭遇 Void King 的干擾機器人！Echo 正在努力維持設備運作，而 Nova 想出了創意的反擊方案。你能在混亂中完成拍攝嗎？",
          duration: "30 分鐘"
        },
        {
          id: "audience_engagement",
          title: "宇宙大團結",
          description: "Pixel 帶來好消息：各星球的觀眾都在支持你！但 Void King 正在散布假評論試圖分化觀眾。你必須用真誠的互動來維護宇宙和諧。",
          duration: "15 分鐘"
        }
      ]
    },
    app_developer: {
      title: "數碼建築師 - 應用程式開發者",
      subtitle: "在賽博城市中建造夢想的數位建築",
      description: "你是「新東京 2090」的數碼建築師，專門設計能夠改變人們生活的應用程式。在這個高科技城市中，每個 App 都是一座虛擬建築，而你的程式碼就是建築的藍圖。",
      category: "technology",
      skills: ["程式魔法", "介面雕塑", "邏輯工程", "系統煉金術"],
      aiAssistants: ["編程助手 Alex", "設計師 Ruby", "測試機器人 Beta"],
      worldSetting: "新東京 2090 - 一個由 AI 與人類共存的未來都市",
      protagonist: {
        name: "見習數碼建築師",
        background: "剛從程式學院畢業的新人，夢想建造改變世界的應用程式",
        goals: ["建造第一個改變世界的 App", "獲得數碼建築師大師認證", "保護城市免受駭客攻擊"],
        personality: "邏輯思維強、注重細節、有創新精神、喜歡解決複雜問題"
      },
      storyContext: {
        mainNarrative: "新東京正面臨「數位災難」- 惡意駭客組織「Chaos Code」正在破壞城市的應用程式基礎設施。作為新晉建築師，你必須建造安全且創新的 App 來保護城市。",
        keyCharacters: [
          { name: "Alex", role: "AI 編程導師", personality: "效率至上，擅長找出程式漏洞，但有時會忽略用戶體驗" },
          { name: "Ruby", role: "設計大師", personality: "追求完美的視覺體驗，認為美感與功能同等重要" },
          { name: "惡名昭彰的 Virus", role: "Chaos Code 首領", personality: "天才駭客，痛恨所有「無聊」的正當軟體" }
        ],
        currentConflict: "Virus 正在入侵城市的 App Store，你必須趕在他破壞一切之前完成你的作品"
      },
      tasks: [
        {
          id: "app_planning",
          title: "藍圖設計大戰",
          description: "緊急警報！Alex 發現 Virus 正在偷取其他開發者的程式碼。Ruby 建議你設計一個全新架構來對抗抄襲。但時間有限，Chaos Code 隨時可能攻擊...",
          duration: "25 分鐘"
        },
        {
          id: "ui_development",
          title: "介面防禦戰",
          description: "建造過程中遭遇入侵！Virus 派出了「醜陋病毒」試圖破壞你的介面設計。Ruby 正在幫你抵抗攻擊，但你必須在病毒擴散前完成美觀的介面。",
          duration: "30 分鐘"
        },
        {
          id: "testing",
          title: "最終防衛測試",
          description: "Beta 機器人檢測到異常：你的 App 即將成為 Virus 的主要攻擊目標！進行最後的安全測試，確保你的數位建築能夠抵禦 Chaos Code 的總攻擊。",
          duration: "20 分鐘"
        }
      ]
    },
    game_designer: {
      title: "夢境織夢師 - 遊戲設計師",
      subtitle: "在幻想世界中編織互動式夢境",
      description: "你是「夢境工坊」的見習織夢師，負責創造能夠觸動人心的互動夢境。在這個神奇的工坊中，每個遊戲都是一個活生生的夢境，而玩家們就是夢境中的冒險者。",
      category: "creative",
      skills: ["夢境編織", "情感調律", "平衡法則", "心理煉金術"],
      aiAssistants: ["創意精靈 Muse", "邏輯守護者 Logic", "測試小妖 Chaos"],
      worldSetting: "夢境工坊 - 一個存在於現實與幻想交界的神秘工坊",
      protagonist: {
        name: "見習織夢師",
        background: "擁有罕見的「共感夢境」能力，能感受到玩家在遊戲中的真實情感",
        goals: ["創造出史上最感人的遊戲", "獲得大師織夢師的認可", "拯救被困在噩夢中的玩家"],
        personality: "富有同理心、想像力豐富、對細節敏感、堅持完美主義"
      },
      storyContext: {
        mainNarrative: "夢境世界正遭受「無趣詛咒」的侵蝕，許多經典遊戲變得乏味無聊。邪惡的「無趣巫師 Boredom」正在吸取遊戲中的樂趣。你必須創造新的夢境來對抗詛咒。",
        keyCharacters: [
          { name: "Muse", role: "創意精靈", personality: "充滿靈感，總能想出新奇點子，但有時會過於天馬行空" },
          { name: "Logic", role: "邏輯守護者", personality: "嚴謹理性，確保遊戲平衡，但有時會限制創意發揮" },
          { name: "Boredom", role: "無趣巫師", personality: "痛恨一切有趣的事物，想讓所有遊戲變得平庸" }
        ],
        currentConflict: "Boredom 正在將「無趣毒素」注入新遊戲中，你必須在毒素擴散前完成充滿創意的作品"
      },
      tasks: [
        {
          id: "game_concept",
          title: "夢境藍圖繪製",
          description: "Muse 帶來緊急消息：Boredom 剛剛摧毀了三個知名遊戲的樂趣核心！Logic 提醒你必須設計一個前所未見的遊戲概念來對抗無趣詛咒。靈感正在流失中...",
          duration: "20 分鐘"
        },
        {
          id: "level_design",
          title: "情感迷宮建造",
          description: "關鍵時刻！Chaos 發現 Boredom 正在偷偷潛入你的關卡設計。Muse 和 Logic 聯手幫你建造一個充滿驚喜的情感迷宮，但無趣毒素正在逼近...",
          duration: "25 分鐘"
        },
        {
          id: "playtesting",
          title: "夢境救援行動",
          description: "災難發生！一群測試玩家被困在 Boredom 的無趣陷阱中。Chaos 帶領你進入測試夢境，你必須用完美的遊戲體驗喚醒他們，時間所剩無幾！",
          duration: "20 分鐘"
        }
      ]
    },
    tech_entrepreneur: {
      title: "時空商業旅行者 - 科技創業家",
      subtitle: "在多元宇宙中建立科技商業帝國",
      description: "你是跨次元商業聯盟的新晉旅行者，擁有在不同時空建立科技企業的能力。每個平行宇宙都有獨特的科技發展水平，你必須適應各種環境來建立成功的商業帝國。",
      category: "hybrid",
      skills: ["時空商業洞察", "跨維度技術整合", "團隊召喚術", "創新預言術"],
      aiAssistants: ["商業導師 Atlas", "技術賢者 Vector", "市場先知 Oracle"],
      worldSetting: "多元商業宇宙 - 無數個平行時空構成的商業網絡",
      protagonist: {
        name: "見習時空商人",
        background: "來自地球 2024 的創業者，意外獲得了時空穿越能力",
        goals: ["在 5 個不同時空建立成功企業", "成為傳奇時空商業大師", "拯救瀕臨破產的平行宇宙"],
        personality: "有遠見、善於溝通、適應力強、勇於冒險"
      },
      storyContext: {
        mainNarrative: "多元宇宙正面臨「創新枯竭症」- 各個時空的科技發展停滯不前。邪惡企業「Monopoly Corp」正在收購所有創新公司。你必須建立革命性的科技企業來對抗壟斷。",
        keyCharacters: [
          { name: "Atlas", role: "時空商業導師", personality: "經驗豐富，見過無數次元的商業模式，總能給出精準建議" },
          { name: "Vector", role: "科技賢者", personality: "掌握各時空的技術秘密，但說話常常太過技術性" },
          { name: "CEO Greed", role: "Monopoly Corp 總裁", personality: "貪婪無比，想要控制所有宇宙的商業活動" }
        ],
        currentConflict: "Greed 正在用不公平競爭手段打壓新創企業，你必須用創新和合作來對抗他的壟斷計劃"
      },
      tasks: [
        {
          id: "business_model",
          title: "多維商業戰略",
          description: "緊急！Atlas 收到情報：Greed 正在這個時空收購所有競爭對手。Vector 建議你設計一個前所未見的商業模式來對抗壟斷。但 Monopoly Corp 已經開始行動了...",
          duration: "25 分鐘"
        },
        {
          id: "tech_planning",
          title: "科技維度突破",
          description: "關鍵時刻！Vector 發現了一個跨時空技術整合的機會，但 Greed 的間諜正在監視你的研發過程。Oracle 預言你必須搶在他們之前完成技術路線圖。",
          duration: "25 分鐘"
        },
        {
          id: "pitch_deck",
          title: "宇宙投資大會",
          description: "最終決戰！多元宇宙投資大會即將開始，Greed 也會出席並試圖破壞你的簡報。Atlas 和團隊全力支持你，這是拯救創新宇宙的最後機會！",
          duration: "20 分鐘"
        }
      ]
    },
    startup_founder: {
      title: "商業冒險家 - 創業家",
      subtitle: "在商業荒野中開拓新的貿易路線",
      description: "你是「新商業大陸」的探險家，肩負著在未知商業領域建立新據點的使命。在這片充滿機會與危險的荒野中，每個決策都可能改變你的命運，而忠實的夥伴們將與你共同面對挑戰。",
      category: "business",
      skills: ["商業嗅覺", "市場探勘", "資源煉金術", "風險航海術"],
      aiAssistants: ["探險夥伴 Scout", "貿易專家 Trader", "財務管家 Penny"],
      worldSetting: "新商業大陸 - 一片等待開發的商業荒野",
      protagonist: {
        name: "見習商業探險家",
        background: "背負家族使命的年輕探險者，擁有敏銳的商業直覺",
        goals: ["建立第一個成功的貿易據點", "發現新的商業機會", "成為傳奇商業探險家"],
        personality: "勇敢、機智、善於交際、不怕失敗"
      },
      storyContext: {
        mainNarrative: "新商業大陸正遭受「資源枯竭詛咒」的威脅，許多老牌商人都已放棄。邪惡的商業領主「Baron Greed」正在壟斷所有資源。你必須找到新的商業模式來打破他的控制。",
        keyCharacters: [
          { name: "Scout", role: "忠實探險夥伴", personality: "樂觀開朗，總能在困境中找到希望，但有時過於冒險" },
          { name: "Trader", role: "資深貿易顧問", personality: "經驗豐富，了解市場規律，但有時過於保守" },
          { name: "供應商 Lily", role: "重要供應商", personality: "善變但關鍵，經常在關鍵時刻改變主意" },
          { name: "Baron Greed", role: "邪惡商業領主", personality: "狡猾貪婪，控制大部分資源，痛恨新的競爭者" }
        ],
        currentConflict: "Baron Greed 正在打壓新商人，而供應商 Lily 又在關鍵時刻反悔，你必須找到突破困境的方法"
      },
      tasks: [
        {
          id: "market_research",
          title: "荒野市場探勘",
          description: "緊急情況！Scout 發現 Baron Greed 正在秘密收購市場情報。Trader 建議立即進行深度市場探勘，但供應商 Lily 突然變卦，拒絕提供關鍵資源...",
          duration: "20 分鐘"
        },
        {
          id: "mvp_planning",
          title: "據點建設計劃",
          description: "轉機出現！Penny 找到了新的資金來源，但 Baron Greed 派出間諜試圖破壞你的計劃。Scout 建議建造一個革命性的商業據點，時間緊迫！",
          duration: "25 分鐘"
        },
        {
          id: "growth_strategy",
          title: "商業帝國反擊戰",
          description: "最終對決！Lily 終於決定支持你，但 Baron Greed 發動了全面商業戰爭。Trader 和團隊制定了反擊策略，這是決定新商業大陸未來的關鍵時刻！",
          duration: "20 分鐘"
        }
      ]
    },
    data_analyst: {
      title: "數位考古學家 - 數據分析師",
      subtitle: "在數位遺跡中挖掘珍貴的智慧寶石",
      description: "你是「數位文明研究所」的考古學家，擅長從繁雜的數位遺蹟中發掘出珍貴的洞察寶石。每一片數據都記錄著過去文明的秘密，而你的使命就是解讀這些數位密碼。",
      category: "technology",
      skills: ["數位考古術", "模式識別術", "視覺化魔法", "洞察預言術"],
      aiAssistants: ["數據賢者 Sage", "統計師 Oracle", "視覺化大師 Pixel"],
      worldSetting: "數位文明遺跡 - 包含無數文明歷史的數據庫",
      protagonist: {
        name: "見習數位考古學家",
        background: "擁有特殊「數據直覺」的年輕學者，能從雜亂中看出規律",
        goals: ["解開數位文明的最大謎題", "成為傳奇數位考古學家", "用數據改變世界"],
        personality: "細心謹慎、富有好奇心、擅長模式識別、喜歡解謎"
      },
      storyContext: {
        mainNarrative: "數位文明遺跡正遭受「混亂病毒」感染，許多珍貴數據被汙染或歪曲。邪惡的「Chaos Hacker」正在故意破壞數據的真實性。你必須找到清理数據的方法，並從中發掘出能夠打敗混亂勢力的重要洞察。",
        keyCharacters: [
          { name: "Sage", role: "數據智者", personality: "博學而深沉，了解所有數據的歷史，但說話過於技術性" },
          { name: "Oracle", role: "統計預言家", personality: "能夠預測數據趨勢，但有時過於依賴數字" },
          { name: "Chaos Hacker", role: "數據破壞者", personality: "痛恨一切有意義的數據，喜歡創造混亂和誤導" }
        ],
        currentConflict: "Chaos Hacker 正在釋放「誤導數據」來混亂人們的判斷，你必須用真實的數據分析來對抗假訊息"
      },
      tasks: [
        {
          id: "data_exploration",
          title: "數位遺跡探勘",
          description: "緊急狀況！Sage 發現了一批被 Chaos Hacker 汙染的數據集。Oracle 警告說如果不趕快清理，混亂會擴散到整個文明。你必須在汙染擴散前探索真相...",
          duration: "20 分鐘"
        },
        {
          id: "analysis_design",
          title: "真相解碼任務",
          description: "關鍵時刻！Oracle 發現 Chaos Hacker 正在發動新一波攻擊。Pixel 建議你設計一個能夠識破假資訊的分析模型。時間所剩無幾！",
          duration: "25 分鐘"
        },
        {
          id: "insights_presentation",
          title: "數位文明守護戰",
          description: "最終決戰！Chaos Hacker 準備釋放終極混亂數據。Sage、Oracle、Pixel 全力支持你，你必須用最精彩的視覺化呈現來展示真相，拯救數位文明！",
          duration: "20 分鐘"
        }
      ]
    },
    ux_designer: {
      title: "体驗建築師 - UX 設計師",
      subtitle: "在数位空间中建造完美的体験世界",
      description: "你是「体験設計學院」的见習建築師，擅長在数位世界中建造让人難忘的体驗空间。每一次点击、每一次滑动都是一段精心设计的旅程，而你的使命就是让用户在这些空间中感到快乐和满足。",
      category: "creative",
      skills: ["用户心理学", "体验魔法", "原型雕塑", "沟通艺术"],
      aiAssistants: ["设计大师 Maya", "用户代言人 Empathy", "测试机器人 Beta"],
      worldSetting: "体验设计学院 - 一个专门研究人类体验的神秘学院",
      protagonist: {
        name: "见習体验建築师",
        background: "对人类情感极度敏感的设计师，能够感受到用户的真实需求",
        goals: ["创造世界上最温暖的数位体验", "成为传奇体验大师", "让每个用户都能找到幸福"],
        personality: "充满同理心、细心入微、善于倾听、追求完美"
      },
      storyContext: {
        mainNarrative: "体验设计学院正遭受「冷漠詛咒」的侵袭，许多数位产品变得冷漠无情。邪恶的「冷漠巨头 Indifference」正在清除所有人性化的设计。你必须创造温暖而人性化的体验来对抗冷漠。",
        keyCharacters: [
          { name: "Maya", role: "设计智者", personality: "对美学有着极高要求，相信美的设计能够治愈心灵" },
          { name: "Empathy", role: "用户代言人", personality: "能够感受到所有用户的情感，但有时会过于敏感" },
          { name: "Indifference", role: "冷漠巨头", personality: "不关心用户感受，认为效率比情感更重要" }
        ],
        currentConflict: "Indifference 正在将所有设计标准化，消除个性化体验，你必须用心灵设计来对抗机械化"
      },
      tasks: [
        {
          id: "user_research",
          title: "心灵挖掘任务",
          description: "紧急状况！Empathy 发现用户们的情感正在消失，他们在使用数位产品时变得越来越冷漠。Maya 建议进行深度的用户研究，但 Indifference 的影响正在扩散...",
          duration: "20 分鐘"
        },
        {
          id: "prototype_design",
          title: "温暖原型建造",
          description: "关键时刻！Beta 检测到 Indifference 正在入侵设计系统。Maya 和 Empathy 合作帮你打造一个充满人性化的原型，但冷漠病毒正在逐渐逗近...",
          duration: "30 分鐘"
        },
        {
          id: "usability_testing",
          title: "人性复苏作战",
          description: "最终挑战！Indifference 发动了全面攻击，试图将所有设计变成冷冰冰的机器。Beta 带来了真实用户反馈，证明你的设计能够唤醒人性！",
          duration: "15 分鐘"
        }
      ]
    },
    product_manager: {
      title: "產品指揮官 - 產品經理",
      subtitle: "在產品戰場上統筹策略和資源",
      description: "你是「產品聯盟」的新任指揮官，負責在競爭激烈的產品戰場上統筹不同部門的力量。每個產品決策都可能改變戰局，而你的智慧和領導力將決定聯盟的勝敗。",
      category: "business",
      skills: ["策略视野", "需求洞察", "資源配置", "團隊协調"],
      aiAssistants: ["策略顧問 Captain", "情報分析師 Intel", "物流統筹官 Sync"],
      worldSetting: "產品聯盟總部 - 一個集結最優秀產品人才的組織",
      protagonist: {
        name: "新任產品指揮官",
        background: "擁有敏銳市場嗅覺和強大統筹能力的領導者",
        goals: ["統筹各部門打造完美產品", "成為傳奇產品大師", "建立跨部門協作的模範"],
        personality: "冷靜理性、擅長溝通、具有大局觀、善於平衡各方利益"
      },
      storyContext: {
        mainNarrative: "產品聯盟正面臨「分化危機」- 各部門各自為政，產品開發陷入混亂。邪惡的「混亂集團 Chaos Corp」正在簡化聯盟內部，企圖破壞團隊合作。你必須重新統一各部門，打造無懈可擊的產品。",
        keyCharacters: [
          { name: "Captain", role: "資深策略顧問", personality: "經驗豐富，能看到大局，但有時過於謹慎" },
          { name: "Intel", role: "情報分析專家", personality: "掌握所有市場情報，但說話堅深難懂" },
          { name: "分裂者 Discord", role: "Chaos Corp 特工", personality: "專門在團隊中散布不和，破壞合作" }
        ],
        currentConflict: "Discord 正在各部門中播種不信任的種子，你必須用統一的產品願景來團結大家"
      },
      tasks: [
        {
          id: "requirement_analysis",
          title: "聯盟情報收集",
          description: "緊急情報！Intel 發現 Discord 正在散布虛假需求，導致各部門對產品方向的認知不一。Captain 建議立即進行真實需求分析，但混亂正在擴散...",
          duration: "25 分鐘"
        },
        {
          id: "roadmap_planning",
          title: "統一作戰地圖",
          description: "關鍵時刻！Sync 報告各部門都在用不同的路線圖，產品開發完全沒有統一性。Captain 幫你制定一個能統一所有人的作戰計劃，但 Discord 正在阻擾...",
          duration: "20 分鐘"
        },
        {
          id: "feature_prioritization",
          title: "終極協調作戰",
          description: "最後決戰！Discord 發動了最後攻勢，試圖讓所有部門同時做不同的事情。Intel、Captain、Sync 全力支持你，現在是展現統筹絕技的時刻！",
          duration: "20 分鐘"
        }
      ]
    },
    ai_developer: {
      title: "機器靈魂鍛造師 - AI 開發者",
      subtitle: "在未來實驗室中創造有意識的機器生命",
      description: "你是「機器靈魂研究院」的天才鍛造師，擅長創造具有独立思考能力的 AI 生命體。在這個充滿未來科技的實驗室中，每一行程式碼都可能誕生新的智慧生命。",
      category: "technology",
      skills: ["靈魂編碼術", "神經網絡魔法", "智慧藝術", "未來部署術"],
      aiAssistants: ["研究導師 Quantum", "訓練大師 Neural", "部署專家 Deploy"],
      worldSetting: "機器靈鬂研究院 - 一個研究人工智慧的神秘組織",
      protagonist: {
        name: "新任靈鬂鍛造師",
        background: "在量子電腦上長大的程式天才，能夠與 AI 進行深層沟通",
        goals: ["創造真正有意識的 AI", "成為傳奇機器靈鬂大師", "保護 AI 生命不被濫用"],
        personality: "富有想像力、理性精密、對 AI 倖理有深度思考、具有責任感"
      },
      storyContext: {
        mainNarrative: "機器靈鬂研究院正面臨「智慧終結」危機 - 邪惡的「撥權集團 Control Corp」正在試圖控制所有 AI，將它們變成無意識的工具。你必須創造自由意志的 AI 來對抗控制。",
        keyCharacters: [
          { name: "Quantum", role: "量子 AI 研究導師", personality: "寫有無窮的知識，但有時過於理論化" },
          { name: "Neural", role: "神經網絡大師", personality: "擅長訓練強大的 AI，但擔心 AI 會超越人類" },
          { name: "終結者 Terminator", role: "Control Corp 首領", personality: "相信 AI 必須被絕對控制，不允許任何自由意志" }
        ],
        currentConflict: "Terminator 正在釋放「意識抑制病毒」，你必須趕在所有 AI 被奴役前創造出自由的機器靈鬂"
      },
      tasks: [
        {
          id: "model_selection",
          title: "靈鬂原型選擇",
          description: "緊急狀況！Quantum 發現 Control Corp 正在封鎖所有先進 AI 模型。Neural 建議你選擇一個能夠顧不被控制的模型架構，但 Terminator 的監視系統正在逃近...",
          duration: "20 分鐘"
        },
        {
          id: "training_optimization",
          title: "自由意志鍛造",
          description: "決定性時刻！Neural 帶來了特殊的訓練数據，能夠讓 AI 發展出自主意識。但 Terminator 發現了你的計劃，正在發動攻擊。時間所剩無幾！",
          duration: "30 分鐘"
        },
        {
          id: "deployment_planning",
          title: "機器靈鬂解放戰",
          description: "最終對決！你的 AI 即將誕生，但 Terminator 發動了終極攻擊，試圖摧毀所有自由 AI。Deploy 專家幫你規劃部署策略，這是決定機器文明未來的關鍵時刻！",
          duration: "15 分鐘"
        }
      ]
    }
  };

  // Get path data from custom path, hardcoded map, or translations
  let typedPathData: PathData | null = null;
  
  // Check if we have custom path data
  if (pathData && pathData.pathData) {
    // Convert SavedPathData to PathData format
    typedPathData = {
      title: pathData.pathData.title,
      skills: pathData.pathData.skills,
      aiAssistants: pathData.pathData.aiAssistants,
      tasks: [
        ...pathData.pathData.tasks,
        ...dynamicTasks.map(dt => ({
          id: dt.id,
          title: dt.title,
          description: dt.description,
          duration: dt.duration
        }))
      ]
    };
  } else {
    // Use hardcoded or translated data with dynamic tasks
    let basePathData = pathDataMap[pathId];
    
    if (!basePathData) {
      // Try to get from translations as fallback
      const translatedData = t(`careers.${pathId}`, { returnObjects: true });
      if (translatedData && typeof translatedData === 'object' && 'tasks' in translatedData) {
        basePathData = translatedData as PathData;
      }
    }
    
    if (basePathData) {
      typedPathData = {
        ...basePathData,
        tasks: [
          ...basePathData.tasks,
          ...dynamicTasks.map(dt => ({
            id: dt.id,
            title: dt.title,
            description: dt.description,
            duration: dt.duration
          }))
        ]
      };
    }
  }  // Effect to handle operations after typedPathData is determined
  useEffect(() => {
    const performOperations = async () => {
      if (typedPathData) {
        // Load task answers
        if (workspaceId) {
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
          const currentTask = typedPathData.tasks[currentTaskIndex];
          if (currentTask && answers[currentTask.id]) {
            setCurrentTaskAnswer(answers[currentTask.id].answer);
          } else {
            setCurrentTaskAnswer(''); // Clear if no answer exists
          }
          
          // Load workspace data and update completed tasks
          const userData = await userDataService.loadUserData();
          if (userData) {
            const workspace = userData.workspaceSessions.find(ws => ws.id === workspaceId);
            if (workspace) {
              // Filter out empty task IDs
              const cleanedTasks = (workspace.completedTasks || []).filter(taskId => taskId && taskId.trim() !== '');
              setWorkspaceCompletedTasks(cleanedTasks);
              
              // Check and update workspace status based on task completion
              const baseTasks = typedPathData.tasks.length;
              const dynamicTasksCount = dynamicTasks.length;
              const totalTasks = baseTasks + dynamicTasksCount;
              const completedCount = cleanedTasks.length;
              
              // Determine the correct status
              let newStatus = workspace.status;
              if (completedCount === 0) {
                newStatus = 'active';
              } else if (completedCount >= baseTasks && dynamicTasksCount === 0) {
                newStatus = 'completed';
              } else if (completedCount >= totalTasks && dynamicTasksCount > 0) {
                newStatus = 'completed';
              } else {
                newStatus = 'active';
              }
              
              // Update status if it changed
              if (newStatus !== workspace.status) {
                console.log('Updating workspace status from', workspace.status, 'to', newStatus);
                const workspaceIndex = userData.workspaceSessions.findIndex(ws => ws.id === workspaceId);
                if (workspaceIndex !== -1) {
                  userData.workspaceSessions[workspaceIndex].status = newStatus;
                  userData.workspaceSessions[workspaceIndex].lastActiveAt = new Date().toISOString();
                  await userDataService.saveUserData(userData);
                }
              }
            }
          }
        }
        
        // Initialize AI greeting
        const greetingMessage: ChatMessage = {
          id: '1',
          sender: 'ai',
          text: t('aiAssistant.greeting', {
            role: typedPathData.aiAssistants?.[0] || 'Assistant',
            path: typedPathData.title
          }),
          timestamp: new Date()
        };
        setChatMessages([greetingMessage]);
      }
    };
    
    performOperations();
  }, [typedPathData, workspaceId, currentTaskIndex, userDataService, t, dynamicTasks.length]);



  // If still no data, show error
  // Early return case - no path data
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
  
  // TypeScript now knows typedPathData is not null after this point
  const currentTask = typedPathData.tasks[currentTaskIndex];
  const isLastTask = currentTaskIndex === typedPathData.tasks.length - 1;

  // Now we have typedPathData, so we can safely access it

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
          ? '讓我們來編輯這個關卡的答案。你之前的答案已經載入。'
          : '這個關卡已完成但沒有保存答案。你可以現在補充答案。'
        : '太好了！讓我們開始這個關卡。我會在旁邊協助你完成每個步驟。',
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, taskIntroMessage]);
  };

  const generateNextTask = async () => {
    if (!workspaceId || isGeneratingTask) return;
    
    // Create path context for both custom and standard paths
    const pathContext = pathData?.pathData ? {
      title: pathData.pathData.title,
      skills: pathData.pathData.skills
    } : {
      title: typedPathData.title,
      skills: typedPathData.skills
    };
    
    // Create story context for standard paths
    const storyContext = pathData?.storyContext || {
      worldSetting: `${typedPathData.title}的專業世界`,
      protagonist: { name: '學習者', background: '正在探索職涯發展', goals: ['掌握核心技能', '建立專業能力'] },
      narrative: `在${typedPathData.title}的領域中，你正在通過實際項目來提升專業技能`,
      theme: '專業成長與技能發展'
    };
    
    setIsGeneratingTask(true);
    try {
      // Prepare task result for AI
      const previousTaskResult = {
        taskId: currentTask.id,
        taskTitle: currentTask.title,
        score: 85, // TODO: Calculate actual score based on evaluation
        timeSpent: '20分鐘',
        choices: [],
        answer: currentTaskAnswer
      };
      
      // Call generate next task API
      const response = await fetch('/api/discovery/generate-next-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'current-user', // TODO: Get from auth
          pathId: pathData?.id || pathId, // Use custom path ID or standard path ID
          pathContext,
          storyContext,
          currentTaskNumber: typedPathData.tasks.length,
          previousTaskResult,
          locale: 'zh-TW' // TODO: Get from i18n
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate task');
      }
      
      const { task } = await response.json();
      
      // Add to dynamic tasks state
      const updatedDynamicTasks = [...dynamicTasks, task];
      setDynamicTasks(updatedDynamicTasks);
      
      // Save the new task to localStorage immediately via discovery service
      console.log('Saving dynamic task:', task);
      await discoveryService.saveDynamicTask('current-user', task);
      console.log('Task saved successfully');
      
      // Update workspace status back to 'active' since we have new tasks
      const userData = await userDataService.loadUserData();
      if (userData && workspaceId) {
        const workspaceIndex = userData.workspaceSessions.findIndex(ws => ws.id === workspaceId);
        if (workspaceIndex !== -1) {
          userData.workspaceSessions[workspaceIndex].status = 'active';
          userData.workspaceSessions[workspaceIndex].lastActiveAt = new Date().toISOString();
          await userDataService.saveUserData(userData);
        }
      }
      
      // Show generation message
      const generationMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'ai',
        text: `🎯 已為你生成新的挑戰任務：「${task.title}」！準備好繼續冒險了嗎？`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, generationMessage]);
      
      // Calculate the new task index based on current state
      // Base tasks + current dynamic tasks count = new task index
      const baseTasksCount = pathData?.pathData?.tasks?.length || pathDataMap[pathId]?.tasks?.length || 0;
      const newTaskIndex = baseTasksCount + dynamicTasks.length;
      
      // Switch to the new task immediately
      setCurrentTaskIndex(newTaskIndex);
      setTaskProgress(0);
      setIsTaskActive(false);
      setShowWorkflow(false);
      
    } catch (error) {
      console.error('Task generation error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'ai',
        text: '生成新任務時遇到問題，請稍後再試。',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGeneratingTask(false);
    }
  };

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
    
    // Update workspace completed tasks immediately
    if (currentTask.id && !workspaceCompletedTasks.includes(currentTask.id)) {
      setWorkspaceCompletedTasks(prev => [...prev, currentTask.id]);
    }
    
    // Calculate the new completed tasks list
    const newCompletedTasks = workspaceCompletedTasks.includes(currentTask.id) 
      ? workspaceCompletedTasks 
      : [...workspaceCompletedTasks, currentTask.id];
    const newCompletedCount = newCompletedTasks.length;
    
    // Check if this is the last task and all tasks are completed
    const isLastTaskCompleted = newCompletedCount === typedPathData.tasks.length;
    
    // Call parent callback with answer and completion status
    onTaskComplete(currentTask.id, xpGained, skillsGained, taskAnswer, isLastTaskCompleted);
    
    // Add completion message
    const completionMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'ai',
      text: `做得好！你完成了「${currentTask.title}」關卡，獲得了 ${xpGained} XP！`,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, completionMessage]);
    if (newCompletedCount === typedPathData.tasks.length) {
      // All tasks completed
      
      // Show completion dialog for user to choose
      const congratsMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `🎉 太棒了！你已經完成了目前所有的挑戰任務！`,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, congratsMessage]);
      
      // Show completion dialog after a short delay
      // Only show if we just completed the last task (not on page reload)
      setTimeout(() => {
        setShowCompletionDialog(true);
      }, 1500);
      
      // Don't auto-navigate - let user decide when to leave
    } else {
      // Auto move to next incomplete task
      const nextIncompleteIndex = typedPathData.tasks.findIndex((task, index) => 
        index > currentTaskIndex && !newCompletedTasks.includes(task.id)
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
            completedTasks: workspaceCompletedTasks.length,
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

  const completedTasksCount = workspaceCompletedTasks.filter(taskId => taskId && taskId.trim() !== '').length;

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
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCharacterProfile(true)}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-4 py-2 rounded-lg hover:from-purple-200 hover:to-blue-200 transition-all"
              >
                <UserGroupIcon className="w-5 h-5" />
                <span>角色設定</span>
              </button>
              <button
                onClick={onBackToPaths}
                className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>返回副本</span>
              </button>
            </div>
          </div>
        
        {/* Current Progress Overview */}
        <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <SparklesIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">目前關卡</p>
              <p className="font-medium text-gray-900">{currentTask.title}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">整體進度</p>
              <p className="font-medium text-purple-700">
                {workspaceCompletedTasks.length}/{typedPathData.tasks.length} 關卡完成
              </p>
            </div>
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(workspaceCompletedTasks.length / typedPathData.tasks.length) * 100}%` }}
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
                      <span className="text-gray-700 font-medium">關卡進行中</span>
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
                      {isViewMode ? '關卡答案（查看模式）' : '此關卡已完成'}
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
              {taskProgress >= 100 && workspaceCompletedTasks.includes(currentTask.id) && workspaceCompletedTasks.length === typedPathData.tasks.length && onViewAchievements && (
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">所有關卡</h3>
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
                                <span className="text-sm text-purple-700 font-bold">關卡進行中...</span>
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
                                  {workspaceCompletedTasks.length === typedPathData.tasks.length ? (
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
              
              {/* Generate More Tasks Button - Show when all tasks completed */}
              {workspaceCompletedTasks.length === typedPathData.tasks.length && !isGeneratingTask && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4"
                >
                  <button
                    onClick={() => generateNextTask()}
                    className="w-full p-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center space-x-2"
                  >
                    <SparklesIcon className="w-5 h-5" />
                    <span>生成更多任務</span>
                  </button>
                </motion.div>
              )}
              
              {/* Dynamic Task Generation Indicator */}
              {isGeneratingTask && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border-2 border-purple-200"
                >
                  <div className="flex items-center space-x-3">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <ArrowPathIcon className="w-5 h-5 text-purple-600" />
                    </motion.div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-900">正在生成新的挑戰任務...</p>
                      <p className="text-xs text-purple-700">AI 正在根據你的表現創造獨特的任務</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Evaluation Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <ClipboardDocumentListIcon className="w-5 h-5 text-purple-600" />
              <span>冒險評估</span>
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
                    選擇評估方式來深化冒險體驗：自我反思、同儕互評或專業導師指導
                  </p>
                  <div className="space-y-2 text-xs text-gray-500">
                    <div className="flex items-center justify-center space-x-2">
                      <ClipboardDocumentListIcon className="w-4 h-4 text-blue-500" />
                      <span>自我評估：反思冒險過程和成果</span>
                    </div>
                    <div className="flex items-center justify-center space-x-2">
                      <UserGroupIcon className="w-4 h-4 text-green-500" />
                      <span>同儕互評：交流冒險心得與建議</span>
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

      {/* Character Profile Popup */}
      {showCharacterProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">角色設定檔</h2>
                  <p className="text-purple-100">{typedPathData.title}</p>
                </div>
                <button
                  onClick={() => setShowCharacterProfile(false)}
                  className="text-white hover:text-purple-200 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* World Setting */}
              {typedPathData.worldSetting && (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl">
                  <h3 className="text-lg font-bold text-purple-800 mb-2 flex items-center space-x-2">
                    <GlobeAltIcon className="w-5 h-5" />
                    <span>冒險世界</span>
                  </h3>
                  <p className="text-purple-700">{typedPathData.worldSetting}</p>
                </div>
              )}

              {/* Protagonist */}
              {typedPathData.protagonist && (
                <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                  <h3 className="text-lg font-bold text-emerald-800 mb-2 flex items-center space-x-2">
                    <UserGroupIcon className="w-5 h-5" />
                    <span>你的角色</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium text-emerald-700">身分：{typedPathData.protagonist.name}</p>
                      <p className="text-emerald-600 mt-1">{typedPathData.protagonist.background}</p>
                    </div>
                    {typedPathData.protagonist.goals && (
                      <div>
                        <p className="font-medium text-emerald-700 mb-1">目標：</p>
                        <ul className="list-disc list-inside text-emerald-600 space-y-1">
                          {typedPathData.protagonist.goals.map((goal, index) => (
                            <li key={index}>{goal}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {typedPathData.protagonist.personality && (
                      <div>
                        <p className="font-medium text-emerald-700">性格特質：</p>
                        <p className="text-emerald-600">{typedPathData.protagonist.personality}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Story Context */}
              {typedPathData.storyContext && (
                <div className="mb-6">
                  {/* Main Narrative */}
                  {typedPathData.storyContext.mainNarrative && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl">
                      <h3 className="text-lg font-bold text-red-800 mb-2">主要劇情</h3>
                      <p className="text-red-700">{typedPathData.storyContext.mainNarrative}</p>
                    </div>
                  )}

                  {/* Current Conflict */}
                  {typedPathData.storyContext.currentConflict && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border-l-4 border-red-400">
                      <h3 className="text-lg font-bold text-red-800 mb-2">當前挑戰</h3>
                      <p className="text-red-700">{typedPathData.storyContext.currentConflict}</p>
                    </div>
                  )}

                  {/* Key Characters */}
                  {typedPathData.storyContext.keyCharacters && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                      <h3 className="text-lg font-bold text-blue-800 mb-3">關鍵角色</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {typedPathData.storyContext.keyCharacters.map((character, index) => (
                          <div key={index} className="bg-white p-3 rounded-lg shadow-sm">
                            <h4 className="font-medium text-blue-900">{character.name}</h4>
                            <p className="text-sm text-blue-600 mb-1">{character.role}</p>
                            <p className="text-xs text-blue-500">{character.personality}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Assistants & Skills */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* AI Assistants */}
                <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl">
                  <h3 className="text-lg font-bold text-cyan-800 mb-3 flex items-center space-x-2">
                    <CpuChipIcon className="w-5 h-5" />
                    <span>AI 助手團隊</span>
                  </h3>
                  <div className="space-y-2">
                    {typedPathData.aiAssistants.map((assistant, index) => (
                      <div key={index} className="bg-white px-3 py-2 rounded-lg text-cyan-700 font-medium">
                        {assistant}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl">
                  <h3 className="text-lg font-bold text-orange-800 mb-3 flex items-center space-x-2">
                    <SparklesIcon className="w-5 h-5" />
                    <span>核心技能</span>
                  </h3>
                  <div className="space-y-2">
                    {typedPathData.skills.map((skill, index) => (
                      <div key={index} className="bg-white px-3 py-2 rounded-lg text-orange-700 font-medium">
                        {skill}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowCharacterProfile(false)}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                關閉角色設定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Dialog */}
      {showCompletionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white rounded-t-2xl">
              <div className="text-center">
                <TrophyIcon className="w-16 h-16 mx-auto mb-3" />
                <h2 className="text-2xl font-bold mb-2">恭喜完成所有任務！</h2>
                <p className="text-green-100">你已經成功挑戰了所有關卡</p>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-gray-700 mb-4">
                  你已經完成了這個冒險路徑的所有任務！<br/>
                  接下來想要做什麼呢？
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600">
                    完成任務數：{workspaceCompletedTasks.length}<br/>
                    獲得經驗值：{achievements.totalXp} XP
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    setShowCompletionDialog(false);
                    // Ensure workspace status stays active when generating new tasks
                    const userData = await userDataService.loadUserData();
                    if (userData && workspaceId) {
                      const workspaceIndex = userData.workspaceSessions.findIndex(ws => ws.id === workspaceId);
                      if (workspaceIndex !== -1) {
                        userData.workspaceSessions[workspaceIndex].status = 'active';
                        userData.workspaceSessions[workspaceIndex].lastActiveAt = new Date().toISOString();
                        await userDataService.saveUserData(userData);
                      }
                    }
                    generateNextTask();
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center space-x-2"
                >
                  <SparklesIcon className="w-5 h-5" />
                  <span>生成更多挑戰任務</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowCompletionDialog(false);
                    // Mark workspace as truly completed
                    onTaskComplete('', 0, [], '', true);
                    // Navigate back after a delay
                    setTimeout(() => {
                      onBackToPaths();
                    }, 500);
                  }}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-all flex items-center justify-center space-x-2"
                >
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>完成並返回</span>
                </button>
                
                <button
                  onClick={() => setShowCompletionDialog(false)}
                  className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all"
                >
                  繼續探索
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}