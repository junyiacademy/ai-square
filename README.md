# AI Square 🌐 – Multi-Agent Learning Platform Roadmap  
> **Vision** – _A hackable AI workspace where anyone can “Learn with AI, Build with AI, and Ship with AI.”_

---

## 📅 Phase Index

| Phase | Tagline | Status |
|-------|---------|--------|
| **–1 Rule Core** | 離線 YAML 題庫＋規則評分可跑得出對錯 | ✅ PoC |
| **1 Auth + I18N Mono** | Google / Email 登入＋雙語 CMS＋練習 MVP | 🔜 |
| **2 Placement & Practice** | 基線 10 題小測＋每日練習→夜批折線圖 | − |
| **3 Notebook + LLM Assist** | LangGraph Research Agent、GPT / Gemini 補題＋RAG 解說 | − |
| **4 Personal Knowledge Graph** | Neo4j 圖譜＋CrewAI Tutor Squad 推薦 | − |
| **5 CMS Decouple (optional)** | Maple CMS SaaS 或獨立 Strapi Service | − |
| **6 Plug-in & Marketplace (optional)** | Flowise GUI＋沙盒 Loader＋App 市集 | − |

---

## 🔨 技術選型總覽

| 層級 | 基準框架 / 服務 | 可替換 |
|------|-----------------|--------|
| **LLM** | Google Gemini 2.5 (Flash / Pro) | OpenAI GPT-4o, Claude 3 |
| **Orchestrator** | LangChain Core ＋ LangGraph | Llama-Index Flow, 自建 FSM |
| **Multi-Agent** | CrewAI (Phase 4+) | Autogen Agent, AutoGPT |
| **Plug-in GUI** | Flowise (Node) (Phase 6) | n8n, LangFlow |
| **CMS** | **Strapi v4** (Phase 1) → _+ Decap CMS Git GUI_ (Phase 2) → Maple CMS (Phase 5 可選) | Netlify / Decap-only |
| **DB** | Cloud SQL Postgres 15 (+ pgvector) | AlloyDB Vector, Supabase |
| **文件/CDN** | GitHub repo → CI → GCS (+ Cloud CDN) | S3 + CloudFront |
| **Graph** | Neo4j Aura Free (Phase 4) | Memgraph, Dgraph |
| **部署** | Cloud Run (multi-svc) + Cloud Build CI | GKE Autopilot |

---

## 🚦 Phase Breakdown & Rationale

### –1 Rule Core (1 day)
* **Why** 驗證「題庫＋規則評分」可行  
* **Stack** Python Rule-Engine・SQLite・Markdown/YAML  
* **Skip** LLM / LangChain

### 1 Auth + I18N Mono (6 weeks)
* **Goal** 登入 → 編輯題庫 → 練題 → 寫 log  
* **Stack**  
  * **Strapi (同容器)** – 存 meta, i18n plug-in  
  * **Next.js** – `next-intl` (zh-TW / en)  
  * **Cloud SQL f1-micro** – `practice_log`  
  * **Gemini API** – 單步補題  
* **No LangChain yet** — 單線流程足夠

### 2 Placement & Practice (8 weeks)
* **Goal**  Baseline 10 題＋每日練習＋夜批  
* **Add**  Nightly Analyzer (Cloud Functions)・LangChain Memory (RAM)  
* **CMS 雙軌** — 導入 **Decap CMS** GUI，Markdown 正文全 Git；Strapi 只存 `gcs_uri`

### 3 Notebook + LLM Assist (6 weeks)
* **Goal** Research Agent - Think → Search → Cite  
* **Add**  Fork `gemini-fullstack-langgraph-quickstart` as `research-agent`  
  LangGraph ReAct loop・pgvector RAG  
* **LangSmith 可選** — Trace on dev, off prod

### 4 Personal Knowledge Graph (6 weeks)
* **Goal** 弱點染色圖譜＋CrewAI Tutor Squad  
* **Add**  Neo4j Aura・CrewAI Squad integrated via LangGraph

### 5 CMS Decouple (optional)
* **Goal** 內容層獨立為 SaaS or 微服務  
* **Action**  `MAPLE_CMS_BASE=https://…` 切換，不改 code

### 6 Plug-in & Marketplace (optional)
* **Goal** 老師拖拉 Flowise 建外掛，一鍵上架  
* **Stack**  Flowise GUI・Plug-in Loader (Cloud Run sandbox)・`plugin.yaml`＋Docker  
* **Security**  最小權限、Cloud Armor、資源限額

---

## 💰 小流量雲端月費估算

| 服務 | 月費 |
|------|------|
| Cloud Run ×3 | US $15 |
| Cloud SQL f1-micro | US $7 |
| GCS (+ CDN 20 GB) | ~US $2 |
| Gemini Flash (2 M tokens) | ~US $30 |
| Neo4j Aura Free | 0 |
| **Total** | **≈ US $55 / NT$1,900** |

---
