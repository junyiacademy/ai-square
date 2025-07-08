# 現代化 AI 開發流程 - 整合式票券版本
# 單一檔案包含規格、開發日誌、測試報告、AI追蹤

# 預設變數
TYPE ?= feature
COMPLEXITY ?= medium
TASK_TYPE ?= development
ACTION ?= ""
FILES ?= ""
DESC ?= ""

.PHONY: ai-new ai-start ai-save ai-done ai-fix ai-review ai-report ai-log help \
        dev run-frontend run-frontend-v2 run-backend run-cms \
        dev-setup dev-install dev-update \
        dev-workflow-check dev-secret-check dev-tdd-check dev-tdd-enforce \
        build-frontend build-docker-image check-deploy-size \
        gcp-build-and-push gcp-deploy-service deploy-gcp deploy-backend-gcp \
        test-frontend test-backend test-all test-e2e test-smart \
        dev-lint dev-typecheck dev-quality lint-backend \
        clean clean-all build-journey

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
# 核心命令（覆蓋 80% 使用場景）
#=============================================================================

## 開始新工作（創建整合式票券）
ai-new:
	@echo "$(GREEN)🚀 創建整合式票券: $(TICKET)$(NC)"
	@echo "$(CYAN)📁 初始化票券系統...$(NC)"
	@python3 docs/scripts/enhanced-ticket-manager.py init \
		--type=$(TYPE) \
		--name=$(TICKET) \
		--desc="$(DESC)"
	@echo "$(BLUE)📊 票券已包含所有必要元素（規格、日誌、測試、AI追蹤）$(NC)"
	@echo "$(YELLOW)💡 提示: 請編輯票券檔案更新規格後開始開發$(NC)"

## 開始任務（標記開始時間）
ai-start:
	@echo "$(GREEN)▶️  開始任務...$(NC)"
	@python3 docs/scripts/ai-usage-estimator.py record \
		--complexity=$(COMPLEXITY) \
		--type=$(TASK_TYPE) \
		--desc="開始: $(DESC)" \
		--start
	@echo "$(YELLOW)⏱️  已記錄任務開始時間$(NC)"

## 保存進度到整合式票券
ai-save:
	@echo "$(YELLOW)💾 保存進度到整合式票券...$(NC)"
	@# 記錄 AI 使用（基於複雜度估算）
	@echo "$(CYAN)🤖 記錄 AI 互動...$(NC)"
	@python3 docs/scripts/ai-usage-estimator.py record \
		--complexity=$(COMPLEXITY) \
		--type=$(TASK_TYPE) \
		--desc="$(DESC)"
	@# 記錄開發活動
	@if [ -n "$(ACTION)" ]; then \
		echo "$(CYAN)📝 記錄開發活動...$(NC)"; \
		python3 docs/scripts/devlog-viewer.py add "$(ACTION)" --files $(FILES); \
	fi
	@# 計算實際開發時間（基於檔案修改時間）
	@echo "$(CYAN)⏱️  更新時間統計...$(NC)"
	@python3 docs/scripts/enhanced-ticket-manager.py duration
	@echo "\n$(GREEN)✅ 進度已保存到票券$(NC)"


## 完成工作（完整性檢查 + 測試 + 提交）
ai-done:
	@echo "$(GREEN)🏁 開始完成工作流程$(NC)"
	@echo "\n$(CYAN)📋 檢查完成度...$(NC)"
	@python3 docs/scripts/enhanced-ticket-manager.py check
	@echo "\n$(CYAN)🧪 執行測試...$(NC)"
	@make -s test-smart
	@echo "\n$(CYAN)📊 生成 AI 使用報告...$(NC)"
	@python3 docs/scripts/ai-usage-estimator.py report
	@echo "\n$(CYAN)💬 智能提交...$(NC)"
	@python3 docs/scripts/integrated-commit.py --auto
	@echo "\n$(CYAN)🔀 合併到主分支...$(NC)"
	@current_branch=$$(git branch --show-current); \
	git checkout main && \
	git merge --no-ff $$current_branch -m "Merge $$current_branch"
	@echo "\n$(CYAN)📁 自動歸檔票券...$(NC)"
	@python3 docs/scripts/auto-archive-ticket.py
	@echo "\n$(GREEN)✅ 工作完成！$(NC)"

