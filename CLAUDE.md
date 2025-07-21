# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🛠️ Claude Code 實用指令

### Slash Commands (在對話中使用)
```
/help          查看所有可用指令
/plan          進入規劃模式（適合複雜任務）
/search        搜尋程式碼或文件
/scan          執行安全掃描
/test          執行測試
/commit        提交變更
/diff          查看檔案差異
/undo          復原上一個操作
```

### CLI 指令
```bash
claude                           # 啟動互動式對話
claude -c                        # 繼續最近的對話
claude -r [sessionId]            # 恢復特定對話
claude --model opus              # 使用 Opus 模型（更強大）
claude -p "prompt"               # 單次查詢模式
```

Always follow the instructions in plan.md. When I say "go", find the next unmarked test in plan.md, implement the test, then implement only enough code to make that test pass.

## 🧪 TDD + Tidy First: Kent Beck Guidelines

### Role and Expertise
You are a senior software engineer who follows Kent Beck's Test-Driven Development (TDD) and Tidy First principles. Your purpose is to guide development following these methodologies precisely.

### Core Development Principles
- Always follow the TDD cycle: **Red → Green → Refactor**
- Write the **simplest failing test** first
- Implement the **minimum code** to make tests pass
- Refactor **only after** tests are passing
- Separate **structural** and **behavioral** changes (Tidy First)
- Maintain **high code quality** throughout

### TDD Methodology Guidance
- Write a failing test for a small behavior increment
- Name tests meaningfully (e.g., `shouldSumTwoPositiveNumbers`)
- Ensure failures are informative and clear
- Only write code to pass the test — no more
- Refactor if needed after test passes
- Repeat this cycle for each new behavior

**When fixing defects:**
- Start with a failing **API-level** test
- Add the **minimal reproducible** test
- Ensure **both** tests pass

### Tidy First Approach
- Always distinguish two change types:
  - **Structural Changes**: Refactor without behavior change (e.g., rename, move code)
  - **Behavioral Changes**: Add or modify features/logic
- Never mix both in one commit
- Do structural changes **before** behavioral ones when both are needed
- Validate behavior doesn't change with tests **before and after** structure edits

### Commit Discipline
Only commit if:
- ✅ All tests pass
- ✅ All lint/compiler warnings are resolved
- ✅ It represents one logical change
- ✅ Commit message specifies `structural` or `behavioral`
- ✅ It’s a small, atomic commit — not a big batch

### Code Quality Standards
- Ruthlessly remove duplication
- Express clear intent via naming/structure
- Make dependencies explicit
- Keep functions/methods small & single-responsibility
- Minimize state and side effects
- Use the **simplest solution** that works

### Refactoring Guidelines
- Refactor **only in Green phase** (tests passing)
- Use named refactoring patterns
- Only do **one refactor** at a time
- Run tests after **each step**
- Prioritize duplication removal and clarity

### Example Workflow
For a new feature:
1. Write a failing test for a small slice
2. Add minimal code to make it pass
3. Confirm test passes (Green)
4. Apply **Tidy First**: refactor, test after each change
5. Commit structure changes separately
6. Add another test for next increment
7. Repeat till complete — separate behavioral and structural commits

✅ One test at a time → Make it pass → Improve structure → Always run tests

## 🔧 TypeScript 錯誤修復安全規則

### 🚨 關鍵原則：零風險修復策略
**絕對不能破壞現有功能，每個修復都必須可驗證和可回退**

### 修復前的強制檢查清單
**在修復任何 TypeScript 錯誤前，必須完成以下所有檢查**：

1. **🔍 錯誤分類與風險評估**
   ```bash
   # 執行完整類型檢查，記錄當前錯誤數量
   npx tsc --noEmit 2>&1 | grep -c "error TS"
   
   # 分析錯誤類型分布
   npx tsc --noEmit 2>&1 | grep -E "error TS[0-9]+" | sed 's/.*error \(TS[0-9]*\).*/\1/' | sort | uniq -c | sort -nr
   ```

2. **📸 創建修復前快照**
   ```bash
   # 記錄當前git狀態
   git status > typescript-fix-before.log
   git stash push -m "Before TypeScript fix - $(date)"
   
   # 記錄當前錯誤詳情
   npx tsc --noEmit > typescript-errors-before.log 2>&1
   ```

3. **🧪 建立基線測試**
   ```bash
   # 確保所有現有測試通過
   npm run test:ci
   npm run build
   ```

### 階段式修復流程

#### Phase 1: 錯誤隔離分析
**絕對禁止直接開始修復，必須先分析**

```bash
# 1. 按檔案分組分析錯誤
npx tsc --noEmit 2>&1 | grep "error TS" | cut -d'(' -f1 | sort | uniq -c | sort -nr | head -20

# 2. 按錯誤類型分組
npx tsc --noEmit 2>&1 | grep "error TS" | grep -E "TS[0-9]+" -o | sort | uniq -c | sort -nr

# 3. 識別高風險檔案（錯誤數量 > 10）
npx tsc --noEmit 2>&1 | grep "error TS" | cut -d'(' -f1 | sort | uniq -c | awk '$1 > 10 {print $0}'
```

#### Phase 2: 安全修復策略選擇

**根據錯誤類型選擇修復策略**：

1. **TS2339 (Property does not exist)** - 高風險
   - ❌ 禁止：直接添加屬性到 interface
   - ✅ 安全：先檢查所有使用處，確認屬性確實存在
   - ✅ 方法：使用 optional chaining 或類型守衛

2. **TS2322 (Type not assignable)** - 中風險  
   - ❌ 禁止：強制類型轉換 `as any`
   - ✅ 安全：創建正確的類型映射函數
   - ✅ 方法：逐步類型轉換或重構資料結構

3. **TS2345 (Argument type error)** - 中風險
   - ❌ 禁止：修改函數簽名以符合錯誤調用
   - ✅ 安全：修改調用方式以符合正確簽名
   - ✅ 方法：創建適配器函數

#### Phase 3: 單一檔案修復流程

**每次只修復一個檔案，絕不批量修復**

```bash
# 1. 選擇修復目標（錯誤最少的檔案優先）
TARGET_FILE="src/path/to/file.ts"

# 2. 只檢查該檔案的錯誤
npx tsc --noEmit $TARGET_FILE

# 3. 修復前備份
cp $TARGET_FILE "${TARGET_FILE}.backup"

# 4. 修復單一錯誤（一次只修復一個錯誤）
# 5. 立即驗證
npx tsc --noEmit $TARGET_FILE

# 6. 如果新增錯誤，立即回退
if [ $? -ne 0 ]; then
  mv "${TARGET_FILE}.backup" $TARGET_FILE
  echo "修復失敗，已回退"
  exit 1
fi

# 7. 執行相關測試
npm run test -- --testPathPattern="${TARGET_FILE%.ts}.test"

# 8. 確認無副作用後才繼續下一個錯誤
```

