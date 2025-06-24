#!/usr/bin/env python3
"""
增強版 Ticket 管理系統 - 整合文件參考追蹤
"""

import yaml
import json
import sys
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

# 加入文件參考追蹤
sys.path.append(str(Path(__file__).parent))
try:
    from auto_document_reference import AutoDocumentReference
    from document_reference_tracker import SmartReferenceTracker
except ImportError:
    AutoDocumentReference = None
    SmartReferenceTracker = None

class EnhancedTicketManager:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.tickets_dir = self.project_root / "docs" / "tickets"
        self.tickets_dir.mkdir(parents=True, exist_ok=True)
        
        # 創建狀態資料夾
        (self.tickets_dir / "in_progress").mkdir(exist_ok=True)
        (self.tickets_dir / "completed").mkdir(exist_ok=True)
        
        # 初始化文件參考追蹤器
        self.doc_tracker = AutoDocumentReference() if AutoDocumentReference else None
        
    def create_ticket(self, ticket_name: str, ticket_type: str = "feature", 
                     description: str = "", create_branch: bool = True) -> Dict:
        """創建新的 ticket (增強版含文件追蹤)"""
        timestamp = datetime.now()
        date_str = timestamp.strftime('%Y-%m-%d')
        time_str = timestamp.strftime('%H-%M-%S')
        
        # Ticket 資料
        ticket_data = {
            'id': f"{date_str}-{time_str}-{ticket_name}",
            'name': ticket_name,
            'type': ticket_type,
            'description': description,
            'status': 'in_progress',
            'created_at': timestamp.isoformat(),
            'started_at': timestamp.isoformat(),
            'completed_at': None,
            'duration_minutes': None,
            'ai_time_minutes': None,
            'human_time_minutes': None,
            'commit_hash': None,
            'files_changed': [],
            'date': date_str,
            'time': time_str
        }
        
        # 準備票券檔案路徑
        status_dir = self.tickets_dir / "in_progress"
        status_dir.mkdir(exist_ok=True)
        ticket_filename = f"{date_str}-{time_str}-ticket-{ticket_name}.yml"
        ticket_file = status_dir / ticket_filename
        
        # 獲取應該參考的文件
        initial_refs = []
        if SmartReferenceTracker:
            initial_refs = SmartReferenceTracker.get_references_for_task('ticket_creation', ticket_type)
        else:
            # 手動定義基本參考
            initial_refs = [
                {
                    'doc': 'docs/handbook/workflows/TICKET_DRIVEN_DEVELOPMENT.md',
                    'reason': '遵循票券驅動開發流程'
                },
                {
                    'doc': 'docs/handbook/01-context/business-rules.md',
                    'reason': '確保符合業務規則'
                }
            ]
            if ticket_type == 'feature':
                initial_refs.extend([
                    {
                        'doc': 'docs/handbook/01-context/product-vision.md',
                        'reason': '理解產品目標和方向'
                    },
                    {
                        'doc': 'docs/handbook/01-context/domain-knowledge.md',
                        'reason': '參考 AI 素養領域知識'
                    }
                ])
            elif ticket_type == 'bug':
                initial_refs.append({
                    'doc': 'docs/handbook/03-technical-references/core-practices/tdd.md',
                    'reason': '編寫測試用例重現 bug'
                })
            elif ticket_type == 'refactor':
                initial_refs.append({
                    'doc': 'docs/handbook/03-technical-references/design-patterns/',
                    'reason': '參考設計模式最佳實踐'
                })
        
        # 將 spec 內容和文件參考直接加入票券
        ticket_data['spec'] = {
            'goals': '[待補充]',
            'technical_specs': '[待補充]',
            'acceptance_criteria': ['[待定義]']
        }
        
        # 將參考文件資訊加入票券
        ticket_data['document_references'] = [
            {'path': ref['doc'], 'reason': ref['reason']} 
            for ref in initial_refs
        ]
        
        # 儲存完整的票券資料
        with open(ticket_file, 'w', encoding='utf-8') as f:
            yaml.dump(ticket_data, f, allow_unicode=True, sort_keys=False)
        
        print(f"📝 Ticket 已創建: {ticket_file}")
        print(f"🕐 開始時間: {timestamp.strftime('%H:%M:%S')}")
        print("📚 已記錄相關參考文件")
        print("📦 Spec 內容已包含在票券中")
        
        # 創建對應的 branch
        if create_branch:
            branch_name = f"ticket/{ticket_name}"
            try:
                # 確保在最新的 main
                subprocess.run(["git", "checkout", "main"], check=True, capture_output=True)
                subprocess.run(["git", "pull", "--rebase"], capture_output=True)
                
                # 創建並切換到新 branch
                result = subprocess.run(
                    ["git", "checkout", "-b", branch_name],
                    capture_output=True,
                    text=True
                )
                
                if result.returncode == 0:
                    print(f"🌿 已創建並切換到 branch: {branch_name}")
                    ticket_data['branch'] = branch_name
                else:
                    print(f"⚠️  無法創建 branch: {result.stderr}")
                    
            except Exception as e:
                print(f"⚠️  Branch 操作失敗: {e}")
        
        return ticket_data
    
    def track_development(self, stage: str, files: list = None):
        """追蹤開發階段的文件參考"""
        # 找到當前活動的票券
        active_ticket = self.get_active_ticket()
        if not active_ticket:
            print("⚠️ 沒有活動的票券，無法追蹤文件參考")
            return
            
        # 找到票券檔案
        ticket_file = None
        in_progress_dir = self.tickets_dir / "in_progress"
        for file_path in in_progress_dir.glob("*-ticket-*.yml"):
            with open(file_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
                if data.get('name') == active_ticket['name']:
                    ticket_file = file_path
                    break
        
        if not ticket_file:
            print(f"❌ 找不到票券檔案: {active_ticket['name']}")
            return
            
        # 讀取票券資料
        with open(ticket_file, 'r', encoding='utf-8') as f:
            ticket_data = yaml.safe_load(f)
        
        # 添加新的文件參考
        if 'document_references' not in ticket_data:
            ticket_data['document_references'] = []
            
        # 根據階段添加參考
        stage_refs = {
            'frontend_development': [
                ('docs/handbook/02-development-guides/guides/frontend-guide.md', '遵循前端開發規範'),
                ('docs/handbook/03-technical-references/design-patterns/frontend/frontend-patterns.md', '應用前端設計模式')
            ],
            'api_development': [
                ('docs/handbook/03-technical-references/design-patterns/architecture/current/api-design.md', '遵循 API 設計規範'),
                ('docs/handbook/01-context/business-rules.md', '確保 API 符合業務規則')
            ],
            'test_writing': [
                ('docs/handbook/03-technical-references/core-practices/tdd.md', '應用 TDD 原則'),
                ('docs/handbook/03-technical-references/technical/test-strategy.md', '遵循測試策略')
            ],
            'refactoring': [
                ('docs/handbook/03-technical-references/design-patterns/', '參考設計模式'),
                ('docs/handbook/03-technical-references/core-practices/', '遵循核心實踐')
            ]
        }
        
        if stage in stage_refs:
            for doc_path, reason in stage_refs[stage]:
                # 檢查是否已經存在
                exists = any(ref['path'] == doc_path for ref in ticket_data['document_references'])
                if not exists:
                    ticket_data['document_references'].append({
                        'path': doc_path,
                        'reason': reason,
                        'stage': stage,
                        'timestamp': datetime.now().isoformat()
                    })
        
        # 儲存更新的票券資料
        with open(ticket_file, 'w', encoding='utf-8') as f:
            yaml.dump(ticket_data, f, allow_unicode=True, sort_keys=False)
            
        print(f"📚 已記錄 {stage} 階段的文件參考")
    
    def complete_ticket(self, ticket_name: str, commit_hash: str, dev_log_path: str = None) -> Optional[Dict]:
        """完成 ticket (增強版)"""
        # 尋找 ticket 檔案
        ticket_file = None
        in_progress_dir = self.tickets_dir / "in_progress"
        
        if in_progress_dir.exists():
            for file_path in in_progress_dir.glob(f"*-ticket-{ticket_name}.yml"):
                ticket_file = file_path
                break
        
        if not ticket_file or not ticket_file.exists():
            print(f"❌ 找不到 ticket: {ticket_name}")
            return None
            
        # 讀取 ticket 資料
        with open(ticket_file, 'r', encoding='utf-8') as f:
            ticket_data = yaml.safe_load(f)
        
        # 更新完成資訊
        completed_at = datetime.now()
        ticket_data['status'] = 'completed'
        ticket_data['completed_at'] = completed_at.isoformat()
        ticket_data['commit_hash'] = commit_hash
        
        # 計算持續時間
        started_at = datetime.fromisoformat(ticket_data['started_at'])
        duration = completed_at - started_at
        ticket_data['duration_minutes'] = int(duration.total_seconds() / 60)
        
        # 連結開發日誌
        if dev_log_path:
            ticket_data['dev_logs'] = ticket_data.get('dev_logs', [])
            ticket_data['dev_logs'].append(dev_log_path)
        
        # 移動到 completed 資料夾
        date_str = started_at.strftime('%Y-%m-%d')
        completed_date_dir = self.tickets_dir / "completed" / date_str
        completed_date_dir.mkdir(parents=True, exist_ok=True)
        
        # 移動票券檔案
        new_ticket_file = completed_date_dir / ticket_file.name
        ticket_file.rename(new_ticket_file)
        
        print(f"✅ Ticket 已完成: {ticket_name}")
        print(f"⏱️  耗時: {ticket_data['duration_minutes']} 分鐘")
        print(f"📁 已歸檔到: {new_ticket_file}")
        
        return ticket_data
    
    def get_active_ticket(self) -> Optional[Dict]:
        """獲取當前進行中的 ticket"""
        in_progress_dir = self.tickets_dir / "in_progress"
        if not in_progress_dir.exists():
            return None
            
        for ticket_file in in_progress_dir.glob("*.yml"):
            with open(ticket_file, 'r', encoding='utf-8') as f:
                ticket_data = yaml.safe_load(f)
            if ticket_data.get('status') == 'in_progress':
                ticket_data['_file_path'] = str(ticket_file)
                return ticket_data
        
        return None
    
    def pause_ticket(self, ticket_name: str = None) -> bool:
        """暫停 ticket"""
        # 如果沒有指定名稱，找當前活動的票券
        if not ticket_name:
            active = self.get_active_ticket()
            if not active:
                print("❌ 沒有活動的票券可以暫停")
                return False
            ticket_name = active['name']
        
        # 找到票券檔案
        ticket_file = None
        in_progress_dir = self.tickets_dir / "in_progress"
        
        for file_path in in_progress_dir.glob(f"*-ticket-{ticket_name}.yml"):
            ticket_file = file_path
            break
        
        if not ticket_file:
            print(f"❌ 找不到票券: {ticket_name}")
            return False
        
        # 讀取票券資料
        with open(ticket_file, 'r', encoding='utf-8') as f:
            ticket_data = yaml.safe_load(f)
        
        # 更新狀態
        ticket_data['status'] = 'paused'
        ticket_data['paused_at'] = datetime.now().isoformat()
        
        # 保存變更
        with open(ticket_file, 'w', encoding='utf-8') as f:
            yaml.dump(ticket_data, f, allow_unicode=True, sort_keys=False)
        
        print(f"⏸️  已暫停票券: {ticket_name}")
        return True
    
    def resume_ticket(self, ticket_name: str) -> bool:
        """恢復暫停的票券"""
        # 找到票券檔案
        ticket_file = None
        in_progress_dir = self.tickets_dir / "in_progress"
        
        for file_path in in_progress_dir.glob(f"*-ticket-{ticket_name}.yml"):
            ticket_file = file_path
            break
        
        if not ticket_file:
            print(f"❌ 找不到票券: {ticket_name}")
            return False
        
        # 讀取票券資料
        with open(ticket_file, 'r', encoding='utf-8') as f:
            ticket_data = yaml.safe_load(f)
        
        if ticket_data.get('status') != 'paused':
            print(f"⚠️  票券 {ticket_name} 不是暫停狀態")
            return False
        
        # 先暫停其他活動票券
        current_active = self.get_active_ticket()
        if current_active and current_active['name'] != ticket_name:
            self.pause_ticket(current_active['name'])
        
        # 更新狀態
        ticket_data['status'] = 'in_progress'
        ticket_data['resumed_at'] = datetime.now().isoformat()
        
        # 計算暫停時間
        if 'paused_at' in ticket_data:
            paused_time = datetime.now() - datetime.fromisoformat(ticket_data['paused_at'])
            print(f"⏰ 暫停了 {int(paused_time.total_seconds() / 60)} 分鐘")
        
        # 保存變更
        with open(ticket_file, 'w', encoding='utf-8') as f:
            yaml.dump(ticket_data, f, allow_unicode=True, sort_keys=False)
        
        # 切換到票券分支
        if 'branch' in ticket_data:
            try:
                subprocess.run(
                    ['git', 'checkout', ticket_data['branch']], 
                    check=True, 
                    capture_output=True
                )
                print(f"🌿 已切換到 branch: {ticket_data['branch']}")
            except:
                print(f"⚠️  無法切換到 branch: {ticket_data['branch']}")
        
        print(f"▶️  已恢復票券: {ticket_name}")
        return True
    
    def list_tickets(self):
        """列出所有票券"""
        tickets = []
        
        # 掃描 in_progress
        in_progress_dir = self.tickets_dir / "in_progress"
        if in_progress_dir.exists():
            for ticket_file in in_progress_dir.glob("*.yml"):
                with open(ticket_file, 'r', encoding='utf-8') as f:
                    ticket_data = yaml.safe_load(f)
                tickets.append(ticket_data)
        
        # 掃描 completed
        completed_dir = self.tickets_dir / "completed"
        if completed_dir.exists():
            for date_dir in sorted(completed_dir.iterdir(), reverse=True):
                if date_dir.is_dir():
                    for ticket_file in date_dir.glob("*.yml"):
                        with open(ticket_file, 'r', encoding='utf-8') as f:
                            ticket_data = yaml.safe_load(f)
                        tickets.append(ticket_data)
        
        # 分組顯示
        active = [t for t in tickets if t.get('status') == 'in_progress']
        paused = [t for t in tickets if t.get('status') == 'paused']
        completed = [t for t in tickets if t.get('status') == 'completed']
        
        if active:
            print("\n🟢 Active:")
            for ticket in active:
                print(f"  - {ticket['name']} ({ticket.get('type', 'unknown')}) - started: {ticket['created_at'][:10]}")
        
        if paused:
            print("\n⏸️  Paused:")
            for ticket in paused:
                paused_at = ticket.get('paused_at', 'unknown')[:16] if 'paused_at' in ticket else 'unknown'
                print(f"  - {ticket['name']} ({ticket.get('type', 'unknown')}) - paused: {paused_at}")
        
        if completed:
            print("\n✅ Completed:")
            for ticket in completed[:10]:  # 只顯示最近 10 個
                duration = ticket.get('duration_minutes', '?')
                print(f"  - {ticket['name']} ({ticket.get('type', 'unknown')}) - {duration} min")
            if len(completed) > 10:
                print(f"  ... and {len(completed) - 10} more")
        
        if not tickets:
            print("❌ 沒有找到任何票券")
    
    def generate_usage_report(self):
        """生成整體文件使用報告"""
        if self.doc_tracker:
            self.doc_tracker.generate_usage_report()
        else:
            print("⚠️ 文件追蹤功能未啟用")

def main():
    """CLI 介面"""
    if len(sys.argv) < 2:
        print("Usage: ticket-manager-enhanced.py <command> [args]")
        print("Commands:")
        print("  create <name> <type> [desc] - Create ticket with type (feature/bug/refactor)")
        print("  complete <name> <commit>    - Complete ticket")
        print("  pause [name]                - Pause ticket (current if no name)")
        print("  resume <name>               - Resume paused ticket")
        print("  list                        - List all tickets")
        print("  track <stage> [files...]    - Track development stage")
        print("  active                      - Show active ticket")
        print("  usage-report                - Generate document usage report")
        sys.exit(1)
    
    manager = EnhancedTicketManager()
    command = sys.argv[1]
    
    if command == "create":
        if len(sys.argv) < 4:
            print("Error: Please provide ticket name and type")
            sys.exit(1)
        
        name = sys.argv[2]
        ticket_type = sys.argv[3]
        description = sys.argv[4] if len(sys.argv) > 4 else ""
        manager.create_ticket(name, ticket_type, description)
    
    elif command == "complete":
        if len(sys.argv) < 4:
            print("Error: Please provide ticket name and commit hash")
            sys.exit(1)
        
        name = sys.argv[2]
        commit = sys.argv[3]
        manager.complete_ticket(name, commit)
    
    elif command == "track":
        if len(sys.argv) < 3:
            print("Error: Please provide development stage")
            sys.exit(1)
        
        stage = sys.argv[2]
        files = sys.argv[3:] if len(sys.argv) > 3 else None
        manager.track_development(stage, files)
    
    elif command == "active":
        ticket = manager.get_active_ticket()
        if ticket:
            print(f"📋 Active ticket: {ticket['name']}")
            print(f"   Type: {ticket.get('type', 'unknown')}")
            print(f"   Started: {ticket['started_at']}")
        else:
            print("❌ No active ticket")
    
    elif command == "usage-report":
        manager.generate_usage_report()
    
    elif command == "pause":
        name = sys.argv[2] if len(sys.argv) > 2 else None
        manager.pause_ticket(name)
    
    elif command == "resume":
        if len(sys.argv) < 3:
            print("Error: Please provide ticket name to resume")
            sys.exit(1)
        
        name = sys.argv[2]
        manager.resume_ticket(name)
    
    elif command == "list":
        manager.list_tickets()

if __name__ == "__main__":
    main()