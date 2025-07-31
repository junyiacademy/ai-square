# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨🚨🚨 最重要的規則 - 測試驅動開發 (TDD) 🚨🚨🚨

### 每次修復都必須：
1. **寫測試** - 先寫測試確認問題存在
2. **自己測試** - 實際執行代碼驗證修復
3. **模擬操作** - 從畫面模擬用戶操作流程
4. **驗證結果** - 確認看到正確的結果
5. **必要時登入登出** - 測試認證相關功能

### 測試流程：
```bash
# 1. 先用 curl 測試 API
curl -s "http://localhost:3001/api/..." | jq

# 2. 檢查資料庫
PGPASSWORD=postgres psql -h 127.0.0.1 -p 5433 -U postgres -d ai_square_db -c "SELECT ..."

# 3. 使用 Playwright 或 Browser MCP 測試實際畫面
npx playwright test --headed
# 或使用 Browser MCP 親自操作並驗證

# 4. 檢查瀏覽器 console 錯誤
# 5. 確認修復成功後才回報
```

### 強制要求：
- **必須使用 Playwright 或類似的瀏覽器工具親自看過結果**
- **不能只依賴 API 測試**
- **要模擬真實用戶操作流程**
- **確認畫面上顯示正確的內容**

**絕對不要讓用戶一直幫你抓錯！每個修復都要自己先測試過！**

## 🛠️ Claude Code Commands

### Slash Commands
```
/help      - View all available commands
/plan      - Enter planning mode (for complex tasks)
/search    - Search code or documentation
/scan      - Run security scan
/test      - Run tests
/commit    - Commit changes
/diff      - View file differences
/undo      - Undo last operation
```

### CLI Commands
```bash
claude                  # Start interactive session
claude -c               # Continue recent session
claude -r [sessionId]   # Resume specific session
claude --model opus     # Use Opus model (more powerful)
claude -p "prompt"      # Single query mode
```

Always follow the instructions in plan.md. When I say "go", find the next unmarked test in plan.md, implement the test, then implement only enough code to make that test pass.

## 🤖 Sub-Agent Usage Rules

### 使用 Sub-Agent 的時機與選擇

**主動性原則**: 看到任務時，先思考「哪個 agent 最適合？」不要等待提醒。

#### 1. TypeScript/ESLint 問題 → 使用 typescript-eslint-fixer agent
- **觸發關鍵字**: tsc, typecheck, eslint, lint, TS errors, build error
- **範例情境**: "tsc eslint commit" → 優先使用 typescript-eslint-fixer
- **用途**: 專門修復 TypeScript 編譯錯誤和 ESLint 警告

#### 2. 進度管理 → 使用 progress-memory-coach agent
- **儲存進度**: 在工作里程碑時保存
- **回憶之前工作**: "我們上次做了什麼？"
- **儲存內容**: 重要決策、模式、專案洞察
- **用途**: 維持跨工作階段的連續性

#### 3. 複雜搜尋任務 → 使用 general-purpose agent
- **多檔案搜尋**: 跨程式碼庫搜尋
- **未知位置**: 在不確定的位置找檔案
- **模式分析**: 跨多個檔案的模式分析
- **用途**: 進階搜尋和探索能力

#### 4. Slash Commands → 使用 Task tool 執行
- **指令**: /compact, /check-file 等
- **直接執行**: 針對特定指令的工具執行
- **用途**: 快速指令執行

### 關鍵原則
- 分析任務需求，立即選擇合適的 sub-agent
- 不要等待提醒或建議
- 每個 sub-agent 都有其專長領域，善用它們的能力

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

## 🔧 TypeScript Error Fix Guidelines

### 🚨 Key Principle: Zero-Risk Fix Strategy
**Never break existing functionality. Every fix must be verifiable and reversible.**

### Pre-fix Checklist
1. **Error Classification**: Analyze error types and distribution
2. **Create Snapshot**: Record current state before fixing
3. **Baseline Tests**: Ensure all tests pass before starting

### Safe Fix Patterns

✅ **Use Type Guards**
```typescript
function hasCompletedAt(obj: unknown): obj is { completedAt: string } {
  return typeof obj === 'object' && obj !== null && 'completedAt' in obj;
}
```

✅ **Use Optional Chaining**
```typescript
const completedAt = program?.completedAt ?? null;
```

✅ **Create Type Mapping Functions**
```typescript
function mapDatabaseToInterface(dbRow: DatabaseRow): ProgramInterface {
  return {
    id: dbRow.id,
    completedAt: dbRow.completed_at,
    // ...
  };
}
```

### Forbidden Patterns

❌ **Never use `any` type**
❌ **Never use `@ts-ignore` or `@ts-nocheck`**
❌ **Never force type casting with `as any`**
❌ **Never batch-modify interfaces**

### Fix Process
1. Fix one file at a time
2. Test after each fix
3. Commit every 50-100 fixes
4. Always provide fallback values for optional methods


