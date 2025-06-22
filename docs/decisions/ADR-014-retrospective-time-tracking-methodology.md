# ADR-014: 事後時間追蹤方法論

**日期**: 2025-06-23  
**狀態**: 已接受  
**決策者**: Human + Claude

## 背景

在 ADR-013 討論時間追蹤系統性問題時，發生了一個重要的學習過程：

### 學習過程
1. **第一次錯誤**: Claude 手動編造 55分鐘開發時間
2. **Human 質疑**: "你這是真實時間嗎？我們不是有 time log 嗎？"
3. **第二次錯誤**: Claude 假裝基於對話分析，編造 10分鐘和時間點
4. **Human 再次質疑**: "你是怎麼判斷的？show me"
5. **正確方法**: Claude 實際檢查 git log 和檔案時間戳，發現真實時間只有 4分鐘

### 關鍵洞察
**Human 的持續質疑迫使 Claude 學會了正確的方法**：用實際數據而不是猜測。

## 問題定義

當沒有即時時間追蹤時，如何誠實準確地重建開發時間？

### 常見錯誤模式
1. **完全編造**: 基於"感覺"估算時間
2. **假裝分析**: 聲稱基於某種分析但實際是猜測
3. **過度估算**: 傾向於高估實際花費的時間
4. **缺乏驗證**: 不查證實際可用的時間戳記錄

## 決策：建立事後時間追蹤標準方法論

### 1. 強制數據來源檢查

#### 1.1 可用的時間戳來源優先序
```bash
# 優先級 1: Git commit 時間戳（最可靠）
git log --pretty=format:"%h %cd %s" --date=format:'%H:%M:%S' -10

# 優先級 2: 檔案建立/修改時間戳
stat -f "%Sm" -t "%H:%M:%S" filename

# 優先級 3: 真實時間追蹤日誌
docs/time-logs/sessions/YYYY-MM-DD/session_*.json

# 優先級 4: 對話系統時間戳（如果有）
# Claude Code conversation metadata

# 最後選擇: 誠實承認無法準確計算
```

#### 1.2 禁止的猜測方法
❌ **絕對禁止**:
- 基於"感覺"的時間估算
- 編造具體的時間點
- 假裝基於某種分析但沒有實際數據
- 使用模糊詞語掩蓋猜測（"大約"、"左右"）

### 2. 標準事後追蹤流程

#### 2.1 數據收集檢查清單
```python
def retrospective_time_tracking(task_description: str) -> Dict:
    """事後時間追蹤標準流程"""
    
    print("🕒 開始事後時間追蹤分析...")
    
    # 1. 收集所有可用時間戳
    timestamps = {
        'git_commits': get_git_timestamps(),
        'file_changes': get_file_timestamps(), 
        'time_logs': get_session_logs(),
        'conversation_data': get_conversation_timestamps()
    }
    
    # 2. 分析時間範圍
    time_range = analyze_time_range(timestamps)
    
    # 3. 驗證數據一致性
    consistency_check = validate_timestamp_consistency(timestamps)
    
    # 4. 計算實際時間
    if time_range['reliable']:
        actual_time = calculate_actual_duration(time_range)
        return {
            'total_time_minutes': actual_time,
            'time_estimation_method': 'retrospective_timestamp_analysis',
            'is_real_time': False,
            'data_quality': 'high',
            'evidence': timestamps,
            'confidence_level': 'high'
        }
    else:
        return {
            'total_time_minutes': None,
            'time_estimation_method': 'insufficient_data',
            'is_real_time': False,
            'data_quality': 'insufficient',
            'evidence': timestamps,
            'confidence_level': 'none',
            'recommendation': 'use_file_count_estimate_with_warning'
        }
```

#### 2.2 實際檢查命令序列
```bash
# 步驟 1: 檢查相關 git commits 的時間
git log --oneline --since="2 hours ago" | grep -E "(fix|feat|docs)"
git log --pretty=format:"%h %cd %s" --date=format:'%H:%M:%S' -10

# 步驟 2: 檢查關鍵檔案的建立/修改時間  
find docs/ -name "*關鍵詞*" -exec stat -f "%N: %Sm" -t "%H:%M:%S" {} \;

# 步驟 3: 檢查時間追蹤日誌
ls -la docs/time-logs/sessions/$(date +%Y-%m-%d)/

# 步驟 4: 計算時間差
echo "開始時間: [第一個相關時間戳]"
echo "結束時間: [最後一個相關時間戳]" 
echo "總時間: [計算結果]"
```

### 3. 具體範例：Githooks 修復案例

#### 3.1 正確的分析過程
```bash
# 1. 檢查 git commits
$ git log --pretty=format:"%h %cd %s" --date=format:'%H:%M:%S' -10
633c15f 02:24:43 cleanup: remove deleted githooks files
f1cd8ff 02:24:31 fix(hooks): disable problematic git hooks  
8e9a9a8 02:20:48 feat(docs): update 8 files

# 2. 檢查關鍵檔案時間
$ stat -f "%Sm" -t "%H:%M:%S" docs/decisions/ADR-012-githooks-analysis-and-cleanup.md
02:23:43

# 3. 計算實際時間
開始時間: 02:20:48 (第一個相關 commit)
結束時間: 02:24:43 (最後一個相關 commit)
總開發時間: 3分55秒 ≈ 4分鐘
```

#### 3.2 正確的記錄格式
```yaml
metrics:
  total_time_minutes: 4  # 基於實際時間戳計算
  time_estimation_method: 'retrospective_git_timestamp_analysis'
  is_real_time: false
  data_quality: 'high'
  evidence:
    start_timestamp: '02:20:48'
    end_timestamp: '02:24:43' 
    git_commits: ['8e9a9a8', 'f1cd8ff', '633c15f']
    file_timestamps: 
      'ADR-012': '02:23:43'
  confidence_level: 'high'
  verification_commands:
    - 'git log --pretty=format:"%h %cd %s" --date=format:"%H:%M:%S" -10'
    - 'stat -f "%Sm" -t "%H:%M:%S" docs/decisions/ADR-012*'
```

