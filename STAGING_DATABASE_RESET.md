# Staging Database Reset Guide

## 概述

AI Square 提供完整的 staging 資料庫重設解決方案，可以透過 API 快速清空並重新載入資料庫內容。

## 🚀 快速重設指令

### 1. 完整重設（清空並重新載入所有內容）
```bash
curl -X POST "https://ai-square-staging-m7s4ucbgba-de.a.run.app/api/admin/init-staging" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: staging-init-2025" \
  -d '{"action": "reset-full"}'
```

### 2. 僅清空資料庫（不重新載入）
```bash
curl -X POST "https://ai-square-staging-m7s4ucbgba-de.a.run.app/api/admin/init-staging" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: staging-init-2025" \
  -d '{"action": "clear-all"}'
```

### 3. 僅載入內容（不清空既有資料）
```bash
curl -X POST "https://ai-square-staging-m7s4ucbgba-de.a.run.app/api/admin/init-staging" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: staging-init-2025" \
  -d '{"action": "init-full"}'
```

### 4. 檢查資料庫狀態
```bash
curl -X POST "https://ai-square-staging-m7s4ucbgba-de.a.run.app/api/admin/init-staging" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: staging-init-2025" \
  -d '{"action": "check"}'
```

## 📊 支援的動作類型

| Action | 說明 | 清空資料 | 載入內容 |
|--------|------|----------|----------|
| `check` | 檢查資料庫狀態和內容數量 | ❌ | ❌ |
| `clear-all` | 清空所有資料但不重新載入 | ✅ | ❌ |
| `init-full` | 載入所有內容（不清空既有資料） | ❌ | ✅ |
| `reset-full` | 完整重設：清空 + 重新載入 | ✅ | ✅ |

## 🗄️ 載入的內容類型

重設後會載入以下內容：

### 📚 PBL Scenarios
- 來源：`public/pbl_data/*_scenario.yaml`
- 包含：學習情境、任務模板、AI 模組配置

### 📊 Assessment Scenarios  
- 來源：`public/assessment_data/*/`
- 包含：AI 素養評估問題庫、評分標準

### 🎯 Discovery Scenarios
- 來源：`public/discovery_data/*_career.yaml`
- 包含：職業探索路徑、技能需求分析

### 👤 Demo 使用者
自動建立三個測試帳號：
- `student@example.com` / 密碼: `demo123`
- `teacher@example.com` / 密碼: `demo123`  
- `admin@example.com` / 密碼: `demo123`

## 🔧 本地開發資料庫管理

如果需要重設本地開發資料庫，可使用現有的 Makefile 命令：

```bash
# 本地資料庫管理
make db-reset      # 完整重設本地資料庫
make db-clean      # 清空資料但保留 schema
make db-seed       # 重新載入範例資料
make db-status     # 檢查資料庫健康狀態

# 本地資料庫詳細命令（進入 frontend 目錄）
cd frontend
make -f Makefile.db help    # 查看所有可用命令
make -f Makefile.db db-reset
make -f Makefile.db db-backup
```

## 🔑 安全性

- **Admin Key**: 所有操作都需要正確的 admin key (`staging-init-2025`)
- **僅 Staging 環境**: 此 API 僅在 staging 環境可用，production 有獨立的管理機制
- **操作日誌**: 所有操作都會記錄在 Cloud Logging 中

## ⚠️ 重要注意事項

1. **資料會完全清空**: `reset-full` 和 `clear-all` 會刪除所有用戶資料、學習進度、評估結果
2. **無法復原**: 清空的資料無法恢復，請確認後再執行
3. **影響測試**: 重設期間可能會影響正在進行的測試
4. **等待完成**: 完整重設可能需要 30-60 秒時間

## 📈 預期結果

成功的 `reset-full` 操作會回傳：

```json
{
  "success": true,
  "message": "Database reset and reinitialized successfully",
  "counts": {
    "pbl_count": "9",
    "assessment_count": "1", 
    "discovery_count": "12",
    "user_count": "3",
    "total_scenarios": "22"
  },
  "details": {
    "pbl": "9 scenarios loaded from 9 files",
    "assessment": "1 scenarios loaded",
    "discovery": "12 scenarios loaded"
  }
}
```

## 🐛 故障排除

### 常見錯誤

1. **401 Unauthorized**: 檢查 admin key 是否正確
2. **Invalid action**: 檢查 action 參數拼寫
3. **Connection timeout**: 資料庫連線問題，稍後重試

### 檢查步驟

1. 使用 `check` action 確認 API 可正常存取
2. 檢查 staging service 是否正在運行
3. 查看 Cloud Logging 中的詳細錯誤訊息

## 🚀 實際使用場景

### 場景 1: 測試新功能前清空環境
```bash
# 1. 清空所有測試資料
curl -X POST ... -d '{"action": "clear-all"}'

# 2. 載入最新內容
curl -X POST ... -d '{"action": "init-full"}'
```

### 場景 2: 一鍵完整重設
```bash
# 適合定期重置或 demo 前準備
curl -X POST ... -d '{"action": "reset-full"}'
```

### 場景 3: 檢查資料狀態
```bash
# 快速檢查目前有多少資料
curl -X POST ... -d '{"action": "check"}' | jq
```

---

*最後更新: 2025-09-08*  
*相關檔案: `/frontend/src/app/api/admin/init-staging/route.ts`*