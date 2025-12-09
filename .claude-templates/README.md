# Claude 統一專案設定系統

這個目錄包含了統一的 Claude 專案設定模板和工具，確保所有專案都有一致的 Claude hook 和權限配置。

## 🎯 解決的問題

- **Hook 執行錯誤**：統一的 hook 系統避免了 "No such file or directory" 錯誤
- **專案特定配置**：根據專案類型自動調整 hook 行為和權限
- **一致性**：所有專案使用相同的 agents-manager 工作流程

## 📁 文件結構

```
.claude-templates/
├── README.md                    # 本說明文件
├── setup-new-project.sh        # 新專案設定腳本
├── settings.json.template       # 通用設定模板
├── nextjs-frontend.json         # Next.js 前端專案模板
├── fastapi-backend.json         # FastAPI 後端專案模板
└── universal-agent-rules.py     # 通用 hook 腳本（從 ai-square 複製）
```

## 🚀 使用方法

### 1. 為新專案設定 Claude

```bash
# 語法
./setup-new-project.sh <專案路徑> <專案類型> <專案名稱>

# 範例
./setup-new-project.sh /Users/young/project/my-new-app nextjs-frontend my-new-app
./setup-new-project.sh /Users/young/project/api-server fastapi-backend api-server
```

### 2. 支援的專案類型

- **nextjs-frontend**: Next.js + TypeScript 前端專案
- **fastapi-backend**: FastAPI + Python 後端專案  
- **fullstack**: 全端專案（需要手動調整設定）

### 3. 設定後的檔案結構

```
your-project/
└── .claude/
    ├── settings.json            # 主要設定檔（包含 hooks 和權限）
    ├── settings.local.json      # 本地特定設定
    └── hooks/
        └── universal-agent-rules.py  # 通用 hook 腳本
```

## ⚙️ Hook 功能特色

### 智能專案識別
- 自動讀取 `settings.json` 中的 `projectSettings`
- 根據專案類型、框架、語言調整提示內容

### 任務檢測
- 自動識別需要使用 agents-manager 的任務
- 支援中英文關鍵字檢測
- 框架特定的錯誤檢測（如 TypeScript 錯誤、Python 錯誤）

### 智能建議
- 緊急任務處理建議
- 批量操作並行執行建議
- 多任務序列化建議

## 🔧 自定義設定

### 修改專案設定
編輯 `.claude/settings.json` 中的 `projectSettings`：

```json
{
  "projectSettings": {
    "name": "your-project-name",
    "type": "frontend|backend|fullstack",
    "framework": "next.js|fastapi|express",
    "language": "typescript|python|javascript",
    "database": "postgresql|mysql|mongodb",
    "testing": "jest|pytest|vitest",
    "package_manager": "npm|yarn|pnpm|poetry"
  }
}
```

### 添加專案特定權限
編輯 `.claude/settings.local.json`：

```json
{
  "permissions": {
    "allow": [
      "Bash(your-custom-command:*)"
    ],
    "deny": [
      "Bash(dangerous-command:*)"
    ]
  }
}
```

## 🧪 測試 Hook

```bash
cd /path/to/your/project
echo '{"prompt": "implement new feature"}' | python3 .claude/hooks/universal-agent-rules.py
```

預期輸出應包含專案上下文和 agents-manager 提示。

## 📋 維護

### 更新現有專案
如果 universal hook 有更新，可以手動複製：

```bash
cp /Users/young/project/ai-square/.claude/hooks/universal-agent-rules.py /path/to/your/project/.claude/hooks/
```

### 添加新的專案類型模板
1. 在此目錄創建新的 JSON 模板文件
2. 更新 `setup-new-project.sh` 腳本以支援新類型
3. 更新此 README 文件

## 🎉 優勢

- **零配置**：新專案一鍵設定完成
- **智能化**：根據專案類型自動調整行為
- **一致性**：所有專案使用相同的工作流程
- **可擴展**：容易添加新的專案類型和功能
- **預防性**：避免常見的 hook 執行錯誤

## 📞 支援

如果遇到問題：
1. 檢查 hook 腳本是否有執行權限：`chmod +x .claude/hooks/universal-agent-rules.py`
2. 測試 hook 是否正常工作（見上方測試命令）
3. 檢查 `settings.json` 格式是否正確
