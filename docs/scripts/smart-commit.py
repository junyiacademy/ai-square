#!/usr/bin/env python3
"""
智能提交系統 - 整合 AI 自動修復
"""

import os
import sys
import subprocess
from pathlib import Path

class SmartCommit:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.scripts_path = self.project_root / "docs" / "scripts"
        
    def print_header(self):
        """列印標題"""
        print("\n" + "="*50)
        print("🤖 智能提交系統 (含 AI 自動修復)")
        print("="*50 + "\n")
    
    def run_ai_fix(self) -> bool:
        """執行 AI 自動修復"""
        print("🔧 執行 AI 自動修復檢查...")
        
        ai_fix_script = self.scripts_path / "ai-fix.py"
        result = subprocess.run(
            [sys.executable, str(ai_fix_script)],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            return True
        
        print(result.stdout)
        print("\n❌ 發現錯誤需要修復")
        
        # 詢問是否要查看 AI 修復建議
        try:
            response = input("\n是否要 AI 幫助修復這些錯誤？(y/n): ")
            if response.lower() == 'y':
                self.show_ai_fix_suggestions()
                return False
        except (EOFError, KeyboardInterrupt):
            # 非交互式環境，自動顯示建議
            print("\n⚠️ 非交互式環境，自動顯示 AI 修復建議")
            self.show_ai_fix_suggestions()
        
        return False
    
    def show_ai_fix_suggestions(self):
        """顯示 AI 修復建議"""
        instruction_file = self.project_root / "docs" / "handbook" / "improvements" / "auto-fix-instructions.md"
        
        if instruction_file.exists():
            print("\n📋 AI 修復建議：")
            print("-" * 40)
            with open(instruction_file, 'r', encoding='utf-8') as f:
                content = f.read()
                # 只顯示前 1000 字元
                print(content[:1000])
                if len(content) > 1000:
                    print("\n... (更多內容請查看完整檔案)")
            print("-" * 40)
            
            print("\n💡 建議的下一步：")
            print("1. 將上述錯誤訊息複製給 AI")
            print("2. 請 AI 生成具體的修復代碼")
            print("3. 應用修復後重新執行 make commit-smart")
    
    def run_commit_guide(self) -> bool:
        """執行原有的提交指南"""
        commit_guide_script = self.scripts_path / "commit-guide.py"
        result = subprocess.run(
            [sys.executable, str(commit_guide_script)],
            capture_output=False  # 讓輸出直接顯示
        )
        
        return result.returncode == 0
    
    def run(self):
        """執行智能提交流程"""
        self.print_header()
        
        # 1. 先執行 AI 修復檢查
        if not self.run_ai_fix():
            print("\n⚠️  請先修復錯誤再提交")
            return False
        
        # 2. 執行正常的提交流程
        print("\n✅ 所有檢查通過，繼續提交流程...\n")
        return self.run_commit_guide()

if __name__ == "__main__":
    smart_commit = SmartCommit()
    success = smart_commit.run()
    sys.exit(0 if success else 1)