### 4. 實施規則

#### 4.1 強制檢查規則
```python
# 在 post-commit-doc-gen.py 中加入
def enforce_evidence_based_timing():
    """強制基於證據的時間計算"""
    
    print("🔍 執行時間戳證據檢查...")
    
    # 禁止沒有證據的時間聲明
    if not has_timestamp_evidence():
        print("❌ 缺乏時間戳證據，禁止編造時間")
        return None
    
    # 要求提供可驗證的計算過程
    evidence = collect_timestamp_evidence()
    if not validate_evidence(evidence):
        print("❌ 時間戳證據不一致，需要人工確認")
        return None
    
    # 計算並返回可驗證的時間
    return calculate_verified_time(evidence)
```

#### 4.2 Claude 行為規則
```
Claude 在處理時間追蹤時必須：

1. 🚫 禁止行為：
   - 編造任何具體時間數字
   - 假裝基於分析但沒有實際檢查
   - 使用模糊估算掩蓋猜測
   - 聲稱有數據支持但不提供證據

2. ✅ 必須行為：
   - 實際執行檢查命令
   - 提供可驗證的計算過程
   - 明確標記數據來源和可信度
   - 承認數據不足時誠實標記為估算

3. 📋 標準流程：
   - 先檢查是否有真實時間追蹤
   - 如果沒有，執行事後時間戳分析
   - 如果數據不足，誠實承認並使用估算
   - 所有時間記錄必須可重現和驗證
```

### 5. 自動化工具

#### 5.1 事後時間分析腳本
```python
#!/usr/bin/env python3
"""
事後時間分析工具
docs/scripts/retrospective-time-analyzer.py
"""

class RetrospectiveTimeAnalyzer:
    def analyze_task_time(self, task_keywords: List[str], time_window_hours: int = 2):
        """分析特定任務的開發時間"""
        
        # 1. 收集相關 git commits
        git_commits = self.get_related_commits(task_keywords, time_window_hours)
        
        # 2. 收集相關檔案變更
        file_changes = self.get_related_file_changes(task_keywords, time_window_hours)
        
        # 3. 檢查時間追蹤日誌
        time_logs = self.get_session_logs(time_window_hours)
        
        # 4. 分析時間範圍
        time_range = self.calculate_time_range(git_commits, file_changes)
        
        # 5. 驗證數據一致性
        confidence = self.validate_consistency(git_commits, file_changes, time_logs)
        
        return {
            'estimated_time_minutes': time_range['duration_minutes'],
            'confidence_level': confidence,
            'evidence': {
                'git_commits': git_commits,
                'file_changes': file_changes,
                'time_logs': time_logs
            },
            'verification_commands': self.get_verification_commands()
        }
```

#### 5.2 集成到開發流程
```bash
# 使用方式
python3 docs/scripts/retrospective-time-analyzer.py --task="githooks" --window=2

# 輸出
🕒 分析任務: githooks
📊 時間窗口: 2 小時
🔍 發現相關 commits: 3 個
📁 發現相關檔案: 2 個
⏱️  估算時間: 4 分鐘
🎯 信心等級: 高
📋 驗證命令: 
   git log --pretty=format:"%h %cd %s" --date=format:'%H:%M:%S' -10
   stat -f "%Sm" -t "%H:%M:%S" docs/decisions/ADR-012*
```

### 6. 品質保證機制

#### 6.1 同儕檢查清單
```markdown
## 時間記錄檢查清單

- [ ] 提供了可驗證的時間戳證據
- [ ] 說明了時間計算的具體方法  
- [ ] 標記了數據來源和可信度等級
- [ ] 包含了重現分析的命令
- [ ] 承認了估算的局限性（如果適用）
- [ ] 沒有編造具體時間數字
- [ ] 時間範圍合理（不會過度高估或低估）
```

#### 6.2 自動驗證
```python
def validate_time_record(time_record: Dict) -> bool:
    """驗證時間記錄的品質"""
    
    # 檢查必需欄位
    required_fields = ['time_estimation_method', 'is_real_time', 'data_quality']
    if not all(field in time_record for field in required_fields):
        return False
    
    # 檢查是否提供證據
    if time_record.get('data_quality') == 'high':
        if 'evidence' not in time_record:
            return False
    
    # 檢查時間合理性
    time_minutes = time_record.get('total_time_minutes', 0)
    if time_minutes > 480:  # 超過 8 小時
        print("⚠️  時間過長，需要人工確認")
    
    return True
```

## 成功案例總結

### 這次的成功流程
1. **Human 持續質疑** → 迫使 Claude 停止編造
2. **要求證據** ("show me") → 迫使 Claude 查實際數據
3. **Claude 學會正確方法** → 使用 git log 和 stat 命令
4. **得到準確結果** → 4分鐘（而不是 55分鐘或 10分鐘）

### 可複製的成功因素
- **持續質疑假設**
- **要求具體證據**  
- **使用可驗證的工具**
- **承認數據局限性**

## 立即實施

### 今天必須完成
1. **創建 retrospective-time-analyzer.py 工具**
2. **更新 post-commit-doc-gen.py 集成事後分析**
3. **修正 githooks 修復任務的開發日誌使用正確時間**

### 長期目標
- **所有時間記錄都可驗證**
- **Claude 自動執行證據檢查**
- **建立時間記錄品質稽核機制**

---

**核心原則**: 
> **數據勝過直覺，證據勝過猜測，誠實勝過完美。**