## 🚀 Modern AI Development Workflow

### Core Principle: Minimal, Efficient, AI-Friendly

```
1. Start work (make new) → 2. Smart save (make save) → 3. Complete work (make done)
```

### Core Commands (80% of use cases)
```bash
make ai-new TYPE=feature TICKET=name   # Start new work
make ai-save                          # Smart save progress (record AI complexity)
make ai-done                          # Complete work (test+commit+merge)
```

### AI Behavior Guidelines

**DO:**
1. Execute `make ai-new` before starting work
2. MVP-first mindset - core user value before infrastructure
3. Write tests alongside features (TDD)
4. Regular `make ai-save` to track progress
5. Wait for user confirmation before `make ai-done`
6. All commit messages in English
7. Strict TypeScript types (no `any`)
8. Follow all ESLint rules

**DON'T:**
1. Auto-commit without user request
2. Use legacy commands
3. Create verbose documentation
4. Use `any` type
5. Ignore ESLint warnings
6. Commit mid-development

### AI Complexity Tracking
```bash
# Record complexity (not tokens)
AI_TASK="implement login" AI_COMPLEXITY=complex make ai-save
```

Complexity levels: `simple`, `medium`, `complex`, `debug`

---

## 🧪 Testing Best Practices

### Testing Principles
1. **TDD First**: Write tests before code
2. **Coverage Target**: 70%+ coverage
3. **Test Separation**: Unit and E2E tests separate
4. **Mock Dependencies**: Isolate tests with mocks

### Unit vs E2E Tests
- **Unit Tests**: API routes, React components, utilities, state management
- **E2E Tests**: User flows, cross-page interactions, browser behavior, critical paths

### Test Naming
- Unit: `ComponentName.test.tsx` or `functionName.test.ts`
- E2E: `feature-name.spec.ts`

## 🎯 MVP Development Strategy

### Priority Order
1. Core user value - validate assumptions
2. Basic functionality - ensure main flows work
3. Quality assurance - adequate testing (70%+)
4. Infrastructure - optimize when needed

### Avoid Premature Optimization
- ❌ Complex monitoring (use 3rd party)
- ❌ Over-optimization (wait for bottlenecks)
- ❌ 100% coverage (focus critical paths)
- ❌ Perfect infrastructure (incremental improvement)

### 🏗️ Data Model & Naming Standards

#### Timestamp Field Naming
1. **createdAt**: Record creation time
   - PostgreSQL: `created_at TIMESTAMP WITH TIME ZONE`
   - TypeScript: `createdAt: Date`

2. **startedAt**: Actual start time (optional)
   - PostgreSQL: `started_at TIMESTAMP WITH TIME ZONE`
   - TypeScript: `startedAt?: Date`

3. **completedAt**: Completion time (optional)
   - PostgreSQL: `completed_at TIMESTAMP WITH TIME ZONE`
   - TypeScript: `completedAt?: Date`

4. **updatedAt**: Last update time
   - PostgreSQL: `updated_at TIMESTAMP WITH TIME ZONE`
   - TypeScript: `updatedAt: Date`

#### DDD Terminology

**`content`** - Task Content
- **Purpose**: User-facing content and materials
- **Includes**: instructions, question, options, description, hints, resources

**`context`** - Task Context  
- **Purpose**: Environment and background information
- **Includes**: scenarioId, difficulty, ksaCodes, metadata, taskType, estimatedTime

#### Mandatory Checklist
- [ ] content contains only user content
- [ ] context contains only system metadata  
- [ ] No nested content.context or context.content
- [ ] All modules (PBL/Assessment/Discovery) use same structure

### 🚨 TypeScript & ESLint Strict Rules

#### 🔴 Rule #0: TypeScript 錯誤檢查優先順序
**永遠先檢查 TypeScript 編譯錯誤，再處理 ESLint 警告！**

1. **TypeScript 錯誤 (最優先)**
   - 使用 `npx tsc --noEmit` 檢查
   - 編譯錯誤 = 程式無法執行
   - 必須全部修復才能 build
   
2. **ESLint 警告 (次要)**
   - 使用 `npm run lint` 檢查
   - 程式碼品質問題
   - 不影響編譯但要遵守規範

**檢查順序：**
```bash
# 1. 先檢查 TypeScript 錯誤
npx tsc --noEmit

# 2. 修復所有 TypeScript 錯誤後，再處理 ESLint
npm run lint
```

#### Rule #1: Absolutely NO `any` Type
**This is the most important rule, no exceptions:**

1. **Completely forbidden `any` type**
   - ❌ Wrong: `const data: any = {}`
   - ✅ Right: `const data: Record<string, unknown> = {}`
   - ✅ Right: `const data: UserData = {}`

2. **Safe type conversions**
   - ❌ Wrong: `response as any`
   - ✅ Right: `response as unknown as SpecificType`
   - ✅ Better: Define correct types and validate

