# Discovery Infinite Generation System - Technical Specification

## 系統概述

Discovery 是一個革命性的 AI 驅動學習探索系統，透過無限生成的個人化內容，讓每個用戶都能體驗獨特的冒險旅程。系統結合了 AI 生成、社群共享和遊戲化機制，創造永不重複的學習體驗。

## 核心功能

### 1. 無限路徑生成
- 基於用戶興趣評估和 AI 對話生成獨特職涯路徑
- 每個路徑都有完整的世界觀、故事背景和角色設定
- 支援標準路徑（預設）和自訂路徑（AI 生成）

### 2. 動態關卡系統
- 初始生成前 3 個關卡
- 根據用戶表現和選擇動態生成後續關卡
- 保持故事連貫性和難度曲線

### 3. 公共內容市場
- 用戶生成內容可選擇公開分享
- 評分、標籤和推薦系統
- 熱門內容優先展示給新用戶

## 技術架構

### Phase 1: LocalStorage 實作（MVP）

#### 資料結構

```typescript
// 擴展現有的 SavedPathData
interface SavedPathData {
  id: string;
  assessmentId: string;
  pathData: PathContent;
  matchPercentage: number;
  isFavorite: boolean;
  isCustom: boolean;              // 是否為 AI 生成
  createdAt: string;
  lastUpdated?: string;
  
  // AI 生成相關
  generationContext?: {
    userPrompt: string;           // 用戶描述
    conversationHistory: ChatMessage[];
    preferences: {
      techLevel: number;
      creativeLevel: number;
      businessLevel: number;
      customPreferences?: string[];
    };
  };
  
  // 故事設定
  storyContext?: {
    worldSetting: string;         // 世界觀
    protagonist: {
      name: string;
      background: string;
      goals: string[];
    };
    narrative: string;            // 主線故事
    theme: string;                // 主題（科技、魔法、商業等）
  };
  
  // 公開分享
  isPublic: boolean;
  publicMetadata?: {
    authorId: string;
    authorName: string;
    plays: number;
    rating: number;
    reviews: Review[];
    tags: string[];
    featured: boolean;
  };
}

// 動態任務結構
interface DynamicTask {
  id: string;
  pathId: string;
  sequenceNumber: number;         // 第幾關
  
  // 基本資訊
  title: string;
  description: string;
  duration: string;
  difficulty: number;             // 1-10
  
  // 故事元素
  storyContext: {
    previousSummary: string;      // 前情提要
    currentChallenge: string;     // 當前挑戰
    choices: TaskChoice[];        // 用戶選擇會影響後續
  };
  
  // AI 生成記錄
  generationInfo: {
    generatedAt: string;
    model: string;
    previousTaskResult?: TaskResult;
    userPerformanceScore: number;
  };
  
  // 完成資訊
  completionData?: {
    completedAt: string;
    userAnswer: string;
    score: number;
    feedback: string;
    unlockedAchievements: string[];
  };
}

// 公開內容索引
interface PublicContentIndex {
  version: string;
  lastUpdated: string;
  
  // 分類索引
  featured: PathSummary[];        // 精選內容
  trending: PathSummary[];        // 熱門內容
  recent: PathSummary[];          // 最新內容
  
  // 標籤索引
  tagIndex: Record<string, string[]>;  // tag -> pathIds
  
  // 統計資訊
  stats: {
    totalPaths: number;
    totalPlays: number;
    activeCreators: number;
  };
}
```

#### LocalStorage 結構

```javascript
// 用戶私有數據
localStorage.setItem('discovery_user_data', {
  userId: 'local_user_id',
  assessmentResults: {...},
  achievements: {...},
  workspaceSessions: [...],
  savedPaths: [...],              // 包含自訂和收藏的路徑
  generatedTasks: [...],          // 所有動態生成的任務
});

// 公開內容快取（從所有用戶收集）
localStorage.setItem('discovery_public_content', {
  index: PublicContentIndex,
  paths: Record<string, SavedPathData>,  // pathId -> path
  tasks: Record<string, DynamicTask[]>,  // pathId -> tasks
  lastSync: string,               // 最後同步時間
});

// AI 對話歷史
localStorage.setItem('discovery_ai_conversations', {
  sessions: [{
    sessionId: string,
    startedAt: string,
    messages: ChatMessage[],
    context: any,
    result: 'generated_path' | 'selected_existing' | 'abandoned'
  }]
});

// 翻譯快取（Phase 1 簡化版）
localStorage.setItem('discovery_translation_cache', {
  paths: {
    [pathId]: {
      [locale]: {
        version: number,
        translatedAt: string,
        content: TranslatedContent
      }
    }
  },
  tasks: {
    [taskId]: {
      [locale]: TranslatedTaskContent
    }
  },
  // 記錄翻譯請求，用於分析熱門語言
  usage: {
    [date]: {
      [locale]: number  // 請求次數
    }
  }
});
```

#### 實作步驟

##### 1. 修改 UserDataService

