#!/usr/bin/env python3
"""
增強版票券管理器 - 包含完整的文件初始化和管理
"""

import os
import sys
import yaml
import json
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import time

class EnhancedTicketManager:
    """增強版票券管理"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.docs_dir = self.project_root / "docs"
        
    def create_ticket_with_files(self, ticket_type: str, name: str, 
                                description: str = None) -> Dict[str, Path]:
        """創建整合式票券（所有內容在單一檔案中）"""
        
        timestamp = datetime.now()
        # 使用新的命名格式 YYYYMMDD_HHMMSS
        ticket_id = f"{timestamp.strftime('%Y%m%d_%H%M%S')}-{name}"
        
        # 只需要創建票券目錄
        ticket_dir = self.docs_dir / "tickets" / "active"
        ticket_dir.mkdir(parents=True, exist_ok=True)
        
        # 創建整合式票券文件
        ticket_file = ticket_dir / f"{ticket_id}.yml"
        ticket_data = {
            'id': ticket_id,
            'name': name,
            'type': ticket_type,
            'description': description or f'{name} implementation',
            'created_at': timestamp.isoformat(),
            'status': 'active',
            
            
            # 規格內容直接整合
            'spec': {
                'feature': f'{name} 功能',
                'purpose': '[請描述目的]',
                'acceptance_criteria': [
                    '[條件 1]',
                    '[條件 2]',
                    '[條件 3]'
                ],
                'technical_requirements': [
                    '[技術需求 1]',
                    '[技術需求 2]'
                ],
                'out_of_scope': [
                    '[不包含的功能]'
                ]
            },
            
            # 開發日誌直接整合
            'dev_log': {
                'sessions': [{
                    'session_id': 1,
                    'date': timestamp.strftime('%Y-%m-%d'),
                    'start_time': timestamp.strftime('%H:%M:%S'),
                    'end_time': None,
                    'duration_minutes': 0,
                    'activities': [],
                    'challenges': [],
                    'decisions': [],
                    'next_steps': [],
                    'files_modified': [],
                    'ai_interactions': []
                }]
            },
            
            # 測試報告直接整合
            'test_report': {
                'test_runs': [],
                'coverage': {
                    'statements': 0,
                    'branches': 0,
                    'functions': 0,
                    'lines': 0
                },
                'summary': {
                    'total_tests': 0,
                    'passed': 0,
                    'failed': 0,
                    'skipped': 0,
                    'duration_ms': 0
                }
            },
            
            # AI 使用追蹤（基於複雜度估算）
            'ai_usage': {
                'interactions': [],
                'total_interactions': 0,
                'estimated_cost_usd': 0.0,
                'complexity_breakdown': {}
            },
            
            # 時間追蹤（精確計算）
            'time_tracking': {
                'started_at': timestamp.isoformat(),
                'completed_at': None,
                'checkpoints': [],
                'actual_duration_minutes': 0,
                'ai_time_minutes': 0,
                'human_time_minutes': 0
            },
            
            # 開發追蹤
            'development': {
                'branch': f'ticket/{name}',
                'commits': [],
                'files_changed': [],
                'test_coverage': None,
                'code_review_status': 'pending'
            },
            
            # 完成度檢查
            'completion_checklist': {
                'spec_defined': False,
                'code_implemented': False,
                'tests_written': False,
                'tests_passing': False,
                'documentation_updated': False,
                'ai_metrics_recorded': False,
                'story_extracted': False
            }
        }
        
        # 寫入整合式票券文件
        with open(ticket_file, 'w', encoding='utf-8') as f:
            yaml.dump(ticket_data, f, default_flow_style=False, allow_unicode=True)
        
        # 創建分支
        try:
            subprocess.run(['git', 'checkout', 'main'], check=True, capture_output=True)
            subprocess.run(['git', 'checkout', '-b', f'ticket/{name}'], check=True)
            print(f"✅ 分支已創建: ticket/{name}")
        except subprocess.CalledProcessError as e:
            print(f"⚠️  分支創建失敗: {e}")
        
        # 顯示創建結果
        print(f"\n✅ 整合式票券已創建")
        print(f"\n📁 票券檔案: {ticket_file.relative_to(self.project_root)}")
        print(f"\n📝 票券內容包含:")
        print(f"   - 規格定義 (spec)")
        print(f"   - 開發日誌 (dev_log)")
        print(f"   - 測試報告 (test_report)")
        print(f"   - AI 使用追蹤 (ai_usage)")
        print(f"   - 時間追蹤 (time_tracking)")
        print(f"   - 完成度檢查 (completion_checklist)")
        
        print(f"\n📝 下一步:")
        print(f"   1. 編輯票券檔案更新規格")
        print(f"   2. 開始開發")
        print(f"   3. 使用 'make ai-save' 記錄進度")
        
        return {
            'ticket': ticket_file
        }
    
    def calculate_actual_duration(self, ticket_path: Path) -> int:
        """計算實際開發時間（基於文件修改時間）"""
        
        with open(ticket_path, 'r', encoding='utf-8') as f:
            ticket_data = yaml.safe_load(f)
        
        # 獲取開始時間
        start_time = datetime.fromisoformat(ticket_data['time_tracking']['started_at'])
        
        # 獲取所有相關文件
        files_to_check = []
        
        # 1. 從 git 獲取當前分支修改的文件
        try:
            # 獲取當前分支
            current_branch = subprocess.run(
                ['git', 'branch', '--show-current'],
                capture_output=True, text=True, check=True
            ).stdout.strip()
            
            # 獲取與 main 的差異
            result = subprocess.run(
                ['git', 'diff', '--name-only', 'main...HEAD'],
                capture_output=True, text=True, check=True
            )
            if result.stdout:
                files_to_check.extend(result.stdout.strip().split('\n'))
            
            # 也檢查未 commit 的文件
            result = subprocess.run(
                ['git', 'status', '--porcelain'],
                capture_output=True, text=True, check=True
            )
            for line in result.stdout.strip().split('\n'):
                if line:
                    # 取得檔名（去除狀態標記）
                    file_path = line[3:].strip()
                    files_to_check.append(file_path)
        except:
            pass
        
        # 2. 加入 ticket 追蹤的文件
        if 'development' in ticket_data and 'files_changed' in ticket_data['development']:
            files_to_check.extend(ticket_data['development']['files_changed'])
        
        # 3. 計算文件修改時間
        latest_mtime = start_time.timestamp()
        
        for file_path in set(files_to_check):  # 使用 set 去重
            if file_path and os.path.exists(file_path):
                # 排除 docs 目錄下的文件（避免票券自己影響計算）
                if not file_path.startswith('docs/'):
                    mtime = os.path.getmtime(file_path)
                    if mtime > latest_mtime:
                        latest_mtime = mtime
        
        # 計算時間差
        duration_seconds = latest_mtime - start_time.timestamp()
        duration_minutes = max(int(duration_seconds / 60), 0)
        
        # 更新票券
        ticket_data['time_tracking']['actual_duration_minutes'] = duration_minutes
        
        # 記錄檔案清單
        ticket_data['development']['files_changed'] = list(set(files_to_check))
        
        # 保存更新
        with open(ticket_path, 'w', encoding='utf-8') as f:
            yaml.dump(ticket_data, f, default_flow_style=False, allow_unicode=True)
        
        return duration_minutes
    
    def check_completion_status(self, ticket_path: Path) -> Dict[str, bool]:
        """檢查票券完成狀態"""
        
        with open(ticket_path, 'r', encoding='utf-8') as f:
            ticket_data = yaml.safe_load(f)
        
        checklist = ticket_data.get('completion_checklist', {})
        
        # 自動檢查一些項目
        # 1. 檢查規格是否定義
        if ticket_data.get('spec', {}).get('purpose') != '[請描述目的]':
            checklist['spec_defined'] = True
        
        # 2. 檢查是否有代碼變更
        if ticket_data.get('development', {}).get('files_changed'):
            checklist['code_implemented'] = True
        
        # 3. 檢查測試狀態（從整合的 test_report 中）
        test_report = ticket_data.get('test_report', {})
        if test_report.get('summary', {}).get('total_tests', 0) > 0:
            checklist['tests_written'] = True
            if test_report.get('summary', {}).get('failed', 0) == 0:
                checklist['tests_passing'] = True
        
        # 4. 檢查 AI metrics
        if ticket_data.get('ai_usage', {}).get('total_interactions', 0) > 0:
            checklist['ai_metrics_recorded'] = True
        
        # 更新票券
        ticket_data['completion_checklist'] = checklist
        with open(ticket_path, 'w', encoding='utf-8') as f:
            yaml.dump(ticket_data, f, default_flow_style=False, allow_unicode=True)
        
        return checklist


def main():
    """主程式"""
    import argparse
    
    parser = argparse.ArgumentParser(description='增強版票券管理器')
    subparsers = parser.add_subparsers(dest='command', help='命令')
    
    # init 命令 - 初始化所有文件
    init_parser = subparsers.add_parser('init', help='初始化票券和所有相關文件')
    init_parser.add_argument('--type', choices=['feature', 'fix', 'refactor'], 
                            default='feature', help='票券類型')
    init_parser.add_argument('--name', required=True, help='票券名稱')
    init_parser.add_argument('--desc', help='描述')
    
    # check 命令 - 檢查完成狀態
    check_parser = subparsers.add_parser('check', help='檢查票券完成狀態')
    check_parser.add_argument('--ticket', help='票券路徑')
    
    # duration 命令 - 計算實際時間
    duration_parser = subparsers.add_parser('duration', help='計算實際開發時間')
    duration_parser.add_argument('--ticket', help='票券路徑')
    
    # checkpoint 命令 - 記錄檢查點
    checkpoint_parser = subparsers.add_parser('checkpoint', help='記錄時間檢查點')
    checkpoint_parser.add_argument('--desc', help='檢查點描述')
    
    args = parser.parse_args()
    
    manager = EnhancedTicketManager()
    
    if args.command == 'init':
        manager.create_ticket_with_files(args.type, args.name, args.desc)
        
    elif args.command == 'check':
        # 找到活躍票券
        if not args.ticket:
            active_dir = manager.docs_dir / "tickets" / "active"
            tickets = list(active_dir.glob("*.yml"))
            if tickets:
                args.ticket = tickets[0]
            else:
                print("❌ 沒有找到活躍的票券")
                return
        
        checklist = manager.check_completion_status(Path(args.ticket))
        
        print("📋 完成度檢查:")
        for item, status in checklist.items():
            icon = "✅" if status else "❌"
            print(f"   {icon} {item.replace('_', ' ').title()}")
        
        # 計算完成度
        completed = sum(1 for v in checklist.values() if v)
        total = len(checklist)
        percentage = (completed / total) * 100 if total > 0 else 0
        
        print(f"\n📊 完成度: {completed}/{total} ({percentage:.1f}%)")
        
    elif args.command == 'duration':
        if not args.ticket:
            active_dir = manager.docs_dir / "tickets" / "active"
            tickets = list(active_dir.glob("*.yml"))
            if tickets:
                args.ticket = tickets[0]
        
        duration = manager.calculate_actual_duration(Path(args.ticket))
        hours = duration // 60
        minutes = duration % 60
        if hours > 0:
            print(f"⏱️  實際開發時間: {hours} 小時 {minutes} 分鐘")
        else:
            print(f"⏱️  實際開發時間: {duration} 分鐘")
    
    elif args.command == 'checkpoint':
        # 記錄檢查點
        if not args.ticket:
            active_dir = manager.docs_dir / "tickets" / "active"
            tickets = list(active_dir.glob("*.yml"))
            if tickets:
                args.ticket = tickets[0]
        
        if args.ticket:
            with open(args.ticket, 'r', encoding='utf-8') as f:
                ticket_data = yaml.safe_load(f)
            
            checkpoint = {
                'timestamp': datetime.now().isoformat(),
                'description': args.desc or '進度檢查點',
                'duration_so_far': manager.calculate_actual_duration(Path(args.ticket))
            }
            
            if 'checkpoints' not in ticket_data['time_tracking']:
                ticket_data['time_tracking']['checkpoints'] = []
            
            ticket_data['time_tracking']['checkpoints'].append(checkpoint)
            
            with open(args.ticket, 'w', encoding='utf-8') as f:
                yaml.dump(ticket_data, f, default_flow_style=False, allow_unicode=True)
            
            print(f"✅ 已記錄檢查點: {checkpoint['description']}")
            print(f"   目前時間: {checkpoint['duration_so_far']} 分鐘")
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()