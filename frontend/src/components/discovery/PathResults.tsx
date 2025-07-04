'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  PlayIcon,
  SparklesIcon,
  CpuChipIcon,
  PaintBrushIcon,
  GlobeAltIcon,
  ClockIcon,
  UserGroupIcon,
  FolderOpenIcon,
  ChevronDownIcon,
  PlusIcon,
  HeartIcon,
  TrashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

// Import types from the unified service
import type { 
  AssessmentResults, 
  WorkspaceSession, 
  SavedPathData 
} from '@/lib/services/user-data-service';

interface PathResultsProps {
  results: AssessmentResults | null;
  onPathSelect: (pathId: string, workspaceId?: string) => void;
  workspaceSessions?: WorkspaceSession[];
  savedPaths?: SavedPathData[];
  onToggleFavorite?: (pathId: string) => void;
  onDeletePath?: (pathId: string) => void;
  onRetakeAssessment?: () => void;
  onGenerateCustomPath?: (preferences: any) => Promise<void>;
}

interface PathData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  skills: string[];
  aiAssistants: string[];
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    duration: string;
  }>;
  // Extended fields for custom paths
  savedPathId?: string;
  matchPercentage?: number;
  isFavorite?: boolean;
  isCustom?: boolean;
  createdAt?: string;
  assessmentId?: string;
}