```typescript
// frontend/src/lib/services/user-data-service.ts

class LocalStorageBackend implements StorageBackend {
  // ... existing code ...
  
  // 新增：儲存公開內容
  async savePublicContent(path: SavedPathData): Promise<void> {
    if (!path.isPublic) return;
    
    const publicContent = this.loadPublicContent();
    publicContent.paths[path.id] = path;
    this.updatePublicIndex(publicContent.index, path);
    
    localStorage.setItem(
      'discovery_public_content',
      this.safeStringify(publicContent)
    );
  }
  
  // 新增：載入公開內容
  loadPublicContent(): PublicContent {
    const stored = localStorage.getItem('discovery_public_content');
    if (!stored) {
      return this.getDefaultPublicContent();
    }
    return JSON.parse(stored);
  }
  
  // 新增：搜尋公開內容
  searchPublicPaths(filters: {
    tags?: string[];
    minRating?: number;
    category?: string;
  }): SavedPathData[] {
    const content = this.loadPublicContent();
    let paths = Object.values(content.paths);
    
    if (filters.tags?.length) {
      paths = paths.filter(p => 
        filters.tags!.some(tag => 
          p.publicMetadata?.tags.includes(tag)
        )
      );
    }
    
    if (filters.minRating) {
      paths = paths.filter(p => 
        (p.publicMetadata?.rating || 0) >= filters.minRating!
      );
    }
    
    return paths;
  }
  
  // 新增：儲存動態任務
  async saveDynamicTask(task: DynamicTask): Promise<void> {
    const data = await this.load('local_user');
    if (!data) return;
    
    if (!data.generatedTasks) {
      data.generatedTasks = [];
    }
    
    const existingIndex = data.generatedTasks.findIndex(
      t => t.id === task.id
    );
    
    if (existingIndex >= 0) {
      data.generatedTasks[existingIndex] = task;
    } else {
      data.generatedTasks.push(task);
    }
    
    await this.save('local_user', data);
  }
}

// Phase 1: 簡化版翻譯服務
class LocalTranslationService {
  private cacheKey = 'discovery_translation_cache';
  
  async translatePath(
    path: SavedPathData,
    targetLocale: string
  ): Promise<SavedPathData> {
    // 1. 源語言直接返回
    if (path.sourceLanguage === targetLocale) {
      return path;
    }
    
    // 2. 檢查本地快取
    const cache = this.loadCache();
    const cached = cache.paths?.[path.id]?.[targetLocale];
    
    if (cached && cached.version === (path.version || 1)) {
      return {
        ...path,
        ...cached.content
      };
    }
    
    // 3. 呼叫翻譯 API
    const translated = await this.callTranslateAPI({
      content: {
        title: path.title,
        subtitle: path.subtitle,
        description: path.description,
        skills: path.skills
      },
      sourceLocale: path.sourceLanguage || 'zh-TW',
      targetLocale
    });
    
    // 4. 更新快取
    this.updateCache(path.id, targetLocale, {
      version: path.version || 1,
      translatedAt: new Date().toISOString(),
      content: translated
    });
    
    // 5. 記錄使用
    this.trackUsage(targetLocale);
    
    return { ...path, ...translated };
  }
  
  private loadCache(): any {
    const stored = localStorage.getItem(this.cacheKey);
    return stored ? JSON.parse(stored) : { paths: {}, tasks: {}, usage: {} };
  }
  
  private updateCache(pathId: string, locale: string, translation: any): void {
    const cache = this.loadCache();
    
    if (!cache.paths[pathId]) {
      cache.paths[pathId] = {};
    }
    cache.paths[pathId][locale] = translation;
    
    localStorage.setItem(this.cacheKey, JSON.stringify(cache));
  }
  
  private async callTranslateAPI(request: any): Promise<any> {
    // Phase 1: 使用簡單的對照表或 AI 翻譯
    // 可以先用預設翻譯，之後再接入真實 API
    const mockTranslations: Record<string, any> = {
      'en': {
        title: request.content.title + ' (EN)',
        subtitle: request.content.subtitle + ' (EN)',
        description: request.content.description + ' (EN)',
        skills: request.content.skills.map((s: string) => s + ' (EN)')
      }
    };
    
    return mockTranslations[request.targetLocale] || request.content;
  }
  
  private trackUsage(locale: string): void {
    const cache = this.loadCache();
    const today = new Date().toISOString().split('T')[0];
    
    if (!cache.usage[today]) {
      cache.usage[today] = {};
    }
    
    cache.usage[today][locale] = (cache.usage[today][locale] || 0) + 1;
    
    localStorage.setItem(this.cacheKey, JSON.stringify(cache));
  }
}
```

##### 2. AI 生成 API Routes

