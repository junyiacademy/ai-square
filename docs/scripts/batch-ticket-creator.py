#!/usr/bin/env python3
"""
Batch Ticket Creator
批次創建選定的票券（用於 AI 補票）
"""

import sys
import os
from pathlib import Path

# 添加腳本目錄到 Python 路徑
script_dir = Path(__file__).parent
sys.path.insert(0, str(script_dir))

from smart_ticket_creator import SmartTicketCreator

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Batch create tickets')
    parser.add_argument('--days', type=int, default=7, help='Days to look back')
    parser.add_argument('--tickets', type=str, help='Ticket numbers to create (e.g., "1,3,5-8")')
    parser.add_argument('--recent', type=int, help='Create most recent N tickets')
    parser.add_argument('--type', type=str, help='Only create tickets of this type (feature/fix/chore)')
    
    args = parser.parse_args()
    
    # 找到專案根目錄
    current_dir = Path.cwd()
    while current_dir != current_dir.parent:
        if (current_dir / '.git').exists():
            break
        current_dir = current_dir.parent
    
    creator = SmartTicketCreator(str(current_dir))
    
    # 獲取並分析 commits
    orphan_commits = creator.find_orphan_commits_local(args.days)
    if not orphan_commits:
        print("✅ 沒有找到需要補票的 commits")
        return
    
    # 為每個 commit 獲取詳細資訊
    for commit in orphan_commits:
        details = creator.get_commit_details(commit['hash'])
        commit.update(details)
    
    # 智能分組
    groups = creator.group_related_commits(orphan_commits)
    
    # 根據參數選擇要創建的票券
    selected_indices = []
    
    if args.tickets:
        # 解析票券編號
        for part in args.tickets.split(','):
            if '-' in part:
                start, end = map(int, part.split('-'))
                selected_indices.extend(range(start-1, end))
            else:
                selected_indices.append(int(part)-1)
    elif args.recent:
        # 選擇最近的 N 個
        selected_indices = list(range(min(args.recent, len(groups))))
    elif args.type:
        # 選擇特定類型
        for i, group in enumerate(groups):
            ticket_type = creator.detect_commit_type(group[0]['message'])
            if ticket_type == args.type:
                selected_indices.append(i)
    else:
        # 預設創建最近 10 個重要的
        print("⚠️  未指定選擇參數，將創建最近 10 個重要的票券")
        selected_indices = []
        for i, group in enumerate(groups[:20]):  # 從前 20 個中選
            if len(group) > 1:  # 優先選擇合併的
                selected_indices.append(i)
            elif creator.detect_commit_type(group[0]['message']) in ['feature', 'fix']:
                selected_indices.append(i)
            if len(selected_indices) >= 10:
                break
    
    # 創建選定的票券
    print(f"\n📋 準備創建 {len(selected_indices)} 個票券：")
    
    created_count = 0
    for idx in selected_indices:
        if 0 <= idx < len(groups):
            group = groups[idx]
            ticket_type = creator.detect_commit_type(group[0]['message'])
            
            print(f"\n正在創建票券 #{idx+1} ({ticket_type}):")
            if len(group) == 1:
                print(f"  - {group[0]['hash'][:8]} {group[0]['message'][:60]}")
            else:
                print(f"  - 包含 {len(group)} 個 commits")
            
            try:
                filepath = creator.create_grouped_ticket(group)
                print(f"✅ 已創建: {os.path.basename(filepath)}")
                created_count += 1
            except Exception as e:
                print(f"❌ 創建失敗: {str(e)}")
    
    print(f"\n🎉 總共創建了 {created_count} 個票券")

if __name__ == "__main__":
    main()