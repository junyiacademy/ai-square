# ADR-016: 基於 Commit 的時間分析方法論

**日期**: 2025-06-23  
**狀態**: 已接受  
**決策者**: Human + Claude

## 背景

從 ADR-015 Ticket 工作流程的實施過程中，我們發現了時間分析的關鍵問題：

### 經驗教訓
1. **錯誤的時間範圍**: 搜尋 2 小時內所有活動 → 得到 83.4 分鐘
2. **正確的分析方法**: 基於 commit 檔案時間戳 → 得到 7-8 分鐘
3. **關鍵洞察**: Git commit 是自然的時間邊界，應該以此為單位分析

### Human 的關鍵質疑
> "在 01:26:03 → 02:49:30 這段時間內，我們有很多 commit 也有很多 dev-logs，要怎麼合理把時間分配進去呢？"

這個質疑揭示了根本問題：**時間歸屬和邊界劃分**。

## 決策：基於 Commit 的時間分析方法論

### 核心原則

#### 1. Commit 邊界原則
```
每個 commit = 一個獨立的時間計算單位
時間範圍 = 這次 commit 涉及檔案的修改時間範圍
```

#### 2. 檔案時間戳優先原則
```
優先級 1: 這次 commit 檔案的修改時間戳
優先級 2: 上一個 commit 到這次 commit 的時間差
優先級 3: 對話或會話開始時間（如果有）
優先級 4: 檔案數量估算（最後選擇）
```

#### 3. 精確邊界劃分原則
```
排除其他 commit 的影響
只計算當前 commit 相關的工作時間
避免時間重複計算
```

### 技術實施

#### 1. 新的時間分析演算法
```python
def analyze_commit_time(commit_hash: str = "HEAD") -> Dict:
    """基於 commit 的精確時間分析"""
    
    # 1. 獲取這次 commit 的檔案列表
    changed_files = get_commit_files(commit_hash)
    
    # 2. 獲取每個檔案的修改時間戳
    file_timestamps = []
    for file in changed_files:
        mtime = get_file_modification_time(file)
        file_timestamps.append({
            'file': file,
            'timestamp': mtime
        })
    
    # 3. 計算時間範圍
    if file_timestamps:
        start_time = min(ts['timestamp'] for ts in file_timestamps)
        end_time = max(ts['timestamp'] for ts in file_timestamps)
        duration_minutes = (end_time - start_time).total_seconds() / 60
    else:
        # 備用方案：使用 commit 間隔
        duration_minutes = get_commit_interval_time(commit_hash)
    
    # 4. 驗證合理性
    if duration_minutes > 180:  # 超過 3 小時，可能不合理
        duration_minutes = estimate_by_file_count(len(changed_files))
        confidence = 'low'
    else:
        confidence = 'high'
    
    return {
        'total_time_minutes': round(duration_minutes, 1),
        'time_estimation_method': 'commit_file_timestamp_analysis',
        'confidence_level': confidence,
        'evidence': file_timestamps,
        'commit_hash': commit_hash
    }
```

#### 2. 實際案例驗證
**ADR-015 Commit 的正確分析：**
```bash
# 檢查這次 commit 的檔案
git diff HEAD~1 --name-only
# → Makefile, ADR-015, commit-guide.py, post-commit-doc-gen.py

# 檢查檔案修改時間
stat -f "%Sm" -t "%H:%M:%S" [files]
# → 02:48:42 到 02:51:19 = 2.6 分鐘

# 考慮對話時間
# 02:47:56 (對話開始) 到 02:52:36 (commit完成) = 4.7 分鐘

# 結論：實際開發時間 7-8 分鐘
```

### 與現有系統的關係

#### 1. Time Tracker 的新定位
**保留但重新定位：**
- ✅ **保留價值**: 提供 AI vs Human 時間分配
- ✅ **保留價值**: 記錄具體操作細節
- ❌ **不再依賴**: 總時間計算（經常忘記啟動）
- ❌ **不再依賴**: 作為主要時間來源

**新角色：輔助增強資料**
```python
def enhanced_commit_analysis():
    # 主要時間來源：檔案時間戳
    base_time = analyze_commit_time()
    
    # 輔助增強：time tracker（如果有）
    tracker_data = get_tracker_data_if_available()
    if tracker_data:
        base_time['ai_human_breakdown'] = tracker_data
        base_time['detailed_operations'] = tracker_data
    else:
        # 使用經驗比例
        base_time['ai_time_minutes'] = base_time['total_time_minutes'] * 0.8
        base_time['human_time_minutes'] = base_time['total_time_minutes'] * 0.2
    
    return base_time
```

