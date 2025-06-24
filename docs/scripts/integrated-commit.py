#!/usr/bin/env python3
"""
整合式提交系統 - 適用於新的單一票券系統
簡化版本，專注於智能提交訊息生成
"""

import os
import sys
import subprocess
import yaml
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Tuple

class IntegratedCommit:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.tickets_dir = self.project_root / "docs" / "tickets"
        self.current_branch = self._get_current_branch()
        
    def _get_current_branch(self) -> str:
        """獲取當前 branch"""
        result = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True,
            text=True
        )
        return result.stdout.strip() if result.returncode == 0 else "unknown"
    
    def _get_active_ticket(self) -> Optional[Path]:
        """獲取當前活躍的票券"""
        active_dir = self.tickets_dir / "active"
        if not active_dir.exists():
            return None
        
        tickets = list(active_dir.glob("*.yml"))
        if tickets:
            # 返回最新修改的票券
            return max(tickets, key=lambda p: p.stat().st_mtime)
        return None
    
    def _load_ticket(self, ticket_path: Path) -> Dict:
        """載入票券資料"""
        with open(ticket_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    def _get_changed_files_summary(self) -> Tuple[int, str]:
        """獲取變更檔案摘要"""
        # 獲取 staged 的檔案
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only"],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            return 0, ""
        
        files = result.stdout.strip().split('\n') if result.stdout.strip() else []
        file_count = len(files)
        
        # 分類檔案類型
        file_types = {}
        for file in files:
            if file:
                ext = Path(file).suffix or Path(file).name
                file_types[ext] = file_types.get(ext, 0) + 1
        
        # 建立摘要
        summary_parts = []
        for ext, count in sorted(file_types.items(), key=lambda x: x[1], reverse=True)[:3]:
            summary_parts.append(f"{count} {ext}")
        
        summary = ", ".join(summary_parts)
        if len(file_types) > 3:
            summary += f" and {len(file_types) - 3} more types"
        
        return file_count, summary
    
    def _generate_commit_message(self, ticket_data: Dict) -> str:
        """根據票券資料生成提交訊息"""
        ticket_type = ticket_data.get('type', 'feature')
        ticket_name = ticket_data.get('name', 'unknown')
        description = ticket_data.get('description', '')
        
        # 獲取開發活動摘要
        dev_log = ticket_data.get('dev_log', {})
        sessions = dev_log.get('sessions', [])
        key_activities = []
        
        # 收集所有活動
        for session in sessions:
            for activity in session.get('activities', []):
                if isinstance(activity, dict):
                    action = activity.get('action', '')
                    if action and not action.startswith('開始'):
                        key_activities.append(action)
        
        # 獲取變更檔案統計
        file_count, file_summary = self._get_changed_files_summary()
        
        # 根據票券類型決定前綴
        type_prefixes = {
            'feature': 'feat',
            'fix': 'fix',
            'bug': 'fix',
            'refactor': 'refactor',
            'docs': 'docs',
            'test': 'test',
            'chore': 'chore'
        }
        prefix = type_prefixes.get(ticket_type, 'feat')
        
        # 生成主要訊息
        if description:
            main_message = f"{prefix}: {description}"
        else:
            main_message = f"{prefix}: {ticket_name.replace('-', ' ')}"
        
        # 建立詳細訊息
        body_parts = []
        
        # 加入票券資訊
        body_parts.append(f"Ticket: {ticket_name}")
        
        # 加入檔案變更統計
        if file_count > 0:
            body_parts.append(f"Changed: {file_count} files ({file_summary})")
        
        # 加入主要活動（最多3個）
        if key_activities:
            body_parts.append("\nKey changes:")
            for activity in key_activities[-3:]:
                body_parts.append(f"- {activity}")
        
        # 組合完整訊息
        full_message = main_message
        if body_parts:
            full_message += "\n\n" + "\n".join(body_parts)
        
        return full_message
    
    def _check_staged_files(self) -> bool:
        """檢查是否有 staged 的檔案"""
        result = subprocess.run(
            ["git", "diff", "--cached", "--quiet"],
            capture_output=True
        )
        # 如果有 staged 檔案，返回碼會是 1
        return result.returncode != 0
    
    def run(self, auto_mode=False):
        """執行智能提交流程
        
        Args:
            auto_mode: 是否自動模式（不等待用戶輸入）
        """
        print("\n" + "="*50)
        print("🤖 整合式智能提交系統")
        print(f"📍 Branch: {self.current_branch}")
        print("="*50 + "\n")
        
        # 檢查是否有 staged 的檔案
        if not self._check_staged_files():
            print("❌ 沒有發現任何 staged 的檔案")
            print("💡 提示: 使用 'git add' 來 stage 您的變更")
            return False
        
        # 獲取活躍票券
        ticket_path = self._get_active_ticket()
        if not ticket_path:
            print("⚠️  沒有找到活躍的票券")
            # 提供預設提交訊息
            default_message = "chore: update files"
            print(f"💡 將使用預設訊息: {default_message}")
            
            if not auto_mode:
                try:
                    response = input("\n是否繼續提交？(y/n): ")
                    if response.lower() != 'y':
                        print("❌ 取消提交")
                        return False
                except (EOFError, KeyboardInterrupt):
                    print("\n❌ 取消提交")
                    return False
            else:
                print("🤖 自動模式：使用預設訊息提交")
            
            # 執行提交
            result = subprocess.run(
                ["git", "commit", "-m", default_message],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print("\n✅ 提交成功！")
                return True
            else:
                print(f"\n❌ 提交失敗: {result.stderr}")
                return False
        
        # 載入票券資料
        ticket_data = self._load_ticket(ticket_path)
        ticket_name = ticket_data.get('name', 'unknown')
        
        print(f"🎫 找到活躍票券: {ticket_name}")
        
        # 生成提交訊息
        commit_message = self._generate_commit_message(ticket_data)
        
        print("\n📝 生成的提交訊息:")
        print("-" * 40)
        print(commit_message)
        print("-" * 40)
        
        # 詢問是否使用此訊息
        if not auto_mode:
            try:
                print("\n選項:")
                print("1. 使用此訊息提交")
                print("2. 編輯訊息")
                print("3. 取消提交")
                
                choice = input("\n請選擇 (1/2/3): ")
                
                if choice == '3':
                    print("❌ 取消提交")
                    return False
                
                if choice == '2':
                    # 使用 git commit 互動模式
                    with open('/tmp/commit_msg.txt', 'w') as f:
                        f.write(commit_message)
                    
                    result = subprocess.run(
                        ["git", "commit", "-e", "-F", "/tmp/commit_msg.txt"],
                        capture_output=False
                    )
                else:
                    # 直接提交
                    result = subprocess.run(
                        ["git", "commit", "-m", commit_message],
                        capture_output=True,
                        text=True
                    )
            except (EOFError, KeyboardInterrupt):
                print("\n❌ 取消提交")
                return False
        else:
            # 自動模式：直接提交
            print("\n🤖 自動模式：使用生成的訊息提交")
            result = subprocess.run(
                ["git", "commit", "-m", commit_message],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print("\n✅ 提交成功！")
                
                # 獲取 commit hash
                hash_result = subprocess.run(
                    ["git", "rev-parse", "HEAD"],
                    capture_output=True,
                    text=True
                )
                
                if hash_result.returncode == 0:
                    commit_hash = hash_result.stdout.strip()[:8]
                    print(f"📍 Commit: {commit_hash}")
                    
                    # 更新票券的 commit hash
                    ticket_data['commit_hash'] = commit_hash
                    with open(ticket_path, 'w', encoding='utf-8') as f:
                        yaml.dump(ticket_data, f, default_flow_style=False, allow_unicode=True)
                
                # 顯示後續建議
                print("\n💡 後續操作建議:")
                if ticket_name and self.current_branch.startswith("ticket/"):
                    print(f"   1. 完成票券: make ai-done")
                    print(f"   2. 繼續開發: make ai-save")
                else:
                    print(f"   1. 推送變更: git push")
                
                return True
            else:
                print(f"\n❌ 提交失敗")
                if hasattr(result, 'stderr') and result.stderr:
                    print(f"錯誤: {result.stderr}")
                return False
                
        except (EOFError, KeyboardInterrupt):
            print("\n❌ 取消提交")
            return False


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='整合式智能提交系統')
    parser.add_argument('--auto', action='store_true', 
                       help='自動模式（不等待用戶輸入）')
    
    args = parser.parse_args()
    
    commit = IntegratedCommit()
    success = commit.run(auto_mode=args.auto)
    sys.exit(0 if success else 1)