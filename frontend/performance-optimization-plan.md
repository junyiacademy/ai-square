# 效能優化執行計畫

## 🎯 優先級 1: Bundle Size 優化 (預計減少 50% 大小)

### 1.1 Monaco Editor 動態載入
```bash
# 修改所有使用 Monaco Editor 的元件
# 使用 dynamic import
npm install @monaco-editor/react
```

### 1.2 移除重複 Icon 庫
```bash
# 統一使用 lucide-react
npm uninstall @heroicons/react
# 全域取代 @heroicons → lucide-react
```

### 1.3 Tree Shaking 優化
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', 'date-fns']
  }
}
```

## 🎯 優先級 2: 快取策略優化 (預計提升 70% 響應速度)

### 2.1 實作多層快取
```typescript
// src/lib/cache/multi-tier-cache.ts
export class MultiTierCache {
  private readonly layers = [
    new BrowserCache(),    // L1: localStorage
    new MemoryCache(),      // L2: in-memory
    new RedisCache(),       // L3: Redis
    new DatabaseCache()     // L4: PostgreSQL
  ];

  async get(key: string): Promise<T | null> {
    for (const layer of this.layers) {
      const value = await layer.get(key);
      if (value) {
        // 回填上層快取
        await this.backfill(key, value, layer);
        return value;
      }
    }
    return null;
  }
}
```

### 2.2 API 快取標頭
```typescript
// 所有 GET API 加入快取標頭
export async function GET(request: NextRequest) {
  const response = NextResponse.json(data);
  
  // 公開資料：激進快取
  response.headers.set('Cache-Control', 
    'public, max-age=3600, stale-while-revalidate=86400');
  
  // 私人資料：保守快取
  response.headers.set('Cache-Control', 
    'private, max-age=60, stale-while-revalidate=300');
  
  return response;
}
```

## 🎯 優先級 3: 資料載入優化 (預計減少 80% 載入時間)

### 3.1 預載入關鍵資料
```typescript
// app/layout.tsx
export default function RootLayout() {
  // 預載入常用資料
  useEffect(() => {
    prefetch('/api/relations');
    prefetch('/api/pbl/scenarios');
  }, []);
}
```

### 3.2 實作資料分頁
```typescript
// 大量資料分頁載入
export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get('page') || '1';
  const limit = 20;
  
  const data = await repository.findWithPagination({
    page: parseInt(page),
    limit
  });
  
  return NextResponse.json(data);
}
```

### 3.3 使用 React Query 優化客戶端快取
```bash
npm install @tanstack/react-query
```

```typescript
// 設定全域快取策略
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 分鐘
      cacheTime: 10 * 60 * 1000,    // 10 分鐘
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});
```

## 📊 預期效果

| 指標 | 現況 | 優化後 | 改善 |
|------|------|--------|------|
| Bundle Size | 282KB | 140KB | -50% |
| First Paint | 2.5s | 0.8s | -68% |
| API Response | 500ms | 50ms | -90% |
| Cache Hit Rate | 10% | 85% | +750% |

## 🔧 實作順序

1. **第一週**: Bundle Size 優化
   - Monaco Editor 動態載入
   - 移除重複套件
   - 設定 Tree Shaking

2. **第二週**: 快取策略
   - 實作多層快取
   - 加入 HTTP 快取標頭
   - 設定 Redis TTL

3. **第三週**: 資料載入
   - 實作預載入
   - 加入分頁
   - 整合 React Query

## 監控指標

```typescript
// 加入效能監控
export function measurePerformance(name: string) {
  const start = performance.now();
  
  return () => {
    const duration = performance.now() - start;
    console.log(`[Performance] ${name}: ${duration}ms`);
    
    // 發送到監控系統
    if (duration > 1000) {
      logSlowOperation(name, duration);
    }
  };
}
```

## Next Steps

1. 立即執行 Bundle Size 優化 (今天)
2. 實作 Redis 快取 (本週)
3. 設定效能監控 Dashboard (下週)