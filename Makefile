# Makefile for AI Square monorepo

.PHONY: frontend backend dev build-frontend build-frontend-image run-frontend-image build-and-run-frontend-image gcloud-build-frontend gcloud-deploy-frontend gcloud-build-and-deploy-frontend

frontend:
	cd frontend && npm run dev

build-frontend:
	cd frontend && npm run build

backend:
	cd backend && source venv/bin/activate && uvicorn main:app --reload

dev:
	@echo "啟動前端與後端開發伺服器..."
	@echo "請分別在兩個終端機視窗執行 make frontend 與 make backend"

build-frontend-image:
	cd frontend && docker build -t ai-square-frontend .

run-frontend-image:
	docker run -p 3000:3000 ai-square-frontend 

build-and-run-frontend-image: build-frontend-image run-frontend-image 

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
	  --allow-unauthenticated \
	  --port 3000

gcloud-build-and-deploy-frontend: gcloud-build-frontend gcloud-deploy-frontend 