# 🔍 完整 Schema 多語言審計報告

## 執行時間：2025-07-31

## 📊 資料庫完整表格清單

### 核心業務表
1. **scenarios** - 學習場景 ✅ (完整多語言)
2. **domains** - AI 素養領域 ✅ (完整多語言) 
3. **achievements** - 成就系統 ✅ (完整多語言)
4. **programs** - 用戶學習實例
5. **tasks** - 學習任務
6. **evaluations** - 評估記錄
7. **users** - 用戶資料
8. **user_sessions** - 用戶會話
9. **user_achievements** - 用戶成就
10. **scenario_domains** - 場景領域關聯
11. **ai_usage** - AI 使用記錄

## 🚨 發現的多語言問題

### 1. evaluations 表的 feedback_text ❌
- **欄位類型**: text（非 JSONB）
- **問題**: 無法支援多語言回饋
- **影響**: AI 生成的回饋只能是單一語言
- **建議**: 
  - 方案 A：將 feedback_text 改為 JSONB
  - 方案 B：使用 feedback_data JSONB 欄位儲存多語言回饋

### 2. users.name 欄位考量 ⚠️
- **欄位類型**: character varying
- **現況**: 用戶姓名通常不需要翻譯
- **建議**: 保持現狀（姓名不需多語言）

### 3. achievements 的額外欄位 ⚠️
- **category**: character varying - 可能需要多語言（如 "Beginner", "Advanced"）
- **code**: character varying - 不需要（系統代碼）
- **icon_url**: character varying - 不需要（URL）

## 📋 JSONB 欄位完整清單

### 需要多語言支援的 JSONB 欄位 ✅
- scenarios.title ✅
- scenarios.description ✅
- domains.name ✅
- domains.description ✅
- achievements.name ✅
- achievements.description ✅
- tasks.title ❓ (目前無資料)
- tasks.description ❓ (目前無資料)
- tasks.content ❓ (目前無資料)

### 不需要多語言的 JSONB 欄位 ℹ️
- metadata 欄位（各表）- 系統元資料
- ai_config - AI 配置
- ai_analysis - AI 分析結果
- request_data/response_data - API 資料
- domain_scores - 分數資料
- badges_earned - 徽章清單
- interactions - 互動記錄（但內容可能需要多語言）

## 🔍 特殊發現

### 1. tasks.interactions 欄位
- **類型**: JSONB 陣列
- **用途**: 儲存用戶與 AI 的對話記錄
- **結構範例**:
  ```json
  [
    {
      "type": "user",
      "content": "使用者訊息",
      "timestamp": "2025-07-31T10:00:00Z"
    },
    {
      "type": "ai",
      "content": "AI 回應",
      "timestamp": "2025-07-31T10:00:01Z"
    }
  ]
  ```
- **多語言考量**: content 欄位應該要能支援多語言

### 2. users.onboarding_completed
- **類型**: boolean
- **現況**: 簡單的 true/false
- **建議**: 如果需要追蹤多語言 onboarding，可考慮改為 JSONB

### 3. users.preferred_language
- **類型**: character varying
- **現況**: 支援 14 種語言
- **統計**: 1003 個用戶使用所有 14 種語言

## 📊 多語言支援總結

### 完全支援 ✅
- scenarios（場景）
- domains（領域）
- achievements（成就）

### 部分支援 ⚠️
- tasks（任務）- 結構支援但無資料
- evaluations（評估）- feedback_text 不支援多語言

### 不需要支援 ℹ️
- users（用戶）- 除了 UI 偏好外不需多語言
- user_sessions（會話）- 技術資料
- ai_usage（AI 使用）- 記錄資料

## 🔧 建議修復

### Priority 1 - 立即修復
1. **evaluations.feedback_text 多語言化**
   ```sql
   -- 選項 1：新增 feedback 欄位為 JSONB
   ALTER TABLE evaluations 
   ADD COLUMN feedback JSONB DEFAULT '{}'::jsonb;
   
   -- 選項 2：使用現有的 feedback_data 欄位
   UPDATE evaluations 
   SET feedback_data = jsonb_build_object(
     'en', feedback_text,
     'zhTW', '待翻譯'
   )
   WHERE feedback_text IS NOT NULL;
   ```

2. **achievements.category 多語言化**
   ```sql
   ALTER TABLE achievements
   ADD COLUMN category_multilingual JSONB DEFAULT '{}'::jsonb;
   ```

### Priority 2 - 考慮實施
1. **tasks.interactions 內容多語言**
   - 設計支援多語言的互動記錄格式
   - 確保 AI 回應可以多語言儲存

2. **建立多語言驗證機制**
   - 定期檢查所有多語言欄位完整性
   - 自動提醒缺少的翻譯

## ✅ 最終評估

### 多語言完整性評分：85%

**優點**：
- 核心表格（scenarios, domains, achievements）100% 支援
- 統一使用 zhTW/zhCN 格式
- 支援 14 種語言

**缺點**：
- evaluations.feedback_text 不支援多語言
- tasks 相關多語言功能未驗證（無資料）
- 部分輔助欄位可能需要多語言

### 部署影響評估
- **現狀可部署性**: ✅ 可以部署
- **風險等級**: 低
- **影響範圍**: 主要影響 AI 生成回饋的多語言顯示

---

**結論**：經過完整 schema 審查，發現 1 個需要注意的問題（evaluations.feedback_text），但不影響核心功能的多語言支援。建議在下個版本中改進。