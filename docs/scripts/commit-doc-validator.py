#!/usr/bin/env python3
"""
提交文件驗證器
在提交時檢查票券對應的文件完整性
"""

import sys
import subprocess
from pathlib import Path
from typing import Dict, List

def main():
    """主執行函數 - 整合到 smart-commit.py 中"""
    
    # 導入票券驅動開發系統
    tdd_script = Path(__file__).parent / "ticket-driven-dev.py"
    if not tdd_script.exists():
        print("⚠️ 票券驅動開發系統未安裝")
        return True  # 不阻止提交
    
    try:
        # 動態導入
        sys.path.insert(0, str(tdd_script.parent))
        from ticket_driven_dev import TicketDrivenDevelopment
        
        tdd = TicketDrivenDevelopment()
        
        # 驗證文件完整性
        result = tdd.validate_commit_documentation()
        
        print("\n" + "="*60)
        print("📋 票券驅動開發 - 文件完整性檢查")
        print("="*60)
        
        if result['status'] == 'pass':
            print("✅ 所有必要文件已準備完成")
            return True
        
        elif result['status'] == 'warning':
            print("⚠️ 未找到活躍票券")
            print(f"建議創建票券: {result.get('suggested_ticket', 'N/A')}")
            print(f"建議類型: {result.get('suggested_type', 'N/A')}")
            
            # 詢問是否繼續
            response = input("\n是否要自動創建票券？(y/N): ").strip().lower()
            if response in ['y', 'yes']:
                try:
                    tdd.create_ticket_with_docs(
                        result['suggested_ticket'],
                        result['suggested_type'],
                        "自動創建的票券"
                    )
                    print("✅ 票券已自動創建")
                    return True
                except Exception as e:
                    print(f"❌ 自動創建票券失敗: {e}")
                    return False
            else:
                print("⚠️ 繼續提交（不建議）")
                return True
        
        else:  # fail
            print("❌ 文件完整性檢查失敗")
            print(f"票券: {result.get('ticket_name', 'N/A')}")
            
            if 'documents' in result:
                docs = result['documents']
                print(f"文件完成度: {docs['completed_count']}/{docs['total_count']}")
                
                if docs['missing_docs']:
                    print("\n缺少的文件:")
                    for doc in docs['missing_docs']:
                        print(f"   - {doc}")
            
            if result.get('suggestions'):
                print("\n建議修正:")
                for suggestion in result['suggestions']:
                    print(f"   - {suggestion}")
            
            print("\n請完成必要文件後再提交")
            return False
            
    except Exception as e:
        print(f"⚠️ 文件驗證過程發生錯誤: {e}")
        print("⚠️ 跳過驗證，允許提交")
        return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)