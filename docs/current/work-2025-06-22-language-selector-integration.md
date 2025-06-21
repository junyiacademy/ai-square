# 語言選擇器整合到 Header - 工作日誌

**日期**: 2025-06-22  
**功能**: 統一語言選擇器到 Header 組件  
**狀態**: ✅ 完成

## 問題分析

### 原始狀況
- Relations 頁面有自己的語言選擇器（右上角下拉選單）
- 首頁使用 react-i18next 但沒有語言選擇器
- 兩個頁面的 i18n 系統不統一
- 用戶體驗不一致

### 用戶需求
- 希望在右上角 Header 中有統一的語言選擇器
- 所有頁面都能使用相同的語言切換機制
- 與首頁的 i18n 系統保持一致

## 技術實作

### 1. 創建統一的語言選擇器組件

**檔案**: `frontend/src/components/ui/LanguageSelector.tsx`

**功能特點**:
- 支援 9 種語言：英文、繁體中文、西班牙文、日文、韓文、法文、德文、俄文、義大利文
- 使用 `react-i18next` 的 `useTranslation` hook
- 自動從 `localStorage` 讀取和儲存用戶語言偏好
- 觸發自定義事件 `language-changed` 通知其他組件
- 美觀的下拉選單設計，支援 hover 效果

**核心邏輯**:
```typescript
const handleLanguageChange = (lng: string) => {
  i18n.changeLanguage(lng)
  setCurrentLang(lng)
  // 儲存用戶語言偏好
  if (typeof window !== 'undefined') {
    localStorage.setItem('ai-square-language', lng)
  }
  // 觸發自定義事件通知其他組件語言已改變
  window.dispatchEvent(new CustomEvent('language-changed', { detail: { language: lng } }))
}
```

### 2. 整合到 Header 組件

**檔案**: `frontend/src/components/layout/Header.tsx`

**變更**:
- 導入 `LanguageSelector` 組件
- 將語言選擇器放置在導航區域的最左側
- 與登入/登出按鈕並排顯示

**位置設計**:
```
Header Layout: [Logo] -------- [語言選擇器] [用戶資訊/登入按鈕]
```

### 3. 更新 i18n 配置

**檔案**: `frontend/src/i18n.ts`

**改進**:
- 為所有 9 種語言添加完整的 `auth.json` 翻譯資源
- 移除 "暫時使用英文" 的註解，使用對應語言的翻譯檔案
- 確保 relations 和 auth 命名空間都有完整支援

**資源配置**:
```typescript
resources: {
  'zh-TW': { relations: zhTWRelations, auth: zhTWAuth },
  en: { relations: enRelations, auth: enAuth },
  es: { relations: esRelations, auth: esAuth },
  ja: { relations: jaRelations, auth: jaAuth },
  ko: { relations: koRelations, auth: koAuth },
  fr: { relations: frRelations, auth: frAuth },
  de: { relations: deRelations, auth: deAuth },
  ru: { relations: ruRelations, auth: ruAuth },
  it: { relations: itRelations, auth: itAuth },
}
```

### 4. 更新 Relations 頁面

**檔案**: `frontend/src/app/relations/page.tsx`

**重構內容**:
- 移除內建的語言選擇器下拉選單
- 添加監聽 `language-changed` 事件的邏輯
- 保持與 Header 語言選擇器的同步
- 清理未使用的 `handleLangChange` 函數和 `languages` 陣列

**事件監聽機制**:
```typescript
useEffect(() => {
  const handleLanguageChange = (event: CustomEvent) => {
    const newLang = event.detail.language;
    setLang(newLang);
  };

  window.addEventListener('language-changed', handleLanguageChange as EventListener);
  return () => {
    window.removeEventListener('language-changed', handleLanguageChange as EventListener);
  };
}, []);
```

### 5. 確保首頁 i18n 支援

**檔案**: `frontend/src/app/page.tsx`

**變更**:
- 添加 `import '@/i18n'` 確保使用統一的 i18n 系統
- 與 Relations 頁面使用相同的 react-i18next 配置

## 技術架構

### 語言狀態管理流程

1. **初始化**: 
   - 從 `localStorage` 讀取用戶偏好語言
   - 如果沒有偏好，使用瀏覽器語言檢測
   - 默認回退到英文

2. **語言切換**:
   - 用戶在 Header 選擇新語言
   - `LanguageSelector` 更新 `i18n.language`
   - 儲存到 `localStorage`
   - 觸發 `language-changed` 事件

3. **頁面同步**:
   - Relations 頁面監聽事件，更新內部 `lang` 狀態
   - 觸發 `fetchTree(newLang)` 重新載入對應語言的資料
   - 所有翻譯文字自動更新

### 事件驅動架構

```
Header LanguageSelector 
    ↓ (語言變更)
CustomEvent('language-changed')
    ↓ (廣播)
Relations Page (監聽) → 更新 lang state → 重新 fetch 資料
```

## 測試結果

### 建置測試
- ✅ `npm run build` 成功
- ✅ 無 TypeScript 錯誤
- ✅ 無 ESLint 錯誤
- ✅ 所有頁面正常編譯

### 功能測試項目
- [ ] Header 語言選擇器顯示正常
- [ ] 9 種語言選項都可選擇
- [ ] 語言切換後首頁文字正確更新
- [ ] 語言切換後 Relations 頁面資料重新載入
- [ ] 語言偏好正確儲存到 localStorage
- [ ] 頁面重新整理後語言偏好保持
- [ ] 不同頁面間切換語言狀態同步

## 程式碼品質

### ESLint 修正
- 移除未使用的 `handleLangChange` 函數
- 移除未使用的 `languages` 陣列
- 移除未使用的 `displayName` 變數
- 移除未使用的 `currentLanguage` 變數

### TypeScript 支援
- 所有組件都有完整的型別定義
- CustomEvent 正確型別轉換
- i18n hooks 正確使用

## 用戶體驗改善

### 統一性
- 所有頁面都有一致的語言選擇器位置
- 統一的視覺設計和互動行為
- 一致的語言偏好儲存機制

### 便利性
- 語言選擇器始終可見（在 Header 中）
- 不需要進入特定頁面才能切換語言
- 自動記憶用戶語言偏好

## 後續改進建議

1. **可訪問性**: 為語言選擇器添加更完整的 ARIA 標籤
2. **視覺回饋**: 語言切換時可添加載入指示器
3. **錯誤處理**: 添加語言載入失敗的錯誤處理機制
4. **效能優化**: 考慮語言資源的懶載入

## 學習筆記

### React i18n 最佳實踐
- 使用統一的 i18n 配置檔案
- 通過事件系統實現組件間語言狀態同步
- localStorage 與瀏覽器語言檢測的結合使用

### 組件設計模式
- 將語言選擇器抽取為可重用組件
- 使用自定義事件實現鬆耦合的組件通信
- 統一的狀態管理避免重複邏輯

---

**完成時間**: 2025-06-22  
**建置狀態**: ✅ 成功  
**下一步**: 需要實際測試用戶介面功能 