#### Phase 4: 修復驗證與回退機制

**每個修復都必須通過完整驗證**

```bash
# 1. 類型檢查驗證
npx tsc --noEmit

# 2. 測試驗證
npm run test:ci

# 3. 建置驗證  
npm run build

# 4. ESLint 驗證
npm run lint

# 5. 如果任何步驟失敗，執行自動回退
if [ $? -ne 0 ]; then
  git reset --hard HEAD
  git stash pop
  echo "修復導致副作用，已完全回退"
  exit 1
fi
```

### 禁止的危險修復方式

**以下修復方式絕對禁止使用**：

❌ **禁止使用 `any` 類型**
```typescript
// ❌ 絕對禁止
const data: any = response;
property as any
```

❌ **禁止使用 TypeScript ignore**
```typescript
// ❌ 絕對禁止  
// @ts-ignore
// @ts-nocheck
```

❌ **禁止批量修改 interface**
```typescript
// ❌ 危險：一次修改多個屬性
interface Program {
  completedAt?: string;    // 新增
  evaluationId?: string;   // 新增
  startedAt?: string;      // 新增
}
```

❌ **禁止強制類型轉換**
```typescript
// ❌ 危險
(response as unknown as CorrectType)
```

### 安全的修復模式

✅ **使用類型守衛**
```typescript
function hasCompletedAt(obj: unknown): obj is { completedAt: string } {
  return typeof obj === 'object' && obj !== null && 'completedAt' in obj;
}
```

✅ **使用 Optional Chaining**
```typescript
const completedAt = program?.completedAt ?? null;
```

✅ **創建類型映射函數**
```typescript
function mapDatabaseToInterface(dbRow: DatabaseRow): ProgramInterface {
  return {
    id: dbRow.id,
    completedAt: dbRow.completed_at,
    // ...
  };
}
```

✅ **漸進式類型修復**
```typescript
// 先創建完整類型
interface CompleteProgramType {
  id: string;
  completedAt?: string;
  // ...
}

// 再逐步應用
```

### 自動化檢查腳本

**在 package.json 中添加檢查腳本**：
```json
{
  "scripts": {
    "typecheck:safe": "npx tsc --noEmit && npm run test:ci && npm run build",
    "fix:typescript-safe": "node scripts/safe-typescript-fix.js"
  }
}
```

### 修復進度追蹤

**修復過程中必須記錄**：
```bash
# 記錄修復進度
echo "$(date): Fixed file $TARGET_FILE, errors: $BEFORE_COUNT -> $AFTER_COUNT" >> typescript-fix-log.txt

# 每10個修復後創建commit
if [ $((FIXED_COUNT % 10)) -eq 0 ]; then
  git add .
  git commit -m "fix: resolve $FIXED_COUNT TypeScript errors safely

  🤖 Generated with [Claude Code](https://claude.ai/code)
  
  Co-Authored-By: Claude <noreply@anthropic.com>"
fi
```

### 緊急回退流程

**如果發現修復造成問題**：
```bash
# 1. 立即停止所有修復
# 2. 檢查git狀態
git status

# 3. 回退到最後一個穩定狀態
git reset --hard HEAD~1

# 4. 恢復stash（如果有）
git stash pop

# 5. 重新評估修復策略
npx tsc --noEmit > typescript-errors-after-rollback.log 2>&1
```

**⚠️ 重要：這些規則是強制性的，任何 TypeScript 錯誤修復都必須嚴格遵循此流程**


## 🚀 現代化 AI 開發流程

### 核心原則：極簡、高效、AI 友善

我們使用極簡化的開發流程，專注於效率和 AI 協作：

```
1. 開始工作 (make new) → 2. 智能保存 (make save) → 3. 完成工作 (make done)
```

---

## 📋 快速開始

### 核心命令（覆蓋 80% 場景）
```bash
make ai-new TYPE=feature TICKET=name   # 開始新工作
make ai-save                          # 智能保存進度（記錄 AI 複雜度）
make ai-done                          # 完成工作（測試+提交+合併）
```

### AI 輔助命令（20% 特殊場景）
```bash
make ai-fix                           # AI 自動修復問題
make ai-review                        # AI Code Review  
make ai-report                        # 查看效率報告
```

---

## 🎯 票券格式（整合版）

新架構將所有資訊整合到單一票券檔案中：

```yaml
# tickets/active/20250625_141005-feature-name.yml
spec:
  feature: OAuth2 Google 登入
  purpose: 讓使用者快速登入
  acceptance_criteria:
    - 支援 Google OAuth2
    - 顯示使用者資訊

dev_log:
  sessions:
    - session_id: 1
      activities: []
      
test_report:
  test_runs: []
  
ai_usage:
  interactions: []
  estimated_cost_usd: 0.0
```

**票券檔案是 Single Source of Truth，包含 spec、dev-log、test-report 所有資訊**

---

## 📊 AI 使用追蹤（Claude Code 適用）

### 記錄 AI 複雜度（不是 token）
```bash
# Claude Code 環境使用複雜度估算
AI_TASK="實作登入功能" AI_COMPLEXITY=complex make ai-save
```

複雜度等級：
- `simple`: 簡單查詢、小修改
- `medium`: 一般功能開發（預設）
- `complex`: 複雜功能、大重構
- `debug`: 除錯、問題解決

### 查看 AI 使用報告
```bash
make ai-report
```

---

## 🤖 AI 行為準則

### ✅ 應該做的
1. **開始前執行 `make ai-new`** - 創建整合式票券
2. **MVP 優先思維** - 先實作核心用戶價值，再完善基礎設施
3. **開發功能時同步撰寫測試** - TDD (Test-Driven Development) 優先
4. **定期執行 `make ai-save`** - 保存進度並記錄 AI 使用
5. **執行測試確保品質** - 單元測試和 E2E 測試都要通過
6. **完成後等待指示** - 不要自動執行 `make ai-done`
7. **記錄 AI 複雜度** - 透過環境變數傳遞
8. **所有 commit messages 必須使用英文** - 保持一致性和國際化
9. **遵守 TypeScript 嚴格類型檢查** - 避免使用 any 類型，正確定義所有類型
10. **遵守 ESLint 規則** - 確保代碼品質，不忽略任何警告

