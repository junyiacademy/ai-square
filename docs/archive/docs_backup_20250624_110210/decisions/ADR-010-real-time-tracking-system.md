# ADR-010: 真實時間追蹤系統

**日期**: 2025-06-23  
**狀態**: 已接受  
**決策者**: Human + Claude

## 背景

用戶提出重要問題：

> "total_time 單位是什麼？請在key_name 標示單位
> 你這些時間AI 操作是真的還是假的？
> 有沒有可能每次執行的仔細記錄時間呀？"

當前的時間記錄系統存在問題：

### 1. 現有問題
```yaml
metrics:
  total_time: 60  # 沒有單位標示
  ai_percentage: 80.0
  human_percentage: 20.0
```

- **單位不明確**：不知道是分鐘、小時還是秒
- **時間是假的**：只是基於檔案變更數量的粗略估算
- **缺乏真實性**：無法反映實際開發時間
- **無法驗證**：沒有時間戳記錄

### 2. 當前的假估算邏輯
```python
# 簡單的時間估算規則
if total_changes <= 3:
    time_spent = 30  # 30分鐘
elif total_changes <= 10:
    time_spent = 60  # 1小時
elif total_changes <= 20:
    time_spent = 120  # 2小時
else:
    time_spent = 180  # 3小時

# AI 通常占 80% 的時間 (完全假設)
ai_time = int(time_spent * 0.8)
```

這種方式：
- 不反映真實開發複雜度
- 無法考慮思考時間、調試時間、重構時間
- AI vs Human 的比例是猜測的

## 決策

### 1. 實現真實時間追蹤系統

#### 1.1 時間記錄格式標準化
```yaml
metrics:
  total_time_minutes: 125        # 明確標示單位：分鐘
  ai_time_minutes: 95           # AI 實際操作時間
  human_time_minutes: 30        # 人類實際操作時間
  thinking_time_minutes: 15     # 思考和規劃時間
  debug_time_minutes: 8         # 除錯時間
  
  # 百分比（自動計算）
  ai_percentage: 76.0
  human_percentage: 24.0
  
  # 時間戳記錄
  start_timestamp: "2025-06-23T10:30:00+08:00"
  end_timestamp: "2025-06-23T12:35:00+08:00"
  duration_iso: "PT2H5M"        # ISO 8601 duration format
```

#### 1.2 自動時間追蹤機制
```python
class RealTimeTracker:
    def __init__(self):
        self.session_start = None
        self.ai_start = None
        self.human_start = None
        self.time_log = []
    
    def start_session(self, session_type: str):
        """開始追蹤會話"""
        self.session_start = datetime.now()
        self.log_event("session_start", session_type)
    
    def start_ai_operation(self, operation: str):
        """開始 AI 操作"""
        self.ai_start = datetime.now()
        self.log_event("ai_start", operation)
    
    def end_ai_operation(self):
        """結束 AI 操作"""
        if self.ai_start:
            duration = datetime.now() - self.ai_start
            self.log_event("ai_end", f"duration: {duration.total_seconds():.1f}s")
    
    def calculate_real_metrics(self) -> Dict:
        """計算真實時間指標"""
        ai_time = sum(e['duration'] for e in self.time_log if e['type'] == 'ai')
        human_time = sum(e['duration'] for e in self.time_log if e['type'] == 'human')
        # ... 計算邏輯
```

### 2. 多層級時間追蹤

#### 2.1 工具執行時間追蹤
```python
def track_tool_execution(func):
    """裝飾器：追蹤工具執行時間"""
    def wrapper(*args, **kwargs):
        start_time = time.time()
        tool_name = func.__name__
        
        try:
            result = func(*args, **kwargs)
            success = True
        except Exception as e:
            result = None
            success = False
        finally:
            end_time = time.time()
            duration = end_time - start_time
            
            # 記錄到時間日誌
            time_tracker.log_tool_execution(
                tool=tool_name,
                duration_seconds=duration,
                success=success
            )
        
        return result
    return wrapper

# 使用範例
@track_tool_execution
def read_file(file_path):
    # 實際讀取檔案
    pass
```

#### 2.2 思考時間估算
```python
def estimate_thinking_time(prompt_length: int, complexity: str) -> float:
    """估算 AI 思考時間"""
    base_time = prompt_length * 0.01  # 每字元 0.01 秒
    
    complexity_multiplier = {
        'simple': 1.0,
        'medium': 2.0,
        'complex': 3.5,
        'very_complex': 5.0
    }
    
    return base_time * complexity_multiplier.get(complexity, 1.0)
```

### 3. 會話時間管理

#### 3.1 自動時間追蹤
```python
class SessionTimeTracker:
    def __init__(self):
        self.sessions = []
        self.current_session = None
    
    def start_development_session(self):
        """開始開發會話"""
        self.current_session = {
            'start_time': datetime.now(),
            'activities': [],
            'tools_used': [],
            'files_touched': []
        }
    
    def log_activity(self, activity_type: str, details: str):
        """記錄活動"""
        if self.current_session:
            self.current_session['activities'].append({
                'timestamp': datetime.now(),
                'type': activity_type,
                'details': details
            })
    
    def end_session(self) -> Dict:
        """結束會話並計算指標"""
        if not self.current_session:
            return {}
        
        end_time = datetime.now()
        total_duration = end_time - self.current_session['start_time']
        
        # 分析活動類型
        ai_time = self._calculate_ai_time()
        human_time = self._calculate_human_time()
        
        return {
            'total_time_minutes': total_duration.total_seconds() / 60,
            'ai_time_minutes': ai_time,
            'human_time_minutes': human_time,
            'start_timestamp': self.current_session['start_time'].isoformat(),
            'end_timestamp': end_time.isoformat()
        }
```

