# ADR-006: 智能提交規則與自動文檔補齊

**日期**: 2025-06-23  
**狀態**: 已接受  
**決策者**: Human + Claude

## 背景

用戶提出的核心需求：
> "檢查變更，安排commit 跟文件，適合放在一起的就一起 commit，不要一次全部
> 把這個用合理的敘述放到規則中，以後我只要打 commit 就會先做check，可以寫的文件就補齊，然後就 commit 建立"

這需要建立一套智能的提交分組和自動文檔生成規則。

## 決策

### 1. 智能提交分組策略

檔案按邏輯關聯性分組提交，而非一次提交全部：

#### 分組優先級
1. **核心系統** (最高優先級)
   - `docs/scripts/`, `Makefile`, `CLAUDE.md`, `.gitignore`
   - 影響開發流程的基礎設施

2. **功能代碼**
   - 前端代碼: `frontend/src/`
   - 後端代碼: `backend/`  
   - 按功能模組分組

3. **測試代碼**
   - 與對應功能代碼分開提交
   - 確保測試獨立性

4. **配置檔案**
   - `package.json`, 各種 config 檔案
   - 避免與功能代碼混合

5. **文檔更新**
   - 手動撰寫的文檔
   - 與代碼變更分開

6. **自動生成內容** (最低優先級)
   - `docs/dev-logs/`, `docs/stories/`
   - 系統自動產生的檔案

### 2. 自動文檔補齊規則

#### 觸發條件
- 檢測到代碼變更 (`.py`, `.ts`, `.tsx`, `.js`, `.jsx`)
- 今日尚無開發日誌
- 重要系統變更

#### 自動生成內容
1. **開發日誌** (`docs/dev-logs/`)
   - 基於 commit 內容自動生成
   - 包含時間估算和變更分析

2. **開發故事** (`docs/stories/`)
   - 根據變更規模和重要性決定
   - 記錄開發過程和學習

3. **決策記錄** (`docs/decisions/`)
   - 檢測到重要架構變更時提示

### 3. 提交流程優化

#### 標準流程
```bash
git add .
git commit -m "訊息"  # 自動觸發檢查和文檔生成
```

#### 智能輔助
```bash
make analyze         # 分析變更並建議分組
make commit-auto     # 自動提交（非交互式）
make commit-smart    # 智能提交（交互式）
```

## 實現細節

### 1. Pre-commit Hook
- 執行品質檢查（ESLint, TypeScript）
- 預先分析變更並提醒分組建議
- 自動補齊必要文檔

### 2. Post-commit Hook  
- 自動生成開發日誌
- 根據條件生成故事
- 執行反思分析

### 3. 智能分析器
- 檔案分類邏輯
- 提交分組建議
- 文檔缺口檢測

## 影響

### 正面影響
- 🚀 **提升效率**: 減少手動文檔工作
- 📝 **完整記錄**: 確保每次開發都有文檔
- 🎯 **邏輯清晰**: 合理的提交分組
- 🤖 **智能化**: 自動化重複性工作

### 可能挑戰
- 需要適應新的工作流程
- 自動分組可能需要手動調整
- 生成的文檔品質需要持續優化

## 使用範例

### 場景 1: 開發新功能
```bash
# 1. 寫代碼
# 2. 自動分析
make analyze

# 3. 按建議分組提交
git add docs/scripts/new-feature.py Makefile
git commit -m "feat(core): add new feature system"

git add frontend/src/components/NewFeature.tsx
git commit -m "feat(ui): implement new feature component"
```

### 場景 2: 快速提交
```bash
# 系統自動分組並生成文檔
make commit-auto
```

## 後續行動

- [x] 實現智能分析器
- [x] 更新提交指南
- [x] 整合到 Makefile
- [ ] 收集使用反饋
- [ ] 優化分組邏輯
- [ ] 改進文檔生成品質

## 評估標準

成功指標：
- 提交分組的合理性 > 90%
- 自動生成文檔的有用性 > 80%  
- 開發者滿意度提升
- 文檔遺漏率 < 5%