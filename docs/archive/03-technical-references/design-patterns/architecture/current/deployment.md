# 部署架構

## 🚀 部署概覽

### 環境配置
```
Production (主環境)
├── Frontend: Cloud Run (自動擴展)
├── Backend: Cloud Run (預留 Phase 2)
├── CDN: Cloud CDN (全球加速)
└── Domain: ai-square.com (假設)

Development (開發環境)
├── Local: localhost:3000
├── Preview: GitHub PR 預覽
└── Staging: dev.ai-square.com
```

## 📦 容器化策略

### Frontend Dockerfile
```dockerfile
# 多階段構建
FROM node:20-alpine AS deps
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/ .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

### 部署配置
```yaml
# cloud-run-frontend.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ai-square-frontend
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "100"
    spec:
      containers:
      - image: gcr.io/ai-square/frontend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          limits:
            cpu: "2"
            memory: "2Gi"
```

## 🌐 網路架構

### 流量路由
```
用戶請求
    ↓
Cloud Load Balancer
    ↓
Cloud CDN (快取靜態資源)
    ↓
Cloud Run (動態內容)
    ↓
應用回應
```

### CDN 策略
```javascript
// next.config.js CDN 配置
module.exports = {
  images: {
    domains: ['storage.googleapis.com'],
  },
  assetPrefix: process.env.NODE_ENV === 'production' 
    ? 'https://cdn.ai-square.com' 
    : '',
}
```

### 快取規則
| 資源類型 | 快取時間 | 快取位置 |
|---------|---------|---------|
| 靜態圖片 | 1 年 | CDN + 瀏覽器 |
| CSS/JS | 1 個月 | CDN + 瀏覽器 |
| API 回應 | 不快取 | - |
| HTML | 5 分鐘 | CDN |

## 🔐 安全配置

### HTTPS 強制
```yaml
# 所有流量強制 HTTPS
apiVersion: networking.gke.io/v1beta1
kind: ManagedCertificate
metadata:
  name: ai-square-cert
spec:
  domains:
    - ai-square.com
    - www.ai-square.com
```

### 環境變數管理
```bash
# 使用 Google Secret Manager
gcloud secrets create nextauth-secret \
  --data-file=.env.production

# Cloud Run 引用
gcloud run services update ai-square-frontend \
  --set-secrets=NEXTAUTH_SECRET=nextauth-secret:latest
```

## 📊 監控與日誌

### 監控指標
- **可用性**: Cloud Monitoring 自動監控
- **效能**: Core Web Vitals 追蹤
- **錯誤**: Error Reporting 整合
- **流量**: Cloud Logging 分析

### 告警設置
```yaml
# 監控告警
- 可用性 < 99.9%
- 回應時間 > 1 秒
- 錯誤率 > 1%
- 記憶體使用 > 80%
```

## 🔄 CI/CD 流程

### GitHub Actions
```yaml
name: Deploy to Cloud Run
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        
      - name: Build and Push
        run: |
          gcloud builds submit --tag gcr.io/$PROJECT_ID/frontend
          
      - name: Deploy
        run: |
          gcloud run deploy ai-square-frontend \
            --image gcr.io/$PROJECT_ID/frontend \
            --platform managed \
            --region asia-east1
```

## 💰 成本優化

### 自動擴展策略
```yaml
# 最小實例：1 (避免冷啟動)
# 最大實例：100 (控制成本)
# CPU 使用率目標：60%
# 並發請求數：80
```

### 預估成本
| 服務 | 規格 | 月費用 (USD) |
|------|------|-------------|
| Cloud Run | 2 vCPU, 2GB | ~$50 |
| Cloud CDN | 100GB 流量 | ~$8 |
| Cloud Storage | 10GB | ~$0.2 |
| **總計** | | **~$60** |

## 🚨 災難復原

### 備份策略
- **程式碼**: GitHub (自動)
- **環境配置**: Secret Manager
- **用戶資料**: Firestore 自動備份

### 回滾程序
```bash
# 快速回滾到上一版本
gcloud run services update ai-square-frontend \
  --tag=previous \
  --revision-suffix=rollback
```

---

💡 記住：好的部署架構要平衡效能、成本和維護性。