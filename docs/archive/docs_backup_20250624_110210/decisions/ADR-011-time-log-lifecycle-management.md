# ADR-011: 時間日誌生命週期管理策略

**日期**: 2025-06-23  
**狀態**: 已接受  
**決策者**: Human + Claude

## 背景

用戶提出重要問題：

> "那這個 time log 會需要 git 嗎？還是當下給 commit 結算完，寫入文件就不要了？"

這涉及到時間日誌的生命週期管理，需要考慮：
- 儲存策略（git vs local only）
- 資料保留期限
- 隱私和安全考量
- 儲存空間管理
- 分析和查詢需求

## 策略分析

### 策略 1: Git 追蹤所有時間日誌
```
docs/time-logs/
├── session_20250623_021145.json
├── session_20250623_101230.json
└── session_20250623_143045.json
```

**優點**：
- 完整的歷史記錄
- 團隊可以看到開發時間趨勢
- 支援跨設備同步
- 可以做長期分析

**缺點**：
- 增加 repo 大小
- 可能包含敏感時間資訊
- 產生大量 commit noise
- 個人開發習慣被追蹤

### 策略 2: 完全不追蹤時間日誌
```
# .gitignore
docs/time-logs/
```

**優點**：
- 保持 repo 整潔
- 保護個人隱私
- 避免不必要的 commit

**缺點**：
- 無法做歷史分析
- 跨設備無法同步
- 團隊無法受益於時間數據

### 策略 3: 混合策略（推薦）
```
docs/time-logs/
├── .gitignore           # 忽略原始日誌
├── sessions/            # 原始會話日誌（不追蹤）
│   ├── session_*.json   
└── aggregated/          # 聚合統計（追蹤）
    ├── weekly-summary.json
    └── monthly-trends.json
```

## 決策：採用混合策略

### 1. 時間日誌分類管理

#### 1.1 不追蹤的日誌（隱私保護）
```bash
# 加入 .gitignore
docs/time-logs/sessions/
docs/time-logs/raw/
*.session.json
```

**包含內容**：
- 詳細的操作時間戳
- 具體的工具執行時間
- 個人工作習慣數據
- 敏感的開發過程記錄

#### 1.2 追蹤的聚合數據（團隊價值）
```bash
# 包含在 git 中
docs/time-logs/aggregated/
├── daily-summary.yml
├── weekly-trends.yml
└── tool-efficiency.yml
```

**包含內容**：
- 日/週/月的開發時間總結
- 工具使用效率統計
- 開發模式趨勢分析
- 去除個人識別的聚合數據

### 2. 具體實現策略

#### 2.1 原始日誌（本地保留 30 天）
```python
class SessionManager:
    def save_session_log(self):
        # 保存到本地，不加入 git
        session_dir = self.project_root / "docs" / "time-logs" / "sessions"
        session_file = session_dir / f"session_{timestamp}.json"
        
        # 自動清理 30 天前的檔案
        self.cleanup_old_sessions(days=30)
        
        return session_file
```

#### 2.2 聚合報告（git 追蹤）
```python
class AggregatedReporter:
    def generate_daily_summary(self, date: str):
        """生成日度聚合報告"""
        sessions = self.load_sessions_for_date(date)
        
        summary = {
            'date': date,
            'total_development_time_minutes': sum(s.total_time for s in sessions),
            'session_count': len(sessions),
            'avg_session_length_minutes': statistics.mean([s.total_time for s in sessions]),
            'tool_usage': self.aggregate_tool_usage(sessions),
            'efficiency_score': self.calculate_efficiency_score(sessions)
        }
        
        # 保存到 git 追蹤的目錄
        summary_file = self.project_root / "docs" / "time-logs" / "aggregated" / f"{date}-summary.yml"
        self.save_yaml(summary, summary_file)
```

