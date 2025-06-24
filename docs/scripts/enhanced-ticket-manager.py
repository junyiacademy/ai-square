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

class EnhancedTicketManager:
    """增強版票券管理"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.docs_dir = self.project_root / "docs"
        
    def create_ticket_with_files(self, ticket_type: str, name: str, 
                                description: str = None) -> Dict[str, Path]:
        """創建票券並初始化所有相關文件"""
        
        timestamp = datetime.now()
        ticket_id = f"{timestamp.strftime('%Y-%m-%d-%H-%M-%S')}-{name}"
        
        # 創建所有必要的目錄
        paths = {
            'ticket_dir': self.docs_dir / "tickets" / "active",
            'devlog_dir': self.docs_dir / "dev-logs" / timestamp.strftime('%Y-%m-%d'),
            'test_dir': self.docs_dir / "test-reports" / timestamp.strftime('%Y-%m-%d'),
            'spec_dir': self.docs_dir / "specs",
            'story_dir': self.docs_dir / "stories" / timestamp.strftime('%Y-%m')
        }
        
        for path in paths.values():
            path.mkdir(parents=True, exist_ok=True)
        
        # 1. 創建票券文件
        ticket_file = paths['ticket_dir'] / f"{ticket_id}.yml"
        ticket_data = {
            'id': ticket_id,
            'name': name,
            'type': ticket_type,
            'description': description or f'{name} implementation',
            'created_at': timestamp.isoformat(),
            'status': 'active',
            
            # 規格
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
            
            # 文件追蹤
            'files': {
                'ticket': str(ticket_file.relative_to(self.project_root)),
                'devlog': None,
                'test_report': None,
                'spec': None,
                'story': None
            },
            
            # AI 使用追蹤
            'ai_usage': {
                'sessions': [],
                'total_prompt_tokens': 0,
                'total_completion_tokens': 0,
                'total_cost_usd': 0.0,
                'models_used': {}
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
        
        # 2. 創建開發日誌
        devlog_file = paths['devlog_dir'] / f"{ticket_id}-devlog.yml"
        devlog_data = {
            'ticket_id': ticket_id,
            'ticket_name': name,
            'created_at': timestamp.isoformat(),
            'sessions': [{
                'session_id': 1,
                'start_time': timestamp.isoformat(),
                'end_time': None,
                'duration_minutes': 0,
                'activities': [],
                'challenges': [],
                'decisions': [],
                'next_steps': [],
                'files_modified': []
            }]
        }
        
        # 3. 創建測試報告模板
        test_report_file = paths['test_dir'] / f"{ticket_id}-test-report.yml"
        test_report_data = {
            'ticket_id': ticket_id,
            'created_at': timestamp.isoformat(),
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
        }
        
        # 4. 創建規格文件（Markdown）
        spec_file = paths['spec_dir'] / f"{ticket_id}-spec.md"
        spec_content = f"""# {name} 規格說明

## 概述
{description or '待補充'}

## 功能需求

### 核心功能
- [ ] 功能 1
- [ ] 功能 2
- [ ] 功能 3

### 非功能需求
- [ ] 效能：回應時間 < 200ms
- [ ] 安全：輸入驗證
- [ ] 可用性：錯誤處理

## 技術設計

### API 設計
```yaml
endpoint: /api/v1/{name}
method: POST
request:
  field1: string
  field2: number
response:
  status: string
  data: object
```

### 資料模型
```typescript
interface {name.capitalize()} {{
  id: string;
  // 待定義
}}
```

## 測試計劃

### 單元測試
- [ ] 核心邏輯測試
- [ ] 邊界條件測試
- [ ] 錯誤處理測試

### 整合測試
- [ ] API 端對端測試
- [ ] 資料庫整合測試

## 驗收標準
{chr(10).join(f"- [ ] {criterion}" for criterion in ticket_data['spec']['acceptance_criteria'])}
"""
        
        # 寫入所有文件
        with open(ticket_file, 'w', encoding='utf-8') as f:
            yaml.dump(ticket_data, f, default_flow_style=False, allow_unicode=True)
            
        with open(devlog_file, 'w', encoding='utf-8') as f:
            yaml.dump(devlog_data, f, default_flow_style=False, allow_unicode=True)
            
        with open(test_report_file, 'w', encoding='utf-8') as f:
            yaml.dump(test_report_data, f, default_flow_style=False, allow_unicode=True)
            
        with open(spec_file, 'w', encoding='utf-8') as f:
            f.write(spec_content)
        
        # 更新票券文件路徑
        ticket_data['files']['devlog'] = str(devlog_file.relative_to(self.project_root))
        ticket_data['files']['test_report'] = str(test_report_file.relative_to(self.project_root))
        ticket_data['files']['spec'] = str(spec_file.relative_to(self.project_root))
        
        # 重新保存票券
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
        print(f"\n✅ 票券系統已初始化")
        print(f"\n📁 已創建文件:")
        print(f"   - 票券: {ticket_file.relative_to(self.project_root)}")
        print(f"   - 規格: {spec_file.relative_to(self.project_root)}")
        print(f"   - 開發日誌: {devlog_file.relative_to(self.project_root)}")
        print(f"   - 測試報告: {test_report_file.relative_to(self.project_root)}")
        
        print(f"\n📝 下一步:")
        print(f"   1. 編輯規格文件: {spec_file.name}")
        print(f"   2. 開始開發")
        print(f"   3. 使用 'make save' 記錄進度")
        
        return {
            'ticket': ticket_file,
            'devlog': devlog_file,
            'test_report': test_report_file,
            'spec': spec_file
        }
    
    def calculate_actual_duration(self, ticket_path: Path) -> int:
        """計算實際開發時間（基於文件修改時間）"""
        
        with open(ticket_path, 'r', encoding='utf-8') as f:
            ticket_data = yaml.safe_load(f)
        
        # 獲取所有相關文件
        files_to_check = []
        
        # 從 git 獲取當前分支修改的文件
        try:
            result = subprocess.run(
                ['git', 'diff', '--name-only', 'HEAD', 'main'],
                capture_output=True, text=True, check=True
            )
            files_to_check.extend(result.stdout.strip().split('\n'))
        except:
            pass
        
        # 加入 ticket 追蹤的文件
        if 'development' in ticket_data and 'files_changed' in ticket_data['development']:
            files_to_check.extend(ticket_data['development']['files_changed'])
        
        # 計算文件修改時間範圍
        timestamps = []
        for file_path in files_to_check:
            if file_path and os.path.exists(file_path):
                mtime = os.path.getmtime(file_path)
                timestamps.append(mtime)
        
        if timestamps:
            min_time = min(timestamps)
            max_time = max(timestamps)
            duration_seconds = max_time - min_time
            duration_minutes = int(duration_seconds / 60)
            return duration_minutes
        
        return 0
    
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
        
        # 3. 檢查測試狀態
        test_report_path = ticket_data.get('files', {}).get('test_report')
        if test_report_path and os.path.exists(test_report_path):
            with open(test_report_path, 'r', encoding='utf-8') as f:
                test_data = yaml.safe_load(f)
                if test_data.get('summary', {}).get('total_tests', 0) > 0:
                    checklist['tests_written'] = True
                if test_data.get('summary', {}).get('failed', 0) == 0:
                    checklist['tests_passing'] = True
        
        # 4. 檢查 AI metrics
        if ticket_data.get('ai_usage', {}).get('total_prompt_tokens', 0) > 0:
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
        print(f"⏱️  實際開發時間: {duration} 分鐘")
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()