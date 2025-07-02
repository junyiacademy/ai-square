# API 設計規範

## 🎯 設計原則

1. **RESTful**: 遵循 REST 架構風格
2. **一致性**: 統一的命名和結構
3. **版本化**: 支援 API 版本管理
4. **安全性**: 認證和授權機制
5. **文檔化**: 自動生成 API 文檔

## 🛤️ URL 結構

### 基本規則
```
https://api.ai-square.com/v1/{resource}/{id}/{sub-resource}

# 範例
GET    /v1/users              # 列出用戶
GET    /v1/users/123          # 獲取特定用戶
POST   /v1/users              # 創建用戶
PUT    /v1/users/123          # 更新用戶
DELETE /v1/users/123          # 刪除用戶
GET    /v1/users/123/progress # 獲取用戶進度
```

### 命名規範
- 使用**複數名詞** (users, not user)
- 使用**小寫字母**
- 使用**連字符** (kebab-case)
- 避免動詞 (使用 HTTP 方法)

## 📨 請求與回應

### 請求格式
```typescript
// POST /v1/auth/login
{
  "email": "user@example.com",
  "password": "securepassword"
}

// Headers
{
  "Content-Type": "application/json",
  "Accept-Language": "zhTW",
  "X-Request-ID": "uuid-here"
}
```

### 回應格式
```typescript
// 成功回應
{
  "success": true,
  "data": {
    "user": {
      "id": "123",
      "email": "user@example.com",
      "name": "User Name"
    },
    "token": "jwt-token-here"
  },
  "meta": {
    "timestamp": "2025-06-22T10:00:00Z",
    "version": "1.0"
  }
}

// 錯誤回應
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "details": {
      "field": "password",
      "reason": "incorrect"
    }
  },
  "meta": {
    "timestamp": "2025-06-22T10:00:00Z",
    "request_id": "uuid-here"
  }
}
```

## 🔐 認證與授權

### JWT Token 策略
```typescript
// Token Payload
{
  "sub": "user-123",
  "email": "user@example.com",
  "role": "learner",
  "iat": 1719043200,
  "exp": 1719046800
}

// Authorization Header
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### 權限控制
```typescript
// API Route 權限檢查
export async function GET(request: Request) {
  const token = getTokenFromHeader(request)
  const user = await verifyToken(token)
  
  if (!user) {
    return Response.json(
      { success: false, error: { code: 'AUTH_REQUIRED' } },
      { status: 401 }
    )
  }
  
  // 處理請求...
}
```

## 📊 狀態碼使用

### 成功狀態碼
| 狀態碼 | 使用場景 | 範例 |
|--------|----------|------|
| 200 | 成功獲取/更新 | GET /users/123 |
| 201 | 成功創建 | POST /users |
| 204 | 成功刪除 | DELETE /users/123 |

### 錯誤狀態碼
| 狀態碼 | 錯誤類型 | 錯誤碼範例 |
|--------|----------|------------|
| 400 | 請求錯誤 | VALIDATION_ERROR |
| 401 | 未認證 | AUTH_REQUIRED |
| 403 | 無權限 | PERMISSION_DENIED |
| 404 | 資源不存在 | RESOURCE_NOT_FOUND |
| 409 | 衝突 | DUPLICATE_EMAIL |
| 429 | 超過限制 | RATE_LIMIT_EXCEEDED |
| 500 | 伺服器錯誤 | INTERNAL_ERROR |

## 🎮 API 端點範例

### 認證相關
```typescript
POST   /v1/auth/register     # 註冊
POST   /v1/auth/login        # 登入
POST   /v1/auth/logout       # 登出
POST   /v1/auth/refresh      # 刷新 Token
POST   /v1/auth/forgot       # 忘記密碼
```

### 學習進度
```typescript
GET    /v1/progress          # 獲取總進度
GET    /v1/progress/domains  # 各領域進度
POST   /v1/progress/complete # 標記完成
DELETE /v1/progress/reset    # 重置進度
```

### AI 互動 (Phase 3)
```typescript
POST   /v1/ai/chat          # AI 對話
POST   /v1/ai/analyze       # 分析學習狀況
GET    /v1/ai/suggestions   # 獲取建議
```

## 🔄 分頁與過濾

### 分頁參數
```
GET /v1/activities?page=2&limit=20

Response:
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### 過濾與排序
```
GET /v1/activities?domain=engaging&sort=-created_at&status=completed

# domain: 過濾領域
# sort: -created_at (降序), created_at (升序)
# status: 狀態過濾
```

## 📝 API 文檔

### Next.js API Route 範例
```typescript
// app/api/v1/users/route.ts
import { NextRequest } from 'next/server'

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: 獲取用戶列表
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 頁碼
 *     responses:
 *       200:
 *         description: 成功
 */
export async function GET(request: NextRequest) {
  // 實作...
}
```

### FastAPI 範例 (Phase 2)
```python
from fastapi import FastAPI, Query
from pydantic import BaseModel

app = FastAPI(title="AI Square API", version="1.0")

class UserResponse(BaseModel):
    id: str
    email: str
    name: str

@app.get("/v1/users", response_model=List[UserResponse])
async def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """獲取用戶列表"""
    # 實作...
```

## 🚦 Rate Limiting

### 限流策略
```typescript
// 使用 Redis 實現
const rateLimiter = {
  anonymous: '10/minute',
  authenticated: '100/minute',
  premium: '1000/minute'
}

// Response Headers
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1719046800
```

## 🌍 國際化支援

### 語言處理
```typescript
// 根據 Accept-Language 返回對應語言
export async function GET(request: Request) {
  const lang = request.headers.get('Accept-Language') || 'en'
  const messages = getMessages(lang)
  
  return Response.json({
    success: true,
    data: { message: messages.welcome }
  })
}
```

---

💡 記住：好的 API 設計讓前後端協作更順暢，也讓 AI 更容易理解和生成程式碼。