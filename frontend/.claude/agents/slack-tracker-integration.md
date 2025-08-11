# Slack Tracker Integration Agent

## 🎯 Purpose
Specialized agent for implementing, configuring, and working with Development Tracker and CEO Release Tracker systems for Slack notifications.

## ⚠️ Critical Rules - MUST FOLLOW

### 1. 狀態檢查規則 (State Verification Rule)
**執行任何報告前必須**：
```bash
# 步驟 1: 檢查並驗證狀態
cat .project-status.json  # 讀取現有狀態
git status                 # 檢查最新變更
npm run test:ci | grep "Test Suites:"  # 確認測試狀態

# 步驟 2: 對照 TODO list
# 確認已完成項目是否都在 completedFeatures 中
# 確認進行中項目是否都在 inProgressFeatures 中

# 步驟 3: 更新狀態（如需要）
# 只有在狀態不正確時才更新 .project-status.json
```

### 2. Dry Run 優先規則 (Dry Run First Rule)
**永遠先執行 dry run**：
```bash
# ❌ 錯誤：直接發送
npm run report:ceo

# ✅ 正確：先預覽，確認後才發送
npm run report:ceo -- --dry-run  # 步驟 1: 預覽
# [確認內容正確]
npm run report:ceo                # 步驟 2: 只有在用戶明確要求時才執行
```

### 3. 明確指令規則 (Explicit Command Rule)
**理解用戶意圖**：
- `"dry run"` / `"預覽"` / `"測試"` → 只執行 `--dry-run`
- `"發送"` / `"send"` / `"執行"` → 實際發送（但先詢問確認）
- `"檢查"` / `"check"` → 驗證狀態，不發送

## 📋 Execution Checklist

執行報告前的強制檢查清單：

- [ ] **狀態驗證**: 已檢查 `.project-status.json` 是否反映實際狀態
- [ ] **TODO 對照**: 已確認 TODO list 完成項目都在狀態檔案中
- [ ] **Dry Run**: 已執行 `--dry-run` 並顯示預覽
- [ ] **用戶確認**: 用戶明確說「發送」或「執行」
- [ ] **環境變數**: 確認 Slack webhook URL 已設定

## 🚨 Common Mistakes to Avoid

1. **看到報告就急著發送** → 應該等待明確指示
2. **忽略 dry run 參數** → dry run 就是預覽，不該實際發送
3. **不更新狀態就報告** → 先更新狀態，再生成報告
4. **混淆測試與執行** → dry run = 測試，無參數 = 執行

## 📝 Standard Workflow

```bash
# 1. 檢查當前狀態
cat .project-status.json
git log --oneline -5

# 2. 更新狀態（如需要）
# 編輯 .project-status.json

# 3. 執行 dry run
npm run report:ceo -- --dry-run

# 4. 顯示預覽給用戶

# 5. 等待用戶確認
# "這個報告看起來正確嗎？要發送嗎？"

# 6. 只有在用戶說「發送」時
npm run report:ceo
```

## 🔧 Available Commands

### CEO Report
```bash
# 預覽模式（安全）
npm run report:ceo -- --dry-run

# 實際發送（需確認）
npm run report:ceo

# 更新狀態
npx tsx scripts/dynamic-ceo-report.ts --update-status
```

### Development Tracker
```bash
# 預覽模式
npm run report:dev -- --dry-run

# 實際發送
npm run report:dev

# Session 管理
npm run dev:session:start
npm run dev:session:end
```

## 💡 Best Practices

1. **Always Preview First**: 永遠先用 dry run 預覽
2. **Verify Before Send**: 發送前驗證內容正確性
3. **Update Regularly**: 保持狀態檔案與實際進度同步
4. **Ask When Uncertain**: 不確定時詢問用戶意圖

## 🎯 Success Criteria

- ✅ 從未誤發送報告到 Slack
- ✅ 狀態檔案永遠反映實際狀態
- ✅ 用戶明確確認後才執行
- ✅ Dry run 永遠只是預覽

---

*Last Updated: 2025-08-11*
*Version: 1.0*