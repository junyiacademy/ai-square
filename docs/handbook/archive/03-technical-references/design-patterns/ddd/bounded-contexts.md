# 界限上下文 - AI Square

## 🏗️ DDD 界限上下文劃分

基於領域驅動設計 (DDD) 原則，AI Square 平台劃分為以下核心界限上下文：

## 📚 1. AI Literacy Context (AI 素養上下文)

### 領域職責
- AI 素養能力框架定義與管理
- 四大領域 (Engaging, Creating, Managing, Designing) 的結構化表達
- KSA (Knowledge, Skills, Attitudes) 三維指標系統
- 能力評估標準與方法

### 核心實體
```typescript
// 聚合根
class AILiteracyFramework {
  private domains: Domain[]
  private ksaSystem: KSASystem
  
  // 領域邏輯
  getDomainCompetencies(domainId: DomainId): Competency[]
  evaluateCompetencyLevel(userId: UserId, competencyId: CompetencyId): CompetencyLevel
  generateLearningPath(currentLevel: CompetencyProfile): LearningPath
}

// 實體
class Domain {
  id: DomainId
  name: DomainName
  overview: MultilingualText
  competencies: Competency[]
  emoji: string
}

class Competency {
  id: CompetencyId  
  description: MultilingualText
  knowledgeCodes: KnowledgeCode[]
  skillCodes: SkillCode[]
  attitudeCodes: AttitudeCode[]
  scenarios: Scenario[]
}
```

### 領域服務
- **CompetencyEvaluationService**: 能力評估算法
- **LearningPathGenerationService**: 學習路徑推薦
- **ContentMappingService**: 內容與能力映射

### 整合事件
```typescript
// 發布事件
CompetencyAssessed(userId, competencyId, level, timestamp)
LearningPathGenerated(userId, pathId, competencies)
FrameworkUpdated(version, changes)

// 訂閱事件  
UserProgressUpdated(userId, practiceId, score)
ContentCompleted(userId, contentId, completionRate)
```

---

## 👤 2. Identity Context (身份上下文)

### 領域職責
- 用戶認證與授權管理
- 用戶檔案與偏好設定
- 角色與權限控制
- 隱私與資料保護

### 核心實體
```typescript
// 聚合根
class User {
  private id: UserId
  private profile: UserProfile
  private preferences: UserPreferences
  private roles: Role[]
  
  // 領域邏輯
  authenticate(credentials: Credentials): AuthenticationResult
  updateLanguagePreference(language: Language): DomainEvent[]
  grantRole(role: Role): DomainEvent[]
  deleteAccount(): DomainEvent[]
}

// 值物件
class UserProfile {
  email: Email
  displayName: string
  avatar: ImageUrl
  createdAt: Date
  lastLoginAt: Date
}

class UserPreferences {
  language: Language
  timezone: Timezone
  notifications: NotificationSettings
  privacy: PrivacySettings
}
```

### 領域服務
- **AuthenticationService**: 多元認證策略
- **AuthorizationService**: 權限檢查與控制
- **PrivacyService**: 資料保護與合規

### 整合事件
```typescript
// 發布事件
UserRegistered(userId, email, registrationMethod)
UserAuthenticated(userId, loginMethod, timestamp)
PreferencesUpdated(userId, preferences)
AccountDeleted(userId, reason)

// 訂閱事件
(無外部訂閱，作為基礎服務)
```

---

## 📖 3. Learning Context (學習上下文)

### 領域職責
- 學習活動管理與追蹤
- 練習系統與評估機制
- 學習進度計算與分析
- 個人化推薦算法

### 核心實體
```typescript
// 聚合根
class LearningSession {
  private id: SessionId
  private userId: UserId
  private practices: Practice[]
  private progress: LearningProgress
  
  // 領域邏輯
  startPractice(competencyId: CompetencyId): Practice
  submitAnswer(practiceId: PracticeId, answer: Answer): AssessmentResult
  calculateProgress(): ProgressReport
  generateRecommendations(): Recommendation[]
}

class Practice {
  id: PracticeId
  competencyId: CompetencyId
  questions: Question[]
  attempts: Attempt[]
  status: PracticeStatus
  
  // 領域邏輯
  addAttempt(answers: Answer[]): AssessmentResult
  calculateScore(): Score
  isCompleted(): boolean
}
```

### 領域服務
- **AssessmentService**: 評估算法與計分
- **RecommendationService**: 個人化推薦引擎
- **ProgressTrackingService**: 進度計算與分析

