# AI Square - TODO List

> 專案待辦事項與開發計畫

---

## 🚀 Prompt-to-Course 功能開發計畫

### 📋 功能概述

讓用戶可以透過自然語言描述課程內容，AI 自動生成符合格式的 YAML scenario 檔案。

**核心流程**:
```
用戶輸入課程內容 → AI 生成 YAML → Preview (Visual/Markdown/Code)
→ 編輯調整 → 驗證格式 → 發布到 GitHub (PR)
```

---

## 📊 Phase 1: Preview Only（優先）

**目標**: 實作完整 UI，只有預覽和下載功能，不推送 GitHub

**風險等級**: 🟢 極低（零風險）

### ✅ 已完成
- [x] 檢查 GitHub token 和權限
- [x] 更新 CI/CD workflows (auto-deploy.yml, preview-deploy.yml)
- [x] 設定本地 .env.local (GITHUB_TOKEN)
- [x] 風險評估完成

### 🔲 待完成

#### 1. 前端 UI 實作

**路徑**: `frontend/src/app/admin/scenarios/create/`

- [ ] **page.tsx** - 主頁面
  - [ ] InputForm 組件 - 課程內容輸入
  - [ ] AI 生成按鈕 + Loading 狀態
  - [ ] PreviewTabs 組件 - 3 個 Tab
  - [ ] ActionButtons - 下載/返回

- [ ] **components/InputForm.tsx**
  - [ ] 課程內容 textarea
  - [ ] Scenario ID input (with validation)
  - [ ] Task 數量 slider (1-10)
  - [ ] 難度選擇 (beginner/intermediate/advanced)
  - [ ] 預估時間 input
  - [ ] Target domains multi-select

- [ ] **components/PreviewTabs.tsx**
  - [ ] Tab 1: Visual Preview
  - [ ] Tab 2: Markdown Preview
  - [ ] Tab 3: YAML Code Editor

- [ ] **components/VisualPreview.tsx**
  - [ ] Scenario 卡片預覽
  - [ ] Task 列表展示
  - [ ] 模擬實際頁面呈現

- [ ] **components/MarkdownPreview.tsx**
  - [ ] React-markdown 整合
  - [ ] 語法高亮
  - [ ] 結構化呈現

- [ ] **components/YAMLEditor.tsx**
  - [ ] Monaco Editor 整合
  - [ ] YAML syntax highlighting
  - [ ] 即時編輯功能
  - [ ] 格式化按鈕

- [ ] **components/ValidationPanel.tsx**
  - [ ] 即時驗證 YAML 格式
  - [ ] 錯誤列表顯示
  - [ ] 警告訊息
  - [ ] 成功指標

#### 2. 後端 API 實作

**路徑**: `frontend/src/app/api/scenarios/`

- [ ] **generate/route.ts** - AI 生成 YAML
  - [ ] 接收用戶輸入
  - [ ] 建構 Vertex AI prompt
  - [ ] 呼叫 gemini-2.5-flash
  - [ ] 回傳生成的 YAML
  - [ ] Error handling

- [ ] **validate/route.ts** - 驗證 YAML
  - [ ] YAML 語法檢查
  - [ ] Schema 驗證 (Zod)
  - [ ] 必要欄位檢查
  - [ ] 回傳驗證結果

#### 3. AI Prompt Template

- [ ] **lib/prompts/scenario-generator.ts**
  - [ ] PBL scenario prompt template
  - [ ] Discovery scenario prompt template
  - [ ] Assessment prompt template
  - [ ] 範例和限制規則
  - [ ] Few-shot examples

#### 4. YAML 驗證 Schema

- [ ] **lib/validators/scenario-schema.ts**
  - [ ] Zod schema for PBL
  - [ ] Zod schema for Discovery
  - [ ] Zod schema for Assessment
  - [ ] 自訂驗證規則

#### 5. 測試

- [ ] **單元測試**
  - [ ] AI prompt 測試
  - [ ] YAML 驗證測試
  - [ ] Schema 測試

- [ ] **整合測試**
  - [ ] API endpoint 測試
  - [ ] End-to-end 流程測試

#### 6. UI/UX 優化

- [ ] Loading 動畫
- [ ] Error 訊息設計
- [ ] Success 提示
- [ ] 響應式設計
- [ ] 無障礙支援

**預估時間**: 2-3 小時
**目標**: 完整的預覽和下載功能，可本地測試

---

## 🔐 Phase 2: GitHub 整合（次要）

**目標**: 加入發布到 GitHub 的功能

**風險等級**: 🟡 中等（需要安全措施）

### 🔲 待完成

#### 1. GitHub Token 設定

- [ ] **創建 GitHub Token**
  - [ ] 前往 https://github.com/settings/tokens?type=beta
  - [ ] Token name: `AI-Square-CMS-Token`
  - [ ] Expiration: 90 days
  - [ ] Repository: Only `junyiacademy/ai-square`
  - [ ] Permissions:
    - [ ] Contents: Read and write
    - [ ] Pull requests: Read and write

