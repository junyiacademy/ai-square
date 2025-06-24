#!/usr/bin/env python3
"""
統一的票券完整性檢查器
用於在多個階段檢查票券的存在性、唯一性和一致性
"""

import os
import sys
import yaml
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Set
from dataclasses import dataclass, field

@dataclass
class IntegrityResult:
    """完整性檢查結果"""
    is_valid: bool = True
    errors: List[Dict] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)
    
    def add_error(self, message: str, details: Dict = None):
        """添加錯誤"""
        self.is_valid = False
        error = {'message': message}
        if details:
            error['details'] = details
        self.errors.append(error)
        
    def add_warning(self, message: str):
        """添加警告"""
        self.warnings.append(message)
        
    def add_suggestion(self, message: str):
        """添加建議"""
        self.suggestions.append(message)

class TicketIntegrityChecker:
    """統一的票券完整性檢查器"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.tickets_path = self.project_root / "docs" / "tickets"
        self.cache = {}  # 緩存已載入的票券
        
    def check_ticket_exists(self, ticket_name: str) -> Dict[str, List[Path]]:
        """
        檢查票券是否存在（所有目錄）
        返回: {status: [file_paths]}
        """
        locations = {
            'in_progress': self.tickets_path / 'in_progress',
            'completed': self.tickets_path / 'completed',
            'paused': self.tickets_path / 'paused'
        }
        
        found = {}
        for status, path in locations.items():
            if path.exists():
                # 精確匹配和模糊匹配
                exact_matches = list(path.glob(f"*-ticket-{ticket_name}.yml"))
                fuzzy_matches = list(path.glob(f"*{ticket_name}*.yml"))
                
                # 合併結果，去重
                all_matches = list(set(exact_matches + fuzzy_matches))
                
                if all_matches:
                    found[status] = all_matches
                    
        return found
    
    def verify_ticket_integrity(self, ticket_name: str) -> IntegrityResult:
        """完整的票券完整性驗證"""
        result = IntegrityResult()
        
        # 1. 檢查存在性
        locations = self.check_ticket_exists(ticket_name)
        
        if not locations:
            result.add_error(f"找不到票券: {ticket_name}")
            result.add_suggestion(f"使用 'make new-ticket TICKET={ticket_name}' 創建新票券")
            return result
            
        # 2. 檢查重複
        total_files = sum(len(files) for files in locations.values())
        if total_files > 1:
            result.add_error("票券存在於多個位置或有重複", {
                'locations': {status: [str(f) for f in files] 
                            for status, files in locations.items()}
            })
            
            # 分析重複原因
            if len(locations) > 1:
                result.add_warning("票券同時存在於多個狀態目錄")
                result.add_suggestion("使用 'make clean-duplicate-tickets' 清理重複票券")
            else:
                # 同一目錄下有多個文件
                for status, files in locations.items():
                    if len(files) > 1:
                        result.add_warning(f"{status} 目錄下有 {len(files)} 個相關文件")
                        
        # 3. 檢查狀態一致性
        for status, files in locations.items():
            for file in files:
                try:
                    data = self._load_ticket(file)
                    
                    # 檢查狀態欄位是否匹配目錄
                    if data.get('status') != status:
                        result.add_error("狀態不一致", {
                            'file': str(file.relative_to(self.project_root)),
                            'directory_status': status,
                            'data_status': data.get('status', 'unknown')
                        })
                        result.add_suggestion(f"更新票券狀態或移動到正確目錄")
                        
                    # 4. 檢查必要欄位
                    required_fields = ['name', 'status', 'created_at']
                    missing_fields = [f for f in required_fields if f not in data]
                    
                    if missing_fields:
                        result.add_error(f"缺少必要欄位", {
                            'file': str(file.relative_to(self.project_root)),
                            'missing': missing_fields
                        })
                        
                    # 5. 檢查時間欄位合理性
                    if 'created_at' in data and 'completed_at' in data:
                        if data.get('status') == 'completed':
                            try:
                                created = datetime.fromisoformat(data['created_at'].replace('Z', '+00:00'))
                                completed = datetime.fromisoformat(data['completed_at'].replace('Z', '+00:00'))
                                if completed < created:
                                    result.add_warning("完成時間早於創建時間")
                            except:
                                pass
                                
                except Exception as e:
                    result.add_error(f"無法讀取票券文件", {
                        'file': str(file.relative_to(self.project_root)),
                        'error': str(e)
                    })
                    
        return result
    
    def get_active_ticket(self) -> Optional[Dict]:
        """
        獲取當前 active ticket（帶完整性檢查）
        優先順序：
        1. Git branch 名稱
        2. in_progress 目錄中的票券
        """
        # 1. 從 git branch 推斷
        branch_ticket = self._get_ticket_from_branch()
        
        # 2. 從 in_progress 目錄查找
        in_progress_tickets = self._get_in_progress_tickets()
        
        # 3. 驗證一致性
        if branch_ticket:
            # 檢查 branch ticket 是否在 in_progress 中
            matching_tickets = [t for t in in_progress_tickets 
                              if t.get('name') == branch_ticket]
            
            if matching_tickets:
                return matching_tickets[0]
            else:
                # Branch 指向的 ticket 不在 in_progress
                print(f"⚠️  Branch ticket '{branch_ticket}' 不在 in_progress 目錄")
                
        # 4. 如果沒有 branch ticket，檢查 in_progress 數量
        if len(in_progress_tickets) == 1:
            return in_progress_tickets[0]
        elif len(in_progress_tickets) > 1:
            print(f"⚠️  發現多個 in_progress tickets: {len(in_progress_tickets)}")
            for ticket in in_progress_tickets:
                print(f"   - {ticket.get('name', 'unknown')}")
            return None
            
        return None
    
    def ensure_single_location(self, ticket_name: str) -> bool:
        """
        確保票券只存在於一個位置
        如果有重複，嘗試自動解決
        """
        locations = self.check_ticket_exists(ticket_name)
        
        if not locations:
            return False
            
        if sum(len(files) for files in locations.values()) == 1:
            return True
            
        # 有重複，嘗試解決
        print(f"🔍 發現票券 '{ticket_name}' 存在於多個位置")
        
        # 策略：保留最新的，刪除其他
        all_files = []
        for status, files in locations.items():
            for file in files:
                all_files.append((file, status))
                
        # 按修改時間排序
        all_files.sort(key=lambda x: x[0].stat().st_mtime, reverse=True)
        
        # 保留最新的
        keep_file, keep_status = all_files[0]
        print(f"✅ 保留最新版本: {keep_file.name} (狀態: {keep_status})")
        
        # 刪除其他
        for file, status in all_files[1:]:
            print(f"🗑️  刪除重複: {file.name}")
            file.unlink()
            
        return True
    
    def create_missing_fields(self, ticket_path: Path) -> bool:
        """
        為票券補充缺失的必要欄位
        """
        try:
            data = self._load_ticket(ticket_path)
            modified = False
            
            # 補充缺失欄位
            if 'created_at' not in data:
                # 使用文件創建時間
                data['created_at'] = datetime.fromtimestamp(
                    ticket_path.stat().st_ctime
                ).isoformat()
                modified = True
                
            if 'status' not in data:
                # 根據目錄推斷狀態
                parent_dir = ticket_path.parent.name
                if parent_dir in ['in_progress', 'completed', 'paused']:
                    data['status'] = parent_dir
                    modified = True
                    
            if 'name' not in data:
                # 從文件名提取
                import re
                match = re.search(r'ticket-(.+)\.yml$', ticket_path.name)
                if match:
                    data['name'] = match.group(1)
                    modified = True
                    
            if modified:
                with open(ticket_path, 'w', encoding='utf-8') as f:
                    yaml.dump(data, f, allow_unicode=True, sort_keys=False)
                print(f"✅ 已補充票券缺失欄位: {ticket_path.name}")
                
            return True
            
        except Exception as e:
            print(f"❌ 無法修復票券: {e}")
            return False
    
    def _load_ticket(self, file_path: Path) -> Dict:
        """載入票券數據（帶緩存）"""
        cache_key = str(file_path)
        
        if cache_key in self.cache:
            return self.cache[cache_key]
            
        with open(file_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f) or {}
            
        self.cache[cache_key] = data
        return data
    
    def _get_ticket_from_branch(self) -> Optional[str]:
        """從 Git branch 名稱獲取票券名稱"""
        try:
            result = subprocess.run(
                ['git', 'branch', '--show-current'],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            if result.returncode == 0:
                branch = result.stdout.strip()
                if branch.startswith('ticket/'):
                    return branch.replace('ticket/', '')
                    
        except Exception:
            pass
            
        return None
    
    def _get_in_progress_tickets(self) -> List[Dict]:
        """獲取所有 in_progress 狀態的票券"""
        in_progress_dir = self.tickets_path / 'in_progress'
        tickets = []
        
        if in_progress_dir.exists():
            for file in in_progress_dir.glob('*.yml'):
                try:
                    data = self._load_ticket(file)
                    data['_file_path'] = file
                    tickets.append(data)
                except Exception as e:
                    print(f"⚠️  無法讀取票券 {file.name}: {e}")
                    
        return tickets
    
    def fix_common_issues(self, ticket_name: str) -> bool:
        """
        嘗試自動修復常見問題
        """
        print(f"🔧 嘗試修復票券 '{ticket_name}' 的常見問題...")
        
        # 1. 確保單一位置
        if not self.ensure_single_location(ticket_name):
            print(f"❌ 無法確保票券唯一性")
            return False
            
        # 2. 檢查並修復欄位
        locations = self.check_ticket_exists(ticket_name)
        for status, files in locations.items():
            for file in files:
                self.create_missing_fields(file)
                
        # 3. 驗證修復結果
        result = self.verify_ticket_integrity(ticket_name)
        
        if result.is_valid:
            print(f"✅ 票券 '{ticket_name}' 已修復")
            return True
        else:
            print(f"⚠️  票券仍有問題需要手動處理")
            return False

def main():
    """主函數 - 用於測試和命令行使用"""
    import argparse
    
    parser = argparse.ArgumentParser(description='票券完整性檢查工具')
    parser.add_argument('action', choices=['check', 'verify', 'fix', 'active'],
                       help='執行的動作')
    parser.add_argument('ticket', nargs='?', help='票券名稱')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='顯示詳細信息')
    
    args = parser.parse_args()
    
    checker = TicketIntegrityChecker()
    
    if args.action == 'check':
        if not args.ticket:
            print("❌ 請提供票券名稱")
            return 1
            
        locations = checker.check_ticket_exists(args.ticket)
        if locations:
            print(f"✅ 找到票券 '{args.ticket}':")
            for status, files in locations.items():
                print(f"  {status}:")
                for file in files:
                    print(f"    - {file.name}")
        else:
            print(f"❌ 找不到票券 '{args.ticket}'")
            
    elif args.action == 'verify':
        if not args.ticket:
            print("❌ 請提供票券名稱")
            return 1
            
        result = checker.verify_ticket_integrity(args.ticket)
        
        if result.is_valid:
            print(f"✅ 票券 '{args.ticket}' 完整性檢查通過")
        else:
            print(f"❌ 票券 '{args.ticket}' 有完整性問題:")
            for error in result.errors:
                print(f"  錯誤: {error['message']}")
                if args.verbose and 'details' in error:
                    print(f"    詳情: {error['details']}")
                    
        if result.warnings:
            print("⚠️  警告:")
            for warning in result.warnings:
                print(f"  - {warning}")
                
        if result.suggestions:
            print("💡 建議:")
            for suggestion in result.suggestions:
                print(f"  - {suggestion}")
                
    elif args.action == 'fix':
        if not args.ticket:
            print("❌ 請提供票券名稱")
            return 1
            
        success = checker.fix_common_issues(args.ticket)
        return 0 if success else 1
        
    elif args.action == 'active':
        ticket = checker.get_active_ticket()
        if ticket:
            print(f"✅ 當前 active ticket: {ticket.get('name', 'unknown')}")
            if args.verbose:
                print(f"  狀態: {ticket.get('status', 'unknown')}")
                print(f"  創建時間: {ticket.get('created_at', 'unknown')}")
        else:
            print("❌ 沒有找到 active ticket")
            
    return 0

if __name__ == "__main__":
    sys.exit(main())