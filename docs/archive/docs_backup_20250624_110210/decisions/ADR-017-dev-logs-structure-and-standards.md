# ADR-017: Development Logs Structure and Standards

## Status
Accepted

## Context
開發日誌是專案知識管理的重要部分，記錄了每次開發活動的詳細資訊。隨著專案成長，我們需要建立嚴格的標準來確保日誌的一致性、可讀性和可分析性。

### 現有問題
1. 日誌檔案散落，難以找到相關內容
2. 檔名不一致，無法快速識別內容
3. 時間記錄不準確，影響效率分析
4. 缺乏自動化，增加維護負擔

## Decision

### 1. 目錄結構標準

```
docs/dev-logs/
├── YYYY-MM-DD/                    # 日期資料夾
│   └── *.yml                      # 所有日誌檔案直接放在日期資料夾下
├── *.yml                          # 模板檔案
└── README.md                      # 使用說明
```

**規則**：
- 每日的日誌放在 `YYYY-MM-DD` 資料夾下
- 所有檔案直接放在日期資料夾根目錄，不再分子資料夾
- 依賴清晰的檔名來識別檔案類型和內容

### 2. 檔案命名標準

#### 自動生成（有 commit hash）
```
YYYY-MM-DD-HH-MM-SS-{type}-{brief-description}.yml
```
- 包含精確的 commit 時間戳
- 例：`2025-06-23-03-26-02-docs-enhance-commit-message-generation.yml`

#### 手動創建（無 commit hash）
```
YYYY-MM-DD-{type}-{description}.yml
```
- 只包含日期
- 例：`2025-06-22-feature-learning-progress-tracker.yml`

**命名規則**：
- 使用小寫字母
- 使用連字號 `-` 分隔單詞
- 描述要簡潔但具有識別性
- 避免超過 50 個字符

### 3. 檔案內容標準

所有日誌必須包含以下核心欄位：

```yaml
type: feature|bug|docs|refactor|test
title: 清晰的標題（不含 conventional commit 前綴）
date: 'YYYY-MM-DD'
developer: AI + Human
status: completed
commit_hash: xxxxxxxx

description: |
  完整的 commit 訊息

timeline:
  - phase: 實現
    duration: 0.0      # 分鐘，保留一位小數
    ai_time: 0.0
    human_time: 0.0
    tasks:
      - 具體任務描述

metrics:
  total_time_minutes: 0.0
  ai_time_minutes: 0.0
  human_time_minutes: 0.0
  ai_percentage: 0.0
  human_percentage: 0.0
  files_added: 0
  files_modified: 0
  files_deleted: 0
  commit_timestamp: 'YYYY-MM-DDTHH:MM:SS'
  time_estimation_method: string
  is_real_time: boolean
  time_data_quality: high|medium|estimated

changes:
  added: []
  modified: []
  deleted: []

auto_generated: boolean
generation_time: 'YYYY-MM-DDTHH:MM:SS.ffffff'
```

### 4. 時間計算標準

優先級（從高到低）：
1. **Real-time tracking** - 使用 time-tracker.py 的即時追蹤
2. **Git log analysis** - 分析 commit 間隔時間
3. **File timestamp analysis** - 分析檔案修改時間戳
4. **File count estimate** - 基於檔案數量的估算

**合理性檢查**：
- 最小時間：0.5 分鐘
- 最大單次開發時間：8 小時（超過視為不合理）
- AI/Human 比例：預設 80/20

### 5. 自動化流程

#### Pre-commit 階段
1. 自動生成日誌（無 commit hash）
2. 基於檔案時間戳計算開發時間
3. 將日誌加入 staged files

#### Post-commit 階段
1. 更新日誌加入 commit hash
2. 重新計算更準確的時間
3. 自動執行補充 commit（僅限於補充 hash）

### 6. Commit 執行規則

**重要**：AI 助手必須遵守以下規則：
1. **只有在收到明確的 `commit` 指令時才能執行 commit**
2. **例外情況**：補充 commit hash 的自動 commit（由 post-commit hook 觸發）
3. **禁止行為**：
   - 不可在一般對話中自行決定 commit
   - 不可因為「覺得應該」就執行 commit
   - 不可在執行其他任務時順便 commit
4. **正確流程**：
   - Human: "commit" → AI: 執行 commit 流程
   - Human: "把這些改動提交" → AI: 詢問確認
   - Human: 其他指令 → AI: 不執行 commit

### 7. 類型定義

| Type | 用途 | Conventional Commit |
|------|------|---------------------|
| feature | 新功能開發 | feat |
| bug | 問題修復 | fix |
| docs | 文檔更新 | docs |
| refactor | 程式碼重構 | refactor |
| test | 測試相關 | test |

## Consequences

### 好處
1. **結構清晰**：易於瀏覽和查找
2. **時間準確**：多層級時間計算確保準確性
3. **自動化高**：減少手動維護負擔
4. **可分析性**：標準化格式便於數據分析
5. **知識保存**：完整記錄開發過程

### 挑戰
1. 需要嚴格遵守命名規範
2. 初期需要適應新的目錄結構
3. 需要維護自動化腳本

## Implementation

1. 使用 `pre-commit-doc-gen.py` 和 `post-commit-doc-gen.py` 自動生成
2. 使用 `commit-guide.py` 確保流程執行
3. 定期使用 migration 腳本整理舊日誌
4. 使用 `analytics.py` 分析開發效率

## References
- ADR-015: Ticket-based Development Workflow
- ADR-016: Commit-based Time Analysis Methodology
- Development Logs README: `/docs/dev-logs/README.md`