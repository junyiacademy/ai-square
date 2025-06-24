# 票券完整性多層檢查架構設計

**創建日期**: 2025-06-24  
**設計目的**: 解決票券重複和狀態不一致問題

## 1. 核心設計原則

### 職責分離
- **開發階段**: 檢查和提示
- **Pre-commit**: 強制驗證和狀態準備
- **Post-commit**: 只更新 commit 相關資訊
- **票券管理**: 統一的生命週期管理

### 防護層級
```
Layer 1: Development Time (預防)
Layer 2: Pre-commit (攔截)
Layer 3: Commit Process (驗證)
Layer 4: Post-commit (記錄)
```

## 2. 多層檢查架構

### Layer 1: 開發時檢查
```python
# 在以下時機觸發：
- make new-ticket    # 創建前檢查重複
- make resume-ticket # 恢復前驗證狀態
- make status       # 隨時查看當前狀態
- 編輯器整合       # 即時狀態提示（可選）
```

### Layer 2: Pre-commit 強制檢查
```python
def pre_commit_check():
    """Pre-commit 必須執行的檢查"""
    # 1. 檢查是否有 active ticket
    ticket = check_active_ticket()
    if not ticket:
        raise PreCommitError("必須有 active ticket 才能提交")
    
    # 2. 驗證票券完整性
    integrity = verify_ticket_integrity(ticket)
    if not integrity.is_valid:
        raise PreCommitError(f"票券完整性問題: {integrity.errors}")
    
    # 3. 準備狀態轉換（但不執行）
    prepare_ticket_completion(ticket)
    
    # 4. 檢查潛在衝突
    conflicts = check_ticket_conflicts(ticket)
    if conflicts:
        resolve_conflicts(conflicts)
```

### Layer 3: Commit 過程驗證
```python
# smart-commit.py 整合
class SmartCommitSystem:
    def __init__(self):
        self.ticket_validator = TicketIntegrityChecker()
    
    def validate_before_commit(self):
        # 強制票券檢查
        if not self.ticket_validator.has_valid_ticket():
            self.prompt_ticket_creation()
            return False
        return True
```

### Layer 4: Post-commit 最小化處理
```python
def post_commit_update():
    """Post-commit 只做必要更新"""
    # 1. 獲取已驗證的票券資訊
    ticket_info = get_verified_ticket_info()
    
    # 2. 只更新 commit 相關資訊
    update_commit_hash(ticket_info, commit_hash)
    update_actual_time(ticket_info, actual_time)
    
    # 3. 不創建、不移動、不改變狀態
    # 這些都應該在 pre-commit 完成
```

## 3. 統一的票券完整性檢查器

```python
class TicketIntegrityChecker:
    """統一的票券完整性檢查器"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.tickets_path = self.project_root / "docs" / "tickets"
        
    def check_ticket_exists(self, ticket_name: str) -> Dict:
        """檢查票券是否存在（所有目錄）"""
        locations = {
            'in_progress': self.tickets_path / 'in_progress',
            'completed': self.tickets_path / 'completed',
            'paused': self.tickets_path / 'paused'
        }
        
        found = {}
        for status, path in locations.items():
            matches = list(path.glob(f"*{ticket_name}*.yml"))
            if matches:
                found[status] = matches
                
        return found
    
    def verify_ticket_integrity(self, ticket_name: str) -> IntegrityResult:
        """完整的票券完整性驗證"""
        result = IntegrityResult()
        
        # 1. 檢查存在性
        locations = self.check_ticket_exists(ticket_name)
        
        # 2. 檢查重複
        if len(locations) > 1:
            result.add_error("票券存在於多個目錄", locations)
            
        # 3. 檢查狀態一致性
        for status, files in locations.items():
            for file in files:
                data = self._load_ticket(file)
                if data.get('status') != status:
                    result.add_error("狀態不一致", {
                        'file': file,
                        'file_status': status,
                        'data_status': data.get('status')
                    })
                    
        # 4. 檢查必要欄位
        if locations:
            ticket_data = self._load_ticket(list(locations.values())[0][0])
            required_fields = ['name', 'status', 'created_at']
            for field in required_fields:
                if field not in ticket_data:
                    result.add_error(f"缺少必要欄位: {field}")
                    
        return result
    
    def get_active_ticket(self) -> Optional[Dict]:
        """獲取當前 active ticket（帶完整性檢查）"""
        # 1. 從 git branch 推斷
        branch_ticket = self._get_ticket_from_branch()
        
        # 2. 從 in_progress 目錄查找
        in_progress_tickets = self._get_in_progress_tickets()
        
        # 3. 驗證一致性
        if branch_ticket and branch_ticket not in [t['name'] for t in in_progress_tickets]:
            raise IntegrityError(f"Branch ticket {branch_ticket} 不在 in_progress 中")
            
        # 4. 確保只有一個 active
        if len(in_progress_tickets) > 1:
            raise IntegrityError(f"發現多個 in_progress tickets: {len(in_progress_tickets)}")
            
        return in_progress_tickets[0] if in_progress_tickets else None
```

## 4. 實施步驟

### Phase 1: 建立基礎設施
1. 創建 `TicketIntegrityChecker` 類
2. 整合到現有工具中
3. 添加詳細的錯誤訊息

### Phase 2: 改造 Pre-commit
1. 移除 post-commit 的票券創建邏輯
2. 加強 pre-commit 的驗證
3. 實現狀態預備機制

### Phase 3: 簡化 Post-commit
1. 移除所有創建和移動邏輯
2. 只保留更新 commit 資訊
3. 確保冪等性

### Phase 4: 整合和測試
1. 更新 Makefile 命令
2. 添加整合測試
3. 處理邊界情況

## 5. 預期效果

### 解決的問題
- ✅ 票券重複問題
- ✅ 狀態不一致
- ✅ 責任不清晰
- ✅ 並發衝突

### 改進的體驗
- 更早發現問題
- 清晰的錯誤提示
- 一致的狀態管理
- 簡化的流程

## 6. 錯誤處理策略

### 常見錯誤場景
1. **沒有 active ticket**: 提示創建或恢復
2. **票券重複**: 顯示所有位置，提示清理
3. **狀態不一致**: 顯示衝突，提供修復選項
4. **必要欄位缺失**: 列出缺失欄位，提示補充

### 自動修復能力
- 簡單的狀態不一致可自動修復
- 重複票券提供合併選項
- 缺失欄位可從上下文推斷

## 7. 監控和日誌

### 記錄關鍵事件
- 票券創建/狀態變更
- 完整性檢查結果
- 自動修復動作
- 錯誤和警告

### 分析和改進
- 定期分析錯誤模式
- 優化檢查邏輯
- 改進用戶體驗