#!/usr/bin/env python3
"""
示範：創建包含文件參考的票券
"""

import sys
import subprocess
from pathlib import Path
from datetime import datetime

def create_demo_ticket(ticket_type: str):
    """創建示範票券"""
    ticket_name = f"demo-{ticket_type}-{datetime.now().strftime('%H%M%S')}"
    desc = f"示範 {ticket_type} 類型票券的文件參考"
    
    print(f"\n{'='*60}")
    print(f"🎫 創建 {ticket_type} 類型票券")
    print(f"{'='*60}")
    
    cmd = [
        sys.executable,
        "docs/scripts/ticket-manager-enhanced.py",
        "create",
        ticket_name,
        ticket_type,
        desc
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(f"⚠️ 錯誤: {result.stderr}")
    
    # 顯示生成的 spec.md
    ticket_dir = Path(f"docs/tickets/in_progress").glob(f"*{ticket_name}")
    for dir_path in ticket_dir:
        spec_file = dir_path / "spec.md"
        if spec_file.exists():
            print("\n📄 生成的 spec.md 內容：")
            print("-" * 60)
            with open(spec_file, 'r', encoding='utf-8') as f:
                content = f.read()
                # 只顯示參考文件部分
                if "## 📚 參考文件" in content:
                    ref_section = content.split("## 📚 參考文件")[1]
                    print("## 📚 參考文件" + ref_section[:500])
            print("-" * 60)
            
            # 顯示 document-references.yml
            ref_file = dir_path / "document-references.yml"
            if ref_file.exists():
                print("\n📊 document-references.yml 內容：")
                print("-" * 60)
                with open(ref_file, 'r', encoding='utf-8') as f:
                    print(f.read()[:300])
                print("-" * 60)

def main():
    print("""
╔═══════════════════════════════════════════════════════════╗
║          📚 票券文件參考示範                                ║
╚═══════════════════════════════════════════════════════════╝

這個示範展示不同類型的票券會自動參考哪些 handbook 文件
""")

    # 示範不同類型的票券
    ticket_types = ['feature', 'bug', 'refactor']
    
    for ticket_type in ticket_types:
        create_demo_ticket(ticket_type)
        print("\n" + "="*60)
    
    # 總結
    print("\n✅ 示範完成！")
    print("\n重點總結：")
    print("1. **feature 票券**：參考 product-vision、domain-knowledge、frontend-guide")
    print("2. **bug 票券**：參考 TDD 原則、測試策略")
    print("3. **refactor 票券**：參考設計模式、核心實踐")
    print("\n每個票券的 spec.md 都會包含：")
    print("- 自動建議的參考文件清單")
    print("- 參考原因說明")
    print("- 提醒開發者持續更新")

if __name__ == "__main__":
    main()