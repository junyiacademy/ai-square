# Simplified Makefile for AI Square

.PHONY: help \
	dev-start dev-check dev-checkpoint dev-test dev-commit dev-done \
	dev-pause dev-resume dev-change-request dev-rollback dev-status \
	dev-lint dev-typecheck dev-quality dev-install dev-update dev-setup \
	dev-track doc-usage-report demo-tracking \
	run-frontend run-backend \
	build-frontend build-docker-image gcp-build-and-push gcp-deploy-service deploy-gcp \
	clean clean-all

# === 說明 ===
help:
	@echo "AI Square 開發工作流程"
	@echo "====================="
	@echo ""
	@echo "🎫 票券驅動開發流程 (依序執行):"
	@echo "  make dev-start TYPE=feature TICKET=name   開始新的開發任務 (含工作流程保護)"
	@echo "  make dev-check                            檢查當前開發狀態"
	@echo "  make dev-checkpoint                       保存開發進度點"
	@echo "  make dev-test                             執行測試套件"
	@echo "  make dev-commit                           智能提交變更 (含工作流程保護)"
	@echo "  make dev-done TICKET=name                 完成並合併工作"
	@echo ""
	@echo "🔄 開發流程管理:"
	@echo "  make dev-pause                            暫停當前開發工作"
	@echo "  make dev-resume TICKET=name               恢復指定開發工作"
	@echo "  make dev-change-request DESC='...'        記錄需求變更"
	@echo "  make dev-rollback [COMMIT=abc123]         回滾開發變更"
	@echo "  make dev-status                           查看所有開發票券"
	@echo ""
	@echo "🚀 應用程式執行:"
	@echo "  make run-frontend                         啟動前端開發伺服器"
	@echo "  make run-backend                          啟動後端開發伺服器"
	@echo ""
	@echo "📊 品質檢查:"
	@echo "  make dev-lint                             執行程式碼檢查"
	@echo "  make dev-typecheck                        執行型別檢查"
	@echo "  make dev-quality                          執行所有品質檢查"
	@echo "  make dev-tdd-check                        執行 TDD 合規檢查"
	@echo "  make dev-tdd-enforce                      執行 TDD 強制檢查"
	@echo "  make dev-workflow-check                   執行工作流程檢查"
	@echo ""
	@echo "📦 建置與部署:"
	@echo "  make build-frontend                       建置前端生產版本"
	@echo "  make deploy-gcp                           部署到 Google Cloud"
	@echo ""
	@echo "🔧 開發環境:"
	@echo "  make dev-setup                            初始化開發環境"
	@echo "  make dev-install                          安裝相依套件"
	@echo "  make dev-update                           更新相依套件"
	@echo ""
	@echo "📊 文件追蹤:"
	@echo "  make dev-track STAGE=xxx                  記錄開發階段文件參考"
	@echo "  make doc-usage-report                     生成文件使用報告"
	@echo "  make demo-tracking                        示範文件追蹤系統"
	@echo ""
	@echo "🧹 維護:"
	@echo "  make clean                                清理建置產物"
	@echo "  make clean-all                            深度清理（含 node_modules）"

# === 核心流程命令 ===

# 開始新的開發任務（含工作流程保護）
dev-start:
	@if [ -z "$(TYPE)" ] || [ -z "$(TICKET)" ]; then \
		echo "❌ 用法: make dev-start TYPE=feature|bug|refactor|hotfix TICKET=descriptive-name [DEPENDS=ticket-1,ticket-2]"; \
		exit 1; \
	fi
	@echo "🛡️ 工作流程護衛檢查..."
	@python3 docs/scripts/workflow-guard.py start
	@echo "🎫 開始新工作: $(TICKET) (類型: $(TYPE))"
	@python3 docs/scripts/ticket-manager-enhanced.py create $(TICKET) $(TYPE) "$(DESC)"

# 檢查當前開發狀態
dev-check:
	@echo "🔍 檢查開發狀態..."
	@python3 docs/scripts/ticket-integrity-checker.py active -v

# 保存開發進度檢查點
dev-checkpoint:
	@echo "💾 保存開發進度..."
	@python3 docs/scripts/checkpoint.py

# 執行測試套件
dev-test:
	@echo "🧪 執行測試..."
	@cd frontend && npm run test:ci && npm run lint && npx tsc --noEmit

# TDD 合規檢查
dev-tdd-check:
	@echo "🔍 執行 TDD 合規檢查..."
	@python3 docs/scripts/tdd-compliance-checker.py

# TDD 強制檢查（有問題時失敗）
dev-tdd-enforce:
	@echo "🚨 執行 TDD 強制檢查..."
	@python3 docs/scripts/tdd-compliance-checker.py --fail-on-issues

# 工作流程檢查
dev-workflow-check:
	@echo "🛡️ 執行工作流程檢查..."
	@python3 docs/scripts/workflow-guard.py check

# 智能提交變更（含工作流程保護）
dev-commit:
	@echo "🛡️ 工作流程護衛檢查..."
	@python3 docs/scripts/workflow-guard.py commit
	@echo "🔓 授權提交..."
	@python3 docs/scripts/ai-commit-guard.py --authorize
	@echo "📝 智能提交..."
	@python3 docs/scripts/smart-commit.py

