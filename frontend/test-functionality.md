# 功能測試清單

修改後需要測試的核心功能，確保沒有破壞現有功能。

## 🔍 手動測試項目

### 1. 基本頁面載入測試
- [ ] 首頁 (/) 正常載入
- [ ] Relations 頁面 (/relations) 正常載入
- [ ] PBL 頁面 (/pbl) 正常載入
- [ ] Assessment 頁面 (/assessment) 正常載入
- [ ] Dashboard 頁面 (/dashboard) 正常載入
- [ ] Learning Path 頁面 (/learning-path) 正常載入

### 2. Relations 功能測試
- [ ] 四個 AI Literacy 領域能正確顯示
- [ ] 點擊領域能展開/收合 competencies
- [ ] 多語言切換功能正常
- [ ] 樹狀圖表能正確渲染

### 3. PBL 功能測試
- [ ] PBL 場景列表能正常載入
- [ ] 點擊場景能進入詳細頁面
- [ ] 任務詳情頁面能正常顯示
- [ ] 進入學習頁面 (/pbl/scenarios/[id]/program/[programId]/tasks/[taskId]/learn)
- [ ] AI Chat 聊天功能正常運作
- [ ] 聊天介面響應正常
- [ ] 任務評估功能正常
- [ ] 完成頁面 (/pbl/scenarios/[id]/program/[programId]/complete) 正常顯示

### 4. Assessment 功能測試
- [ ] 評估問卷能正常顯示
- [ ] 問題選項能正常選擇
- [ ] 評估結果頁面能正常顯示
- [ ] 雷達圖 (RadarChart) 能正確渲染
- [ ] KSA 分析頁面正常顯示
- [ ] KSA 診斷報告正常生成
- [ ] 結果保存功能正常
- [ ] 重新測驗功能正常

### 5. KSA 功能測試
- [ ] KSA 能力圖譜正常顯示
- [ ] Knowledge (知識) 區塊正常
- [ ] Skills (技能) 區塊正常  
- [ ] Attitudes (態度) 區塊正常
- [ ] KSA 診斷報告生成功能
- [ ] 個人化建議正常顯示

### 6. Dashboard 功能測試
- [ ] 用戶儀表板正常載入
- [ ] 學習進度顯示正常
- [ ] 評估歷史記錄正常
- [ ] PBL 完成狀況正常顯示
- [ ] 統計圖表正常渲染

### 7. Learning Path 功能測試
- [ ] 學習路徑頁面正常載入
- [ ] 個人化學習建議正常顯示
- [ ] 基於評估結果的路徑推薦
- [ ] 學習資源連結正常
- [ ] 進度追蹤功能正常

### 8. Chat 功能測試 (PBL 內的 AI 聊天)
- [ ] 聊天介面正常載入
- [ ] 發送訊息功能正常
- [ ] AI 回應正常
- [ ] 訊息歷史保存正常
- [ ] 多語言聊天支援
- [ ] 聊天記錄與任務進度同步

### 5. 國際化 (i18n) 測試
- [ ] 語言切換功能正常
- [ ] 各語言內容正確顯示
- [ ] 動態載入語言包功能正常

## 🚀 自動化測試

### 運行現有測試
```bash
# 運行單元測試
npm run test:ci

# 運行 E2E 測試
npm run test:e2e
```

### 檢查 TypeScript 編譯
```bash
# 檢查 TypeScript 編譯無錯誤
npm run typecheck
```

### 檢查 ESLint
```bash
# 檢查代碼品質
npm run lint
```

## 🔧 功能驗證 API 測試

可以用以下 curl 命令測試關鍵 API：

### Relations API
```bash
curl "http://localhost:3001/api/relations?lang=zh-TW"
```

### PBL Scenarios API
```bash
curl "http://localhost:3001/api/pbl/scenarios"
```

### PBL Chat API
```bash
curl -X POST "http://localhost:3001/api/pbl/chat" \
  -H "Content-Type: application/json" \
  -d '{"conversations":[{"type":"user","content":"測試"}],"currentTask":{"id":"test"}}'
```

## 📊 性能測試

### 確認優化效果
- [ ] 首頁載入速度沒有變慢
- [ ] PBL 頁面載入速度有改善
- [ ] 記憶體使用沒有增加
- [ ] 快取功能正常運作

## 🐛 錯誤監控

### 檢查 Console 錯誤
- [ ] 瀏覽器 Console 沒有新的錯誤
- [ ] Network 請求都成功
- [ ] 沒有 TypeScript 編譯警告

## 📱 響應式設計測試

- [ ] 手機版面正常顯示
- [ ] 平板版面正常顯示
- [ ] 桌面版面正常顯示

---

## 測試結果記錄

測試日期：
測試人員：
測試環境：

### 通過的測試
- 

### 失敗的測試
- 

### 需要修復的問題
- 

### 備註
- 