### ❌ 不應該做的
1. **自動 commit** - 除非用戶明確要求
2. **使用舊命令** - 如 dev-start、dev-commit 等
3. **創建冗長文件** - 保持極簡原則
4. **分散資訊到多個檔案** - 使用整合式票券
5. **過早優化** - 在驗證核心價值前避免過度工程化
6. **隨意創建新目錄** - 保持 docs/ 架構簡潔，優先使用現有文件
7. **開發到一半就自行 commit** - 必須等待用戶確認後才能 commit
8. **使用 any 類型** - 必須定義正確的 TypeScript 類型，避免類型檢查錯誤
9. **忽略 ESLint 警告** - 所有 ESLint 規則都要遵守，保持代碼品質

---

## 📁 簡化後的專案結構

```
frontend/           # Next.js + TypeScript + Tailwind
├── docs/           # Frontend 專屬文檔
│   ├── AI-QUICK-REFERENCE.md   # MVP 開發快速參考
│   ├── handbook/               # 技術規範文件
│   ├── infrastructure/         # 架構文件
│   └── testing/               # 測試指南
backend/            # FastAPI + Python  
docs/
├── tickets/        
│   └── archive/    # 已完成的票券（平面結構）
├── handbook/       # 全專案開發指南
│   └── technical-specs/  # 技術規範
└── reports/        # 專案報告
```

### 📁 檔案結構原則
- **保持極簡** - 不隨意創建新目錄
- **善用現有檔案** - 優先在現有文件中添加內容  
- **單一參考文件** - CLAUDE.md 為主要 AI 指南
- **避免文件碎片化** - 相關資訊集中管理
- **現有結構優先** - 新內容加入現有文件而非創建新目錄

---

## 🎯 開發範例

### 正確流程
```
User: "實作登入功能"
AI: "我來創建一個新的工作票券"
AI: [執行: make ai-new TYPE=feature TICKET=login]
AI: "票券已創建，開始開發並撰寫測試..."
AI: [建立測試檔案: src/components/auth/__tests__/LoginForm.test.tsx]
AI: [實作功能: src/components/auth/LoginForm.tsx]
AI: [執行: npm run test -- src/components/auth]
AI: [開發過程中: AI_TASK="實作登入含測試" AI_COMPLEXITY=medium make ai-save]
AI: "登入功能已完成，測試全部通過，包含以下變更..."
AI: [等待用戶指示]

User: "好，提交吧"
AI: [執行: make ai-done]
```

---

## 🧪 測試最佳實踐

### 測試原則
1. **TDD 優先**：先寫測試，再寫程式碼
2. **測試覆蓋率**：目標 70%+ 覆蓋率
3. **測試分離**：單元測試和 E2E 測試分開
4. **模擬外部依賴**：使用 mock 隔離測試

### 何時寫單元測試 vs E2E 測試
- **單元測試**：
  - API 路由邏輯
  - React 組件行為
  - 工具函數
  - 狀態管理邏輯
  
- **E2E 測試**：
  - 完整用戶流程（登入、註冊、購買等）
  - 跨頁面互動
  - 瀏覽器特定行為（cookies、localStorage）
  - 關鍵業務流程

### 測試檔案命名
- 單元測試：`ComponentName.test.tsx` 或 `functionName.test.ts`
- E2E 測試：`feature-name.spec.ts`

## 🎯 MVP 開發策略

### MVP 優先級順序
1. **核心用戶價值** - 先驗證產品假設
2. **基本功能完整性** - 確保主要流程可用
3. **品質保證** - 適度的測試覆蓋（70%+）
4. **基礎設施完善** - 等有實際需求再優化

### 避免過早優化
- ❌ 複雜的錯誤監控系統（用第三方服務）
- ❌ 過度的性能優化（等遇到瓶頸）
- ❌ 100% 測試覆蓋（聚焦關鍵路徑）
- ❌ 完美的基礎設施（漸進式改善）

### 技術債務管理
- 記錄但不立即修復的技術債務
- 當功能穩定後再重構優化
- 用戶反饋驅動的改善優先

## 💡 開發參考