#=============================================================================
# AI 輔助命令（20% 特殊場景）
#=============================================================================

## AI 自動修復問題
ai-fix:
	@echo "$(YELLOW)🔧 AI 自動修復模式$(NC)"
	@# 收集錯誤信息
	@make test-smart > /tmp/test-errors.log 2>&1 || true
	@# 讓 AI 分析並修復
	@echo "$(CYAN)分析測試錯誤...$(NC)"
	@if [ -s /tmp/test-errors.log ]; then \
		echo "$(RED)發現以下錯誤:$(NC)"; \
		cat /tmp/test-errors.log | grep -E "(FAIL|ERROR|✗)" | head -10; \
		echo "\n$(BLUE)💡 請使用 AI 協助修復這些問題$(NC)"; \
		echo "$(BLUE)💡 修復後使用 'make ai-save' 保存進度$(NC)"; \
	else \
		echo "$(GREEN)✅ 沒有發現錯誤$(NC)"; \
	fi

## AI Code Review
ai-review:
	@echo "$(BLUE)🔍 AI Code Review$(NC)"
	@git diff --cached > /tmp/review.diff
	@echo "$(CYAN)變更摘要:$(NC)"
	@git diff --cached --stat
	@echo "\n$(CYAN)變更內容預覽:$(NC)"
	@git diff --cached --color | head -50
	@echo "\n$(BLUE)💡 請使用 AI 進行代碼審查$(NC)"
	@echo "$(BLUE)💡 重點關注: 代碼品質、安全性、性能$(NC)"

## 檢視開發日誌
ai-log:
	@echo "$(CYAN)📋 檢視開發日誌...$(NC)"
	@python3 docs/scripts/devlog-viewer.py view
	@echo ""

#=============================================================================
# 智能測試（自動選擇相關測試）
#=============================================================================

test-smart:
	@echo "$(YELLOW)🧪 智能測試模式$(NC)"
	@# 偵測變更的檔案
	@changed_files=$$(git diff --name-only HEAD~1..HEAD 2>/dev/null | grep -E '\.(ts|tsx|js|jsx)$$' || \
		git diff --name-only --cached | grep -E '\.(ts|tsx|js|jsx)$$' || true); \
	if [ -n "$$changed_files" ]; then \
		echo "$(CYAN)偵測到變更檔案:$(NC)"; \
		echo "$$changed_files" | sed 's/^/  - /'; \
		echo "\n$(CYAN)執行相關測試...$(NC)"; \
		cd frontend && npm test -- --findRelatedTests $$changed_files --passWithNoTests || true; \
	else \
		echo "$(CYAN)執行基礎測試套件...$(NC)"; \
		cd frontend && npm test -- --coverage=false --passWithNoTests || true; \
	fi

#=============================================================================
# 效率報告
#=============================================================================

## 顯示整合式報告
ai-report:
	@echo "$(BLUE)📊 整合式開發報告$(NC)"
	@echo "\n$(CYAN)=== AI 使用報告 ===$(NC)"
	@python3 docs/scripts/ai-usage-estimator.py report 2>/dev/null || \
		echo "$(YELLOW)尚未記錄 AI 使用$(NC)"
	@echo "\n$(CYAN)=== 開發日誌摘要 ===$(NC)"
	@python3 docs/scripts/devlog-viewer.py summary 2>/dev/null || \
		echo "$(YELLOW)尚無開發日誌$(NC)"
	@echo "\n$(CYAN)=== 完成度檢查 ===$(NC)"
	@python3 docs/scripts/enhanced-ticket-manager.py check 2>/dev/null || \
		echo "$(YELLOW)尚無活躍票券$(NC)"


