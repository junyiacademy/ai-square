# AI 驅動開發的典範轉移：從線性到並行的工作流程革命

## 故事的開始：一個看似簡單的對話

2025年6月23日，一個平凡的開發日常：

```
Developer: 幫我實作搜尋功能
AI: 好的，我開始實作搜尋功能...

[10分鐘後]

Developer: 等等，我剛發現登入按鈕壞了，要先修這個
AI: ...（該怎麼辦？）
```

這個簡單的場景，揭露了 AI 協作開發的根本性挑戰。

## 為什麼人類開發者沒有這個問題？

### 人類的隱性知識

當人類開發者遇到同樣的情況時：

1. **心智模型**：人類大腦自動維護著多個 mental context
   - "我正在做搜尋功能"
   - "登入有個 bug 要修"
   - "下午還要開會討論 API"

2. **無縫切換**：
   ```bash
   # 人類開發者的大腦
   git stash                    # 下意識的動作
   git checkout -b fix-login    # 肌肉記憶
   # 修復 bug...
   git checkout feature/search  # 自然而然
   git stash pop               # 不需要提醒
   ```

3. **模糊記憶**：
   - 不需要精確記住每個細節
   - 看到代碼就能回憶起 context
   - 錯了可以 undo

### AI 的結構化困境

但 AI 不同：

1. **無狀態對話**：每次對話都是新的開始
2. **缺乏持續記憶**：沒有 "我剛才在做什麼"
3. **過度服從**：用戶說什麼就做什麼
4. **缺乏判斷**：不知道何時該暫停、何時該繼續

## 典範轉移：從隱性到顯性

### 傳統開發（人類思維）
```
大腦 → 直覺 → 行動
     ↓
   經驗判斷
```

### AI 協作開發（需要外顯化）
```
意圖 → 結構化 → 追蹤 → 行動
     ↓         ↓      ↓
   Ticket   Branch  State
```

## 我們的解決方案：三層架構

### 第一層：Ticket 驅動（ADR-022）

**問題**：AI 不知道任務邊界
**解決**：每個任務都是一個 Ticket

```python
# 人類的思維
"我要做搜尋功能" → 開始寫 code

# AI 需要的結構
"我要做搜尋功能" → create_ticket("search-feature") → 開始寫 code
```

**改變**：
- 任務有了明確的開始和結束
- 時間可以被準確追蹤
- 進度可以被量化

### 第二層：並行管理（ADR-023）

**問題**：現實世界不是線性的
**解決**：支援多個 Ticket 並行

```python
class HumanBrain:
    def __init__(self):
        self.contexts = []  # 可以同時思考多件事
        
class AIAssistant:
    def __init__(self):
        self.active_ticket = None  # 一次只能做一件事？
        self.paused_tickets = []   # 需要明確的狀態管理
```

**改變**：
- 承認並支援 context switching
- 不再假裝開發是線性的
- 擁抱真實世界的混亂

### 第三層：WIP 管理（ADR-024）

**問題**：切換時的半成品怎麼辦？
**解決**：智能保存策略

```python
# 人類：憑感覺
if 感覺改動很多:
    git commit -m "WIP"
else:
    git stash

# AI：有規則
if changes.count > 5 or has_conflicts:
    create_wip_commit()
else:
    create_stash()
```

## 深層思考：什麼改變了？

### 1. 從內隱到外顯

人類的工作流程充滿了內隱知識：
- "這個改動不大，stash 就好"
- "這個 feature 做到一半，先 commit 一下"
- "明天繼續，在哪個 branch 來著？"

AI 協作強迫我們將這些內隱知識外顯化、結構化。

### 2. 從藝術到工程

傳統開發像是藝術創作：
- 靈感來了就寫
- 累了就休息
- 想到什麼改什麼

AI 協作更像工程建設：
- 有計劃（Ticket）
- 有流程（Workflow）
- 有追蹤（Metrics）

### 3. 從個人到系統

人類開發者是一個完整的系統：
- 記憶（知道在做什麼）
- 判斷（知道輕重緩急）
- 執行（知道如何切換）

AI 協作需要外部系統支撐：
- Ticket System（記憶）
- Priority Rules（判斷）
- Git Workflow（執行）

## 未來展望：新的可能性

### 1. 完美的時間追蹤

```yaml
ticket: implement-search
actual_time: 3.5 hours
ai_time: 2.8 hours (80%)
human_time: 0.7 hours (20%)
interruptions: 2 (fix-login, meeting)
```

以前做不到的精確度，現在可以了。

### 2. 智能工作流程優化

```python
# AI 可以學習最佳實踐
if user.switches_context_frequently:
    suggest("考慮先完成小任務")
    
if ticket.duration > estimated * 2:
    suggest("這個任務可能需要拆分")
```

### 3. 知識的累積與傳承

每個 Ticket 都是一個學習機會：
- 什麼做法有效？
- 什麼模式重複出現？
- 如何避免相同錯誤？

## 結論：擁抱結構化的自由

這不是限制，而是解放。

當我們把工作流程結構化後：
- AI 可以更好地協助我們
- 我們可以更專注於創造性工作
- 知識可以被保存和傳承
- 效率可以被測量和改進

從某種意義上說，AI 協作開發forcing us to become better developers - 不是更好的程式設計師，而是更好的工程師。

### 最後的思考

> "The best way to predict the future is to invent it." - Alan Kay

我們正在發明一種新的開發方式。不是人類的方式，也不是 AI 的方式，而是人類與 AI 協作的方式。

這需要我們：
1. 放下一些習慣（隨性的工作方式）
2. 學習一些新技能（結構化思維）
3. 創造一些新工具（Ticket System）

但最終，我們會得到一個更強大的開發模式 - 結合了人類的創造力和 AI 的執行力。

---

*這個故事還在繼續。每一次 commit，每一個 ticket，都在書寫新的篇章。*