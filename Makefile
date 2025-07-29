# AI Square Development Makefile

# 預設變數
TYPE ?= feature
DESC ?= ""

.PHONY: help \
        dev run-frontend run-backend run-cms \
        dev-setup dev-install dev-update \
        build-frontend build-docker-image check-deploy-size \
        gcp-build-and-push gcp-deploy-service deploy-gcp deploy-backend-gcp \
        test-frontend test-backend test-all test-e2e \
        dev-lint dev-typecheck dev-quality lint-backend \
        clean clean-all build-journey pre-commit-check \
        graphiti graphiti-stop graphiti-status claude-init \
        db-init db-reset db-seed db-up db-down db-backup db-restore \
        db-status db-migrate db-shell db-logs db-clean-backups \
        build-cms-image cms-build-and-push gcp-deploy-cms deploy-cms-gcp \
        setup-secrets-cms logs-cms

# 預設顯示幫助
.DEFAULT_GOAL := help

# 智能顏色定義 - 自動檢測終端支援
# 檢查是否支援顏色輸出
SUPPORTS_COLOR := $(shell test -t 1 && tput colors >/dev/null 2>&1 && echo "yes" || echo "no")

ifeq ($(SUPPORTS_COLOR),yes)
    # 終端支援顏色
    GREEN := \033[0;32m
    YELLOW := \033[0;33m
    BLUE := \033[0;34m
    RED := \033[0;31m
    CYAN := \033[0;36m
    NC := \033[0m
else
    # 終端不支援顏色或輸出被重定向
    GREEN :=
    YELLOW :=
    BLUE :=
    RED :=
    CYAN :=
    NC :=
endif

# 允許通過環境變數強制禁用顏色
ifeq ($(NO_COLOR),1)
    GREEN :=
    YELLOW :=
    BLUE :=
    RED :=
    CYAN :=
    NC :=
endif


#=============================================================================
# Graphiti Memory 系統
#=============================================================================

## 啟動 Graphiti MCP Server（簡化版）
graphiti:
	@echo "$(GREEN)🧠 啟動 Graphiti Memory 系統$(NC)"
	@echo "$(CYAN)檢查服務狀態...$(NC)"
	@if ! docker ps | grep -q neo4j; then \
		echo "$(YELLOW)啟動 Neo4j 和 MCP Server...$(NC)"; \
		cd ~/project/graphiti/mcp_server && docker compose up -d; \
		echo "$(CYAN)等待服務啟動...$(NC)"; \
		sleep 15; \
	fi
	@echo "$(CYAN)啟動 MCP Server (SSE 模式)...$(NC)"
	@cd ~/project/graphiti/mcp_server && nohup uv run graphiti_mcp_server.py --transport sse > /tmp/graphiti.log 2>&1 &
	@sleep 3
	@echo "$(GREEN)✅ Graphiti 已啟動在 http://localhost:8000$(NC)"
	@echo "$(BLUE)💡 Claude 已經設定好連接，可以直接使用記憶功能$(NC)"
	@echo "$(YELLOW)📝 日誌檔案: /tmp/graphiti.log$(NC)"

## 停止 Graphiti
graphiti-stop:
	@echo "$(YELLOW)🛑 停止 Graphiti Memory 系統$(NC)"
	@pkill -f "graphiti_mcp_server.py" || true
	@cd ~/project/graphiti/mcp_server && docker compose down
	@echo "$(GREEN)✅ Graphiti 已停止$(NC)"

## 檢查 Graphiti 狀態
graphiti-status:
	@echo "$(BLUE)📊 Graphiti 系統狀態$(NC)"
	@echo "$(CYAN)Docker 服務:$(NC)"
	@docker ps | grep -E "neo4j|mcp" || echo "  未運行"
	@echo "$(CYAN)MCP Server 進程:$(NC)"
	@ps aux | grep graphiti_mcp_server.py | grep -v grep || echo "  未運行"
	@echo "$(CYAN)健康檢查:$(NC)"
	@curl -s http://localhost:8000/sse 2>/dev/null > /dev/null && echo "  ✅ MCP Server 正常" || echo "  ❌ MCP Server 無回應"

## Claude 專用初始化（含 Graphiti）
claude-init: graphiti
	@echo "$(GREEN)🤖 Claude 開發環境初始化完成$(NC)"
	@echo "$(BLUE)記憶系統已啟動，Claude 會自動：$(NC)"
	@echo "  - 查詢你的開發偏好和專案資訊"
	@echo "  - 遵守 TDD 流程和禁止 any 類型規則"
	@echo "  - 記錄新的需求和 bug 修復歷史"

#=============================================================================
# 幫助
#=============================================================================

help:
	@echo "$(GREEN)🚀 AI Square Development Makefile$(NC)"
	@echo ""
	@echo "$(YELLOW)=== Claude 記憶系統（一鍵啟動）===$(NC)"
	@echo "$(CYAN)簡單使用:$(NC)"
	@echo "  $(GREEN)make claude-init$(NC)                                   - 🧠 啟動 Claude 記憶系統（推薦）"
	@echo "  $(GREEN)make graphiti-status$(NC)                               - 📊 檢查記憶系統狀態"
	@echo "  $(GREEN)make graphiti-stop$(NC)                                 - 🛑 停止記憶系統"
	@echo ""
	@echo "$(CYAN)Graphiti 記憶系統:$(NC)"
	@echo "  $(GREEN)make claude-init$(NC)                                   - Claude 專用初始化（含記憶系統）"
	@echo "  $(GREEN)make graphiti$(NC)                                      - 啟動 Graphiti MCP Server"
	@echo "  $(GREEN)make graphiti-stop$(NC)                                 - 停止 Graphiti"
	@echo "  $(GREEN)make graphiti-status$(NC)                               - 檢查 Graphiti 狀態"
	@echo ""
	@echo "$(YELLOW)=== 開發命令 ===$(NC)"
	@echo "$(CYAN)應用程式執行:$(NC)"
	@echo "  $(GREEN)make dev$(NC)                                       - 同時啟動前後端"
	@echo "  $(GREEN)make run-frontend$(NC)                              - 啟動前端開發伺服器"
	@echo "  $(GREEN)make run-backend$(NC)                               - 啟動後端開發伺服器"
	@echo "  $(GREEN)make run-cms$(NC)                                   - 啟動 CMS 開發伺服器 (port 3001)"
	@echo ""
	@echo "$(CYAN)開發環境:$(NC)"
	@echo "  $(GREEN)make dev-setup$(NC)                                 - 初始化開發環境"
	@echo "  $(GREEN)make dev-install$(NC)                               - 安裝相依套件"
	@echo "  $(GREEN)make dev-update$(NC)                                - 更新相依套件"
	@echo ""
	@echo "$(CYAN)資料庫管理:$(NC)"
	@echo "  $(GREEN)make db-init$(NC)                                   - 初始化本地資料庫（含 demo users）"
	@echo "  $(GREEN)make db-up$(NC)                                     - 啟動本地 PostgreSQL"
	@echo "  $(GREEN)make db-down$(NC)                                   - 停止本地 PostgreSQL"
	@echo "  $(GREEN)make db-reset$(NC)                                  - 重置資料庫（清空並重新初始化）"
	@echo "  $(GREEN)make db-seed$(NC)                                   - 載入範例資料"
	@echo "  $(GREEN)make db-status$(NC)                                 - 檢查資料庫狀態"
	@echo "  $(GREEN)make db-shell$(NC)                                  - 進入資料庫 shell（psql）"
	@echo "  $(GREEN)make db-backup$(NC)                                 - 備份資料庫"
	@echo "  $(GREEN)make db-restore FILE=backup.sql$(NC)                - 還原資料庫"
	@echo ""
	@echo "$(CYAN)品質檢查:$(NC)"
	@echo "  $(RED)make pre-commit-check$(NC)                          - 🔍 Commit 前必須執行的檢查 $(YELLOW)(重要!)$(NC)"
	@echo "  $(GREEN)make dev-quality$(NC)                               - 執行所有品質檢查"
	@echo "  $(GREEN)make dev-lint$(NC)                                  - 執行程式碼檢查"
	@echo "  $(GREEN)make dev-typecheck$(NC)                             - 執行型別檢查"
	@echo ""
	@echo "$(CYAN)測試:$(NC)"
	@echo "  $(GREEN)make test-all$(NC)                                  - 執行所有測試"
	@echo "  $(GREEN)make test-frontend$(NC)                             - 執行前端測試"
	@echo "  $(GREEN)make test-backend$(NC)                              - 執行後端測試"
	@echo "  $(GREEN)make test-e2e$(NC)                                  - 執行 E2E 測試"
	@echo ""
	@echo "$(YELLOW)=== 建置與部署 ===$(NC)"
	@echo "$(CYAN)建置:$(NC)"
	@echo "  $(GREEN)make build-frontend$(NC)                            - 建置前端生產版本"
	@echo "  $(GREEN)make build-docker-image$(NC)                        - 建置 Docker 映像"
	@echo ""
	@echo "$(CYAN)部署準備:$(NC)"
	@echo "  $(GREEN)make setup-secrets$(NC)                             - 設定所有 Secret Manager"
	@echo "  $(GREEN)make setup-service-accounts$(NC)                    - 創建 Service Accounts"
	@echo "  $(GREEN)make check-deploy-size$(NC)                         - 檢查部署大小"
	@echo ""
	@echo "$(CYAN)部署:$(NC)"
	@echo "  $(GREEN)make deploy-gcp$(NC)                                - 完整部署前端到 Google Cloud"
	@echo "  $(GREEN)make deploy-cms-gcp$(NC)                            - 完整部署 CMS 到 Google Cloud"
	@echo "  $(GREEN)make gcp-build-and-push$(NC)                        - Cloud Build 並推送前端"
	@echo "  $(GREEN)make cms-build-and-push$(NC)                        - Cloud Build 並推送 CMS"
	@echo "  $(GREEN)make gcp-deploy-frontend$(NC)                       - 部署前端到 Cloud Run"
	@echo "  $(GREEN)make gcp-deploy-cms$(NC)                            - 部署 CMS 到 Cloud Run"
	@echo "  $(GREEN)make deploy-backend-gcp$(NC)                        - 部署後端到 GCP"
	@echo ""
	@echo "$(CYAN)部署檢查:$(NC)"
	@echo "  $(GREEN)make check-deployment$(NC)                          - 檢查部署狀態"
	@echo ""
	@echo "$(YELLOW)=== 截圖與展示 ===$(NC)"
	@echo "  $(GREEN)make build-journey$(NC)                             - 截取六大關鍵路徑畫面"
	@echo "  $(GREEN)make logs-cms$(NC)                                   - 檢視 CMS 日誌"
	@echo "  $(GREEN)make logs-frontend$(NC)                              - 檢視前端日誌"
	@echo ""
	@echo "$(YELLOW)=== 維護命令 ===$(NC)"
	@echo "  $(GREEN)make clean$(NC)                                     - 清理建置產物"
	@echo "  $(GREEN)make clean-all$(NC)                                 - 深度清理（含 node_modules）"
	@echo ""

#=============================================================================
# 開發指令
#=============================================================================

## 前端開發
run-frontend:
	@echo "$(GREEN)🚀 啟動前端開發伺服器$(NC)"
	cd frontend && npm run dev

## 後端開發
run-backend:
	@echo "$(GREEN)🚀 啟動後端開發伺服器$(NC)"
	cd backend && source venv/bin/activate && uvicorn main:app --reload

## CMS 開發
run-cms:
	@echo "$(GREEN)🚀 啟動 CMS 開發伺服器 (port 3001)$(NC)"
	cd cms && npm run dev -- --port 3001

## 同時啟動前後端
dev:
	@echo "$(GREEN)🚀 啟動完整開發環境$(NC)"
	@make -j2 run-frontend run-backend

## 開發環境設置
dev-setup: dev-install
	@echo "$(BLUE)🔧 設置開發環境...$(NC)"
	@echo "$(GREEN)✅ 開發環境設置完成$(NC)"

## 安裝相依套件
dev-install:
	@echo "$(BLUE)📦 安裝專案相依套件...$(NC)"
	cd frontend && npm install
	@echo "$(GREEN)✅ 相依套件安裝完成$(NC)"

## 更新相依套件
dev-update:
	@echo "$(BLUE)🔄 更新專案相依套件...$(NC)"
	cd frontend && npm update
	@echo "$(GREEN)✅ 相依套件更新完成$(NC)"


#=============================================================================
# 建置指令
#=============================================================================

## 建置前端
build-frontend: validate-scenarios
	@echo "$(BLUE)🔨 建置前端生產版本$(NC)"
	cd frontend && npm run build

## 建置 Docker 映像
build-docker-image:
	@echo "$(BLUE)🐳 建置 Docker 映像$(NC)"
	cd frontend && docker build -t ai-square-frontend .

#=============================================================================
# 測試指令
#=============================================================================

## 執行前端測試
test-frontend:
	@echo "$(YELLOW)🧪 執行前端測試$(NC)"
	cd frontend && npm run test:ci

## 執行後端測試
test-backend:
	@echo "$(YELLOW)🧪 執行後端測試$(NC)"
	cd backend && python -m pytest

## 執行所有測試
test-all: test-frontend test-backend

## 執行前端 E2E 測試
test-e2e:
	@echo "$(YELLOW)🧪 執行 E2E 測試$(NC)"
	cd frontend && npx playwright test

#=============================================================================
# 程式碼品質
#=============================================================================

## 前端 lint（已定義在下方）
# dev-lint: 定義在下方

## 前端型別檢查（已定義在下方）
# dev-typecheck: 定義在下方

## 後端 lint
lint-backend:
	@echo "$(CYAN)🔍 檢查後端程式碼品質$(NC)"
	cd backend && python -m ruff check .

## 執行所有品質檢查（已定義在下方）
# dev-quality: 定義在下方

#=============================================================================
# 部署指令
#=============================================================================

# Google Cloud 設定
# Google Cloud 配置 - 請通過環境變數設定
# 例如: export PROJECT_ID=your-project-id
PROJECT_ID ?= $(shell gcloud config get-value project 2>/dev/null || echo "PLEASE_SET_PROJECT_ID")
IMAGE_NAME = ai-square-frontend
GCR_IMAGE = gcr.io/$(PROJECT_ID)/$(IMAGE_NAME)

## 檢查部署大小（排除 .gcloudignore 的檔案）
check-deploy-size:
	@echo "$(CYAN)📏 檢查部署大小...$(NC)"
	@echo "前端部署大小:"
	@cd frontend && du -sh . 2>/dev/null | cut -f1
	@echo "將排除的檔案:"
	@cd frontend && find . -name "*.test.*" -o -name "__tests__" -o -name "coverage" -o -name "e2e" | head -10
	@echo "..."

## Google Cloud Build 並推送
gcp-build-and-push:
	@echo "$(BLUE)☁️  使用 Cloud Build 建置並推送映像$(NC)"
	@echo "$(YELLOW)📦 將上傳的內容大小:$(NC)"
	@cd frontend && gcloud meta list-files-for-upload . | wc -l | xargs echo "檔案數:"
	@cd frontend && gcloud meta list-files-for-upload . | xargs du -ch 2>/dev/null | tail -1 | cut -f1 | xargs echo "總大小:"
	cd frontend && gcloud builds submit --tag $(GCR_IMAGE)

## 部署前端到 Cloud Run (使用 Secret Manager)
gcp-deploy-frontend:
	@echo "$(GREEN)🚀 部署前端到 Cloud Run (使用 Secret Manager)$(NC)"
	gcloud run deploy $(IMAGE_NAME) \
		--image $(GCR_IMAGE) \
		--platform managed \
		--region asia-east1 \
		--port 3000 \
		--allow-unauthenticated \
		--set-secrets="GCS_BUCKET_NAME=gcs-bucket-name:latest" \
		--set-env-vars="GOOGLE_CLOUD_PROJECT=$(PROJECT_ID)" \
		--service-account="ai-square-frontend@$(PROJECT_ID).iam.gserviceaccount.com"

## 建置 CMS Docker 映像
build-cms-image:
	@echo "$(BLUE)🐳 建置 CMS Docker 映像$(NC)"
	cd cms && docker build -t ai-square-cms .

## CMS Cloud Build 並推送
cms-build-and-push:
	@echo "$(BLUE)☁️  使用 Cloud Build 建置並推送 CMS 映像$(NC)"
	@echo "$(YELLOW)📦 將上傳的 CMS 內容大小:$(NC)"
	@cd cms && gcloud meta list-files-for-upload . | wc -l | xargs echo "檔案數:"
	@cd cms && gcloud meta list-files-for-upload . | xargs du -ch 2>/dev/null | tail -1 | cut -f1 | xargs echo "總大小:"
	cd cms && gcloud builds submit --tag gcr.io/$(PROJECT_ID)/ai-square-cms

## 部署 CMS 到 Cloud Run (使用 Secret Manager)
gcp-deploy-cms:
	@echo "$(GREEN)🚀 部署 CMS 到 Cloud Run (使用 Secret Manager)$(NC)"
	gcloud run deploy ai-square-cms \
		--image gcr.io/$(PROJECT_ID)/ai-square-cms \
		--platform managed \
		--region asia-east1 \
		--port 3000 \
		--allow-unauthenticated \
		--set-secrets="GITHUB_TOKEN=github-token:latest,GOOGLE_APPLICATION_CREDENTIALS_JSON=google-cloud-key:latest,GITHUB_OWNER=github-owner:latest,GITHUB_REPO=github-repo:latest,GOOGLE_CLOUD_PROJECT_ID=google-cloud-project-id:latest,GOOGLE_CLOUD_LOCATION=google-cloud-location:latest" \
		--service-account="ai-square-cms@$(PROJECT_ID).iam.gserviceaccount.com" \
		--memory="1Gi" \
		--cpu="1" \
		--concurrency="10" \
		--max-instances="5"

## 完整部署 CMS 到 GCP
deploy-cms-gcp: build-cms-image cms-build-and-push gcp-deploy-cms
	@echo "$(GREEN)✅ CMS 部署完成！$(NC)"

## 重新命名舊的部署命令以保持向後兼容
gcp-deploy-service: gcp-deploy-frontend

## 設定 Google Secret Manager (前端)
setup-secrets-frontend:
	@echo "$(BLUE)🔐 設定前端 Google Secret Manager$(NC)"
	@echo "$(YELLOW)📝 創建 GCS Bucket Name secret...$(NC)"
	@read -p "請輸入 GCS Bucket 名稱: " bucket_name; \
	echo -n "$$bucket_name" | gcloud secrets create gcs-bucket-name \
		--replication-policy="automatic" \
		--data-file=- \
		--project=$(PROJECT_ID) || echo "Secret 已存在"
	@echo "$(YELLOW)🔑 授予 Service Account 讀取權限...$(NC)"
	gcloud secrets add-iam-policy-binding gcs-bucket-name \
		--member="serviceAccount:ai-square-frontend@$(PROJECT_ID).iam.gserviceaccount.com" \
		--role="roles/secretmanager.secretAccessor" \
		--project=$(PROJECT_ID)
	@echo "$(GREEN)✅ 前端 Secret Manager 設定完成！$(NC)"


## 創建必要的 Service Accounts
setup-service-accounts:
	@echo "$(BLUE)👤 創建 Service Accounts$(NC)"
	
	@# Frontend Service Account
	@gcloud iam service-accounts create ai-square-frontend \
		--description="AI Square Frontend Service Account" \
		--display-name="AI Square Frontend" \
		--project=$(PROJECT_ID) || echo "Frontend SA 已存在"
	
	@echo "$(YELLOW)🔑 授予必要權限...$(NC)"
	@# Frontend permissions
	@gcloud projects add-iam-policy-binding $(PROJECT_ID) \
		--member="serviceAccount:ai-square-frontend@$(PROJECT_ID).iam.gserviceaccount.com" \
		--role="roles/storage.objectViewer"
	
	@echo "$(GREEN)✅ Service Accounts 創建完成！$(NC)"

## 完整設定所有 secrets
setup-secrets: setup-service-accounts setup-secrets-frontend

## 檢查部署狀態
check-deployment:
	@echo "$(BLUE)📊 檢查部署狀態$(NC)"
	@echo "$(YELLOW)Cloud Run 服務:$(NC)"
	@gcloud run services list --region=asia-east1 --project=$(PROJECT_ID)
	@echo "\n$(YELLOW)Secret Manager:$(NC)"
	@gcloud secrets list --project=$(PROJECT_ID) | grep -E "(github-token|google-cloud-key|gcs-bucket-name)"
	@echo "\n$(YELLOW)Service Accounts:$(NC)"
	@gcloud iam service-accounts list --project=$(PROJECT_ID) | grep ai-square

## 檢視 CMS 日誌
logs-cms:
	@echo "$(BLUE)📝 檢視 CMS 日誌$(NC)"
	@gcloud run services logs read ai-square-cms --region=asia-east1 --project=$(PROJECT_ID) --limit=50

## 檢視前端日誌
logs-frontend:
	@echo "$(BLUE)📝 檢視前端日誌$(NC)"
	@gcloud run services logs read ai-square-frontend --region=asia-east1 --project=$(PROJECT_ID) --limit=50

## 驗證 PBL 情境檔案
validate-scenarios:
	@echo "$(CYAN)🔍 驗證 PBL 情境檔案...$(NC)"
	@cd frontend && node scripts/validate-scenarios.js
	@echo "$(GREEN)✅ PBL 情境驗證完成$(NC)"

## 完整部署到 Google Cloud Platform
deploy-gcp: validate-scenarios build-frontend build-docker-image gcp-build-and-push gcp-deploy-service
	@echo "$(GREEN)✅ 部署完成！$(NC)"

## 部署後端到 Google Cloud Run
deploy-backend-gcp:
	@echo "$(GREEN)☁️  部署後端到 Google Cloud Run$(NC)"
	gcloud run deploy ai-square-backend \
		--source backend \
		--region asia-east1 \
		--allow-unauthenticated

#=============================================================================
# 截圖命令
#=============================================================================

## 截取六大關鍵路徑畫面
build-journey:
	@echo "$(CYAN)📸 開始截取六大關鍵路徑畫面...$(NC)"
	@echo "$(YELLOW)確保 dev server 正在運行 (make dev)$(NC)"
	@cd frontend && npx tsx scripts/capture-six-paths.ts
	@echo "$(GREEN)✅ 截圖完成！檔案位於 frontend/public/screenshots/$(NC)"
	@echo "$(BLUE)💡 提示: 截圖已自動更新到 /about/journey 頁面$(NC)"

#=============================================================================
# 品質檢查命令（避免重複定義）
#=============================================================================

## 執行程式碼檢查
dev-lint:
	@echo "$(CYAN)🔍 執行程式碼品質檢查...$(NC)"
	cd frontend && npm run lint

## 執行型別檢查
dev-typecheck:
	@echo "$(CYAN)📝 執行 TypeScript 型別檢查...$(NC)"
	cd frontend && npx tsc --noEmit

## 執行所有品質檢查
dev-quality: dev-lint dev-typecheck validate-scenarios
	@echo "$(GREEN)✅ 所有品質檢查通過$(NC)"

## Pre-commit 檢查 - 確保遵守 CLAUDE.md 規則
pre-commit-check:
	@echo "$(BLUE)🔍 執行 pre-commit 檢查...$(NC)"
	@echo "$(YELLOW)1️⃣ ESLint 檢查變更的檔案...$(NC)"
	@cd frontend && npx eslint $$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$$') || (echo "$(RED)❌ ESLint 檢查失敗$(NC)" && exit 1)
	@echo "$(GREEN)✅ ESLint 檢查通過$(NC)"
	@echo ""
	@echo "$(YELLOW)2️⃣ TypeScript 類型檢查...$(NC)"
	@cd frontend && npx tsc --noEmit || (echo "$(RED)❌ TypeScript 檢查失敗$(NC)" && exit 1)
	@echo "$(GREEN)✅ TypeScript 檢查通過$(NC)"
	@echo ""
	@echo "$(YELLOW)3️⃣ 執行測試...$(NC)"
	@cd frontend && npm run test:ci || (echo "$(RED)❌ 測試失敗$(NC)" && exit 1)
	@echo "$(GREEN)✅ 測試通過$(NC)"
	@echo ""
	@echo "$(YELLOW)4️⃣ Build 檢查...$(NC)"
	@cd frontend && npm run build || (echo "$(RED)❌ Build 失敗$(NC)" && exit 1)
	@echo "$(GREEN)✅ Build 通過$(NC)"
	@echo ""
	@echo "$(YELLOW)5️⃣ CLAUDE.md 合規檢查清單:$(NC)"
	@echo "   請手動確認:"
	@echo "   $(CYAN)[ ]$(NC) 時間戳記欄位使用正確命名 (createdAt, startedAt, completedAt, updatedAt)"
	@echo "   $(CYAN)[ ]$(NC) 沒有使用 'any' 類型"
	@echo "   $(CYAN)[ ]$(NC) PostgreSQL 欄位映射正確 (created_at → createdAt)"
	@echo "   $(CYAN)[ ]$(NC) 已檢查 git log 避免重複修改"
	@echo "   $(CYAN)[ ]$(NC) 遵循既有的程式碼模式"
	@echo "   $(CYAN)[ ]$(NC) Commit message 使用英文"
	@echo "   $(CYAN)[ ]$(NC) 等待用戶確認後才 commit"
	@echo ""
	@echo "$(GREEN)✅ 所有自動化檢查通過！手動確認後即可 commit。$(NC)"

#=============================================================================
# 清理命令
#=============================================================================

## 清理建置產物
clean:
	@echo "$(YELLOW)🧹 清理建置產物...$(NC)"
	rm -rf frontend/.next/
	rm -rf frontend/out/
	rm -rf frontend/dist/
	rm -rf coverage/
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -exec rm -f {} + 2>/dev/null || true
	cd backend && rm -rf .pytest_cache 2>/dev/null || true
	@echo "$(GREEN)✅ 清理完成$(NC)"

## 深度清理（包含 node_modules）
clean-all: clean
	@echo "$(RED)🗑️  深度清理...$(NC)"
	rm -rf frontend/node_modules/
	rm -rf backend/__pycache__/
	rm -rf backend/venv/
	@echo "$(GREEN)✅ 深度清理完成$(NC)"

#=============================================================================
# 資料庫管理命令
#=============================================================================

## 初始化本地資料庫（包含 demo users 和 scenarios）
db-init:
	@echo "$(GREEN)🗄️  初始化本地資料庫...$(NC)"
	@cd frontend && make -f Makefile.db db-init
	@echo "$(GREEN)✅ 資料庫初始化完成！$(NC)"

## 重置資料庫（清空並重新初始化）
db-reset:
	@echo "$(RED)⚠️  重置資料庫...$(NC)"
	@cd frontend && make -f Makefile.db db-reset
	@echo "$(GREEN)✅ 資料庫已重置$(NC)"

## 載入範例資料
db-seed:
	@echo "$(BLUE)🌱 載入範例資料...$(NC)"
	@cd frontend && make -f Makefile.db db-seed
	@echo "$(GREEN)✅ 範例資料載入完成$(NC)"

## 啟動本地 PostgreSQL
db-up:
	@echo "$(GREEN)🚀 啟動本地 PostgreSQL...$(NC)"
	@cd frontend && make -f Makefile.db db-up

## 停止本地 PostgreSQL
db-down:
	@echo "$(YELLOW)🛑 停止本地 PostgreSQL...$(NC)"
	@cd frontend && make -f Makefile.db db-down

## 資料庫備份
db-backup:
	@echo "$(BLUE)💾 備份資料庫...$(NC)"
	@cd frontend && make -f Makefile.db db-backup
	@echo "$(GREEN)✅ 備份完成$(NC)"

## 資料庫還原
db-restore:
	@echo "$(YELLOW)📥 還原資料庫...$(NC)"
	@cd frontend && make -f Makefile.db db-restore FILE=$(FILE)
	@echo "$(GREEN)✅ 還原完成$(NC)"

## 檢查資料庫狀態
db-status:
	@echo "$(CYAN)📊 檢查資料庫狀態...$(NC)"
	@cd frontend && make -f Makefile.db db-status

## 資料庫遷移
db-migrate:
	@echo "$(BLUE)🔄 執行資料庫遷移...$(NC)"
	@cd frontend && make -f Makefile.db db-migrate
	@echo "$(GREEN)✅ 遷移完成$(NC)"

## 執行 psql（交互式資料庫 shell）
db-shell:
	@echo "$(CYAN)🖥️  進入資料庫 shell...$(NC)"
	@cd frontend && make -f Makefile.db db-shell

## 檢視資料庫日誌
db-logs:
	@echo "$(BLUE)📋 檢視資料庫日誌...$(NC)"
	@cd frontend && make -f Makefile.db db-logs

## 清理資料庫備份
db-clean-backups:
	@echo "$(YELLOW)🧹 清理舊備份...$(NC)"
	@cd frontend && make -f Makefile.db db-clean-backups
	@echo "$(GREEN)✅ 清理完成$(NC)"

#=============================================================================
# AI 專用配置
#=============================================================================

# 減少輸出雜訊，讓 AI 更容易解析
export MAKEFLAGS += --no-print-directory

# 自動記錄執行時間
SHELL = /bin/bash
.SHELLFLAGS = -ec

