# 文檔遷移計劃

## 現狀分析與遷移策略

### 🔄 需要遷移/整合的目錄

#### 1. **development-logs/** → **features/** (YAML格式)
- **原因**: 舊的工作日誌過於冗長（150+行）
- **行動**: 提取關鍵資訊轉為YAML格式
- **保留**: 歸檔原始文件供參考

#### 2. **current/** → **歸檔**
- **原因**: 臨時性文件，已完成其階段性任務
- **行動**: 移至 archive/2025-06/
- **例外**: claude-guidance.md 內容整合到 PLAYBOOK.md

#### 3. **workflows/** → **刪除**
- **原因**: 空目錄，Python腳本已移至專案根目錄
- **行動**: 直接刪除

#### 4. **development-standards.md** → **整合到 PLAYBOOK.md**
- **原因**: 避免文檔分散
- **行動**: 關鍵內容已整合，原檔案歸檔

### ✅ 保留的目錄（新架構核心）

#### 1. **features/** 
- 功能開發日誌 (YAML)
- 支援時間追蹤和成本分析

#### 2. **decisions/** 
- 架構決策記錄 (ADR)
- 重要技術決定的歷史

#### 3. **ai-tasks/**
- AI 協作任務模板
- Quick/Feature/Architecture 三種模式

#### 4. **tutorials/**
- 從開發日誌生成的教學文件
- 知識資產化

#### 5. **metrics/**
- 開發指標和分析報告
- 數據驅動決策

### 🤔 需要評估的目錄

#### 1. **product/** 
- **建議**: 保留但精簡
- **原因**: 產品願景和Epic仍有參考價值
- **行動**: 
  - vision.md → 保留
  - user-personas.md → 保留
  - epics/ → 保留活躍的Epic
  - features/ → 新功能使用 features/ YAML

#### 2. **technical/**
- **建議**: 整合到 PLAYBOOK.md
- **原因**: 避免文檔分散
- **行動**: 
  - test-strategy.md → 整合關鍵原則
  - frontend-guide.md → 整合到技術章節

#### 3. **architecture/**
- **建議**: 保留
- **原因**: DDD概念對專案架構重要
- **行動**: 維持現狀，定期更新

## 遷移步驟

### Phase 1: 創建歸檔結構
```bash
mkdir -p docs/archive/2025-06/{current,development-logs}
mkdir -p docs/archive/legacy
```

### Phase 2: 整合關鍵內容
1. 更新 PLAYBOOK.md 加入：
   - technical/ 的測試策略
   - development-standards.md 的關鍵原則
   - current/claude-guidance.md 的 AI 指導

### Phase 3: 轉換開發日誌
將 development-logs 中有價值的內容轉為 YAML：
- 2025-06-20 email-login → features/2025-06-20-email-login.yml
- 2025-06-21 auth-sync → features/2025-06-21-auth-sync.yml
- 2025-06-21 header-status → features/2025-06-21-header-status.yml

### Phase 4: 執行遷移
```bash
# 歸檔舊文件
mv docs/current/* docs/archive/2025-06/current/
mv docs/development-logs/* docs/archive/2025-06/development-logs/
mv docs/development-standards.md docs/archive/legacy/

# 刪除空目錄
rm -rf docs/workflows

# 整合 technical 內容後歸檔
mv docs/technical docs/archive/legacy/
```

### Phase 5: 更新引用
- 更新 CLAUDE.md 引用新的文檔位置
- 更新 Makefile 中的文檔檢查路徑
- 更新 README.md 的文檔說明

## 最終結構

```
docs/
├── PLAYBOOK.md           # 核心開發指南
├── features/             # YAML格式開發日誌
├── decisions/            # 架構決策 (ADR)
├── ai-tasks/            # AI 任務模板
├── tutorials/           # 教學文件
├── metrics/             # 分析報告
├── product/             # 產品文檔（精簡版）
├── architecture/        # DDD 架構文檔
└── archive/             # 歸檔文件
    ├── 2025-06/
    └── legacy/
```

## 預期效益

1. **減少50%文檔數量**：從35個文件減少到約18個核心文件
2. **統一格式**：YAML格式便於程式分析
3. **清晰層級**：活躍文檔 vs 歸檔文檔
4. **易於維護**：集中化的 PLAYBOOK.md
5. **保留價值**：歷史文件仍可查詢

## 執行時間表

- **立即執行**: Phase 1-2（創建結構、整合內容）
- **本週完成**: Phase 3（轉換日誌）
- **下週完成**: Phase 4-5（執行遷移、更新引用）

---

是否要開始執行這個遷移計劃？