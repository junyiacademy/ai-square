# ADR-022: AI 驅動的 Ticket 開發流程

## Status
Proposed

## Context
目前的問題：
1. AI 助手不會主動判斷是否需要開 ticket
2. Dev logs 和 tickets 沒有關聯
3. 時間追蹤依賴不可靠的檔案系統時間戳

## Decision

### 1. AI Ticket 判斷規則

**需要開 Ticket 的情況**：
```yaml
requires_ticket:
  - 新功能實作 (feat)
  - Bug 修復 (fix) 
  - 重構 (refactor)
  - 效能改進 (perf)
  - 任何需要修改多個檔案的變更
  - 預期開發時間 > 15 分鐘

skip_ticket:
  - 文檔更新 (docs) - 除非是大型文檔重構
  - 樣式調整 (style)
  - 簡單的 typo 修正
  - 單一設定檔更新
```

### 2. Ticket 與 Dev Log 關聯

```yaml
# dev-log 範例
type: feature
ticket_id: "2025-06-23-implement-search"  # 新增欄位
ticket_file: "docs/tickets/2025-06-23/implement-search.json"
title: "實作搜尋功能"
timeline:
  - phase: 實現
    duration: 45.0  # 從 ticket 的真實時間
```

### 3. AI 工作流程

```python
# AI 判斷邏輯
def should_create_ticket(user_request):
    indicators = {
        'new_feature': ['implement', 'add', 'create', 'build'],
        'bug_fix': ['fix', 'resolve', 'bug', 'issue'],
        'refactor': ['refactor', 'improve', 'optimize']
    }
    
    # 檢查關鍵詞
    for category, keywords in indicators.items():
        if any(keyword in user_request.lower() for keyword in keywords):
            return True
    
    # 檢查是否有現存的 active ticket
    active_ticket = get_active_ticket()
    if active_ticket:
        return False  # 繼續使用現有 ticket
    
    return False
```

### 4. Branch 策略分析

**傳統 Git Flow**：
```
main
├── develop
│   ├── feature/user-auth
│   ├── feature/search
│   └── bugfix/login-error
```

**AI 開發的特性**：
1. 快速迭代 - 一個 session 可能完成整個功能
2. 原子性提交 - AI 傾向做完整的變更
3. 即時 review - Human 在過程中就在 review

**建議的 Branch 策略**：

#### Option A: Ticket-Based Branches (推薦)
```bash
# 自動創建 ticket branch
make dev-ticket TICKET=search-feature
# 自動: git checkout -b ticket/2025-06-23-search-feature

# 完成時自動合併
make commit-ticket
# 自動: git add -A && git commit
# 自動: git checkout main && git merge --no-ff ticket/...
```

**優點**：
- 每個 ticket 獨立隔離
- 可以並行開發多個功能
- 保留完整的開發歷史
- 容易 rollback

#### Option B: Trunk-Based Development
```bash
# 直接在 main 開發
# 依賴 feature flags 或設定控制
```

**優點**：
- 簡化流程
- 減少 merge conflicts
- 更快的 feedback loop

### 5. 實作步驟

1. **更新 CLAUDE.md 規則**：
   ```markdown
   ## Ticket 開發規則
   
   當用戶要求以下類型的工作時，必須先開 ticket：
   - 實作新功能："請加入搜尋功能"
   - 修復 bug："登入按鈕沒反應"
   - 重構代碼："優化資料庫查詢"
   
   回應範例：
   "這個功能需要開發 ticket。讓我先創建 ticket：
   `make dev-ticket TICKET=implement-search-feature`"
   ```

2. **更新 ticket-manager.py**：
   - 加入 branch 管理功能
   - 自動關聯 dev logs

3. **更新 post-commit-doc-gen.py**：
   - 檢查 active ticket
   - 在 dev log 中加入 ticket_id

## Consequences

### Positive
- 所有開發都有追蹤記錄
- 時間計算更準確（基於 ticket 而非檔案）
- 可以並行開發多個功能
- 更好的可追溯性

### Negative  
- 增加開發流程步驟
- 小修改也可能需要 ticket
- 需要管理更多 branches

### Trade-offs
- 流程複雜度 vs 可追蹤性
- 開發速度 vs 品質控制
- Branch 管理 vs 簡單性

## Recommendation

建議採用 **Ticket-Based Branches** 策略，因為：
1. AI 可以自動處理 branch 操作
2. 提供更好的隔離性和可追溯性
3. Human 可以更容易 review 和 rollback
4. 符合企業級開發最佳實踐