# 合併已完成的票券到 main
dev-done:
	@if [ -z "$(TICKET)" ]; then \
		echo "❌ 用法: make dev-done TICKET=ticket-name"; \
		exit 1; \
	fi
	@echo "🔀 合併票券分支到 main: $(TICKET)"
	@echo "💡 注意：票券應該已經在 dev-commit 時完成"
	@git checkout main
	@git merge ticket/$(TICKET) --no-ff -m "Merge ticket/$(TICKET) into main"
	@git branch -d ticket/$(TICKET)
	@echo "✅ 分支合併完成，ticket/$(TICKET) 已刪除"

# === 輔助命令 ===

# 暫停當前開發工作
dev-pause:
	@echo "⏸️ 暫停當前工作..."
	@python3 docs/scripts/ticket-manager-enhanced.py pause

# 恢復開發工作
dev-resume:
	@if [ -z "$(TICKET)" ]; then \
		echo "❌ 用法: make dev-resume TICKET=ticket-name"; \
		exit 1; \
	fi
	@echo "▶️ 恢復工作: $(TICKET)"
	@python3 docs/scripts/ticket-manager-enhanced.py resume $(TICKET)

# 記錄需求變更
dev-change-request:
	@if [ -z "$(DESC)" ]; then \
		echo "❌ 用法: make dev-change-request DESC='變更描述'"; \
		exit 1; \
	fi
	@echo "📝 記錄需求變更..."
	@python3 docs/scripts/change-request.py "$(DESC)"

# 回滾開發變更
dev-rollback:
	@echo "⏪ 回滾變更..."
	@if [ -z "$(COMMIT)" ]; then \
		python3 docs/scripts/rollback.py; \
	else \
		python3 docs/scripts/rollback.py $(COMMIT); \
	fi

# 查看開發狀態
dev-status:
	@echo "📊 所有票券狀態:"
	@python3 docs/scripts/ticket-manager-enhanced.py list

# === 應用程式執行命令 ===

# 啟動前端開發伺服器
run-frontend:
	cd frontend && npm run dev

# 啟動後端開發伺服器
run-backend:
	cd backend && source venv/bin/activate && uvicorn main:app --reload

# === 建置與部署命令 ===

# 建置前端生產版本
build-frontend:
	cd frontend && npm run build

# Google Cloud 部署
YOUR_PROJECT_ID=ai-square-463013
IMAGE_NAME=ai-square-frontend
GCR_IMAGE=gcr.io/$(YOUR_PROJECT_ID)/$(IMAGE_NAME)

build-docker-image:
	cd frontend && docker build -t ai-square-frontend .

gcp-build-and-push:
	cd frontend && gcloud builds submit --tag $(GCR_IMAGE)

gcp-deploy-service:
	gcloud run deploy $(IMAGE_NAME) \
	  --image $(GCR_IMAGE) \
	  --platform managed \
	  --region asia-east1 \
	  --port 3000

# 完整部署到 Google Cloud Platform
deploy-gcp: build-docker-image gcp-build-and-push gcp-deploy-service

# === 品質檢查命令 ===

# 執行程式碼檢查
dev-lint:
	@echo "🔍 執行程式碼品質檢查..."
	cd frontend && npm run lint

# 執行型別檢查
dev-typecheck:
	@echo "📝 執行 TypeScript 型別檢查..."
	cd frontend && npx tsc --noEmit

# 執行所有品質檢查
dev-quality: dev-lint dev-typecheck
	@echo "✅ 所有品質檢查通過"

# === 文件追蹤功能 ===

# 記錄開發階段文件參考
dev-track:
	@if [ -z "$(STAGE)" ]; then \
		echo "❌ 請指定開發階段: make dev-track STAGE=frontend_development"; \
		echo "可用階段: frontend_development, api_development, test_writing, refactoring"; \
		exit 1; \
	fi
	@echo "📚 記錄 $(STAGE) 階段的文件參考..."
	@python3 docs/scripts/ticket-manager-enhanced.py track $(STAGE) $(FILES)

# 生成文件使用報告
doc-usage-report:
	@echo "📊 生成 Handbook 文件使用統計報告..."
	@python3 docs/scripts/document-usage-analyzer.py
	@echo "📄 報告已生成: docs/handbook/document-usage-report.md"

# 示範文件追蹤系統
demo-tracking:
	@echo "🎯 執行文件追蹤系統示範..."
	@python3 docs/scripts/demo-document-tracking.py

# === 開發環境設置 ===

# 安裝相依套件
dev-install:
	@echo "📦 安裝專案相依套件..."
	cd frontend && npm install
	@echo "✅ 相依套件安裝完成"

# 更新相依套件
dev-update:
	@echo "🔄 更新專案相依套件..."
	cd frontend && npm update
	@echo "✅ 相依套件更新完成"

# 初始化開發環境
dev-setup: dev-install
	@echo "🔧 設置開發環境..."
	@echo "✅ 開發環境設置完成"

# === 清理命令 ===

# 清理建置產物
clean:
	@echo "🧹 清理建置產物..."
	rm -rf frontend/.next/
	rm -rf frontend/out/
	rm -rf frontend/dist/
	rm -rf coverage/
	@echo "✅ 清理完成"

# 深度清理（包含 node_modules）
clean-all: clean
	@echo "🗑️ 深度清理..."
	rm -rf frontend/node_modules/
	rm -rf backend/__pycache__/
	rm -rf backend/venv/
	@echo "✅ 深度清理完成"