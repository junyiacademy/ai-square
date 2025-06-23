# ADR-028: 單一票券提交策略 (Single Ticket Commit Strategy)

## 狀態
已接受 (Accepted)

## 背景

目前的提交流程會將所有進行中的票券相關檔案一次性提交，這造成了以下問題：

1. **提交原子性不足**：多個不相關的功能混在同一個 commit 中
2. **追蹤困難**：難以追蹤特定功能的變更歷史
3. **回滾複雜**：如果需要回滾特定功能，會影響其他功能
4. **程式碼審查困難**：審查者需要理解多個功能的上下文
5. **合併衝突風險**：大型提交更容易產生合併衝突

## 決策

### 核心原則

1. **一張票券 = 一個提交**：每個票券及其相關文件應該形成一個獨立的 commit
2. **提交邊界清晰**：每個 commit 應該只包含單一票券的相關變更
3. **文件完整性**：提交時必須包含該票券的所有必要文件

### 實施規則

#### 1. 票券提交範圍
每個票券的提交應包含：
- 票券相關的所有程式碼變更
- 票券的規格文件（如 feature-spec.md）
- 票券的開發日誌（dev-log）
- 票券相關的測試文件
- 票券相關的文檔更新

#### 2. 提交前檢查
- 確認只有一個票券的相關檔案被 staged
- 驗證該票券的所有必要文件都已完成
- 確保測試通過（或有合理的豁免原因）
- 檢查程式碼品質（linting、type checking）

#### 3. 提交訊息格式
```
<type>(<ticket-name>): <description>

- <change 1>
- <change 2>
...

Ticket: #<ticket-name>
```

#### 4. 工作流程變更
1. **開發階段**：可以同時處理多個票券
2. **提交階段**：每次只選擇一個票券進行提交
3. **分支策略**：每個票券應有獨立的分支 `ticket/<ticket-name>`

### 技術實現

#### Makefile 命令更新
```makefile
# 提交特定票券
commit-ticket:
	@python3 docs/scripts/smart-commit.py --ticket $(TICKET)

# 列出可提交的票券
list-committable-tickets:
	@python3 docs/scripts/ticket-manager.py list --committable

# 檢查特定票券狀態
check-ticket:
	@python3 docs/scripts/ticket-driven-dev.py validate $(TICKET)
```

#### Smart Commit 系統更新
- 支援 `--ticket` 參數指定要提交的票券
- 自動篩選該票券相關的檔案
- 驗證票券文件完整性
- 生成票券專屬的提交訊息

## 優點

1. **更好的版本控制**：每個功能的變更歷史清晰可追蹤
2. **簡化程式碼審查**：審查者可以專注於單一功能
3. **降低風險**：問題隔離，容易回滾
4. **提高協作效率**：多人可以同時處理不同票券而不衝突
5. **更好的文檔關聯**：票券和 commit 一對一對應

## 缺點

1. **提交次數增加**：需要更頻繁的提交操作
2. **流程複雜度**：需要更仔細的檔案管理
3. **學習曲線**：團隊需要適應新的工作流程

## 實施計劃

### 第一階段：工具更新
1. 更新 `smart-commit.py` 支援單一票券提交
2. 更新 `Makefile` 添加新的命令
3. 更新 `ticket-manager.py` 支援票券狀態查詢

### 第二階段：流程整合
1. 更新開發指南文檔
2. 添加提交前的票券檢查
3. 整合 CI/CD 流程

### 第三階段：優化改進
1. 添加視覺化工具顯示票券狀態
2. 自動化票券相關檔案的識別
3. 添加票券依賴關係管理

## 相關決策

- [ADR-015: 票券驅動開發工作流程](ADR-015-ticket-based-development-workflow.md)
- [ADR-022: AI 驅動的票券開發](ADR-022-ticket-driven-development-with-ai.md)
- [ADR-023: 平行票券管理](ADR-023-parallel-ticket-management.md)

## 參考資料

- Git 最佳實踐：原子提交
- 持續整合/持續部署模式
- 敏捷開發方法論

---

**創建日期**: 2025-01-23  
**作者**: AI Assistant + Human Developer  
**審核狀態**: 待審核