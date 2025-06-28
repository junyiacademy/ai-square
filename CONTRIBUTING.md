# 貢獻指南

感謝您對 AI Square 的貢獻興趣！本文件說明如何參與專案開發。

## 🚀 快速開始

### 1. Fork 專案
點擊 GitHub 頁面右上角的 "Fork" 按鈕。

### 2. Clone 你的 Fork
```bash
git clone https://github.com/YOUR_USERNAME/ai-square.git
cd ai-square
```

### 3. 設定開發環境
```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd ../backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 4. 創建功能分支
```bash
git checkout -b feature/your-feature-name
```

## 📋 開發流程

我們使用簡化的 AI 友善開發流程：

### 1. 開始新工作
```bash
make ai-new TYPE=feature TICKET=your-feature
```

### 2. 開發過程中
- 遵循現有的程式碼風格
- 為新功能撰寫測試
- 定期執行 `make ai-save` 保存進度

### 3. 提交前檢查
```bash
# 執行測試
npm run test

# 檢查程式碼品質
npm run lint

# 驗證內容（如果修改 YAML 檔案）
npm run validate
```

### 4. 完成工作
```bash
make ai-done
```

## 🧪 測試要求

### 單元測試
- 所有新功能必須包含測試
- 維持或提高測試覆蓋率
- 使用 Jest 進行前端測試

### E2E 測試
- 重要使用者流程需要 E2E 測試
- 使用 Playwright 進行瀏覽器測試
- 測試需支援多瀏覽器

### 內容驗證
- 修改 YAML 內容檔案時必須執行驗證
- 確保 KSA 代碼引用正確
- 檢查多語言欄位完整性

## 📝 程式碼風格

### TypeScript/JavaScript
- 使用 TypeScript 進行型別檢查
- 遵循 ESLint 規則
- 使用 Prettier 格式化程式碼

### Python
- 遵循 PEP 8 規範
- 使用 Ruff 進行程式碼檢查
- 適當的型別註解

### 提交訊息
遵循 Conventional Commits 格式：
```
type(scope): description

[optional body]

[optional footer]
```

類型：
- `feat`: 新功能
- `fix`: 修復錯誤
- `docs`: 文件更新
- `style`: 格式調整
- `refactor`: 重構
- `test`: 測試相關
- `chore`: 維護工作

## 🌐 內容貢獻

### YAML 檔案編輯
1. 使用 UTF-8 編碼
2. 保持一致的縮排（2 空格）
3. 為所有支援的語言提供翻譯
4. 執行內容驗證確保正確性

### 翻譯指南
- 保持術語一致性
- 考慮文化適應性
- 使用專業且易懂的語言
- 參考現有翻譯風格

## 🔄 Pull Request 流程

1. **選擇適當的 PR 模板**
   - feature.md - 新功能
   - bugfix.md - 錯誤修復
   - content.md - 內容更新
   - refactor.md - 程式碼重構
   - docs.md - 文件更新

2. **填寫 PR 資訊**
   - 清楚描述變更內容
   - 連結相關 Issue
   - 提供測試證明

3. **等待審查**
   - 回應審查意見
   - 進行必要的修改
   - 保持 PR 更新

4. **合併條件**
   - 通過所有 CI 檢查
   - 獲得至少一位維護者同意
   - 解決所有討論

## 🚨 回報問題

### Bug 回報
使用 Bug Report 模板，包含：
- 詳細的重現步驟
- 預期與實際行為
- 環境資訊
- 錯誤訊息或截圖

### 功能建議
使用 Feature Request 模板，說明：
- 功能描述
- 使用案例
- 可能的實作方式

### 內容問題
使用 Content Issue 模板，提供：
- 問題位置
- 建議修正
- 參考資料

## 💡 最佳實踐

### DO ✅
- 保持程式碼簡潔清晰
- 撰寫自我說明的程式碼
- 適當處理錯誤
- 考慮效能影響
- 遵循安全最佳實踐

### DON'T ❌
- 提交包含敏感資訊的程式碼
- 留下 console.log 或 debug 程式碼
- 忽略測試失敗
- 引入不必要的依賴
- 破壞現有功能

## 🤝 社群準則

- 尊重所有貢獻者
- 提供建設性的回饋
- 協助新手參與
- 保持專業態度
- 慶祝成就

## 📞 聯絡方式

- **GitHub Issues**: 技術問題和功能建議
- **GitHub Discussions**: 一般討論和問答
- **Email**: 私密事項請寄信至 [維護者信箱]

## 🙏 致謝

感謝所有貢獻者讓 AI Square 變得更好！您的參與對我們非常重要。

---

**注意**: 本專案使用 Claude Code 輔助開發。使用 AI 生成的程式碼時，請確保理解並測試所有變更。