# 架構設計文檔

這裡包含 AI Square 的系統架構設計和決策。

## 📁 目錄結構

### current/ - 當前系統架構
**現在正在使用的架構**：
- `system-overview.md` - 系統架構總覽
- `tech-stack.md` - 技術棧決策
- `deployment.md` - 部署架構（待創建）
- `api-design.md` - API 設計規範（待創建）

### patterns/ - 架構模式
**可參考的架構模式**：
- `microservices.md` - 微服務架構（未來考慮）
- `event-driven.md` - 事件驅動架構
- `layered-architecture.md` - 分層架構

### decisions/ - 架構決策記錄
**為什麼做這些選擇**：
- `why-nextjs.md` - 為什麼選擇 Next.js
- `why-gcp.md` - 為什麼選擇 Google Cloud
- `why-monorepo.md` - 為什麼用 Monorepo

## 🎯 使用指南

### 了解現狀
1. 先看 `current/system-overview.md` 了解整體架構
2. 查看 `current/tech-stack.md` 理解技術選擇

### 設計新功能
1. 參考 `patterns/` 中的架構模式
2. 遵循 `current/api-design.md` 的規範

### 做架構決策
1. 查看 `decisions/` 了解過往決策
2. 新的重大決策要創建 ADR

## 🔗 相關文檔

- [DDD 領域設計](../ddd/) - 業務領域建模
- [前端架構模式](../frontend/) - 前端特定模式
- [架構決策記錄](../../../decisions/) - 正式的 ADR

## 📝 架構圖工具

推薦使用：
- ASCII 圖表（如 system-overview.md）
- Mermaid 圖表（GitHub 支援）
- Draw.io（複雜圖表）

---

💡 架構文檔應該反映現實，而非理想。保持更新！