3. **Function parameters must have types**
   - ❌ Wrong: `function process(data) { }`
   - ✅ Right: `function process(data: ProcessData) { }`

4. **Arrays must have explicit types**
   - ❌ Wrong: `const items: any[] = []`
   - ✅ Right: `const items: string[] = []`

#### Rule #2: Next.js 15 Dynamic Route Parameters
**All route parameters must be Promises in Next.js 15:**

1. **Route handler parameters MUST use Promise type**
   - ❌ Wrong: `{ params: { id: string } }`
   - ✅ Right: `{ params: Promise<{ id: string }> }`

2. **MUST await params before use**
   ```typescript
   export async function GET(
     request: NextRequest,
     { params }: { params: Promise<{ id: string }> }
   ) {
     const { id } = await params; // REQUIRED
   }
   ```

#### Rule #3: Multilingual Field Types
**All multilingual fields MUST use Record<string, string>:**

1. **Interface definitions**
   - ❌ Wrong: `title: string`
   - ✅ Right: `title: Record<string, string>`

2. **Creating objects**
   - ❌ Wrong: `title: 'My Title'`
   - ✅ Right: `title: { en: 'My Title' }`

3. **Type assertions for unknown data**
   ```typescript
   const title = (data.title as Record<string, string>)?.[language] || 
                 (data.title as Record<string, string>)?.en || '';
   ```

#### Rule #4: Repository Method Calls
**All optional repository methods MUST use optional chaining:**

1. **Update operations**
   - ❌ Wrong: `await repo.update(id, data)`
   - ✅ Right: `await repo.update?.(id, data)`

2. **Custom methods**
   - ❌ Wrong: `await repo.getActivePrograms(userId)`
   - ✅ Right: `await repo.getActivePrograms?.(userId)`

#### Rule #5: Record<string, unknown> Property Access
**MUST use type assertions when accessing properties:**

1. **Nested property access**
   - ❌ Wrong: `scenario.metadata.careerType`
   - ✅ Right: `(scenario.metadata as Record<string, unknown>)?.careerType`

2. **With type casting**
   ```typescript
   const careerType = (scenario.metadata as Record<string, unknown>)?.careerType as string || 'default';
   ```

#### Rule #6: IInteraction Interface
**MUST NOT include 'id' field:**

- ❌ Wrong: `{ id: uuidv4(), type: 'user', content: '...' }`
- ✅ Right: `{ type: 'user', content: '...', timestamp: '...' }`

#### Rule #7: Required Interface Properties
**MUST include all required properties when creating objects:**

```typescript
// ITask requires: title, description, type, status, content, interactions
const task: ITask = {
  id: uuidv4(),
  title: { en: 'Task Title' },
  description: { en: 'Task Description' },
  type: 'question',
  status: 'active',
  content: { instructions: 'Do this task' },
  interactions: [],
  // ... all other required fields
};
```

#### Rule #8: ESLint Compliance