```typescript
// frontend/src/app/api/discovery/generate-path/route.ts

export async function POST(request: Request) {
  const { 
    assessmentResults, 
    conversationHistory,
    userPrompt,
    preferences 
  } = await request.json();
  
  // 構建 AI 提示
  const systemPrompt = `你是一個創意十足的冒險設計師。基於用戶的興趣和對話，
  創建一個獨特的職涯探索路徑。路徑必須包含：
  1. 引人入勝的世界觀設定
  2. 有趣的主角背景
  3. 清晰的成長主線
  4. 前3個循序漸進的任務
  
  用戶資料：
  - 科技傾向：${assessmentResults.tech}%
  - 創意傾向：${assessmentResults.creative}%
  - 商業傾向：${assessmentResults.business}%
  - 特殊偏好：${userPrompt}
  `;
  
  const response = await generateWithAI({
    system: systemPrompt,
    messages: conversationHistory,
    temperature: 0.8,
    responseFormat: {
      type: 'json_object',
      schema: PathGenerationSchema
    }
  });
  
  // 生成初始任務
  const tasks = await generateInitialTasks(response.path);
  
  // 構建完整路徑資料
  const generatedPath: SavedPathData = {
    id: `custom_${Date.now()}`,
    assessmentId: request.headers.get('assessment-id') || '',
    pathData: {
      id: response.path.id,
      title: response.path.title,
      subtitle: response.path.subtitle,
      description: response.path.description,
      category: response.path.category,
      skills: response.path.skills,
      aiAssistants: response.path.aiAssistants,
      tasks: tasks
    },
    matchPercentage: calculateMatch(assessmentResults, response.path),
    isFavorite: false,
    isCustom: true,
    createdAt: new Date().toISOString(),
    generationContext: {
      userPrompt,
      conversationHistory,
      preferences
    },
    storyContext: response.storyContext,
    isPublic: false
  };
  
  return Response.json({ 
    success: true, 
    path: generatedPath 
  });
}
```

```typescript
// frontend/src/app/api/discovery/generate-next-task/route.ts

export async function POST(request: Request) {
  const { 
    pathId,
    currentTaskNumber,
    previousTaskResult,
    pathContext,
    storyContext 
  } = await request.json();
  
  const prompt = `基於用戶在第 ${currentTaskNumber} 關的表現，
  生成第 ${currentTaskNumber + 1} 關。
  
  故事背景：${storyContext.narrative}
  前一關結果：${previousTaskResult.summary}
  用戶選擇：${previousTaskResult.choices}
  表現分數：${previousTaskResult.score}/100
  
  請根據用戶表現調整難度，並延續故事發展。`;
  
  const nextTask = await generateWithAI({
    system: '你是一個遊戲關卡設計師，擅長創造連貫且有挑戰性的任務。',
    prompt,
    responseFormat: {
      type: 'json_object',
      schema: TaskGenerationSchema
    }
  });
  
  const dynamicTask: DynamicTask = {
    id: `task_${pathId}_${currentTaskNumber + 1}`,
    pathId,
    sequenceNumber: currentTaskNumber + 1,
    ...nextTask,
    generationInfo: {
      generatedAt: new Date().toISOString(),
      model: 'gemini-2.5-flash',
      previousTaskResult,
      userPerformanceScore: previousTaskResult.score
    }
  };
  
  return Response.json({ 
    success: true, 
    task: dynamicTask 
  });
}
```

##### 3. UI 組件更新

```typescript
// frontend/src/components/discovery/PathSelection.tsx

interface PathSelectionProps {
  assessmentResults: AssessmentResults;
  onPathSelect: (path: SavedPathData) => void;
}

export default function PathSelection({ 
  assessmentResults, 
  onPathSelect 
}: PathSelectionProps) {
  const [viewMode, setViewMode] = useState<'recommended' | 'explore' | 'create'>('recommended');
  const [showAIChat, setShowAIChat] = useState(false);
  const [publicPaths, setPublicPaths] = useState<SavedPathData[]>([]);
  
  // 載入推薦路徑
  const recommendedPaths = useMemo(() => {
    // 1. 標準路徑（基於評估結果）
    const standardPaths = getStandardPaths(assessmentResults);
    
    // 2. 熱門公開路徑
    const trendingPublic = publicPaths
      .filter(p => p.publicMetadata?.rating >= 4.5)
      .slice(0, 3);
    
    return [...standardPaths, ...trendingPublic];
  }, [assessmentResults, publicPaths]);
  
  return (
    <div className="max-w-6xl mx-auto">
      {/* 頂部導航 */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setViewMode('recommended')}
          className={viewMode === 'recommended' ? 'active' : ''}
        >
          為你推薦
        </button>
        <button
          onClick={() => setViewMode('explore')}
          className={viewMode === 'explore' ? 'active' : ''}
        >
          探索社群創作
        </button>
        <button
          onClick={() => setViewMode('create')}
          className={viewMode === 'create' ? 'active' : ''}
        >
          創建專屬路徑
        </button>
      </div>
      
      {/* 內容區 */}
      {viewMode === 'recommended' && (
        <div className="grid gap-6">
          {recommendedPaths.map(path => (
            <PathCard
              key={path.id}
              path={path}
              onSelect={() => onPathSelect(path)}
              showAuthor={path.isCustom}
            />
          ))}
        </div>
      )}
      
      {viewMode === 'explore' && (
        <PublicPathExplorer
          onSelect={onPathSelect}
        />
      )}
      
      {viewMode === 'create' && (
        <AIPathCreator
          assessmentResults={assessmentResults}
          onComplete={(path) => {
            onPathSelect(path);
          }}
        />
      )}
    </div>
  );
}
```

### Phase 2: Google Cloud Storage 實作

#### 架構設計

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│  Cloud Functions │────▶│  Cloud Storage  │
│  (Next.js)      │     │   (Node.js)      │     │    (GCS)        │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                         │
        │                        ▼                         │
        │               ┌──────────────────┐              │
        └──────────────▶│    Firestore     │◀─────────────┘
                        │  (Index + Meta)   │
                        └──────────────────┘