#=============================================================================
# 智能補票系統
#=============================================================================

## 查找沒有票券的 commits
orphan-commits:
	@echo "$(YELLOW)🔍 查找沒有票券的 commits$(NC)"
	@python3 docs/scripts/ticket-repair-tool.py orphans --days 30

## 智能補票預覽（推薦先執行）
smart-tickets-preview:
	@echo "$(YELLOW)👀 預覽智能補票分組結果$(NC)"
	@python3 docs/scripts/smart-ticket-creator.py --days 30 --dry-run

## 智能補票（自動分組相關 commits）
smart-tickets:
	@echo "$(BLUE)🤖 智能分析 commits 並自動補票$(NC)"
	@python3 docs/scripts/smart-ticket-creator.py --days 30

## 批次創建票券（選擇性創建）
batch-tickets:
	@echo "$(BLUE)📦 批次創建票券$(NC)"
	@if [ -z "$(TICKETS)" ] && [ -z "$(RECENT)" ] && [ -z "$(TYPE)" ]; then \
		echo "$(CYAN)用法:$(NC)"; \
		echo "  make batch-tickets TICKETS=1,3,5-8  # 創建特定編號"; \
		echo "  make batch-tickets RECENT=5         # 創建最近 5 個"; \
		echo "  make batch-tickets TYPE=fix         # 創建所有 fix 類型"; \
		exit 1; \
	fi
	@python3 docs/scripts/batch-ticket-creator.py --days 30 \
		$$([ -n "$(TICKETS)" ] && echo "--tickets $(TICKETS)") \
		$$([ -n "$(RECENT)" ] && echo "--recent $(RECENT)") \
		$$([ -n "$(TYPE)" ] && echo "--type $(TYPE)")

## 從單個 commit 創建票券
ticket-from-commit:
	@if [ -z "$(COMMIT)" ]; then \
		echo "$(RED)❌ 請提供 COMMIT 參數$(NC)"; \
		echo "$(CYAN)用法: make ticket-from-commit COMMIT=abc123 TYPE=feature$(NC)"; \
		exit 1; \
	fi
	@python3 docs/scripts/ticket-repair-tool.py create --commit $(COMMIT) --type $(TYPE)

#=============================================================================
# 幫助
#=============================================================================

