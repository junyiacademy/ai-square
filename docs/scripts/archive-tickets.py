#!/usr/bin/env python3
"""
將 completed tickets 移動到 archive 目錄（按年月歸檔）
"""

import os
import shutil
from pathlib import Path

def main():
    completed_dir = Path("docs/tickets/completed")
    
    if not completed_dir.exists():
        print("❌ 找不到 completed 目錄")
        return
    
    print("📦 開始歸檔已完成的票券...")
    
    tickets = list(completed_dir.glob("*.yml"))
    print(f"找到 {len(tickets)} 個票券")
    
    for ticket in tickets:
        # 解析日期 (格式: YYYY-MM-DD-HH-MM-SS-ticket-*.yml)
        parts = ticket.name.split('-')
        if len(parts) >= 3:
            year = parts[0]
            month = parts[1]
            archive_dir = Path(f"docs/tickets/archive/{year}-{month}")
            archive_dir.mkdir(parents=True, exist_ok=True)
            
            # 移動票券
            dest = archive_dir / ticket.name
            shutil.move(str(ticket), str(dest))
            print(f"  ✅ {ticket.name} → archive/{year}-{month}/")
    
    # 刪除空的 completed 目錄
    if completed_dir.exists() and not list(completed_dir.iterdir()):
        completed_dir.rmdir()
        print("🗑️  刪除空的 completed 目錄")
    
    print("\n✅ 歸檔完成！")

if __name__ == "__main__":
    main()