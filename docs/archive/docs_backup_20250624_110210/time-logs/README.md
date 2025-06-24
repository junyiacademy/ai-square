# 時間日誌系統

本目錄包含開發時間追蹤和分析系統的相關檔案。

## 目錄結構

```
docs/time-logs/
├── README.md                     # 本說明文檔（git 追蹤）
├── sessions/                     # 詳細會話日誌（不被 git 追蹤）
│   ├── 2025-06-23/              # 按日期組織
│   │   ├── session_021145.json  # 詳細的會話記錄
│   │   └── session_101230.json
│   └── [自動清理 30 天前的檔案]
├── aggregated/                   # 聚合統計（git 追蹤）
│   ├── daily/                   # 日度摘要
│   │   ├── 2025-06-23-summary.yml
│   │   └── 2025-06-22-summary.yml
│   ├── weekly/                  # 週度趨勢（待實現）
│   └── tools/                   # 工具效率報告（待實現）
└── analytics/                    # 分析腳本（git 追蹤）
    └── [待實現]
```

## 隱私保護策略

### 🔒 不被 git 追蹤的內容（隱私保護）
- **詳細會話日誌** (`sessions/`): 包含精確的時間戳、具體操作記錄
- **個人工作模式**: 工作節奏、中斷頻率、個人習慣
- **敏感時間資訊**: 具體的開始/結束時間、詳細的工具執行記錄

### 📊 被 git 追蹤的內容（團隊價值）
- **聚合統計** (`aggregated/`): 去個人化的開發效率數據
- **趨勢分析**: 週度/月度的開發模式分析
- **工具效率**: 去除具體時間的工具使用統計

## 資料保留政策

| 類型 | 保留期限 | 儲存位置 | Git 追蹤 | 用途 |
|------|----------|----------|----------|------|
| 詳細會話日誌 | 30 天 | `sessions/` | ❌ | 個人分析、調試 |
| 開發日誌時間欄位 | 永久 | `dev-logs/` | ✅ | 專案歷史記錄 |
| 聚合統計 | 永久 | `aggregated/` | ✅ | 趨勢分析 |

## 使用方式

### 基本時間追蹤
```python
from docs.scripts.time_tracker import start_tracking_session, end_tracking_session

# 開始追蹤
tracker = start_tracking_session("development")

# 記錄操作
tracker.start_operation("ai", "code analysis")
# ... 做一些工作 ...
tracker.end_operation()

# 結束會話
metrics = end_tracking_session()
```

### 在開發日誌中使用真實時間
```yaml
# dev-logs/2025-06-23-feature-example.yml
metrics:
  total_time_minutes: 125          # 真實記錄的時間
  ai_time_minutes: 95
  human_time_minutes: 30
  is_real_time: true               # 標記為真實時間
  time_estimation_method: "actual_tracking"
```

## 數據格式

### 詳細會話日誌格式 (sessions/)
```json
{
  "session_metrics": {
    "total_time_minutes": 0.1,
    "ai_time_minutes": 0.0,
    "human_time_minutes": 0.0,
    "is_real_time": true,
    "time_estimation_method": "actual_tracking"
  },
  "events": [
    {
      "timestamp": "2025-06-23T02:11:41.911743",
      "event_type": "ai_start",
      "details": "analyzing code",
      "duration_seconds": 2.005
    }
  ],
  "tool_executions": [
    {
      "tool_name": "Read",
      "duration_seconds": 0.504,
      "success": true
    }
  ]
}
```

### 聚合摘要格式 (aggregated/)
```yaml
date: '2025-06-23'
total_time_minutes: 125.0
ai_percentage: 76.0
human_percentage: 24.0
tool_execution_count: 15
session_efficiency_score: 87.5
generation_timestamp: '2025-06-23T14:30:00.123456'
```

## 自動清理

- **詳細會話日誌**: 自動清理 30 天前的檔案
- **觸發時機**: 每次結束會話時檢查
- **清理範圍**: 整個日期目錄 (`sessions/YYYY-MM-DD/`)

## 效率分析

系統會自動計算以下指標：

- **開發時間分配**: AI vs Human 操作時間比例
- **工具使用效率**: 各工具的平均執行時間和成功率
- **會話效率分數**: 基於成功率和執行時間的綜合評分
- **開發模式趨勢**: 長期的開發習慣變化

## 隱私聲明

本時間追蹤系統採用分層隱私保護：

1. **詳細的個人數據**: 僅保存在本地，不進入版本控制
2. **聚合的團隊數據**: 去除個人識別資訊後，用於團隊效率分析
3. **自動清理**: 個人詳細數據定期自動清理

你的具體工作時間、個人工作節奏等敏感資訊不會被永久保存或分享。