```

#### GCS 存儲結構

```
ai-square-db/
├── discovery/                          # 核心資料
│   ├── users/                         # 用戶私有資料
│   │   ├── {userId}/
│   │   │   ├── profile.json          # 用戶設定檔
│   │   │   ├── assessment/           # 評估結果
│   │   │   │   └── {assessmentId}.json
│   │   │   ├── paths/                # 用戶的路徑（收藏/自訂）
│   │   │   │   └── {pathId}.json
│   │   │   ├── workspaces/           # 工作區狀態
│   │   │   │   └── {workspaceId}.json
│   │   │   └── progress/             # 進度資料
│   │   │       └── {pathId}/
│   │   │           ├── tasks.json
│   │   │           └── achievements.json
│   │   └── ...
│   ├── public/                        # 公開內容
│   │   ├── paths/                    # 公開路徑
│   │   │   ├── featured/             # 精選內容
│   │   │   │   └── {pathId}.json
│   │   │   ├── trending/             # 熱門內容（定期更新）
│   │   │   │   └── {pathId}.json
│   │   │   └── library/              # 所有公開內容
│   │   │       └── {authorId}/
│   │   │           └── {pathId}.json
│   │   ├── templates/                # 系統預設路徑模板
│   │   │   └── {templateId}.json
│   │   └── index/                    # 索引和統計
│   │       ├── catalog.json          # 內容目錄
│   │       ├── tags.json             # 標籤索引
│   │       └── stats.json            # 全站統計
│   └── system/                        # 系統資料
│       ├── ai-prompts/               # AI 提示模板
│       │   └── {version}/
│       │       └── prompts.json
│       └── cache/                    # 快取資料
│           └── recommendations/
│               └── {date}/
│                   └── {assessmentHash}.json
└── user_activity_logs/                # 用戶活動日誌（以用戶為中心的組織）
    └── {userEmail}/                   # 用戶 Email 作為主鍵
        ├── discovery/                 # Discovery 模組（包含完整流程）
        │   ├── assessments/           # 評估記錄
        │   │   └── {date}/
        │   │       └── {assessmentId}_session.json
        │   ├── paths/                 # 路徑相關活動
        │   │   └── {date}/
        │   │       ├── path_views.jsonl
        │   │       ├── path_selections.jsonl
        │   │       └── path_generations.jsonl
        │   ├── workspaces/            # Discovery 內的工作空間活動
        │   │   └── {date}/
        │   │       └── {workspaceId}/
        │   │           ├── session.json
        │   │           ├── task_progress.jsonl
        │   │           └── ai_interactions.jsonl
        │   └── ai_conversations/      # AI 對話記錄
        │       └── {date}/
        │           └── {sessionId}_conversation.json
        ├── pbl/                       # PBL 模組活動
        │   └── scenarios/
        │       └── {date}/
        │           └── {scenarioId}/
        │               ├── session.json
        │               └── activities.jsonl
        └── metadata/                  # 用戶層級的元資料
            ├── profile.json           # 用戶設定檔
            ├── preferences.json       # 偏好設定
            └── last_activity.json     # 最後活動時間戳記
