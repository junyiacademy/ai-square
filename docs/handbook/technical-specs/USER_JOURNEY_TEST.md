# 完整用戶旅程測試指南

## 測試流程

### 1. 新用戶註冊流程
1. 訪問首頁 `/`
2. 點擊 "Get Started" 按鈕 → 應該導向 `/register`
3. 填寫註冊表單：
   - 姓名：Test User
   - 郵箱：newuser@test.com  
   - 密碼：password123
   - 確認密碼：password123
   - 勾選同意條款
4. 點擊 "Create account" → 應該自動登入並導向 `/onboarding/welcome`

### 2. Onboarding 流程
1. 在 Welcome 頁面瀏覽 3 個步驟介紹
2. 點擊 "Start Your Journey" → 導向 `/onboarding/goals`
3. 選擇 2-3 個學習目標（如：Understand AI Fundamentals, Create Content with AI）
4. 點擊 "Continue to Assessment" → 導向 `/assessment`

### 3. Assessment 流程
1. 閱讀 Assessment 介紹頁面
2. 點擊 "Start Assessment" 開始測驗
3. 完成所有題目（約 20 題）
4. 查看結果頁面，確認：
   - 總分顯示正確
   - 四個領域分數都有顯示
   - Radar Chart 渲染正常
5. 點擊 "View Learning Path" 按鈕 → 導向 `/learning-path`

### 4. Learning Path 頁面
1. 確認顯示個人化推薦
2. 看到基於 Assessment 結果的 PBL 場景推薦
3. 可以按領域篩選推薦
4. 點擊某個 PBL 場景的 "Start Learning" → 導向 PBL 頁面
5. 點擊 "Go to Dashboard" → 導向 `/dashboard`

### 5. Dashboard 頁面
1. 確認顯示用戶名稱
2. 看到 AI Literacy Progress（如果完成 Assessment）
3. 查看 Learning Statistics
4. 確認 "Recommended Next Steps" 顯示合適的建議
5. 測試 Quick Links 導航

### 6. 既有用戶登入流程
1. 登出當前用戶
2. 訪問 `/login`
3. 使用測試帳號登入：
   - `teacher@example.com` / `teacher123` (已完成 Assessment)
   - `student@example.com` / `student123` (未完成 Assessment)
4. 確認根據用戶狀態導向正確頁面：
   - 已完成 Assessment → `/dashboard`
   - 未完成 Assessment → `/assessment`

## 測試用帳號

### 新註冊用戶
- 任何新郵箱都可以註冊
- 會自動導向 Onboarding 流程

### 既有測試帳號
1. **Teacher User** (完整體驗)
   - Email: `teacher@example.com`
   - Password: `teacher123`
   - Status: 已完成 Onboarding + Assessment
   - 登入後直接到 Dashboard

2. **Student User** (需要完成 Assessment)
   - Email: `student@example.com` 
   - Password: `student123`
   - Status: 已完成 Onboarding，未完成 Assessment
   - 登入後導向 Assessment

3. **Test User** (完整新手體驗)
   - Email: `test@example.com`
   - Password: `password123`
   - Status: 新用戶狀態
   - 登入後導向 Onboarding

## 預期行為

### 導航邏輯
- **未登入用戶**：首頁 → 註冊/登入
- **新用戶**：Onboarding → Assessment → Learning Path → Dashboard
- **未完成 Assessment**：登入 → Assessment → Learning Path → Dashboard  
- **已完成 Assessment**：登入 → Dashboard

### 數據持久化
- 用戶狀態保存在 localStorage
- Assessment 結果保存在 localStorage
- 支援瀏覽器重新整理後狀態恢復

### 響應式設計
- 所有頁面支援手機、平板、桌面顯示
- Dark/Light 主題切換正常
- 多語言支援（目前主要英文）

## 常見問題排查

### 如果導航不正確
1. 檢查 localStorage 中的用戶狀態
2. 確認用戶的 `hasCompletedOnboarding` 和 `hasCompletedAssessment` 狀態
3. 清除 localStorage 重新測試

### 如果 Assessment 結果沒有保存
1. 檢查瀏覽器 localStorage 是否有 `assessmentResult` 
2. 確認 Assessment 完成後用戶狀態更新

### 如果 PBL 推薦不顯示
1. 確認 Assessment 已完成
2. 檢查 `/api/pbl/scenarios` API 是否正常
3. 查看瀏覽器 Console 是否有錯誤

## 成功標準

✅ 完整用戶旅程無中斷  
✅ 所有頁面正常渲染  
✅ 導航邏輯符合預期  
✅ Assessment 結果正確保存和顯示  
✅ Learning Path 推薦基於 Assessment 結果  
✅ Dashboard 整合所有功能數據  
✅ 既有用戶和新用戶都有適當流程  
✅ 響應式設計在各種設備上正常  
✅ 多語言和主題切換正常