#### 2. Retrospective Analyzer 的修正
**主要問題：範圍太大**
```python
# 錯誤的方法
def analyze_task_time(keywords, hours=2):  # 搜尋 2 小時
    commits = get_related_commits(keywords, hours)  # 太多 commits
    
# 正確的方法  
def analyze_commit_time(commit_hash="HEAD"):  # 針對特定 commit
    files = get_commit_files(commit_hash)  # 只看這次的檔案
```

### 實施策略

#### 階段 1: 立即修正（今天）
1. **修正 commit-guide.py** 的時間計算邏輯
2. **修正 retrospective-time-analyzer.py** 改為 commit-based 分析
3. **修正 post-commit-doc-gen.py** 使用新的時間計算方法

#### 階段 2: 系統整合（本週）
1. **更新所有 ADR** 反映新的時間分析方法
2. **修正歷史數據** 使用新方法重新計算
3. **建立驗證機制** 確保時間計算的合理性

#### 階段 3: 長期優化（未來）
1. **自動異常檢測** 識別不合理的時間範圍
2. **機器學習優化** 基於歷史數據改善估算準確度
3. **跨 commit 時間追蹤** 處理大型功能開發

### 新的工作流程

#### 1. 開發者工作流程
```bash
# 1. 開始開發（可選啟動 tracker）
make dev-ticket TICKET=feature-name  # 可選

# 2. 開發過程
# 正常開發，檔案時間戳自動記錄

# 3. 提交時自動計算
make commit-ticket  # 或 git commit
# 自動基於檔案時間戳計算準確時間
```

#### 2. 時間計算流程
```python
def commit_time_calculation():
    # 1. 基於檔案時間戳計算主要時間
    main_time = analyze_commit_file_timestamps()
    
    # 2. 檢查是否有 tracker 數據（可選增強）
    if tracker_available():
        enhanced_data = integrate_tracker_data()
        return merge(main_time, enhanced_data)
    
    # 3. 使用經驗分配 AI/Human 時間
    return apply_default_time_allocation(main_time)
```

### 成功指標

#### 量化指標
- **時間計算準確度**: 90% 在合理範圍內（< 3小時）
- **覆蓋率**: 100% 的 commit 都有時間記錄
- **一致性**: 相似 commit 的時間估算誤差 < 30%

#### 質化指標
- **可驗證性**: 每個時間記錄都有檔案時間戳證據
- **合理性**: 時間分配符合實際開發體驗
- **簡潔性**: 不依賴手動啟動，自動計算

## 對 Time Tracker 的重新定位

### 保留的價值
1. **詳細分析**: 當需要深入了解開發過程時
2. **AI/Human 分工**: 提供精確的時間分配
3. **操作追蹤**: 記錄具體工具使用情況
4. **效率分析**: 識別開發瓶頸

### 不再依賴的部分
1. **總時間計算**: 改用檔案時間戳
2. **強制啟動**: 不再要求每次都啟動
3. **主要數據來源**: 降級為輔助數據

### 新的使用策略
```
日常開發: 檔案時間戳自動計算 ✅
重要分析: 啟動 time tracker 獲得詳細數據 ✅
效率優化: 使用 tracker 數據分析瓶頸 ✅
成本計算: 結合兩種數據源獲得最佳估算 ✅
```

## 關鍵洞察總結

### 1. 自然邊界原則
**Git commit 是最自然的時間邊界**，每個 commit 代表一個完整的工作單位。

### 2. 檔案時間戳可靠性
**檔案修改時間戳**是最可靠的開發時間證據，不會忘記記錄，不會有人為錯誤。

### 3. 範圍控制重要性
**精確的範圍控制**避免時間重複計算，確保每分鐘的開發時間都歸屬到正確的 commit。

### 4. 多層驗證策略
**結合多種數據源**但以檔案時間戳為主，其他為輔，確保數據的準確性和完整性。

### 5. 簡潔性勝過完美性
**自動化勝過手動精確**，寧可有 90% 準確的自動計算，也不要 100% 準確但經常遺漏的手動記錄。

---

**核心原則**: 
> **Git commit 為邊界，檔案時間戳為證據，範圍控制為關鍵，自動化為目標。**