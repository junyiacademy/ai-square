# 新開發者入門指南

歡迎加入 AI Square 開發團隊！這份指南將幫助你快速上手。

## 🎯 第一天任務清單

### 1. 環境設置 (30分鐘)
```bash
# Clone 專案
git clone [repository-url]
cd ai-square

# 安裝依賴
cd frontend && npm install

# 啟動開發伺服器
make frontend
```

### 2. 閱讀核心文檔 (1小時)
- [ ] **README.md** - 專案概述
- [ ] **CLAUDE.md** - AI 協作知識
- [ ] **docs/PLAYBOOK.md** - 開發流程
- [ ] **docs/quick-reference.md** - 快速參考

### 3. 理解專案架構 (30分鐘)
```
frontend/
├── src/app/          # Next.js 頁面
├── src/components/   # React 組件
├── public/          # 靜態資源
└── __tests__/       # 測試檔案
```

## 📚 學習路徑

### Week 1: 基礎知識
1. **Day 1-2**: 熟悉開發流程
   - 閱讀 PLAYBOOK.md
   - 理解 AI 協作模式
   - 練習使用 make 命令

2. **Day 3-4**: 理解架構決策
   - 閱讀所有 ADR (decisions/)
   - 特別注意 ADR-004 前端架構

3. **Day 5**: 實作第一個功能
   - 選擇一個簡單的 bug 或小功能
   - 完整走過開發流程

### Week 2: 深入技術
1. **TDD 實踐**
   - 閱讀 `tutorials/tdd-guide.md`
   - 練習先寫測試再寫程式碼

2. **前端模式**
   - 閱讀 `tutorials/frontend-patterns.md`
   - 學習組件設計模式

3. **國際化處理**
   - 理解多語言架構
   - 練習添加新的翻譯

## 🛠️ 第一個任務建議

### 選項 1: 修復簡單 Bug
```bash
# 1. 查看 issue 列表
# 2. 選擇標記為 "good first issue" 的項目
# 3. 使用標準開發流程
make dev-start
```

### 選項 2: 改進現有組件
```yaml
# docs/dev-logs/YYYY-MM-DD-refactor-component-name.yml
type: refactor
title: 改進 [組件名稱] 的可讀性
```

### 選項 3: 增加測試覆蓋
- 找出測試覆蓋率低的組件
- 補充單元測試
- 目標提升 5-10% 覆蓋率

## 💡 實用技巧

### AI 協作技巧
1. **明確的指令** - 給 AI 清楚的任務描述
2. **分步執行** - 將大任務拆分成小步驟
3. **驗證輸出** - 始終檢查 AI 生成的程式碼

### 程式碼風格
```typescript
// ✅ Good: 明確的類型
interface UserProps {
  id: string
  name: string
}

// ❌ Bad: 使用 any
interface UserProps {
  data: any
}
```

### Git 提交
```bash
# 使用智能提交
make commit-smart

# 提交訊息格式
feat: 新增功能描述
fix: 修復問題描述
docs: 文檔更新描述
refactor: 重構描述
test: 測試相關更新
```

## 🤝 尋求幫助

### 內部資源
- 查看 `docs/` 下的所有文檔
- 搜尋 `dev-logs/` 中的歷史記錄
- 參考 `decisions/` 中的架構決策

### 常見問題
1. **Q: 如何開始新功能？**
   A: 使用 `make dev-start` 並創建開發日誌

2. **Q: 測試覆蓋率要求？**
   A: 整體 ≥ 80%，核心功能 ≥ 95%

3. **Q: 如何處理需求變更？**
   A: 參考 ADR-003，更新日誌並評估影響

## 📈 進階學習

完成基礎任務後，可以深入學習：
- Google Cloud Platform 部署
- FastAPI 後端開發（Phase 2）
- AI 整合（Gemini API）

---

記住：**不懂就問，犯錯是學習的一部分！**

需要幫助時，參考 [PLAYBOOK](../PLAYBOOK.md) 或查看 [快速參考](../quick-reference.md)。