```

#### 資料組織原則

1. **分離關注點**
   - `discovery/` - 應用程式核心資料（狀態、設定、內容）
   - `user_activity_logs/{userEmail}/` - 以用戶為中心的活動日誌
   
2. **以用戶為中心的架構**
   - 使用 Email 作為主鍵（符合現有認證系統）
   - 每個用戶擁有完整的活動歷史
   - 模組化的子目錄結構（discovery/pbl/metadata）
   - 避免資料重複，維持單一真相來源
   
3. **存取模式優化**
   - 用戶查詢自己的資料：直接存取 `{userEmail}/` 目錄
   - 系統分析：批次掃描所有用戶目錄
   - 公開內容仍在 `discovery/public/`
   - 日誌按日期子分區便於管理

4. **權限管理（簡化版）**
   ```
   discovery/users/{userId}/*          - 只有該用戶可存取
   discovery/public/*                  - 所有已認證用戶可讀
   discovery/system/*                  - 只有系統服務可存取
   user_activity_logs/{userEmail}/*    - 只有該用戶可存取
   user_activity_logs/*                - 分析服務可批次讀取
   ```

5. **生命週期管理**
   - 活動日誌：90 天後自動歸檔到 Coldline
   - 用戶刪除：可一次刪除 `{userEmail}/` 整個目錄（GDPR 合規）
   - 快取資料：7 天後自動刪除
   - 用戶核心資料：永久保存（除非用戶要求刪除）

6. **By-User 架構的優勢**
   - **權限簡單**：目錄層級的權限控制
   - **GDPR 友善**：輕鬆刪除特定用戶的所有資料
   - **查詢效率**：用戶查看自己的歷程不需掃描整個系統
   - **遷移簡單**：未來轉 DB 時映射直接（email → user_id）
   - **無資料重複**：避免同步問題和額外儲存成本

#### 多語言策略 - 按需翻譯

##### 設計原則
1. **源語言優先** - AI 生成內容以用戶請求的語言為源語言
2. **按需翻譯** - 只在用戶實際需要時才翻譯
3. **翻譯快取** - 翻譯結果快取，避免重複翻譯
4. **增量更新** - 內容更新時只重新翻譯變更部分

##### 資料結構

```typescript
// 路徑資料結構（支援多語言）
interface SavedPathData {
  // ... existing fields ...
  
  // 語言相關
  sourceLanguage: string;         // 原始語言 (zh-TW, en, etc.)
  translations?: {
    [locale: string]: {
      translatedAt: string;
      version: number;
      content: {
        title: string;
        subtitle: string;
        description: string;
        // 只翻譯必要的顯示文字
      };
    };
  };
}

// 任務資料結構
interface DynamicTask {
  // ... existing fields ...
  
  sourceLanguage: string;
  translations?: {
    [locale: string]: {
      title: string;
      description: string;
      storyContext: {
        currentChallenge: string;
        // 只翻譯用戶會看到的部分
      };
    };
  };
}
```

##### GCS 翻譯快取結構

```
ai-square-db/
├── discovery/
│   └── translations/                    # 翻譯快取
│       ├── paths/
│       │   └── {pathId}/
│       │       ├── {locale}.json       # 各語言版本
│       │       └── metadata.json       # 翻譯版本資訊
│       └── tasks/
│           └── {taskId}/
│               └── {locale}.json
└── user_discovery_logs/
    └── translations/                    # 翻譯使用記錄
        └── {date}/
            └── usage.jsonl             # 記錄哪些內容被翻譯
```

##### 翻譯服務實作

```typescript
// frontend/src/lib/services/discovery-translation-service.ts

interface TranslationRequest {
  content: any;
  sourceLocale: string;
  targetLocale: string;
  fields: string[];  // 需要翻譯的欄位
}

class DiscoveryTranslationService {
  private cache = new Map<string, any>();
  
  async getTranslatedPath(
    path: SavedPathData,
    targetLocale: string
  ): Promise<SavedPathData> {
    // 1. 如果是源語言，直接返回
    if (path.sourceLanguage === targetLocale) {
      return path;
    }
    
    // 2. 檢查快取
    const cacheKey = `path:${path.id}:${targetLocale}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    // 3. 檢查 GCS 翻譯快取
    const translationKey = `discovery/translations/paths/${path.id}/${targetLocale}.json`;
    const cached = await this.storage.load(translationKey);
    
    if (cached && cached.version === path.version) {
      // 合併翻譯內容
      const translatedPath = {
        ...path,
        ...cached.content
      };
      this.cache.set(cacheKey, translatedPath);
      return translatedPath;
    }
    
    // 4. 按需翻譯
    const translated = await this.translateContent({
      content: {
        title: path.title,
        subtitle: path.subtitle,
        description: path.description,
        skills: path.skills,
        aiAssistants: path.aiAssistants
      },
      sourceLocale: path.sourceLanguage,
      targetLocale,
      fields: ['title', 'subtitle', 'description', 'skills', 'aiAssistants']
    });
    
    // 5. 儲存翻譯
    await this.storage.save(translationKey, {
      version: path.version || 1,
      translatedAt: new Date().toISOString(),
      content: translated
    });
    
    // 6. 記錄翻譯使用
    await this.logTranslationUsage({
      contentType: 'path',
      contentId: path.id,
      sourceLocale: path.sourceLanguage,
      targetLocale,
      timestamp: new Date().toISOString()
    });
    
    const translatedPath = { ...path, ...translated };
    this.cache.set(cacheKey, translatedPath);
    return translatedPath;
  }
  
  private async translateContent(
    request: TranslationRequest
  ): Promise<any> {
    // 使用現有的翻譯 API 或 AI 翻譯
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    return response.json();
  }
  
  // 批量預載熱門內容的翻譯
  async preloadPopularTranslations(
    locale: string,
    limit: number = 10
  ): Promise<void> {
    const popular = await this.getPopularPaths(limit);
    
    // 並行翻譯
    await Promise.all(
      popular.map(path => 
        this.getTranslatedPath(path, locale)
      )
    );
  }
  
  // 清理過期翻譯快取
  async cleanupTranslations(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    // 實作清理邏輯
  }
}
```

##### UI 整合範例

```typescript
// 在組件中使用翻譯服務
function PathCard({ path, locale }: Props) {
  const [translatedPath, setTranslatedPath] = useState(path);
  const translationService = useTranslationService();
  
  useEffect(() => {
    if (path.sourceLanguage !== locale) {
      translationService
        .getTranslatedPath(path, locale)
        .then(setTranslatedPath);
    }
  }, [path, locale]);
  
  // 顯示載入中或已翻譯的內容
  return (
    <div>
      <h3>{translatedPath.title}</h3>
      <p>{translatedPath.description}</p>
      {/* ... */}
    </div>
  );
}
```

##### 翻譯成本優化

1. **熱門內容優先** - 預先翻譯高訪問量內容
2. **部分翻譯** - 只翻譯用戶實際看到的欄位
3. **翻譯池** - 相似內容共享翻譯結果
4. **定期清理** - 移除低訪問量的翻譯快取

#### Firestore 索引結構

```typescript
// 路徑索引集合
interface PathIndex {
  pathId: string;
  authorId: string;
  title: string;
  category: string;
  tags: string[];
  rating: number;
  plays: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  featured: boolean;
  isPublic: boolean;
  // 用於搜尋
  searchKeywords: string[];
  // 用於推薦
  embeddingVector?: number[];
}

// 用戶進度集合
interface UserProgress {
  userId: string;
  pathId: string;
  currentTask: number;
  completedTasks: string[];
  totalXP: number;
  achievements: string[];
  lastActiveAt: Timestamp;
}
```

#### Cloud Functions 實作

```typescript
// functions/src/discovery/generatePath.ts