help:
	@echo "$(GREEN)🚀 現代化 AI 開發流程 - 完整版$(NC)"
	@echo ""
	@echo "$(YELLOW)=== AI 工作流程命令 ===$(NC)"
	@echo "$(CYAN)核心流程:$(NC)"
	@echo "  $(GREEN)make ai-new$(NC) TYPE=feature TICKET=name DESC=\"描述\"  - 開始新工作"
	@echo "  $(GREEN)make ai-start$(NC) DESC=\"任務描述\"                      - 標記任務開始時間"
	@echo "  $(GREEN)make ai-save$(NC) COMPLEXITY=medium DESC=\"描述\"         - 保存進度（整合式票券）"
	@echo "  $(GREEN)make ai-done$(NC)                                       - 完成工作"
	@echo ""
	@echo "$(CYAN)AI 輔助:$(NC)"
	@echo "  $(GREEN)make ai-fix$(NC)                                        - AI 自動修復"
	@echo "  $(GREEN)make ai-review$(NC)                                     - AI Code Review"
	@echo "  $(GREEN)make ai-report$(NC)                                     - 整合式報告"
	@echo "  $(GREEN)make ai-log$(NC)                                        - 檢視開發日誌"
	@echo ""
	@echo "$(CYAN)智能補票:$(NC)"
	@echo "  $(GREEN)make orphan-commits$(NC)                                - 查找沒票的 commits"
	@echo "  $(GREEN)make smart-tickets-preview$(NC)                         - 預覽智能分組"
	@echo "  $(GREEN)make smart-tickets$(NC)                                 - 智能補票（互動式）"
	@echo "  $(GREEN)make batch-tickets$(NC) RECENT=5                        - 批次補票"
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
	@echo "$(CYAN)品質檢查:$(NC)"
	@echo "  $(GREEN)make dev-quality$(NC)                               - 執行所有品質檢查"
	@echo "  $(GREEN)make dev-lint$(NC)                                  - 執行程式碼檢查"
	@echo "  $(GREEN)make dev-typecheck$(NC)                             - 執行型別檢查"
	@echo "  $(GREEN)make dev-tdd-check$(NC)                             - 執行 TDD 合規檢查"
	@echo "  $(GREEN)make dev-workflow-check$(NC)                        - 執行工作流程檢查"
	@echo "  $(GREEN)make dev-secret-check$(NC)                          - 執行 Secret 安全檢查"
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
	@echo "$(BLUE)💡 環境變數:$(NC)"
	@echo "  TYPE=feature                                    - 票券類型 (feature/fix/refactor)"
	@echo "  TICKET=name                                     - 票券名稱"
	@echo "  DESC=\"描述\"                                     - 任務描述"
	@echo "  COMPLEXITY=medium                               - 複雜度 (simple/medium/complex/debug)"
	@echo "  TASK_TYPE=development                           - 任務類型"
	@echo "  ACTION=\"完成登入功能\"                            - 活動描述"
	@echo "  FILES=\"file1 file2\"                             - 相關檔案"

#=============================================================================
# 開發指令
#=============================================================================

## 前端開發
run-frontend:
	@echo "$(GREEN)🚀 啟動前端開發伺服器$(NC)"
	cd frontend && npm run dev

run-frontend-v2:
	@echo "$(GREEN)🚀 啟動前端開發伺服器 v2 $(NC)"
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

## 工作流程檢查
dev-workflow-check:
	@echo "$(CYAN)🛡️  執行工作流程檢查...$(NC)"
	@python3 docs/scripts/workflow-guard.py check

## Secret 安全檢查
dev-secret-check:
	@echo "$(CYAN)🔍 執行 Secret 安全檢查...$(NC)"
	@python3 docs/scripts/secret-detector.py

## TDD 合規檢查
dev-tdd-check:
	@echo "$(CYAN)🔍 執行 TDD 合規檢查...$(NC)"
	@python3 docs/scripts/tdd-compliance-checker.py

## TDD 強制檢查（有問題時失敗）
dev-tdd-enforce:
	@echo "$(RED)🚨 執行 TDD 強制檢查...$(NC)"
	@python3 docs/scripts/tdd-compliance-checker.py --fail-on-issues

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

