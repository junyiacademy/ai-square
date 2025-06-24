#!/usr/bin/env python3
"""
AI 使用指標追蹤器
自動記錄 AI 的 token 使用量、成本和效率
"""

import os
import yaml
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

class AIMetricsTracker:
    """追蹤 AI 使用指標"""
    
    # Token 價格（每 1M tokens）
    PRICING = {
        'claude-3-opus': {'input': 15.00, 'output': 75.00},
        'claude-3-sonnet': {'input': 3.00, 'output': 15.00},
        'gpt-4o': {'input': 5.00, 'output': 15.00},
        'gpt-4o-mini': {'input': 0.15, 'output': 0.60}
    }
    
    def __init__(self, ticket_path: str):
        self.ticket_path = Path(ticket_path)
        self.ticket_data = self._load_ticket()
        
    def _load_ticket(self) -> Dict:
        """載入票券資料"""
        if self.ticket_path.exists():
            with open(self.ticket_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        return {}
    
    def track_ai_usage(self, 
                      model: str,
                      prompt_tokens: int,
                      completion_tokens: int,
                      prompt: str,
                      response_summary: str = ""):
        """記錄 AI 使用情況"""
        
        # 計算成本
        total_tokens = prompt_tokens + completion_tokens
        cost = self._calculate_cost(model, prompt_tokens, completion_tokens)
        
        # 初始化 ai_usage 如果不存在
        if 'ai_usage' not in self.ticket_data:
            self.ticket_data['ai_usage'] = {
                'sessions': [],
                'total_prompt_tokens': 0,
                'total_completion_tokens': 0,
                'total_cost_usd': 0.0
            }
        
        # 記錄本次使用
        session = {
            'timestamp': datetime.now().isoformat(),
            'model': model,
            'prompt_tokens': prompt_tokens,
            'completion_tokens': completion_tokens,
            'total_tokens': total_tokens,
            'cost_usd': cost,
            'prompt_summary': prompt[:100] + '...' if len(prompt) > 100 else prompt,
            'response_summary': response_summary
        }
        
        # 更新總計
        usage = self.ticket_data['ai_usage']
        usage['sessions'].append(session)
        usage['total_prompt_tokens'] += prompt_tokens
        usage['total_completion_tokens'] += completion_tokens
        usage['total_cost_usd'] += cost
        
        # 儲存回票券
        self._save_ticket()
        
        return {
            'tokens': total_tokens,
            'cost': cost,
            'efficiency': self._calculate_efficiency()
        }
    
    def _calculate_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> float:
        """計算使用成本"""
        if model not in self.PRICING:
            return 0.0
            
        pricing = self.PRICING[model]
        input_cost = (prompt_tokens / 1_000_000) * pricing['input']
        output_cost = (completion_tokens / 1_000_000) * pricing['output']
        
        return round(input_cost + output_cost, 4)
    
    def _calculate_efficiency(self) -> Dict:
        """計算 AI 使用效率"""
        usage = self.ticket_data.get('ai_usage', {})
        sessions = usage.get('sessions', [])
        
        if not sessions:
            return {'tokens_per_minute': 0, 'cost_per_hour': 0}
        
        # 計算總時間（分鐘）
        ai_time = self.ticket_data.get('ai_time_minutes', 1)
        if ai_time == 0:
            ai_time = 1
            
        total_tokens = usage.get('total_prompt_tokens', 0) + usage.get('total_completion_tokens', 0)
        total_cost = usage.get('total_cost_usd', 0)
        
        return {
            'tokens_per_minute': round(total_tokens / ai_time, 2),
            'cost_per_hour': round((total_cost / ai_time) * 60, 2),
            'sessions_count': len(sessions),
            'avg_tokens_per_session': round(total_tokens / len(sessions), 2) if sessions else 0
        }
    
    def _save_ticket(self):
        """儲存票券資料"""
        with open(self.ticket_path, 'w', encoding='utf-8') as f:
            yaml.dump(self.ticket_data, f, default_flow_style=False, allow_unicode=True)
    
    def generate_report(self) -> str:
        """生成 AI 使用報告"""
        usage = self.ticket_data.get('ai_usage', {})
        efficiency = self._calculate_efficiency()
        
        report = f"""
AI 使用指標報告
==============

總使用量:
- Prompt Tokens: {usage.get('total_prompt_tokens', 0):,}
- Completion Tokens: {usage.get('total_completion_tokens', 0):,}
- 總 Tokens: {usage.get('total_prompt_tokens', 0) + usage.get('total_completion_tokens', 0):,}
- 總成本: ${usage.get('total_cost_usd', 0):.2f}

效率指標:
- Tokens/分鐘: {efficiency['tokens_per_minute']:,}
- 成本/小時: ${efficiency['cost_per_hour']:.2f}
- 對話次數: {efficiency['sessions_count']}
- 平均 Tokens/對話: {efficiency['avg_tokens_per_session']:,}

模型使用分布:
"""
        # 統計各模型使用
        model_stats = {}
        for session in usage.get('sessions', []):
            model = session['model']
            if model not in model_stats:
                model_stats[model] = {'count': 0, 'tokens': 0, 'cost': 0}
            model_stats[model]['count'] += 1
            model_stats[model]['tokens'] += session['total_tokens']
            model_stats[model]['cost'] += session['cost_usd']
        
        for model, stats in model_stats.items():
            report += f"- {model}: {stats['count']} 次, {stats['tokens']:,} tokens, ${stats['cost']:.2f}\n"
        
        return report


def main():
    """主程式"""
    import argparse
    
    parser = argparse.ArgumentParser(description='AI 使用指標追蹤器')
    parser.add_argument('action', choices=['track', 'report'], help='執行動作')
    parser.add_argument('--ticket', help='票券路徑')
    parser.add_argument('--model', help='AI 模型名稱')
    parser.add_argument('--prompt-tokens', type=int, help='Prompt tokens')
    parser.add_argument('--completion-tokens', type=int, help='Completion tokens')
    parser.add_argument('--prompt', help='Prompt 內容')
    
    args = parser.parse_args()
    
    # 找到當前活躍的票券
    if not args.ticket:
        in_progress = Path('docs/tickets/in_progress')
        tickets = list(in_progress.glob('*.yml'))
        if not tickets:
            print("❌ 沒有找到活躍的票券")
            return
        args.ticket = str(tickets[0])
    
    tracker = AIMetricsTracker(args.ticket)
    
    if args.action == 'track':
        if not all([args.model, args.prompt_tokens, args.completion_tokens]):
            print("❌ 追蹤需要提供 model, prompt-tokens, completion-tokens")
            return
            
        result = tracker.track_ai_usage(
            model=args.model,
            prompt_tokens=args.prompt_tokens,
            completion_tokens=args.completion_tokens,
            prompt=args.prompt or "未提供"
        )
        
        print(f"✅ 已記錄 AI 使用：{result['tokens']} tokens, ${result['cost']:.4f}")
        
    elif args.action == 'report':
        report = tracker.generate_report()
        print(report)


if __name__ == '__main__':
    main()