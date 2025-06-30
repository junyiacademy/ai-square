# AI Square CMS

這是 AI Square 專案的內容管理系統 (CMS)，使用 LLM 驅動的智能編輯介面。

## 特色功能

### 🤖 AI 輔助編輯
- **LLM 驅動的 YAML 編輯器**：左側編輯 YAML，右側 AI 助手引導填寫
- **智能內容生成**：AI 可以幫助生成學習任務、描述、評估標準等
- **自動多語言翻譯**：支援 9 種語言的一鍵翻譯
- **即時驗證**：YAML 格式和 schema 驗證，確保內容符合規範
- **視覺化差異比較**：顯示 AI 修改前後的差異，紅綠標示變更

### 📝 GitHub 整合
- 直接連接 GitHub repository
- Pull Request 工作流程
- 版本控制和歷史記錄

## 開發指令

```bash
# 開發伺服器 (Port 3001)
npm run dev

# 建置
npm run build

# 執行建置版本
npm run start
```

## 環境設定

創建 `.env.local` 檔案：

```env
# GitHub 設定
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_OWNER=junyiacademy
GITHUB_REPO=ai-square
GITHUB_CONTENT_PATH=cms/content

# Google Cloud 設定 (for Vertex AI)
GOOGLE_CLOUD_PROJECT=your_project_id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
VERTEX_AI_LOCATION=us-central1
```

## AI 編輯器使用說明

1. **開始編輯**
   - 進入 PBL 情境編輯頁面
   - 左側顯示 YAML 編輯器，右側為 AI 助手

2. **與 AI 互動**
   - 直接告訴 AI 您的需求，例如：
     - "幫我填寫情境標題和描述"
     - "將所有內容翻譯成其他語言"
     - "幫我設計 3 個學習任務"
     - "優化情境描述，讓它更吸引人"

3. **AI 功能**
   - **填寫缺失欄位**：AI 會檢查並提示缺少的必要欄位
   - **智能翻譯**：自動處理多語言欄位（使用 _zh, _es 等後綴）
   - **內容優化**：改善描述、學習目標等內容品質
   - **Schema 驗證**：確保生成的內容符合 PBL 情境規範

4. **查看變更**
   - AI 修改後會顯示 YAML 差異
   - 紅色表示刪除，綠色表示新增
   - 可以隨時在編輯器中手動調整

5. **儲存變更**
   - 確認內容無誤後，點擊 "Create PR" 建立 Pull Request
   - 填寫 PR 標題和描述，提交審核

## 架構說明

- **技術棧**：Next.js 14 + TypeScript + Tailwind CSS
- **AI 整合**：Google Vertex AI (Gemini 1.5 Flash)
- **編輯器**：Monaco Editor (VS Code 編輯器核心)
- **UI 元件**：Radix UI + shadcn/ui

## 注意事項

- CMS 是獨立的專案，不依賴 frontend 或 backend
- 所有內容儲存在 GitHub，透過 PR 進行版本控制
- AI 生成的內容需要人工審核後才會合併