# 現代化 AI 開發流程 - 整合式票券版本
# 單一檔案包含規格、開發日誌、測試報告、AI追蹤

# 預設變數
TYPE ?= feature
COMPLEXITY ?= medium
TASK_TYPE ?= development
ACTION ?= ""
FILES ?= ""
DESC ?= ""

.PHONY: ai-new ai-start ai-save ai-done ai-fix ai-review ai-story ai-report ai-log help \
        dev run-frontend run-backend \
        dev-setup dev-install dev-update \
        dev-workflow-check dev-secret-check dev-tdd-check dev-tdd-enforce \
        build-frontend build-docker-image check-deploy-size \
        gcp-build-and-push gcp-deploy-service deploy-gcp deploy-backend-gcp \
        test-frontend test-backend test-all test-e2e test-smart \
        dev-lint dev-typecheck dev-quality lint-backend \
        clean clean-all

# 預設顯示幫助
.DEFAULT_GOAL := help

# 顏色定義
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
RED := \033[0;31m
CYAN := \033[0;36m
NC := \033[0m

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
	@echo "\n$(CYAN)📖 萃取開發故事...$(NC)"
	@python3 docs/scripts/story-extractor.py
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

## 萃取開發故事和經驗
ai-story:
	@echo "$(CYAN)📖 萃取開發故事...$(NC)"
	@python3 docs/scripts/story-extractor.py
	@echo "\n$(GREEN)✅ 故事萃取完成$(NC)"
	@echo "$(YELLOW)💡 查看 docs/stories/ 目錄獲取詳細內容$(NC)"

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
	@echo "  $(GREEN)make ai-story$(NC)                                      - 萃取開發故事"
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
	@echo "$(CYAN)部署:$(NC)"
	@echo "  $(GREEN)make check-deploy-size$(NC)                         - 檢查部署大小"
	@echo "  $(GREEN)make deploy-gcp$(NC)                                - 完整部署到 Google Cloud"
	@echo "  $(GREEN)make gcp-build-and-push$(NC)                        - Cloud Build 並推送"
	@echo "  $(GREEN)make gcp-deploy-service$(NC)                        - 部署服務到 Cloud Run"
	@echo "  $(GREEN)make deploy-backend-gcp$(NC)                        - 部署後端到 GCP"
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

## 後端開發
run-backend:
	@echo "$(GREEN)🚀 啟動後端開發伺服器$(NC)"
	cd backend && source venv/bin/activate && uvicorn main:app --reload

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
build-frontend:
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

## 部署服務到 Cloud Run (使用 Secret Manager)
gcp-deploy-service:
	@echo "$(GREEN)🚀 部署服務到 Cloud Run (使用 Secret Manager)$(NC)"
	gcloud run deploy $(IMAGE_NAME) \
		--image $(GCR_IMAGE) \
		--platform managed \
		--region asia-east1 \
		--port 3000 \
		--allow-unauthenticated \
		--set-secrets="GCS_BUCKET_NAME=gcs-bucket-name:latest" \
		--set-env-vars="GOOGLE_CLOUD_PROJECT=$(PROJECT_ID)" \
		--service-account="ai-square-frontend@$(PROJECT_ID).iam.gserviceaccount.com"

## 設定 Google Secret Manager
setup-secrets:
	@echo "$(BLUE)🔐 設定 Google Secret Manager$(NC)"
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
	@echo "$(GREEN)✅ Secret Manager 設定完成！$(NC)"

## 完整部署到 Google Cloud Platform
deploy-gcp: build-frontend build-docker-image gcp-build-and-push gcp-deploy-service
	@echo "$(GREEN)✅ 部署完成！$(NC)"

## 部署後端到 Google Cloud Run
deploy-backend-gcp:
	@echo "$(GREEN)☁️  部署後端到 Google Cloud Run$(NC)"
	gcloud run deploy ai-square-backend \
		--source backend \
		--region asia-east1 \
		--allow-unauthenticated

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
dev-quality: dev-lint dev-typecheck
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