### 整合事件
```typescript
// 發布事件
PracticeStarted(userId, practiceId, competencyId)
PracticeCompleted(userId, practiceId, score, duration)
ProgressUpdated(userId, competencyId, level, improvement)
RecommendationGenerated(userId, recommendations)

// 訂閱事件
CompetencyAssessed(userId, competencyId, level)
ContentCompleted(userId, contentId, completionRate)
```

---

## 📝 4. Content Context (內容上下文)

### 領域職責
- 學習內容創建與管理
- 多語言內容版本控制
- 內容品質保證與審核
- 媒體資源管理

### 核心實體
```typescript
// 聚合根
class Content {
  private id: ContentId
  private type: ContentType
  private versions: ContentVersion[]
  private translations: Translation[]
  
  // 領域邏輯
  addTranslation(language: Language, content: string): Translation
  publishVersion(version: ContentVersion): DomainEvent[]
  updateContent(newContent: string): ContentVersion
  validateQuality(): QualityReport
}

class ContentVersion {
  id: VersionId
  content: string
  author: AuthorId
  status: PublishStatus
  createdAt: Date
  
  // 領域邏輯
  approve(): DomainEvent[]
  reject(reason: string): DomainEvent[]
}
```

### 領域服務
- **ContentValidationService**: 內容品質檢查
- **TranslationService**: 多語言翻譯管理
- **VersionControlService**: 版本控制與發布

### 整合事件
```typescript
// 發布事件
ContentCreated(contentId, type, authorId)
ContentUpdated(contentId, versionId, changes)
TranslationAdded(contentId, language, translatorId)
ContentPublished(contentId, versionId)

// 訂閱事件
UserProgressUpdated(userId, practiceId, score)
QualityFeedbackReceived(contentId, feedback)
```

---

## 📊 5. Analytics Context (分析上下文)

### 領域職責
- 學習數據收集與分析
- 用戶行為追蹤與洞察
- 效能指標計算與報告
- 預測性分析與建議

### 核心實體
```typescript
// 聚合根
class LearningAnalytics {
  private userId: UserId
  private metrics: LearningMetrics[]
  private insights: Insight[]
  
  // 領域邏輯
  recordLearningEvent(event: LearningEvent): void
  generateInsights(): Insight[]
  calculateEffectiveness(): EffectivenessReport
  predictOutcomes(): PredictionResult[]
}

class LearningMetrics {
  timeSpent: Duration
  completionRate: Percentage
  accuracyRate: Percentage
  retentionRate: Percentage
  
  // 領域邏輯
  compare(other: LearningMetrics): ComparisonResult
  trend(period: TimePeriod): TrendAnalysis
}
```

### 領域服務
- **MetricsAggregationService**: 指標聚合計算
- **InsightGenerationService**: 洞察分析引擎
- **ReportingService**: 報告生成與分發

### 整合事件
```typescript
// 發布事件
InsightGenerated(userId, insight, confidence)
ReportGenerated(reportId, recipients)
AnomalyDetected(userId, anomalyType, severity)

// 訂閱事件
PracticeCompleted(userId, practiceId, score, duration)
ProgressUpdated(userId, competencyId, level)
UserAuthenticated(userId, loginMethod, timestamp)
```

---

## 🔗 上下文映射 (Context Mapping)

### 核心關係
```
AI Literacy Context
    ↕ (Shared Kernel)
Learning Context

Identity Context  
    → (Upstream/Downstream)
All Other Contexts

Content Context
    ↔ (Partnership)  
AI Literacy Context

Analytics Context
    ← (Conformist)
All Other Contexts
```

### 反腐敗層 (Anti-Corruption Layer)
```typescript
// Learning Context 的 ACL
class AILiteracyIntegrationService {
  async getCompetencyDetails(competencyId: CompetencyId): Promise<CompetencyDetails> {
    // 轉換外部 AI Literacy 模型到內部 Learning 模型
    const external = await aiLiteracyService.getCompetency(competencyId)
    return this.transformToLearningModel(external)
  }
}
```

### 已發布語言 (Published Language)
```typescript
// 跨上下文的標準化事件格式
interface DomainEvent {
  eventId: string
  eventType: string
  aggregateId: string
  aggregateType: string
  eventData: any
  occurredAt: Date
  version: number
}
```

## 📅 演進策略

### Phase 1: 大泥球重構 (當前)
- 識別現有代碼的領域邊界
- 建立明確的上下文接口
- 漸進式重構與模組化

### Phase 2: 上下文分離
- 實作獨立的領域模型
- 建立上下文間的整合層
- 事件驅動的通訊機制

### Phase 3: 微服務演化
- 每個上下文獨立部署
- 服務間的合約管理
- 分散式事件溯源

---

> **設計原則**: 高內聚低耦合、領域純粹性、演進式架構