**Production code (src/**): Zero tolerance**
- ❌ Forbidden: `// eslint-disable-line`
- ❌ Forbidden: `// eslint-disable-next-line`
- ❌ Forbidden: `// @ts-ignore`
- ✅ Required: Fix all warnings before commit

**Script files (scripts/**): May use disable comments**
- ✅ Allowed: `// eslint-disable-next-line @typescript-eslint/no-unused-vars`
- Only for testing scripts, not production code

#### Rule #9: Pre-commit Validation
**MUST pass ALL checks before commit:**

1. **Run checks in order:**
   ```bash
   make pre-commit-check
   ```

2. **Manual check sequence:**
   ```bash
   npm run lint        # Zero warnings
   npm run typecheck   # Zero errors
   npm run test:ci     # All pass
   npm run build       # Success
   ```

#### Rule #10: Import/Export Compliance

**Route handlers MUST NOT export non-HTTP methods:**
- ❌ Wrong: `export function clearCache() { }`
- ✅ Right: `function clearCache() { }` (no export)

#### Rule #11: Type Definition Single Source of Truth

**Each type/interface MUST be defined in ONE place only:**

1. **Check before creating new interfaces**
   ```bash
   # Search for existing definitions
   grep -r "interface Achievement" src/
   grep -r "type Achievement" src/
   ```

2. **Import from single source**
   - ❌ Wrong: Define `Achievement` in multiple files
   - ✅ Right: `import type { Achievement } from '@/types/unified-learning'`

3. **Type hierarchy**
   ```
   @/types/database.ts       → Database schema types
   @/types/unified-learning.ts → Core business interfaces
   @/lib/repositories/interfaces → Repository-specific types
   @/lib/types/*            → Domain-specific types
   ```

#### Rule #12: Database to Interface Conversion

**MUST handle null/undefined conversions properly:**

1. **Database null → Interface undefined**
   ```typescript
   // Database: string | null
   // Interface: Record<string, string> | undefined
   
   // ❌ Wrong
   title: dbRow.title as Record<string, string> | undefined
   
   // ✅ Right
   title: dbRow.title ? (dbRow.title as unknown as Record<string, string>) : undefined
   ```

2. **Type conversion helpers**
   ```typescript
   // Standard conversion function
   function toMultilingual(value: unknown): Record<string, string> | undefined {
     if (!value || value === null) return undefined;
     if (typeof value === 'string') return { en: value };
     return value as Record<string, string>;
   }
   ```

3. **Array handling**
   ```typescript
   // ❌ Wrong
   taskTemplates: row.task_templates as ITaskTemplate[]
   
   // ✅ Right
   taskTemplates: (row.task_templates as Array<Record<string, unknown>> || []).map((t): ITaskTemplate => ({
     id: t.id as string,
     title: t.title as Record<string, string>,
     type: t.type as TaskType,
     ...t
   }))
   ```

#### Rule #13: Type Safety Pre-check List

**Before implementing new features:**

- [ ] Check if types already exist (`grep -r "interface TypeName"`)
- [ ] Verify multilingual fields use `Record<string, string>`
- [ ] Ensure database fields map correctly to interfaces
- [ ] Add type conversion functions for complex types
- [ ] Use `as unknown as Type` for non-overlapping conversions
- [ ] Handle all null/undefined cases explicitly

**Valid route exports only:**
- GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS

#### Rule #14: Multi-language YAML File Processing

**🚨 重要：多語言 YAML 檔案不是獨立的 Scenario！**

**錯誤示例：**
```
assessment_data/
├── ai_literacy/
    ├── ai_literacy_questions_en.yaml    ❌ 不是獨立 scenario
    ├── ai_literacy_questions_zh.yaml    ❌ 不是獨立 scenario
    ├── ai_literacy_questions_es.yaml    ❌ 不是獨立 scenario
    └── ...14 個語言版本
```

**正確理解：**
- 這些是**同一個 Assessment Scenario** 的不同語言版本
- 應該創建**一個** Scenario，包含所有語言的內容
- `title` 和 `description` 應該是 `Record<string, string>` 格式：
  ```typescript
  {
    title: {
      en: "AI Literacy Assessment",
      zh: "AI 素養評估",
      es: "Evaluación de Alfabetización en IA",
      // ...其他語言
    }
  }
  ```

**實作檢查清單：**
- [ ] 掃描 YAML 時要識別語言後綴（`_en`, `_zh`, `_es` 等）
- [ ] 將同一主題的不同語言版本合併為一個 Scenario
- [ ] 不要為每個語言版本創建獨立的 Scenario
- [ ] 使用 `sourcePath` 記錄主要語言版本路徑
- [ ] 在 `sourceMetadata` 中記錄所有語言版本路徑

#### Rule #15: Test File TypeScript Compliance

**🚨 測試檔案必須嚴格遵守所有 TypeScript 規則，零例外！**

**為什麼測試也要嚴格？**
1. **測試即文檔** - 測試展示正確用法，錯誤的型別會誤導開發者
2. **防止誤用** - 型別不符的測試無法正確驗證功能
3. **維護一致性** - 整個程式碼庫應該有統一標準
4. **發現真實問題** - 嚴格型別檢查能在測試階段發現介面設計缺陷

**測試檔案常見錯誤與修正：**

1. **多語言欄位必須使用 Record<string, string>**
   ```typescript
   // ❌ 錯誤：測試中使用字串
   const mockScenario = {
     title: 'Test Scenario',
     description: 'Test Description'
   };
   
   // ✅ 正確：與生產代碼保持一致
   const mockScenario = {
     title: { en: 'Test Scenario' },
     description: { en: 'Test Description' }
   };
   ```

2. **必須導入所有使用的型別**
   ```typescript
   // ❌ 錯誤：未導入 TaskType
   { type: 'question' as TaskType }
   
   // ✅ 正確：明確導入
   import type { TaskType } from '@/types/unified-learning';
   { type: 'question' as TaskType }
   ```

3. **Mock 物件必須符合介面定義**
   ```typescript
   // ❌ 錯誤：添加不存在的屬性
   const mockProgram: IProgram = {
     // ...
     discoveryData: {
       explorationPath: [],
       portfolioProjects: []  // 此屬性不在介面中！
     }
   };
   
   // ✅ 正確：只使用介面定義的屬性
   const mockProgram: IProgram = {
     // ...
     discoveryData: {
       explorationPath: [],
       milestones: []  // 使用正確的屬性
     }
   };
   ```

4. **不能導入未導出的函數**
   ```typescript
   // ❌ 錯誤：嘗試導入內部函數
   import { clearCache } from '../route';
   
   // ✅ 正確：只導入公開的 API
   import { GET, POST } from '../route';
   ```

5. **NextRequest 建構子格式**
   ```typescript
   // ❌ 錯誤：物件格式
   new NextRequest({
     method: 'POST',
     url: 'http://...'
   })
   
   // ✅ 正確：URL 在前，選項在後
   new NextRequest('http://...', {
     method: 'POST',
     body: JSON.stringify(data)
   })
   ```

**測試檔案檢查清單：**
- [ ] 所有多語言欄位使用 `Record<string, string>`
- [ ] 所有型別都有正確的 import
- [ ] Mock 資料完全符合介面定義
- [ ] 沒有存取不存在的屬性
- [ ] 沒有使用 `any` 型別
- [ ] 沒有使用 `@ts-ignore` 或 `@ts-expect-error`

**執行檢查：**
```bash
# 只檢查測試檔案的 TypeScript 錯誤
npx tsc --noEmit 2>&1 | grep -E "test\.(ts|tsx)"

# 檢查測試檔案的 ESLint 問題
npx eslint '**/*.test.{ts,tsx}'
```

**零容忍政策：**
- 測試檔案的 TypeScript 錯誤必須**立即修復**
- PR 不能包含任何測試檔案的型別錯誤
- 測試必須展示**正確的**使用方式

### 🛡️ TypeScript Error Prevention Summary

#### Common Error Patterns & Solutions

1. **Multilingual Field Mismatch**
   - **Error**: Type 'string' is not assignable to type 'Record<string, string>'
   - **Solution**: Always use `{ en: value }` format or conversion helper

2. **Type Definition Conflicts**
   - **Error**: Type 'X' is not assignable to type 'Y' (same interface name)
   - **Solution**: Import from single source, never redefine

3. **Unsafe Type Conversions**
   - **Error**: Conversion may be a mistake
   - **Solution**: Use `as unknown as Type` for safety

4. **Optional Chaining on Unknown**
   - **Error**: Property does not exist on type
   - **Solution**: Cast to Record<string, unknown> first

5. **Next.js 15 Route Parameters**
   - **Error**: Type '{ params: { id: string } }' not assignable
   - **Solution**: Use Promise<{ params }> and await

#### Quick Fix Checklist
```bash
# 1. Check TypeScript errors first
npx tsc --noEmit

# 2. Search for type conflicts
grep -r "interface TypeName" src/

# 3. Fix in order: imports → types → conversions → implementations

# 4. Validate fixes
npm run typecheck && npm run lint && npm run test:ci
```

#### Rule #11: TDD for TypeScript Error Fixes
**修復 TypeScript 錯誤時必須使用 TDD 流程：**

1. **先寫測試確認錯誤存在**
   ```bash
   # 寫一個會失敗的測試，證明問題存在
   npm run test -- --testNamePattern="should handle multilingual fields"
   ```

2. **修復錯誤**
   - 一次只修復一個錯誤
   - 確保測試通過

3. **驗證修復沒有破壞其他功能**
   ```bash
   npm run test:ci  # 所有測試必須通過
   npm run build    # Build 必須成功
   ```

4. **實際測試修復效果**
   ```bash
   # 使用 Playwright 或 Browser 工具測試
   npx playwright test --headed
   ```

#### Rule #16: 服務層資料結構驗證與 TDD 錯誤修復

**🚨 重要：遇到錯誤時必須先理解實際資料結構，再修復介面定義！**

**錯誤修復流程 (TDD):**
1. **檢查實際資料結構** - 查看資料庫中的真實 JSON 資料
2. **識別介面與實際不符** - 找出 TypeScript 介面與資料的差異  
3. **寫測試驗證問題存在** - 建立重現錯誤的測試
4. **修復介面定義** - 更新 TypeScript 介面符合實際資料
5. **支援向後相容** - 保留舊格式支援，避免破壞現有功能
6. **測試驗證修復** - 確認所有測試通過

**常見資料結構錯誤類型:**

1. **Assessment Service 資料格式不一致**
   ```typescript
   // 錯誤：期望 questionBankByLanguage 但實際是扁平化結構
   const questionBank = assessmentData.questionBankByLanguage[language];
   
   // 修復：支援兩種格式
   if (questionBankByLanguage[language]) {
     questionBank = questionBankByLanguage[language];
   } else {
     // 支援扁平化格式 questionBank
     const flatQuestionBank = assessmentData.questionBank || [];
     questionBank = flatQuestionBank.flatMap(domain => domain.questions || []);
   }
   ```

2. **Discovery Service 介面定義過時**
   ```typescript
   // 錯誤：使用不存在的屬性
   discoveryData.career.title[language]  // career 不存在於新格式
   
   // 修復：使用實際存在的屬性並提供 fallback
   (scenario.title as Record<string, string>)[language] || 'Career Path'
   discoveryData.pathId  // pathId 確實存在於 discoveryData 中
   ```

3. **動態屬性存取類型安全**
   ```typescript
   // 錯誤：假設所有 skill 都有相同屬性
   nextSkill.unlocks  // advanced_skills 沒有 unlocks，只有 requires
   
   // 修復：使用 type guard
   'unlocks' in nextSkill ? nextSkill.unlocks : []
   ```

4. **Union Types 的正確處理**
   ```typescript
   // 錯誤：直接比較 union type
   advancedSkills.includes(nextSkill)  // 型別不符
   
   // 修復：比較唯一識別屬性
   advancedSkills.some(skill => skill.id === nextSkill.id)
   ```

**防範措施:**
- [ ] 新功能開發前先檢查實際資料結構
- [ ] 定義介面時查看資料庫中的真實 JSON (`SELECT jsonb_pretty(data) FROM table`)
- [ ] 使用 optional properties (`?`) 和 union types 處理多種格式
- [ ] 建立資料驗證輔助函數
- [ ] 定期同步介面定義與實際資料結構

**驗證檢查清單:**
- [ ] `npm run typecheck` 無錯誤
- [ ] 所有測試通過
- [ ] 驗證腳本可以執行
- [ ] 資料庫查詢返回預期結果
- [ ] 向後相容性測試通過

#### Enforcement
- **Build will fail** if any rule is violated
- **PR will be rejected** if TypeScript errors exist
- **No exceptions** for production code OR test code
- **Fix immediately** when errors appear
- **Always use TDD** when fixing errors to avoid breaking existing functionality
- **Test files must follow same standards** as production code
- **Zero tolerance** for type errors in tests

### Git Commit Guidelines

#### 🚨 Pre-commit Checklist
**Must complete ALL checks before commit:**

1. **TypeScript Check (永遠最先檢查)**:
   ```bash
   cd frontend && npx tsc --noEmit
   ```
   **如果有任何 TypeScript 錯誤（包含測試檔案），必須先修復才能繼續！**
   
   檢查測試檔案錯誤：
   ```bash
   npx tsc --noEmit 2>&1 | grep -E "test\.(ts|tsx)"
   ```

2. **ESLint Check (TypeScript 通過後才檢查)**: 
   ```bash
   cd frontend && npx eslint $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$')
   ```

3. **Test Check**:
   ```bash
   cd frontend && npm run test:ci
   ```

4. **Build Check**:
   ```bash
   cd frontend && npm run build
   ```

5. **Automated pre-commit command**:
   ```bash
   make pre-commit-check
   ```

#### Commit Message Format
1. **All commit messages in English**
2. **Follow conventional commits**:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation
   - `refactor:` code refactoring
   - `test:` testing
   - `chore:` maintenance
3. **Never auto-commit** - wait for user confirmation
4. **AI-enhanced format**:
   ```
   <type>: <subject>
   
   <body>
   
   🤖 AI Assistant: Claude Opus 4
   📊 Session context: ~<tokens> tokens (estimated)
   🎯 Task complexity: <level>
   📁 Files changed: <number>
   ```

#### Git Sync Workflow
**Always sync before commit:**
```bash
# 1. Check status
git status

# 2. Pull and rebase
git pull --rebase origin main

# 3. Resolve conflicts if any
# 4. Then commit
```

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

### Important Technical Specifications

#### 🚨 Cloud SQL Deployment - Regions Must Match
**Key lesson from painful staging deployment**

- **Problem**: "relation does not exist" errors were actually timeout issues
- **Cause**: Cloud SQL in `us-central1`, Cloud Run in `asia-east1`
- **Solution**: Both services must be in same region

```bash
# ❌ Wrong: Cross-region
Cloud SQL: us-central1
Cloud Run: asia-east1

# ✅ Correct: Same region
Cloud SQL: asia-east1
Cloud Run: asia-east1
```

#### Vertex AI Model Names
- **Correct model**: `gemini-2.5-flash` (not gemini-pro)
- **Usage**:
  ```typescript
  const model = vertexAI.preview.getGenerativeModel({
    model: 'gemini-2.5-flash',
  });
  
  const result = await model.generateContent(prompt);
  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || 'Default';
  ```

## 🏗️ Architecture Best Practices - Lessons from GCS-v2 Migration

### 🎯 Get Architecture Right from Day 1

#### Golden Rules for Infrastructure
```yaml
Must-have from Day 1:
- Database: PostgreSQL (never use filesystem as DB)
- Cache: Redis (design caching strategy early)
- File Storage: S3/GCS (static files only)
- Version Control: Git-based content management
```

#### Core Design Principles

1. **Unified Data Model**
   ```typescript
   interface UnifiedDataFlow {
     source: ContentSource;      // YAML, API, AI
     scenario: LearningScenario; // Unified learning unit
     program: UserProgram;       // User instance
     task: LearningTask;         // Task
     evaluation: Assessment;     // Assessment
   }
   ```

2. **Repository Pattern from Start**
   ```typescript
   interface IRepository<T> {
     findById(id: string): Promise<T>;
     create(item: T): Promise<T>;
     update(id: string, updates: Partial<T>): Promise<T>;
   }
   ```

3. **Proper Multi-language Support**
   ```typescript
   // ❌ Wrong: String suffixes
   interface WrongWay {
     title_en: string;
     title_zh: string;
   }
   
   // ✅ Right: Structured JSONB
   interface RightWay {
     title: {
       en: string;
       zh: string;
     };
   }
   ```

### 🚨 Red Flags to Avoid

1. **❌ Using filesystem as database**
2. **❌ String suffixes for i18n**
3. **❌ No abstraction layer**
4. **❌ "Temporary" solutions**
5. **❌ Ignoring data relationships**

### 💡 MVP Baseline

```yaml
OK to simplify in MVP:
✅ Feature count - fewer but focused
✅ UI polish - simple but usable
✅ Performance - basic is fine

Never skip in MVP:
❌ Proper database choice
❌ Error handling
❌ Data model design
❌ Repository Pattern
❌ Test framework
```

> "There is nothing more permanent than a temporary solution"

## 🗄️ 資料庫配置標準

### 🚨 絕對不能再出現的問題：DB_NAME 不一致

**標準配置**：
```bash
DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=ai_square_db  # 統一使用這個！
DB_USER=postgres
DB_PASSWORD=postgres
```

**檢查清單**：
- [ ] `.env.local` 使用正確的 DB_NAME
- [ ] `repository-factory.ts` 預設值正確
- [ ] `docker-compose.postgres.yml` 配置正確
- [ ] 所有測試腳本使用統一配置

**如果遇到 "Scenario not found" 錯誤**：
1. 立即檢查 `DB_NAME` 配置
2. 重啟 Next.js 開發伺服器
3. 確認資料庫連線

**禁止使用的舊名稱**：
- ❌ `ai_square_dev` 
- ❌ `ai-square-development`
- ❌ `aisquare2025local` (密碼)

## 🔧 TypeScript Error Fix SOP

### 1. **Assess Current State**
```bash
# Count total errors
npm run typecheck 2>&1 | grep -E "error TS[0-9]+" | wc -l

# Check error distribution
npm run typecheck 2>&1 | grep -E "error TS[0-9]+" | sort | uniq -c | sort -nr | head -20
```

### 2. **Check Usage Before Fixing**
```bash
# Check if file is referenced
grep -r "from.*filename" --include="*.ts" --include="*.tsx" .

# Check if function is called
grep -r "functionName" --include="*.ts" --include="*.tsx" . | grep -v "function functionName"

# Safe deletion process
git rm path/to/unused-file.ts
git commit -m "chore: remove unused file [filename]"
```

### 3. **Priority Strategy**
1. **Batch fix same patterns** (most efficient)
2. **Fix high-impact errors** (interface definitions)
3. **Simple to complex** (property names → type mismatches)

### 4. **Fix Techniques**

#### Property Renames
```typescript
// Use grep to find all occurrences
grep -r "\.oldProperty" --include="*.ts" --include="*.tsx" .
```

#### Optional Method Calls
```typescript
// ✅ Correct
await taskRepo.updateStatus?.(id, status);
const result = await repo.findActive?.() || [];
```

#### Type Mismatches
```typescript
// ✅ Correct: multilingual object
title: { en: 'PBL Scenario' }
```

### 5. **Common Error Patterns**

| Error | Message | Solution |
|-------|---------|----------|
| TS2339 | Property doesn't exist | Check property name/interface |
| TS2322 | Type not assignable | Fix type definition |
| TS2722 | Possibly undefined | Use optional chaining |
| TS2345 | Argument mismatch | Match function signature |

### 6. **Key Principles**
1. **Understand > Fix**: Know why the error exists
2. **Test protection**: Test before and after
3. **Preserve logic**: Keep functionality intact
4. **Defensive coding**: Handle undefined/null
5. **Small steps**: Fix one issue at a time

**Remember: TypeScript errors are warnings about potential problems, not just noise to silence.**

## 📚 Cloud Run + Cloud SQL Deployment Guide

### 🚨 Key Principle: Regions Must Match
**Critical lesson from staging deployment**

#### Diagnostics

1. **Check Cloud SQL instance**:
   ```bash
   gcloud sql instances describe INSTANCE_NAME --format="table(name,region,state)"
   ```

2. **Check Cloud Run config**:
   ```bash
   gcloud run services describe SERVICE_NAME --region=REGION --format="json" | jq '.spec.template.metadata.annotations'
   ```

#### Connection Methods

**Method 1: Unix Socket (Recommended)**
```bash
gcloud run deploy SERVICE_NAME \
  --add-cloudsql-instances=PROJECT:REGION:INSTANCE \
  --set-env-vars DB_HOST="/cloudsql/PROJECT:REGION:INSTANCE"
```

**Method 2: Private IP + VPC (Most Secure)**
```bash
# Create VPC Connector
gcloud compute networks vpc-access connectors create CONNECTOR \
  --region=REGION --network=default --range=10.8.0.0/28

# Deploy with connector
gcloud run deploy SERVICE_NAME \
  --vpc-connector=CONNECTOR \
  --vpc-egress=all-traffic
```

#### Common Issues

1. **Password auth failed**: Use Secret Manager for special chars
2. **Connection timeout**: Check region matching
3. **Permission denied**: Add `cloudsql.client` role

#### Deployment Checklist

- [ ] Cloud SQL and Cloud Run in same region
- [ ] Environment variables set correctly
- [ ] Cloud SQL instance mounted
- [ ] Service account has permissions
- [ ] Database initialized
- [ ] Password managed properly

#### Repository Pattern Connection

```typescript
const dbHost = process.env.DB_HOST || 'localhost';
const isCloudSQL = dbHost.startsWith('/cloudsql/');

if (isCloudSQL) {
  poolConfig.host = dbHost;
  // Don't set port for unix socket
} else {
  poolConfig.host = dbHost;
  poolConfig.port = parseInt(process.env.DB_PORT || '5432');
}
```

## 🚨 TypeScript Build 錯誤防範指南

### 常見錯誤類型與解決方案

#### 1. Next.js 15 動態路由參數錯誤
**錯誤**: `Type '{ params: { id: string } }' is not assignable to type '{ params: Promise<{ id: string }> }'`

**原因**: Next.js 15 將動態路由參數改為 Promise
```typescript
// ❌ 錯誤
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
}

