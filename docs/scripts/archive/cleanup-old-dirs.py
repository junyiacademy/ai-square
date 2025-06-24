#!/usr/bin/env python3
"""
清理舊的目錄結構，只保留新的9個核心目錄
"""

import os
import shutil
from pathlib import Path

# 新的核心目錄
KEEP_DIRS = {
    'tickets',
    'dev-logs',
    'test-reports',
    'decisions',
    'handbook',
    'scripts',
    'stories',
    'archive'  # 暫時保留作為時間記錄歸檔
}

# 應該保留的文件
KEEP_FILES = {
    'README.md',
    'README-migration.md'
}

def cleanup_old_directories():
    docs_dir = Path("docs")
    
    print("🧹 開始清理舊目錄...")
    
    removed_count = 0
    kept_count = 0
    
    for item in docs_dir.iterdir():
        if item.is_dir():
            if item.name not in KEEP_DIRS:
                print(f"  🗑️  刪除舊目錄: {item.name}")
                shutil.rmtree(item)
                removed_count += 1
            else:
                print(f"  ✅ 保留: {item.name}")
                kept_count += 1
        elif item.is_file():
            if item.name not in KEEP_FILES:
                print(f"  📄 移動文件: {item.name} → handbook/")
                dest = docs_dir / "handbook" / item.name
                shutil.move(str(item), str(dest))
    
    print(f"\n✅ 清理完成！")
    print(f"   - 刪除 {removed_count} 個舊目錄")
    print(f"   - 保留 {kept_count} 個核心目錄")
    
    # 重命名 tickets 子目錄
    rename_ticket_dirs()

def rename_ticket_dirs():
    """重命名 tickets 的子目錄"""
    tickets_dir = Path("docs/tickets")
    
    if not tickets_dir.exists():
        return
        
    # active → in_progress
    active_dir = tickets_dir / "active"
    in_progress_dir = tickets_dir / "in_progress"
    if active_dir.exists() and not in_progress_dir.exists():
        active_dir.rename(in_progress_dir)
        print("  📁 重命名: active → in_progress")
    
    # archive → completed
    archive_dir = tickets_dir / "archive"
    completed_dir = tickets_dir / "completed"
    if archive_dir.exists() and not completed_dir.exists():
        archive_dir.rename(completed_dir)
        print("  📁 重命名: archive → completed")
        
        # 調整歸檔結構為 YYYY-MM-DD
        reorganize_completed_tickets(completed_dir)

def reorganize_completed_tickets(completed_dir):
    """重組已完成票券為 YYYY-MM-DD 結構"""
    print("\n📅 重組已完成票券...")
    
    # 處理 YYYY-MM 格式的目錄
    for year_month_dir in completed_dir.iterdir():
        if year_month_dir.is_dir() and "-" in year_month_dir.name:
            # 例如: 2025-06
            for ticket in year_month_dir.iterdir():
                if ticket.is_file() and ticket.name.endswith('.yml'):
                    # 從檔名提取日期
                    parts = ticket.name.split('-')
                    if len(parts) >= 3:
                        year = parts[0]
                        month = parts[1] 
                        day = parts[2]
                        
                        # 創建 YYYY-MM-DD 目錄
                        date_dir = completed_dir / f"{year}-{month}-{day}"
                        date_dir.mkdir(exist_ok=True)
                        
                        # 移動票券
                        dest = date_dir / ticket.name
                        shutil.move(str(ticket), str(dest))
                        print(f"    ✅ {ticket.name} → {date_dir.name}/")
            
            # 刪除空的年月目錄
            if not list(year_month_dir.iterdir()):
                year_month_dir.rmdir()

def main():
    cleanup_old_directories()
    
    print("\n📁 最終目錄結構:")
    os.system("ls -la docs/")

if __name__ == "__main__":
    main()