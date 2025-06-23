# ADR-024: Work in Progress (WIP) 管理策略

## Status
Proposed

## Context
當暫停一個 ticket 時，通常會有未提交的變更：
- 已修改但未 staged 的檔案
- 已 staged 但未 commit 的檔案
- 功能完成一半的代碼

問題：這些變更該如何處理？

## Decision

### 變更保存策略比較

#### Option A: Git Stash (推薦) ⭐
```bash
# 暫停時
git add -A
git stash save "WIP: implement-search ticket"

# 恢復時
git stash list
git stash pop stash@{0}
```

**優點**：
- Git 原生支援
- 可以有多個 stash
- 包含完整的變更內容
- 不會污染 commit 歷史

**缺點**：
- Stash 在 branch 之間共享（可能混淆）
- 需要記住 stash 編號

#### Option B: WIP Commit
```bash
# 暫停時
git add -A
git commit -m "WIP: implement-search (paused)"

# 恢復時
# 繼續在這個 commit 上工作
# 完成時用 git commit --amend
```

**優點**：
- 變更綁定在 branch 上
- 不會遺失
- 可以 push 到遠端備份

**缺點**：
- 需要記得使用 --amend
- 可能不小心 push WIP commit

#### Option C: Branch State (智能選擇) ⭐⭐
根據變更狀態自動選擇最佳策略：

```python
def save_work_in_progress(self):
    """智能保存 WIP"""
    status = self.get_git_status()
    
    if status['has_staged_files'] or status['has_modified_files']:
        if status['changes_count'] > 10 or status['has_conflicts']:
            # 複雜變更：使用 WIP commit
            return self.create_wip_commit()
        else:
            # 簡單變更：使用 stash
            return self.create_stash()
    else:
        # 沒有變更
        return None
```

### 實作方案

更新 `ticket-manager.py` 加入 WIP 管理：

```python
def pause_ticket(self, ticket_name: str = None) -> bool:
    """暫停 ticket 並保存 WIP"""
    # ... existing code ...
    
    # 保存 WIP
    wip_info = self._save_wip(ticket_name)
    if wip_info:
        ticket_data['wip_info'] = wip_info
        print(f"💾 已保存進行中的變更: {wip_info['method']}")

def _save_wip(self, ticket_name: str) -> dict:
    """保存 work in progress"""
    # 檢查是否有未提交的變更
    status = subprocess.run(
        ['git', 'status', '--porcelain'],
        capture_output=True,
        text=True
    )
    
    if not status.stdout.strip():
        return None
    
    # 統計變更
    changes = status.stdout.strip().split('\n')
    change_count = len(changes)
    
    # 決定保存策略
    if change_count <= 5:
        # 少量變更：使用 stash
        subprocess.run(['git', 'add', '-A'])
        result = subprocess.run(
            ['git', 'stash', 'push', '-m', f'WIP: {ticket_name}'],
            capture_output=True,
            text=True
        )
        
        # 獲取 stash 編號
        stash_list = subprocess.run(
            ['git', 'stash', 'list'],
            capture_output=True,
            text=True
        )
        stash_id = stash_list.stdout.split('\n')[0].split(':')[0]
        
        return {
            'method': 'stash',
            'stash_id': stash_id,
            'files_count': change_count,
            'timestamp': datetime.now().isoformat()
        }
    else:
        # 大量變更：創建 WIP commit
        subprocess.run(['git', 'add', '-A'])
        subprocess.run([
            'git', 'commit', '-m', 
            f'WIP: {ticket_name} (paused at {datetime.now().strftime("%H:%M")})'
        ])
        
        # 獲取 commit hash
        commit_hash = subprocess.run(
            ['git', 'rev-parse', 'HEAD'],
            capture_output=True,
            text=True
        ).stdout.strip()[:7]
        
        return {
            'method': 'commit',
            'commit_hash': commit_hash,
            'files_count': change_count,
            'timestamp': datetime.now().isoformat()
        }

def resume_ticket(self, ticket_name: str) -> bool:
    """恢復 ticket 並還原 WIP"""
    # ... existing code ...
    
    # 恢復 WIP
    if 'wip_info' in ticket_data:
        self._restore_wip(ticket_data['wip_info'])
        print(f"♻️  已恢復之前的變更")
```

### 使用者體驗

#### 暫停時的提示
```
⏸️ 暫停 ticket: implement-search
💾 偵測到 3 個未提交的檔案變更
📦 使用 git stash 保存變更 (stash@{0})
✅ 可以安全切換到其他工作
```

#### 恢復時的提示
```
▶️ 恢復 ticket: implement-search
🌿 切換到 branch: ticket/implement-search
♻️ 恢復之前保存的變更 (3 個檔案)
📝 上次修改：
   - src/components/SearchBar.tsx
   - src/api/search.ts
   - src/types/search.d.ts
```

### 特殊情況處理

#### 1. 有衝突時
```python
def _restore_wip_with_conflict_handling(self, wip_info):
    if wip_info['method'] == 'stash':
        result = subprocess.run(
            ['git', 'stash', 'pop', wip_info['stash_id']],
            capture_output=True,
            text=True
        )
        
        if 'conflict' in result.stderr.lower():
            print("⚠️  恢復變更時發生衝突")
            print("請手動解決衝突後繼續")
            return False
```

#### 2. Branch 不存在
```python
# 如果 branch 被刪除，從 main 重新創建
if not self._branch_exists(ticket_data['branch']):
    print(f"⚠️  Branch {ticket_data['branch']} 不存在")
    print("📌 從 main 創建新 branch")
    subprocess.run(['git', 'checkout', '-b', ticket_data['branch']])
```

### 最佳實踐建議

1. **小變更用 Stash**
   - 快速切換
   - 不污染歷史

2. **大變更用 WIP Commit**
   - 更安全
   - 可以 push 備份

3. **完成的部分先 Commit**
   ```bash
   # 如果有完成的功能，先提交
   git add src/components/CompletedComponent.tsx
   git commit -m "feat: add search UI component"
   
   # 然後暫停，只 stash 未完成的部分
   make pause-ticket
   ```

## Consequences

### Positive
- 不會遺失工作進度
- 可以安全地切換 context
- 保持 git 歷史整潔
- 支援緊急 bug 修復

### Negative
- 增加複雜度
- 需要理解 git stash/WIP commit
- 可能遇到合併衝突

## Implementation Status
- [ ] 更新 ticket-manager.py 加入 WIP 管理
- [ ] 更新 Makefile 命令
- [ ] 加入衝突處理邏輯
- [ ] 更新 CLAUDE.md 說明