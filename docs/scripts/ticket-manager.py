#!/usr/bin/env python3
"""
Ticket 管理系統
創建和管理開發 tickets，作為時間追蹤的錨點
"""

import json
import sys
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

class TicketManager:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.tickets_dir = self.project_root / "docs" / "tickets"
        self.tickets_dir.mkdir(parents=True, exist_ok=True)
        
    def create_ticket(self, ticket_name: str, description: str = "", create_branch: bool = True) -> Dict:
        """創建新的 ticket"""
        timestamp = datetime.now()
        date_str = timestamp.strftime('%Y-%m-%d')
        
        # 創建日期資料夾
        date_dir = self.tickets_dir / date_str
        date_dir.mkdir(exist_ok=True)
        
        # Ticket 資料
        ticket_data = {
            'id': f"{date_str}-{ticket_name}",
            'name': ticket_name,
            'description': description,
            'status': 'in_progress',
            'created_at': timestamp.isoformat(),
            'started_at': timestamp.isoformat(),
            'completed_at': None,
            'duration_minutes': None,
            'ai_time_minutes': None,
            'human_time_minutes': None,
            'commit_hash': None,
            'files_changed': []
        }
        
        # 儲存 ticket
        ticket_file = date_dir / f"{ticket_name}.json"
        with open(ticket_file, 'w', encoding='utf-8') as f:
            json.dump(ticket_data, f, indent=2, ensure_ascii=False)
        
        print(f"📝 Ticket 已創建: {ticket_file}")
        print(f"🕐 開始時間: {timestamp.strftime('%H:%M:%S')}")
        
        # 創建對應的 branch
        if create_branch:
            branch_name = f"ticket/{ticket_name}"
            try:
                # 確保在最新的 main
                subprocess.run(["git", "checkout", "main"], check=True, capture_output=True)
                subprocess.run(["git", "pull", "--rebase"], capture_output=True)
                
                # 創建並切換到新 branch
                result = subprocess.run(
                    ["git", "checkout", "-b", branch_name],
                    capture_output=True,
                    text=True
                )
                
                if result.returncode == 0:
                    print(f"🌿 已創建並切換到 branch: {branch_name}")
                    ticket_data['branch'] = branch_name
                else:
                    print(f"⚠️  無法創建 branch: {result.stderr}")
                    
            except Exception as e:
                print(f"⚠️  Branch 操作失敗: {e}")
        
        return ticket_data
    
    def complete_ticket(self, ticket_name: str, commit_hash: str) -> Optional[Dict]:
        """完成 ticket"""
        # 尋找今天的 ticket
        date_str = datetime.now().strftime('%Y-%m-%d')
        ticket_file = self.tickets_dir / date_str / f"{ticket_name}.json"
        
        if not ticket_file.exists():
            # 嘗試找其他日期的
            for date_dir in sorted(self.tickets_dir.iterdir(), reverse=True):
                if date_dir.is_dir():
                    possible_file = date_dir / f"{ticket_name}.json"
                    if possible_file.exists():
                        ticket_file = possible_file
                        break
        
        if not ticket_file.exists():
            print(f"❌ 找不到 ticket: {ticket_name}")
            return None
        
        # 讀取並更新 ticket
        with open(ticket_file, 'r', encoding='utf-8') as f:
            ticket_data = json.load(f)
        
        completed_at = datetime.now()
        started_at = datetime.fromisoformat(ticket_data['started_at'])
        duration = (completed_at - started_at).total_seconds() / 60
        
        ticket_data['completed_at'] = completed_at.isoformat()
        ticket_data['duration_minutes'] = round(duration, 1)
        ticket_data['ai_time_minutes'] = round(duration * 0.8, 1)  # 預設 80%
        ticket_data['human_time_minutes'] = round(duration * 0.2, 1)  # 預設 20%
        ticket_data['commit_hash'] = commit_hash
        ticket_data['status'] = 'completed'
        
        # 儲存更新
        with open(ticket_file, 'w', encoding='utf-8') as f:
            json.dump(ticket_data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Ticket 已完成: {ticket_name}")
        print(f"⏱️  總時間: {ticket_data['duration_minutes']} 分鐘")
        
        return ticket_data
    
    def pause_ticket(self, ticket_name: str = None) -> bool:
        """暫停 ticket"""
        if not ticket_name:
            # 找當前 active ticket
            active = self.get_active_ticket()
            if not active:
                print("❌ 沒有進行中的 ticket")
                return False
            ticket_name = active['name']
        
        # 更新狀態為 paused
        for date_dir in sorted(self.tickets_dir.iterdir(), reverse=True):
            if date_dir.is_dir():
                ticket_file = date_dir / f"{ticket_name}.json"
                if ticket_file.exists():
                    with open(ticket_file, 'r', encoding='utf-8') as f:
                        ticket_data = json.load(f)
                    
                    # 保存當前 branch 和狀態
                    current_branch = self._get_current_branch()
                    modified_files = self._get_modified_files()
                    
                    # 保存 WIP
                    wip_info = self._save_wip(ticket_name)
                    
                    ticket_data['status'] = 'paused'
                    ticket_data['paused_at'] = datetime.now().isoformat()
                    ticket_data['paused_context'] = {
                        'branch': current_branch,
                        'modified_files': modified_files,
                        'last_action': datetime.now().isoformat(),
                        'wip_info': wip_info
                    }
                    
                    with open(ticket_file, 'w', encoding='utf-8') as f:
                        json.dump(ticket_data, f, indent=2, ensure_ascii=False)
                    
                    print(f"⏸️  Ticket 已暫停: {ticket_name}")
                    print(f"📝 已保存 {len(modified_files)} 個修改的檔案狀態")
                    return True
        
        print(f"❌ 找不到 ticket: {ticket_name}")
        return False
    
    def resume_ticket(self, ticket_name: str) -> bool:
        """恢復 ticket"""
        for date_dir in sorted(self.tickets_dir.iterdir(), reverse=True):
            if date_dir.is_dir():
                ticket_file = date_dir / f"{ticket_name}.json"
                if ticket_file.exists():
                    with open(ticket_file, 'r', encoding='utf-8') as f:
                        ticket_data = json.load(f)
                    
                    if ticket_data['status'] != 'paused':
                        print(f"⚠️  Ticket {ticket_name} 不是暫停狀態")
                        return False
                    
                    # 先暫停其他 active ticket
                    current_active = self.get_active_ticket()
                    if current_active and current_active['name'] != ticket_name:
                        self.pause_ticket(current_active['name'])
                    
                    # 切換到 ticket branch
                    if 'branch' in ticket_data:
                        try:
                            subprocess.run(
                                ['git', 'checkout', ticket_data['branch']], 
                                check=True, 
                                capture_output=True
                            )
                            print(f"🌿 已切換到 branch: {ticket_data['branch']}")
                        except:
                            print(f"⚠️  無法切換到 branch: {ticket_data['branch']}")
                    
                    # 更新狀態
                    ticket_data['status'] = 'in_progress'
                    ticket_data['resumed_at'] = datetime.now().isoformat()
                    
                    # 計算暫停時間
                    if 'paused_at' in ticket_data:
                        paused_time = datetime.now() - datetime.fromisoformat(ticket_data['paused_at'])
                        print(f"⏰ 暫停了 {int(paused_time.total_seconds() / 60)} 分鐘")
                    
                    with open(ticket_file, 'w', encoding='utf-8') as f:
                        json.dump(ticket_data, f, indent=2, ensure_ascii=False)
                    
                    print(f"▶️  已恢復 ticket: {ticket_name}")
                    
                    # 恢復 WIP
                    if 'paused_context' in ticket_data and 'wip_info' in ticket_data['paused_context']:
                        wip_info = ticket_data['paused_context']['wip_info']
                        if wip_info:
                            self._restore_wip(wip_info)
                            print(f"♻️  已恢復之前保存的變更 ({wip_info['files_count']} 個檔案)")
                    
                    # 顯示上次進度提示
                    if 'paused_context' in ticket_data and 'modified_files' in ticket_data['paused_context']:
                        files = ticket_data['paused_context']['modified_files']
                        if files:
                            print(f"📝 上次修改的檔案：")
                            for f in files[:5]:  # 只顯示前5個
                                print(f"   - {f}")
                            if len(files) > 5:
                                print(f"   ... 還有 {len(files)-5} 個檔案")
                    
                    return True
        
        print(f"❌ 找不到 ticket: {ticket_name}")
        return False
    
    def _get_current_branch(self) -> str:
        """獲取當前 git branch"""
        try:
            result = subprocess.run(
                ['git', 'branch', '--show-current'],
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout.strip()
        except:
            return "unknown"
    
    def _save_wip(self, ticket_name: str) -> Optional[Dict]:
        """保存 work in progress"""
        try:
            # 檢查是否有未提交的變更
            status = subprocess.run(
                ['git', 'status', '--porcelain'],
                capture_output=True,
                text=True
            )
            
            if not status.stdout.strip():
                return None
            
            # 統計變更
            changes = status.stdout.strip().split('\n')
            change_count = len(changes)
            
            print(f"💾 偵測到 {change_count} 個檔案變更")
            
            # 決定保存策略
            if change_count <= 5:
                # 少量變更：使用 stash
                subprocess.run(['git', 'add', '-A'], capture_output=True)
                result = subprocess.run(
                    ['git', 'stash', 'push', '-m', f'WIP: {ticket_name}'],
                    capture_output=True,
                    text=True
                )
                
                if result.returncode == 0:
                    # 獲取 stash 編號
                    stash_list = subprocess.run(
                        ['git', 'stash', 'list'],
                        capture_output=True,
                        text=True
                    )
                    if stash_list.stdout:
                        stash_id = stash_list.stdout.split('\n')[0].split(':')[0]
                        print(f"📦 使用 git stash 保存變更 ({stash_id})")
                        
                        return {
                            'method': 'stash',
                            'stash_id': stash_id,
                            'files_count': change_count,
                            'timestamp': datetime.now().isoformat()
                        }
            else:
                # 大量變更：創建 WIP commit
                subprocess.run(['git', 'add', '-A'], capture_output=True)
                commit_result = subprocess.run([
                    'git', 'commit', '-m', 
                    f'WIP: {ticket_name} (paused at {datetime.now().strftime("%H:%M")})'
                ], capture_output=True, text=True)
                
                if commit_result.returncode == 0:
                    # 獲取 commit hash
                    commit_hash = subprocess.run(
                        ['git', 'rev-parse', 'HEAD'],
                        capture_output=True,
                        text=True
                    ).stdout.strip()[:7]
                    
                    print(f"💾 創建 WIP commit 保存變更 ({commit_hash})")
                    
                    return {
                        'method': 'commit',
                        'commit_hash': commit_hash,
                        'files_count': change_count,
                        'timestamp': datetime.now().isoformat()
                    }
            
            return None
            
        except Exception as e:
            print(f"⚠️  保存 WIP 失敗: {e}")
            return None
    
    def _restore_wip(self, wip_info: Dict) -> bool:
        """恢復 work in progress"""
        try:
            if wip_info['method'] == 'stash':
                # 恢復 stash
                result = subprocess.run(
                    ['git', 'stash', 'pop', wip_info['stash_id']],
                    capture_output=True,
                    text=True
                )
                
                if result.returncode == 0:
                    return True
                elif 'conflict' in result.stderr.lower():
                    print("⚠️  恢復變更時發生衝突，請手動解決")
                    return False
                else:
                    print(f"⚠️  無法恢復 stash: {result.stderr}")
                    return False
                    
            elif wip_info['method'] == 'commit':
                # WIP commit 已經在 branch 上，不需要特別處理
                print(f"ℹ️  WIP commit {wip_info['commit_hash']} 已在當前 branch")
                print("💡 完成開發後記得使用 --amend 修改 commit message")
                return True
                
        except Exception as e:
            print(f"⚠️  恢復 WIP 失敗: {e}")
            return False
    
    def _get_modified_files(self) -> list:
        """獲取修改的檔案列表"""
        try:
            result = subprocess.run(
                ['git', 'status', '--porcelain'],
                capture_output=True,
                text=True,
                check=True
            )
            files = []
            for line in result.stdout.strip().split('\n'):
                if line:
                    # 解析 git status 輸出
                    parts = line.strip().split()
                    if len(parts) >= 2:
                        files.append(parts[1])
            return files
        except:
            return []
    
    def get_active_ticket(self) -> Optional[Dict]:
        """獲取當前進行中的 ticket"""
        # 從最新日期開始尋找
        for date_dir in sorted(self.tickets_dir.iterdir(), reverse=True):
            if date_dir.is_dir():
                for ticket_file in date_dir.glob("*.json"):
                    with open(ticket_file, 'r', encoding='utf-8') as f:
                        ticket_data = json.load(f)
                    
                    if ticket_data['status'] == 'in_progress':
                        return ticket_data
        
        return None
    
    def list_tickets(self, date: Optional[str] = None, status: Optional[str] = None) -> list:
        """列出 tickets"""
        tickets = []
        
        if date:
            date_dirs = [self.tickets_dir / date] if (self.tickets_dir / date).exists() else []
        else:
            date_dirs = sorted(self.tickets_dir.iterdir(), reverse=True)
        
        for date_dir in date_dirs:
            if date_dir.is_dir():
                for ticket_file in date_dir.glob("*.json"):
                    with open(ticket_file, 'r', encoding='utf-8') as f:
                        ticket_data = json.load(f)
                    
                    if status is None or ticket_data['status'] == status:
                        tickets.append(ticket_data)
        
        return tickets


def main():
    """CLI 介面"""
    if len(sys.argv) < 2:
        print("Usage: ticket-manager.py <command> [args]")
        print("Commands:")
        print("  create <name> [description]  - Create new ticket")
        print("  complete <name> <commit>     - Complete ticket")
        print("  pause [name]                 - Pause ticket (current if no name)")
        print("  resume <name>                - Resume paused ticket")
        print("  active                       - Show active ticket")
        print("  list [date] [status]        - List tickets")
        sys.exit(1)
    
    manager = TicketManager()
    command = sys.argv[1]
    
    if command == "create":
        if len(sys.argv) < 3:
            print("Error: Please provide ticket name")
            sys.exit(1)
        
        name = sys.argv[2]
        description = sys.argv[3] if len(sys.argv) > 3 else ""
        manager.create_ticket(name, description)
    
    elif command == "complete":
        if len(sys.argv) < 4:
            print("Error: Please provide ticket name and commit hash")
            sys.exit(1)
        
        name = sys.argv[2]
        commit = sys.argv[3]
        manager.complete_ticket(name, commit)
    
    elif command == "active":
        ticket = manager.get_active_ticket()
        if ticket:
            print(f"📋 Active ticket: {ticket['name']}")
            print(f"   Started: {ticket['started_at']}")
        else:
            print("❌ No active ticket")
    
    elif command == "pause":
        name = sys.argv[2] if len(sys.argv) > 2 else None
        manager.pause_ticket(name)
    
    elif command == "resume":
        if len(sys.argv) < 3:
            print("Error: Please provide ticket name to resume")
            sys.exit(1)
        
        name = sys.argv[2]
        manager.resume_ticket(name)
    
    elif command == "list":
        date = sys.argv[2] if len(sys.argv) > 2 else None
        status = sys.argv[3] if len(sys.argv) > 3 else None
        
        tickets = manager.list_tickets(date, status)
        
        # 分組顯示
        active = [t for t in tickets if t['status'] == 'in_progress']
        paused = [t for t in tickets if t['status'] == 'paused']
        completed = [t for t in tickets if t['status'] == 'completed']
        
        if active:
            print("\n🟢 Active:")
            for ticket in active:
                print(f"  - {ticket['name']} (started: {ticket['created_at'][:10]})")
        
        if paused:
            print("\n⏸️  Paused:")
            for ticket in paused:
                paused_at = ticket.get('paused_at', 'unknown')[:16] if 'paused_at' in ticket else 'unknown'
                print(f"  - {ticket['name']} (paused: {paused_at})")
        
        if completed:
            print("\n✅ Completed:")
            for ticket in completed[:5]:  # 只顯示最近 5 個
                print(f"  - {ticket['name']} ({ticket.get('duration_minutes', '?')} min)")
            if len(completed) > 5:
                print(f"  ... and {len(completed) - 5} more")


if __name__ == "__main__":
    main()