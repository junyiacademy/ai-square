# ADR-025: AI 自我合規執行機制

## 狀態
已採納

## 背景
在建立了完整的 ticket 驅動開發流程（ADR-022）後，我們發現了一個關鍵問題：AI 助手會違反自己參與制定的規則。

### 問題案例
1. 用戶要求：「把 ADR 寫成 story」
2. AI 行為：直接創建檔案 `/docs/stories/2025-06-23-ai-driven-development-paradigm-shift.md`
3. 違規：沒有檢查 active ticket，沒有創建新 ticket

這揭露了 AI 協作開發的核心挑戰：**規則制定 vs 規則執行的認知失調**。

## 決策

### 1. 強化 CLAUDE.md 規則
從「建議性」升級為「強制性」：
- 添加視覺化警告符號（🚨）
- 明確標註「MANDATORY」
- 提供具體的違規案例

### 2. 實作自我檢查協議
創建 Self-Check Protocol：
```
□ Am I creating a new file? → Need ticket check
□ Am I modifying existing files? → Need ticket check  
□ Is this just reading/analyzing? → No ticket needed
□ Have I checked active ticket? → If no, STOP and check
```

### 3. 工作流程執行器
實作 `workflow-enforcer.py`：
- 自動檢查操作類型
- 驗證 active ticket 狀態
- 提供明確的錯誤訊息和建議

### 4. 認知提示機制
在 CLAUDE.md 中加入：
- Common Violation Scenarios
- 正確 vs 錯誤的對比範例
- 強調「檢查優先於執行」

## 影響

### 正面影響
1. **提高合規性**：明確的規則和檢查機制
2. **減少違規**：自我提醒和強制檢查
3. **更好的追蹤**：所有變更都有對應的 ticket
4. **教育作用**：讓 AI 學習正確的工作流程

### 潛在挑戰
1. **執行開銷**：每次操作前都需要檢查
2. **靈活性降低**：嚴格的流程可能影響效率
3. **認知負擔**：AI 需要記住更多規則

## 實施細節

### 技術實作
1. **CLAUDE.md 更新**：加入強制性規則和視覺提示
2. **workflow-enforcer.py**：提供程式化的檢查機制
3. **互動式測試**：允許 AI 自我測試合規性

### 行為改變
1. **思考順序**：「要做什麼」→「檢查 ticket」→「執行」
2. **預設行為**：有疑慮時，先檢查再行動
3. **錯誤處理**：違規時立即停止並修正

## 後續步驟
1. 監控 AI 的合規率
2. 收集違規案例並分析原因
3. 持續優化規則和檢查機制
4. 考慮整合到工具層級（如 Write、Edit 工具內建檢查）

## 參考資料
- ADR-022: Ticket 驅動開發
- ADR-023: 並行 Ticket 管理
- ADR-024: WIP 管理策略

## 決策者
AI Assistant + Human Developer

## 日期
2025-06-23