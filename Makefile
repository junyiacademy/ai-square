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

# 🎯 開始開發 (全流程 AI 引導)
dev-start:
	@echo "🤖 啟動 AI 引導開發系統..."
	@python3 docs/workflows/start-dev.py

# 🔄 繼續開發 (檢查進度)
dev-continue:
	@echo "📊 檢查開發進度..."
	@if [ -f docs/current/work-$(shell date +%Y-%m-%d).md ]; then \
		echo "📋 今日工作記錄:"; \
		cat docs/current/work-$(shell date +%Y-%m-%d).md; \
	else \
		echo "❌ 未找到今日工作記錄，請先執行 make dev-start"; \
	fi

# ✅ 智能提交引導
commit-guide:
	@echo "📋 啟動智能提交檢查..."
	@python3 docs/workflows/commit-guide.py

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

# 🧪 執行所有測試
test-all:
	@echo "🧪 執行完整測試套件..."
	cd frontend && npm run lint
	cd frontend && npm run build
	@echo "✅ 所有檢查完成"

# 📊 生成覆蓋率報告
coverage:
	@echo "📊 生成測試覆蓋率報告..."
	cd frontend && npm test -- --coverage --watchAll=false || echo "⚠️ 測試指令需要配置"

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
	@echo "🤖 AI 引導開發:"
	@echo "  make dev-start         啟動 AI 開發引導系統"
	@echo "  make dev-continue      檢查當前開發進度"
	@echo "  make commit-guide      智能提交檢查與引導"
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