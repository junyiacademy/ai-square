#!/usr/bin/env python3
"""
現代化票券管理器 - 極簡版
專注於效率和 AI 友善的設計
"""

import os
import sys
import yaml
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

class ModernTicketManager:
    """現代化票券管理"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.tickets_dir = self.project_root / "docs" / "tickets"
        self.template_file = self.project_root / "docs" / "templates" / "modern-ticket.yml"
        
    def create_ticket(self, ticket_type: str, name: str, auto_branch: bool = True) -> str:
        """創建極簡票券"""
        
        # 生成票券 ID
        timestamp = datetime.now()
        ticket_id = f"{timestamp.strftime('%Y-%m-%d-%H-%M-%S')}-{name}"
        
        # 創建票券資料
        ticket_data = {
            'id': ticket_id,
            'name': name,
            'type': ticket_type,
            'created_at': timestamp.isoformat(),
            'status': 'in_progress',
            
            # 極簡規格 - 讓使用者填寫
            'spec': {
                'feature': f'{name} 功能',
                'purpose': '[請描述目的]',
                'acceptance_criteria': [
                    '[條件 1]',
                    '[條件 2]'
                ]
            },
            
            # AI 使用追蹤
            'ai_usage': {
                'model': None,
                'sessions': [],
                'total_prompt_tokens': 0,
                'total_completion_tokens': 0,
                'total_cost_usd': 0.0
            },
            
            # 時間追蹤
            'time_tracking': {
                'started_at': timestamp.isoformat(),
                'completed_at': None,
                'ai_time_minutes': 0,
                'human_time_minutes': 0
            },
            
            # 開發記錄
            'development': {
                'branch': f'ticket/{name}',
                'commits': [],
                'files_changed': [],
                'test_coverage': None
            }
        }
        
        # 確保目錄存在
        in_progress_dir = self.tickets_dir / "in_progress"
        in_progress_dir.mkdir(parents=True, exist_ok=True)
        
        # 寫入票券檔案
        ticket_file = in_progress_dir / f"{ticket_id}-ticket-{name}.yml"
        with open(ticket_file, 'w', encoding='utf-8') as f:
            yaml.dump(ticket_data, f, default_flow_style=False, allow_unicode=True)
        
        print(f"✅ 票券已創建: {ticket_file.name}")
        
        # 自動創建分支
        if auto_branch:
            branch_name = f"ticket/{name}"
            try:
                # 確保在 main 分支
                subprocess.run(['git', 'checkout', 'main'], check=True, capture_output=True)
                # 創建新分支
                subprocess.run(['git', 'checkout', '-b', branch_name], check=True)
                print(f"✅ 分支已創建: {branch_name}")
            except subprocess.CalledProcessError as e:
                print(f"⚠️  分支創建失敗: {e}")
        
        # 顯示下一步
        print("\n📝 請編輯票券規格:")
        print(f"   {ticket_file}")
        print("\n💡 下一步:")
        print("   1. 編輯 spec 部分")
        print("   2. 開始開發")
        print("   3. 使用 'make save' 保存進度")
        
        return str(ticket_file)
    
    def get_active_ticket(self) -> Optional[Path]:
        """獲取當前活躍的票券"""
        in_progress_dir = self.tickets_dir / "in_progress"
        if not in_progress_dir.exists():
            return None
            
        tickets = list(in_progress_dir.glob("*.yml"))
        if not tickets:
            return None
            
        # 返回最新的票券
        return max(tickets, key=lambda p: p.stat().st_mtime)
    
    def update_ai_usage(self, ticket_path: Path, model: str, 
                       prompt_tokens: int, completion_tokens: int) -> Dict:
        """更新 AI 使用記錄"""
        with open(ticket_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
        
        # 更新 AI 使用
        usage = data.get('ai_usage', {})
        usage['total_prompt_tokens'] += prompt_tokens
        usage['total_completion_tokens'] += completion_tokens
        
        # 計算成本（簡化版）
        cost_per_1k = 0.01  # 每 1K tokens 的成本
        total_tokens = prompt_tokens + completion_tokens
        cost = (total_tokens / 1000) * cost_per_1k
        usage['total_cost_usd'] += cost
        
        # 記錄 session
        session = {
            'timestamp': datetime.now().isoformat(),
            'model': model,
            'prompt_tokens': prompt_tokens,
            'completion_tokens': completion_tokens,
            'cost_usd': cost
        }
        usage.setdefault('sessions', []).append(session)
        
        data['ai_usage'] = usage
        
        # 寫回檔案
        with open(ticket_path, 'w', encoding='utf-8') as f:
            yaml.dump(data, f, default_flow_style=False, allow_unicode=True)
        
        return {
            'total_tokens': total_tokens,
            'cost': cost,
            'total_cost': usage['total_cost_usd']
        }


def main():
    """主程式"""
    import argparse
    
    parser = argparse.ArgumentParser(description='現代化票券管理器')
    subparsers = parser.add_subparsers(dest='command', help='命令')
    
    # create 命令
    create_parser = subparsers.add_parser('create', help='創建新票券')
    create_parser.add_argument('--type', choices=['feature', 'fix', 'refactor'], 
                              default='feature', help='票券類型')
    create_parser.add_argument('--name', required=True, help='票券名稱')
    create_parser.add_argument('--auto-branch', action='store_true', 
                              default=True, help='自動創建分支')
    
    # status 命令
    status_parser = subparsers.add_parser('status', help='查看票券狀態')
    
    args = parser.parse_args()
    
    manager = ModernTicketManager()
    
    if args.command == 'create':
        manager.create_ticket(args.type, args.name, args.auto_branch)
    elif args.command == 'status':
        ticket = manager.get_active_ticket()
        if ticket:
            print(f"當前活躍票券: {ticket.name}")
        else:
            print("沒有活躍的票券")
    else:
        parser.print_help()


if __name__ == '__main__':
    main()