export const generatePath = onCall(async (data, context) => {
  const userId = context.auth?.uid;
  if (!userId) throw new HttpsError('unauthenticated');
  
  const { assessmentResults, prompt, preferences } = data;
  
  // 1. 生成路徑
  const generatedPath = await generatePathWithAI({
    assessmentResults,
    prompt,
    preferences
  });
  
  // 2. 儲存到 GCS
  const pathRef = `users/${userId}/paths/${generatedPath.id}.json`;
  await storage.bucket('ai-square-discovery').file(pathRef).save(
    JSON.stringify(generatedPath),
    { contentType: 'application/json' }
  );
  
  // 3. 更新 Firestore 索引
  await firestore.collection('pathIndex').doc(generatedPath.id).set({
    pathId: generatedPath.id,
    authorId: userId,
    title: generatedPath.title,
    category: generatedPath.category,
    tags: extractTags(generatedPath),
    rating: 0,
    plays: 0,
    createdAt: FieldValue.serverTimestamp(),
    isPublic: false,
    searchKeywords: generateSearchKeywords(generatedPath)
  });
  
  return { success: true, pathId: generatedPath.id };
});

// functions/src/discovery/publishPath.ts

export const publishPath = onCall(async (data, context) => {
  const userId = context.auth?.uid;
  if (!userId) throw new HttpsError('unauthenticated');
  
  const { pathId } = data;
  
  // 1. 複製到公開資料夾
  await storage.bucket('ai-square-discovery')
    .file(`users/${userId}/paths/${pathId}.json`)
    .copy(`public/paths/all/${pathId}.json`);
  
  // 2. 更新索引
  await firestore.collection('pathIndex').doc(pathId).update({
    isPublic: true,
    publishedAt: FieldValue.serverTimestamp()
  });
  
  // 3. 觸發推薦系統更新
  await pubsub.topic('path-published').publish({
    pathId,
    userId
  });
  
  return { success: true };
});
```

#### 整合現有 GCS 服務

```typescript
// frontend/src/lib/services/discovery-service.ts
import { BaseStorageService } from '@/lib/abstractions/base-storage-service';
import { GCSStorageService } from '@/lib/implementations/gcs-storage-impl';
import { LocalStorageService } from '@/lib/implementations/local-storage-impl';

class DiscoveryService {
  private storage: BaseStorageService;
  private backend: 'local' | 'gcs';
  
  constructor() {
    this.backend = process.env.NEXT_PUBLIC_STORAGE_BACKEND === 'gcs' 
      ? 'gcs' 
      : 'local';
    
    // 使用現有的存儲抽象層
    this.storage = this.backend === 'gcs'
      ? new GCSStorageService()
      : new LocalStorageService();
  }
  
  // 用戶資料管理
  async saveUserPath(userId: string, path: SavedPathData): Promise<void> {
    const key = `discovery/users/${userId}/paths/${path.id}.json`;
    await this.storage.save(key, path);
    
    // 更新用戶索引
    const indexKey = `discovery/users/${userId}/index.json`;
    const index = await this.storage.load(indexKey) || { paths: [] };
    if (!index.paths.includes(path.id)) {
      index.paths.push(path.id);
      await this.storage.save(indexKey, index);
    }
  }
  
  async getUserPaths(userId: string): Promise<SavedPathData[]> {
    const indexKey = `discovery/users/${userId}/index.json`;
    const index = await this.storage.load(indexKey);
    if (!index?.paths) return [];
    
    const paths = await Promise.all(
      index.paths.map(async (pathId: string) => {
        const key = `discovery/users/${userId}/paths/${pathId}.json`;
        return await this.storage.load(key);
      })
    );
    
    return paths.filter(Boolean);
  }
  
  // 公開內容管理
  async publishPath(userId: string, pathId: string): Promise<void> {
    // 1. 讀取用戶路徑
    const userPathKey = `discovery/users/${userId}/paths/${pathId}.json`;
    const path = await this.storage.load(userPathKey);
    if (!path) throw new Error('Path not found');
    
    // 2. 複製到公開目錄
    path.isPublic = true;
    path.publicMetadata = {
      authorId: userId,
      authorName: 'Anonymous', // 可選擇顯示真實名稱
      plays: 0,
      rating: 0,
      reviews: [],
      tags: this.extractTags(path),
      featured: false
    };
    
    const publicKey = `discovery/public/paths/library/${userId}/${pathId}.json`;
    await this.storage.save(publicKey, path);
    
    // 3. 更新公開內容索引
    await this.updatePublicIndex(path);
    
    // 4. 記錄日誌
    await this.logInteraction(userId, 'publish_path', { pathId });
  }
  
