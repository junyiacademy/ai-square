# Makefile for AI Square monorepo with AI-guided development

.PHONY: frontend backend dev build-frontend build-frontend-image run-frontend-image build-and-run-frontend-image gcloud-build-frontend gcloud-deploy-frontend gcloud-build-and-deploy-frontend

# === 基礎開發指令 ===

frontend:
	cd frontend && npm run dev

build-frontend:
	cd frontend && npm run build

backend:
	cd backend && source venv/bin/activate && uvicorn main:app --reload

dev:
	@echo "啟動前端與後端開發伺服器..."
	@echo "請分別在兩個終端機視窗執行 make frontend 與 make backend"

# === Docker 相關 ===

build-frontend-image:
	cd frontend && docker build -t ai-square-frontend .

run-frontend-image:
	docker run -p 3000:3000 ai-square-frontend 

build-and-run-frontend-image: build-frontend-image run-frontend-image 

# === Google Cloud 部署 ===

YOUR_PROJECT_ID=ai-square-463013
IMAGE_NAME=ai-square-frontend
GCR_IMAGE=gcr.io/$(YOUR_PROJECT_ID)/$(IMAGE_NAME)

gcloud-build-frontend:
	cd frontend && gcloud builds submit --tag $(GCR_IMAGE)

gcloud-deploy-frontend:
	gcloud run deploy $(IMAGE_NAME) \
	  --image $(GCR_IMAGE) \
	  --platform managed \
	  --region asia-east1 \
	  --port 3000

gcloud-build-and-deploy-frontend: gcloud-build-frontend gcloud-deploy-frontend

# === AI 引導開發系統 ===

# ⏱️ 開始開發會話 (自動啟動時間追蹤)
dev-ticket:
	@echo "🎫 開始新的開發 Ticket"
	@echo "功能名稱: $(TICKET)"
	@if [ -z "$(TICKET)" ]; then \
		echo "❌ 請指定 Ticket 名稱: make dev-ticket TICKET=feature-name TYPE=feature"; \
		exit 1; \
	fi
	@if [ -z "$(TYPE)" ]; then \
		echo "❌ 請指定開發類型: TYPE=feature|bugfix|refactor|docs|test"; \
		exit 1; \
	fi
	@echo "🎫 創建 Ticket 和 Branch (類型: $(TYPE))..."
	@python3 docs/scripts/ticket-driven-dev.py create $(TICKET) $(TYPE) "$(DESC)"
	@echo "📋 開發規則："
	@echo "   1. 一次只做一件事"
	@echo "   2. 使用 make commit-ticket 提交進度"
	@echo "   3. 使用 make merge-ticket TICKET=$(TICKET) 完成開發"
	@echo ""
	@echo "🎯 開始開發 $(TICKET)..."

