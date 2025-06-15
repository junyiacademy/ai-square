# Makefile for AI Square monorepo

.PHONY: frontend backend dev build-frontend

frontend:
	cd frontend && npm run dev

build-frontend:
	cd frontend && npm run build

backend:
	cd backend && source venv/bin/activate && uvicorn main:app --reload

dev:
	@echo "啟動前端與後端開發伺服器..."
	@echo "請分別在兩個終端機視窗執行 make frontend 與 make backend" 