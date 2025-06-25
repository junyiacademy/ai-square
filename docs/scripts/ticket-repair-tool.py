#!/usr/bin/env python3
"""
Ticket Repair Tool
修復和補充票券遺漏的資訊，包括從 commit 反向創建票券
"""

import os
import yaml
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import re

class TicketRepairTool:
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.tickets_dir = self.project_root / "docs" / "tickets"
        self.active_dir = self.tickets_dir / "active"
        self.archive_dir = self.tickets_dir / "archive"
        
    def get_commit_info(self, commit_hash: str) -> Dict:
        """獲取 commit 的詳細資訊"""
        # 獲取 commit 資訊
        cmd = ["git", "show", "--format=%H|%ai|%s|%an|%b", "-s", commit_hash]
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.project_root)
        
        if result.returncode != 0:
            return None
            
        info = result.stdout.strip().split('|', 4)
        
        # 獲取修改的檔案
        cmd_files = ["git", "show", "--name-only", "--format=", commit_hash]
        files_result = subprocess.run(cmd_files, capture_output=True, text=True, cwd=self.project_root)
        modified_files = [f for f in files_result.stdout.strip().split('\n') if f]
        
        # 獲取 commit 時間差（估算開發時間）
        cmd_prev = ["git", "log", "--format=%ai", "-n", "2", commit_hash]
        time_result = subprocess.run(cmd_prev, capture_output=True, text=True, cwd=self.project_root)
        times = time_result.stdout.strip().split('\n')
        
        duration_minutes = 30  # 預設 30 分鐘
        if len(times) >= 2:
            # 計算與前一個 commit 的時間差
            current_time = datetime.fromisoformat(times[0].replace(' +0800', '+08:00'))
            prev_time = datetime.fromisoformat(times[1].replace(' +0800', '+08:00'))
            delta = current_time - prev_time
            # 合理的開發時間範圍：5 分鐘到 4 小時
            duration_minutes = max(5, min(240, int(delta.total_seconds() / 60)))
        
        return {
            'hash': info[0],
            'timestamp': info[1],
            'message': info[2],
            'author': info[3],
            'body': info[4] if len(info) > 4 else '',
            'files': modified_files,
            'estimated_duration': duration_minutes
        }
    
    def create_ticket_from_commit(self, commit_hash: str, ticket_type: str = "feature") -> str:
        """從 commit 創建票券"""
        commit_info = self.get_commit_info(commit_hash)
        if not commit_info:
            print(f"Error: Cannot find commit {commit_hash}")
            return None
        
        # 從 commit message 提取票券名稱
        message = commit_info['message']
        # 移除常見前綴
        ticket_name = re.sub(r'^(feat|fix|chore|refactor|docs|style|test)(\(.+?\))?: ', '', message)
        ticket_name = re.sub(r'[^a-zA-Z0-9\s-]', '', ticket_name).strip()
        ticket_name = re.sub(r'\s+', '-', ticket_name.lower())[:50]
        
        # 創建票券檔案名稱
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}-{ticket_type}-{ticket_name}.yml"
        filepath = self.active_dir / filename
        
        # 判斷 AI 複雜度（基於檔案數量和類型）
        file_count = len(commit_info['files'])
        complexity = "simple"
        if file_count > 5:
            complexity = "complex"
        elif file_count > 2:
            complexity = "medium"
        
        # 估算 AI 成本
        cost_map = {"simple": 0.05, "medium": 0.15, "complex": 0.25, "debug": 0.10}
        estimated_cost = cost_map.get(complexity, 0.15)
        
        # 創建票券內容
        commit_time = datetime.fromisoformat(commit_info['timestamp'].replace(' +0800', '+08:00'))
        
        ticket_data = {
            'spec': {
                'feature': message,
                'purpose': f"Retroactively created from commit {commit_hash[:8]}",
                'created_from_commit': True
            },
            'dev_log': {
                'sessions': [{
                    'session_id': 1,
                    'date': commit_time.strftime('%Y-%m-%d'),
                    'start_time': commit_time.strftime('%H:%M:%S'),
                    'end_time': (commit_time).strftime('%H:%M:%S'),
                    'duration_minutes': commit_info['estimated_duration'],
                    'activities': [f"Implemented: {message}"],
                    'files_modified': commit_info['files'],
                    'decisions': ["Retroactively documented from git history"],
                    'challenges': [],
                    'next_steps': []
                }]
            },
            'test_report': {
                'test_runs': [],
                'final_status': 'unknown'
            },
            'ai_usage': {
                'interactions': [{
                    'timestamp': commit_time.isoformat(),
                    'task_type': 'development',
                    'description': f'development - {complexity}',
                    'complexity': complexity,
                    'estimated_cost': estimated_cost
                }],
                'total_interactions': 1,
                'complexity_breakdown': {f'{complexity}_count': 1},
                'estimated_cost_usd': estimated_cost
            },
            'development': {
                'commit_hash': commit_hash[:8],
                'branch': 'unknown',
                'files_modified': commit_info['files']
            },
            'time_tracking': {
                'started_at': commit_time.isoformat(),
                'completed_at': commit_time.isoformat(),
                'actual_duration_minutes': commit_info['estimated_duration'],
                'ai_time_minutes': int(commit_info['estimated_duration'] * 0.7),  # 估計 70% 是 AI 時間
                'human_time_minutes': int(commit_info['estimated_duration'] * 0.3)
            },
            'completion_checklist': {
                'spec_defined': True,
                'code_implemented': True,
                'tests_written': False,
                'tests_passing': False,
                'documentation_updated': False,
                'ai_metrics_recorded': True,
                'story_extracted': False
            },
            'created_at': datetime.now().isoformat(),
            'title': message,
            'description': message,
            'ticket_type': ticket_type,
            'status': 'completed'
        }
        
        # 寫入檔案
        os.makedirs(self.active_dir, exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            yaml.dump(ticket_data, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
        
        print(f"✅ Created ticket: {filename}")
        print(f"   Commit: {commit_hash[:8]} - {message}")
        print(f"   Duration: {commit_info['estimated_duration']} mins")
        print(f"   AI Cost: ${estimated_cost}")
        
        return str(filepath)
    
    def repair_missing_fields(self, ticket_path: str) -> None:
        """修復票券中遺漏的欄位"""
        with open(ticket_path, 'r', encoding='utf-8') as f:
            ticket = yaml.safe_load(f)
        
        updated = False
        
        # 修復 commit_hash
        if 'development' in ticket and 'commit_hash' in ticket['development']:
            commit_hash = ticket['development']['commit_hash']
            if commit_hash and len(commit_hash) > 8:
                commit_info = self.get_commit_info(commit_hash)
                if commit_info:
                    # 更新檔案列表
                    if not ticket['development'].get('files_modified'):
                        ticket['development']['files_modified'] = commit_info['files']
                        updated = True
                    
                    # 更新時間追蹤
                    if 'time_tracking' in ticket:
                        if not ticket['time_tracking'].get('actual_duration_minutes'):
                            ticket['time_tracking']['actual_duration_minutes'] = commit_info['estimated_duration']
                            updated = True
        
        # 修復 AI 成本估算
        if 'ai_usage' in ticket:
            if ticket['ai_usage'].get('total_interactions', 0) > 0 and \
               ticket['ai_usage'].get('estimated_cost_usd', 0) == 0:
                # 基於複雜度重新計算
                complexity_breakdown = ticket['ai_usage'].get('complexity_breakdown', {})
                total_cost = 0
                cost_map = {"simple": 0.05, "medium": 0.15, "complex": 0.25, "debug": 0.10}
                
                for complexity, count in complexity_breakdown.items():
                    complexity_type = complexity.replace('_count', '')
                    if complexity_type in cost_map:
                        total_cost += cost_map[complexity_type] * count
                
                if total_cost > 0:
                    ticket['ai_usage']['estimated_cost_usd'] = total_cost
                    updated = True
        
        # 儲存更新
        if updated:
            with open(ticket_path, 'w', encoding='utf-8') as f:
                yaml.dump(ticket, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
            print(f"✅ Repaired ticket: {os.path.basename(ticket_path)}")
    
    def find_orphan_commits(self, days: int = 7) -> List[Dict]:
        """找出沒有對應票券的 commits"""
        # 獲取所有票券的 commit hashes
        ticket_commits = set()
        
        for ticket_file in self.archive_dir.rglob("*.yml"):
            try:
                with open(ticket_file, 'r', encoding='utf-8') as f:
                    ticket = yaml.safe_load(f)
                    if 'development' in ticket and 'commit_hash' in ticket['development']:
                        ticket_commits.add(ticket['development']['commit_hash'][:8])
                    elif 'commit_hash' in ticket:  # 舊格式
                        ticket_commits.add(ticket['commit_hash'][:8])
            except:
                pass
        
        # 檢查活躍票券
        for ticket_file in self.active_dir.glob("*.yml"):
            try:
                with open(ticket_file, 'r', encoding='utf-8') as f:
                    ticket = yaml.safe_load(f)
                    if 'development' in ticket and 'commit_hash' in ticket['development']:
                        ticket_commits.add(ticket['development']['commit_hash'][:8])
            except:
                pass
        
        # 獲取最近的 commits
        cmd = ["git", "log", f"--since={days} days ago", "--format=%H|%ai|%s"]
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.project_root)
        
        orphan_commits = []
        for line in result.stdout.strip().split('\n'):
            if line:
                hash, date, message = line.split('|', 2)
                short_hash = hash[:8]
                
                # 跳過 merge commits 和自動 commits
                if 'Merge' in message or 'chore:' in message:
                    continue
                    
                if short_hash not in ticket_commits:
                    orphan_commits.append({
                        'hash': hash,
                        'short_hash': short_hash,
                        'date': date,
                        'message': message
                    })
        
        return orphan_commits

def main():
    """主程式"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Repair and create tickets from commits')
    parser.add_argument('action', choices=['create', 'repair', 'orphans'], 
                       help='Action to perform')
    parser.add_argument('--commit', help='Commit hash for create action')
    parser.add_argument('--ticket', help='Ticket file path for repair action')
    parser.add_argument('--days', type=int, default=7, help='Days to look back for orphans')
    parser.add_argument('--type', default='feature', choices=['feature', 'fix', 'chore'],
                       help='Ticket type for create action')
    
    args = parser.parse_args()
    
    # 找到專案根目錄
    current_dir = Path.cwd()
    while current_dir != current_dir.parent:
        if (current_dir / '.git').exists():
            break
        current_dir = current_dir.parent
    
    tool = TicketRepairTool(str(current_dir))
    
    if args.action == 'create':
        if not args.commit:
            print("Error: --commit is required for create action")
            return
        tool.create_ticket_from_commit(args.commit, args.type)
        
    elif args.action == 'repair':
        if not args.ticket:
            print("Error: --ticket is required for repair action")
            return
        tool.repair_missing_fields(args.ticket)
        
    elif args.action == 'orphans':
        orphans = tool.find_orphan_commits(args.days)
        if orphans:
            print(f"\n找到 {len(orphans)} 個沒有票券的 commits:")
            print("-" * 80)
            for commit in orphans:
                print(f"{commit['short_hash']} {commit['date'][:10]} {commit['message'][:60]}")
            
            print(f"\n可以使用以下命令創建票券:")
            print(f"python3 {__file__} create --commit <HASH> --type <TYPE>")
        else:
            print("✅ 所有 commits 都有對應的票券")

if __name__ == "__main__":
    main()