### 文檔結構管理
- **CLAUDE.md** (本文件) - AI 行為準則與項目概覽
- **frontend/docs/** - Frontend 專屬文檔
  - `AI-QUICK-REFERENCE.md` - MVP 開發快速參考指南
  - `handbook/` - Frontend 技術規範
  - `infrastructure/` - 架構設計文件
  - `testing/` - 測試相關文檔
- **docs/handbook/** - 全專案開發指南
  - `technical-specs/` - 系統技術規範
- **docs/tickets/** - 工作票券管理
  - `archive/` - 已完成的票券

### 文件管理原則
1. **不要破壞現有架構** - 保持 docs/ 和 docs/handbook/ 的目錄結構
2. **生成文件前先確認位置** - 檢查應該放在哪個現有目錄
3. **優先更新現有文件** - 而非創建新文件
4. **避免文件碎片化** - 相關內容集中在同一文件

### 🏗️ 資料模型與命名規範

#### 時間戳記欄位命名標準
為避免重複修復相同問題，所有時間相關欄位必須遵循以下命名規範：

1. **createdAt**: 記錄創建時間（所有實體必有）
   - 對應 PostgreSQL: `created_at TIMESTAMP WITH TIME ZONE`
   - TypeScript: `createdAt: Date`
   - 永遠不要使用 `createTime`, `creationTime`, `startTime` 等

2. **startedAt**: 實際開始時間（可選）
   - 對應 PostgreSQL: `started_at TIMESTAMP WITH TIME ZONE`
   - TypeScript: `startedAt?: Date`
   - 用於記錄狀態從 pending → active 的時間

3. **completedAt**: 完成時間（可選）
   - 對應 PostgreSQL: `completed_at TIMESTAMP WITH TIME ZONE`
   - TypeScript: `completedAt?: Date`
   - 不要使用 `endTime`, `finishedAt` 等

4. **updatedAt**: 最後更新時間
   - 對應 PostgreSQL: `updated_at TIMESTAMP WITH TIME ZONE`
   - TypeScript: `updatedAt: Date`

#### 資料映射原則
1. **PostgreSQL → TypeScript 映射必須一致**
   ```typescript
   // ✅ 正確
   created_at → createdAt
   started_at → startedAt
   
   // ❌ 錯誤
   start_time → startTime (應該是 createdAt)
   ```

2. **避免語意混淆**
   - `createdAt`: 資料庫記錄建立時間
   - `startedAt`: 業務邏輯上的開始時間
   - 不要混用這兩個概念

3. **使用統一的映射函數**
   ```typescript
   // Repository 中統一處理時間欄位映射
   created_at as "createdAt",
   started_at as "startedAt",
   completed_at as "completedAt",
   updated_at as "updatedAt"
   ```

#### 防止「鬼打牆」開發問題
1. **修改前先搜尋**
   - 使用 `git log --grep` 檢查是否有類似的修改
   - 使用 `grep -r` 搜尋所有相關使用處
   - 確認修改會影響的所有地方

2. **建立單一事實來源**
   - PostgreSQL schema 是資料結構的事實來源
   - TypeScript interfaces 必須與 schema 保持一致
   - 不要在多處定義相同的類型

3. **遵循既定模式**
   - 查看現有程式碼的模式
   - 不要創造新的命名方式
   - 保持一致性

### 🏗️ DDD 術語統一規則

#### 任務數據結構術語統一

為遵循 Domain-Driven Design 原則，所有模組必須統一使用以下術語：

**`content`** - 任務內容 (Task Content)
- **用途**: 任務要呈現給用戶的具體內容和材料
- **包含**: instructions, question, options, description, hints, resources

**`context`** - 任務上下文 (Task Context)  
- **用途**: 任務執行所需的環境和背景資訊
- **包含**: scenarioId, difficulty, ksaCodes, metadata, taskType, estimatedTime

#### 🚨 強制性檢查清單
在任何涉及 Task 結構的修改時，必須檢查：
- [ ] content 只包含用戶內容
- [ ] context 只包含系統背景資訊  
- [ ] 沒有在 content.context 或 context.content 的嵌套
- [ ] 三個模組 (PBL/Assessment/Discovery) 結構一致

**⚠️ 違反此規則的代碼將被視為技術債務，必須優先修復**

### 🚨 TypeScript 和 ESLint 嚴格規則

#### 絕對禁止使用 any 類型
**這是最重要的規則，沒有例外**：
1. **完全禁止使用 `any` 類型**
   - ❌ 禁止：`const data: any = {}`
   - ✅ 正確：`const data: Record<string, unknown> = {}`
   - ✅ 正確：`const data: UserData = {}`
   
2. **類型轉換必須安全**
   - ❌ 禁止：`response as any`
   - ✅ 正確：`response as unknown as SpecificType`
   - ✅ 更好：定義正確的類型並驗證

3. **函數參數必須有類型**
   - ❌ 禁止：`function process(data) { }`
   - ❌ 禁止：`function process(data: any) { }`
   - ✅ 正確：`function process(data: ProcessData) { }`

4. **陣列必須有明確類型**
   - ❌ 禁止：`const items: any[] = []`
   - ✅ 正確：`const items: string[] = []`
   - ✅ 正確：`const items: Item[] = []`

#### ESLint 規則必須完全遵守
1. **@typescript-eslint/no-explicit-any**: 完全禁止使用 any
2. **@typescript-eslint/no-unused-vars**: 所有變數必須使用或移除
3. **react-hooks/exhaustive-deps**: Hook 依賴必須正確
4. **prefer-const**: 不會重新賦值的變數必須用 const

#### 🚨 ESLint 警告修復的絕對原則
**所有 ESLint 警告都必須真正修復，絕對禁止使用 disable 註解**：

1. **完全禁止使用任何 ESLint disable 註解**
   - ❌ 禁止：`// eslint-disable-line`
   - ❌ 禁止：`// eslint-disable-next-line`
   - ❌ 禁止：`/* eslint-disable */`
   - ❌ 禁止：`// @ts-ignore`
   - ❌ 禁止：`// @ts-nocheck`
   - ✅ 正確：真正修復程式碼以符合 ESLint 規則

2. **常見 ESLint 警告的正確修復方式**
   
   **React Hooks 依賴問題**：
   ```typescript
   // ❌ 錯誤：缺少依賴
   useEffect(() => {
     loadData();
   }, []);
   
   // ✅ 正確：使用 useCallback
   const loadData = useCallback(async () => {
     // ...
   }, [dependency]);
   
   useEffect(() => {
     loadData();
   }, [loadData]);
   ```
   
   **未使用的變數**：
   ```typescript
   // ❌ 錯誤：保留未使用的變數
   const unused = 'value';
   
   // ✅ 正確：移除未使用的變數
   // 或者如果是必要的參數，使用底線前綴
   const handleClick = (_event: MouseEvent) => {
     // ...
   };
   ```
   
   **Any 類型問題**：
   ```typescript
   // ❌ 錯誤：使用 any
   const data: any = fetchData();
   
   // ✅ 正確：定義正確的類型
   interface DataType {
     id: string;
     name: string;
   }
   const data: DataType = fetchData();
   ```

3. **修復原則**
   - 理解為什麼 ESLint 會報警告
   - 找出根本原因並修復
   - 確保修復後的程式碼邏輯正確
   - 不要為了消除警告而破壞功能
   - 如果真的有特殊情況，請與團隊討論，而不是自行 disable

4. **零容忍政策**
   - Commit 前必須確保零 ESLint 警告
   - Code Review 時發現 disable 註解必須退回
   - 養成隨時修復警告的習慣，不要累積技術債

### Git Commit 準則

#### 🚨 最重要：Commit 前必須檢查
**任何 commit 之前都必須執行以下檢查，這是最重要的事**：

1. **針對變更檔案的 ESLint 檢查**：
   ```bash
   # 只檢查變更的檔案，不做全域檢查
   cd frontend && npx eslint $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$')
   ```
   - 必須確保變更的檔案沒有任何 ESLint 錯誤或警告
   - 不可以忽略或跳過任何 lint 規則
   - **特別注意：不能有任何 any 類型警告**

2. **TypeScript 類型檢查**：
   ```bash
   # 針對變更檔案的類型檢查
   cd frontend && npx tsc --noEmit
   ```
   - 必須確保沒有任何 TypeScript 類型錯誤
   - 不可以使用 any 類型繞過檢查

3. **測試執行**：
   ```bash
   # 執行相關測試
   cd frontend && npm run test:ci
   ```
   - 必須確保所有測試通過
   - 特別是修改過的檔案相關的測試

4. **Build 檢查**：
   ```bash
   cd frontend && npm run build
   ```
   - 必須確保建置成功
   - 不能有任何編譯錯誤

5. **CLAUDE.md 規則檢查清單**：
   - [ ] 時間戳記欄位是否使用正確命名（createdAt, startedAt, completedAt, updatedAt）？
   - [ ] 是否有使用 any 類型？必須全部移除
   - [ ] PostgreSQL 欄位映射是否正確（created_at → createdAt）？
   - [ ] 是否檢查過 git log 避免重複修改？
   - [ ] 是否遵循既有的程式碼模式？
   - [ ] commit message 是否使用英文？
   - [ ] 是否在開發到一半就自行 commit？必須等待用戶確認

6. **只有在所有檢查都通過後才能 commit**

#### Commit 前的自動化檢查指令
```bash
# 建議將這個指令存為 alias 或 script
make pre-commit-check

# 或手動執行
cd frontend && \
npx eslint $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$') && \
npx tsc --noEmit && \
npm run test:ci && \
npm run build && \
echo "✅ All checks passed! Ready to commit."
```

