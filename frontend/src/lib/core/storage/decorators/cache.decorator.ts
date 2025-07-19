/**
 * 快取裝飾器
 * 用於自動快取方法的返回值
 */

type CacheKey = string | ((...args: unknown[]) => string);

interface CacheOptions {
  ttl?: number;  // seconds
  key?: CacheKey;
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

// 全域快取儲存
const cacheMap = new Map<string, CacheEntry>();

/**
 * 快取裝飾器
 * @param options 快取選項
 */
export function Cacheable(options: CacheOptions = {}) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const cacheKey = getCacheKey(options.key, propertyKey, args);
      const cached = cacheMap.get(cacheKey);
      
      // 檢查快取是否存在且未過期
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }
      
      // 執行原方法
      const result = await originalMethod.apply(this, args);
      
      // 儲存到快取
      if (result !== null && result !== undefined) {
        const ttl = options.ttl || 3600; // 預設 1 小時
        cacheMap.set(cacheKey, {
          value: result,
          expiresAt: Date.now() + (ttl * 1000)
        });
      }
      
      return result;
    };
    
    return descriptor;
  };
}

/**
 * 生成快取 key
 */
function getCacheKey(
  keyOption: CacheKey | undefined,
  methodName: string,
  args: unknown[]
): string {
  if (!keyOption) {
    // 預設使用方法名稱和參數生成 key
    return `${methodName}:${JSON.stringify(args)}`;
  }
  
  if (typeof keyOption === 'function') {
    return keyOption(...args);
  }
  
  return keyOption;
}

/**
 * 清除快取
 * @param pattern 要清除的快取 key 模式（選填）
 */
export function clearCache(pattern?: string): void {
  if (!pattern) {
    cacheMap.clear();
    return;
  }
  
  // 清除符合模式的快取
  for (const key of cacheMap.keys()) {
    if (key.includes(pattern)) {
      cacheMap.delete(key);
    }
  }
}

/**
 * 獲取快取統計資訊
 */
export function getCacheStats(): {
  size: number;
  entries: Array<{ key: string; expiresAt: Date }>;
} {
  const entries = Array.from(cacheMap.entries()).map(([key, entry]) => ({
    key,
    expiresAt: new Date(entry.expiresAt)
  }));
  
  return {
    size: cacheMap.size,
    entries
  };
}

/**
 * 清理過期的快取項目
 */
export function cleanupExpiredCache(): number {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of cacheMap.entries()) {
    if (entry.expiresAt <= now) {
      cacheMap.delete(key);
      cleaned++;
    }
  }
  
  return cleaned;
}

// 定期清理過期快取（每分鐘）
if (typeof window !== 'undefined') {
  setInterval(() => {
    cleanupExpiredCache();
  }, 60000);
}