- [ ] **新增到 GitHub Secrets**
  - [ ] 前往 https://github.com/junyiacademy/ai-square/settings/secrets/actions
  - [ ] Name: `GITHUB_API_TOKEN`
  - [ ] Value: [貼上 token]

#### 2. Workflow 變更

- [ ] **Commit workflow 變更**
  ```bash
  git add .github/workflows/*.yml
  git commit -m "feat: add GitHub API token to CI/CD for Prompt-to-Course"
  git push
  ```

- [ ] **驗證部署**
  - [ ] Staging 部署成功
  - [ ] 環境變數正確注入
  - [ ] 測試 GITHUB_TOKEN 可用

#### 3. 發布 API 實作

- [ ] **api/scenarios/publish/route.ts**
  - [ ] 接收 YAML 內容
  - [ ] 驗證格式
  - [ ] 檢查 Scenario ID 不重複
  - [ ] 創建 feature branch
  - [ ] Commit YAML 檔案
  - [ ] 創建 Pull Request
  - [ ] 回傳 PR URL

#### 4. UI 更新

- [ ] **啟用「發布到 GitHub」按鈕**
  - [ ] 移除 disabled 狀態
  - [ ] 加入 loading 狀態
  - [ ] 成功後顯示 PR 連結
  - [ ] Error handling

#### 5. 安全措施

- [ ] **Token 安全**
  - [ ] 確認 token 只在後端
  - [ ] 檢查不在 response 洩漏
  - [ ] Error messages 不包含敏感資訊
  - [ ] 檢查 .gitignore 設定

- [ ] **功能限制**
  - [ ] Admin only 權限檢查
  - [ ] Rate limiting (每分鐘最多 3 次)
  - [ ] Audit logging

- [ ] **資料驗證**
  - [ ] Scenario ID 格式檢查
  - [ ] 檢查是否已存在
  - [ ] YAML 格式嚴格驗證

#### 6. 測試

- [ ] **本地測試**
  - [ ] 完整流程測試
  - [ ] Error 情境測試
  - [ ] Token 權限測試

- [ ] **Staging 測試**
  - [ ] 部署到 staging
  - [ ] 測試發布功能
  - [ ] 驗證 PR 創建
  - [ ] 測試 merge 流程

**預估時間**: 1-2 小時
**前置條件**: Phase 1 完成且測試通過

---

## 📋 其他待辦事項

### 文檔更新

- [ ] 更新 README.md - 新增 Prompt-to-Course 功能說明
- [ ] 更新 PRD.md - 加入功能規格
- [ ] 建立使用手冊 - docs/guides/prompt-to-course.md

### 多語言支援（未來）

- [ ] AI 自動翻譯功能
- [ ] 生成多語言版本 YAML
- [ ] 語言選擇 UI

### 進階功能（未來）

- [ ] 從現有 scenario 修改
- [ ] Scenario 版本控制
- [ ] 批次生成多個 scenarios
- [ ] Template library

---

## 🎯 優先順序

### 🔴 高優先級（本週）
1. Phase 1 實作 (2-3 小時)
2. 本地測試和調整 (1 小時)

### 🟡 中優先級（下週）
1. Phase 2 準備 (GitHub Token)
2. Phase 2 實作 (1-2 小時)
3. Staging 測試

### 🟢 低優先級（未來）
1. 多語言支援
2. 進階功能
3. 文檔完善

---

## 📝 決策記錄

### 2025-11-28: Phase 分階段開發

**決定**: 採用兩階段開發策略

**理由**:
1. Phase 1 (Preview Only) 幾乎零風險
2. 可以先驗證 AI 生成品質
3. 確認 UI/UX 符合需求後再處理 GitHub 整合
4. 降低開發和部署風險

**風險評估**:
- Phase 1: 🟢 極低風險
- Phase 2: 🟡 中等風險（已有緩解措施）

### GitHub 整合策略

**決定**: 使用 Feature Branch + PR 方式

**理由**:
1. 不直接推 main，降低風險
2. 有人工 review 機會
3. 可以看 diff 和測試
4. 錯誤可以關閉 PR 不影響主分支

**替代方案**:
- ❌ Direct to main: 風險太高
- ✅ PR Review: 平衡安全和自動化
- ✅ Manual only: 最安全但不自動化

---

## 🔗 相關文檔

- [CLAUDE.md](./CLAUDE.md) - 專案開發指南
- [PRD.md](./docs/handbook/PRD.md) - 產品需求文檔
- [CI/CD.md](./docs/deployment/CICD.md) - 部署流程
- [風險評估文檔](./docs/technical/prompt-to-course-risks.md) - 待建立

---

**最後更新**: 2025-11-28
**負責人**: Claude + Young
**狀態**: Phase 1 規劃完成，等待實作
