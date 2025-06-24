#!/usr/bin/env python3
"""
Workflow Enforcer
強制執行 ticket 工作流程的包裝器
"""

import sys
import subprocess
import json
from pathlib import Path
from typing import Dict, Optional, Tuple

class WorkflowEnforcer:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.ticket_manager_path = self.project_root / "docs" / "scripts" / "ticket-manager.py"
        
    def check_active_ticket(self) -> Optional[str]:
        """檢查當前是否有 active ticket"""
        try:
            result = subprocess.run(
                [sys.executable, str(self.ticket_manager_path), "active"],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            if "Active ticket:" in result.stdout:
                # 解析 ticket 名稱
                for line in result.stdout.split('\n'):
                    if "Active ticket:" in line:
                        return line.split("Active ticket:")[1].strip()
            
            return None
            
        except Exception as e:
            print(f"❌ 無法檢查 active ticket: {e}")
            return None
    
    def analyze_operation(self, operation: str, file_path: str) -> Dict:
        """分析操作是否需要 ticket"""
        # 不需要 ticket 的操作
        no_ticket_needed = [
            'read', 'analyze', 'list', 'status', 'help'
        ]
        
        # 絕對需要 ticket 的操作
        ticket_required = [
            'write', 'create', 'edit', 'multiedit', 'modify', 'delete'
        ]
        
        # 特殊豁免的檔案模式
        exempt_patterns = [
            'test.', 'temp.', '.tmp', 'scratch'
        ]
        
        operation_lower = operation.lower()
        
        # 檢查是否為豁免操作
        if any(op in operation_lower for op in no_ticket_needed):
            return {
                'needs_ticket': False,
                'reason': '讀取或分析操作不需要 ticket'
            }
        
        # 檢查是否為豁免檔案
        if any(pattern in file_path.lower() for pattern in exempt_patterns):
            return {
                'needs_ticket': False,
                'reason': '臨時或測試檔案不需要 ticket'
            }
        
        # 檢查是否需要 ticket
        if any(op in operation_lower for op in ticket_required):
            return {
                'needs_ticket': True,
                'reason': f'檔案操作 {operation} 需要 active ticket'
            }
        
        # 預設需要 ticket
        return {
            'needs_ticket': True,
            'reason': '預設所有檔案修改都需要 ticket'
        }
    
    def enforce_workflow(self, operation: str, file_path: str) -> Tuple[bool, str]:
        """執行工作流程檢查"""
        # 分析操作
        analysis = self.analyze_operation(operation, file_path)
        
        if not analysis['needs_ticket']:
            return True, f"✅ {analysis['reason']}"
        
        # 檢查 active ticket
        active_ticket = self.check_active_ticket()
        
        if active_ticket:
            return True, f"✅ Active ticket: {active_ticket}"
        else:
            return False, f"""
❌ 工作流程違規！

您正在嘗試執行 {operation} 操作於 {file_path}
但是沒有 active ticket。

請先執行以下其中一個命令：
1. make dev-ticket TICKET=<name>  # 創建新 ticket
2. make resume-ticket TICKET=<name>  # 恢復暫停的 ticket
3. make list-tickets  # 查看所有 tickets

原因：{analysis['reason']}
"""
    
    def suggest_ticket_name(self, file_path: str, operation: str) -> str:
        """建議 ticket 名稱"""
        path_parts = Path(file_path).parts
        
        # 基於路徑推測功能類型
        if 'docs' in path_parts:
            if 'stories' in path_parts:
                return 'write-story'
            elif 'decisions' in path_parts:
                return 'create-adr'
            else:
                return 'update-docs'
        elif 'frontend' in path_parts:
            if 'components' in path_parts:
                return 'update-component'
            elif 'pages' in path_parts:
                return 'update-page'
            else:
                return 'frontend-change'
        elif 'backend' in path_parts:
            return 'backend-change'
        else:
            return 'general-change'
    
    def interactive_check(self):
        """互動式檢查（給 AI 助手測試用）"""
        print("=== Workflow Enforcer 互動測試 ===")
        print("輸入操作和檔案路徑來測試工作流程檢查")
        print("格式：<operation> <file_path>")
        print("例如：write /docs/stories/test.md")
        print("輸入 'quit' 結束\n")
        
        while True:
            try:
                user_input = input("測試> ").strip()
                
                if user_input.lower() == 'quit':
                    break
                
                parts = user_input.split(' ', 1)
                if len(parts) != 2:
                    print("格式錯誤，請輸入：<operation> <file_path>")
                    continue
                
                operation, file_path = parts
                allowed, message = self.enforce_workflow(operation, file_path)
                
                print(message)
                
                if not allowed:
                    suggested_name = self.suggest_ticket_name(file_path, operation)
                    print(f"\n💡 建議 ticket 名稱：{suggested_name}")
                
                print()
                
            except KeyboardInterrupt:
                print("\n結束測試")
                break
            except Exception as e:
                print(f"錯誤：{e}")


def main():
    """主函式"""
    enforcer = WorkflowEnforcer()
    
    if len(sys.argv) == 1:
        # 互動模式
        enforcer.interactive_check()
    elif len(sys.argv) == 3:
        # 命令列模式
        operation = sys.argv[1]
        file_path = sys.argv[2]
        
        allowed, message = enforcer.enforce_workflow(operation, file_path)
        print(message)
        
        if not allowed:
            sys.exit(1)
    else:
        print("用法：")
        print("  workflow-enforcer.py  # 互動模式")
        print("  workflow-enforcer.py <operation> <file_path>  # 檢查模式")
        sys.exit(1)


if __name__ == "__main__":
    main()