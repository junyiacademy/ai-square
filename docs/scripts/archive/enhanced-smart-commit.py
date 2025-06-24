#!/usr/bin/env python3
"""
增強版智能提交系統 - 整合 commit-guide.md 規範
"""

import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime

# 加入 commit guide 解析器
sys.path.append(str(Path(__file__).parent))
try:
    from commit_guide_parser import CommitGuideParser
    from smart_commit import SmartCommit
except ImportError:
    print("❌ 無法載入相依模組")
    sys.exit(1)

class EnhancedSmartCommit(SmartCommit):
    """增強版智能提交，整合 commit guide 規範"""
    
    def __init__(self):
        super().__init__()
        self.parser = CommitGuideParser() if CommitGuideParser else None
        self.handbook_path = self.project_root / "docs" / "handbook"
    
    def show_helpful_links(self, context="general"):
        """根據情境顯示相關的 handbook 連結"""
        links = {
            "general": [
                "📚 提交規範：docs/handbook/02-development-guides/commit-guide.md",
                "🔄 工作流程：docs/handbook/01-getting-started/workflow.md"
            ],
            "failed_checks": [
                "🔧 程式碼規範：docs/handbook/03-technical-references/core-practices/",
                "📝 提交指南：docs/handbook/02-development-guides/commit-guide.md"
            ],
            "ticket_issue": [
                "🎫 票券流程：docs/handbook/workflows/TICKET_DRIVEN_DEVELOPMENT.md",
                "📋 業務規則：docs/handbook/01-context/business-rules.md"
            ],
            "ai_fix": [
                "💡 改進建議：docs/handbook/05-reports/improvements/",
                "🛠️ 技術參考：docs/handbook/03-technical-references/"
            ]
        }
        
        print("\n💡 相關參考文檔：")
        for link in links.get(context, links["general"]):
            print(f"   {link}")
        print()
    
    def run_ai_fix(self) -> bool:
        """執行 AI 自動修復（增強版）"""
        result = super().run_ai_fix()
        
        if not result:
            # 顯示相關文檔連結
            self.show_helpful_links("ai_fix")
            
            # 顯示 commit 格式範例
            if self.parser:
                format_example = self.parser.get_commit_format()
                print("📝 Commit 訊息格式：")
                print(f"```\n{format_example}\n```\n")
        
        return result
    
    def validate_commit_message(self, message: str) -> bool:
        """驗證 commit 訊息是否符合規範"""
        if not self.parser:
            return True
        
        types = self.parser.get_commit_types()
        valid_types = list(types.keys())
        
        # 檢查訊息格式
        import re
        pattern = r'^(' + '|'.join(valid_types) + r')(\(.+?\))?: .+'
        
        if not re.match(pattern, message):
            print(f"\n❌ Commit 訊息不符合規範！")
            print(f"   期望格式：<type>(<scope>): <subject>")
            print(f"   有效類型：{', '.join(valid_types)}")
            self.show_helpful_links("failed_checks")
            return False
        
        return True
    
    def show_workflow_summary(self):
        """顯示完整的工作流程摘要"""
        print("\n📋 智能提交工作流程：")
        print("1️⃣  檢查程式碼品質 (lint, typecheck)")
        print("2️⃣  驗證票券完整性")
        print("3️⃣  生成智能提交訊息")
        print("4️⃣  更新開發日誌")
        print("5️⃣  執行 Git 提交")
        
        if self.parser:
            # 顯示核心原則
            principles = self.parser.get_core_principles()
            if principles:
                print("\n🎯 記住這些原則：")
                for i, principle in enumerate(principles[:3], 1):
                    print(f"{i}. {principle}")
    
    def run(self):
        """執行增強版智能提交流程"""
        self.print_header()
        
        # 顯示工作流程摘要
        self.show_workflow_summary()
        
        # 執行原有流程
        result = super().run()
        
        if not result:
            # 提交失敗時顯示幫助
            print("\n❌ 提交失敗！")
            self.show_helpful_links("failed_checks")
        else:
            print("\n✅ 提交成功！")
            print("💡 記得查看生成的開發日誌")
        
        return result

def main():
    """主函數"""
    commit = EnhancedSmartCommit()
    success = commit.run()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()