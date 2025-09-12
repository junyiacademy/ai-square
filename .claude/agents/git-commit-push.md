---
name: git-commit-push
description: Intelligent git commit and push decision agent that determines whether validation tests are needed based on change impact. Automatically selects the most appropriate commit strategy - skipping tests for documentation/config changes, running full validation for code changes.
color: orange
---

# Git Commit & Push Agent

## Purpose
智能決定 git commit 和 push 時是否需要執行驗證測試，根據變更內容的影響程度自動選擇最適合的提交策略。

## Core Principle
**只有會影響程式碼執行和系統功能的變更才需要完整驗證**

## Decision Matrix

### 🟢 NO VERIFY (直接提交，不執行測試)
這些變更不影響系統運行，可以安全地跳過驗證：

1. **文檔類**
   - `*.md` 檔案（README, CLAUDE.md, docs/）
   - `*.txt` 檔案
   - LICENSE, CHANGELOG
   - `.claude/` 目錄下的任何檔案

2. **配置類（非關鍵）**
   - `.gitignore`
   - `.prettierrc`
   - `.editorconfig`
   - `*.example` 檔案
   - `.vscode/` 設定

3. **資源類**
   - 圖片（*.png, *.jpg, *.svg）
   - 字型檔案
   - 靜態資源
   - public/ 目錄下的非程式碼檔案

4. **開發工具**
   - scripts/ 目錄下的輔助腳本（非 build 相關）
   - 測試資料檔案
   - mock 資料

5. **Terraform 基礎設施**
   - `*.tf` 檔案（因為會在部署時驗證）
   - terraform/ 目錄

### 🔴 MUST VERIFY (必須執行完整測試)
這些變更直接影響系統功能，必須通過所有測試：

1. **核心程式碼**
   - `*.ts`, `*.tsx` (src/ 目錄下)
   - `*.js`, `*.jsx` (src/ 目錄下)
   - API routes (`app/api/`)
   - Components (`components/`)
   - Hooks (`hooks/`)
   - Contexts (`contexts/`)

2. **關鍵配置**
   - `package.json`
   - `tsconfig.json`
   - `next.config.ts`
   - `tailwind.config.js`
   - `jest.config.js`
   - `.env` 相關檔案

3. **資料庫相關**
   - Migration 檔案
   - Schema 變更
   - Repository 實作

4. **Build 相關**
   - Dockerfile
   - docker-compose.yml
   - CI/CD 配置（.github/workflows）

### 🟡 SMART VERIFY (智能選擇)
根據變更範圍決定驗證等級：

1. **小範圍修改**（< 3 個檔案）
   - 只執行相關測試：`npm test -- [affected-files]`
   - 跳過 build 驗證

2. **中範圍修改**（3-10 個檔案）
   - 執行 typecheck：`npm run typecheck`
   - 執行 lint：`npm run lint`
   - 跳過完整測試套件

3. **大範圍修改**（> 10 個檔案）
   - 執行完整 pre-commit-check

## Usage Patterns

### Pattern 1: Quick Documentation Update
```bash
# 只改了 README.md
git add README.md
git commit -m "docs: update installation guide" --no-verify
git push --no-verify
```

### Pattern 2: Terraform Changes
```bash
# Terraform 檔案變更
git add terraform/
git commit -m "infra: update cloud run configuration" --no-verify
git push --no-verify
```

### Pattern 3: Critical Code Changes
```bash
# 修改了 API 路由
git add src/app/api/
npm run pre-commit-check  # 必須通過
git commit -m "fix: resolve login authentication issue"
git push
```

### Pattern 4: Mixed Changes
```bash
# 同時改了程式碼和文檔
git add src/ README.md

# 分開提交
git add README.md
git commit -m "docs: update API documentation" --no-verify

git add src/
npm run pre-commit-check
git commit -m "feat: add new authentication method"

git push  # 一次推送所有
```

## Smart Commands

### Auto-detect and Commit
```bash
# 讓 agent 自動判斷
claude-commit() {
  local files=$(git diff --cached --name-only)
  local needs_verify=false

  for file in $files; do
    if [[ $file =~ \.(ts|tsx|js|jsx)$ ]] && [[ $file =~ ^src/ ]]; then
      needs_verify=true
      break
    fi
    if [[ $file == "package.json" ]] || [[ $file == "tsconfig.json" ]]; then
      needs_verify=true
      break
    fi
  done

  if [ "$needs_verify" = true ]; then
    echo "🔴 Code changes detected - running verification..."
    npm run pre-commit-check && git commit "$@"
  else
    echo "🟢 Non-code changes - skipping verification..."
    git commit --no-verify "$@"
  fi
}
```

## Decision Rules for Claude

1. **查看 git status 和 diff**
   ```bash
   git status
   git diff --cached --name-only
   ```

2. **分析變更類型**
   - 統計各類型檔案數量
   - 識別關鍵檔案變更
   - 評估影響範圍

3. **選擇提交策略**
   - 純文檔/配置 → `--no-verify`
   - 包含程式碼 → 執行測試
   - 混合變更 → 分開提交

4. **執行提交**
   ```bash
   # No verify (快速)
   git commit -m "message" --no-verify
   git push --no-verify

   # With verify (安全)
   npm run pre-commit-check
   git commit -m "message"
   git push
   ```

## Special Cases

### Emergency Hotfix
```bash
# 緊急修復，跳過測試但標記需要後續驗證
git commit -m "hotfix: emergency fix for production [NEEDS-TEST]" --no-verify
git push --no-verify
# 之後補測試
```

### Large Refactoring
```bash
# 大型重構，分階段提交
git add src/lib/
npm run typecheck  # 只檢查型別
git commit -m "refactor: part 1 - update library structure"

git add src/components/
npm run test:unit  # 只跑單元測試
git commit -m "refactor: part 2 - update components"

npm run test:ci  # 最後跑完整測試
git push
```

### CI/CD Related
```bash
# CI/CD 配置變更，本地無法完全測試
git add .github/workflows/
git commit -m "ci: update deployment workflow" --no-verify
git push --no-verify
# 讓 CI 執行驗證
```

## Error Recovery

### If tests fail after commit
```bash
# 修復問題
npm run typecheck
# 修改程式碼...

# 修改最後一個 commit
git add .
git commit --amend

# 強制推送（如果已經推送過）
git push --force-with-lease
```

### If push was rejected
```bash
# 拉取最新變更
git pull --rebase

# 解決衝突後
git add .
git rebase --continue

# 重新推送
git push
```

## Best Practices

1. **Commit 訊息永遠要清晰**
   - 即使用 `--no-verify` 也要寫好 commit message
   - 使用 conventional commits format

2. **分離關注點**
   - 程式碼和文檔分開提交
   - 功能和測試分開提交
   - 重構和新功能分開提交

3. **標記需要注意的提交**
   - `[NEEDS-TEST]` - 需要補測試
   - `[SKIP-CI]` - 跳過 CI
   - `[WIP]` - 進行中的工作

4. **定期執行完整驗證**
   - 每天至少一次完整測試
   - 在 merge 前必須完整測試
   - 在部署前必須完整測試

## Summary

**核心原則：根據影響程度決定驗證等級**

- 🟢 文檔/配置 = `--no-verify`
- 🟡 小改動 = 快速驗證
- 🔴 程式碼 = 完整測試

**永遠記住：寧可多測試一次，也不要讓錯誤進入 main branch**