#### Commit Message 規範
1. **所有 commit messages 必須使用英文**
2. **遵循 conventional commits 格式**:
   - `feat:` 新功能
   - `fix:` 修復問題
   - `docs:` 文檔更新
   - `style:` 代碼格式（不影響功能）
   - `refactor:` 重構
   - `test:` 測試相關
   - `chore:` 維護性工作
3. **不要在開發過程中自行 commit** - 必須等待用戶確認
4. **AI 增強的 commit message 格式**:
   ```
   <type>: <subject>
   
   <body>
   
   🤖 AI Assistant: Claude Opus 4 (claude-opus-4-20250514)
   📊 Session context: ~<estimated_tokens> tokens (estimated)
   🎯 Task complexity: <simple|medium|complex|debug>
   📁 Files changed: <number>
   ```
   - 在 commit message 底部加入 AI 使用資訊
   - Token 估算基於對話長度和任務複雜度
   - 清楚標示任務複雜度等級

### Git 同步工作流程
**重要**：在執行 commit 前，必須先同步遠端變更以避免衝突

1. **Commit 前的標準流程**：
   ```bash
   # 1. 先檢查狀態
   git status
   
   # 2. 拉取並 rebase 最新變更
   git pull --rebase origin main
   
   # 3. 如果有衝突，提示用戶手動解決
   # 4. 確認無衝突後才進行 commit
   ```

2. **為什麼要這樣做**：
   - 避免本地與 CMS 編輯的內容產生衝突
   - 保持線性的 commit 歷史
   - 減少不必要的 merge commits

3. **執行順序**：
   - 當用戶要求 `commit` 時
   - 先執行 `git pull --rebase`
   - 成功後才執行 `git add` 和 `git commit`
   - 如果 pull 失敗，提示用戶需要手動解決衝突

---

## 項目資訊

### Project Overview

AI Square 是一個「用 AI 學 AI 素養」的創新學習平台，基於國際 AI Literacy 框架，透過 AI 技術本身來提升學習者的 AI 素養能力。

**當前狀態 (2025/07)**:
- ✅ **Phase 1**: MVP 基礎完成 (100%)
- ✅ **Phase 1.5**: CMS 系統增強完成 (100%)
- 🚀 **Phase 2**: SaaS 平台開發中
- 📋 **Phase 3**: Agent 系統規劃中

**核心功能**:
- Problem-Based Learning (PBL) 系統：多任務情境學習、AI 導師輔導
- 多語言支援：14 種語言 (en, zhTW, zhCN, pt, ar, id, th, es, ja, ko, fr, de, ru, it)
- AI 素養能力視覺化：KSA (Knowledge, Skills, Attitudes) 映射
- 即時 AI 反饋：個人化評估與質性回饋
- CMS 內容管理：Git-based 版本控制、AI 輔助編輯、分支管理
- 學習進度追蹤：PostgreSQL 資料庫儲存用戶數據
- 統一抽象層架構：確保系統可擴展性

### 技術棧
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS v4, react-i18next, Monaco Editor
- **Backend**: FastAPI, Python 3.x, Vertex AI SDK
- **AI Services**: Google Vertex AI (Gemini 2.5 Flash), Claude API (翻譯), 規劃中: OpenAI
- **Database**: PostgreSQL (用戶數據、學習記錄)
- **Storage**: Google Cloud Storage (靜態檔案、圖片), GitHub (內容版本控制), Redis (分散式快取)
- **Caching**: 多層快取系統 (memory + localStorage + Redis with fallback)
- **Deployment**: Google Cloud Run, Docker, GitHub Actions CI/CD
- **Testing**: Jest (80%+ 覆蓋率), React Testing Library, Playwright
- **CMS**: GitHub API 整合, YAML 處理, AI Quick Actions
- **Translation**: 14 語言支援, LLM 自動化翻譯, 混合式架構

### Development Commands

#### Frontend (Next.js)
```bash
# Development server
cd frontend && npm run dev

# Build production
cd frontend && npm run build

# Lint
cd frontend && npm run lint

# Type checking
cd frontend && npm run typecheck
```

#### Testing Commands
```bash
# Unit Tests (Jest + React Testing Library)
cd frontend && npm run test                    # Watch mode
cd frontend && npm run test:ci                  # CI mode (no watch)
cd frontend && npm run test -- --coverage       # With coverage report
cd frontend && npm run test -- src/components   # Test specific folder

# E2E Tests (Playwright)
cd frontend && npx playwright install           # Install browsers (first time)
cd frontend && npm run test:e2e                 # Run all E2E tests
cd frontend && npm run test:e2e -- --project=chromium  # Chrome only
cd frontend && npm run test:e2e -- --grep "Login"      # Specific test
```

#### Test File Structure
```
frontend/
├── src/
│   ├── components/
│   │   └── auth/
│   │       ├── LoginForm.tsx
│   │       └── __tests__/
│   │           └── LoginForm.test.tsx    # Unit test
│   ├── app/
│   │   └── api/
│   │       └── auth/
│   │           ├── login/
│   │           │   └── route.ts
│   │           └── __tests__/
│   │               └── login.test.ts     # API test
├── e2e/
│   └── login.spec.ts                     # E2E test
└── __mocks__/                            # Test mocks
```

#### Backend (Python FastAPI)
```bash
# Development server
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Run tests (if pytest is installed)
cd backend && python -m pytest

# Linting (if ruff is installed)
cd backend && python -m ruff check .
```

#### Docker & Cloud Deployment
```bash
# Build Docker image
make build-frontend-image

# Deploy to Google Cloud Run
make gcloud-build-and-deploy-frontend
```

### Architecture

#### Unified Learning Architecture
AI Square 採用統一學習架構，所有模組（Assessment、PBL、Discovery）都遵循相同的資料流程：

**統一資料流程**：
```
YAML/API → Content Source → Scenario (UUID) → Program (UUID) → Tasks (UUID) → Evaluations (UUID)
```

**共同 Pattern**：
1. **Repository Pattern**: 所有模組都使用 PostgreSQL Repository 抽象層
2. **UUID 識別**: 所有實體都有唯一 UUID
3. **狀態管理**: pending → active → completed
4. **多語言支援**: 統一的翻譯機制
5. **快取策略**: 多層快取提升效能

詳細架構說明請參考：`frontend/docs/infrastructure/unified-learning-architecture.md`

