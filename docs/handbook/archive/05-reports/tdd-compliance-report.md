# TDD 合規檢查報告

**生成時間**: 2025-06-24T13:21:10.963164

## 📊 整體統計

- **合規分數**: 11.43/100
- **測試覆蓋率**: 0%
- **有測試文件的比例**: 28.57%
- **總源文件數**: 14
- **有測試的文件數**: 4

## 🚨 問題總覽

- **錯誤**: 10 個
- **警告**: 0 個

## 📋 詳細問題

### 🚨 low_coverage

**訊息**: 測試覆蓋率 0% 低於最低要求 80%

### 🚨 missing_test

**訊息**: 重要文件缺少測試: src/app/layout.tsx

### 🚨 missing_test

**訊息**: 重要文件缺少測試: src/app/page.tsx

### 🚨 missing_test

**訊息**: 重要文件缺少測試: src/app/relations/page.tsx

### 🚨 missing_test

**訊息**: 重要文件缺少測試: src/app/login/page.tsx

### 🚨 missing_test

**訊息**: 重要文件缺少測試: src/components/ui/LanguageSelector.tsx

### 🚨 missing_test

**訊息**: 重要文件缺少測試: src/components/ui/ResponsiveTitle.tsx

### 🚨 missing_test

**訊息**: 重要文件缺少測試: src/components/layout/ClientLayout.tsx

### 🚨 missing_test

**訊息**: 重要文件缺少測試: src/app/api/relations/route.ts

### 🚨 missing_test

**訊息**: 重要文件缺少測試: src/app/api/auth/login/route.ts

## 💡 改進建議

### 提升測試覆蓋率
- 為缺少測試的重要文件添加測試
- 確保新功能都先寫測試
- 定期檢查和提升測試品質

### 遵循 TDD 流程
1. 🔴 **Red**: 先寫失敗的測試
2. 🟢 **Green**: 寫最小代碼讓測試通過
3. 🔵 **Refactor**: 重構優化代碼

### 工具和流程
- 使用 `make dev-commit` 確保提交前檢查
- 設置 IDE 插件提醒 TDD 流程
- 定期進行 TDD 培訓和 Code Review

---

*此報告由 TDD 合規檢查器自動生成*
