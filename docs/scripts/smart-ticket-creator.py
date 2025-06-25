#!/usr/bin/env python3
"""
Smart Ticket Creator
智能分析 commits 並自動判斷類型、合理分組創建票券
"""

import os
import yaml
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import re
from collections import defaultdict

class SmartTicketCreator:
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.tickets_dir = self.project_root / "docs" / "tickets"
        self.active_dir = self.tickets_dir / "active"
        
        # Commit 類型映射
        self.type_patterns = {
            'feature': [r'^feat(\(.*?\))?:', r'^feature:', r'add', r'implement', r'create'],
            'fix': [r'^fix(\(.*?\))?:', r'^bugfix:', r'^hotfix:', r'resolve', r'repair'],
            'chore': [r'^chore(\(.*?\))?:', r'^build:', r'^ci:', r'update', r'cleanup'],
            'refactor': [r'^refactor(\(.*?\))?:', r'restructure', r'reorganize'],
            'docs': [r'^docs(\(.*?\))?:', r'documentation', r'readme'],
            'test': [r'^test(\(.*?\))?:', r'testing', r'tests'],
            'style': [r'^style(\(.*?\))?:', r'formatting', r'lint']
        }
        
    def detect_commit_type(self, message: str) -> str:
        """從 commit message 自動判斷類型"""
        message_lower = message.lower()
        
        for commit_type, patterns in self.type_patterns.items():
            for pattern in patterns:
                if re.search(pattern, message_lower):
                    return commit_type if commit_type in ['feature', 'fix', 'chore'] else 'chore'
        
        return 'feature'  # 預設類型
    
    def should_group_commits(self, commits: List[Dict]) -> bool:
        """判斷這些 commits 是否應該被分組"""
        if len(commits) <= 1:
            return False
            
        # 檢查時間範圍（4小時內的視為同一批工作）
        times = [datetime.fromisoformat(c['timestamp'].replace(' +0800', '+08:00')) for c in commits]
        time_diff = (max(times) - min(times)).total_seconds() / 3600
        
        if time_diff > 4:
            return False
            
        # 檢查是否有相似的 commit message 模式
        messages = [c['message'].lower() for c in commits]
        
        # 相似度檢查
        common_words = set()
        for msg in messages:
            words = set(re.findall(r'\b\w+\b', msg))
            if not common_words:
                common_words = words
            else:
                common_words &= words
        
        # 如果有共同的關鍵字（排除常見詞）
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'fix', 'update'}
        common_words -= stop_words
        
        return len(common_words) >= 2
    
    def group_related_commits(self, orphan_commits: List[Dict]) -> List[List[Dict]]:
        """將相關的 commits 智能分組"""
        groups = []
        used_commits = set()
        
        # 按時間排序
        sorted_commits = sorted(orphan_commits, 
                              key=lambda x: datetime.fromisoformat(x['timestamp'].replace(' +0800', '+08:00')))
        
        for i, commit in enumerate(sorted_commits):
            if commit['hash'] in used_commits:
                continue
                
            # 收集可能相關的 commits
            potential_group = [commit]
            commit_time = datetime.fromisoformat(commit['timestamp'].replace(' +0800', '+08:00'))
            
            # 向後查找相關 commits（4小時內）
            for j in range(i + 1, len(sorted_commits)):
                next_commit = sorted_commits[j]
                if next_commit['hash'] in used_commits:
                    continue
                    
                next_time = datetime.fromisoformat(next_commit['timestamp'].replace(' +0800', '+08:00'))
                time_diff = (next_time - commit_time).total_seconds() / 3600
                
                if time_diff <= 4:
                    # 檢查是否相關
                    if self.are_commits_related(commit, next_commit):
                        potential_group.append(next_commit)
            
            # 判斷是否應該分組
            if self.should_group_commits(potential_group):
                groups.append(potential_group)
                for c in potential_group:
                    used_commits.add(c['hash'])
            else:
                # 單獨成組
                groups.append([commit])
                used_commits.add(commit['hash'])
        
        return groups
    
    def are_commits_related(self, commit1: Dict, commit2: Dict) -> bool:
        """判斷兩個 commits 是否相關"""
        msg1 = commit1['message'].lower()
        msg2 = commit2['message'].lower()
        
        # 1. 檢查是否修改相同檔案
        files1 = set(commit1.get('files', []))
        files2 = set(commit2.get('files', []))
        if files1 & files2:  # 有交集
            return True
        
        # 2. 檢查 message 相似度
        words1 = set(re.findall(r'\b\w+\b', msg1))
        words2 = set(re.findall(r'\b\w+\b', msg2))
        
        # 移除常見詞
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'}
        words1 -= stop_words
        words2 -= stop_words
        
        # 計算 Jaccard 相似度
        if words1 and words2:
            similarity = len(words1 & words2) / len(words1 | words2)
            if similarity > 0.3:
                return True
        
        # 3. 檢查是否屬於同一功能模組
        # 例如都是 "fix:" 或都是 "feat:"
        type1 = self.detect_commit_type(msg1)
        type2 = self.detect_commit_type(msg2)
        
        if type1 == type2 and type1 != 'chore':
            # 進一步檢查是否在處理相同的功能
            if any(word in msg2 for word in ['continue', 'more', 'additional', 'further']):
                return True
        
        return False
    
    def get_commit_details(self, commit_hash: str) -> Dict:
        """獲取 commit 的詳細資訊"""
        # 獲取修改的檔案
        cmd_files = ["git", "show", "--name-only", "--format=", commit_hash]
        files_result = subprocess.run(cmd_files, capture_output=True, text=True, cwd=self.project_root)
        files = [f for f in files_result.stdout.strip().split('\n') if f]
        
        return {'files': files}
    
    def create_grouped_ticket(self, commits_group: List[Dict], ticket_type: str = None) -> str:
        """為一組相關的 commits 創建票券"""
        # 自動判斷類型
        if not ticket_type:
            types = [self.detect_commit_type(c['message']) for c in commits_group]
            ticket_type = max(set(types), key=types.count)  # 最常見的類型
        
        # 生成票券標題
        if len(commits_group) == 1:
            title = commits_group[0]['message']
        else:
            # 提取共同主題
            messages = [c['message'] for c in commits_group]
            title = self.extract_common_theme(messages)
        
        # 整理票券名稱
        ticket_name = re.sub(r'^(feat|fix|chore|refactor|docs|style|test)(\(.+?\))?: ', '', title)
        ticket_name = re.sub(r'[^a-zA-Z0-9\s-]', '', ticket_name).strip()
        ticket_name = re.sub(r'\s+', '-', ticket_name.lower())[:40]
        
        # 創建票券檔案
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}-{ticket_type}-{ticket_name}.yml"
        filepath = self.active_dir / filename
        
        # 收集所有資訊
        all_files = set()
        total_duration = 0
        activities = []
        commit_hashes = []
        
        # 時間範圍
        times = [datetime.fromisoformat(c['timestamp'].replace(' +0800', '+08:00')) for c in commits_group]
        start_time = min(times)
        end_time = max(times)
        
        for commit in commits_group:
            # 獲取檔案資訊
            details = self.get_commit_details(commit['hash'])
            all_files.update(details['files'])
            
            # 收集活動
            activities.append(f"- {commit['message']} ({commit['hash'][:8]})")
            commit_hashes.append(commit['hash'][:8])
            
            # 估算時間（每個 commit 15-30 分鐘）
            total_duration += 20
        
        # 如果時間跨度很大，使用實際時間差
        actual_duration = int((end_time - start_time).total_seconds() / 60)
        if actual_duration > total_duration:
            total_duration = min(actual_duration, 240)  # 最多 4 小時
        
        # 估算複雜度和成本
        complexity = self.estimate_complexity(len(all_files), len(commits_group))
        cost_map = {"simple": 0.05, "medium": 0.15, "complex": 0.25}
        estimated_cost = cost_map.get(complexity, 0.15) * len(commits_group)
        
        # 創建票券內容
        ticket_data = {
            'spec': {
                'feature': title,
                'purpose': f"Grouped {len(commits_group)} related commits",
                'commits_grouped': commit_hashes,
                'created_from_commits': True
            },
            'dev_log': {
                'sessions': [{
                    'session_id': 1,
                    'date': start_time.strftime('%Y-%m-%d'),
                    'start_time': start_time.strftime('%H:%M:%S'),
                    'end_time': end_time.strftime('%H:%M:%S'),
                    'duration_minutes': total_duration,
                    'activities': activities,
                    'files_modified': list(all_files),
                    'decisions': [f"Grouped {len(commits_group)} related commits into single ticket"],
                    'challenges': [],
                    'next_steps': []
                }]
            },
            'test_report': {
                'test_runs': [],
                'final_status': 'completed'
            },
            'ai_usage': {
                'interactions': [{
                    'timestamp': datetime.now().isoformat(),
                    'task_type': 'development',
                    'description': f'Grouped development - {complexity}',
                    'complexity': complexity,
                    'estimated_cost': estimated_cost
                }],
                'total_interactions': len(commits_group),
                'complexity_breakdown': {f'{complexity}_count': len(commits_group)},
                'estimated_cost_usd': round(estimated_cost, 2)
            },
            'development': {
                'commit_hash': commit_hashes[-1],  # 最後一個 commit
                'all_commits': commit_hashes,
                'branch': 'main',
                'files_modified': list(all_files)
            },
            'time_tracking': {
                'started_at': start_time.isoformat(),
                'completed_at': end_time.isoformat(),
                'actual_duration_minutes': total_duration,
                'ai_time_minutes': int(total_duration * 0.6),
                'human_time_minutes': int(total_duration * 0.4)
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
            'title': title,
            'description': f"Retroactively created from {len(commits_group)} commits",
            'ticket_type': ticket_type,
            'status': 'completed'
        }
        
        # 寫入檔案
        os.makedirs(self.active_dir, exist_ok=True)
        with open(filepath, 'w', encoding='utf-8') as f:
            yaml.dump(ticket_data, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
        
        return str(filepath)
    
    def extract_common_theme(self, messages: List[str]) -> str:
        """從多個 commit messages 提取共同主題"""
        # 移除前綴
        cleaned = []
        for msg in messages:
            cleaned_msg = re.sub(r'^(feat|fix|chore|refactor|docs|style|test)(\(.+?\))?: ', '', msg)
            cleaned.append(cleaned_msg)
        
        # 找出最常見的詞
        word_freq = defaultdict(int)
        for msg in cleaned:
            words = re.findall(r'\b\w+\b', msg.lower())
            for word in words:
                if len(word) > 3:  # 忽略短詞
                    word_freq[word] += 1
        
        # 選擇最頻繁的詞構建標題
        if word_freq:
            top_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:3]
            theme_words = [word for word, _ in top_words]
            return f"Multiple updates for {' '.join(theme_words)}"
        
        return f"Grouped {len(messages)} related changes"
    
    def estimate_complexity(self, file_count: int, commit_count: int) -> str:
        """估算工作複雜度"""
        if file_count > 10 or commit_count > 5:
            return "complex"
        elif file_count > 5 or commit_count > 2:
            return "medium"
        else:
            return "simple"
    
    def find_orphan_commits_local(self, days: int = 7) -> List[Dict]:
        """找出沒有對應票券的 commits (本地實現)"""
        # 獲取所有票券的 commit hashes
        ticket_commits = set()
        
        for ticket_file in self.tickets_dir.rglob("*.yml"):
            try:
                with open(ticket_file, 'r', encoding='utf-8') as f:
                    ticket = yaml.safe_load(f)
                    if 'development' in ticket and 'commit_hash' in ticket['development']:
                        ticket_commits.add(ticket['development']['commit_hash'][:8])
                    elif 'commit_hash' in ticket:  # 舊格式
                        ticket_commits.add(ticket['commit_hash'][:8])
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
                        'message': message,
                        'timestamp': date  # 統一欄位名
                    })
        
        return orphan_commits
    
    def analyze_and_create_tickets(self, days: int = 7, dry_run: bool = False) -> None:
        """分析並智能創建票券"""
        # 獲取孤兒 commits
        orphan_commits = self.find_orphan_commits_local(days)
        
        if not orphan_commits:
            print("✅ 沒有找到需要補票的 commits")
            return
        
        # 為每個 commit 獲取詳細資訊
        for commit in orphan_commits:
            details = self.get_commit_details(commit['hash'])
            commit.update(details)
            commit['timestamp'] = commit['date']  # 統一欄位名稱
        
        # 智能分組
        groups = self.group_related_commits(orphan_commits)
        
        print(f"\n📊 分析結果：")
        print(f"- 找到 {len(orphan_commits)} 個沒有票券的 commits")
        print(f"- 智能分組為 {len(groups)} 個票券")
        print("-" * 80)
        
        # 顯示分組結果
        for i, group in enumerate(groups, 1):
            ticket_type = self.detect_commit_type(group[0]['message'])
            print(f"\n📋 票券 #{i} ({ticket_type}):")
            
            if len(group) == 1:
                print(f"   單一 commit: {group[0]['hash'][:8]} - {group[0]['message'][:60]}")
            else:
                print(f"   包含 {len(group)} 個相關 commits:")
                for commit in group:
                    print(f"     - {commit['hash'][:8]} {commit['message'][:50]}")
            
            # 估算資訊
            file_count = len(set().union(*[set(c.get('files', [])) for c in group]))
            complexity = self.estimate_complexity(file_count, len(group))
            print(f"   檔案數: {file_count}, 複雜度: {complexity}")
        
        if dry_run:
            print("\n🔍 Dry run 模式，不會實際創建票券")
            return
        
        # 確認創建
        print("\n" + "="*80)
        response = input("是否創建這些票券？(y/n/選擇編號): ").strip().lower()
        
        if response == 'n':
            print("❌ 取消操作")
            return
        elif response == 'y':
            # 創建所有票券
            for i, group in enumerate(groups, 1):
                filepath = self.create_grouped_ticket(group)
                print(f"✅ 創建票券 #{i}: {os.path.basename(filepath)}")
        else:
            # 選擇性創建
            try:
                selected = [int(x.strip()) for x in response.split(',')]
                for i in selected:
                    if 1 <= i <= len(groups):
                        filepath = self.create_grouped_ticket(groups[i-1])
                        print(f"✅ 創建票券 #{i}: {os.path.basename(filepath)}")
                    else:
                        print(f"❌ 無效的編號: {i}")
            except ValueError:
                print("❌ 無效的輸入")

def main():
    """主程式"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Smart ticket creation from orphan commits')
    parser.add_argument('--days', type=int, default=7, help='Days to look back')
    parser.add_argument('--dry-run', action='store_true', help='Only show analysis without creating tickets')
    
    args = parser.parse_args()
    
    # 找到專案根目錄
    current_dir = Path.cwd()
    while current_dir != current_dir.parent:
        if (current_dir / '.git').exists():
            break
        current_dir = current_dir.parent
    
    creator = SmartTicketCreator(str(current_dir))
    creator.analyze_and_create_tickets(days=args.days, dry_run=args.dry_run)

if __name__ == "__main__":
    main()