  async searchPublicPaths(filters: SearchFilters): Promise<SavedPathData[]> {
    if (this.backend === 'local') {
      // Phase 1: 從 localStorage 搜尋
      return this.localSearch(filters);
    } else {
      // Phase 2: 從索引文件搜尋（避免掃描所有文件）
      const catalogKey = 'discovery/public/index/catalog.json';
      const catalog = await this.storage.load(catalogKey) || { paths: [] };
      
      let paths = catalog.paths;
      
      // 應用過濾條件
      if (filters.category) {
        paths = paths.filter(p => p.category === filters.category);
      }
      
      if (filters.tags?.length) {
        paths = paths.filter(p => 
          filters.tags!.some(tag => p.tags.includes(tag))
        );
      }
      
      if (filters.minRating) {
        paths = paths.filter(p => p.rating >= filters.minRating!);
      }
      
      // 排序
      paths.sort((a, b) => {
        switch (filters.sortBy) {
          case 'rating':
            return b.rating - a.rating;
          case 'plays':
            return b.plays - a.plays;
          case 'recent':
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          default:
            return b.rating - a.rating;
        }
      });
      
      // 限制結果數量
      paths = paths.slice(0, filters.limit || 20);
      
      // 載入完整路徑資料
      const fullPaths = await Promise.all(
        paths.map(async (p) => {
          const key = `discovery/public/paths/library/${p.authorId}/${p.id}.json`;
          return await this.storage.load(key);
        })
      );
      
      return fullPaths.filter(Boolean);
    }
  }
  
  // AI 生成整合
  async generatePath(params: GeneratePathParams): Promise<SavedPathData> {
    const requestId = `req_${Date.now()}`;
    
    try {
      // 1. 呼叫 AI 生成 API
      const response = await fetch('/api/discovery/generate-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          requestId
        })
      });
      
      if (!response.ok) throw new Error('Generation failed');
      
      const generatedPath = await response.json();
      
      // 2. 儲存到用戶目錄
      await this.saveUserPath(params.userId, generatedPath);
      
      // 3. 記錄生成日誌
      await this.logAIGeneration('path', requestId, {
        params,
        result: generatedPath,
        timestamp: new Date().toISOString()
      });
      
      return generatedPath;
    } catch (error) {
      // 記錄錯誤
      await this.logError('path_generation', error, { requestId, params });
      throw error;
    }
  }
  
  // 日誌記錄
  private async logInteraction(
    userId: string, 
    action: string, 
    data: any
  ): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const sessionId = this.getSessionId();
    const key = `user_discovery_logs/interactions/${date}/${userId}/${sessionId}.jsonl`;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      data
    };
    
    // 追加到 JSONL 文件
    await this.storage.append(key, JSON.stringify(logEntry) + '\n');
  }
  
  private async logAIGeneration(
    type: 'path' | 'task',
    requestId: string,
    data: any
  ): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const key = `user_discovery_logs/ai_generation/${date}/${type}s/${requestId}.json`;
    
    await this.storage.save(key, {
      requestId,
      type,
      ...data
    });
  }
  
  private async logError(
    context: string,
    error: any,
    metadata: any
  ): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const timestamp = new Date().toISOString();
    const severity = error.severity || 'error';
    const key = `user_discovery_logs/errors/${date}/${severity}/${timestamp}_${context}.json`;
    
    await this.storage.save(key, {
      timestamp,
      context,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      metadata
    });
  }
}
```

## 效能優化策略

### 1. 快取機制
- 熱門路徑快取在 CDN
- 用戶最近訪問快取在 localStorage
- 推薦結果快取 24 小時

### 2. 漸進式載入
- 初始只載入路徑摘要
- 選擇後載入完整內容
- 任務按需生成

### 3. AI 成本控制
- 批次生成請求
- 重用相似請求結果
- 設定每用戶配額

## 安全考量

### 1. 內容審核
- AI 生成內容自動審核
- 用戶舉報機制
- 人工複審流程

### 2. 資料隱私
- 用戶可選擇匿名分享
- 敏感資訊自動過濾
- GDPR 合規設計

### 3. 防濫用機制
- Rate limiting
- 異常行為偵測
- 帳號信譽系統

## 未來擴展

### 1. 多人協作
- 組隊挑戰模式
- 共同創作路徑
- 競賽排行榜

### 2. AI 進化
- 基於用戶反饋自動優化
- A/B 測試不同生成策略
- 個人化 AI 助手

### 3. 經濟系統
- 創作者獎勵
- 付費高級路徑
- NFT 成就認證

## 實作時程

### Phase 1 (2 週)
- Week 1: 基礎架構 + LocalStorage 實作
- Week 2: AI 生成 API + UI 整合

### Phase 2 (3 週)
- Week 1: GCS 整合 + Cloud Functions
- Week 2: Firestore 索引 + 搜尋功能
- Week 3: 效能優化 + 測試

### Phase 3 (2 週)
- Week 1: 內容審核 + 安全機制
- Week 2: 上線準備 + 監控設置

## Phase 1 具體實作步驟

### 1. 資料模型更新
```typescript
// frontend/src/lib/services/user-data-service.ts
// 擴展 SavedPathData 介面
export interface SavedPathData {
  // ... existing fields ...
  isCustom: boolean;
  sourceLanguage: string;
  generationContext?: {
    userPrompt: string;
    conversationHistory?: any[];
    preferences?: any;
  };
  storyContext?: {
    worldSetting: string;
    protagonist: any;
    narrative: string;
  };
  version?: number;
}
```

### 2. 創建 Discovery 服務
```typescript
// frontend/src/lib/services/discovery-service.ts
export class DiscoveryService {
  private userDataService: UserDataService;
  private translationService: LocalTranslationService;
  
  constructor() {
    this.userDataService = new UserDataService();
    this.translationService = new LocalTranslationService();
  }
  
