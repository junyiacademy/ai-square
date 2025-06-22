# ADR-015: Ticket 導向開發工作流程

**日期**: 2025-06-23  
**狀態**: 已接受  
**決策者**: Human + Claude

## 背景

在實施 ADR-014 事後時間追蹤方法論後，我們發現了一個根本問題：
- ✅ 時間追蹤系統技術上可行
- ❌ Claude 在實際對話中忘記啟動追蹤
- ❌ 缺乏結構化的開發會話管理

Human 提出了關鍵需求：
> "我希望每次開發時都能有 ticket，一次就做一件事直到 commit 結束"

## 決策：建立 Ticket 導向開發工作流程

### 核心原則
1. **一個 Ticket = 一個開發會話**
2. **自動時間追蹤** - 無需手動記憶
3. **明確的開始和結束** - 結構化工作流程
4. **專注單一任務** - 避免範圍蔓延

### 工作流程設計

#### 階段 1: 開始 Ticket
```bash
make dev-ticket TICKET=feature-name
```

**自動執行：**
1. 啟動時間追蹤 session
2. 記錄 AI 操作開始
3. 顯示開發規則提醒
4. 設定專注模式

#### 階段 2: 開發過程
**開發規則：**
- 一次只做一件事
- 專注於 Ticket 範圍內的工作
- 避免同時處理多個功能

#### 階段 3: 完成 Ticket  
```bash
make commit-ticket
```

**自動執行：**
1. 結束時間追蹤並生成報告
2. 執行智能提交檢查
3. 自動生成開發文檔
4. 標記 Ticket 完成

### 技術實施

#### 1. Makefile 整合
```makefile
# ⏱️ 開始開發會話 (自動啟動時間追蹤)
dev-ticket:
    @echo "🎫 開始新的開發 Ticket"
    @echo "功能名稱: $(TICKET)"
    @python3 -c "...啟動時間追蹤..."
    @echo "📋 開發規則："
    @echo "   1. 一次只做一件事"
    @echo "   2. 直到 commit 結束才算完成"
    @echo "   3. 使用 make commit-ticket 結束此 Ticket"

# ✅ 完成開發 Ticket (自動結束時間追蹤)
commit-ticket:
    @echo "📊 結束時間追蹤並生成報告..."
    @python3 -c "...結束時間追蹤..."
    @git add -A
    @python3 docs/scripts/commit-guide.py
    @python3 docs/scripts/post-commit-doc-gen.py
```

#### 2. 時間追蹤整合
```python
# 自動啟動追蹤
tracker = start_tracking_session('ticket-name')
tracker.start_operation('ai', 'starting development ticket')

# 自動結束追蹤
metrics = end_tracking_session()
# 生成真實時間數據供 post-commit 使用
```

#### 3. Claude 行為模式
```
Claude 的新工作流程：
1. 收到開發請求 → 提醒使用 make dev-ticket
2. 開發過程 → 專注單一 Ticket 範圍
3. 完成開發 → 提醒使用 make commit-ticket
```

### 預期效益

#### 1. 時間追蹤自動化
- **100% 覆蓋率** - 每次開發都有真實時間記錄
- **零負擔** - 無需手動記憶啟動追蹤
- **一致性** - 標準化的時間數據格式

#### 2. 開發專注度提升
- **單一任務專注** - 避免多工干擾
- **明確界限** - 清楚的開始和結束點
- **範圍控制** - 防止功能蔓延

#### 3. 文檔自動化
- **即時生成** - 每個 Ticket 都有完整記錄
- **真實數據** - 基於實際時間追蹤
- **品質一致** - 標準化文檔格式

### 使用範例

#### 範例 1: 新功能開發
```bash
# 開始
$ make dev-ticket TICKET=user-profile-page
🎫 開始新的開發 Ticket
⏱️ 啟動時間追蹤...
✅ 時間追蹤已啟動！Ticket: user-profile-page
🎯 開始開發 user-profile-page...

# 開發過程 (專注單一功能)
# ... 實作 user profile 頁面 ...

# 完成
$ make commit-ticket
📊 結束時間追蹤並生成報告...
✅ 時間追蹤已結束
🤖 執行智能提交...
📝 生成開發文檔...
✅ Ticket 完成！
```

#### 範例 2: Bug 修復
```bash
# 開始
$ make dev-ticket TICKET=fix-login-redirect-bug
🎫 開始新的開發 Ticket
⏱️ 啟動時間追蹤...
✅ 時間追蹤已啟動！Ticket: fix-login-redirect-bug

# 開發過程 (專注問題修復)
# ... 分析和修復 login redirect 問題 ...

# 完成
$ make commit-ticket
📊 結束時間追蹤並生成報告...
✅ Ticket 完成！
```

### 與現有系統整合

#### 1. 與 ADR-014 的關係
- **補充關係** - 提供自動化機制執行 ADR-014 的規則
- **解決執行問題** - 自動化避免了手動遺忘的問題

#### 2. 與現有 commit 系統的關係
- **增強功能** - 在 commit-guide.py 基礎上增加時間追蹤
- **保持兼容** - 現有的 commit 指令依然可用

#### 3. 與文檔生成的關係
- **數據來源** - 為 post-commit-doc-gen.py 提供真實時間數據
- **品質提升** - 從估算改為真實追蹤數據

### 實施計劃

#### 立即實施 (今天)
- [x] 修改 Makefile 增加 dev-ticket 和 commit-ticket 指令
- [x] 整合時間追蹤系統到 Make 指令中
- [x] 更新 help 文檔顯示新的工作流程

#### 短期改進 (本週)
- [ ] 創建 Ticket 狀態追蹤機制
- [ ] 增加 Ticket 範圍驗證
- [ ] 整合到 IDE 快捷鍵

#### 長期優化 (未來)
- [ ] 自動 Ticket 分析和建議
- [ ] 與專案管理工具整合
- [ ] AI 驅動的 Ticket 優化建議

### 成功指標

#### 量化指標
- **時間追蹤覆蓋率**: 目標 100%
- **平均 Ticket 完成時間**: 追蹤趨勢
- **Ticket 範圍控制**: 每個 Ticket 單一 commit

#### 質化指標
- **Claude 使用一致性**: 每次開發都使用 Ticket 流程
- **開發專注度**: 減少多工和範圍蔓延
- **文檔品質**: 真實時間數據提升文檔準確性

## 與 ADR-013 和 ADR-014 的關係

這個 ADR 是 ADR-013 和 ADR-014 的**實施機制**：

- **ADR-013**: 定義了問題（系統不被使用）
- **ADR-014**: 定義了方法（事後時間追蹤）  
- **ADR-015**: 定義了執行機制（Ticket 導向工作流程）

## 關鍵洞察

**自動化勝過依賴記憶**：
- 人類（包括 Claude）會忘記執行手動步驟
- 工作流程自動化確保一致性
- 結構化流程提升專注度和品質

**一次一件事的力量**：
- 單一 Ticket 專注避免複雜性
- 明確的開始和結束提供成就感
- 範圍控制提升開發效率

---

**核心原則**: 
> **自動化確保一致性，結構化提升專注度，真實數據驅動改進。**