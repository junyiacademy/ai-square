#!/usr/bin/env python3
"""
Commit to Ticket Analyzer
分析 git commits 並反推對應的票券、開發時間和 AI 成本
"""

import os
import yaml
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
import json

class CommitTicketAnalyzer:
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.tickets_dir = self.project_root / "docs" / "tickets" / "archive"
        
    def get_git_commits(self, limit: int = 50) -> List[Dict]:
        """獲取最近的 git commits"""
        cmd = ["git", "log", f"-{limit}", "--format=%H|%ai|%s|%an"]
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.project_root)
        
        commits = []
        for line in result.stdout.strip().split('\n'):
            if line:
                hash, date, message, author = line.split('|', 3)
                commits.append({
                    'hash': hash[:8],  # 短 hash
                    'full_hash': hash,
                    'date': date,
                    'message': message,
                    'author': author
                })
        return commits
    
    def load_all_tickets(self) -> Dict[str, Dict]:
        """載入所有票券並建立 commit_hash 對應表"""
        ticket_map = {}
        
        for ticket_file in self.tickets_dir.rglob("*.yml"):
            try:
                with open(ticket_file, 'r', encoding='utf-8') as f:
                    ticket = yaml.safe_load(f)
                    
                if ticket and 'commit_hash' in ticket:
                    # 支援短 hash 和完整 hash
                    commit_hash = ticket['commit_hash']
                    ticket['filename'] = ticket_file.name
                    ticket['filepath'] = str(ticket_file)
                    
                    # 儲存短 hash 和完整 hash 的對應
                    ticket_map[commit_hash[:8]] = ticket
                    if len(commit_hash) > 8:
                        ticket_map[commit_hash] = ticket
                        
            except Exception as e:
                print(f"Error loading {ticket_file}: {e}")
                
        return ticket_map
    
    def analyze_ticket(self, ticket: Dict) -> Dict:
        """分析單一票券的統計資料"""
        analysis = {
            'title': ticket.get('title', ticket.get('description', 'N/A')),
            'created_at': ticket.get('created_at', 'N/A'),
            'time_tracking': {},
            'ai_usage': {},
            'files_modified': []
        }
        
        # 時間追蹤
        if 'time_tracking' in ticket:
            tt = ticket['time_tracking']
            analysis['time_tracking'] = {
                'total_minutes': tt.get('actual_duration_minutes', 0),
                'ai_minutes': tt.get('ai_time_minutes', 0),
                'human_minutes': tt.get('human_time_minutes', 0)
            }
        
        # AI 使用和成本
        if 'ai_usage' in ticket:
            au = ticket['ai_usage']
            analysis['ai_usage'] = {
                'estimated_cost_usd': au.get('estimated_cost_usd', 0),
                'total_interactions': au.get('total_interactions', 0),
                'complexity_breakdown': au.get('complexity_breakdown', {})
            }
        
        # 修改的檔案
        if 'dev_log' in ticket and 'sessions' in ticket['dev_log']:
            for session in ticket['dev_log']['sessions']:
                if 'files_modified' in session:
                    analysis['files_modified'].extend(session['files_modified'])
        
        return analysis
    
    def generate_report(self, days: int = 7) -> None:
        """生成分析報告"""
        print(f"\n{'='*80}")
        print(f"Commit to Ticket Analysis Report")
        print(f"{'='*80}\n")
        
        # 載入資料
        commits = self.get_git_commits(limit=100)
        ticket_map = self.load_all_tickets()
        
        # 統計資料
        total_time = 0
        total_ai_cost = 0
        matched_commits = 0
        unmatched_commits = []
        
        print(f"Recent Commits with Ticket Analysis:")
        print(f"{'-'*80}")
        
        for commit in commits:
            commit_hash = commit['hash']
            
            if commit_hash in ticket_map:
                matched_commits += 1
                ticket = ticket_map[commit_hash]
                analysis = self.analyze_ticket(ticket)
                
                # 累計統計
                total_time += analysis['time_tracking'].get('total_minutes', 0)
                total_ai_cost += analysis['ai_usage'].get('estimated_cost_usd', 0)
                
                # 顯示詳細資訊
                print(f"\n📝 Commit: {commit_hash} - {commit['message'][:60]}...")
                print(f"   Date: {commit['date']}")
                print(f"   Ticket: {ticket['filename']}")
                print(f"   Time: {analysis['time_tracking'].get('total_minutes', 0)} mins")
                print(f"   AI Cost: ${analysis['ai_usage'].get('estimated_cost_usd', 0):.2f}")
                
                if analysis['files_modified']:
                    print(f"   Files: {len(analysis['files_modified'])} modified")
                    
            else:
                unmatched_commits.append(commit)
        
        # 總結統計
        print(f"\n{'='*80}")
        print(f"Summary Statistics:")
        print(f"{'-'*80}")
        print(f"Total Commits Analyzed: {len(commits)}")
        print(f"Matched with Tickets: {matched_commits}")
        print(f"Unmatched Commits: {len(unmatched_commits)}")
        print(f"\nTotal Development Time: {total_time} minutes ({total_time/60:.1f} hours)")
        print(f"Total AI Cost Estimate: ${total_ai_cost:.2f}")
        print(f"Average Time per Ticket: {total_time/matched_commits:.1f} minutes" if matched_commits > 0 else "")
        
        # 顯示未匹配的 commits
        if unmatched_commits:
            print(f"\n{'-'*80}")
            print(f"Commits without tickets (recent 10):")
            for commit in unmatched_commits[:10]:
                print(f"  - {commit['hash']} {commit['message'][:50]}...")
    
    def export_to_csv(self, output_file: str = "commit_analysis.csv") -> None:
        """匯出分析結果為 CSV"""
        import csv
        
        commits = self.get_git_commits(limit=200)
        ticket_map = self.load_all_tickets()
        
        with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['commit_hash', 'date', 'message', 'ticket_file', 
                         'duration_minutes', 'ai_cost_usd', 'files_modified']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            for commit in commits:
                row = {
                    'commit_hash': commit['hash'],
                    'date': commit['date'],
                    'message': commit['message'][:100]
                }
                
                if commit['hash'] in ticket_map:
                    ticket = ticket_map[commit['hash']]
                    analysis = self.analyze_ticket(ticket)
                    
                    row.update({
                        'ticket_file': ticket['filename'],
                        'duration_minutes': analysis['time_tracking'].get('total_minutes', 0),
                        'ai_cost_usd': analysis['ai_usage'].get('estimated_cost_usd', 0),
                        'files_modified': len(analysis['files_modified'])
                    })
                
                writer.writerow(row)
        
        print(f"\nAnalysis exported to {output_file}")

def main():
    """主程式"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Analyze git commits and correlate with tickets')
    parser.add_argument('--days', type=int, default=7, help='Number of days to analyze')
    parser.add_argument('--export', action='store_true', help='Export results to CSV')
    parser.add_argument('--output', default='commit_analysis.csv', help='Output CSV filename')
    
    args = parser.parse_args()
    
    # 找到專案根目錄
    current_dir = Path.cwd()
    while current_dir != current_dir.parent:
        if (current_dir / '.git').exists():
            break
        current_dir = current_dir.parent
    
    analyzer = CommitTicketAnalyzer(str(current_dir))
    
    # 生成報告
    analyzer.generate_report(days=args.days)
    
    # 匯出 CSV
    if args.export:
        analyzer.export_to_csv(args.output)

if __name__ == "__main__":
    main()