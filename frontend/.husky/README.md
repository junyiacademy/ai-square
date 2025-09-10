# Git Hooks 使用指南

## 🎯 Hook 職責分工

### Pre-commit Hook (每次 commit)
**執行時間**: ~5 秒  
**檢查內容**:
- ✅ TypeScript 編譯檢查 (整個專案)
- ✅ ESLint 檢查 (只檢查 staged files)
- ✅ 安全檢查 (檢查是否有 hardcoded secrets)

### Pre-push Hook (推送前)
**執行時間**: ~10-45 秒  
**檢查內容**:
- ✅ 完整 TypeScript 檢查 (~2秒)
- ✅ 完整 ESLint 檢查 (~2秒)
- ✅ API 測試 (100個測試, ~5秒)
- ⚠️ Build 檢查 (可選, ~35秒)

## 🚀 使用方式

### 正常工作流程
```bash
# 正常 commit - 會執行 pre-commit (~5秒)
git add .
git commit -m "feat: new feature"

# 正常 push - 會執行 pre-push (~45秒含build)
git push
```

### 快速推送 (跳過 build)
```bash
# 跳過 build 檢查 (~10秒)
git push --no-build
```

### 緊急推送 (跳過所有檢查)
```bash
# 跳過 pre-commit
git commit --no-verify -m "emergency fix"

# 跳過 pre-push
git push --no-verify

# 或一次跳過所有
git commit --no-verify -m "hotfix" && git push --no-verify
```

## 📊 時間成本分析

| 操作 | 時間 | 檢查項目 |
|-----|------|---------|
| commit | ~5秒 | TypeScript + ESLint + Security |
| push (快速) | ~10秒 | TypeScript + ESLint + API tests |
| push (完整) | ~45秒 | + Build |
| push --no-verify | 0秒 | 無檢查 (危險！) |

## 🎯 設計理念

1. **Pre-commit 輕量化**: 只做必要檢查，不影響開發節奏
2. **Pre-push 把關**: 確保不會破壞 CI/CD，避免浪費資源
3. **彈性選擇**: 提供跳過選項應對緊急情況

## ⚠️ 注意事項

- **不建議頻繁跳過檢查** - 可能導致 CI/CD 失敗
- **Build 檢查很重要** - 至少每天執行一次完整檢查
- **API 測試必須通過** - 這是最基本的品質保證

## 🔧 疑難排解

### TypeScript 錯誤
```bash
npm run typecheck  # 查看所有錯誤
```

### ESLint 錯誤
```bash
npm run lint       # 查看所有警告
npm run lint:fix   # 自動修復可修復的問題
```

### 測試失敗
```bash
npm test src/app/api  # 只跑 API 測試
npm test             # 跑所有測試
```

### Build 失敗
```bash
npm run build  # 查看詳細錯誤
```