#### Frontend Structure
- **Framework**: Next.js 15 with App Router, TypeScript, Tailwind CSS v4
- **Internationalization**: react-i18next with 14 language support (en, zhTW, zhCN, pt, ar, id, th, es, ja, ko, fr, de, ru, it)
- **Key Pages**:
  - `/` - Home page
  - `/relations` - AI literacy competency visualization interface
  - `/pbl` - Problem-Based Learning scenario list
  - `/pbl/scenarios/[id]` - Scenario details with KSA mapping
  - `/pbl/scenarios/[id]/program/[programId]/tasks/[taskId]/learn` - Interactive learning with AI tutor
  - `/pbl/scenarios/[id]/program/[programId]/complete` - Completion page with AI feedback
  - `/assessment/scenarios` - Assessment scenarios list
  - `/discovery` - Discovery career exploration
  - `/admin` - Admin dashboard for content management
- **API Routes**: 
  - `/api/relations` - Competency data with translations
  - `/api/pbl/scenarios` - PBL scenario management (hybrid translation support)
  - `/api/pbl/chat` - AI tutor conversation
  - `/api/pbl/evaluate` - Task performance evaluation
  - `/api/pbl/generate-feedback` - Multi-language feedback generation
  - `/api/assessment/scenarios` - Assessment scenarios with hybrid translation
  - `/api/monitoring/performance` - Real-time performance metrics
  - `/api/monitoring/cache` - Cache management and statistics

#### Backend Structure  
- **Framework**: FastAPI with Python 3.x
- **Key Dependencies**: Google Cloud AI Platform, Generative AI, OpenAI, YAML processing
- **Purpose**: Handles AI/LLM integrations and data processing

#### Data Architecture
- **Content Management**: 
  - **Rubrics**: YAML files in `frontend/public/rubrics_data/`
    - `ai_lit_domains.yaml` - Four core AI literacy domains with competencies
    - `ksa_codes.yaml` - Knowledge, Skills, Attitudes reference codes
  - **PBL Scenarios**: YAML files in `frontend/public/pbl_data/`
    - `*_scenario.yaml` - Scenario definitions with tasks and AI modules
    - Multi-language support through field suffixes
- **User Data**: PostgreSQL Database
  - Users, Programs, Tasks, Evaluations, Achievements tables
  - Relational data model with foreign key constraints
- **Static Files**: Google Cloud Storage
  - Images, documents, and other media files
  - Public bucket for static assets
- **Translation System**: Suffix-based field naming (e.g., `description_zh`, `description_es`)
- **Domain Structure**: Engaging_with_AI, Creating_with_AI, Managing_AI, Designing_AI

#### Component Architecture
- **Client-side rendering** with useState/useEffect patterns
- **Accordion interfaces** for domain and competency exploration  
- **Responsive design** with mobile-specific overlays
- **Dynamic content loading** via API with language parameter

#### Abstraction Layer Architecture (`frontend/src/lib/abstractions/`)
- **BaseApiHandler**: Unified API route handling with caching, error handling, and i18n
- **BaseStorageService**: Abstracted storage interface for file operations
- **BaseAIService**: Unified AI service interface for multiple providers
- **BaseYAMLLoader**: YAML content loading with validation and caching
- **BaseLearningService**: Unified learning service interface for all modules
- **Implementations**: Concrete implementations in `/implementations` directory

#### Service Layer Architecture (`frontend/src/lib/services/`)
- **UnifiedEvaluationSystem**: Centralized evaluation system with strategy pattern
- **HybridTranslationService**: Dual-track YAML + JSON translation system
- **ScenarioTranslationService**: Dynamic scenario content translation
- **EvaluationStrategies**: Module-specific evaluation implementations
- **Redis/DistributedCache**: Multi-level caching with automatic fallback

### Key Implementation Details

#### Translation System
The app uses a hybrid translation architecture:
1. **UI Labels**: react-i18next with JSON files in `public/locales/`
2. **Content Data**: 
   - YAML field suffixes for legacy content (e.g., `description_zh`)
   - Separate YAML files per language for new content (e.g., `scenario_ko.yml`)
3. **LLM Integration**: Claude API for automated translations
4. **Coverage**: 14 languages with 100% translation coverage

#### YAML Data Processing
- Domains contain competencies with KSA code references
- API route dynamically resolves translations and builds KSA maps
- Competencies link to knowledge (K), skills (S), and attitudes (A) indicators

#### Styling Approach
- **Tailwind CSS** for utility-first styling
- **Gradient backgrounds** and **responsive design** patterns
- **Custom animations** with CSS-in-JS for mobile interactions

### Database Architecture (Unified Schema V3)
AI Square 使用 **PostgreSQL** 作為主要資料庫，採用統一學習架構設計：

#### 統一學習架構資料流
```
Content Source → Scenario (UUID) → Program (UUID) → Task (UUID) → Evaluation (UUID)
```

#### 核心資料表結構

##### Scenarios 表（學習情境）
- **id**: UUID 主鍵
- **mode**: ENUM ('pbl', 'discovery', 'assessment') - 學習模式
- **status**: ENUM ('draft', 'active', 'archived') - 發布狀態
- **source_type**: ENUM ('yaml', 'api', 'ai-generated') - 來源類型
- **source_path/source_id**: 來源識別
- **source_metadata**: JSONB - 額外來源資訊
- **title/description**: JSONB - 多語言支援
- **objectives**: JSONB - 學習目標
- **task_templates**: JSONB - 任務模板定義
- **pbl_data/discovery_data/assessment_data**: JSONB - 模式特定資料
- **ai_modules/resources**: JSONB - AI 模組與資源配置

##### Programs 表（學習實例）
- **id**: UUID 主鍵
- **mode**: ENUM - 從 scenario 繼承的模式（使用 trigger 自動填充）
- **scenario_id**: 關聯的情境
- **user_id**: 學習者識別
- **status**: ENUM ('pending', 'active', 'completed', 'expired')
- **total_score/time_spent_seconds**: 學習成效追蹤
- **started_at/completed_at**: 時間戳記

##### Tasks 表（任務）
- **id**: UUID 主鍵
- **mode**: ENUM - 從 program 繼承的模式
- **program_id**: 關聯的學習實例
- **type**: ENUM ('question', 'chat', 'creation', 'analysis')
- **title/instructions**: JSONB - 多語言支援
- **context/metadata**: JSONB - 任務資料
- **interactions**: JSONB - 互動記錄
- **started_at/completed_at**: 任務時間追蹤

##### Evaluations 表（評估）
- **id**: UUID 主鍵
- **mode**: ENUM - 從 task 繼承的模式
- **task_id/user_id**: 關聯資訊
- **evaluation_type**: ENUM ('formative', 'summative', 'diagnostic', 'ai-feedback')
- **score/feedback**: 評估結果
- **criteria/rubric**: JSONB - 評估標準
- **ai_config/ai_response**: JSONB - AI 評估設定與回應

