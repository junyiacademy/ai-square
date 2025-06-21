#!/usr/bin/env python3
"""
AI Square 開發引導系統
基於 BDD/DDD/TDD 的自動化開發流程啟動器
"""

import os
import json
import datetime
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional

class Colors:
    """終端機顏色"""
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

class AIGuidedDevelopment:
    def __init__(self):
        self.project_root = Path.cwd()
        self.docs_path = self.project_root / "docs"
        self.current_path = self.docs_path / "current"
        
        # 確保目錄存在
        self.current_path.mkdir(parents=True, exist_ok=True)
        
    def print_header(self):
        """顯示開發助理標題"""
        print(f"{Colors.CYAN}{Colors.BOLD}")
        print("🤖 AI Square 開發助理")
        print("=" * 50)
        print(f"基於 BDD/DDD/TDD 的智能開發引導系統{Colors.END}")
        print()
        
    def load_project_context(self) -> Dict:
        """載入專案當前狀態"""
        return {
            "product": self.load_product_context(),
            "architecture": self.load_architecture_context(),
            "technical": self.load_technical_context(),
            "current_sprint": self.load_sprint_status()
        }
    
    def load_product_context(self) -> Dict:
        """載入產品上下文"""
        phase_status = self.get_current_phase()
        active_epics = self.get_active_epics()
        
        return {
            "current_phase": phase_status,
            "active_epics": active_epics,
            "pending_features": ["Google OAuth 登入", "練習系統", "進度追蹤"],
            "last_completion": "多語言系統修正"
        }
    
    def load_architecture_context(self) -> Dict:
        """載入架構上下文"""
        return {
            "bounded_contexts": ["AI Literacy", "Identity", "Learning", "Content", "Analytics"],
            "current_aggregates": ["User", "Competency", "Practice", "Content"],
            "integration_points": ["Google OAuth", "Gemini API", "Cloud SQL"],
            "technical_debt": []
        }
    
    def load_technical_context(self) -> Dict:
        """載入技術上下文"""
        recent_commits = self.get_recent_commits()
        build_status = self.check_build_status()
        
        return {
            "recent_commits": recent_commits,
            "build_status": build_status,
            "test_coverage": "80%+",
            "tech_stack": "Next.js 15, React 19, TypeScript 5, Tailwind CSS 4"
        }
    
    def get_current_phase(self) -> str:
        """獲取當前開發階段"""
        return "Phase 1: Auth + I18N Mono"
    
    def get_active_epics(self) -> List[str]:
        """獲取活躍的 Epic"""
        return ["認證系統", "AI 素養框架", "多語言系統"]
    
    def get_recent_commits(self) -> List[str]:
        """獲取最近的提交記錄"""
        try:
            result = subprocess.run(
                ["git", "log", "--oneline", "-5"], 
                capture_output=True, 
                text=True
            )
            return result.stdout.strip().split('\n')[:3]
        except:
            return ["無法獲取 git 記錄"]
    
    def check_build_status(self) -> str:
        """檢查建置狀態"""
        try:
            # 檢查是否可以正常建置
            result = subprocess.run(
                ["npm", "run", "build"], 
                cwd=self.project_root / "frontend",
                capture_output=True,
                text=True,
                timeout=60
            )
            return "✅ 建置成功" if result.returncode == 0 else "❌ 建置失敗"
        except:
            return "⚠️ 無法檢查建置狀態"
    
    def load_sprint_status(self) -> Dict:
        """載入當前 Sprint 狀態"""
        return {
            "current_sprint": "Sprint 2024-01",
            "days_remaining": 5,
            "completed_stories": 3,
            "remaining_stories": 2
        }
    
    def get_user_input(self) -> str:
        """獲取用戶開發需求"""
        print(f"{Colors.GREEN}📝 請問你今天想要開發什麼？{Colors.END}")
        print(f"{Colors.YELLOW}範例：{Colors.END}")
        print("  • 新增 Google 登入功能")
        print("  • 修正語言切換的 bug")
        print("  • 重構 API 路由架構")
        print("  • 實作練習系統 MVP")
        print()
        
        user_input = input(f"{Colors.BLUE}> {Colors.END}").strip()
        
        if not user_input:
            print(f"{Colors.RED}請輸入開發需求！{Colors.END}")
            return self.get_user_input()
            
        return user_input
    
    def analyze_development_type(self, user_input: str) -> Tuple[str, str]:
        """AI 分析開發類型和複雜度"""
        user_input_lower = user_input.lower()
        
        # 分析開發類型
        if any(word in user_input_lower for word in ["新增", "加入", "實作", "建立", "功能", "feature"]):
            dev_type = "feature"
        elif any(word in user_input_lower for word in ["修正", "修復", "bug", "錯誤", "問題", "fix"]):
            dev_type = "bugfix"
        elif any(word in user_input_lower for word in ["重構", "優化", "改善", "重寫", "refactor"]):
            dev_type = "refactor"
        elif any(word in user_input_lower for word in ["架構", "設計", "模型", "服務", "architecture"]):
            dev_type = "architecture"
        else:
            dev_type = "feature"  # 預設為功能開發
        
        # 分析複雜度
        high_complexity_words = ["系統", "整合", "架構", "重構", "多語言", "認證", "資料庫"]
        medium_complexity_words = ["功能", "頁面", "api", "服務", "組件"]
        
        if any(word in user_input_lower for word in high_complexity_words):
            complexity = "high"
        elif any(word in user_input_lower for word in medium_complexity_words):
            complexity = "medium"
        else:
            complexity = "low"
        
        return dev_type, complexity
    
    def select_development_flow(self, dev_type: str, complexity: str) -> str:
        """選擇開發流程"""
        flows = {
            ("feature", "high"): "epic-driven-development",
            ("feature", "medium"): "feature-driven-development",
            ("feature", "low"): "simple-feature-development",
            ("bugfix", "high"): "systematic-bug-fixing",
            ("bugfix", "medium"): "standard-bug-fixing",
            ("bugfix", "low"): "quick-bug-fixing",
            ("refactor", "high"): "architecture-refactoring",
            ("refactor", "medium"): "code-refactoring",
            ("architecture", "high"): "domain-driven-design"
        }
        
        return flows.get((dev_type, complexity), "feature-driven-development")
    
    def generate_claude_guidance(self, flow: str, user_input: str, context: Dict) -> str:
        """生成 Claude Code 引導文檔"""
        
        if flow == "feature-driven-development":
            return self.generate_feature_guidance(user_input, context)
        elif flow == "domain-driven-design":
            return self.generate_ddd_guidance(user_input, context)
        elif flow.endswith("bug-fixing"):
            return self.generate_bug_guidance(user_input, context)
        else:
            return self.generate_feature_guidance(user_input, context)
    
    def generate_feature_guidance(self, user_input: str, context: Dict) -> str:
        """生成功能開發引導"""
        return f"""# 🎯 功能開發引導 - AI Square

## 📋 開發需求
**用戶輸入**: {user_input}

## 🎯 產品維度 (BDD)

### 1. 用戶故事分析
請先確認這個功能的用戶故事：
```
As a [用戶角色]
I want [期望功能] 
So that [商業價值]
```

### 2. 驗收標準 (Acceptance Criteria)
基於當前專案狀態：
- **當前階段**: {context['product']['current_phase']}
- **活躍 Epic**: {', '.join(context['product']['active_epics'])}
- **上次完成**: {context['product']['last_completion']}

### 3. 行為場景 (Given-When-Then)
```gherkin
Feature: {user_input}

Scenario: [主要使用場景]
  Given [前置條件]
  When [用戶操作]
  Then [期望結果]
  And [額外驗證]
```

## 🏗️ 架構維度 (DDD)

### 1. 界限上下文分析
當前系統的界限上下文：
{', '.join(context['architecture']['bounded_contexts'])}

**問題**: 這個功能屬於哪個界限上下文？是否需要新的界限上下文？

### 2. 領域模型
現有聚合根：
{', '.join(context['architecture']['current_aggregates'])}

**分析**:
- 是否需要新的聚合根？
- 哪些實體需要修改？
- 領域事件是什麼？

### 3. 通用語言更新
請確認並更新 `docs/architecture/ubiquitous-language.md`：
- 新增的領域概念
- 統一的術語定義

## 🔧 技術維度 (TDD)

### 1. 測試策略
```
🔴 紅燈：寫失敗測試
🟢 綠燈：最小實作讓測試通過
🔵 重構：優化代碼品質
```

### 2. 實作檢查清單
**當前技術狀態**:
- 建置狀態: {context['technical']['build_status']}
- 測試覆蓋率: {context['technical']['test_coverage']}
- 技術棧: {context['technical']['tech_stack']}

**開發步驟**:
- [ ] **單元測試**: 先寫失敗的測試
- [ ] **最小實作**: 讓測試通過
- [ ] **整合測試**: API/資料庫整合
- [ ] **E2E 測試**: 端到端用戶流程

### 3. 需要檢查的檔案
基於現有架構：
- `frontend/src/app/` (Next.js App Router 頁面)
- `frontend/src/components/` (React 組件)
- `frontend/public/locales/` (多語言翻譯)
- `docs/product/features/` (功能規格)
- `docs/architecture/` (架構文檔)

## 📋 開發流程建議

### Phase 1: 分析與設計 (30-45分鐘)
1. 🎯 **完善用戶故事** → 更新 `docs/product/features/{{feature-name}}.md`
2. 🏗️ **設計領域模型** → 檢查 `docs/architecture/domain-models.md`
3. 🔧 **定義測試策略** → 建立 `docs/technical/testing/{{feature-name}}.md`

### Phase 2: TDD 實作循環
1. 🔴 **紅燈**: 寫失敗測試
2. 🟢 **綠燈**: 最小實作
3. 🔵 **重構**: 代碼優化
4. 📚 **文檔**: 更新相關文檔

### Phase 3: 整合與驗證
1. 🧪 **整合測試**: 跨模組測試
2. 🎭 **E2E 測試**: 完整用戶流程
3. 📱 **多語言測試**: 9 種語言驗證
4. ✅ **驗收測試**: BDD 場景驗證

## 🚨 重要提醒

### 多語言考量
- 確保所有新文字都有 9 種語言翻譯
- 更新 `frontend/public/locales/` 中的 JSON 檔案
- 測試語言切換功能

### 響應式設計
- 支援桌面和手機版本
- 使用 Tailwind CSS 斷點
- 測試不同螢幕尺寸

### 效能考量
- 注意 bundle 大小
- 實作程式碼分割
- 優化載入速度

## 🎯 今日目標

**建議先完成**:
1. Phase 1 的分析與設計
2. 第一個紅燈測試
3. 基本實作框架

**下一步**: 請告訴我你想從哪裡開始？
1. 📝 完善用戶故事
2. 🏗️ 設計領域模型  
3. 🔴 寫第一個測試
4. 📚 查看相關文檔

---

> **AI 助理提示**: 這份引導文檔已根據你的專案現況客製化。請選擇一個起始點，我會提供更詳細的指導。
"""

    def generate_ddd_guidance(self, user_input: str, context: Dict) -> str:
        """生成 DDD 架構設計引導"""
        return f"""# 🏗️ 領域驅動設計引導 - AI Square

## 📋 架構需求
**輸入**: {user_input}

## 🎯 領域分析流程

### 1. 事件風暴 (Event Storming)
請在 `docs/architecture/event-storming.md` 記錄：

#### 🔥 領域事件 (Domain Events)
現有事件模式：
- UserAuthenticated
- LanguagePreferenceChanged
- CompetencyViewed
- **[新增事件...]**

#### ⚡ 命令 (Commands)  
- AuthenticateUser
- ChangeLanguage
- ViewCompetency
- **[新增命令...]**

#### 📦 聚合根 (Aggregates)
當前聚合：{', '.join(context['architecture']['current_aggregates'])}
- **[分析是否需要新聚合...]**

### 2. 界限上下文映射
```
Current Bounded Contexts:
{chr(10).join([f"├── {ctx}" for ctx in context['architecture']['bounded_contexts']])}

New Context Analysis:
└── [待分析: {user_input}]
```

**關鍵問題**:
- 這個需求屬於現有上下文嗎？
- 是否需要新的界限上下文？
- 上下文間的關係是什麼？

### 3. 通用語言更新
更新 `docs/architecture/ubiquitous-language.md`：

**新概念定義**:
- **[概念名稱]**: [定義]
- **[業務術語]**: [技術對應]

### 4. 聚合設計檢查
為每個聚合確認：
- 🏠 **根實體**: 誰是聚合根？
- 🔒 **不變量**: 需要保護哪些業務規則？
- 📨 **領域事件**: 發布哪些事件？
- 🎯 **生命週期**: 如何創建、修改、刪除？

## 🏗️ 實作架構

### 1. 目錄結構建議
```
src/domain/
├── {user_input.lower().replace(' ', '-')}/
│   ├── aggregates/
│   ├── entities/
│   ├── value-objects/
│   ├── domain-services/
│   ├── repositories/
│   └── events/
```

### 2. 依賴方向檢查
```
Domain Layer (純粹業務邏輯)
    ↑
Application Layer (用例編排)
    ↑  
Infrastructure Layer (技術實作)
```

### 3. 整合策略
與現有上下文的整合：
{chr(10).join([f"- {ctx}: [整合方式]" for ctx in context['architecture']['bounded_contexts']])}

## 📋 設計檢查清單

### 領域純粹性
- [ ] 領域邏輯不依賴外部框架
- [ ] 聚合邊界清晰合理
- [ ] 不變量規則明確
- [ ] 領域事件設計恰當

### 技術實作
- [ ] Repository 介面在領域層
- [ ] 領域服務職責單一
- [ ] 值物件不可變
- [ ] 實體有明確識別

### 測試覆蓋
- [ ] 聚合根測試
- [ ] 領域服務測試
- [ ] 不變量驗證測試
- [ ] 事件發布測試

## 🎯 下一步行動

**立即開始**:
1. 🎨 進行事件風暴會議
2. 📝 更新通用語言文檔
3. 🏗️ 設計聚合結構
4. 🔬 撰寫領域測試

**選擇起始點**:
- 📋 我想先進行事件風暴
- 🏗️ 我想設計聚合結構
- 📝 我想更新通用語言
- 🔬 我想寫領域測試

請告訴我你想從哪裡開始？
"""

    def generate_bug_guidance(self, user_input: str, context: Dict) -> str:
        """生成 Bug 修正引導"""
        return f"""# 🐛 Bug 修正引導 - AI Square

## 📋 問題描述
**Bug 報告**: {user_input}

## 🔍 Bug 分析流程

### 1. 問題重現
**當前系統狀態**:
- 建置狀態: {context['technical']['build_status']}
- 最近變更: {context['technical']['recent_commits'][0] if context['technical']['recent_commits'] else '無記錄'}

**重現步驟**:
1. 在哪個環境發生？(開發/測試/生產)
2. 具體操作步驟？
3. 預期 vs 實際結果？
4. 影響範圍有多大？

### 2. 根因分析
**可能原因分類**:
- 🔧 **邏輯錯誤**: 業務邏輯實作問題
- 🌐 **多語言問題**: i18n 系統相關
- 📱 **響應式問題**: 不同裝置顯示異常
- 🔗 **整合問題**: API 或外部服務問題

### 3. TDD 修正策略
```
🔴 寫重現 Bug 的測試
🟢 修正實作讓測試通過
🔵 重構避免類似問題
```

## 🧪 測試驅動修正

### 1. 失敗測試 (Red)
```typescript
// 先寫會失敗的測試來重現 Bug
describe('Bug Fix: {user_input}', () => {{
  it('should reproduce the bug', () => {{
    // 設置 Bug 發生的條件
    // 執行會產生 Bug 的操作
    // 驗證 Bug 確實發生
    expect(buggyBehavior).toBe(incorrectResult)
  }})
}})
```

### 2. 最小修正 (Green)
- 只修正導致測試失敗的部分
- 不要過度工程化
- 確保修正不破壞其他功能

### 3. 重構防範 (Refactor)
- 檢查是否有類似問題
- 加強相關測試覆蓋
- 改善代碼結構

## 🎯 檢查重點

### 多語言系統
如果是 i18n 相關問題：
- 檢查 `frontend/public/locales/` 翻譯檔案
- 驗證 `src/i18n.ts` 配置
- 測試語言切換功能

### 響應式設計
如果是 UI 問題：
- 測試不同螢幕尺寸
- 檢查 Tailwind CSS 斷點
- 驗證手機版本功能

### API 整合
如果是資料問題：
- 檢查 `/api/relations` 端點
- 驗證 YAML 資料解析
- 測試錯誤處理機制

## 🚨 修正檢查清單

### 修正前
- [ ] 建立 Bug 重現的測試案例
- [ ] 確認 Bug 的影響範圍
- [ ] 備份當前程式碼狀態

### 修正中
- [ ] 最小化修正範圍
- [ ] 確保測試通過
- [ ] 不破壞現有功能

### 修正後
- [ ] 所有相關測試通過
- [ ] 建置成功無錯誤
- [ ] 多語言功能正常
- [ ] 文檔更新完成

**下一步**: 請先建立重現 Bug 的測試案例！
"""

    def create_work_log(self, flow: str, user_input: str, feature_name: str) -> Path:
        """建立今日工作記錄"""
        today = datetime.date.today().strftime("%Y-%m-%d")
        work_log_path = self.current_path / f"work-{today}.md"
        
        # 同時建立開發歷程記錄
        self.create_development_log(today, feature_name, flow, user_input)
        
        # 如果檔案已存在，追加新任務
        if work_log_path.exists():
            with open(work_log_path, "a", encoding="utf-8") as f:
                f.write(f"\n## 🎯 新任務 ({datetime.datetime.now().strftime('%H:%M')})\n")
                f.write(f"**需求**: {user_input}\n")
                f.write(f"**流程**: {flow}\n")
                f.write("**進度**:\n- [ ] 分析需求\n- [ ] 設計方案\n- [ ] 實作功能\n- [ ] 測試驗證\n\n")
        else:
            with open(work_log_path, "w", encoding="utf-8") as f:
                f.write(f"""# 工作記錄 {today}

## 🎯 今日目標
**開發需求**: {user_input}
**選用流程**: {flow}

## 📊 進度追蹤

### 產品維度 (BDD)
- [ ] 用戶故事定義
- [ ] 驗收標準確認
- [ ] 行為場景撰寫

### 架構維度 (DDD)  
- [ ] 界限上下文分析
- [ ] 領域模型設計
- [ ] 聚合邊界確認

### 技術維度 (TDD)
- [ ] 紅燈測試撰寫
- [ ] 綠燈實作完成
- [ ] 重構優化執行

## 🚨 遇到的問題

## 📝 學習筆記

## ✅ 完成項目

""")
        
        return work_log_path
    
    def generate_feature_name(self, user_input: str) -> str:
        """根據用戶輸入生成功能名稱"""
        # 簡化中文為英文功能名
        feature_mapping = {
            "登入": "login",
            "註冊": "register", 
            "google": "google-auth",
            "email": "email-login",
            "密碼": "password",
            "用戶": "user",
            "資料庫": "database",
            "api": "api",
            "介面": "ui",
            "測試": "testing"
        }
        
        input_lower = user_input.lower()
        feature_parts = []
        
        for chinese, english in feature_mapping.items():
            if chinese in input_lower:
                feature_parts.append(english)
        
        if not feature_parts:
            # 如果沒有映射，使用前幾個單詞
            words = user_input.replace(" ", "-").replace("，", "-").replace("。", "")
            feature_parts = [words[:20]]
        
        return "-".join(feature_parts[:3])  # 最多3個部分
    
    def create_development_log(self, date: str, feature_name: str, flow: str, user_input: str):
        """建立開發歷程記錄"""
        dev_logs_path = self.project_root / "docs" / "development-logs" / date / feature_name
        dev_logs_path.mkdir(parents=True, exist_ok=True)
        
        # 時間追蹤檔案
        time_tracking = {
            "feature": feature_name,
            "description": user_input,
            "flow": flow,
            "startTime": datetime.datetime.now().isoformat(),
            "endTime": None,
            "totalMinutes": 0,
            "phases": {
                "analysis": 0,
                "design": 0, 
                "implementation": 0,
                "testing": 0,
                "documentation": 0
            },
            "metrics": {
                "linesOfCode": 0,
                "filesCreated": 0,
                "testsWritten": 0,
                "bugsFixed": 0
            }
        }
        
        with open(dev_logs_path / "time-tracking.json", "w", encoding="utf-8") as f:
            import json
            json.dump(time_tracking, f, indent=2, ensure_ascii=False)
        
        # 審查檢查清單
        review_checklist = f"""# 代碼審查檢查清單 - {feature_name}

## 📋 功能概述
**功能**: {user_input}  
**開發流程**: {flow}  
**開始時間**: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}

## ✅ BDD (行為驅動開發)
- [ ] 用戶故事定義清楚且可測試
- [ ] 驗收標準 (Given-When-Then) 完整
- [ ] 涵蓋主要使用場景和邊界情況
- [ ] 錯誤處理場景已考慮

## ✅ DDD (領域驅動設計)  
- [ ] 界限上下文劃分合理
- [ ] 聚合邊界設計恰當
- [ ] 領域事件定義清楚
- [ ] 通用語言一致性維護

## ✅ TDD (測試驅動開發)
- [ ] 遵循紅綠重構循環
- [ ] 單元測試覆蓋核心邏輯
- [ ] 整合測試驗證端到端流程
- [ ] 測試案例涵蓋錯誤情況

## ✅ 技術實作品質
- [ ] 程式碼符合專案風格指南
- [ ] TypeScript 類型定義完整
- [ ] ESLint 檢查通過
- [ ] 建置過程無錯誤或警告

## ✅ 多語言和可訪問性
- [ ] 支援所有 9 種語言翻譯
- [ ] UI 文字無硬編碼
- [ ] 響應式設計適配手機和桌面
- [ ] 鍵盤導航和屏幕閱讀器友好

## ✅ 安全性和效能
- [ ] 輸入驗證和清理
- [ ] 錯誤訊息不洩露敏感資訊  
- [ ] API 回應時間合理
- [ ] 無明顯的安全漏洞

## ✅ 文檔和維護性
- [ ] API 文檔準確且完整
- [ ] 程式碼註解清楚必要處
- [ ] README 或相關文檔已更新
- [ ] CHANGELOG 記錄新功能

## 📊 審查結果
- **總體評分**: ⭐⭐⭐⭐⭐ (1-5星)
- **主要優點**: 
- **改進建議**: 
- **是否批准**: [ ] 通過 [ ] 需要修改

---
> 審查者: ____________  
> 審查時間: ____________
"""
        
        with open(dev_logs_path / "review-checklist.md", "w", encoding="utf-8") as f:
            f.write(review_checklist)
    
    def setup_development_environment(self, flow: str):
        """準備開發環境"""
        print(f"\n{Colors.GREEN}🚀 準備開發環境...{Colors.END}")
        
        # 檢查 Node.js 和 npm
        try:
            subprocess.run(["node", "--version"], check=True, capture_output=True)
            subprocess.run(["npm", "--version"], check=True, capture_output=True)
            print(f"{Colors.GREEN}✅ Node.js 和 npm 環境正常{Colors.END}")
        except:
            print(f"{Colors.RED}❌ 請確認 Node.js 和 npm 已安裝{Colors.END}")
            return
        
        # 檢查 frontend 依賴
        frontend_path = self.project_root / "frontend"
        if not (frontend_path / "node_modules").exists():
            print(f"{Colors.YELLOW}📦 安裝前端依賴...{Colors.END}")
            try:
                subprocess.run(["npm", "install"], cwd=frontend_path, check=True)
                print(f"{Colors.GREEN}✅ 前端依賴安裝完成{Colors.END}")
            except:
                print(f"{Colors.RED}❌ 前端依賴安裝失敗{Colors.END}")
                return
        
        # 如果是功能開發，啟動開發伺服器
        if flow.startswith("feature") or flow.startswith("epic"):
            print(f"{Colors.BLUE}🌐 準備啟動開發伺服器...{Colors.END}")
            print(f"{Colors.YELLOW}請在新終端機執行: make frontend{Colors.END}")
    
    def run(self):
        """執行主要流程"""
        try:
            # 顯示標題
            self.print_header()
            
            # 載入專案狀態
            print(f"{Colors.BLUE}📊 載入專案狀態...{Colors.END}")
            context = self.load_project_context()
            
            # 顯示專案概況
            print(f"{Colors.CYAN}📋 專案概況：{Colors.END}")
            print(f"  當前階段: {context['product']['current_phase']}")
            print(f"  建置狀態: {context['technical']['build_status']}")
            print(f"  最近完成: {context['product']['last_completion']}")
            print()
            
            # 獲取用戶輸入
            user_input = self.get_user_input()
            
            # 分析開發類型
            dev_type, complexity = self.analyze_development_type(user_input)
            print(f"\n{Colors.PURPLE}🧠 AI 分析結果：{Colors.END}")
            print(f"  開發類型: {dev_type}")
            print(f"  複雜程度: {complexity}")
            
            # 選擇開發流程
            flow = self.select_development_flow(dev_type, complexity)
            print(f"  建議流程: {flow}")
            
            # 生成功能名稱
            feature_name = self.generate_feature_name(user_input)
            print(f"  功能代號: {feature_name}")
            
            # 生成 AI 引導文檔
            print(f"\n{Colors.BLUE}📝 生成 AI 引導文檔...{Colors.END}")
            guidance = self.generate_claude_guidance(flow, user_input, context)
            
            # 儲存引導文檔
            output_path = self.current_path / "claude-guidance.md"
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(guidance)
            
            # 建立工作記錄
            work_log_path = self.create_work_log(flow, user_input, feature_name)
            
            # 準備開發環境
            self.setup_development_environment(flow)
            
            # 顯示完成訊息
            print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 開發引導準備完成！{Colors.END}")
            print(f"\n{Colors.CYAN}📁 產生的檔案：{Colors.END}")
            print(f"  📝 AI 引導文檔: {output_path}")
            print(f"  📋 工作記錄: {work_log_path}")
            
            print(f"\n{Colors.YELLOW}🤖 下一步：{Colors.END}")
            print("1. 將 AI 引導文檔內容提供給 Claude Code")
            print("2. 按照 BDD→DDD→TDD 流程進行開發")
            print("3. 在工作記錄中更新進度")
            
        except KeyboardInterrupt:
            print(f"\n{Colors.YELLOW}👋 開發引導已取消{Colors.END}")
        except Exception as e:
            print(f"\n{Colors.RED}❌ 發生錯誤: {e}{Colors.END}")

if __name__ == "__main__":
    ai_dev = AIGuidedDevelopment()
    ai_dev.run()