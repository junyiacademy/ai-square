# 統一部署系統說明 (Unified Deployment System)

## 🎯 核心理念
**一套程式碼，多個環境** - 避免 staging 和 production 使用不同的部署腳本，確保 staging 真正驗證 production 部署。

## 📁 檔案結構

### 現行檔案（統一系統）
```
frontend/
├── deploy.sh                 # 統一部署腳本（支援 staging/production/local）
├── deploy.config.json        # 統一配置檔案（所有環境的設定）
└── scripts/
    ├── pre-deploy-check.sh   # 統一前置檢查腳本
    └── init-cloud-sql.sh     # 統一資料庫初始化腳本
```

### 已移除的舊檔案
以下舊腳本已被完全刪除（2025/01）：
- `deploy-staging.sh` - 舊的 staging 專用部署腳本
- `deploy-production.sh` - 舊的 production 專用部署腳本
- `init-staging-cloud-sql.sh` - 舊的 staging 資料庫初始化
- `staging-pre-check.sh` - 舊的 staging 前置檢查
- 其他環境專用腳本

## 🚀 使用方式

### Makefile 命令（推薦）
```bash
# Staging 部署
make deploy-staging

# Production 部署
make deploy-production

# 本地測試
make deploy-local
```

### 直接執行腳本
```bash
# Staging 部署
cd frontend && ./deploy.sh staging

# Production 部署
cd frontend && ./deploy.sh production

# 本地測試
cd frontend && ./deploy.sh local
```

## 🔧 配置管理

所有環境配置都在 `deploy.config.json` 中集中管理：

```json
{
  "environments": {
    "staging": {
      "cloudSQL": {
        "instance": "ai-square-db-staging-asia",
        "ip": "34.80.67.129"
      },
      "demoAccounts": [
        {
          "email": "student@example.com",
          "password": "student123"
        }
      ]
    },
    "production": {
      // Production 配置
    }
  }
}
```

## ✅ 優點

1. **一致性保證**：staging 和 production 使用相同的部署流程
2. **維護簡單**：只需維護一套腳本
3. **配置集中**：所有配置在 deploy.config.json 中
4. **減少錯誤**：避免環境間的差異導致的問題
5. **版本控制**：單一配置檔案易於追蹤變更

## 📝 注意事項

1. **密碼管理**：demo 帳號密碼統一為 `{role}123` 格式
   - student@example.com → student123
   - teacher@example.com → teacher123
   - admin@example.com → admin123

2. **資料庫初始化**：deploy.sh 會自動執行資料庫初始化
   - 檢查資料庫是否存在
   - 創建 schema（如果需要）
   - 確保 demo 帳號存在

3. **E2E 測試**：部署後會自動執行 E2E 測試驗證

## 🔄 遷移指南

如果你之前使用舊的部署腳本，請按以下步驟遷移：

1. 更新 Makefile 到最新版本
2. 確認 deploy.sh 和 deploy.config.json 存在
3. 使用新的 make 命令進行部署
4. 舊腳本已被完全移除（2025/01）

## 🐛 問題排查

如果遇到問題，請檢查：

1. deploy.sh 是否有執行權限：`chmod +x deploy.sh`
2. deploy.config.json 配置是否正確
3. GCloud 是否已認證：`gcloud auth list`
4. 專案是否正確：`gcloud config get-value project`

---
*統一部署系統 v1.0 - 2025/01*
