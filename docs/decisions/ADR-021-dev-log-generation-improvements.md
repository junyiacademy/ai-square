# ADR-021: Dev Log Generation Improvements

## Status
Proposed

## Context
Through analysis of the current dev log generation system, we identified several issues:

1. **Filename Duplication**: When dev log files themselves are modified, they can be used as the task description, leading to filenames like `2025-06-23-docs-2025-06-23-docs-refactor.yml`

2. **Unreliable Time Calculation**: File modification timestamps don't accurately reflect development time, especially for:
   - Auto-generated files
   - Batch modifications
   - Files copied from elsewhere

3. **Recursive Issues**: Dev logs tracking their own changes creates circular dependencies

## Decision

### 1. Improve Filename Generation
```python
def _generate_task_description(self) -> str:
    """生成任務描述，避免使用 dev-log 檔案名稱"""
    
    # 過濾掉 dev-logs 和自動生成的檔案
    important_files = [
        f for f in self.staged_files 
        if not any(skip in f['path'] for skip in [
            'dev-logs/', 
            'CHANGELOG.md',
            '.yml',  # 避免使用 YAML 檔案名
            'test-'  # 測試檔案
        ])
    ]
    
    # 如果沒有重要檔案，使用 commit scope
    if not important_files:
        scope = self._extract_commit_scope()
        return scope if scope else "changes"
    
    # 使用第一個重要檔案
    # ... existing logic ...
```

### 2. Enhance Time Calculation
```python
def _analyze_commit_time(self) -> Dict:
    """改進的 commit-based 時間分析"""
    
    # 1. 過濾掉自動生成的檔案
    meaningful_files = self._filter_meaningful_files(changed_files)
    
    # 2. 使用 git 的檔案歷史而非檔案系統時間戳
    # git log --follow --format="%ct" --reverse -- <file>
    
    # 3. 考慮工作模式
    # - 連續 commits 間隔 < 30分鐘：累計時間
    # - 間隔 > 2小時：視為新的工作階段
    
    # 4. 使用更智能的估算
    # - 考慮檔案類型（測試、文檔、程式碼）
    # - 考慮變更行數（如果可用）
```

### 3. Add Exclusion Rules
```yaml
# 在 dev log 中標記應該被排除的檔案模式
dev_log_config:
  exclude_patterns:
    - "docs/dev-logs/**"
    - "docs/CHANGELOG.md"
    - "**/*.yml"
    - "**/test-*.txt"
  
  time_calculation:
    method: "git_history"  # 使用 git 歷史而非檔案時間戳
    session_gap_minutes: 120  # 超過 2 小時視為新 session
    min_duration_minutes: 1
    max_duration_minutes: 480  # 8 小時
```

### 4. Prevent Recursive Tracking
- Dev log generation should not track changes to dev logs themselves
- CHANGELOG.md updates should not create new dev logs
- Auto-generated files should be marked and excluded

## Implementation Steps

1. **Phase 1**: Fix filename generation
   - Add exclusion patterns
   - Use commit scope as fallback
   - Validate generated names

2. **Phase 2**: Improve time calculation
   - Use git history instead of file timestamps
   - Implement session detection
   - Add configurable thresholds

3. **Phase 3**: Add configuration
   - Create `.devlog.yml` configuration file
   - Allow project-specific overrides
   - Add validation rules

## Consequences

### Positive
- More accurate dev log filenames
- Better time tracking accuracy
- Reduced noise from auto-generated files
- No more recursive tracking issues

### Negative
- More complex logic
- May need to reprocess historical logs
- Git history queries may be slower

### Trade-offs
- Accuracy vs Performance: Git history queries are slower but more accurate
- Flexibility vs Simplicity: Configuration adds complexity but allows customization

## References
- Current implementation: `docs/scripts/pre-commit-doc-gen.py`, `docs/scripts/post-commit-doc-gen.py`
- Related: ADR-016 (Time Tracking), ADR-017 (Dev Logs Structure)