# ✅ 完成開發 Ticket (自動結束時間追蹤)
# ⏸️ 暫停當前 ticket
pause-ticket:
	@echo "⏸️ 暫停當前開發 Ticket"
	@current_branch=$$(git branch --show-current); \
	if [[ "$$current_branch" == ticket/* ]]; then \
		ticket_name=$${current_branch#ticket/}; \
		echo "🎫 暫停 Ticket: $$ticket_name"; \
		python3 docs/scripts/ticket-manager.py pause $$ticket_name; \
		git checkout main; \
	else \
		echo "⚠️ 您不在 ticket branch 上"; \
	fi
	@echo ""
	@echo "💡 使用 'make list-tickets' 查看所有 tickets"
	@echo "💡 使用 'make resume-ticket TICKET=xxx' 恢復工作"

# ▶️ 恢復暫停的 ticket
resume-ticket:
	@if [ -z "$(TICKET)" ]; then \
		echo "❌ 請指定要恢復的 Ticket: make resume-ticket TICKET=ticket-name"; \
		exit 1; \
	fi
	@echo "▶️ 恢復開發 Ticket: $(TICKET)"
	@python3 docs/scripts/ticket-manager.py resume $(TICKET)

# 📋 列出所有 tickets
list-tickets:
	@echo "📋 所有 Tickets:"
	@python3 docs/scripts/ticket-manager.py list

# 🔍 檢查開發狀態
dev-status:
	@echo "🔍 檢查開發狀態..."
	@python3 docs/scripts/ticket-driven-dev.py status

# 📋 檢查文件完整性
check-docs:
	@echo "📋 檢查開發階段文件完整性..."
	@python3 docs/scripts/ticket-driven-dev.py validate $(TICKET) development

# 🎫 檢查票券完整性
check-ticket:
	@echo "🎫 檢查票券完整性..."
	@if [ -z "$(TICKET)" ]; then \
		python3 docs/scripts/ticket-integrity-checker.py active -v; \
	else \
		python3 docs/scripts/ticket-integrity-checker.py verify $(TICKET) -v; \
	fi

# 🔧 修復票券常見問題
fix-ticket:
	@echo "🔧 嘗試修復票券問題..."
	@if [ -z "$(TICKET)" ]; then \
		echo "❌ 請指定票券: make fix-ticket TICKET=xxx"; \
		exit 1; \
	fi
	@python3 docs/scripts/ticket-integrity-checker.py fix $(TICKET)

# 🔍 開發時完整檢查（包含票券和文件）
check-all:
	@echo "🔍 執行完整開發檢查..."
	@echo "\n📋 檢查票券完整性..."
	@python3 docs/scripts/ticket-integrity-checker.py active -v
	@echo "\n📄 檢查文件完整性..."
	@python3 docs/scripts/ticket-driven-dev.py status
	@echo "\n✅ 檢查完成"

# 🔓 授權 AI 提交（用戶明確授權時使用）
authorize-commit:
	@echo "🔓 授權 AI 進行提交（有效期 5 分鐘）..."
	@python3 docs/scripts/ai-commit-guard.py --authorize

# 🔀 合併 ticket branch 回 main
merge-ticket:
	@echo "🔀 合併 ticket branch 回 main"
	@if [ -z "$(TICKET)" ]; then \
		echo "❌ 請指定 Ticket: make merge-ticket TICKET=xxx"; \
		exit 1; \
	fi
	@echo "🔍 檢查 ticket 狀態..."
	@current_branch=$$(git branch --show-current); \
	if [ "$$current_branch" != "ticket/$(TICKET)" ]; then \
		echo "❌ 您不在 ticket/$(TICKET) branch 上"; \
		exit 1; \
	fi
	@echo "🎉 完成 ticket: $(TICKET)"
	@python3 docs/scripts/ticket-manager.py complete $(TICKET) $$(git rev-parse --short HEAD)
	@echo "🔀 切換到 main branch..."
	@git checkout main
	@echo "🔄 合併 ticket/$(TICKET)..."
	@git merge ticket/$(TICKET)
	@echo "🗑️ 刪除 local branch..."
	@git branch -d ticket/$(TICKET)
	@echo "✅ Ticket $(TICKET) 已完成並合併！"

commit-ticket:
	@echo "🎫 提交 Ticket 開發進度"
	@echo "🛡️ 執行 AI 提交授權檢查..."
	@python3 docs/scripts/ai-commit-guard.py || (echo "❌ 未授權的提交已被阻止" && exit 1)
	@echo "🤖 執行智能提交流程..."
	@python3 docs/scripts/smart-commit.py
	@echo "✅ 提交完成！"

# 📄 補充文檔提交（單獨使用）
finalize-docs:
	@echo "📄 檢查並提交待處理的文檔..."
	@python3 docs/scripts/finalize-docs.py

# === 票券驅動開發系統已取代以上開發模式 ===

# === Git 提交自動化 ===

# 🔧 設置開發環境
setup-dev:
	@echo "🔧 設置開發環境..."
	@cd frontend && npm install
	@echo "✅ 開發環境設置完成！"

# 🔧 設置 Git Hooks
setup-hooks:
	@echo "🔧 設置 Git Hooks..."
	@echo "📋 安裝 pre-push hook..."
	@if [ -f docs/scripts/pre-push-hook.sh ]; then \
		cp docs/scripts/pre-push-hook.sh .git/hooks/pre-push; \
		chmod +x .git/hooks/pre-push; \
		echo "✅ pre-push hook 已安裝"; \
	else \
		echo "❌ 找不到 pre-push hook 腳本"; \
		exit 1; \
	fi
	@echo "📋 檢查其他 hooks..."
	@if [ -f .git/hooks/pre-commit ]; then \
		echo "✅ pre-commit hook 已存在"; \
	else \
		echo "ℹ️ pre-commit hook 未安裝"; \
	fi
	@if [ -f .git/hooks/post-commit ]; then \
		echo "✅ post-commit hook 已存在"; \
	else \
		echo "ℹ️ post-commit hook 未安裝"; \
	fi
	@echo "✅ Git Hooks 設置完成！"
	@echo "💡 使用 git push --no-verify 可在需要時跳過 pre-push 檢查"

# 🧪 執行所有測試和品質檢查（與 pre-commit 相同）
test-all:
	@echo "🧪 執行所有測試和品質檢查..."
	@cd frontend && npm run test:ci
	@cd frontend && npm run lint
	@cd frontend && npx tsc --noEmit
	@echo "✅ 所有檢查通過！"

# 🚀 執行 pre-push 檢查（不實際推送）
pre-push-check:
	@echo "🚀 執行 pre-push 檢查..."
	@if [ -f .git/hooks/pre-push ]; then \
		bash .git/hooks/pre-push origin HEAD; \
	else \
		echo "❌ pre-push hook 未安裝，請先執行 make setup-hooks"; \
		exit 1; \
	fi

# 📝 手動更新 changelog
update-changelog:
	@echo "📝 更新 changelog..."
	@python docs/scripts/update-changelog.py

# === 以上過時的提交命令已被票券驅動開發系統取代 ===

# 🔧 AI 自動修復
ai-fix:
	@echo "🤖 AI 自動修復..."
	@python3 docs/scripts/ai-fix.py

# 🤖 自動提交（非交互式）
commit-auto:
	@echo "🤖 自動提交模式（非交互式）..."
	@git add -A
	@CI=true python3 docs/scripts/commit-guide.py

# 📚 文檔完整性檢查
docs-check:
	@echo "📚 檢查文檔完整性..."
	@echo "產品文檔 (BDD):"
	@ls -la docs/product/ 2>/dev/null || echo "  ❌ 產品文檔目錄不存在"
	@echo "架構文檔 (DDD):"
	@ls -la docs/architecture/ 2>/dev/null || echo "  ❌ 架構文檔目錄不存在"
	@echo "技術文檔 (TDD):"
	@ls -la docs/technical/ 2>/dev/null || echo "  ❌ 技術文檔目錄不存在"
	@echo "Changelog:"
	@ls -la CHANGELOG.md 2>/dev/null || echo "  ❌ CHANGELOG.md 不存在"

# 📋 Changelog 管理
changelog-view:
	@echo "📋 當前 Changelog (最近 20 行):"
	@head -20 CHANGELOG.md 2>/dev/null || echo "❌ CHANGELOG.md 不存在"

changelog-unreleased:
	@echo "📋 未發布的變更:"
	@sed -n '/## \[Unreleased\]/,/## \[/p' CHANGELOG.md | head -n -1 2>/dev/null || echo "❌ 找不到 Unreleased 區段"

changelog-release:
	@echo "📋 準備發布新版本..."
	@echo "請手動編輯 CHANGELOG.md 將 [Unreleased] 改為版本號"
	@echo "例如: ## [1.0.0] - $(shell date +%Y-%m-%d)"

# === 以上開發記錄和架構命令已被新系統取代 ===

# === 品質保證指令 ===

# 🔍 快速驗證開發流程
test-workflow:
	@echo "🔍 快速驗證開發流程..."
	@python3 docs/scripts/quick-workflow-test.py

# 🧪 完整流程端到端測試
test-workflow-full:
	@echo "🧪 執行完整流程端到端測試..."
	@python3 docs/scripts/workflow-test-suite.py

# 📊 生成覆蓋率報告
coverage:
	@echo "📊 生成測試覆蓋率報告..."
	cd frontend && npm test -- --coverage --watchAll=false || echo "⚠️ 測試指令需要配置"

# 📈 開發指標分析
metrics:
	@echo "📈 生成開發指標報告..."
	@python3 docs/scripts/analytics.py || echo "⚠️ 需要安裝 PyYAML: pip install pyyaml"

# 📊 查看開發統計
stats:
	@echo "📊 開發統計摘要:"
	@if [ -f docs/metrics-report.md ]; then \
		head -20 docs/metrics-report.md; \
	else \
		echo "❌ 尚無統計報告，請先執行 make metrics"; \
	fi

# 🤔 開發反思分析
reflect:
	@echo "🤔 執行開發反思分析..."
	@python3 docs/scripts/dev-reflection.py || echo "⚠️ 需要安裝 PyYAML: pip install pyyaml"

# 🔧 自動改進流程
improve:
	@echo "🔧 執行自動改進..."
	@python3 docs/scripts/auto-improve.py || echo "⚠️ 請先執行 make reflect"

# 📝 為最新提交生成文檔
doc-gen:
	@echo "📝 為最新提交生成文檔..."
	@python3 docs/scripts/post-commit-doc-gen.py

# 🔍 智能分析變更並建議提交分組
analyze:
	@echo "🔍 分析變更並建議提交策略..."
	@python3 docs/scripts/smart-commit-analyzer.py

# 📝 檢查檔案命名規範
check-naming:
	@echo "📝 檢查檔案命名規範..."
	@python3 docs/scripts/rename-legacy-files.py

# === 清理指令 ===

# 🧹 清理建置產物
clean:
	@echo "🧹 清理建置產物..."
	rm -rf frontend/.next/
	rm -rf frontend/out/
	rm -rf frontend/dist/
	rm -rf coverage/
	@echo "✅ 清理完成"

# 🗑️ 清理開發檔案
clean-dev:
	@echo "🗑️ 清理開發暫存檔案..."
	find . -name "*.backup" -delete
	rm -f docs/current/claude-guidance.md
	rm -f docs/current/work-*.md
	@echo "✅ 開發檔案清理完成"

# === 幫助資訊 ===

help:
	@echo "AI Square 開發指令集"
	@echo "====================="
	@echo ""
	@echo "🚀 基礎開發:"
	@echo "  make frontend          啟動前端開發伺服器"
	@echo "  make backend           啟動後端開發伺服器"
	@echo "  make build-frontend    建置前端專案"
	@echo ""
	@echo "🎫 Ticket 開發流程:"
	@echo "  make dev-ticket TICKET=xxx  開始新的開發 Ticket (自動時間追蹤)"
	@echo "  make commit-ticket          完成 Ticket 並提交 (自動結束追蹤)"
	@echo ""
	@echo "🤖 AI 協作開發 (分級模式):"
	@echo "  make quick-dev FEATURE=xxx   快速開發模式 (原型)"
	@echo "  make dev-start              標準開發模式 (一般功能)"
	@echo "  make strict-dev EPIC=xxx    嚴格開發模式 (核心功能)"
	@echo "  make dev-continue           檢查當前開發進度"
	@echo ""
	@echo "📝 智能提交系統:"
	@echo "  make setup-hooks       設置 Git Hooks (首次使用)"
	@echo "  make commit-check      手動執行提交檢查"
	@echo "  make commit-strict     嚴格模式檢查 (含建置)"
	@echo "  make commit-smart      智能提交 (自動 add + 檢查)"
	@echo "  make commit-quick      快速提交 (跳過檢查)"
	@echo "  make pre-push-check    執行 pre-push 檢查 (不推送)"
	@echo ""
	@echo "📚 文檔與架構:"
	@echo "  make docs-check        檢查文檔完整性"
	@echo "  make arch-check        檢查架構一致性"
	@echo "  make product-start     產品開發模式 (BDD)"
	@echo "  make arch-start        架構設計模式 (DDD)"
	@echo "  make tech-start        技術實作模式 (TDD)"
	@echo ""
	@echo "📋 Changelog 管理:"
	@echo "  make changelog-view    查看當前 Changelog"
	@echo "  make changelog-unreleased  查看未發布變更"
	@echo "  make changelog-release 準備發布新版本"
	@echo ""
	@echo "📊 開發分析:"
	@echo "  make dev-logs          查看開發歷程記錄"
	@echo "  make dev-logs-today    查看今日開發記錄"
	@echo "  make dev-stats         查看開發統計"
	@echo "  make metrics           生成開發指標報告"
	@echo "  make stats             查看統計摘要"
	@echo ""
	@echo "🧪 品質保證:"
	@echo "  make test-all          執行所有測試與檢查"
	@echo "  make coverage          生成測試覆蓋率報告"
	@echo "  make test-workflow     快速驗證開發流程"
	@echo "  make test-workflow-full 完整流程端到端測試"
	@echo ""
	@echo "🧹 清理:"
	@echo "  make clean             清理建置產物"
	@echo "  make clean-dev         清理開發暫存檔案"
	@echo ""
	@echo "☁️ 部署:"
	@echo "  make gcloud-build-and-deploy-frontend  完整 GCP 部署流程"