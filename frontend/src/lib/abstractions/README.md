# 統一抽象層架構 (Unified Abstraction Layer)

這個目錄包含了整個專案的統一抽象層架構，提供一致的設計模式和程式碼重用。

## 架構概覽

### 1. BaseApiHandler - API 路由抽象層

提供統一的 API 路由處理模式，包含：
- 標準化的請求/回應格式
- 自動錯誤處理和記錄
- 內建快取支援
- 多語言處理
- 請求驗證框架

```typescript
// 使用範例
export class MyApiHandler extends BaseApiHandler<RequestType, ResponseType> {
  protected async executeGet(request: NextRequest, context: RequestContext) {
    // 實作 GET 邏輯
  }
}
```

### 2. BaseStorageService - 儲存服務抽象層

統一的資料存取介面，支援：
- 雲端儲存（GCS）和本地儲存自動切換
- 內建快取機制
- 批次操作
- 錯誤處理和重試

```typescript
// 使用範例
export class MyStorageService extends BaseStorageService<DataType> {
  protected readonly serviceName = 'MyService';
  
  protected async saveToStorage(key: string, data: DataType) {
    // 實作儲存邏輯
  }
}
```

### 3. BaseAIService - AI 服務抽象層

統一的 AI/LLM 服務介面，提供：
- 文字生成、聊天、結構化輸出
- 串流支援
- Token 計算和成本估算
- 快取和重試機制
- 超時控制

```typescript
// 使用範例
export class GeminiService extends BaseAIService {
  protected async callTextGeneration(prompt: string, options: AIServiceOptions) {
    // 實作 Gemini API 呼叫
  }
}
```

### 4. BaseYAMLLoader - YAML 載入器抽象層

統一的 YAML 檔案處理，包含：
- 自動多語言欄位處理
- Schema 驗證
- 快取支援
- 批次載入

```typescript
// 使用範例
export class ContentLoader extends BaseYAMLLoader<ContentType> {
  protected async validateData(data: unknown) {
    // 實作資料驗證
  }
}
```

## 核心功能

### 錯誤處理統一

所有抽象層都整合了統一的錯誤追蹤：
- 自動錯誤捕獲和記錄
- 上下文資訊收集
- 開發/生產環境差異處理

### 快取策略統一

使用 `cacheService` 提供多層快取：
- 記憶體快取（快速存取）
- localStorage 快取（持久化）
- 自動快取失效和更新

### 多語言支援統一

內建多語言處理機制：
- 自動欄位翻譯（`field_zh`, `field_es` 等）
- zh-TW 到 zh 的自動映射
- Fallback 語言支援

## 實作範例

查看 `/implementations` 目錄中的具體實作：

1. **GCSStorageServiceImpl** - Google Cloud Storage 實作
2. **YAMLContentLoaderImpl** - KSA/Domains 內容載入器
3. **KSAApiHandlerImpl** - KSA API 路由處理器
4. **GeminiAIServiceImpl** - Google Gemini AI 服務

## 使用指南

### 1. 建立新的 API 路由

```typescript
import { BaseApiHandler } from '@/lib/abstractions';

export class UserApiHandler extends BaseApiHandler<UserRequest, UserResponse> {
  protected async executeGet(request: NextRequest, context: RequestContext) {
    const userId = context.userId;
    // 實作邏輯
    return userData;
  }
  
  protected async validateGetRequest(request: NextRequest) {
    // 驗證邏輯
    return { valid: true };
  }
}

// 在 route.ts 中使用
const handler = new UserApiHandler();
export const GET = (req: NextRequest) => handler.handleGet(req);
```

### 2. 建立新的儲存服務

```typescript
import { BaseStorageService } from '@/lib/abstractions';

export class UserStorageService extends BaseStorageService<User> {
  protected readonly serviceName = 'UserStorage';
  
  protected async saveToStorage(key: string, data: User) {
    // 實作儲存邏輯
  }
}

// 使用服務
const userStorage = new UserStorageService();
await userStorage.save('user123', userData);
```

### 3. 整合 AI 服務

```typescript
import { BaseAIService } from '@/lib/abstractions';

const aiService = new GeminiAIServiceImpl();

// 生成文字
const response = await aiService.generateText('Hello AI', {
  temperature: 0.7,
  maxTokens: 500
});

// 結構化輸出
const structured = await aiService.generateStructured(
  'Generate user profile',
  userSchema,
  { model: 'gemini-2.5-pro' }
);
```

## 最佳實踐

1. **繼承而非修改** - 總是透過繼承來擴展功能，不要直接修改抽象類
2. **使用型別參數** - 充分利用 TypeScript 的泛型來確保型別安全
3. **實作必要方法** - 只實作你需要的抽象方法，其他使用預設實作
4. **善用快取** - 合理設定快取 TTL，避免不必要的重複計算
5. **錯誤處理** - 讓抽象層處理通用錯誤，只在必要時自訂錯誤處理

## 擴展架構

要新增抽象層：

1. 在 `/abstractions` 建立新的 base 類別
2. 定義必要的抽象方法和通用實作
3. 在 `/implementations` 建立具體實作
4. 更新 `index.ts` 匯出新的抽象層
5. 撰寫單元測試確保功能正常

## 相關文件

- [快取服務文件](../cache/README.md)
- [錯誤追蹤文件](../error-tracking/README.md)
- [儲存服務文件](../storage/README.md)