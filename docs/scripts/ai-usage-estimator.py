#!/usr/bin/env python3
"""
AI 使用估算器 - 為 Claude Code 設計的簡化版本
基於對話次數和複雜度估算，而非精確 token 計算
"""

import os
import yaml
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

class AIUsageEstimator:
    """AI 使用估算（適用於 Claude Code）"""
    
    # 簡化的估算規則
    COMPLEXITY_MULTIPLIER = {
        'simple': 1.0,      # 簡單查詢、小修改
        'medium': 3.0,      # 一般功能開發
        'complex': 5.0,     # 複雜功能、大重構
        'debug': 2.0        # 除錯、問題解決
    }
    
    # 每次對話的基礎成本估算（美元）
    BASE_COST_PER_INTERACTION = 0.05
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.tickets_dir = self.project_root / "docs" / "tickets"
    
    def record_interaction(self, 
                         complexity: str = 'medium',
                         task_type: str = 'development',
                         description: str = None,
                         mark_start: bool = False) -> Dict:
        """記錄一次 AI 互動"""
        
        # 找到當前活躍的票券
        active_ticket = self._get_active_ticket()
        if not active_ticket:
            print("❌ 沒有找到活躍的票券")
            return {}
        
        with open(active_ticket, 'r', encoding='utf-8') as f:
            ticket_data = yaml.safe_load(f)
        
        # 初始化 ai_usage 如果不存在
        if 'ai_usage' not in ticket_data:
            ticket_data['ai_usage'] = {
                'interactions': [],
                'total_interactions': 0,
                'estimated_cost_usd': 0.0,
                'complexity_breakdown': {}
            }
        
        # 計算估算成本
        multiplier = self.COMPLEXITY_MULTIPLIER.get(complexity, 1.0)
        estimated_cost = self.BASE_COST_PER_INTERACTION * multiplier
        
        # 記錄互動
        interaction = {
            'timestamp': datetime.now().isoformat(),
            'task_type': task_type,
            'complexity': complexity,
            'description': description or f'{task_type} - {complexity}',
            'estimated_cost': estimated_cost,
            'is_start_marker': mark_start
        }
        
        # 如果是開始標記，也記錄到 session
        if mark_start:
            # 找到或創建當前 session
            dev_log = ticket_data.get('dev_log', {})
            sessions = dev_log.get('sessions', [])
            
            if sessions and not sessions[-1].get('end_time'):
                # 更新現有 session
                sessions[-1]['last_activity'] = datetime.now().isoformat()
            else:
                # 創建新 session
                new_session = {
                    'session_id': len(sessions) + 1,
                    'date': datetime.now().strftime('%Y-%m-%d'),
                    'start_time': datetime.now().strftime('%H:%M:%S'),
                    'end_time': None,
                    'duration_minutes': 0,
                    'activities': [{
                        'time': datetime.now().strftime('%H:%M'),
                        'action': f'開始任務: {description or task_type}'
                    }],
                    'ai_interactions': []
                }
                sessions.append(new_session)
                dev_log['sessions'] = sessions
                ticket_data['dev_log'] = dev_log
        
        # 更新統計
        usage = ticket_data['ai_usage']
        usage['interactions'].append(interaction)
        usage['total_interactions'] += 1
        usage['estimated_cost_usd'] += estimated_cost
        
        # 更新複雜度分布
        complexity_key = f'{complexity}_count'
        usage['complexity_breakdown'][complexity_key] = \
            usage['complexity_breakdown'].get(complexity_key, 0) + 1
        
        # 儲存回票券
        with open(active_ticket, 'w', encoding='utf-8') as f:
            yaml.dump(ticket_data, f, default_flow_style=False, allow_unicode=True)
        
        return {
            'interaction_count': usage['total_interactions'],
            'session_cost': estimated_cost,
            'total_cost': usage['estimated_cost_usd']
        }
    
    def _get_active_ticket(self) -> Optional[Path]:
        """獲取當前活躍的票券"""
        active_dir = self.tickets_dir / "active"
        if not active_dir.exists():
            active_dir = self.tickets_dir / "active"
            if active_dir.exists():
                active_dir = active_dir
        
        tickets = list(active_dir.glob("*.yml"))
        if tickets:
            return max(tickets, key=lambda p: p.stat().st_mtime)
        return None
    
    def generate_report(self) -> str:
        """生成 AI 使用報告"""
        active_ticket = self._get_active_ticket()
        if not active_ticket:
            return "❌ 沒有找到活躍的票券"
        
        with open(active_ticket, 'r', encoding='utf-8') as f:
            ticket_data = yaml.safe_load(f)
        
        usage = ticket_data.get('ai_usage', {})
        
        if not usage.get('interactions'):
            return "📊 尚未記錄任何 AI 互動"
        
        report = f"""
AI 使用報告 (Claude Code)
========================

票券: {ticket_data.get('name', 'Unknown')}

📊 總體統計:
- 互動次數: {usage.get('total_interactions', 0)}
- 估算成本: ${usage.get('estimated_cost_usd', 0):.2f}
- 平均每次: ${usage.get('estimated_cost_usd', 0) / max(usage.get('total_interactions', 1), 1):.2f}

📈 複雜度分布:
"""
        
        # 顯示複雜度分布
        breakdown = usage.get('complexity_breakdown', {})
        for complexity in ['simple', 'medium', 'complex', 'debug']:
            count = breakdown.get(f'{complexity}_count', 0)
            if count > 0:
                percentage = (count / usage.get('total_interactions', 1)) * 100
                report += f"- {complexity.capitalize()}: {count} 次 ({percentage:.1f}%)\n"
        
        # 顯示最近的互動
        report += "\n🕐 最近 5 次互動:\n"
        recent = usage.get('interactions', [])[-5:]
        for interaction in reversed(recent):
            timestamp = interaction['timestamp'].split('T')[1].split('.')[0]
            cost = interaction.get('estimated_cost', interaction.get('total_cost', 0))
            report += f"- [{timestamp}] {interaction['description']} (${cost:.2f})\n"
        
        return report


def main():
    """主程式"""
    import argparse
    
    parser = argparse.ArgumentParser(description='AI 使用估算器 (Claude Code)')
    subparsers = parser.add_subparsers(dest='command', help='命令')
    
    # record 命令
    record_parser = subparsers.add_parser('record', help='記錄 AI 互動')
    record_parser.add_argument('--complexity', 
                              choices=['simple', 'medium', 'complex', 'debug'],
                              default='medium',
                              help='任務複雜度')
    record_parser.add_argument('--type',
                              default='development',
                              help='任務類型 (development/debug/refactor/review)')
    record_parser.add_argument('--desc',
                              help='簡短描述')
    record_parser.add_argument('--start', action='store_true',
                              help='標記為任務開始')
    
    # report 命令
    report_parser = subparsers.add_parser('report', help='生成報告')
    
    args = parser.parse_args()
    
    estimator = AIUsageEstimator()
    
    if args.command == 'record':
        result = estimator.record_interaction(
            complexity=args.complexity,
            task_type=args.type,
            description=args.desc,
            mark_start=args.start
        )
        if result:
            print(f"✅ 已記錄 AI 互動 #{result['interaction_count']}")
            print(f"   本次成本: ${result['session_cost']:.2f}")
            print(f"   累計成本: ${result['total_cost']:.2f}")
    
    elif args.command == 'report':
        report = estimator.generate_report()
        print(report)
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()