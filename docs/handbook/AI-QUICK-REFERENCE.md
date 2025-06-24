# AI 快速參考指南

## 專案結構
```
frontend/           # Next.js + TypeScript + Tailwind
backend/            # FastAPI + Python
docs/tickets/       # 工作票券（YAML）
```

## 常用命令
```bash
make new TYPE=feature TICKET=dark-mode    # 開始
make save                                  # 保存
make done                                  # 完成
```

## Ticket 格式
```yaml
ticket: T123
feature: 功能名稱
acceptance_criteria:
  - 條件1
  - 條件2
```

## Git Commit 格式
```
feat(scope): 描述
fix(scope): 描述
chore(scope): 描述
```

## 測試指令
```bash
# Frontend
cd frontend && npm test
cd frontend && npm run typecheck

# Backend  
cd backend && python -m pytest
```

## API 結構
```
GET  /api/relations?lang={lang}
POST /api/auth/login
```

## 常見模式

### React Context
```typescript
const ThemeContext = createContext<ThemeContextType>()
export const useTheme = () => useContext(ThemeContext)
```

### API Route (Next.js)
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  return NextResponse.json(data)
}
```

### i18n
```typescript
const { t, i18n } = useTranslation('common')
t('key')
```

## 環境變數追蹤
```bash
PROMPT_TOKENS=1500 COMPLETION_TOKENS=3000 make save
```

---

# 🔄 TDD 核心原則

## Red-Green-Refactor 循環
1. **🔴 Red** - 寫一個失敗的測試
2. **🟢 Green** - 寫最小程式碼通過測試
3. **🔵 Refactor** - 優化程式碼

## TDD 最佳實踐
### DO ✅
- 一次只寫一個測試
- 測試行為，不是實作細節
- 保持測試簡單清晰
- 使用描述性的測試名稱

### DON'T ❌
- 不要測試框架功能
- 不要過度 mock
- 不要寫脆弱的測試
- 不要忽略測試維護

## 測試金字塔
- **單元測試 (70-80%)** - 快速、專注邏輯
- **整合測試 (15-25%)** - API/服務整合
- **E2E 測試 (5-10%)** - 關鍵用戶流程

---

# 🎭 BDD 實踐指南

## Given-When-Then 模式
```gherkin
Feature: 學習進度追蹤

Scenario: 查看各領域完成度
  Given 我是已登入的學習者
  When 我訪問進度頁面
  Then 我應該看到四個 AI 領域
  And 每個領域顯示完成百分比
```

## User Story 格式
```gherkin
As a [角色]
I want [功能]
So that [價值]
```

## BDD vs TDD
| 層面 | BDD | TDD |
|------|-----|-----|
| 關注點 | 行為和需求 | 功能和設計 |
| 語言 | 業務語言 | 技術語言 |
| 參與者 | 全團隊 | 開發者 |

---

# 🏗️ DDD 核心概念

## 界限上下文 (Bounded Contexts)
1. **AI Literacy Context** - AI 素養框架
2. **Identity Context** - 用戶認證授權
3. **Learning Context** - 學習活動管理
4. **Content Context** - 內容管理系統
5. **Analytics Context** - 數據分析報告

## 通用語言 (Ubiquitous Language)
### 核心術語
- **Competency (能力指標)** - 可評估的學習成果
- **KSA System** - Knowledge, Skills, Attitudes
- **Learning Path** - 個人化學習序列
- **Practice Session** - 完整學習活動

### 領域事件
```typescript
// 標準事件格式
interface DomainEvent {
  eventId: string
  eventType: string
  aggregateId: string
  occurredAt: Date
}

// 範例事件
CompetencyAssessed(userId, competencyId, level)
PracticeCompleted(userId, practiceId, score)
```

---

# 🎯 前端開發模式

## 自訂 Hooks
```typescript
// useLocalStorage
export function useLocalStorage<T>(key: string, initialValue: T) {
  // 實作...
}

// useDebounce
export function useDebounce<T>(value: T, delay: number): T {
  // 實作...
}
```

## 效能優化
```typescript
// Memoization
const ExpensiveComponent = memo(({ data }) => {
  // 組件邏輯
})

// Code Splitting
const HeavyComponent = dynamic(() => import('./Heavy'), {
  loading: () => <Spinner />
})
```

## 錯誤處理
```typescript
// Error Boundary
class ErrorBoundary extends Component {
  componentDidCatch(error: Error, info: ErrorInfo) {
    errorReportingService.log(error, info)
  }
}
```

---

# 🛠️ 智能提交系統

## 提交模式
| 模式 | 指令 | 適用場景 |
|------|------|----------|
| **智能提交** | `make commit-smart` | 日常開發（推薦）|
| **嚴格模式** | `make commit-strict` | 重要功能、發布前 |
| **快速提交** | `make commit-quick` | 緊急修復、WIP |

## 自動功能
- 生成符合規範的提交訊息
- 智能判斷 scope
- 執行品質檢查
- 更新開發日誌

---

# 📊 測試策略

## 測試覆蓋率標準
- 整體專案: ≥ 80%
- 核心功能: ≥ 95%
- 工具函數: 100%
- UI 組件: ≥ 70%

## 測試工具鏈
- **單元測試**: Jest + React Testing Library
- **整合測試**: Supertest + MSW
- **E2E 測試**: Playwright
- **覆蓋率**: Istanbul (內建 Jest)

## TDD 合規檢查
```bash
make dev-tdd-check    # 執行合規檢查
make dev-tdd-enforce  # 強制檢查
```

---

# 💡 快速提示

## 命名規範
- 組件：`PascalCase` (UserProfile.tsx)
- Hooks：`camelCase` 前綴 use (useAuth.ts)
- 常數：`UPPER_SNAKE_CASE` (API_ENDPOINTS.ts)
- 類型：`PascalCase` 後綴 Type/Interface

## 檔案組織
```
components/
  UserProfile/
    index.tsx
    UserProfile.tsx
    UserProfile.test.tsx
    UserProfile.styles.ts
```

## TypeScript 最佳實踐
```typescript
// ✅ Good - 明確的類型
interface UserProps {
  id: string
  name: string
  role: 'admin' | 'user'
}

// ❌ Bad - 使用 any
interface UserProps {
  data: any
}
```