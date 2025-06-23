# ADR-023: 並行 Ticket 管理策略

## Status
Proposed

## Context
實際開發中常見場景：
```
User: 幫我實作搜尋功能
AI: [創建 ticket: search-feature]
... 開發中 ...

User: 等等，我發現登入有個 bug 要先修
AI: ??? 如何處理？

User: 回到搜尋功能繼續
AI: ??? 在哪個 branch？哪個 context？
```

## Decision

### 1. Ticket 切換命令

```bash
# 新增 Makefile 命令
make switch-ticket TICKET=<name>     # 切換到其他 ticket
make list-tickets                    # 列出所有 tickets
make pause-ticket                    # 暫停當前 ticket
make resume-ticket TICKET=<name>     # 恢復指定 ticket
```

### 2. AI Context Management

#### A. Ticket 狀態追蹤
```python
class TicketContext:
    """Ticket 上下文管理"""
    
    def __init__(self):
        self.active_ticket = None
        self.paused_tickets = []
        self.ticket_contexts = {}  # 儲存每個 ticket 的上下文
    
    def pause_current(self):
        """暫停當前 ticket"""
        if self.active_ticket:
            # 保存當前狀態
            self.ticket_contexts[self.active_ticket] = {
                'branch': self.get_current_branch(),
                'modified_files': self.get_modified_files(),
                'last_action': datetime.now(),
                'context': self.capture_context()
            }
            self.paused_tickets.append(self.active_ticket)
            self.active_ticket = None
    
    def switch_to(self, ticket_name):
        """切換到指定 ticket"""
        # 先暫停當前的
        self.pause_current()
        
        # 切換到新的
        if ticket_name in self.ticket_contexts:
            # 恢復上下文
            context = self.ticket_contexts[ticket_name]
            subprocess.run(['git', 'checkout', context['branch']])
            self.restore_context(context)
        
        self.active_ticket = ticket_name
```

#### B. AI 回應策略

**場景 1: 用戶突然切換話題**
```
User: 等等，我要先修另一個問題
AI: 我發現您想要處理另一個問題。當前正在進行 search-feature ticket。
    
    請選擇：
    1. 暫停當前 ticket，創建新的
    2. 完成當前 ticket 後再處理
    3. 這是 search-feature 的一部分
    
    建議：如果是獨立問題，選擇 1 會更好追蹤。
```

**場景 2: 用戶想回到之前的 ticket**
```
User: 回到搜尋功能
AI: 找到暫停的 ticket: search-feature
    
    [執行: make resume-ticket TICKET=search-feature]
    
    已切換回 search-feature (branch: ticket/search-feature)
    上次進度：實作了基本搜尋 UI，正在處理搜尋邏輯
```

### 3. 實作方案

#### Option A: Strict Mode (嚴格模式)
- 一次只能有一個 active ticket
- 必須明確暫停/切換
- 優點：清晰、可追蹤
- 缺點：較死板

#### Option B: Smart Mode (智能模式) ⭐ 推薦
- AI 自動識別 context 切換
- 提示用戶確認
- 自動管理 branch 和狀態

#### Option C: Parallel Mode (並行模式)
- 允許多個 active tickets
- 用 workspace 隔離
- 優點：靈活
- 缺點：複雜、容易混亂

### 4. 智能模式實作

```python
class SmartTicketManager:
    
    def detect_context_switch(self, user_message, current_ticket):
        """檢測是否需要切換 context"""
        
        # 1. 明確指示
        if any(phrase in user_message.lower() for phrase in [
            "回到", "繼續", "切換到", "back to", "continue with"
        ]):
            return self.extract_ticket_reference(user_message)
        
        # 2. 主題分析
        current_topic = self.get_ticket_topic(current_ticket)
        message_topic = self.analyze_topic(user_message)
        
        if self.topics_different(current_topic, message_topic):
            return 'SUGGEST_NEW_TICKET'
        
        return None
    
    def handle_ambiguous_request(self, user_message):
        """處理模糊請求"""
        return f"""
        您的請求可能需要切換工作內容。
        
        當前 ticket: {self.active_ticket}
        暫停的 tickets: {self.list_paused_tickets()}
        
        這個請求是：
        1. 當前 ticket 的一部分
        2. 需要新的 ticket
        3. 要切換到暫停的 ticket
        
        請告訴我您的意圖。
        """
```

### 5. 工作流程範例

```bash
# Session 開始
make dev-ticket TICKET=search-feature
# -> 創建 ticket, branch: ticket/search-feature

# 用戶突然想到別的
User: "我發現登入按鈕壞了"
AI: "這似乎是個新問題。要暫停 search-feature 並創建新 ticket 嗎？"

User: "是的"
make pause-ticket
make dev-ticket TICKET=fix-login-button  
# -> 保存 search-feature 狀態
# -> 創建新 ticket, branch: ticket/fix-login-button

# 修復完成
make commit-ticket
# -> 完成 fix-login-button, 合併到 main

# 用戶想繼續之前的
User: "繼續搜尋功能"
make resume-ticket TICKET=search-feature
# -> 切換回 ticket/search-feature
# -> AI 載入之前的 context

# 或者列出所有進行中的工作
make list-tickets
# 輸出:
# Active: None
# Paused: search-feature (暫停 15 分鐘前)
# Completed Today: fix-login-button
```

### 6. CLAUDE.md 更新

```markdown
## 並行 Ticket 處理規則

### Context 切換識別
當用戶的請求與當前 ticket 主題不符時：
1. 先詢問是否需要切換
2. 不要自動創建新 ticket
3. 提供清晰的選項

### 回應範例
```
您提到了 [新主題]，這與當前的 [ticket名稱] 不同。

請問您想要：
1. 暫停當前工作，處理新問題
2. 將這作為當前 ticket 的一部分
3. 先完成當前工作

建議：[根據情況給出建議]
```

### Ticket 狀態管理
- 使用 `make list-tickets` 查看所有 tickets
- 使用 `make pause-ticket` 暫停當前工作
- 使用 `make resume-ticket TICKET=xxx` 恢復工作
```

## Consequences

### Positive
- 支援真實的開發模式（常常需要切換）
- 保持每個任務的完整性
- 清晰的 branch 管理
- 更好的時間追蹤

### Negative
- 增加複雜度
- 需要更多用戶交互
- 可能有 merge conflicts

## Recommendation
採用 **Smart Mode**，因為：
1. 平衡了靈活性和結構化
2. AI 可以智能提示但不會自作主張
3. 保持清晰的工作記錄