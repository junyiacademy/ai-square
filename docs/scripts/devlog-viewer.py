#!/usr/bin/env python3
"""
開發日誌檢視器 - 從票券中提取並顯示開發日誌
"""

import yaml
from datetime import datetime
from pathlib import Path
from typing import Optional
import argparse

class DevLogViewer:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.tickets_dir = self.project_root / "docs" / "tickets"
    
    def get_active_ticket(self) -> Optional[Path]:
        """獲取當前活躍票券"""
        active_dir = self.tickets_dir / "active"
        if not active_dir.exists():
            active_dir = self.tickets_dir / "active"
        
        tickets = list(active_dir.glob("*.yml"))
        if tickets:
            return max(tickets, key=lambda p: p.stat().st_mtime)
        return None
    
    def display_devlog(self, ticket_path: Path, session_id: Optional[int] = None):
        """顯示開發日誌（從整合式票券中讀取）"""
        with open(ticket_path, 'r', encoding='utf-8') as f:
            ticket_data = yaml.safe_load(f)
        
        print(f"📋 開發日誌 - {ticket_data.get('name', 'Unknown')}")
        print("=" * 60)
        
        # 從整合式票券中讀取 dev_log
        dev_log = ticket_data.get('dev_log', {})
        sessions = dev_log.get('sessions', [])
        
        if not sessions:
            print("❌ 尚無開發日誌")
            return
        
        # 顯示特定 session 或所有
        if session_id:
            sessions = [s for s in sessions if s.get('session_id') == session_id]
        
        for session in sessions:
            self._display_session(session)
    
    def _display_session(self, session: dict):
        """顯示單個 session"""
        print(f"\n🔹 Session {session.get('session_id', '?')}")
        print(f"   日期: {session.get('date', 'Unknown')}")
        print(f"   時間: {session.get('start_time', '?')} - {session.get('end_time', '進行中')}")
        print(f"   時長: {session.get('duration_minutes', 0)} 分鐘")
        
        # 活動
        activities = session.get('activities', [])
        if activities:
            print("\n   📝 活動:")
            for act in activities:
                print(f"      [{act.get('time', '?')}] {act.get('action', '')}")
                if act.get('files'):
                    print(f"            檔案: {', '.join(act['files'])}")
        
        # 挑戰
        challenges = session.get('challenges', [])
        if challenges:
            print("\n   🔧 挑戰:")
            for ch in challenges:
                print(f"      - {ch.get('description', '')}")
                if ch.get('solution'):
                    print(f"        解決: {ch['solution']}")
        
        # AI 互動
        ai_interactions = session.get('ai_interactions', [])
        if ai_interactions:
            print("\n   🤖 AI 互動:")
            for ai in ai_interactions:
                print(f"      [{ai.get('time', '?')}] {ai.get('task', '')} ({ai.get('complexity', 'medium')})")
    
    def add_activity(self, ticket_path: Path, action: str, files: list = None):
        """添加新活動到當前 session"""
        with open(ticket_path, 'r', encoding='utf-8') as f:
            ticket_data = yaml.safe_load(f)
        
        # 確保結構存在
        if 'dev_log' not in ticket_data:
            ticket_data['dev_log'] = {'sessions': []}
        
        sessions = ticket_data['dev_log']['sessions']
        
        # 找到或創建當前 session
        today = datetime.now().strftime('%Y-%m-%d')
        current_session = None
        
        for session in sessions:
            if session.get('date') == today and not session.get('end_time'):
                current_session = session
                break
        
        if not current_session:
            # 創建新 session
            current_session = {
                'session_id': len(sessions) + 1,
                'date': today,
                'start_time': datetime.now().strftime('%H:%M:%S'),
                'end_time': None,
                'duration_minutes': 0,
                'activities': [],
                'challenges': [],
                'ai_interactions': []
            }
            sessions.append(current_session)
        
        # 添加活動
        activity = {
            'time': datetime.now().strftime('%H:%M'),
            'action': action
        }
        if files:
            activity['files'] = files
        
        current_session['activities'].append(activity)
        
        # 保存
        with open(ticket_path, 'w', encoding='utf-8') as f:
            yaml.dump(ticket_data, f, default_flow_style=False, allow_unicode=True)
        
        print(f"✅ 活動已記錄到整合式票券: {action}")
    
    def generate_summary(self, ticket_path: Path) -> str:
        """生成開發日誌摘要（從整合式票券）"""
        with open(ticket_path, 'r', encoding='utf-8') as f:
            ticket_data = yaml.safe_load(f)
        
        # 從整合式票券中讀取
        dev_log = ticket_data.get('dev_log', {})
        sessions = dev_log.get('sessions', [])
        
        if not sessions:
            return "無開發日誌"
        
        total_time = sum(s.get('duration_minutes', 0) for s in sessions)
        total_activities = sum(len(s.get('activities', [])) for s in sessions)
        total_challenges = sum(len(s.get('challenges', [])) for s in sessions)
        total_ai = sum(len(s.get('ai_interactions', [])) for s in sessions)
        
        summary = f"""
開發日誌摘要:
- Sessions: {len(sessions)}
- 總時間: {total_time} 分鐘
- 活動數: {total_activities}
- 挑戰數: {total_challenges}
- AI 互動: {total_ai}
"""
        return summary


def main():
    parser = argparse.ArgumentParser(description='開發日誌檢視器')
    subparsers = parser.add_subparsers(dest='command', help='命令')
    
    # view 命令
    view_parser = subparsers.add_parser('view', help='檢視開發日誌')
    view_parser.add_argument('--session', type=int, help='特定 session ID')
    
    # add 命令
    add_parser = subparsers.add_parser('add', help='添加活動')
    add_parser.add_argument('action', help='活動描述')
    add_parser.add_argument('--files', nargs='+', help='相關檔案')
    
    # summary 命令
    summary_parser = subparsers.add_parser('summary', help='顯示摘要')
    
    args = parser.parse_args()
    
    viewer = DevLogViewer()
    
    # 獲取活躍票券
    ticket = viewer.get_active_ticket()
    if not ticket:
        print("❌ 沒有找到活躍的票券")
        return
    
    if args.command == 'view':
        viewer.display_devlog(ticket, args.session)
    elif args.command == 'add':
        viewer.add_activity(ticket, args.action, args.files)
    elif args.command == 'summary':
        summary = viewer.generate_summary(ticket)
        print(summary)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()