#### 2.3 commit 後處理流程
```python
def post_commit_time_processing():
    """commit 後的時間數據處理"""
    
    # 1. 結束當前會話，保存詳細日誌（不追蹤）
    session_metrics = end_tracking_session()
    
    # 2. 將真實時間數據寫入開發日誌（追蹤）
    dev_log_metrics = {
        'total_time_minutes': session_metrics['total_time_minutes'],
        'ai_time_minutes': session_metrics['ai_time_minutes'], 
        'human_time_minutes': session_metrics['human_time_minutes'],
        'is_real_time': True,
        'time_estimation_method': 'actual_tracking'
    }
    update_dev_log_with_real_time(dev_log_metrics)
    
    # 3. 更新聚合統計（追蹤）
    update_aggregated_stats(session_metrics)
    
    # 4. 清理過期的原始日誌（不追蹤）
    cleanup_expired_sessions()
```

### 3. 目錄結構設計

```
docs/time-logs/
├── .gitignore                    # 忽略 sessions/ 和 raw/
├── README.md                     # 說明文檔（追蹤）
├── sessions/                     # 原始會話日誌（不追蹤）
│   ├── 2025-06-23/
│   │   ├── session_021145.json
│   │   └── session_101230.json
│   └── cleanup-policy.md
├── aggregated/                   # 聚合統計（追蹤）
│   ├── daily/
│   │   ├── 2025-06-23-summary.yml
│   │   └── 2025-06-22-summary.yml
│   ├── weekly/
│   │   └── 2025-W25-trends.yml
│   └── tools/
│       └── efficiency-report.yml
└── analytics/                    # 分析腳本（追蹤）
    ├── generate-weekly-report.py
    └── analyze-efficiency.py
```

### 4. .gitignore 配置

```bash
# Time Logs - Privacy Protection
docs/time-logs/sessions/
docs/time-logs/raw/
*.session.json
*.detailed-log.json

# Keep aggregated data for team insights
!docs/time-logs/aggregated/
!docs/time-logs/analytics/
!docs/time-logs/README.md
```

### 5. 數據保留政策

#### 5.1 本地原始日誌
- **保留期限**: 30 天
- **自動清理**: 每次 commit 後檢查
- **用途**: 個人效率分析、問題調試

#### 5.2 開發日誌中的時間數據
- **保留期限**: 永久（隨專案）
- **包含內容**: 聚合的時間指標
- **用途**: 專案歷史、開發回顧

#### 5.3 聚合統計
- **保留期限**: 永久（隨專案）
- **更新頻率**: 每日/每週
- **用途**: 趨勢分析、效率優化

### 6. 隱私和安全考量

#### 6.1 個人隱私保護
```yaml
# 不追蹤的敏感數據
sensitive_data:
  - 具體的操作時間戳
  - 詳細的工具執行記錄
  - 個人工作節奏模式
  - 中斷和暫停記錄
```

#### 6.2 團隊共享的有價值數據
```yaml
# 追蹤的有價值數據
valuable_data:
  - 不同類型任務的平均開發時間
  - 工具使用效率統計
  - 開發模式趨勢
  - 去個人化的聚合指標
```

### 7. 實現步驟

#### 7.1 立即實施
```bash
# 1. 設定 .gitignore
echo "docs/time-logs/sessions/" >> .gitignore
echo "*.session.json" >> .gitignore

# 2. 創建目錄結構
mkdir -p docs/time-logs/{sessions,aggregated,analytics}

# 3. 修改時間追蹤器
# 將詳細日誌保存到 sessions/，聚合數據保存到 aggregated/
```

#### 7.2 後續開發
- [ ] 實現聚合報告生成器
- [ ] 添加自動清理功能
- [ ] 建立效率分析工具
- [ ] 創建趨勢分析儀表板

## 影響分析

### 正面影響
- 🔒 **隱私保護**: 個人詳細數據不被追蹤
- 📊 **團隊價值**: 聚合數據幫助團隊改進
- 🧹 **Repo 整潔**: 避免大量原始日誌污染
- 📈 **長期分析**: 保留有價值的趨勢數據

### 注意事項
- 需要實現自動清理機制
- 聚合邏輯需要仔細設計
- 平衡隱私和團隊價值

## 結論

**採用混合策略**：
- **原始時間日誌**: 本地保留 30 天，不追蹤
- **聚合統計**: git 追蹤，團隊共享
- **開發日誌中的時間數據**: 包含真實但聚合的時間指標

這樣既保護了個人隱私，又為團隊提供了有價值的開發效率數據。