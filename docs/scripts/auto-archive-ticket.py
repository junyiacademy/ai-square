#!/usr/bin/env python3
"""
自動歸檔已完成的票券
在 ai-done 流程中調用，將活躍票券移動到 archive 目錄
"""

import os
import sys
import yaml
import shutil
from datetime import datetime
from pathlib import Path

def find_active_ticket():
    """找到當前活躍的票券"""
    active_dir = Path("docs/tickets/active")
    if not active_dir.exists():
        return None
    
    tickets = list(active_dir.glob("*.yml"))
    if len(tickets) == 1:
        return tickets[0]
    elif len(tickets) > 1:
        print(f"⚠️  發現多個活躍票券: {[t.name for t in tickets]}")
        # 選擇最新的票券
        return max(tickets, key=lambda t: t.stat().st_mtime)
    else:
        return None

def archive_ticket(ticket_path):
    """歸檔票券到 archive 目錄"""
    if not ticket_path.exists():
        print(f"❌ 票券不存在: {ticket_path}")
        return False
    
    # 讀取票券資料檢查是否有 commit_hash
    try:
        with open(ticket_path, 'r', encoding='utf-8') as f:
            ticket_data = yaml.safe_load(f)
    except Exception as e:
        print(f"❌ 無法讀取票券: {e}")
        return False
    
    commit_hash = ticket_data.get('commit_hash')
    if not commit_hash:
        print("⚠️  票券缺少 commit_hash，但仍繼續歸檔")
    else:
        print(f"📍 Commit Hash: {commit_hash}")
    
    # 解析票券檔名以獲取日期 (YYYYMMDD_HHMMSS-name.yml)
    filename = ticket_path.name
    date_part = filename.split('-')[0]
    
    if len(date_part) >= 8:
        year = date_part[:4]
        month = date_part[4:6]
        day = date_part[6:8]
        archive_date = f"{year}-{month}-{day}"
    else:
        # 如果無法解析日期，使用今天的日期
        today = datetime.now()
        archive_date = today.strftime("%Y-%m-%d")
    
    # 創建歸檔目錄 (直接放在 archive 目錄，不再按日期分類)
    archive_dir = Path("docs/tickets/archive")
    archive_dir.mkdir(parents=True, exist_ok=True)
    
    # 移動檔案
    destination = archive_dir / filename
    try:
        shutil.move(str(ticket_path), str(destination))
        print(f"✅ 票券已歸檔到: {destination}")
        return True
    except Exception as e:
        print(f"❌ 歸檔失敗: {e}")
        return False

def main():
    """主函數"""
    print("📁 開始自動歸檔票券...")
    
    # 尋找活躍票券
    ticket_path = find_active_ticket()
    if not ticket_path:
        print("❌ 沒有找到活躍的票券")
        sys.exit(1)
    
    print(f"🎫 找到活躍票券: {ticket_path.name}")
    
    # 歸檔票券
    success = archive_ticket(ticket_path)
    if success:
        print("🎉 票券歸檔完成！")
        sys.exit(0)
    else:
        print("❌ 票券歸檔失敗")
        sys.exit(1)

if __name__ == "__main__":
    main()