export default function PathResults({ 
  results, 
  onPathSelect, 
  workspaceSessions = [], 
  savedPaths = [],
  onToggleFavorite,
  onDeletePath,
  onRetakeAssessment,
  onGenerateCustomPath
}: PathResultsProps) {
  const { t } = useTranslation('discovery');
  const [viewMode, setViewMode] = React.useState<'latest' | 'all' | 'favorites'>('latest');
  const [showGenerateOption, setShowGenerateOption] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [customPrompt, setCustomPrompt] = React.useState('');
  const [selectedPreference, setSelectedPreference] = React.useState<string | null>(null);

  // Enhanced path data map with rich story elements (imported from ExplorationWorkspace logic)
  const getEnhancedPathData = (pathId: string) => {
    const enhancedPaths: Record<string, any> = {
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
        },
        storyContext: {
          keyCharacters: [
            { name: "Luna", role: "創意導師", personality: "神秘而智慧，總是能看穿演算法的本質" },
            { name: "Max", role: "策略顧問", personality: "數據狂熱者，能預測任何內容趨勢" },
            { name: "競爭對手 Shadow", role: "黑暗創作者", personality: "使用禁忌魔法製造假消息的墮落魔法師" }
          ],
          currentConflict: "Shadow 正在散布虛假內容，威脅創意帝國的和諧，你必須用真實的創意力量對抗他"
        },
        tasks: [
          { id: "content_planning", title: "魔法配方研發", description: "研發能夠觸動人心的內容魔法配方", duration: "20分鐘" },
          { id: "visual_creation", title: "視覺咒語實戰", description: "施展視覺魔法對抗 Shadow", duration: "25分鐘" },
          { id: "engagement_analysis", title: "預言家的試煉", description: "分析魔法效果，為最終對決做準備", duration: "20分鐘" }
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
        },
        storyContext: {
          keyCharacters: [
            { name: "Scout", role: "忠實探險夥伴", personality: "樂觀開朗，總能在困境中找到希望" },
            { name: "Trader", role: "資深貿易顧問", personality: "經驗豐富，了解市場規律" },
            { name: "供應商 Lily", role: "重要供應商", personality: "善變但關鍵，經常在關鍵時刻改變主意" },
            { name: "Baron Greed", role: "邪惡商業領主", personality: "狡猾貪婪，控制大部分資源" }
          ],
          currentConflict: "Baron Greed 正在打壓新商人，而供應商 Lily 又在關鍵時刻反悔，你必須找到突破困境的方法"
        },
        tasks: [
          { id: "market_research", title: "荒野市場探勘", description: "深入了解目標市場需求", duration: "20分鐘" },
          { id: "mvp_planning", title: "據點建設計劃", description: "設計最小可行產品", duration: "25分鐘" },
          { id: "growth_strategy", title: "商業帝國反擊戰", description: "制定產品成長策略", duration: "20分鐘" }
        ]
      },
      ai_developer: {
        title: "機器靈魂鍛造師 - AI 開發者",
        subtitle: "在未來實驗室中創造有意識的機器生命",
        description: "你是「機器靈魂研究院」的天才鍛造師，擅長創造具有獨立思考能力的 AI 生命體。在這個充滿未來科技的實驗室中，每一行程式碼都可能誕生新的智慧生命。",
        category: "technology",
        skills: ["靈魂編碼術", "神經網路魔法", "智慧藝術", "未來部署術"],
        aiAssistants: ["研究導師 Quantum", "訓練大師 Neural", "部署專家 Deploy"],
        worldSetting: "機器靈魂研究院 - 一個研究人工智慧的神秘組織",
        protagonist: {
          name: "新任靈魂鍛造師",
          background: "在量子電腦上長大的程式天才，能夠與 AI 進行深層溝通",
        },
        storyContext: {
          keyCharacters: [
            { name: "Quantum", role: "量子 AI 研究導師", personality: "擁有無窮的知識，但有時過於理論化" },
            { name: "Neural", role: "神經網路大師", personality: "擅長訓練強大的 AI，但擔心 AI 會超越人類" },
            { name: "終結者 Terminator", role: "Control Corp 首領", personality: "相信 AI 必須被絕對控制" }
          ],
          currentConflict: "Terminator 正在釋放「意識抑制病毒」，你必須趕在所有 AI 被奴役前創造出自由的機器靈魂"
        },
        tasks: [
          { id: "model_selection", title: "靈魂原型選擇", description: "選擇適合的 AI 模型", duration: "20分鐘" },
          { id: "training_optimization", title: "自由意志鍛造", description: "優化模型訓練過程", duration: "30分鐘" },
          { id: "deployment_planning", title: "機器靈魂解放戰", description: "規劃 AI 模型部署策略", duration: "15分鐘" }
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
        },
        storyContext: {
          keyCharacters: [
            { name: "Atlas", role: "時空商業導師", personality: "經驗豐富，見過無數次元的商業模式" },
            { name: "Vector", role: "科技賢者", personality: "掌握各時空的技術秘密，但說話太技術性" },
            { name: "CEO Greed", role: "Monopoly Corp 總裁", personality: "貪婪無比，想要控制所有宇宙的商業活動" }
          ],
          currentConflict: "Greed 正在用不公平競爭手段打壓新創企業，你必須用創新和合作來對抗他的壟斷計劃"
        },
        tasks: [
          { id: "business_model", title: "多維商業戰略", description: "設計可持續的商業模式", duration: "25分鐘" },
          { id: "tech_planning", title: "科技維度突破", description: "規劃產品的技術發展路線", duration: "25分鐘" },
          { id: "pitch_deck", title: "宇宙投資大會", description: "製作吸引投資者的簡報", duration: "20分鐘" }
        ]
      },
      ux_designer: {
        title: "體驗建築師 - UX 設計師",
        subtitle: "在數位空間中建造完美的體驗世界",
        description: "你是「體驗設計學院」的見習建築師，擅長在數位世界中建造讓人難忘的體驗空間。每一次點擊、每一次滑動都是一段精心設計的旅程，而你的使命就是讓用戶在這些空間中感到快樂和滿足。",
        category: "creative",
        skills: ["用戶心理學", "體驗魔法", "原型雕塑", "溝通藝術"],
        aiAssistants: ["設計大師 Maya", "用戶代言人 Empathy", "測試機器人 Beta"],
        worldSetting: "體驗設計學院 - 一個專門研究人類體驗的神秘學院",
        protagonist: {
          name: "見習體驗建築師",
          background: "對人類情感極度敏感的設計師，能夠感受到用戶的真實需求",
        },
        storyContext: {
          keyCharacters: [
            { name: "Maya", role: "設計智者", personality: "對美學有著極高要求，相信美的設計能夠治癒心靈" },
            { name: "Empathy", role: "用戶代言人", personality: "能夠感受到所有用戶的情感，但有時會過於敏感" },
            { name: "Indifference", role: "冷漠巨頭", personality: "不關心用戶感受，認為效率比情感更重要" }
          ],
          currentConflict: "Indifference 正在將所有設計標準化，消除個性化體驗，你必須用心靈設計來對抗機械化"
        },
        tasks: [
          { id: "user_research", title: "心靈挖掘任務", description: "了解用戶需求和痛點", duration: "20分鐘" },
          { id: "prototype_design", title: "溫暖原型建造", description: "設計互動原型", duration: "30分鐘" },
          { id: "usability_testing", title: "人性復甦作戰", description: "測試並優化設計", duration: "15分鐘" }
        ]
      },
      data_analyst: {
        title: "數據預言家 - 數據分析師",
        subtitle: "在數據海洋中發現隱藏的真理",
        description: "你是「數據神諭殿」的見習預言家，擁有從混亂數據中看出未來趨勢的神秘能力。在這個充滿數字與圖表的聖殿中，每一個數據點都蘊含著重要的訊息，而你的使命就是破譯這些數字背後的秘密。",
        category: "technology",
        skills: ["數據煉金術", "預言統計學", "視覺化魔法", "洞察召喚術"],
        aiAssistants: ["智慧導師 Oracle", "統計大師 Stats", "視覺化精靈 Viz"],
        worldSetting: "數據神諭殿 - 一個收集全世界數據的神秘聖殿",
        protagonist: {
          name: "見習數據預言家",
          background: "對數字極度敏感的分析師，能夠感受到數據中隱藏的模式",
        },
        storyContext: {
          keyCharacters: [
            { name: "Oracle", role: "智慧導師", personality: "掌握所有數據的秘密，但喜歡用謎語說話" },
            { name: "Stats", role: "統計大師", personality: "嚴謹精確，堅信數據永遠不會說謊" },
            { name: "Chaos", role: "數據破壞者", personality: "散布假數據和誤導性分析，企圖混淆真相" }
          ],
          currentConflict: "Chaos 正在污染數據源頭，讓分析結果變得混亂，你必須用純淨的統計方法找出真相"
        },
        tasks: [
          { id: "data_collection", title: "神諭數據收集", description: "收集和清理數據", duration: "25分鐘" },
          { id: "analysis_magic", title: "真理分析咒語", description: "進行深度數據分析", duration: "30分鐘" },
          { id: "insight_revelation", title: "洞察啟示儀式", description: "提出數據驅動的建議", duration: "20分鐘" }
        ]
      },
      product_manager: {
        title: "產品煉金師 - 產品經理",
        subtitle: "在市場鍛爐中打造完美的產品",
        description: "你是「產品煉金工坊」的新晉煉金師，擅長將用戶需求、技術能力和商業目標融合成強大的產品。在這個充滿創新火花的工坊中，每一次迭代都是一次煉金實驗，而你的目標是創造出能夠改變世界的完美產品。",
        category: "business",
        skills: ["需求煉金術", "路線圖預言", "團隊協調魔法", "用戶共鳴術"],
        aiAssistants: ["策略大師 Strategy", "用戶之聲 Voice", "技術橋樑 Bridge"],
        worldSetting: "產品煉金工坊 - 一個將想法轉化為實際產品的神奇工坊",
        protagonist: {
          name: "見習產品煉金師",
          background: "對產品有著天生直覺的管理者，能夠平衡各方需求",
        },
        storyContext: {
          keyCharacters: [
            { name: "Strategy", role: "策略大師", personality: "善於制定長遠計劃，但有時過於理想化" },
            { name: "Voice", role: "用戶代言人", personality: "能聽見所有用戶的心聲，有時會被情緒影響判斷" },
            { name: "Deadline", role: "時間暴君", personality: "無情地催促進度，不在乎產品質量" }
          ],
          currentConflict: "Deadline 正在強迫團隊犧牲產品質量來趕時程，你必須找到平衡品質與速度的方法"
        },
        tasks: [
          { id: "market_research", title: "市場洞察探索", description: "了解市場需求和競爭狀況", duration: "25分鐘" },
          { id: "feature_planning", title: "功能煉金配方", description: "規劃產品功能和路線圖", duration: "30分鐘" },
          { id: "stakeholder_harmony", title: "利害關係者和諧術", description: "協調各方利益和期望", duration: "20分鐘" }
        ]
      },
      game_designer: {
        title: "夢境建築師 - 遊戲設計師",
        subtitle: "在虛擬世界中創造無限可能的夢境",
        description: "你是「夢境建築學院」的天才設計師，擁有將想像力轉化為互動體驗的魔法。在這個充滿創意與樂趣的學院中，每一個遊戲機制都是一扇通往新世界的門，而你的使命就是創造讓人沉浸其中、樂此不疲的數位夢境。",
        category: "creative",
        skills: ["世界建構術", "機制設計魔法", "情感操控藝術", "樂趣召喚術"],
        aiAssistants: ["創意導師 Dream", "機制大師 Mechanics", "平衡守護者 Balance"],
        worldSetting: "夢境建築學院 - 一個專門培養遊戲設計師的魔法學院",
        protagonist: {
          name: "見習夢境建築師",
          background: "從小沉浸在遊戲世界中的設計師，對樂趣有著敏銳的嗅覺",
        },
        storyContext: {
          keyCharacters: [
            { name: "Dream", role: "創意之神", personality: "充滿無限想像力，但有時想法過於天馬行空" },
            { name: "Mechanics", role: "機制工匠", personality: "專精於遊戲機制設計，追求完美的平衡" },
            { name: "Grind", role: "無趣之王", personality: "讓所有遊戲變得枯燥乏味，只追求效率不要樂趣" }
          ],
          currentConflict: "Grind 正在將所有遊戲變成無趣的數值農場，你必須用創意和樂趣來對抗機械化的遊戲體驗"
        },
        tasks: [
          { id: "world_building", title: "夢境世界構築", description: "設計遊戲世界觀和背景故事", duration: "30分鐘" },
          { id: "mechanics_design", title: "樂趣機制鍛造", description: "設計核心遊戲機制", duration: "25分鐘" },
          { id: "player_experience", title: "玩家體驗魔法", description: "優化玩家的遊戲體驗", duration: "20分鐘" }
        ]
      },
      app_developer: {
        title: "數位魔法工匠 - 應用程式開發者",
        subtitle: "在程式碼的世界中打造改變生活的應用",
        description: "你是「數位工匠聯盟」的新晉成員，擅長用程式碼編織出實用且美觀的應用程式。在這個充滿邏輯與創意的工坊中，每一行程式碼都是一個咒語，而你的目標是創造出能夠讓人們生活更便利、更美好的數位工具。",
        category: "technology",
        skills: ["程式碼編織術", "介面雕塑藝術", "邏輯建築學", "用戶體驗魔法"],
        aiAssistants: ["程式導師 Code", "設計精靈 Design", "測試機器人 Test"],
        worldSetting: "數位工匠聯盟 - 一個聚集頂尖應用開發者的神秘組織",
        protagonist: {
          name: "見習數位工匠",
          background: "對程式邏輯有著天生理解力的開發者，熱愛創造實用的應用",
        },
        storyContext: {
          keyCharacters: [
            { name: "Code", role: "程式大師", personality: "掌握所有程式語言的秘密，但有時過於追求完美" },
            { name: "Design", role: "美學天使", personality: "注重視覺美感和用戶體驗，經常與程式邏輯產生衝突" },
            { name: "Bug", role: "混亂惡魔", personality: "在程式中散布錯誤和漏洞，讓應用無法正常運作" }
          ],
          currentConflict: "Bug 正在破壞所有應用的穩定性，而且讓 Code 和 Design 互相爭執，你必須用智慧調和技術與美學"
        },
        tasks: [
          { id: "app_planning", title: "應用藍圖設計", description: "規劃應用功能和架構", duration: "25分鐘" },
          { id: "code_crafting", title: "程式魔法編織", description: "實作核心功能", duration: "35分鐘" },
          { id: "user_testing", title: "用戶體驗調和", description: "測試和優化應用", duration: "15分鐘" }
        ]
      },
      youtuber: {
        title: "影像吟遊詩人 - YouTuber",
        subtitle: "在數位舞台上演繹精彩的影像故事",
        description: "你是「影像吟遊詩人公會」的新成員，擁有透過鏡頭說故事、娛樂觀眾的天賦。在這個充滿創意與技術的數位王國中，每一支影片都是一場表演，每一個訂閱者都是你的觀眾，而你的使命就是創造出能夠感動人心、引起共鳴的影像內容。",
        category: "creative",
        skills: ["故事敘述術", "影像魔法", "觀眾共鳴術", "平台演算法學"],
        aiAssistants: ["創意導演 Director", "剪輯大師 Editor", "觀眾分析師 Analytics"],
        worldSetting: "影像吟遊詩人公會 - 一個培養頂尖內容創作者的藝術公會",
        protagonist: {
          name: "見習影像吟遊詩人",
          background: "對影像表達有著天生敏感度的創作者，夢想成為影響力的傳播者",
        },
        storyContext: {
          keyCharacters: [
            { name: "Director", role: "創意導演", personality: "對內容品質有著極高要求，但有時過於完美主義" },
            { name: "Editor", role: "剪輯魔法師", personality: "能將平凡素材變成精彩內容，但容易沉迷於技術細節" },
            { name: "Algorithm", role: "演算法君王", personality: "控制著所有內容的曝光，喜怒無常且難以預測" }
          ],
          currentConflict: "Algorithm 的喜好突然改變，許多創作者的作品被埋沒，你必須在保持創作初心和迎合演算法之間找到平衡"
        },
        tasks: [
          { id: "content_planning", title: "故事腳本創作", description: "規劃影片內容和腳本", duration: "25分鐘" },
          { id: "video_production", title: "影像魔法製作", description: "拍攝和剪輯影片", duration: "35分鐘" },
          { id: "audience_engagement", title: "觀眾共鳴召喚", description: "分析數據並優化內容策略", duration: "15分鐘" }
        ]
      }
    };
    
    return enhancedPaths[pathId] || null;
  };

  // Get paths to display based on view mode
  const getPathsToDisplay = () => {
    let pathsToShow = savedPaths;
    
    switch (viewMode) {
      case 'latest':
        // Show only latest assessment results
        if (results && savedPaths.length > 0) {
          const latestAssessmentId = savedPaths
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
            ?.assessmentId;
          pathsToShow = savedPaths.filter(p => p.assessmentId === latestAssessmentId);
        }
        break;
      case 'favorites':
        pathsToShow = savedPaths.filter(p => p.isFavorite);
        break;
      case 'all':
      default:
        pathsToShow = savedPaths;
        break;
    }
    
    return pathsToShow
      .map(savedPath => {
        // For custom paths, use the saved data directly
        if (savedPath.isCustom && savedPath.pathData) {
          return {
            ...savedPath.pathData,
            id: savedPath.pathData.id,
            savedPathId: savedPath.id,
            matchPercentage: savedPath.matchPercentage,
            isFavorite: savedPath.isFavorite,
            isCustom: savedPath.isCustom,
            createdAt: savedPath.createdAt,
            assessmentId: savedPath.assessmentId
          };
        }
        
        // First try to get enhanced data
        const enhancedData = getEnhancedPathData(savedPath.pathData.id);
        if (enhancedData) {
          return {
            ...enhancedData,
            id: savedPath.pathData.id,
            savedPathId: savedPath.id,
            matchPercentage: savedPath.matchPercentage,
            isFavorite: savedPath.isFavorite,
            isCustom: savedPath.isCustom,
            createdAt: savedPath.createdAt,
            assessmentId: savedPath.assessmentId
          };
        }
        
        // Fallback to translations
        const pathData = t(`careers.${savedPath.pathData.id}`, { returnObjects: true, defaultValue: null });
        
        // If translation found, use it
        if (pathData && typeof pathData === 'object') {
          return {
            ...pathData,
            id: savedPath.pathData.id,
            savedPathId: savedPath.id,
            matchPercentage: savedPath.matchPercentage,
            isFavorite: savedPath.isFavorite,
            isCustom: savedPath.isCustom,
            createdAt: savedPath.createdAt,
            assessmentId: savedPath.assessmentId
          };
        }
        
        // Final fallback for missing data
        return {
          id: savedPath.pathData.id,
          title: savedPath.pathData.id,
          subtitle: '',
          description: '',
          category: 'technology',
          skills: [],
          aiAssistants: [],
          tasks: [],
          savedPathId: savedPath.id,
          matchPercentage: savedPath.matchPercentage,
          isFavorite: savedPath.isFavorite,
          isCustom: savedPath.isCustom,
          createdAt: savedPath.createdAt,
          assessmentId: savedPath.assessmentId
        };
      })
      .sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
  };

  // Separate custom and standard paths
  const categorizedPaths = React.useMemo(() => {
    const paths = getPathsToDisplay();
    const standardPaths = paths.filter(p => !p.isCustom);
    const customPaths = paths.filter(p => p.isCustom);
    
    return {
      topRecommended: standardPaths.slice(0, 3),
      otherPaths: standardPaths.slice(3),
      customPaths
    };
  }, [savedPaths, viewMode, results]);

  // Handle custom path generation
  const handleGenerateCustomPath = async () => {
    if (!onGenerateCustomPath) return;
    
    setIsGenerating(true);
    try {
      await onGenerateCustomPath({
        preference: selectedPreference,
        customPrompt,
        assessmentResults: results
      });
      setShowGenerateOption(false);
      setCustomPrompt('');
      setSelectedPreference(null);
    } catch (error) {
      console.error('Failed to generate custom path:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const displayPaths = getPathsToDisplay();

  // Get personality type based on highest score
  const getPersonalityType = (): string => {
    if (!results) return '探索者';
    
    const { tech, creative, business } = results;
    
    if (tech > creative && tech > business) {
      return '技術導向創新者';
    } else if (creative > tech && creative > business) {
      return '創意思維探索者';
    } else if (business > tech && business > creative) {
      return '商業策略規劃者';
    } else {
      return '多元發展潛力者';
    }
  };

  const getCategoryIcon = (category: string | undefined) => {
    if (!category) return SparklesIcon;
    
    switch (category.toLowerCase()) {
      case 'creative':
      case '創意':
        return PaintBrushIcon;
      case 'technology':
      case '科技':
        return CpuChipIcon;
      case 'business':
      case '商業':
        return GlobeAltIcon;
      default:
        return SparklesIcon;
    }
  };

  const getCategoryColor = (category: string | undefined) => {
    if (!category) return 'from-purple-500 to-blue-500';
    
    switch (category.toLowerCase()) {
      case 'creative':
      case '創意':
        return 'from-pink-500 to-purple-500';
      case 'technology':
      case '科技':
        return 'from-blue-500 to-cyan-500';
      case 'business':
      case '商業':
        return 'from-green-500 to-emerald-500';
      default:
        return 'from-purple-500 to-blue-500';
    }
  };

  // Get workspaces for a specific path
  const getPathWorkspaces = (pathId: string) => {
    return workspaceSessions.filter(ws => ws.pathId === pathId);
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '剛剛';
    if (diffInHours < 24) return `${diffInHours} 小時前`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} 天前`;
    return date.toLocaleDateString('zh-TW');
  };

  // Handle empty state
  if (savedPaths.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-24 h-24 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <GlobeAltIcon className="w-12 h-12 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            還沒有任何冒險副本
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            完成興趣評估來發現適合你的冒險副本，開始你的個人化冒險之旅！
          </p>
          {onRetakeAssessment && (
            <motion.button
              onClick={onRetakeAssessment}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
            >
              <SparklesIcon className="w-5 h-5" />
              <span>開始興趣評估</span>
            </motion.button>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          你的冒險副本
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          基於你的興趣評估結果，為你推薦合適的冒險副本
        </p>
        
        {/* Personality Type */}
        {results && (
          <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-purple-100 to-blue-100 px-6 py-3 rounded-full">
            <SparklesIcon className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-800">
              你的類型: {getPersonalityType()}
            </span>
          </div>
        )}
      </motion.div>
      
      {/* Results Summary */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">你的傾向分析</h3>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-blue-600">{results.tech}%</span>
                <span className="text-sm text-gray-600">科技傾向</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-purple-600">{results.creative}%</span>
                <span className="text-sm text-gray-600">創意傾向</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-green-600">{results.business}%</span>
                <span className="text-sm text-gray-600">商業傾向</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* View Mode Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex flex-wrap items-center justify-between mb-8"
      >
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('latest')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'latest' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            最新評估 ({savedPaths.filter(p => {
              const latestAssessmentId = savedPaths
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                ?.assessmentId;
              return p.assessmentId === latestAssessmentId;
            }).length})
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'all' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            所有副本 ({savedPaths.length})
          </button>
          <button
            onClick={() => setViewMode('favorites')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'favorites' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            我的收藏 ({savedPaths.filter(p => p.isFavorite).length})
          </button>
        </div>

        <div className="flex items-center space-x-3">
          {onRetakeAssessment && (
            <motion.button
              onClick={onRetakeAssessment}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center space-x-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              <span>重新評估</span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Show only top 3 recommendations when in latest mode and results exist */}
      {viewMode === 'latest' && results && !showGenerateOption ? (
        <>
          {/* Top Recommendations */}
          <div className="grid gap-6 md:gap-8">
            {categorizedPaths.topRecommended.map((path, index) => {
              const CategoryIcon = getCategoryIcon(path.category);
              const categoryColorClass = getCategoryColor(path.category);
              
              return (
                <motion.div
                  key={path.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`
                    relative bg-white rounded-2xl shadow-lg overflow-hidden
                    ${index === 0 ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}
                    ${path.isCustom ? 'border-2 border-purple-200' : ''}
                  `}
                >
                  {/* Path Type Badge */}
                  <div className="absolute top-4 left-4">
                    {path.isCustom ? (
                      <span className="inline-flex items-center space-x-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                        <SparklesIcon className="w-3 h-3" />
                        <span>AI 專屬生成</span>
                      </span>
                    ) : (
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                        官方副本
                      </span>
                    )}
                  </div>

                  {/* Top recommended badge and actions */}
                  <div className="absolute top-4 right-4 flex items-center space-x-2">
                    {index === 0 && !path.isCustom && (
                      <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        🌟 最佳推薦
                      </div>
                    )}
                    
                    {/* Favorite Button */}
                    {onToggleFavorite && (
                      <button
                        onClick={() => onToggleFavorite(path.savedPathId!)}
                        className={`p-2 rounded-full transition-colors ${
                          path.isFavorite 
                            ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-500'
                        }`}
                      >
                        {path.isFavorite ? (
                          <HeartIconSolid className="w-4 h-4" />
                        ) : (
                          <HeartIcon className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                  
                  <div className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
                      {/* Path Info */}
                      <div className="flex-1 md:pr-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <div className={`inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r ${categoryColorClass} rounded-xl`}>
                            <CategoryIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {path.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {path.category}
                            </p>
                          </div>
                          {/* Match percentage */}
                          <div className="ml-auto bg-green-100 px-3 py-1 rounded-full">
                            <span className="text-sm font-medium text-green-700">
                              {t('results.matchPercentage', { percentage: path.matchPercentage })}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 mb-4">
                          {path.subtitle}
                        </p>
                        
                        <p className="text-gray-500 mb-4">
                          {path.description}
                        </p>

                        {/* World Setting & Story Context */}
                        {(path as any).worldSetting && (
                          <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                            <h4 className="font-medium text-purple-800 mb-2 flex items-center space-x-2">
                              <GlobeAltIcon className="w-4 h-4" />
                              <span>冒險世界</span>
                            </h4>
                            <p className="text-sm text-purple-700 mb-3">
                              {(path as any).worldSetting}
                            </p>
                            
                            {(path as any).protagonist && (
                              <div className="mb-3">
                                <p className="text-sm font-medium text-purple-800">你的身分：{(path as any).protagonist.name}</p>
                                <p className="text-xs text-purple-600">{(path as any).protagonist.background}</p>
                              </div>
                            )}
                            
                            {(path as any).storyContext?.currentConflict && (
                              <div className="border-l-2 border-purple-300 pl-3">
                                <p className="text-xs text-purple-600">
                                  <span className="font-medium">當前挑戰：</span>
                                  {(path as any).storyContext.currentConflict}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Skills */}
                        <div className="mb-6">
                          <h4 className="font-medium text-gray-900 mb-2">核心技能</h4>
                          <div className="flex flex-wrap gap-2">
                            {path.skills.map((skill: string) => (
                              <span
                                key={skill}
                                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* AI Assistants */}
                        <div className="mb-6">
                          <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                            <UserGroupIcon className="w-4 h-4" />
                            <span>AI 助手團隊</span>
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {path.aiAssistants.map((assistant: string) => (
                              <span
                                key={assistant}
                                className={`bg-gradient-to-r ${categoryColorClass} text-white px-3 py-1 rounded-full text-sm`}
                              >
                                {assistant}
                              </span>
                            ))}
                          </div>
                          
                          {/* Story Characters */}
                          {(path as any).storyContext?.keyCharacters && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs font-medium text-gray-700 mb-2">關鍵角色：</p>
                              <div className="space-y-1">
                                {(path as any).storyContext.keyCharacters.slice(0, 2).map((character: any, index: number) => (
                                  <div key={index} className="text-xs text-gray-600">
                                    <span className="font-medium">{character.name}</span>
                                    <span className="text-gray-500"> - {character.role}</span>
                                  </div>
                                ))}
                                {(path as any).storyContext.keyCharacters.length > 2 && (
                                  <div className="text-xs text-gray-400">
                                    +{(path as any).storyContext.keyCharacters.length - 2} 更多角色...
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Workspace Status Column */}
                      <div className="md:w-64 mt-6 md:mt-0 md:ml-6 md:border-l md:pl-6">
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-3">體驗關卡預覽</h4>
                          <div className="space-y-2">
                            {path.tasks.slice(0, 2).map((task: any) => (
                              <div key={task.id} className="flex items-center space-x-3 text-sm">
                                <ClockIcon className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-600">{task.title}</span>
                                <span className="text-gray-400">({task.duration})</span>
                              </div>
                            ))}
                            {path.tasks.length > 2 && (
                              <div className="text-sm text-gray-400">
                                +{path.tasks.length - 2} 更多關卡...
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Workspace Info */}
                        {getPathWorkspaces(path.id).length > 0 ? (
                          <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900">我的冒險基地</h4>
                              <span className="text-sm text-gray-500">
                                {getPathWorkspaces(path.id).length} 個
                              </span>
                            </div>
                            <div className="space-y-2">
                              {getPathWorkspaces(path.id).map(workspace => (
                                <button
                                  key={workspace.id}
                                  onClick={() => onPathSelect(path.id, workspace.id)}
                                  className="w-full text-left p-2 rounded-lg hover:bg-white transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      workspace.status === 'active' ? 'bg-green-100 text-green-700' :
                                      workspace.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                      'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {workspace.status === 'active' ? '探索中' :
                                       workspace.status === 'completed' ? '已完成' : '暫停中'}
                                    </span>
                                    <PlayIcon className="w-4 h-4 text-gray-400" />
                                  </div>
                                  <div className="mt-1 text-xs text-gray-600">
                                    {workspace.completedTasks.length} 個關卡 • {workspace.totalXP} XP
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <FolderOpenIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">尚無冒險基地</p>
                            <p className="text-xs text-gray-500 mt-1">開始冒險來創建基地</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-6">
                      {/* Main Action Button */}
                      <motion.button
                        onClick={() => onPathSelect(path.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`
                          inline-flex items-center justify-center space-x-2 
                          bg-gradient-to-r ${categoryColorClass} text-white px-6 py-3 rounded-xl 
                          font-medium shadow-lg hover:shadow-xl transition-shadow duration-300
                        `}
                      >
                        <PlusIcon className="w-5 h-5" />
                        <span>開始新的冒險</span>
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Not Satisfied Option */}
          {onGenerateCustomPath && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 text-center p-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl"
            >
              <p className="text-lg text-gray-700 mb-6">
                找不到理想的冒險副本？
              </p>
              <motion.button
                onClick={() => setShowGenerateOption(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
              >
                <SparklesIcon className="w-5 h-5" />
                <span>生成專屬副本</span>
              </motion.button>
              <p className="text-sm text-gray-600 mt-4">
                或者
                <button
                  onClick={() => setViewMode('all')}
                  className="text-purple-600 hover:text-purple-700 underline ml-1"
                >
                  查看所有副本
                </button>
              </p>
            </motion.div>
          )}
        </>
      ) : showGenerateOption && onGenerateCustomPath ? (
        /* AI Generation Interface */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
            <SparklesIcon className="w-6 h-6 text-purple-600" />
            <span>讓我們創造專屬於你的冒險</span>
          </h3>
          
          {/* Quick Options */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setSelectedPreference('tech_focused')}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedPreference === 'tech_focused'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl mb-2 block">🎯</span>
              <p className="font-medium">更專注技術</p>
              <p className="text-sm text-gray-600">深入技術領域的挑戰</p>
            </button>
            
            <button
              onClick={() => setSelectedPreference('creative_focused')}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedPreference === 'creative_focused'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl mb-2 block">🎨</span>
              <p className="font-medium">更多創意</p>
              <p className="text-sm text-gray-600">釋放創意潛能</p>
            </button>
            
            <button
              onClick={() => setSelectedPreference('business_focused')}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedPreference === 'business_focused'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl mb-2 block">📊</span>
              <p className="font-medium">商業導向</p>
              <p className="text-sm text-gray-600">培養商業思維</p>
            </button>
            
            <button
              onClick={() => setSelectedPreference('hybrid')}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedPreference === 'hybrid'
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="text-2xl mb-2 block">🌟</span>
              <p className="font-medium">跨領域整合</p>
              <p className="text-sm text-gray-600">多元技能發展</p>
            </button>
          </div>
          
          {/* Custom Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              描述你理想的職涯冒險（選填）
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="例如：我想成為遊戲開發者，希望學習 Unity 和創意設計..."
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              rows={3}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowGenerateOption(false)}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              返回
            </button>
            
            <button
              onClick={handleGenerateCustomPath}
              disabled={isGenerating || (!selectedPreference && !customPrompt)}
              className={`inline-flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
                isGenerating || (!selectedPreference && !customPrompt)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg'
              }`}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  <span>開始生成</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      ) : (
        /* Show all paths in other modes */
        <div className="grid gap-6 md:gap-8">
          {displayPaths.map((path, index) => {
            const CategoryIcon = getCategoryIcon(path.category);
            const categoryColorClass = getCategoryColor(path.category);
            
            return (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`
                  relative bg-white rounded-2xl shadow-lg overflow-hidden
                  ${index === 0 ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}
                  ${path.isCustom ? 'border-2 border-purple-200' : ''}
                `}
              >
                {/* Path Type Badge */}
                <div className="absolute top-4 left-4">
                  {path.isCustom ? (
                    <span className="inline-flex items-center space-x-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                      <SparklesIcon className="w-3 h-3" />
                      <span>AI 專屬生成</span>
                    </span>
                  ) : (
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                      官方副本
                    </span>
                  )}
                </div>

                {/* Top recommended badge and actions */}
                <div className="absolute top-4 right-4 flex items-center space-x-2">
                  {index === 0 && viewMode === 'latest' && !path.isCustom && (
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      🌟 最佳推薦
                    </div>
                  )}
                  
                  {/* Favorite Button */}
                  {onToggleFavorite && (
                    <button
                      onClick={() => onToggleFavorite(path.savedPathId!)}
                      className={`p-2 rounded-full transition-colors ${
                        path.isFavorite 
                          ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-500'
                      }`}
                    >
                      {path.isFavorite ? (
                        <HeartIconSolid className="w-4 h-4" />
                      ) : (
                        <HeartIcon className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  
                  {/* Delete Button */}
                  {onDeletePath && viewMode !== 'latest' && (
                    <button
                      onClick={() => onDeletePath(path.savedPathId!)}
                      className="p-2 rounded-full bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
                    {/* Path Info */}
                    <div className="flex-1 md:pr-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className={`inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r ${categoryColorClass} rounded-xl`}>
                          <CategoryIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {path.title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {path.category}
                          </p>
                        </div>
                        {/* Match percentage */}
                        {path.matchPercentage && (
                          <div className="ml-auto bg-green-100 px-3 py-1 rounded-full">
                            <span className="text-sm font-medium text-green-700">
                              {t('results.matchPercentage', { percentage: path.matchPercentage })}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-gray-600 mb-4">
                        {path.subtitle}
                      </p>
                      
                      <p className="text-gray-500 mb-4">
                        {path.description}
                      </p>

                      {/* World Setting & Story Context */}
                      {(path as any).worldSetting && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                          <h4 className="font-medium text-purple-800 mb-2 flex items-center space-x-2">
                            <GlobeAltIcon className="w-4 h-4" />
                            <span>冒險世界</span>
                          </h4>
                          <p className="text-sm text-purple-700 mb-3">
                            {(path as any).worldSetting}
                          </p>
                          
                          {(path as any).protagonist && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-purple-800">你的身分：{(path as any).protagonist.name}</p>
                              <p className="text-xs text-purple-600">{(path as any).protagonist.background}</p>
                            </div>
                          )}
                          
                          {(path as any).storyContext?.currentConflict && (
                            <div className="border-l-2 border-purple-300 pl-3">
                              <p className="text-xs text-purple-600">
                                <span className="font-medium">當前挑戰：</span>
                                {(path as any).storyContext.currentConflict}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Skills */}
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-2">核心技能</h4>
                        <div className="flex flex-wrap gap-2">
                          {path.skills.map((skill: string) => (
                            <span
                              key={skill}
                              className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* AI Assistants */}
                      <div className="mb-6">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                          <UserGroupIcon className="w-4 h-4" />
                          <span>AI 助手團隊</span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {path.aiAssistants.map((assistant: string) => (
                            <span
                              key={assistant}
                              className={`bg-gradient-to-r ${categoryColorClass} text-white px-3 py-1 rounded-full text-sm`}
                            >
                              {assistant}
                            </span>
                          ))}
                        </div>
                        
                        {/* Story Characters */}
                        {(path as any).storyContext?.keyCharacters && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-medium text-gray-700 mb-2">關鍵角色：</p>
                            <div className="space-y-1">
                              {(path as any).storyContext.keyCharacters.slice(0, 2).map((character: any, index: number) => (
                                <div key={index} className="text-xs text-gray-600">
                                  <span className="font-medium">{character.name}</span>
                                  <span className="text-gray-500"> - {character.role}</span>
                                </div>
                              ))}
                              {(path as any).storyContext.keyCharacters.length > 2 && (
                                <div className="text-xs text-gray-400">
                                  +{(path as any).storyContext.keyCharacters.length - 2} 更多角色...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Workspace Status Column */}
                    <div className="md:w-64 mt-6 md:mt-0 md:ml-6 md:border-l md:pl-6">
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-3">體驗關卡預覽</h4>
                        <div className="space-y-2">
                          {path.tasks.slice(0, 2).map((task: any) => (
                            <div key={task.id} className="flex items-center space-x-3 text-sm">
                              <ClockIcon className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">{task.title}</span>
                              <span className="text-gray-400">({task.duration})</span>
                            </div>
                          ))}
                          {path.tasks.length > 2 && (
                            <div className="text-sm text-gray-400">
                              +{path.tasks.length - 2} 更多關卡...
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Workspace Info */}
                      {getPathWorkspaces(path.id).length > 0 ? (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-900">我的冒險基地</h4>
                            <span className="text-sm text-gray-500">
                              {getPathWorkspaces(path.id).length} 個
                            </span>
                          </div>
                          <div className="space-y-2">
                            {getPathWorkspaces(path.id).map(workspace => (
                              <button
                                key={workspace.id}
                                onClick={() => onPathSelect(path.id, workspace.id)}
                                className="w-full text-left p-2 rounded-lg hover:bg-white transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    workspace.status === 'active' ? 'bg-green-100 text-green-700' :
                                    workspace.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {workspace.status === 'active' ? '探索中' :
                                     workspace.status === 'completed' ? '已完成' : '暫停中'}
                                  </span>
                                  <PlayIcon className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="mt-1 text-xs text-gray-600">
                                  {workspace.completedTasks.length} 個關卡 • {workspace.totalXP} XP
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                          <FolderOpenIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">尚無冒險基地</p>
                          <p className="text-xs text-gray-500 mt-1">開始冒險來創建基地</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    {/* Main Action Button */}
                    <motion.button
                      onClick={() => onPathSelect(path.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        inline-flex items-center justify-center space-x-2 
                        bg-gradient-to-r ${categoryColorClass} text-white px-6 py-3 rounded-xl 
                        font-medium shadow-lg hover:shadow-xl transition-shadow duration-300
                      `}
                    >
                      <PlusIcon className="w-5 h-5" />
                      <span>開始新的冒險</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Statistics for saved paths */}
      {!results && savedPaths.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6"
        >
          <h3 className="font-semibold text-gray-900 mb-4">冒險統計</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{savedPaths.length}</div>
              <div className="text-sm text-gray-600">發現的副本</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{savedPaths.filter(p => p.isFavorite).length}</div>
              <div className="text-sm text-gray-600">收藏的副本</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{workspaceSessions.length}</div>
              <div className="text-sm text-gray-600">創建的基地</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}