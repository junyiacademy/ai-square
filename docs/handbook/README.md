# 開發者手冊 (Developer Handbook)

為 AI 和開發者提供的技術參考文檔。

## 📁 新的組織結構

### core-practices/ - 核心開發實踐
**AI 高頻使用**，每次開發都要遵循的方法：
- `tdd.md` - 測試驅動開發
- `bdd.md` - 行為驅動開發  
- `git-workflow.md` - Git 工作流程

### design-patterns/ - 設計模式
**AI 參考使用**，特定情況下查閱的模式：
- `ddd/` - 領域驅動設計
- `frontend/` - 前端架構模式
- `architecture/` - 系統架構設計

### product/ - 產品規格
**理解業務**，產品願景和功能規劃：
- 產品願景
- Epic 定義
- 用戶畫像

### guides/ - 操作指南
**人類導向**，幫助開發者的指南：
- 新人入門
- 文檔生成
- 故障排除

### improvements/ - 改進建議 🆕
**自動生成**，持續優化的建議：
- 每次提交後的反思分析
- 問題模式和改進方案
- AI 提示詞優化建議
- 流程改進追蹤

## 🤖 為什麼這樣組織？

### AI 使用頻率
1. **每次都用** → core-practices/
2. **需要時查** → design-patterns/
3. **偶爾參考** → product/
4. **人類為主** → guides/

### 一致性原則
- BDD、TDD、DDD 都是方法論，但使用頻率不同
- TDD/BDD 是每日實踐，DDD 是架構設計時才用
- 按使用頻率而非概念類型分組，更符合 AI 工作模式

## 📖 使用指南

### AI 開發時
```
1. 先查 core-practices/ - 遵循 TDD/BDD
2. 遇到設計問題查 design-patterns/
3. 不確定需求查 product/
```

### 人類學習時
```
1. 新人從 guides/onboarding.md 開始
2. 想看案例去 stories/
3. 深入技術看 design-patterns/
```

---

💡 記住：文檔組織要服務於使用場景，而非概念分類。