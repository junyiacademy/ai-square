# 開發流程測試系統

本文檔說明如何使用開發流程測試套件來驗證票券管理、開發日誌生成、時間追蹤等功能的正確性。

## 測試概述

我們建立了兩層測試系統：

1. **快速驗證** (`test-workflow`) - 檢查當前項目狀態
2. **完整測試** (`test-workflow-full`) - 端到端場景測試

## 快速開始

### 快速驗證當前流程
```bash
make test-workflow
```

這會檢查：
- ✅ 腳本文件完整性
- ✅ 票券系統結構  
- ✅ 開發日誌格式
- ✅ Makefile 整合
- ✅ 雙向連結正確性
- ✅ 時間計算方法

### 完整端到端測試
```bash
make test-workflow-full
```

這會執行：
- 🧪 單一功能開發流程
- 🧪 多目標並行開發
- 🧪 對話中斷恢復
- 🧪 自動票券創建
- 🧪 時間計算準確性
- 🧪 狀態轉換驗證

## 測試場景詳解

### 1. 單一功能開發流程
**目標**: 驗證標準開發流程的完整性

**步驟**:
1. 創建測試票券
2. 模擬代碼變更
3. 執行 pre-commit 文檔生成
4. 提交變更
5. 執行 post-commit 更新
6. 驗證票券狀態轉換和雙向連結

**驗證點**:
- 票券從 `in_progress` 移動到 `completed`
- 開發日誌正確生成
- 時間計算準確
- 雙向連結建立

### 2. 多目標並行開發
**目標**: 測試多文件、多任務的處理能力

**步驟**:
1. 創建多個文件變更
2. 執行統一的提交流程
3. 驗證所有變更被正確追蹤

**驗證點**:
- 所有文件變更被記錄
- 時間聚合計算正確
- 綜合日誌生成

### 3. 對話中斷恢復
**目標**: 模擬 AI 對話中斷後的恢復場景

**步驟**:
1. 創建票券但不完成提交
2. 模擬中斷
3. 重新恢復並完成流程
4. 驗證狀態一致性

**驗證點**:
- 狀態正確恢復
- 時間計算連續性
- 無重複記錄

### 4. 自動票券創建
**目標**: 測試無票券時的自動創建機制

**步驟**:
1. 確保沒有活躍票券
2. 直接進行開發變更
3. 執行提交流程
4. 驗證自動創建的票券

**驗證點**:
- 票券自動生成
- 預設值正確設置
- 連結關係建立

## 測試配置

測試行為由 `docs/scripts/workflow-test-config.yml` 控制：

```yaml
test_scenarios:
  - name: "single_feature_workflow"
    priority: "high"
    components: [ticket_creation, dev_log_generation, ...]

validation_rules:
  ticket_format:
    required_fields: [id, name, status, created_at]
  
  time_calculation:
    forbidden_methods: [file_count_estimate]
```

## 測試報告

### 報告位置
- 快速驗證: `docs/test-reports/workflow-validation-YYYYMMDD-HHMMSS.md`
- 完整測試: `docs/test-reports/workflow-test-YYYYMMDD-HHMMSS.md`

### 報告格式
```markdown
# 工作流程測試報告
時間: 2025-06-24 12:00:00

## 摘要
- ✅ 通過: 7 / 8
- ⚠️ 警告: 1 / 8  
- ❌ 失敗: 0 / 8

## 詳細結果
### ✅ 票券系統結構
**狀態**: pass
**訊息**: 票券系統結構正常
```

## 故障排除

### 常見問題

**1. 腳本文件缺失**
```
❌ 缺少必要腳本: ticket-manager.py
```
**解決**: 確保所有腳本文件存在於 `docs/scripts/` 目錄

**2. 票券格式錯誤**
```
⚠️ 部分票券格式有問題: ticket-123.yml: 缺少字段 ['created_at']
```
**解決**: 檢查票券 YAML 格式，補充缺失字段

**3. 時間計算方法禁用**
```
❌ 使用了禁止的 file_count_estimate 方法
```
**解決**: 更新時間計算邏輯，移除 `file_count_estimate`

**4. 雙向連結中斷**
```
⚠️ 票券名稱不匹配
```
**解決**: 檢查票券和開發日誌的連結字段一致性

### 測試環境清理

測試會自動清理臨時文件，但如果需要手動清理：

```bash
# 清理測試報告（保留最近 10 個）
find docs/test-reports -name "*.md" -mtime +10 -delete

# 清理測試暫存
rm -rf /tmp/workflow_test_*
```

## 持續改進

### 添加新測試場景

1. 在 `workflow-test-config.yml` 中定義新場景
2. 在 `workflow-test-suite.py` 中實現測試方法
3. 更新驗證規則

### 自訂驗證規則

編輯配置文件的 `validation_rules` 區段：

```yaml
validation_rules:
  custom_check:
    enabled: true
    threshold: 5
    action: "warn"  # or "fail"
```

### 效能基準調整

根據實際環境調整效能期望：

```yaml
performance_benchmarks:
  test_execution_time:
    quick_validation: 30  # 調整為適合的秒數
```

## 最佳實踐

1. **定期執行**: 在重大變更前後執行完整測試
2. **快速反饋**: 開發過程中使用快速驗證
3. **報告追蹤**: 保留測試報告用於問題回溯
4. **配置版控**: 將測試配置納入版本控制
5. **文檔更新**: 新增場景時更新此文檔

## 整合到 CI/CD

### GitHub Actions 整合
```yaml
- name: Workflow Testing
  run: |
    make test-workflow
    make test-workflow-full
```

### Pre-commit Hook 整合
```bash
#!/bin/sh
make test-workflow || exit 1
```

---

這個測試系統確保開發流程的穩定性和一致性，幫助我們在迭代過程中維持高品質的自動化流程。