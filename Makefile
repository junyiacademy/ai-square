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
		echo "❌ 請指定 Ticket 名稱: make dev-ticket TICKET=feature-name"; \
		exit 1; \
	fi
	@echo "🎫 創建 Ticket 和 Branch..."
	@python3 docs/scripts/ticket-manager.py create $(TICKET) "$(DESC)"
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

# 🚀 快速開發模式 (原型/概念驗證)
quick-dev:
	@echo "🚀 快速開發模式 - 最小文檔要求"
	@echo "功能名稱: $(FEATURE)"
	@if [ -z "$(FEATURE)" ]; then \
		echo "❌ 請指定功能名稱: make quick-dev FEATURE=feature-name"; \
		exit 1; \
	fi
	@echo "✅ 跳過部分檢查，適用於快速原型開發"
	@echo "📝 請記得更新 docs/dev-logs/$(shell date +%Y-%m-%d)-feature-$(FEATURE).yml"

# 🎯 標準開發模式 (一般功能)
dev-start:
	@echo "🤖 啟動標準開發模式..."
	@echo "📖 請參考 docs/PLAYBOOK.md 開始開發"

# 🔒 嚴格開發模式 (核心功能)
strict-dev:
	@echo "🔒 嚴格開發模式 - 完整品質檢查"
	@echo "Epic: $(EPIC)"
	@if [ -z "$(EPIC)" ]; then \
		echo "❌ 請指定 Epic: make strict-dev EPIC=epic-name"; \
		exit 1; \
	fi
	@echo "✅ 強化測試要求：95% 覆蓋率"
	@echo "✅ 完整文檔要求：L3 級別"
	@echo "✅ 效能測試要求：必須通過"

# 🔄 繼續開發 (檢查進度)
dev-continue:
	@echo "📊 檢查開發進度..."
	@if [ -f docs/current/work-$(shell date +%Y-%m-%d).md ]; then \
		echo "📋 今日工作記錄:"; \
		cat docs/current/work-$(shell date +%Y-%m-%d).md; \
	else \
		echo "❌ 未找到今日工作記錄，請先執行 make dev-start"; \
	fi

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

# ✅ 智能提交助手（手動執行）
commit-check:
	@echo "📋 執行提交前檢查..."
	@echo "🛡️ 執行 AI 提交授權檢查..."
	@python3 docs/scripts/ai-commit-guard.py || (echo "❌ 未授權的提交已被阻止" && exit 1)
	@python3 docs/scripts/commit-guide.py

# 🔒 嚴格模式提交（包含建置和測試）
commit-strict:
	@echo "🔒 執行嚴格提交檢查..."
	@python3 docs/scripts/commit-guide.py --strict

# 🚀 快速提交（跳過 hooks）
commit-quick:
	@echo "🚀 快速提交模式..."
	@echo "⚠️ 警告：將跳過所有檢查"
	@git add -A
	@git commit --no-verify

# 📝 智能提交（自動加入所有變更）
commit-smart:
	@echo "🤖 智能提交模式..."
	@python3 docs/scripts/smart-commit.py

# 🎗️ 列出最近的 commits 和 tickets
dev-status:
	@echo "🎗️ 開發狀態概覽"
	@echo "\n📍 當前 Branch:"
	@git branch --show-current
	@echo "\n📦 最近的 Commits:"
	@git log --oneline -5
	@echo "\n🎫 Active Tickets:"
	@python3 docs/scripts/ticket-manager.py list | grep -A 5 "Active:" || echo "沒有 active tickets"
	@echo "\n📊 今日開發日誌:"
	@ls -la docs/dev-logs/$$(date +%Y-%m-%d)/*.yml 2>/dev/null | tail -5 || echo "今日還沒有開發日誌"

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

# 📚 開發歷程管理
dev-logs:
	@echo "📚 查看開發歷程記錄:"
	@find docs/development-logs -name "*.md" -type f | head -10 2>/dev/null || echo "❌ 暫無開發記錄"

dev-logs-today:
	@echo "📅 今日開發記錄:"
	@find docs/development-logs/$(shell date +%Y-%m-%d) -name "*.md" -type f 2>/dev/null || echo "❌ 今日暫無記錄"

dev-logs-feature:
	@echo "🔍 請指定功能名稱:"
	@echo "例如: find docs/development-logs -name '*email-login*' -type d"

dev-stats:
	@echo "📊 開發統計:"
	@echo "總功能數: $(shell find docs/development-logs -name 'time-tracking.json' | wc -l | tr -d ' ')"
	@echo "今日功能: $(shell find docs/development-logs/$(shell date +%Y-%m-%d) -name 'time-tracking.json' 2>/dev/null | wc -l | tr -d ' ')"
	@echo "本週功能: $(shell find docs/development-logs -name 'time-tracking.json' -newermt '1 week ago' 2>/dev/null | wc -l | tr -d ' ')"

# 🏗️ 架構一致性檢查
arch-check:
	@echo "🏗️ 檢查架構一致性..."
	@echo "檢查界限上下文實作..."
	@grep -r "bounded.context" docs/ || echo "  ⚠️ 未找到界限上下文文檔"
	@echo "檢查領域模型..."
	@find frontend/src -name "*.ts" -exec grep -l "aggregate\|entity\|valueobject" {} \; || echo "  ⚠️ 未找到領域模型實作"

# === 快速開發模式指令 ===

# 🎯 產品開發 (BDD 模式)
product-start:
	@echo "📋 產品功能開發模式"
	@echo "可用文檔:"
	@ls docs/product/ 2>/dev/null || echo "  ❌ 產品文檔不存在"
	@echo ""
	@echo "建議流程:"
	@echo "1. 檢視 docs/product/vision.md"
	@echo "2. 確認用戶角色 docs/product/user-personas.md"
	@echo "3. 選擇 Epic docs/product/epics/"
	@echo "4. 定義功能 docs/product/features/"

# 🏗️ 架構設計 (DDD 模式)
arch-start:
	@echo "🏗️ 架構設計模式"
	@echo "可用文檔:"
	@ls docs/architecture/ 2>/dev/null || echo "  ❌ 架構文檔不存在"
	@echo ""
	@echo "建議流程:"
	@echo "1. 檢視系統上下文 docs/architecture/system-context.md"
	@echo "2. 確認界限上下文 docs/architecture/bounded-contexts.md"
	@echo "3. 統一術語 docs/architecture/ubiquitous-language.md"

# 🔧 技術實作 (TDD 模式)  
tech-start:
	@echo "🔧 技術實作模式"
	@echo "可用文檔:"
	@ls docs/technical/ 2>/dev/null || echo "  ❌ 技術文檔不存在"
	@echo ""
	@echo "建議流程:"
	@echo "1. 檢視測試策略 docs/technical/test-strategy.md"
	@echo "2. 參考實作指南 docs/technical/implementation/"
	@echo "3. 遵循 TDD 紅綠重構循環"

# === 品質保證指令 ===

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
	@echo ""
	@echo "🧹 清理:"
	@echo "  make clean             清理建置產物"
	@echo "  make clean-dev         清理開發暫存檔案"
	@echo ""
	@echo "☁️ 部署:"
	@echo "  make gcloud-build-and-deploy-frontend  完整 GCP 部署流程"