#### 3.2 Claude Code 整合
```python
# 在 Claude Code 中追蹤時間
class ClaudeCodeTimeTracker:
    def __init__(self):
        self.conversation_start = datetime.now()
        self.tool_executions = []
        self.response_times = []
    
    def track_tool_call(self, tool_name: str, start_time: float, end_time: float):
        """追蹤工具調用時間"""
        self.tool_executions.append({
            'tool': tool_name,
            'start': start_time,
            'end': end_time,
            'duration_seconds': end_time - start_time
        })
    
    def generate_time_report(self) -> Dict:
        """生成時間報告"""
        total_tool_time = sum(t['duration_seconds'] for t in self.tool_executions)
        
        # 按工具類型分組
        tool_breakdown = {}
        for execution in self.tool_executions:
            tool = execution['tool']
            tool_breakdown[tool] = tool_breakdown.get(tool, 0) + execution['duration_seconds']
        
        return {
            'conversation_duration_minutes': (datetime.now() - self.conversation_start).total_seconds() / 60,
            'total_tool_execution_seconds': total_tool_time,
            'tool_breakdown_seconds': tool_breakdown,
            'estimated_thinking_time_seconds': self._estimate_thinking_time()
        }
```

### 4. 檔案格式更新

#### 4.1 開發日誌格式
```yaml
metrics:
  # 時間指標 (明確單位)
  total_time_minutes: 125
  ai_time_minutes: 95
  human_time_minutes: 30
  thinking_time_minutes: 15
  
  # 百分比
  ai_percentage: 76.0
  human_percentage: 24.0
  
  # 時間戳記錄
  start_timestamp: "2025-06-23T10:30:00+08:00"
  end_timestamp: "2025-06-23T12:35:00+08:00"
  
  # 工具使用統計
  tools_used:
    Read: 8
    Edit: 5
    Bash: 3
    Write: 2
  
  # 執行時間統計 (秒)
  tool_execution_time_seconds:
    Read: 12.5
    Edit: 8.3
    Bash: 15.7
    Write: 3.2
  
  # 檔案操作統計
  files_added: 8
  files_modified: 2
  files_deleted: 0
```

#### 4.2 故事時間記錄
```markdown
## 開發時間分析

**總開發時間**: 2小時5分鐘 (125分鐘)

### 時間分配
- **AI 操作時間**: 1小時35分鐘 (76%)
  - 程式碼分析: 25分鐘
  - 檔案編輯: 45分鐘
  - 文檔生成: 25分鐘
- **人類操作時間**: 30分鐘 (24%)
  - 需求澄清: 10分鐘
  - 決策制定: 15分鐘
  - 結果確認: 5分鐘

### 工具使用效率
- **Read**: 8次調用，平均1.6秒/次
- **Edit**: 5次調用，平均1.7秒/次
- **Bash**: 3次調用，平均5.2秒/次 (包含等待時間)
```

### 5. 實現策略

#### 5.1 第一階段：基礎追蹤
- [ ] 修正現有 metrics 單位標示
- [ ] 實現基本的時間戳記錄
- [ ] 追蹤工具執行時間

#### 5.2 第二階段：進階分析
- [ ] 實現會話時間管理
- [ ] 加入思考時間估算
- [ ] 建立時間分析報告

#### 5.3 第三階段：智能優化
- [ ] 基於歷史數據改進估算
- [ ] 識別效率瓶頸
- [ ] 提供時間優化建議

## 立即行動

### 1. 修正當前 metrics 格式
```python
# 在 post-commit-doc-gen.py 中
'metrics': {
    'total_time_minutes': time_info['total'],      # 明確標示分鐘
    'ai_time_minutes': time_info['ai'],
    'human_time_minutes': time_info['human'],
    'ai_percentage': round(time_info['ai'] / time_info['total'] * 100, 1),
    'human_percentage': round(time_info['human'] / time_info['total'] * 100, 1),
    'files_added': len(self.commit_info['changes']['added']),
    'files_modified': len(self.commit_info['changes']['modified']),
    'files_deleted': len(self.commit_info['changes']['deleted'])
}
```

### 2. 創建時間追蹤工具
```bash
# 新增檔案
docs/scripts/time-tracker.py
docs/scripts/session-timer.py
```

### 3. 整合到現有工作流程
- 修改 `commit-guide.py` 加入時間追蹤
- 更新 `post-commit-doc-gen.py` 的 metrics 格式
- 在 PLAYBOOK.md 中記錄使用方式

## 影響

### 正面影響
- 📊 **真實數據**：準確反映開發時間和效率
- 🎯 **優化目標**：識別時間浪費和效率瓶頸
- 📈 **趨勢分析**：追蹤開發效率的變化
- 💡 **洞察發現**：了解 AI vs Human 的真實貢獻

### 技術考量
- 需要在工具調用時加入時間記錄
- 可能會略微增加系統複雜度
- 需要處理跨時區的時間記錄

---

**重要**：這個系統將提供真實、可驗證的時間數據，而不是基於假設的估算。