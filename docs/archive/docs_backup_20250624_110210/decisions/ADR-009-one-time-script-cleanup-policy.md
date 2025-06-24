# ADR-009: 一次性修復腳本清理政策

**日期**: 2025-06-23  
**狀態**: 已接受  
**決策者**: Human + Claude

## 背景

在開發過程中，經常需要創建一次性的修復腳本來解決特定問題，例如：
- 檔案重新命名腳本 (`rename-legacy-files.py`)
- 資料遷移腳本
- 批量修復腳本
- 格式轉換腳本

這些腳本完成任務後如果不清理，會：
- 增加代碼庫複雜度
- 造成混亂（不知道哪些還需要使用）
- 浪費維護成本
- 可能包含過時的邏輯

## 問題案例

`docs/scripts/rename-legacy-files.py` 是一個典型例子：
- 目的：修復包含 commit hash 的檔案名稱
- 現狀：任務已完成，所有目標檔案都已重新命名
- 問題：腳本仍然存在，但已無使用價值

## 決策

### 1. 一次性腳本的識別標準

#### 1.1 屬於一次性腳本的類型
✅ **應該刪除的腳本**：
- 檔案重新命名或移動腳本
- 資料格式轉換腳本（CSV → YAML、JSON → YAML 等）
- 批量修復歷史問題的腳本
- 遺留代碼清理腳本
- 資料庫遷移腳本（已執行完成的）
- 一次性的批量更新腳本

#### 1.2 不屬於一次性腳本的類型
❌ **保留的腳本**：
- 持續使用的工具腳本（`commit-guide.py`、`post-commit-doc-gen.py`）
- 開發工作流程腳本
- 分析工具腳本（`analytics.py`）
- 可重複使用的工具模板

### 2. 清理時機和流程

#### 2.1 清理時機
- **立即清理**：腳本完成任務後，在同一個 commit 中刪除
- **延遲清理**：複雜腳本可在下一個 commit 中清理
- **定期檢查**：每週檢查是否有遺漏的一次性腳本

#### 2.2 清理前檢查清單
在刪除一次性腳本前，必須確認：

```bash
# 1. 確認任務已完成
./script.py --dry-run  # 檢查是否還有工作要做

# 2. 確認沒有其他依賴
grep -r "script.py" docs/  # 檢查是否有其他檔案引用

# 3. 備份重要邏輯（如果需要）
# 將有價值的函數或邏輯提取到常用工具中
```

#### 2.3 刪除流程
```bash
# 1. 記錄刪除原因
git add script.py
git commit -m "remove: delete completed one-time script

- Task completed: [具體完成的任務]
- Verified no remaining work needed
- No dependencies found"

# 2. 刪除檔案
rm script.py
git add .
git commit -m "cleanup: remove one-time script after task completion"
```

### 3. 一次性腳本的最佳實踐

#### 3.1 創建時的標記
一次性腳本應該明確標記其臨時性：

```python
#!/usr/bin/env python3
"""
一次性修復腳本：[具體任務描述]

⚠️  THIS IS A ONE-TIME SCRIPT
⚠️  DELETE AFTER TASK COMPLETION

目的：[詳細描述]
完成條件：[如何判斷任務完成]
預期刪除日期：[日期]
"""
```

#### 3.2 自檢功能
一次性腳本應該包含自檢功能：

```python
def check_task_completion(self) -> bool:
    """檢查任務是否已完成"""
    # 實現檢查邏輯
    pass

def suggest_cleanup(self):
    """建議是否可以刪除此腳本"""
    if self.check_task_completion():
        print("✅ 任務已完成，建議刪除此腳本")
        return True
    else:
        print("⚠️  任務尚未完成，請勿刪除")
        return False
```

#### 3.3 文檔記錄
如果腳本包含有價值的邏輯或經驗，在刪除前應該記錄：

```markdown
## 已刪除的一次性腳本記錄

### rename-legacy-files.py (已於 2025-06-23 刪除)
- **任務**：修復包含 commit hash 的檔案名稱
- **完成條件**：所有檔案名稱符合新的命名規範
- **有價值的邏輯**：正則表達式檔案名檢查模式
- **刪除原因**：任務已完成，無剩餘工作
```

### 4. 自動化檢查

#### 4.1 Pre-commit 檢查
在 `commit-guide.py` 中加入一次性腳本檢查：

```python
def check_one_time_scripts(self):
    """檢查是否有應該清理的一次性腳本"""
    script_dir = Path("docs/scripts")
    
    for script in script_dir.glob("*.py"):
        if self._is_one_time_script(script):
            if self._task_completed(script):
                print(f"⚠️  建議刪除已完成的一次性腳本: {script.name}")
```

#### 4.2 定期掃描
```python
# 在 analytics.py 中加入
def scan_one_time_scripts():
    """掃描並報告一次性腳本狀態"""
    # 實現掃描邏輯
```

### 5. 例外情況

#### 5.1 保留條件
一次性腳本在以下情況可以暫時保留：
- 可能需要回滾操作
- 作為其他類似任務的參考模板
- 包含複雜邏輯，需要時間提取到通用工具中

#### 5.2 保留期限
即使有保留條件，也應設定明確期限：
- **最長保留期**：30 天
- **週期檢查**：每週評估是否還需要保留

## 立即行動

### 1. 清理當前的一次性腳本
需要立即檢查並清理：
- `docs/scripts/rename-legacy-files.py` ✅ 已確認任務完成
- `docs/scripts/emergency-fix-utility.py` - 需要檢查
- 其他可能的一次性腳本

### 2. 更新開發工作流程
- 在 `PLAYBOOK.md` 中加入一次性腳本管理指導
- 更新 `commit-guide.py` 加入自動檢查
- 建立一次性腳本模板

### 3. 建立監控機制
- 定期掃描 `docs/scripts/` 目錄
- 在每週回顧中檢查一次性腳本狀態

## 影響

### 正面影響
- 🧹 **代碼庫整潔**：移除不必要的檔案
- 🎯 **專注度提升**：減少認知負荷
- 📊 **維護成本降低**：不需要維護已完成的腳本
- 🚀 **效率提升**：快速識別可用工具

### 風險控制
- 📝 **記錄重要邏輯**：避免丟失有價值的實現
- 🔍 **仔細檢查依賴**：確保沒有其他檔案依賴
- ⏰ **設定寬限期**：給予充分時間確認任務完成

---

**重要原則**：
> 一次性腳本的價值在於解決問題，不在於永久保存。
> 完成任務後立即清理，保持代碼庫的整潔和專注。