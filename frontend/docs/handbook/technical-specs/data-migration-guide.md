# 數據存儲架構指南

## 概述

AI Square 使用統一的數據存儲架構，將用戶資料存儲在 PostgreSQL 資料庫，靜態檔案（如圖片、文件）存儲在 Google Cloud Storage。

## 架構設計

### 統一數據服務 (`UserDataService`)

- **位置**: `/src/lib/services/user-data-service.ts`
- **目的**: 提供統一的 API 來管理所有用戶數據
- **後端**: PostgreSQL (用戶資料) + GCS (靜態檔案)

### 數據結構

```typescript
interface UserData {
  assessmentResults?: AssessmentResults | null;
  achievements: UserAchievements;
  workspaceSessions: WorkspaceSession[];
  assessmentSessions: AssessmentSession[];
  savedPaths: SavedPathData[];
  currentView?: string;
  lastUpdated: string;
  version: string; // 版本控制，用於遷移兼容性
}
```

## 使用方式

### 基本操作

```typescript
import { userDataService } from '@/lib/services/user-data-service';

// 載入用戶數據
const userData = await userDataService.loadUserData();

// 保存完整數據
await userDataService.saveUserData(userData);

// 保存特定類型數據
await userDataService.saveAchievements(achievements);
await userDataService.saveWorkspaceSessions(sessions);
await userDataService.savePaths(paths);
```

### 工作區管理

```typescript
// 新增工作區
await userDataService.addWorkspaceSession(newWorkspace);

// 更新工作區
await userDataService.updateWorkspaceSession(workspaceId, {
  completedTasks: [...existingTasks, newTaskId],
  totalXP: newTotalXP
});
```

### 路徑管理

```typescript
// 新增評估結果和路徑
await userDataService.addAssessmentSession(assessmentSession, newPaths);

// 切換收藏狀態
await userDataService.togglePathFavorite(pathId);

// 刪除路徑
await userDataService.deletePath(pathId);
```

## 資料存儲策略

### PostgreSQL (動態資料)
- 用戶資料 (users table)
- 學習進度 (programs, tasks tables)
- 評估結果 (evaluations table)
- 成就記錄 (achievements, user_achievements tables)

### Google Cloud Storage (靜態檔案)
- 用戶頭像、個人檔案圖片
- 學習材料文件 (PDF, 影片等)
- 匯出的報告檔案
- 公開的靜態資源

### 使用範例

```typescript
// 儲存用戶資料到 PostgreSQL
await userRepository.update(userId, userData);

// 上傳圖片到 GCS
const imageUrl = await storageService.uploadFile(
  file,
  `users/${userId}/avatar.jpg`
);

// 更新用戶頭像 URL
await userRepository.update(userId, { avatarUrl: imageUrl });
```


## 數據版本控制

每個數據記錄都包含版本信息，確保遷移兼容性：

```typescript
{
  version: "1.0",
  lastUpdated: "2025-01-04T10:30:00Z",
  // ... 其他數據
}
```

## 最佳實踐

### 錯誤處理

```typescript
try {
  await userDataService.saveUserData(data);
} catch (error) {
  console.error('Failed to save data:', error);
  // 實作回滾邏輯或用戶通知
}
```

### 數據備份

```typescript
// 匯出數據備份
const backup = await userDataService.exportData();

// 恢復數據
await userDataService.importData(backup);
```

### 清理數據

```typescript
// 清除所有用戶數據
await userDataService.clearAllData();
```

## 性能考量

### localStorage 限制

- 儲存上限: ~5-10MB (依瀏覽器而定)
- 同步操作: 可能阻塞 UI
- 域限制: 僅限相同域名

### GCS 優勢

- 無限儲存空間
- 異步操作
- 跨設備同步
- 版本控制和備份

## 監控和調試

### 調試模式

開發環境會顯示詳細的數據操作日誌：

```javascript
// 在瀏覽器控制台查看
console.log('Loading user data:', userData);
console.log('Saving data to localStorage:', dataToSave);
```

### 數據檢查

```javascript
// 檢查 localStorage 數據
localStorage.getItem('discoveryData');

// 檢查數據完整性
const userData = await userDataService.loadUserData();
console.log('Current data structure:', userData);
```

## 安全考量

### 數據隱私

- localStorage: 數據存儲在用戶本地
- GCS: 需要實作適當的加密和訪問控制

### 數據驗證

```typescript
// 數據結構驗證
const isValidData = (data: any): data is UserData => {
  return data && 
         typeof data.version === 'string' &&
         Array.isArray(data.achievements?.badges);
};
```

## 故障排除

### 常見問題

1. **數據丟失**: 檢查瀏覽器存儲限制和清理策略
2. **格式錯誤**: 確保版本兼容性和數據結構
3. **性能問題**: 考慮數據分片和懶加載

### 調試指令

```javascript
// 查看當前數據
await userDataService.loadUserData();

// 檢查數據是否存在
await userDataService.userDataExists();

// 強制重新載入
localStorage.removeItem('discoveryData');
location.reload();
```