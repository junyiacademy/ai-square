#!/usr/bin/env python3
"""
工作流程護衛 (Workflow Guard)

系統化檢查和強制執行開發工作流程規則：
1. 禁止自動提交 - 需要用戶確認
2. 強制分支檢查 - 確保在正確的票券分支
3. 票券狀態驗證 - 確保有活躍票券
4. 工作流程強制 - 遵循 CLAUDE.md 步驟
"""

import os
import sys
import subprocess
import json
import yaml
from pathlib import Path
from datetime import datetime

class WorkflowGuard:
    def __init__(self, project_root=None):
        self.project_root = Path(project_root or os.getcwd())
        self.violations = []
        self.warnings = []

    def check_all(self, action_type="commit"):
        """執行所有工作流程檢查"""
        print("🛡️ 工作流程護衛啟動...")
        
        # 基本檢查
        self.check_git_branch()
        self.check_active_ticket()
        self.check_branch_ticket_match()
        
        # 行動特定檢查
        if action_type == "commit":
            self.check_commit_prerequisites()
        elif action_type == "start":
            self.check_start_prerequisites()
        
        # 輸出結果
        return self.report_results()

    def check_git_branch(self):
        """檢查 Git 分支狀態"""
        try:
            # 檢查當前分支
            result = subprocess.run(
                ["git", "branch", "--show-current"],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            
            current_branch = result.stdout.strip()
            
            if current_branch == "main":
                self.violations.append({
                    "rule": "NO_DIRECT_MAIN_WORK",
                    "message": "🚨 禁止在 main 分支上直接開發",
                    "suggestion": "請切換到票券分支或創建新票券",
                    "severity": "error"
                })
            
            elif not current_branch.startswith("ticket/"):
                self.violations.append({
                    "rule": "INVALID_BRANCH_NAME",
                    "message": f"🚨 分支名稱不符合規範: {current_branch}",
                    "suggestion": "分支名稱必須以 'ticket/' 開頭",
                    "severity": "error"
                })
            
            self.current_branch = current_branch
            
        except Exception as e:
            self.violations.append({
                "rule": "GIT_CHECK_FAILED",
                "message": f"❌ 無法檢查 Git 狀態: {str(e)}",
                "severity": "error"
            })

    def check_active_ticket(self):
        """檢查是否有活躍的票券"""
        try:
            # 查找活躍票券
            tickets_dir = self.project_root / "docs" / "tickets" / "in_progress"
            
            if not tickets_dir.exists():
                self.violations.append({
                    "rule": "NO_TICKETS_DIR",
                    "message": "❌ 找不到票券目錄",
                    "severity": "error"
                })
                return
            
            active_tickets = []
            for ticket_file in tickets_dir.glob("*.yml"):
                try:
                    with open(ticket_file, 'r', encoding='utf-8') as f:
                        ticket_data = yaml.safe_load(f)
                        if ticket_data and ticket_data.get('status') == 'in_progress':
                            active_tickets.append({
                                'file': ticket_file.name,
                                'name': ticket_data.get('name'),
                                'type': ticket_data.get('type'),
                                'branch': f"ticket/{ticket_data.get('name')}"
                            })
                except Exception:
                    continue
            
            if not active_tickets:
                self.violations.append({
                    "rule": "NO_ACTIVE_TICKET",
                    "message": "🚨 沒有活躍的票券",
                    "suggestion": "請先使用 'make dev-start' 創建票券",
                    "severity": "error"
                })
            elif len(active_tickets) > 1:
                self.warnings.append({
                    "rule": "MULTIPLE_ACTIVE_TICKETS",
                    "message": f"⚠️ 發現 {len(active_tickets)} 個活躍票券",
                    "suggestion": "建議一次只處理一個票券",
                    "severity": "warning"
                })
            
            self.active_tickets = active_tickets
            
        except Exception as e:
            self.violations.append({
                "rule": "TICKET_CHECK_FAILED",
                "message": f"❌ 無法檢查票券狀態: {str(e)}",
                "severity": "error"
            })

    def check_branch_ticket_match(self):
        """檢查分支名稱與票券是否匹配"""
        if not hasattr(self, 'current_branch') or not hasattr(self, 'active_tickets'):
            return
        
        if self.current_branch == "main":
            return  # 已經在 check_git_branch 中處理
        
        # 從分支名稱提取票券名稱
        if self.current_branch.startswith("ticket/"):
            branch_ticket_name = self.current_branch[7:]  # 移除 "ticket/" 前綴
            
            # 檢查是否有對應的活躍票券
            matching_tickets = [
                t for t in self.active_tickets 
                if t['name'] == branch_ticket_name
            ]
            
            if not matching_tickets:
                self.violations.append({
                    "rule": "BRANCH_TICKET_MISMATCH",
                    "message": f"🚨 分支 '{self.current_branch}' 沒有對應的活躍票券",
                    "suggestion": f"請使用 'make dev-resume TICKET={branch_ticket_name}' 恢復票券",
                    "severity": "error"
                })

    def check_commit_prerequisites(self):
        """檢查提交前的必要條件"""
        try:
            # 檢查是否有未暫存的變更
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            
            if not result.stdout.strip():
                self.warnings.append({
                    "rule": "NO_CHANGES_TO_COMMIT",
                    "message": "⚠️ 沒有變更可提交",
                    "severity": "warning"
                })
            
            # 檢查是否在正確的分支上
            if hasattr(self, 'current_branch') and self.current_branch == "main":
                self.violations.append({
                    "rule": "COMMIT_ON_MAIN",
                    "message": "🚨 禁止直接提交到 main 分支",
                    "suggestion": "請切換到票券分支後再提交",
                    "severity": "error"
                })
            
        except Exception as e:
            self.warnings.append({
                "rule": "COMMIT_CHECK_FAILED",
                "message": f"⚠️ 無法檢查提交條件: {str(e)}",
                "severity": "warning"
            })

    def check_start_prerequisites(self):
        """檢查開始新工作的必要條件"""
        # 檢查是否有未提交的變更
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            
            if result.stdout.strip():
                self.warnings.append({
                    "rule": "UNCOMMITTED_CHANGES",
                    "message": "⚠️ 有未提交的變更",
                    "suggestion": "建議先提交或暫存當前變更",
                    "severity": "warning"
                })
                
        except Exception as e:
            self.warnings.append({
                "rule": "START_CHECK_FAILED",
                "message": f"⚠️ 無法檢查開始條件: {str(e)}",
                "severity": "warning"
            })

    def report_results(self):
        """報告檢查結果"""
        print("\n" + "="*60)
        print("🛡️ 工作流程護衛檢查結果")
        print("="*60)
        
        # 顯示錯誤
        if self.violations:
            print(f"\n🚨 發現 {len(self.violations)} 個違規問題:")
            for violation in self.violations:
                print(f"  ❌ {violation['message']}")
                if 'suggestion' in violation:
                    print(f"     💡 建議: {violation['suggestion']}")
        
        # 顯示警告
        if self.warnings:
            print(f"\n⚠️ 發現 {len(self.warnings)} 個警告:")
            for warning in self.warnings:
                print(f"  ⚠️ {warning['message']}")
                if 'suggestion' in warning:
                    print(f"     💡 建議: {warning['suggestion']}")
        
        # 總結
        if not self.violations and not self.warnings:
            print("\n✅ 所有檢查通過！可以繼續操作。")
            success = True
        elif not self.violations:
            print("\n⚠️ 有警告但可以繼續操作。")
            success = True
        else:
            print(f"\n❌ 發現 {len(self.violations)} 個違規問題，無法繼續操作。")
            print("請修復上述問題後重試。")
            success = False
        
        print("="*60)
        return success

    def enforce_interactive_mode(self, action_name="操作"):
        """強制互動模式 - 需要用戶確認"""
        if not sys.stdin.isatty():
            print(f"🚨 錯誤: {action_name}需要互動確認")
            print("💡 請在終端中直接運行此命令，不要使用自動化腳本")
            return False
        
        print(f"\n⚠️ 即將執行: {action_name}")
        print("📋 請確認以下信息正確:")
        
        if hasattr(self, 'current_branch'):
            print(f"  🌿 當前分支: {self.current_branch}")
        
        if hasattr(self, 'active_tickets') and self.active_tickets:
            print("  🎫 活躍票券:")
            for ticket in self.active_tickets:
                print(f"    - {ticket['name']} ({ticket['type']})")
        
        while True:
            response = input(f"\n確定要繼續執行 {action_name} 嗎？(y/N): ").strip().lower()
            if response in ['y', 'yes']:
                print("✅ 用戶確認，繼續執行...")
                return True
            elif response in ['n', 'no', '']:
                print("❌ 用戶取消操作")
                return False
            else:
                print("請輸入 y (是) 或 n (否)")

def main():
    """主函數"""
    import argparse
    
    parser = argparse.ArgumentParser(description="工作流程護衛")
    parser.add_argument("action", choices=["commit", "start", "check"], help="要檢查的行動類型")
    parser.add_argument("--project-root", help="項目根目錄路徑")
    parser.add_argument("--force", action="store_true", help="跳過互動確認（不建議）")
    parser.add_argument("--no-interactive", action="store_true", help="非互動模式（僅檢查）")
    
    args = parser.parse_args()
    
    guard = WorkflowGuard(args.project_root)
    
    # 執行檢查
    success = guard.check_all(args.action)
    
    if not success:
        print("\n🛡️ 工作流程護衛阻止了不安全的操作")
        sys.exit(1)
    
    # 如果是提交或開始新工作，需要用戶確認
    if args.action in ["commit", "start"] and not args.no_interactive:
        if not args.force and not guard.enforce_interactive_mode(args.action):
            sys.exit(1)
    
    print(f"\n🛡️ 工作流程護衛檢查完成，允許執行 {args.action}")
    sys.exit(0)

if __name__ == "__main__":
    main()