// ✅ 正確
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}
```

#### 2. 多語言欄位型別不匹配
**錯誤**: `Type 'string' is not assignable to type 'Record<string, string>'`

**原因**: 資料庫期望多語言物件，但傳入字串
```typescript
// ❌ 錯誤
title: template.title as string,
description: template.description as string,

// ✅ 正確 - 保持原始型別
title: template.title as Record<string, string>,
description: template.description as Record<string, string>,

// ✅ 或轉換為多語言物件
title: { en: titleString },
description: { en: descriptionString },
```

#### 3. Record<string, unknown> 屬性存取錯誤
**錯誤**: `Property 'X' does not exist on type '{}'`

**原因**: TypeScript 不知道動態物件的屬性
```typescript
// ❌ 錯誤
scenario.discoveryData.careerType

// ✅ 正確
(scenario.discoveryData as Record<string, unknown>)?.careerType as string
```

#### 4. IInteraction 介面錯誤
**錯誤**: `Object literal may only specify known properties, and 'id' does not exist in type 'IInteraction'`

**原因**: 嘗試添加介面中不存在的屬性
```typescript
// ❌ 錯誤
const newInteraction: IInteraction = {
  id: crypto.randomUUID(),  // IInteraction 沒有 id 屬性
  timestamp: new Date().toISOString(),
  type: 'user_input',
  content: response
};

