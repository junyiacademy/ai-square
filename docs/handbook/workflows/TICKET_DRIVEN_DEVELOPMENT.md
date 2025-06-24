# 票券驅動開發系統

本系統確保每次開發都有完整的文件支持，提升代碼品質和可維護性。

## 核心概念

### 🎯 設計目標
- **票券先行**: 所有開發必須先創建票券
- **文件驅動**: 根據開發類型自動生成必要文件清單
- **品質保證**: 提交時自動檢查文件完整性
- **標準化流程**: 統一的開發和文檔標準

### 📋 開發類型

| 類型 | 說明 | 必要文件 |
|------|------|----------|
| `feature` | 新功能開發 | 功能規格、開發日誌、單元測試 |
| `bugfix` | 錯誤修復 | Bug分析報告、修復日誌、回歸測試 |
| `refactor` | 代碼重構 | 重構計劃、ADR文件、重構日誌 |
| `docs` | 文檔更新 | 文檔更新日誌 |
| `test` | 測試改進 | 測試計劃、測試改進日誌 |

## 使用流程

### 1. 創建票券
```bash
# 功能開發
make dev-ticket TICKET=user-login TYPE=feature DESC="實作用戶登入功能"

# 錯誤修復
make dev-ticket TICKET=fix-login-bug TYPE=bugfix DESC="修復登入按鈕無效問題"

# 代碼重構
make dev-ticket TICKET=refactor-auth TYPE=refactor DESC="重構認證模組"
```

### 2. 自動生成票券
系統會自動：
- 創建單一票券 YAML 檔案
- 包含 spec 內容區塊（goals, technical_specs, acceptance_criteria）
- 記錄參考的 handbook 文件
- 設置品質門檻

### 3. 填寫票券內容
直接在票券 YAML 檔案中填寫：
- spec.goals：功能目標
- spec.technical_specs：技術規格
- spec.acceptance_criteria：驗收標準
- document_references：參考的文件

### 4. 開發實作
按照文件進行開發，確保：
- 符合規格要求
- 通過品質檢查
- 完成必要測試

### 5. 提交驗證
```bash
make commit-ticket
```

系統會自動：
- 檢查文件完整性
- 驗證內容品質
- 確認品質門檻達標

## 票券結構範例

### 功能開發票券 (feature)
```yaml
id: 2025-06-24-12-00-00-user-login
name: user-login
type: feature
description: 實作用戶登入功能
status: in_progress
created_at: '2025-06-24T12:00:00'
spec:
  goals: 
    - 實作安全的用戶登入機制
    - 支援多種登入方式（email、社交媒體）
  technical_specs:
    - 使用 JWT token 進行認證
    - 實作 OAuth2.0 流程
    - 密碼使用 bcrypt 加密
  acceptance_criteria:
    - 用戶可以使用 email/密碼登入
    - 登入後取得有效的 JWT token
    - 錯誤訊息不洩漏敏感資訊
document_references:
  - path: docs/handbook/01-context/business-rules.md
    reason: 確保符合安全規範
  - path: docs/handbook/03-technical-references/core-practices/security.md
    reason: 應用安全最佳實踐
```

### Bug 修復票券 (bugfix)
```yaml
id: 2025-06-24-13-00-00-fix-login-bug
name: fix-login-bug
type: bugfix
description: 修復登入按鈕無效問題
status: in_progress
created_at: '2025-06-24T13:00:00'
spec:
  goals:
    - 修復登入按鈕點擊無反應的問題
    - 確保所有瀏覽器都能正常運作
  technical_specs:
    bug_description: 登入按鈕在某些情況下無法觸發提交事件
    root_cause: 事件綁定在表單重新渲染時遺失
    fix_approach: 使用事件委派確保事件綁定持續有效
    affected_files:
      - frontend/components/LoginForm.tsx
      - frontend/hooks/useAuth.ts
  acceptance_criteria:
    - 登入按鈕在所有測試瀏覽器都能點擊
    - 表單重新渲染後按鈕仍然有效
    - 新增單元測試防止回歸
document_references:
  - path: docs/handbook/03-technical-references/core-practices/tdd.md
    reason: 編寫測試防止回歸
```

