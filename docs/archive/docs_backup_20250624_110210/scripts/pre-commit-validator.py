#!/usr/bin/env python3
"""
改進的 Pre-commit 驗證器
負責在提交前進行完整的票券和文件驗證
"""

import os
import sys
import yaml
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# 添加腳本目錄到 Python 路徑
sys.path.insert(0, str(Path(__file__).parent))

try:
    from ticket_integrity_checker import TicketIntegrityChecker, IntegrityResult
except ImportError:
    # 如果直接導入失敗，嘗試使用相對路徑
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "ticket_integrity_checker", 
        Path(__file__).parent / "ticket-integrity-checker.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    TicketIntegrityChecker = module.TicketIntegrityChecker
    IntegrityResult = module.IntegrityResult

class PreCommitValidator:
    """Pre-commit 驗證器"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.integrity_checker = TicketIntegrityChecker()
        self.errors = []
        self.warnings = []
        
    def validate(self) -> bool:
        """
        執行完整的 pre-commit 驗證
        返回: True 如果驗證通過，False 如果有錯誤
        """
        print("🔍 執行 Pre-commit 驗證...")
        
        # 1. 檢查是否有 active ticket
        if not self._validate_active_ticket():
            return False
            
        # 2. 驗證票券完整性
        if not self._validate_ticket_integrity():
            return False
            
        # 3. 檢查必要文件
        if not self._validate_required_files():
            return False
            
        # 4. 檢查潛在衝突
        self._check_potential_conflicts()
        
        # 5. 準備票券狀態轉換（但不執行）
        self._prepare_ticket_completion()
        
        # 顯示結果
        return self._show_validation_results()
        
    def _validate_active_ticket(self) -> bool:
        """驗證是否有 active ticket"""
        print("\n📋 檢查 Active Ticket...")
        
        ticket = self.integrity_checker.get_active_ticket()
        
        if not ticket:
            self.errors.append({
                'type': 'no_active_ticket',
                'message': '沒有找到 active ticket',
                'suggestion': '使用 "make new-ticket TICKET=<name>" 創建新票券'
            })
            return False
            
        self.active_ticket = ticket
        print(f"✅ 找到 active ticket: {ticket.get('name', 'unknown')}")
        
        # 檢查票券是否與 branch 一致
        branch_ticket = self.integrity_checker._get_ticket_from_branch()
        if branch_ticket and branch_ticket != ticket.get('name'):
            self.warnings.append({
                'type': 'ticket_branch_mismatch',
                'message': f'Branch ticket ({branch_ticket}) 與 active ticket ({ticket.get("name")}) 不一致'
            })
            
        return True
        
    def _validate_ticket_integrity(self) -> bool:
        """驗證票券完整性"""
        print("\n🔍 驗證票券完整性...")
        
        ticket_name = self.active_ticket.get('name')
        result = self.integrity_checker.verify_ticket_integrity(ticket_name)
        
        if not result.is_valid:
            for error in result.errors:
                self.errors.append({
                    'type': 'integrity_error',
                    'message': error['message'],
                    'details': error.get('details')
                })
            return False
            
        # 添加警告
        for warning in result.warnings:
            self.warnings.append({
                'type': 'integrity_warning',
                'message': warning
            })
            
        print("✅ 票券完整性檢查通過")
        return True
        
    def _validate_required_files(self) -> bool:
        """檢查必要文件"""
        print("\n📁 檢查必要文件...")
        
        # 根據票券類型檢查必要文件
        ticket_type = self.active_ticket.get('type', 'feature')
        
        # 這裡可以根據 ticket-driven-dev.py 的配置來檢查
        # 暫時簡化處理
        
        staged_files = self._get_staged_files()
        if not staged_files:
            self.warnings.append({
                'type': 'no_staged_files',
                'message': '沒有任何 staged 文件'
            })
            
        print(f"✅ 發現 {len(staged_files)} 個 staged 文件")
        return True
        
    def _check_potential_conflicts(self):
        """檢查潛在衝突"""
        print("\n⚠️  檢查潛在衝突...")
        
        # 檢查是否有其他同名票券
        ticket_name = self.active_ticket.get('name')
        locations = self.integrity_checker.check_ticket_exists(ticket_name)
        
        if len(locations) > 1:
            self.warnings.append({
                'type': 'duplicate_tickets',
                'message': f'票券 {ticket_name} 存在於多個位置',
                'details': locations
            })
            
        # 檢查是否有未完成的文件
        ticket_path = Path(self.active_ticket.get('_file_path'))
        if ticket_path.exists():
            try:
                with open(ticket_path, 'r', encoding='utf-8') as f:
                    ticket_data = yaml.safe_load(f)
                    
                # 檢查必要文件的狀態
                if 'required_documents' in ticket_data:
                    incomplete_docs = []
                    for doc in ticket_data['required_documents']:
                        if doc.get('status') != 'completed':
                            incomplete_docs.append(doc.get('path', 'unknown'))
                            
                    if incomplete_docs:
                        self.warnings.append({
                            'type': 'incomplete_documents',
                            'message': f'有 {len(incomplete_docs)} 個文件未完成',
                            'details': incomplete_docs
                        })
            except Exception as e:
                self.warnings.append({
                    'type': 'ticket_read_error',
                    'message': f'無法讀取票券詳情: {str(e)}'
                })
                
    def _prepare_ticket_completion(self):
        """準備票券完成（但不執行）"""
        print("\n📝 準備票券狀態轉換...")
        
        # 記錄準備完成的動作，但不實際執行
        # 這些資訊會傳遞給 post-commit
        
        completion_info = {
            'ticket_name': self.active_ticket.get('name'),
            'ticket_path': self.active_ticket.get('_file_path'),
            'target_status': 'completed',
            'completion_time': None  # 將在 post-commit 填入
        }
        
        # 保存到臨時文件供 post-commit 使用
        temp_file = self.project_root / '.git' / 'ticket_completion_info.yml'
        temp_file.parent.mkdir(exist_ok=True)
        
        with open(temp_file, 'w', encoding='utf-8') as f:
            yaml.dump(completion_info, f)
            
        print("✅ 已準備票券完成資訊")
        
    def _get_staged_files(self) -> List[str]:
        """獲取 staged 文件列表"""
        try:
            result = subprocess.run(
                ['git', 'diff', '--cached', '--name-only'],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            if result.returncode == 0:
                return [f for f in result.stdout.strip().split('\n') if f]
                
        except Exception:
            pass
            
        return []
        
    def _show_validation_results(self) -> bool:
        """顯示驗證結果"""
        print("\n" + "="*50)
        print("📊 Pre-commit 驗證結果")
        print("="*50)
        
        if self.errors:
            print(f"\n❌ 發現 {len(self.errors)} 個錯誤:")
            for error in self.errors:
                print(f"\n  • {error['message']}")
                if error.get('details'):
                    print(f"    詳情: {error['details']}")
                if error.get('suggestion'):
                    print(f"    💡 建議: {error['suggestion']}")
                    
        if self.warnings:
            print(f"\n⚠️  發現 {len(self.warnings)} 個警告:")
            for warning in self.warnings:
                print(f"\n  • {warning['message']}")
                if warning.get('details'):
                    print(f"    詳情: {warning['details']}")
                    
        if not self.errors:
            print("\n✅ 所有檢查通過，可以繼續提交")
            return True
        else:
            print("\n❌ 驗證失敗，請修正錯誤後再試")
            return False

def main():
    """主函數"""
    validator = PreCommitValidator()
    
    # 執行驗證
    if validator.validate():
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()