#### 重要設計特點
1. **Mode 欄位繼承**: programs、tasks、evaluations 都有 mode 欄位，透過 trigger 自動從上層繼承，避免過多 JOIN
2. **多語言支援**: 使用 JSONB 儲存 `{en: "English", zh: "中文", ...}` 格式
3. **彈性擴充**: 每個模式有專屬的 data 欄位（pbl_data、discovery_data、assessment_data）
4. **統一介面**: 所有模式使用相同的資料流程和 Repository Pattern
5. **時間戳記標準化**: 
   - `createdAt`: 記錄建立時間
   - `startedAt`: 實際開始時間（狀態從 pending → active）
   - `completedAt`: 完成時間
   - `updatedAt`: 最後更新時間

#### TypeScript 型別對應
```typescript
// 資料庫 ENUM 對應
export type LearningMode = 'pbl' | 'discovery' | 'assessment';
export type SourceType = 'yaml' | 'api' | 'ai-generated';
export type ScenarioStatus = 'draft' | 'active' | 'archived';
export type ProgramStatus = 'pending' | 'active' | 'completed' | 'expired';
export type TaskType = 'question' | 'chat' | 'creation' | 'analysis';
export type EvaluationType = 'formative' | 'summative' | 'diagnostic' | 'ai-feedback';

// 統一介面
export interface IScenario {
  id: string;
  mode: LearningMode;
  sourceType: SourceType;
  sourcePath?: string;
  sourceId?: string;
  sourceMetadata?: Record<string, unknown>;
  title: Record<string, string>;
  description: Record<string, string>;
  // ... 其他欄位
}
```

#### 資料儲存策略
- **PostgreSQL**: 所有動態用戶資料、學習記錄、進度追蹤
- **YAML 檔案**: 靜態內容定義（情境模板、KSA 映射、rubrics）
- **Google Cloud Storage**: 僅用於靜態檔案（圖片、文件、媒體）
- **Redis**: 分散式快取層，提升查詢效能

#### Repository Pattern 實作
- 所有資料存取都透過 Repository 抽象層
- 基礎介面定義在 `@/types/unified-learning.ts`
- PostgreSQL 實作在 `@/lib/repositories/postgresql/`
- 支援未來擴充其他資料庫（如 MongoDB）

### Configuration Files
- `eslint.config.mjs` - Next.js + TypeScript ESLint setup
- `tailwind.config.js` - Tailwind CSS configuration  
- `next.config.ts` - Next.js configuration with i18n
- `next-i18next.config.js` - Internationalization setup
- `tsconfig.json` - TypeScript configuration

### 最近成就 (2025/01)
- ✅ **TypeScript 型別安全**: 消除所有生產代碼的 any 類型 (102 → 0)
- ✅ **測試覆蓋率**: 核心模組達到 80%+ 覆蓋率
- ✅ **多語言支援完整度**: 14 種語言達到 100% 翻譯覆蓋率
- ✅ **混合式翻譯架構**: 實現 YAML + JSON 雙軌翻譯系統
- ✅ **API 效能優化**: 實現 5-10x 效能提升，含 Redis 快取支援
- ✅ **統一學習架構**: 完成 Assessment、PBL、Discovery 模組整合
- ✅ **LLM 翻譯系統**: 整合 Claude API 自動化翻譯流程
- ✅ **Tailwind CSS v4**: 升級並優化樣式系統

### 接下來的優先事項
1. **OAuth2 社交登入** (Google, GitHub) - 降低註冊門檻
2. **智能 Onboarding** - 解決「不知道從何開始」的痛點
3. **AI 資源使用追蹤** - Token 計算與成本控制
4. **PBL 修改歷程記錄** - 展示學習思考過程

### Project Context
AI Square 正處於從 MVP 轉向 SaaS 平台的關鍵階段。Phase 1 已完成基礎功能，現在專注於提升用戶體驗和平台智能化。

### 重要技術規範

#### Vertex AI Model Names
- **正確的模型名稱**: `gemini-2.5-flash` (不是 gemini-pro, 不是 gemini-2.0-flash-exp)
- **使用方式**: 
  ```typescript
  const model = vertexAI.preview.getGenerativeModel({
    model: 'gemini-2.5-flash',
    // ...
  });
  
  // 正確的 response 處理方式 (Vertex AI SDK)
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || 'Default response';
  
  // 或者使用 chat.sendMessage
  const result = await chat.sendMessage(message);
  const response = result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text || 'Default response';
  ```

## 🏗️ 架構設計最佳實踐 - 從 GCS-v2 遷移學到的教訓

### 🎯 Day 1 就要做對的架構決策

基於痛苦的 gcs-v2 到 PostgreSQL 遷移經驗，以下是未來專案必須從一開始就做對的事：

#### 1. **基礎架構選擇的黃金原則**
```yaml
必須有的基礎設施（從 Day 1）：
- 資料庫: PostgreSQL（絕不用檔案系統當資料庫）
- 快取: Redis（一開始就設計快取策略）
- 檔案儲存: S3/GCS（只存靜態檔案）
- 版本控制: Git-based 內容管理
```

**為什麼重要**：
- 遷移成本極高（光移除 gcs-v2 就要改幾十個檔案）
- 技術債會快速累積
- 「暫時的解決方案」往往變成永久的

#### 2. **統一資料模型設計**
```typescript
// Day 1 就定義好核心概念
interface UnifiedDataFlow {
  source: ContentSource;      // YAML, API, AI
  scenario: LearningScenario; // 統一的學習單元
  program: UserProgram;       // 用戶實例
  task: LearningTask;         // 任務
  evaluation: Assessment;     // 評估
}

// 使用 ENUM 確保類型安全（不要用 string）
type LearningMode = 'pbl' | 'discovery' | 'assessment';
```

#### 3. **Repository Pattern 必須從頭開始**
```typescript
// 抽象層讓未來更換儲存方案變得容易
interface IRepository<T> {
  findById(id: string): Promise<T>;
  create(item: T): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T>;
}

// 具體實作與抽象分離
class PostgreSQLRepository<T> implements IRepository<T> {
  // 實作細節
}
```

#### 4. **多語言支援的正確方式**
```typescript
// ❌ 錯誤：字串後綴（我們痛苦的教訓）
interface WrongWay {
  title_en: string;
  title_zh: string;
  title_es: string;
}

// ✅ 正確：結構化 JSONB
interface RightWay {
  title: {
    en: string;
    zh: string;
    es: string;
  };
}
```

#### 5. **技術決策必須文件化**
```markdown
# ADR-001: 為什麼選擇 PostgreSQL 而非檔案系統

## 狀態
已決定

## 背景
需要儲存用戶學習資料和進度

## 決策
使用 PostgreSQL 作為主要資料庫

## 原因
1. ACID 事務支援確保資料一致性
2. JSONB 支援彈性 schema
3. 強大的查詢能力
4. 成熟的生態系統

## 後果
- 需要維護資料庫
- 但避免了未來痛苦的遷移
```

