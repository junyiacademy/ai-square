# 🧪 手動測試指南

修改後的完整功能測試，按優先級排序。

## 🚀 快速開始

```bash
npm run dev
```

瀏覽器打開: `http://localhost:3000`

---

## 📋 測試清單 (按優先級)

### ⭐ 優先級 1: 核心渲染測試

#### 1.1 基本頁面載入
- [ ] 首頁 (`/`) - 檢查是否正常載入，無 JavaScript 錯誤
- [ ] Relations (`/relations`) - 四個 AI 領域正常顯示
- [ ] Assessment (`/assessment`) - 評估問卷正常顯示

#### 1.2 關鍵圖表組件 (重點檢查)
- [ ] **Assessment Results 雷達圖** - 進入 `/assessment`，完成問卷後檢查雷達圖是否正常渲染
- [ ] **Relations 樹狀圖** - `/relations` 頁面的視覺化圖表
- [ ] **KSA 分析圖表** - Assessment 結果頁面的 KSA 分析

---

### ⭐ 優先級 2: 核心功能測試

#### 2.1 PBL 學習流程
```
/pbl → 選擇場景 → 進入學習 → Chat 互動 → 完成任務
```

測試路徑：
- [ ] `/pbl` - 場景列表正常
- [ ] `/pbl/scenarios/[id]` - 場景詳情正常
- [ ] `/pbl/scenarios/[id]/program/[programId]/tasks/[taskId]/learn` - **Chat 功能正常**
- [ ] `/pbl/scenarios/[id]/program/[programId]/complete` - 完成頁面正常

#### 2.2 Assessment 完整流程
- [ ] 開始評估 (`/assessment`)
- [ ] 完成問卷
- [ ] 查看結果頁面 (雷達圖)
- [ ] KSA 分析頁面
- [ ] 儲存結果功能

---

### ⭐ 優先級 3: 用戶體驗測試

#### 3.1 Dashboard 功能
- [ ] `/dashboard` - 用戶儀表板載入
- [ ] 學習進度顯示
- [ ] 歷史記錄查看

#### 3.2 Learning Path 功能  
- [ ] `/learning-path` - 學習路徑頁面
- [ ] 個人化建議顯示
- [ ] 基於評估結果的推薦

#### 3.3 語言切換
- [ ] 中文/英文切換功能
- [ ] 各頁面多語言內容正確

---

## 🔍 重點檢查項目

### 我們修改過的關鍵組件：

#### 1. **Dynamic Imports (圖表載入)**
檢查這些組件是否正常：
- `DynamicRadarChart` (Assessment 結果)
- `DynamicRadar` (雷達圖)
- `DynamicResponsiveContainer` (圖表容器)

**測試方式**: 進入 Assessment 結果頁面，確認雷達圖正常顯示

#### 2. **i18n 優化 (語言載入)**
檢查語言切換是否正常，特別是：
- 動態語言載入
- 快取功能
- 多語言內容顯示

**測試方式**: 切換語言，觀察載入速度和內容正確性

#### 3. **Cache Service (快取功能)**
檢查頁面載入是否有改善：
- 第一次載入 vs 重複載入
- 語言切換速度
- 數據快取功能

---

## 🚨 警告信號

如果看到以下情況，表示可能有問題：

### 🔴 Critical Issues (立即停止，需要修復)
- 任何頁面完全無法載入 (白屏)
- JavaScript 錯誤導致功能停止
- 雷達圖完全無法顯示
- Chat 功能完全無法使用

### 🟡 Warning Issues (記錄但可以繼續)
- 圖表載入稍慢
- Console 警告訊息 (不影響功能)
- 某些語言內容缺失
- TypeScript 編譯警告

---

## 🧑‍💻 開發者檢查

### Browser Console 檢查
按 F12 開啟開發者工具，檢查：
- [ ] Console 沒有紅色錯誤
- [ ] Network 請求都成功 (200 狀態)
- [ ] 沒有 404 資源載入失敗

### 效能檢查
- [ ] 首頁載入時間 < 3 秒
- [ ] 圖表渲染時間 < 2 秒
- [ ] 語言切換時間 < 1 秒

---

## 📝 測試記錄模板

### 測試環境
- 瀏覽器: Chrome/Firefox/Safari
- 日期: 
- 測試人員: 

### 通過的功能 ✅
-

### 發現的問題 ❌
-

### 需要追蹤的問題 📋
-

---

## 🆘 如果發現問題

### 1. 收集資訊
- 截圖錯誤畫面
- 複製 Console 錯誤訊息
- 記錄重現步驟

### 2. 檢查修復
- 檢查相關的 Dynamic Import 設定
- 確認 i18n 配置
- 驗證 Cache Service 設定

### 3. 回報問題
- 描述問題影響範圍
- 提供錯誤詳細資訊
- 建議修復優先級

---

**記住**: 這次修改主要影響圖表渲染、語言載入和快取功能。如果這些核心功能正常，其他功能應該也不會有問題！