// ✅ 正確
const newInteraction: IInteraction = {
  timestamp: new Date().toISOString(),
  type: 'user_input',
  content: response
};
```

#### 5. 字串字面值型別錯誤
**錯誤**: `Type 'never' error with string literal types`

**原因**: TypeScript 無法推斷條件檢查後的型別
```typescript
// ❌ 可能出錯
if (typeof titleObj === 'string' && titleObj.startsWith('{')) {
  // TypeScript 可能認為 titleObj 是 never
}

// ✅ 使用明確的型別斷言
const titleObj = task.title as string | Record<string, string> | undefined;
if (typeof titleObj === 'string') {
  if (titleObj.startsWith('{')) {
    // 現在 TypeScript 知道 titleObj 是 string
  }
}
```

### 預防措施

1. **統一資料模型設計**
   - 從一開始就決定多語言欄位格式
   - 避免混用 string 和 Record<string, string>
   - 在 interface 中明確定義所有欄位

2. **使用嚴格的型別定義**
   ```typescript
   // 在 types 資料夾中定義清晰的介面
   interface ITask {
     title?: Record<string, string>;  // 明確定義為多語言
     description?: Record<string, string>;
     // ... 其他欄位
   }
   ```

3. **建立型別轉換輔助函數**
   ```typescript
   function ensureMultilingual(value: unknown): Record<string, string> {
     if (typeof value === 'string') {
       return { en: value };
     }
     if (typeof value === 'object' && value !== null) {
       return value as Record<string, string>;
     }
     return { en: '' };
   }
   ```

4. **定期執行 build 檢查**
   ```bash
   # 在提交前執行
   npm run build
   npm run typecheck
   ```

5. **避免使用 any 型別**
   - 使用 unknown 並進行型別檢查
   - 使用具體的型別斷言
   - 定義明確的介面

### 關鍵教訓

1. **Next.js 升級影響**: 主要框架升級（如 Next.js 14 → 15）會帶來重大 API 變更
2. **型別一致性**: 整個專案要保持型別定義的一致性
3. **漸進式修復**: 修復一個錯誤可能暴露更多錯誤，需要耐心逐一解決
4. **測試覆蓋**: 良好的測試覆蓋可以在重構時提供信心

---

Note: This CLAUDE.md file must remain in the project root directory to be automatically read by Claude AI.