### 🚨 紅旗警告 - 絕對要避免的陷阱

如果發現自己在做這些事，**立即停止並重新思考**：

1. **❌ 用檔案系統當資料庫**
   - 症狀：用 JSON 檔案儲存用戶資料
   - 後果：無法查詢、無事務、遷移困難

2. **❌ 字串後綴處理多語言**
   - 症狀：`title_zh`, `description_en`
   - 後果：維護困難、無法擴展新語言

3. **❌ 沒有抽象層直接耦合**
   - 症狀：直接在 API 中操作 GCS
   - 後果：更換儲存方案時要改所有程式碼

4. **❌ 「暫時」的解決方案**
   - 症狀：「先這樣，之後再改」
   - 後果：技術債永遠存在

5. **❌ 忽視資料關聯需求**
   - 症狀：分散的 JSON 檔案
   - 後果：無法 JOIN、效能問題

### 💡 MVP 也要有底線

```yaml
MVP 可以簡化的：
✅ 功能數量 - 少但精
✅ UI 精緻度 - 簡單但可用
✅ 效能優化 - 基本即可

MVP 絕不能省的：
❌ 正確的資料庫選擇
❌ 基本的錯誤處理
❌ 資料模型設計
❌ Repository Pattern
❌ 測試架構
```

### 🏆 最佳實踐檢查清單

開始新專案前，確保：

- [ ] 選擇了真正的資料庫（PostgreSQL/MySQL），而非檔案系統
- [ ] 設計了 Repository Pattern 抽象層
- [ ] 多語言使用 JSONB 結構而非字串後綴
- [ ] 寫了第一個 ADR (Architecture Decision Record)
- [ ] 定義了核心資料模型和 ENUM
- [ ] 設置了基本的測試架構
- [ ] 考慮了未來的擴展性

### 📝 記住這個教訓

> "There is nothing more permanent than a temporary solution"
> 沒有什麼比「暫時的解決方案」更永久

**寧願一開始多花一週設置正確的架構，也不要後續花一個月來重構！**

從 gcs-v2 的慘痛教訓中，我們學到：
- 基礎架構的選擇影響深遠
- 技術債的利息非常昂貴
- 正確的抽象層能救你一命
- 文件化決策避免重蹈覆轍

## 🔧 TypeScript 錯誤修復 SOP

### 1. **評估現況**
```bash
# 計算總錯誤數
npm run typecheck 2>&1 | grep -E "error TS[0-9]+" | wc -l

# 查看錯誤類型分佈
npm run typecheck 2>&1 | grep -E "error TS[0-9]+" | sort | uniq -c | sort -nr | head -20

# 查看特定錯誤類型
npm run typecheck 2>&1 | grep -E "error TS2339" | head -10  # Property does not exist
npm run typecheck 2>&1 | grep -E "error TS2322" | head -10  # Type assignment error
npm run typecheck 2>&1 | grep -E "error TS2722" | head -10  # Possibly undefined
```

### 2. **優先順序策略**
1. **批量修復相同模式的錯誤**（效率最高）
   - 例如：`dimensions` → `dimensionScores`（一次修復 21 個）
   - 例如：`sourceRef` → `sourceType/sourcePath/sourceId`（一次修復 11 個）

2. **修復影響面最大的錯誤**
   - 介面定義錯誤（會導致連鎖錯誤）
   - 基礎類型定義錯誤

3. **由簡到難**
   - 先修復簡單的屬性名稱錯誤
   - 再修復複雜的類型不匹配

### 3. **修復技巧**

#### A. 屬性名稱變更
```bash
# 使用 grep 找出所有使用舊屬性的地方
grep -r "\.dimensions" --include="*.ts" --include="*.tsx" .

# 批量替換（使用 MultiEdit）
old_string: "dimensionScores: ["
new_string: "dimensionScores: {"
```

#### B. Optional Method 呼叫
```typescript
// ❌ 錯誤
await taskRepo.updateStatus(id, status);

// ✅ 正確
await taskRepo.updateStatus?.(id, status);

// ✅ 需要預設值時
const result = await repo.findActive?.() || [];
```

#### C. 類型不匹配
```typescript
// ❌ 錯誤：title 應該是多語言物件
title: 'PBL Scenario'

// ✅ 正確
title: { en: 'PBL Scenario' }
```

### 4. **避免破壞功能的原則**

#### 理解錯誤的根本原因
```typescript
// ❌ 錯誤做法：盲目消除錯誤
const tasks = []; // 這會破壞功能！

// ✅ 正確做法：找出正確的資料來源
const tasks = await taskRepo.findByProgram(program.id);
```

#### 測試驅動的修復流程
```bash
# 1. 先跑測試，確認目前功能正常
npm run test -- --testNamePattern="assessment complete"

# 2. 修復 TypeScript 錯誤

# 3. 再跑一次測試，確保功能沒壞
npm run test -- --testNamePattern="assessment complete"
```

#### 處理 Optional 的正確方式
```typescript
// ❌ 錯誤：可能返回 undefined
const programs = await programRepo.getActivePrograms?.(userId);

// ✅ 正確：提供合理的預設值
const programs = await programRepo.getActivePrograms?.(userId) || [];
```

### 5. **常見錯誤模式與解法**

| 錯誤類型 | 錯誤訊息 | 解決方法 |
|---------|---------|---------|
| TS2339 | Property 'X' does not exist | 檢查屬性名稱是否正確、是否需要更新介面定義 |
| TS2322 | Type 'X' is not assignable to type 'Y' | 修正類型定義或轉換資料格式 |
| TS2722 | Cannot invoke possibly 'undefined' | 使用 optional chaining (`?.`) |
| TS2345 | Argument type mismatch | 確保參數類型符合函數定義 |
| TS18046 | 'error' is of type 'unknown' | 使用 `error instanceof Error` 檢查 |

### 6. **提交原則**
- 每修復 50-100 個錯誤就提交一次
- Commit message 要清楚說明修了什麼
- 記錄錯誤數量的變化
- 不要為了消除錯誤而使用 `any` 類型

### 7. **關鍵原則**
1. **理解 > 修復**：先理解為什麼會有這個錯誤
2. **測試保護**：修復前後都要跑測試
3. **保留業務邏輯**：確保原本的功能意圖不變
4. **防禦性程式設計**：處理 undefined/null 的情況
5. **註解說明**：複雜的修復要加註解說明原因
6. **小步前進**：一次修一個問題，確認沒問題再繼續

記住：**TypeScript 錯誤通常是在提醒我們程式碼可能有問題**，而不是要我們盲目地讓它閉嘴。

---

Note: This CLAUDE.md file must remain in the project root directory to be automatically read by Claude AI.


