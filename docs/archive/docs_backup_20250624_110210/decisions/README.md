# 架構決策記錄 (ADR)

此目錄包含所有重要的架構決策記錄。

## 📋 ADR 格式

檔名：`ADR-{編號}-{簡短描述}.md`

範例：
- `ADR-001-simplified-documentation.md`
- `ADR-002-yaml-content-format.md`

## 📝 ADR 模板

每個 ADR 必須包含：
1. **標題** - ADR-XXX: 決策簡述
2. **日期** - 決策日期（文件內）
3. **狀態** - 提議中/已接受/已棄用/已取代
4. **背景** - 為什麼需要這個決策
5. **決策** - 做了什麼決定
6. **後果** - 正面/負面影響

## 🔢 編號規則

- 使用三位數編號（001, 002, ...）
- 編號永不重複使用
- 即使 ADR 被棄用，編號保留

## 📅 時間追蹤

雖然檔名不含日期，但每個 ADR 內部都記錄：
- 初始決策日期
- 最後修改日期
- 狀態變更歷史

## 🔄 ADR 生命週期

1. **提議中** → 正在討論
2. **已接受** → 已實施的決策
3. **已棄用** → 不再適用（保留歷史）
4. **已取代** → 被新 ADR 取代（註明新編號）

## 📚 參考資源

- [ADR GitHub](https://adr.github.io/)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)