## 設定 CMS Secret Manager
setup-secrets-cms:
	@echo "$(BLUE)🔐 設定 CMS Google Secret Manager$(NC)"
	@echo "$(YELLOW)📝 檢查並創建必要的 secrets...$(NC)"
	
	@# GitHub Token
	@if [ -z "$$GITHUB_TOKEN" ]; then \
		echo "$(RED)❌ GITHUB_TOKEN 環境變數未設定$(NC)"; \
		echo "請先設定: export GITHUB_TOKEN=your_github_token"; \
		exit 1; \
	fi
	@echo -n "$$GITHUB_TOKEN" | gcloud secrets create github-token \
		--replication-policy="automatic" \
		--data-file=- \
		--project=$(PROJECT_ID) || echo "github-token secret 已存在"
	
	@# Google Cloud Key (for Vertex AI)
	@if [ ! -f "ai-square-key.json" ]; then \
		echo "$(RED)❌ ai-square-key.json 檔案不存在$(NC)"; \
		echo "請先下載 Service Account key 到專案根目錄"; \
		exit 1; \
	fi
	@gcloud secrets create google-cloud-key \
		--replication-policy="automatic" \
		--data-file="ai-square-key.json" \
		--project=$(PROJECT_ID) || echo "google-cloud-key secret 已存在"
	
	@# GitHub Owner/Repo
	@echo -n "junyiacademy" | gcloud secrets create github-owner \
		--replication-policy="automatic" \
		--data-file=- \
		--project=$(PROJECT_ID) || echo "github-owner secret 已存在"
	@echo -n "ai-square" | gcloud secrets create github-repo \
		--replication-policy="automatic" \
		--data-file=- \
		--project=$(PROJECT_ID) || echo "github-repo secret 已存在"
	
	@# Google Cloud Project ID
	@echo -n "$(PROJECT_ID)" | gcloud secrets create google-cloud-project-id \
		--replication-policy="automatic" \
		--data-file=- \
		--project=$(PROJECT_ID) || echo "google-cloud-project-id secret 已存在"
	
	@# Google Cloud Location
	@echo -n "us-central1" | gcloud secrets create google-cloud-location \
		--replication-policy="automatic" \
		--data-file=- \
		--project=$(PROJECT_ID) || echo "google-cloud-location secret 已存在"
	
	@echo "$(YELLOW)🔑 授予 CMS Service Account 讀取權限...$(NC)"
	@for secret in github-token google-cloud-key github-owner github-repo google-cloud-project-id google-cloud-location; do \
		gcloud secrets add-iam-policy-binding $$secret \
			--member="serviceAccount:ai-square-cms@$(PROJECT_ID).iam.gserviceaccount.com" \
			--role="roles/secretmanager.secretAccessor" \
			--project=$(PROJECT_ID); \
	done
	@echo "$(GREEN)✅ CMS Secret Manager 設定完成！$(NC)"

## 創建必要的 Service Accounts
setup-service-accounts:
	@echo "$(BLUE)👤 創建 Service Accounts$(NC)"
	
	@# Frontend Service Account
	@gcloud iam service-accounts create ai-square-frontend \
		--description="AI Square Frontend Service Account" \
		--display-name="AI Square Frontend" \
		--project=$(PROJECT_ID) || echo "Frontend SA 已存在"
	
	@# CMS Service Account  
	@gcloud iam service-accounts create ai-square-cms \
		--description="AI Square CMS Service Account" \
		--display-name="AI Square CMS" \
		--project=$(PROJECT_ID) || echo "CMS SA 已存在"
	
	@echo "$(YELLOW)🔑 授予必要權限...$(NC)"
	@# Frontend permissions
	@gcloud projects add-iam-policy-binding $(PROJECT_ID) \
		--member="serviceAccount:ai-square-frontend@$(PROJECT_ID).iam.gserviceaccount.com" \
		--role="roles/storage.objectViewer"
	
	@# CMS permissions (需要更多權限)
	@gcloud projects add-iam-policy-binding $(PROJECT_ID) \
		--member="serviceAccount:ai-square-cms@$(PROJECT_ID).iam.gserviceaccount.com" \
		--role="roles/aiplatform.user"
	@gcloud projects add-iam-policy-binding $(PROJECT_ID) \
		--member="serviceAccount:ai-square-cms@$(PROJECT_ID).iam.gserviceaccount.com" \
		--role="roles/storage.objectAdmin"
	
	@echo "$(GREEN)✅ Service Accounts 創建完成！$(NC)"

## 完整設定所有 secrets
setup-secrets: setup-service-accounts setup-secrets-frontend setup-secrets-cms

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
# AI 專用配置
#=============================================================================

# 減少輸出雜訊，讓 AI 更容易解析
export MAKEFLAGS += --no-print-directory

# 自動記錄執行時間
SHELL = /bin/bash
.SHELLFLAGS = -ec

# 設定預設值
TYPE ?= feature
DESC ?= 
AI_COMPLEXITY ?= medium
AI_TYPE ?= development