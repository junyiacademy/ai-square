#!/usr/bin/env python3
"""
智能提交系統 - 整合完整提交流程與 Branch 策略
"""

import os
import sys
import subprocess
import yaml
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
            [sys.executable, str(self.scripts_path / "ticket-manager-enhanced.py"), "active"],
            capture_output=True,
            text=True
        )
        
        if "No active ticket" in result.stdout:
            print(f"⚠️  Ticket '{self.ticket_name}' 不是 active 狀態")
            print("💡 提示：使用 'make resume-ticket TICKET={self.ticket_name}' 恢復工作")

    def should_complete_ticket(self) -> bool:
        """檢查是否應該完成票券"""
        if not self.ticket_name:
            return False
            
        # 簡單的啟發式檢查：如果用戶想要最終提交
        try:
            response = input(f"\n是否要完成票券 '{self.ticket_name}' 並準備合併？(y/n): ")
            return response.lower() == 'y'
        except (EOFError, KeyboardInterrupt):
            # 非交互式環境，檢查是否有特殊標記
            return False
    
    def prepare_ticket_completion(self) -> bool:
        """準備完成票券 - 移動到 completed 但不設置 commit hash"""
        if not self.ticket_name:
            return True
            
        print(f"📋 準備完成票券: {self.ticket_name}")
        
        # 手動移動票券檔案到 completed
        tickets_dir = self.project_root / "docs" / "tickets"
        in_progress_dir = tickets_dir / "in_progress"
        
        # 尋找票券檔案
        ticket_file = None
        for file_path in in_progress_dir.glob(f"*-ticket-{self.ticket_name}.yml"):
            ticket_file = file_path
            break
        
        if not ticket_file:
            print(f"❌ 找不到票券檔案: {self.ticket_name}")
            return False
        
        # 讀取票券資料
        with open(ticket_file, 'r', encoding='utf-8') as f:
            ticket_data = yaml.safe_load(f)
        
        # 更新完成資訊（除了 commit_hash）
        completed_at = datetime.now()
        ticket_data['status'] = 'completed'
        ticket_data['completed_at'] = completed_at.isoformat()
        
        # 計算持續時間
        started_at = datetime.fromisoformat(ticket_data['started_at'])
        duration = completed_at - started_at
        ticket_data['duration_minutes'] = int(duration.total_seconds() / 60)
        
        # 移動到 completed 資料夾
        date_str = started_at.strftime('%Y-%m-%d')
        completed_date_dir = tickets_dir / "completed" / date_str
        completed_date_dir.mkdir(parents=True, exist_ok=True)
        
        # 移動票券檔案
        new_ticket_file = completed_date_dir / ticket_file.name
        
        # 寫入更新的資料到新位置
        with open(new_ticket_file, 'w', encoding='utf-8') as f:
            yaml.dump(ticket_data, f, allow_unicode=True, sort_keys=False)
        
        # 刪除舊檔案
        ticket_file.unlink()
        
        print("✅ 票券已完成並移動到 completed 目錄")
        
        # 將變更加入到 staging area
        subprocess.run(["git", "add", "-A"], capture_output=True)
        
        return True
    
    def update_ticket_commit_hash(self, commit_hash: str) -> bool:
        """更新票券的 commit hash（在提交後）"""
        if not self.ticket_name:
            return True
            
        # 尋找已完成的票券
        tickets_dir = self.project_root / "docs" / "tickets" / "completed"
        
        ticket_file = None
        for date_dir in tickets_dir.iterdir():
            if date_dir.is_dir():
                for file_path in date_dir.glob(f"*-ticket-{self.ticket_name}.yml"):
                    ticket_file = file_path
                    break
            if ticket_file:
                break
        
        if not ticket_file:
            return True  # 不阻止流程
            
        # 更新 commit hash
        with open(ticket_file, 'r', encoding='utf-8') as f:
            ticket_data = yaml.safe_load(f)
        
        ticket_data['commit_hash'] = commit_hash
        
        with open(ticket_file, 'w', encoding='utf-8') as f:
            yaml.dump(ticket_data, f, allow_unicode=True, sort_keys=False)
        
        return True
    
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
        
        # 5. 檢查是否要完成票券（在提交前）
        ticket_should_complete = self.should_complete_ticket()
        if ticket_should_complete:
            if not self.prepare_ticket_completion():
                return False
        
        # 6. 執行正常的提交流程
        print("\n✅ 所有檢查通過，繼續提交流程...\n")
        if not self.run_commit_guide():
            return False
        
        # 7. 如果完成了票券，更新 commit hash
        if ticket_should_complete:
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                commit_hash = result.stdout.strip()
                self.update_ticket_commit_hash(commit_hash)
        
        # 8. 執行 post-commit 生成
        self.run_post_commit_generation()
        
        # 9. 提供後續操作建議
        print("\n" + "="*50)
        print("✅ 提交完成！")
        
        if self.ticket_name:
            if ticket_should_complete:
                print(f"\n💡 票券已完成，後續操作建議：")
                print(f"   1. 合併到 main: make dev-done TICKET={self.ticket_name}")
                print(f"   2. 或直接執行: git checkout main && git merge {self.current_branch}")
            else:
                print(f"\n💡 後續操作建議：")
                print(f"   1. 如果開發完成：make dev-commit (再次執行並選擇完成票券)")
                print(f"   2. 如果要暫停：make dev-pause")
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