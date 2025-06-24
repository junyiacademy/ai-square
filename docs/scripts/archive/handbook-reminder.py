#!/usr/bin/env python3
"""
Handbook 提醒器 - 在關鍵時刻提醒開發者查閱相關文檔
"""

import os
from pathlib import Path
from datetime import datetime

class HandbookReminder:
    def __init__(self):
        self.handbook_path = Path("docs/handbook")
        self.reminders = {
            "start": [
                "📚 開始新任務前，請先查閱：",
                "   • business-rules.md - 了解必須遵守的業務規則",
                "   • domain-knowledge.md - 理解 AI 素養相關概念",
                "   • workflow.md - 熟悉三階段開發流程"
            ],
            "develop": [
                "💡 開發提醒：",
                "   • 檢查是否符合 4 大 AI 素養領域",
                "   • 確認支援 9 種語言",
                "   • KSA 映射是否完整"
            ],
            "commit": [
                "📝 提交前檢查：",
                "   • 查看 commit-guide.md 了解提交規範",
                "   • 確認程式碼符合 business-rules.md",
                "   • 測試是否通過"
            ]
        }
    
    def show_reminder(self, phase="start"):
        """顯示特定階段的提醒"""
        if phase in self.reminders:
            print("\n" + "="*50)
            for line in self.reminders[phase]:
                print(line)
            print("="*50 + "\n")
    
    def get_relevant_docs(self, task_type):
        """根據任務類型推薦相關文檔"""
        docs_map = {
            "feature": [
                "01-context/business-rules.md",
                "02-development-guides/guides/frontend-guide.md"
            ],
            "bug": [
                "03-technical-references/core-practices/tdd.md"
            ],
            "refactor": [
                "03-technical-references/design-patterns/"
            ],
            "hotfix": [
                "01-getting-started/quick-reference.md"
            ]
        }
        
        return docs_map.get(task_type, [])
    
    def create_checklist(self, ticket_type):
        """創建檢查清單"""
        checklist = f"""
## 📋 {ticket_type.upper()} 開發檢查清單

### 開始前
- [ ] 閱讀 business-rules.md
- [ ] 理解相關 domain-knowledge
- [ ] 查看類似的實作範例

### 開發中
- [ ] 遵守 4 大 AI 素養領域命名
- [ ] 實作 9 種語言支援
- [ ] 確保 KSA 映射正確

### 提交前
- [ ] 執行測試 (make dev-test)
- [ ] 檢查 lint (make dev-lint)
- [ ] 更新相關文檔

時間：{datetime.now().strftime('%Y-%m-%d %H:%M')}
"""
        return checklist

def main():
    import sys
    
    reminder = HandbookReminder()
    
    # 從命令行參數獲取階段
    phase = sys.argv[1] if len(sys.argv) > 1 else "start"
    task_type = sys.argv[2] if len(sys.argv) > 2 else "feature"
    
    # 顯示提醒
    reminder.show_reminder(phase)
    
    # 如果是開始階段，顯示相關文檔
    if phase == "start":
        docs = reminder.get_relevant_docs(task_type)
        if docs:
            print("📖 建議查閱的文檔：")
            for doc in docs:
                print(f"   • {doc}")
            print()

if __name__ == "__main__":
    main()