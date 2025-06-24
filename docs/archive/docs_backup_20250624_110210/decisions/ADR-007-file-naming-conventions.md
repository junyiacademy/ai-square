# ADR-007: 檔案命名規範

**日期**: 2025-06-23  
**狀態**: 已接受  
**決策者**: Human + Claude

## 背景

用戶反饋指出 docs 目錄中存在大量不清楚的檔案名稱，特別是：
- 使用 commit hash 的檔案（如 `dc21387f`）
- 檔名截斷的檔案（如 `filename-generation-fo`）
- 技術縮寫（如 `ddd`）
- 語義不明確的檔案

> "檔案名稱要好懂，這個放到規則內，我不希望下次還這樣"

## 決策

### 1. 核心原則
- **清晰性**: 檔名一看就知道內容
- **完整性**: 不允許截斷或省略關鍵詞
- **一致性**: 遵循統一的命名格式
- **可搜尋性**: 使用有意義的關鍵詞

### 2. 檔案命名規則

#### 2.1 開發日誌 (dev-logs/)
```
格式: YYYY-MM-DD-{type}-{clear-description}.yml
範例: 2025-06-23-feature-user-authentication-system.yml
```

#### 2.2 開發故事 (stories/)
```
格式: YYYY-MM-DD-{clear-description}-story.md
範例: 2025-06-23-user-authentication-implementation-story.md
```

#### 2.3 決策記錄 (decisions/)
```
格式: ADR-XXX-{clear-topic}.md
範例: ADR-007-file-naming-conventions.md
```

#### 2.4 改進建議 (improvements/)
```
格式: improvement-YYYY-MM-DD-{clear-topic}.md
範例: improvement-2025-06-23-filename-clarity-enhancement.md
```

### 3. 禁止使用的命名模式

#### 3.1 絕對禁止
- ❌ Commit hash: `dc21387f`, `98b02a16`
- ❌ 時間戳: `0117`, `1344`
- ❌ 截斷詞語: `filename-generation-fo`
- ❌ 無意義詞: `unknown`, `misc`, `temp`

#### 3.2 技術縮寫（需展開）
- ❌ `ddd` → ✅ `domain-driven-design`
- ❌ `bdd` → ✅ `behavior-driven-development`
- ❌ `tdd` → ✅ `test-driven-development`
- ❌ `ui` → ✅ `user-interface`
- ❌ `api` → ✅ `application-programming-interface`

### 4. 檔案長度限制

#### 4.1 建議長度
- 最小長度: 15 字符（不含日期和副檔名）
- 最大長度: 60 字符（不含日期和副檔名）
- 如果超過 60 字符，使用關鍵詞縮減，但保持清晰

#### 4.2 處理長描述
```
原始: feat(docs): improve filename generation for auto-generated documentation files
處理: 2025-06-23-feature-filename-generation-improvement.yml
```

### 5. 自動化檢查規則

#### 5.1 Pre-commit 檢查
- 檢測檔名中的 commit hash 模式
- 檢測截斷的檔名（長度 < 15 或以 `-xx` 結尾）
- 檢測技術縮寫

#### 5.2 自動修正建議
- 提供命名建議
- 標記需要手動重新命名的檔案

### 6. 目錄結構一致性

#### 6.1 統一副檔名
- 開發日誌: `.yml`（不使用 `.yaml`）
- 文檔: `.md`
- 腳本: `.py`, `.sh`

#### 6.2 目錄命名
- 使用完整英文詞語
- 避免縮寫和技術術語
- 使用連字符分隔

## 立即行動

### 需要重新命名的檔案

#### 開發日誌
```bash
# 舊名 → 新名
2025-06-23-bug-misc-840cecf9.yml → 2025-06-23-bug-miscellaneous-fixes.yml
2025-06-23-docs-auto-d8cd84c3.yml → 2025-06-23-docs-automation-setup.yml
2025-06-23-docs-decisions-1d6388cc.yml → 2025-06-23-docs-architecture-decisions.yml
2025-06-23-feature-core-dc21387f.yml → 2025-06-23-feature-core-system-enhancement.yml
2025-06-23-feature-docs-98b02a16.yml → 2025-06-23-feature-documentation-system.yml
2025-06-23-feature-improve-filename-generation-fo.yml → 2025-06-23-feature-filename-generation-improvement.yml
```

#### 開發故事
```bash
# 舊名 → 新名  
2025-06-23-core-dc21387f.md → 2025-06-23-core-system-enhancement-story.md
2025-06-23-docs-98b02a16.md → 2025-06-23-documentation-system-story.md
2025-06-23-improve-filename-generation-fo.md → 2025-06-23-filename-generation-improvement-story.md
```

### 自動化實現

#### post-commit-doc-gen.py 更新
- 實現更智能的名稱提取
- 增加關鍵詞字典
- 避免截斷和 hash 使用
- 實現名稱品質檢查

## 影響

### 正面影響
- 🔍 **可搜尋性**: 檔名即內容摘要
- 📚 **可維護性**: 新人容易理解檔案結構
- 🎯 **效率提升**: 快速定位相關檔案
- 🤖 **自動化友好**: 工具更容易處理有意義的檔名

### 維護成本
- 需要一次性重新命名現有檔案
- 需要更新相關引用和連結
- 需要培訓團隊成員新的命名習慣

## 評估標準

- 新檔名的清晰度 > 95%
- 技術縮寫使用率 < 5%
- 檔名截斷發生率 = 0%
- 團隊成員滿意度提升

---

**重要**: 此規範立即生效，所有新建檔案必須遵循。現有檔案將逐步重新命名。