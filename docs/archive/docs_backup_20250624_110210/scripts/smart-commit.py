#!/usr/bin/env python3
"""
智能提交系統 - 整合完整提交流程與 Branch 策略
"""

import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime

class SmartCommit:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.scripts_path = self.project_root / "docs" / "scripts"
        self.current_branch = self._get_current_branch()
        self.ticket_name = self._extract_ticket_from_branch()
        
    def _get_current_branch(self):
        """獲取當前 branch"""
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True,
            text=True
        )
        return result.stdout.strip() if result.returncode == 0 else "unknown"
    
    def _extract_ticket_from_branch(self):
        """從 branch 名稱提取 ticket"""
        if self.current_branch.startswith("ticket/"):
            return self.current_branch.replace("ticket/", "")
        return None
    
    def print_header(self):
        """列印標題"""
        print("\n" + "="*50)
        print("🤖 智能提交系統")
        print(f"📍 Branch: {self.current_branch}")
        if self.ticket_name:
            print(f"🎫 Ticket: {self.ticket_name}")
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
    
    def run_pre_commit_generation(self) -> bool:
        """執行 pre-commit 文檔生成和驗證"""
        print("📝 執行 pre-commit 驗證和文檔生成...")
        
        # 先執行新的驗證器
        validator_script = self.scripts_path / "pre-commit-validator.py"
        if validator_script.exists():
            print("🔍 執行票券完整性驗證...")
            result = subprocess.run(
                [sys.executable, str(validator_script)],
                capture_output=False  # 直接顯示輸出
            )
            if result.returncode != 0:
                print("❌ 票券完整性驗證失敗")
                return False
        
        # 再執行原有的文檔生成
        pre_commit_script = self.scripts_path / "pre-commit-doc-gen.py"
        result = subprocess.run(
            [sys.executable, str(pre_commit_script)],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            print("❌ Pre-commit 生成失敗")
            print(result.stderr)
            return False
            
        # 加入生成的檔案
        subprocess.run(["git", "add", "-A"], capture_output=True)
        return True
    
    def validate_ticket_documentation(self) -> bool:
        """驗證票券文件完整性"""
        validator_script = self.scripts_path / "commit-doc-validator.py"
        
        if not validator_script.exists():
            print("⚠️ 票券文件驗證器不存在，跳過驗證")
            return True
        
        print("\n📋 執行票券文件完整性檢查...")
        
        try:
            result = subprocess.run(
                [sys.executable, str(validator_script)],
                capture_output=True,
                text=True
            )
            
            if result.stdout:
                print(result.stdout)
            
            if result.returncode != 0:
                if result.stderr:
                    print(f"❌ 驗證錯誤: {result.stderr}")
                return False
            
            return True
            
        except Exception as e:
            print(f"⚠️ 票券驗證過程發生錯誤: {e}")
            return True  # 不阻止提交
    
    def run_post_commit_generation(self) -> bool:
        """執行 post-commit 文檔生成"""
        print("\n📝 執行 post-commit 文檔生成...")
        post_commit_script = self.scripts_path / "post-commit-doc-gen.py"
        result = subprocess.run(
            [sys.executable, str(post_commit_script)],
            capture_output=False  # 讓輸出直接顯示
        )
        return result.returncode == 0
    
    def check_ticket_status(self):
        """檢查 ticket 狀態"""
        if not self.ticket_name:
            return
            
        print(f"🎫 檢查 ticket 狀態: {self.ticket_name}")
        result = subprocess.run(
            [sys.executable, str(self.scripts_path / "ticket-manager.py"), "active"],
            capture_output=True,
            text=True
        )
        
        if "No active ticket" in result.stdout:
            print(f"⚠️  Ticket '{self.ticket_name}' 不是 active 狀態")
            print("💡 提示：使用 'make resume-ticket TICKET={self.ticket_name}' 恢復工作")
    
    def run(self):
        """執行智能提交流程"""
        self.print_header()
        
        # 1. 檢查 ticket 狀態（如果在 ticket branch）
        self.check_ticket_status()
        
        # 2. 先執行 AI 修復檢查
        if not self.run_ai_fix():
            print("\n⚠️  請先修復錯誤再提交")
            return False
        
        # 3. 執行 pre-commit 生成
        if not self.run_pre_commit_generation():
            return False
        
        # 4. 執行票券文件驗證
        if not self.validate_ticket_documentation():
            return False
        
        # 5. 執行正常的提交流程
        print("\n✅ 所有檢查通過，繼續提交流程...\n")
        if not self.run_commit_guide():
            return False
        
        # 6. 執行 post-commit 生成
        self.run_post_commit_generation()
        
        # 7. 提供後續操作建議
        print("\n" + "="*50)
        print("✅ 提交完成！")
        
        if self.ticket_name:
            print(f"\n💡 後續操作建議：")
            print(f"   1. 如果開發完成：make merge-ticket TICKET={self.ticket_name}")
            print(f"   2. 如果要暫停：make pause-ticket")
            print(f"   3. 繼續開發：繼續修改程式碼")
        elif self.current_branch == "main":
            print("\n⚠️  您在 main branch 上直接提交")
            print("💡 建議：下次使用 'make dev-ticket TICKET=xxx' 開始新功能開發")
        
        print("=" * 50)
        return True

if __name__ == "__main__":
    smart_commit = SmartCommit()
    success = smart_commit.run()
    sys.exit(0 if success else 1)