  // 實作核心方法
}
```

### 3. 實作 AI 生成 API
```typescript
// frontend/src/app/api/discovery/generate-path/route.ts
import { generateContent } from '@/lib/ai/vertex-ai-service';

export async function POST(request: Request) {
  const body = await request.json();
  
  // 1. 構建 prompt
  const prompt = buildPathGenerationPrompt(body);
  
  // 2. 呼叫 AI
  const result = await generateContent({
    prompt,
    temperature: 0.8
  });
  
  // 3. 解析並驗證結果
  const generatedPath = parseGeneratedPath(result);
  
  // 4. 加入元資料
  generatedPath.isCustom = true;
  generatedPath.sourceLanguage = body.locale || 'zh-TW';
  generatedPath.createdAt = new Date().toISOString();
  
  return Response.json(generatedPath);
}
```

### 4. 更新 PathResults 組件
```typescript
// frontend/src/components/discovery/PathResults.tsx
// 加入新的 props 和狀態
interface PathResultsProps {
  // ... existing props ...
  onGenerateCustomPath?: (preferences: any) => Promise<void>;
}

// 實作選擇流程
const PathResults: React.FC<PathResultsProps> = (props) => {
  const [showGenerateOption, setShowGenerateOption] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  
  // 分類路徑：標準 vs 自訂
  const categorizedPaths = useMemo(() => {
    const standard = savedPaths.filter(p => !p.isCustom);
    const custom = savedPaths.filter(p => p.isCustom);
    return {
      topRecommended: standard.slice(0, 3),
      custom,
      others: standard.slice(3)
    };
  }, [savedPaths]);
  
  // ... 實作 UI
};
```

### 5. 創建 AI 對話組件
```typescript
// frontend/src/components/discovery/AIPathCreator.tsx
export function AIPathCreator({ 
  assessmentResults,
  onComplete 
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // AI 對話介面
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-semibold mb-4">
        讓我們創造專屬於你的冒險
      </h3>
      
      {/* 快速選項 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <PresetOption 
          icon="🎯" 
          label="更專注技術"
          value="tech_focused"
        />
        <PresetOption 
          icon="🎨" 
          label="更多創意"
          value="creative_focused"
        />
        {/* ... 更多選項 */}
      </div>
      
      {/* 自由輸入 */}
      <textarea
        placeholder="描述你理想的職涯冒險..."
        className="w-full p-4 border rounded-lg"
      />
      
      <button 
        onClick={handleGenerate}
        disabled={isGenerating}
        className="mt-4 bg-purple-600 text-white px-6 py-3 rounded-xl"
      >
        {isGenerating ? '生成中...' : '開始生成'}
      </button>
    </div>
  );
}
```

### 6. 實作翻譯 Hook
```typescript
// frontend/src/hooks/useTranslatedContent.ts
export function useTranslatedContent<T extends { sourceLanguage?: string }>(
  content: T,
  targetLocale: string
): T {
  const [translated, setTranslated] = useState(content);
  const translationService = useTranslationService();
  
  useEffect(() => {
    if (content.sourceLanguage && content.sourceLanguage !== targetLocale) {
      translationService
        .translate(content, targetLocale)
        .then(setTranslated)
        .catch(console.error);
    }
  }, [content, targetLocale]);
  
  return translated;
}
```

### 7. 整合到 Discovery 頁面
```typescript
// frontend/src/app/discovery/paths/page.tsx
export default function PathsPage() {
  const { locale } = useTranslation();
  const [assessmentResults] = useState(/* ... */);
  const discoveryService = useDiscoveryService();
  
  const handleGenerateCustomPath = async (preferences: any) => {
    try {
      const generatedPath = await discoveryService.generatePath({
        assessmentResults,
        preferences,
        locale
      });
      
      // 儲存並導航
      await discoveryService.saveUserPath(generatedPath);
      router.push(`/discovery/workspace/${generatedPath.id}`);
    } catch (error) {
      console.error('Failed to generate path:', error);
    }
  };
  
  return (
    <PathResults
      results={assessmentResults}
      onGenerateCustomPath={handleGenerateCustomPath}
      // ... other props
    />
  );
}
```

### 8. 測試計劃

#### 單元測試
- 測試 DiscoveryService 各方法
- 測試翻譯快取邏輯
- 測試 AI prompt 生成

#### 整合測試
- 測試完整的路徑生成流程
- 測試多語言切換
- 測試 LocalStorage 限制處理

#### E2E 測試
- 測試用戶選擇既有路徑
- 測試 AI 生成新路徑
- 測試公開內容瀏覽

### 9. 效能考量

1. **LocalStorage 限制**
   - 監控儲存空間使用
   - 實作 LRU 快取淘汰
   - 壓縮大型 JSON 資料

2. **翻譯快取策略**
   - 只快取最近 30 天的翻譯
   - 熱門內容優先快取
   - 背景預載常用語言

3. **AI 請求優化**
   - 防抖動處理
   - 請求合併
   - 錯誤重試機制

### 10. 監控指標

```typescript
// 追蹤關鍵指標
interface DiscoveryMetrics {
  pathGeneration: {
    total: number;
    success: number;
    avgDuration: number;
  };
  translations: {
    requests: Record<string, number>;
    cacheHitRate: number;
  };
  storage: {
    used: number;
    limit: number;
  };
}
```