# Feature: 多語言切換系統

## 📋 功能概述

**Feature ID**: I18N-002  
**Epic**: AI-Literacy (AIL-001)  
**優先級**: 高  
**狀態**: ✅ 已完成 (v1.0)

## 🎯 功能目標

提供流暢的多語言切換體驗，支援全球用戶使用母語學習 AI 素養。

## 👥 用戶角色

### 主要使用者
- **國際學習者**: 需要母語介面的海外用戶
- **多語言教育者**: 需要展示不同語言版本的老師
- **企業培訓者**: 管理多國員工的 HR 主管

## 📝 用戶故事

### 核心用戶故事
```
As an international learner
I want to switch the interface to my native language
So that I can better understand AI literacy concepts

Acceptance Criteria:
- 語言切換後，所有 UI 元素即時更新
- 用戶語言偏好被自動保存
- 重新訪問時記住上次選擇的語言
```

### 詳細用戶故事

#### 故事 1: 首次訪問語言偵測
```
As a first-time visitor
I want the system to detect my preferred language
So that I see content in a familiar language immediately

Acceptance Criteria:
- 根據瀏覽器語言自動選擇介面語言
- 支援的語言直接切換，不支援的語言顯示英文
- 顯示語言選擇提示讓用戶確認或修改
```

#### 故事 2: 手動語言切換
```
As a user
I want to manually change the interface language
So that I can use the language I'm most comfortable with

Acceptance Criteria:
- 語言選擇器易於找到和使用
- 切換後即時更新所有文字內容
- 語言選項以該語言的原生名稱顯示
```

#### 故事 3: 語言偏好持久化
```
As a returning user  
I want my language preference to be remembered
So that I don't need to change language settings every time

Acceptance Criteria:
- 語言偏好保存在 localStorage
- 跨瀏覽器會話保持一致
- 清除瀏覽器資料後重新偵測語言
```

## 🌍 支援語言

### 完整支援語言 (9種)
| 語言代碼 | 語言名稱 | 原生名稱 | 狀態 |
|---------|---------|---------|------|
| en | English | English | ✅ 完成 |
| zh-TW | Traditional Chinese | 繁體中文 | ✅ 完成 |
| es | Spanish | Español | ✅ 完成 |
| ja | Japanese | 日本語 | ✅ 完成 |
| ko | Korean | 한국어 | ✅ 完成 |
| fr | French | Français | ✅ 完成 |
| de | German | Deutsch | ✅ 完成 |
| ru | Russian | Русский | ✅ 完成 |
| it | Italian | Italiano | ✅ 完成 |

## 🔧 技術實作

### 架構設計
```
react-i18next (客戶端)
├── 翻譯檔案: /public/locales/{lang}/relations.json
├── 語言偵測: navigator.language + localStorage
├── 動態載入: 按需載入翻譯資源
└── 持久化: localStorage + API 同步
```

### 資料結構
```typescript
// 翻譯檔案格式
interface TranslationFile {
  pageTitle: string
  pageSubtitle: string
  // UI 元素翻譯
  overview: string
  competency: string
  knowledge: string
  skills: string
  attitudes: string
  // 領域名稱翻譯
  Engaging_with_AI: string
  Creating_with_AI: string
  Managing_with_AI: string
  Designing_with_AI: string
  // 主題翻譯
  [key: string]: string
}
```

### API 整合
```typescript
// YAML 內容多語言支援
interface CompetencyContent {
  description: string
  description_zh?: string
  description_es?: string
  // ... 其他語言
  content: string
  content_zh?: string
  // ... 其他語言
}

// API 回應動態翻譯
GET /api/relations?lang=zh-TW
```

## 🎨 使用者介面

### 語言選擇器設計
```jsx
<select 
  value={currentLanguage}
  onChange={handleLanguageChange}
  className="language-selector"
>
  <option value="en">English</option>
  <option value="zh-TW">繁體中文</option>
  <option value="es">Español</option>
  {/* ... 其他語言 */}
</select>
```

### 位置與視覺設計
- **位置**: 頁面右上角，易於發現
- **樣式**: 與整體設計一致的下拉選單
- **回饋**: 切換時顯示載入狀態
- **無障礙**: 支援鍵盤導航和螢幕閱讀器

## ✅ 驗收標準

### Scenario 1: 自動語言偵測
```gherkin
Feature: 自動語言偵測

Scenario: 首次訪問自動偵測
  Given 用戶首次訪問 /relations 頁面
  And 瀏覽器語言設定為 "zh-TW"
  When 頁面載入完成
  Then 介面應該顯示繁體中文
  And 語言選擇器應該選中 "繁體中文"

Scenario: 不支援語言降級
  Given 用戶瀏覽器語言設定為 "th" (泰文)
  When 訪問頁面
  Then 介面應該顯示英文 (預設語言)
  And 語言選擇器應該選中 "English"
```

