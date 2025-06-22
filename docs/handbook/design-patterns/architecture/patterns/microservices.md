# 微服務架構模式

## 📋 適用時機

### 何時考慮微服務？
- ✅ 團隊規模 > 20 人
- ✅ 不同功能有不同的擴展需求
- ✅ 需要技術異構性
- ✅ 部署週期需要解耦
- ✅ 故障隔離要求高

### AI Square 的考量
目前**不需要**微服務，因為：
- 團隊規模小
- 功能相對集中
- 單體應用足夠

但 Phase 4-5 可能需要考慮。

## 🏗️ 微服務架構設計

### 服務劃分（假設）
```
┌─────────────────────────────────────────┐
│            API Gateway                   │
│         (Kong / Cloud Endpoints)         │
└────┬────┬────┬────┬────┬────┬──────────┘
     │    │    │    │    │    │
     ▼    ▼    ▼    ▼    ▼    ▼
┌────────┐┌────────┐┌────────┐┌────────┐
│ Auth   ││Progress││ AI     ││Content │
│Service ││Service ││Service ││Service │
└────────┘└────────┘└────────┘└────────┘
     │         │         │         │
     ▼         ▼         ▼         ▼
┌────────┐┌────────┐┌────────┐┌────────┐
│Firebase││Firestore│Gemini  │Storage │
└────────┘└────────┘└────────┘└────────┘
```

### 服務職責

#### 1. Auth Service
```typescript
// 認證授權服務
- 用戶註冊/登入
- Token 管理
- 權限驗證
- 社交登入
```

#### 2. Progress Service
```typescript
// 學習進度服務
- 進度追蹤
- 成就系統
- 學習分析
- 報表生成
```

#### 3. AI Service
```typescript
// AI 互動服務
- Gemini API 整合
- 對話管理
- 內容生成
- 個性化推薦
```

#### 4. Content Service
```typescript
// 內容管理服務
- 課程內容
- 多語言管理
- 版本控制
- 內容分發
```

## 🔄 服務通訊

### 同步通訊 (REST/gRPC)
```typescript
// REST 範例
async function getUserProgress(userId: string) {
  const auth = await authService.verify(token)
  const progress = await progressService.get(userId)
  return combineData(auth, progress)
}

// gRPC 範例 (更高效)
const progress = await progressClient.getProgress({
  userId: userId,
  includeDetails: true
})
```

### 非同步通訊 (Event-Driven)
```typescript
// 發布事件
eventBus.publish('user.registered', {
  userId: '123',
  email: 'user@example.com',
  timestamp: Date.now()
})

// 訂閱事件
eventBus.subscribe('user.registered', async (event) => {
  await progressService.initializeUser(event.userId)
  await emailService.sendWelcome(event.email)
})
```

## 📊 資料管理

### 資料庫策略
```yaml
# 每個服務有自己的資料庫
auth_service:
  database: PostgreSQL  # 關聯式資料
  why: 用戶資料需要 ACID

progress_service:
  database: MongoDB     # 文檔資料庫
  why: 彈性的進度資料結構

ai_service:
  database: Redis       # 快取對話
  why: 高速讀寫需求

content_service:
  database: Firestore   # NoSQL
  why: 全球分發需求
```

### 資料一致性
```typescript
// Saga Pattern 處理分散式交易
class UserRegistrationSaga {
  async execute(userData: UserData) {
    const steps = [
      { service: 'auth', action: 'createUser', compensate: 'deleteUser' },
      { service: 'progress', action: 'initProgress', compensate: 'deleteProgress' },
      { service: 'email', action: 'sendWelcome', compensate: null }
    ]
    
    for (const step of steps) {
      try {
        await this[step.service][step.action](userData)
      } catch (error) {
        await this.compensate(steps, step)
        throw error
      }
    }
  }
}
```

## 🚀 部署策略

### Kubernetes 配置
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth
        image: gcr.io/ai-square/auth-service:1.0
        ports:
        - containerPort: 8080
        env:
        - name: DB_CONNECTION
          valueFrom:
            secretKeyRef:
              name: auth-db-secret
              key: connection-string
```

### Service Mesh (Istio)
```yaml
# 流量管理
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: auth-service
spec:
  http:
  - match:
    - headers:
        x-version:
          exact: v2
    route:
    - destination:
        host: auth-service
        subset: v2
      weight: 20  # 20% 流量到 v2
    - destination:
        host: auth-service
        subset: v1
      weight: 80  # 80% 流量到 v1
```

## 📈 監控與追蹤

### 分散式追蹤
```typescript
// OpenTelemetry 整合
import { trace } from '@opentelemetry/api'

const tracer = trace.getTracer('auth-service')

export async function login(email: string, password: string) {
  const span = tracer.startSpan('auth.login')
  
  try {
    span.setAttributes({
      'user.email': email,
      'auth.method': 'password'
    })
    
    const user = await validateCredentials(email, password)
    span.setStatus({ code: SpanStatusCode.OK })
    return user
  } catch (error) {
    span.recordException(error)
    span.setStatus({ code: SpanStatusCode.ERROR })
    throw error
  } finally {
    span.end()
  }
}
```

## ⚖️ 權衡考量

### 優點
- ✅ 獨立部署和擴展
- ✅ 技術選擇自由
- ✅ 故障隔離
- ✅ 團隊自主性

### 缺點
- ❌ 複雜度大增
- ❌ 網路延遲
- ❌ 資料一致性挑戰
- ❌ 運維成本高

### 成本比較
| 項目 | 單體應用 | 微服務 |
|------|---------|---------|
| 開發複雜度 | 低 | 高 |
| 部署複雜度 | 低 | 高 |
| 運維成本 | $50/月 | $500+/月 |
| 擴展性 | 有限 | 優秀 |

## 🎯 遷移策略

### 漸進式拆分
```
Phase 1: 單體應用 (當前)
Phase 2: 抽離 AI Service
Phase 3: 抽離 Auth Service  
Phase 4: 完全微服務化
```

### 絞殺者模式
```typescript
// 新功能用微服務
app.use('/api/v2/ai/*', aiServiceProxy)

// 舊功能保留在單體
app.use('/api/v1/*', monolithHandler)

// 逐步遷移
app.use('/api/v1/auth/*', (req, res) => {
  if (featureFlag.useNewAuth) {
    return authServiceProxy(req, res)
  }
  return monolithHandler(req, res)
})
```

---

💡 記住：微服務不是目標，而是手段。只有當單體應用的痛點大於微服務的複雜度時，才值得遷移。