### 重構票券 (refactor)
```yaml
id: 2025-06-24-14-00-00-refactor-auth
name: refactor-auth
type: refactor
description: 重構認證模組
status: in_progress
created_at: '2025-06-24T14:00:00'
spec:
  goals:
    - 改善認證模組的可維護性
    - 提升程式碼的可測試性
    - 統一認證邏輯
  technical_specs:
    current_issues:
      - 認證邏輯分散在多個元件
      - 難以進行單元測試
      - 狀態管理混亂
    refactor_approach:
      - 抽取認證邏輯到獨立的 context
      - 實作統一的認證 hook
      - 使用 dependency injection 提升可測試性
    affected_components:
      - LoginForm
      - UserProfile
      - ProtectedRoute
  acceptance_criteria:
    - 所有認證功能維持正常運作
    - 單元測試覆蓋率達 90%
    - 效能不能下降
    - API 保持向後相容
document_references:
  - path: docs/handbook/03-technical-references/design-patterns/
    reason: 應用設計模式最佳實踐
  - path: docs/handbook/03-technical-references/core-practices/clean-code.md
    reason: 遵循 clean code 原則
```

## 品質門檻

### 功能開發 (feature)
- **測試覆蓋率**: ≥ 80%
- **文檔評分**: ≥ 8/10
- **代碼審查**: 必須通過

### 錯誤修復 (bugfix)
- **重現測試**: 必須有重現步驟
- **修復驗證**: 修復後無法重現
- **回歸測試**: 相關功能不受影響

### 代碼重構 (refactor)
- **測試覆蓋率**: 維持或提升
- **效能**: 不能下降
- **API 相容性**: 向後相容

### 文檔更新 (docs)
- **拼字檢查**: 無拼字錯誤
- **連結驗證**: 所有連結有效

### 測試改進 (test)
- **覆蓋率提升**: 必須提升
- **測試可靠性**: 穩定通過

## 自動檢測

### 開發類型推測
系統會根據檔案變更自動推測開發類型：

| 檔案模式 | 推測類型 |
|----------|----------|
| `src/components/`, `.tsx`, `.ts` | feature |
| `fix`, `bug`, `patch` | bugfix |
| `refactor`, `optimize` | refactor |
| `.md`, `docs/`, `README` | docs |
| `__tests__/`, `.test.` | test |

### 文件完整性檢查
- **Markdown**: 最少10行、必須有標題、至少2個章節
- **YAML**: 語法正確、至少3個欄位
- **測試檔**: 必須包含測試函數、至少1個測試案例

## 錯誤處理

### 無票券情況
如果提交時沒有活躍票券：
1. 分析變更檔案
2. 推測開發類型
3. 建議創建對應票券
4. 可選擇自動創建

### 文件不完整
如果文件檢查失敗：
1. 列出缺少的文件
2. 提供補救建議
3. 阻止提交直到完成

### 品質門檻未達標
如果品質檢查失敗：
1. 顯示未達標項目
2. 提供改善建議
3. 要求修正後重新提交

## 配置選項

### 票券配置範例
```yaml
# 票券會自動包含以下結構
ticket_structure:
  base_fields:
    - id
    - name
    - type
    - description
    - status
    - timestamps
  spec_fields:
    - goals
    - technical_specs
    - acceptance_criteria
  tracking_fields:
    - document_references
    - files_changed
    - commit_hash
```

### 自動生成設定
```yaml
auto_generation:
  enabled: true
  create_missing_templates: true
  auto_fill_metadata: true
```

## 最佳實踐

### 1. 票券命名
- 使用描述性名稱
- 包含功能或問題關鍵字
- 避免過長或過短

### 2. 文件品質
- 詳細描述需求和設計
- 包含具體的驗收標準
- 保持文件與實作同步

### 3. 測試策略
- 優先寫測試案例
- 涵蓋主要功能路徑
- 包含邊界條件測試

### 4. 代碼審查
- 確保符合團隊標準
- 檢查安全性問題
- 驗證效能影響

## 工具整合

### IDE 整合
可以建立 IDE 外掛或腳本：
- 自動創建票券
- 開啟對應文件模板
- 檢查文件完整性

### CI/CD 整合
```yaml
# GitHub Actions 範例
- name: Validate Ticket Documentation
  run: make test-workflow
```

### 監控儀表板
追蹤指標：
- 票券完成率
- 文件品質評分
- 開發週期時間

---

這個系統確保每次開發都有完整的文件支持，提升整體開發品質和團隊協作效率。