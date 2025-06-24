# BDD 實踐指南

行為驅動開發 (Behavior-Driven Development) 幫助團隊從用戶視角定義需求。

## 🎯 什麼是 BDD？

BDD 是 TDD 的延伸，專注於：
- **業務價值** - 從用戶需求出發
- **共同語言** - 業務和技術的橋樑
- **活文檔** - 可執行的需求規格

## 📝 BDD 的核心：User Story

### 標準格式
```gherkin
As a [角色]
I want [功能]
So that [價值]
```

### 實例
```gherkin
As a 學習者
I want 查看我的學習進度
So that 我能了解自己的成長並規劃下一步
```

## 🔄 BDD 工作流程

### 1. 發現 (Discovery)
與產品、設計、開發共同討論：
- 這個功能解決什麼問題？
- 用戶會如何使用？
- 有哪些邊界情況？

### 2. 定義 (Definition)
使用 Gherkin 語法寫驗收標準：

```gherkin
Feature: 學習進度追蹤

Scenario: 查看各領域完成度
  Given 我是已登入的學習者
  When 我訪問進度頁面
  Then 我應該看到四個 AI 領域
  And 每個領域顯示完成百分比
  And 未開始的領域顯示 0%

Scenario: 記錄完成的能力
  Given 我完成了 "理解 AI 基本概念" 
  When 我標記該能力為完成
  Then 該能力應該顯示勾選狀態
  And 所屬領域的進度應該更新
  And 資料應該保存到本地
```

### 3. 開發 (Development)
從外到內的開發方式：
```typescript
// 1. 寫 E2E 測試（紅燈）
test('displays learning progress', async ({ page }) => {
  await page.goto('/progress')
  await expect(page.locator('.domain-card')).toHaveCount(4)
})

// 2. 寫整合測試（紅燈）
test('calculates domain completion', () => {
  const domain = { competencies: [...], completed: [...] }
  expect(calculateProgress(domain)).toBe(25)
})

// 3. 寫單元測試（紅燈）→ 實作（綠燈）→ 重構
```

## 🎭 BDD vs TDD

| 層面 | BDD | TDD |
|------|-----|-----|
| 關注點 | 行為和需求 | 功能和設計 |
| 語言 | 業務語言 | 技術語言 |
| 參與者 | 全團隊 | 開發者 |
| 測試層級 | 由外而內 | 由內而外 |

## 💡 實踐技巧

### DO ✅
- 使用業務語言，避免技術術語
- 專注於"什麼"而非"如何"
- 每個場景獨立可執行
- 保持場景簡單明確

### DON'T ❌
- 不要在場景中描述實作細節
- 不要寫過於複雜的場景
- 不要混合多個功能在一個場景
- 不要忽略負面場景

## 🛠️ BDD 工具鏈

### Gherkin 語法
```gherkin
Given [前置條件]
When [執行動作]
Then [預期結果]
And [額外條件]
But [例外情況]
```

### 測試框架
- **Jest** + **Testing Library** - 單元/整合測試
- **Playwright** - E2E 測試，支援 BDD 風格
- **Cucumber.js** - 純 BDD 框架（選用）

### 實作範例
```typescript
// progress.feature.ts
describe('Feature: Learning Progress', () => {
  describe('Scenario: View domain completion', () => {
    it('should display four AI domains with percentages', async () => {
      // Given
      const user = await loginAs('learner@example.com')
      
      // When
      const { getByTestId } = render(<ProgressPage user={user} />)
      
      // Then
      expect(getByTestId('domain-engaging')).toHaveTextContent('25%')
      expect(getByTestId('domain-creating')).toHaveTextContent('0%')
    })
  })
})
```

## 📊 BDD 在 AI Square 的應用

### 1. Epic 層級
```gherkin
Epic: AI 素養學習平台
  Feature: 認證系統
  Feature: 進度追蹤
  Feature: 智能推薦
```

### 2. Feature 層級
每個功能都從 User Story 開始，定義清晰的驗收標準。

### 3. 開發流程整合
```
BDD (需求) → TDD (實作) → 部署
```

## 🔗 相關資源

- [TDD 實踐指南](./tdd-guide.md)
- [User Story 範本](../product/epics/)
- [測試策略 ADR](../../decisions/ADR-002-test-strategy.md)

---

記住：**BDD 是關於溝通和理解，不只是測試！**