### Scenario 2: 手動語言切換
```gherkin
Feature: 手動語言切換

Scenario: 下拉選單切換語言
  Given 用戶在 /relations 頁面
  And 當前語言為英文
  When 用戶點擊語言選擇器
  And 選擇 "日本語"
  Then 所有文字內容應該立即更新為日文
  And 頁面 URL 保持不變
  And localStorage 應該保存 "ja" 設定

Scenario: 切換後內容同步
  Given 用戶切換語言為韓文
  When 展開任一領域手風琴
  Then 領域概述應該顯示韓文內容
  And KSA 詳細說明應該顯示韓文
```

### Scenario 3: 語言偏好持久化
```gherkin
Feature: 語言偏好持久化

Scenario: 跨會話語言記憶
  Given 用戶設定語言為德文
  And 關閉瀏覽器
  When 重新開啟並訪問頁面
  Then 介面應該自動顯示德文
  And 不需要重新選擇語言

Scenario: localStorage 清除後重偵測
  Given 用戶清除瀏覽器 localStorage
  When 重新訪問頁面
  Then 系統應該重新偵測瀏覽器語言
  And 設定對應的介面語言
```

## 📊 效能要求

### 載入效能
- 語言切換響應時間 < 500ms
- 翻譯資源載入時間 < 1s
- 不影響首次頁面載入速度

### 資源最佳化
- JSON 翻譯檔案壓縮
- 按需載入語言包
- 瀏覽器快取翻譯資源

## 🐛 已知限制

### 當前限制
1. **部分內容未翻譯**: 某些 YAML 欄位可能缺少特定語言版本
2. **文字長度差異**: 不同語言文字長度可能影響 UI 排版
3. **文化適應性**: 部分範例可能需要在地化調整

### 改善計劃
1. **翻譯完整性檢查**: 自動化工具檢測缺失翻譯
2. **響應式設計**: 適應不同語言的文字長度
3. **在地化內容**: 針對不同地區提供文化相關範例

## 📈 成功指標

### 使用指標
- 非英語用戶比例 > 40%
- 語言切換使用率 > 25%
- 各語言停留時間相當

### 品質指標
- 翻譯錯誤回報 < 1%
- 語言切換成功率 > 99%
- 用戶語言偏好準確性 > 95%

## 📅 更新記錄

### [2025-06-22] - 登入系統國際化完善

#### Added
- 登入認證系統完整多語言支援
- 5 種新語言的 auth.json 翻譯檔案：
  - 德文 (de): Deutsch
  - 法文 (fr): Français  
  - 義大利文 (it): Italiano
  - 韓文 (ko): 한국어
  - 俄文 (ru): Русский
- 統一的認證相關翻譯鍵值結構 (17 個鍵值)

#### Changed
- 首頁和登入頁面消除所有硬編碼文字
- 所有支援語言的登入體驗完全一致
- 更新現有 4 種語言的 auth.json 翻譯內容

#### Fixed
- 修正翻譯檔案不完整的問題 (從 4/9 提升到 9/9)
- 修正不同語言間登入功能差異的問題
- 確保所有語言的翻譯鍵值結構一致

#### Technical Details
- 新增翻譯檔案：5 個
- 更新翻譯檔案：4 個
- 代碼國際化：2 個檔案
- 翻譯完整度：100% (9/9 種語言)

---

> **實作狀態**: 基礎功能已完成，持續改善中  
> **負責團隊**: Frontend Team + I18N Team  
> **最後更新**: 2025-06-22 登入系統國際化完善

### 2025-06-22 - 語言選擇器統一整合

**變更摘要**: 將語言選擇器從 Relations 頁面移動到全域 Header 組件

**技術改進**:
- 創建統一的 `LanguageSelector` 組件 (`frontend/src/components/ui/LanguageSelector.tsx`)
- 整合到 `Header` 組件中，所有頁面共享
- 使用事件驅動架構 (`language-changed` 事件) 實現頁面間語言狀態同步
- 完善 i18n 配置，為所有 9 種語言提供完整的翻譯資源

**用戶體驗提升**:
- 語言選擇器在所有頁面都可見和可用
- 統一的視覺設計和互動行為
- 更直觀的語言切換流程

**程式碼品質**:
- 移除重複的語言選擇邏輯
- 統一的 i18n 系統配置
- 完整的 TypeScript 型別支援
- 通過所有 ESLint 檢查

**測試狀態**: ✅ 建置成功，待 UI 功能測試