#!/usr/bin/env python3
"""
重組 docs 目錄結構為簡化版本
"""

import os
import shutil
from pathlib import Path
from datetime import datetime

def create_dir_if_not_exists(path):
    """創建目錄（如果不存在）"""
    Path(path).mkdir(parents=True, exist_ok=True)

def main():
    docs_root = Path("docs")
    backup_dir = Path(f"docs_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
    
    print("📁 開始重組 docs 目錄結構...")
    
    # 1. 創建備份
    print("📦 創建備份...")
    if docs_root.exists():
        shutil.copytree(docs_root, backup_dir)
        print(f"✅ 備份完成: {backup_dir}")
    
    # 2. 創建新的目錄結構
    print("\n🏗️ 創建新目錄結構...")
    new_dirs = [
        "docs/tickets/in_progress",
        "docs/tickets/completed",
        "docs/dev-logs",
        "docs/test-reports",
        "docs/decisions",
        "docs/handbook",
        "docs/scripts",
        "docs/stories"
    ]
    
    for dir_path in new_dirs:
        create_dir_if_not_exists(dir_path)
        print(f"  ✅ {dir_path}")
    
    # 3. 移動現有文件到新位置
    print("\n📂 整理現有文件...")
    
    # 移動 tickets
    if (docs_root / "tickets/completed").exists():
        completed_tickets = docs_root / "tickets/completed"
        for ticket in completed_tickets.iterdir():
            if ticket.is_dir():
                # 按年月歸檔
                ticket_date = ticket.name.split('-')[0] if '-' in ticket.name else '202506'
                year_month = f"{ticket_date[:4]}-{ticket_date[4:6]}"
                archive_path = Path(f"docs/tickets/archive/{year_month}")
                create_dir_if_not_exists(archive_path)
                shutil.move(str(ticket), str(archive_path / ticket.name))
                print(f"  📦 歸檔 ticket: {ticket.name} → archive/{year_month}")
    
    # 保留 decisions (ADR)
    print("  ✅ decisions (ADR) 保持不變")
    
    # 保留 scripts
    print("  ✅ scripts 保持不變")
    
    # 保留 stories
    print("  ✅ stories 保持不變")
    
    # 整理 handbook
    if (docs_root / "handbook").exists():
        print("  ✅ handbook 已存在")
        # 創建 workflow 文件
        workflow_path = Path("docs/handbook/workflow.md")
        if not workflow_path.exists():
            workflow_content = """# 開發工作流程手冊

## 三階段開發流程

### 1. 啟動 Ticket 階段
- 使用 `make start` 創建票券
- 自動生成所需文件
- 設定依賴關係

### 2. 進入開發階段
- 定期 `make checkpoint` 保存進度
- 使用 `make check` 檢查狀態
- 記錄重要決策和討論

### 3. Commit 流程階段
- `make test` 執行測試
- `make commit` 智能提交
- `make done` 完成並合併

## 詳細指令說明

[請參考 CLAUDE.md 中的詳細說明]
"""
            workflow_path.write_text(workflow_content, encoding='utf-8')
            print("  ✅ 創建 workflow.md")
    
    # 清理舊目錄
    print("\n🧹 清理過時目錄...")
    obsolete_dirs = [
        "docs/archive",
        "docs/bugs",
        "docs/features",
        "docs/refactoring",
        "docs/reports",
        "docs/testing",
        "docs/time-logs",
        "docs/workflows",
        "docs/logs",
        "docs/architecture"
    ]
    
    for dir_path in obsolete_dirs:
        old_path = Path(dir_path)
        if old_path.exists():
            # 檢查是否有重要文件需要保留
            important_files = list(old_path.rglob("*.md")) + list(old_path.rglob("*.yml"))
            if important_files:
                print(f"  ⚠️  {dir_path} 包含 {len(important_files)} 個文件，已在備份中保留")
            else:
                shutil.rmtree(old_path)
                print(f"  🗑️  刪除空目錄: {dir_path}")
    
    # 4. 創建 README 說明新結構
    readme_path = Path("docs/README.md")
    readme_content = """# 📁 文檔目錄結構

## 簡化後的目錄結構

```
docs/
├── tickets/          # 所有票據
│   ├── active/       # 正在進行的
│   └── archive/      # 已完成的（按年月歸檔）
├── specs/            # 功能規格（從 tickets 提取）
├── dev-logs/         # 開發日誌（從 tickets 提取）
├── test-reports/     # 測試報告（從 tickets 提取）  
├── decisions/        # ADR 決策記錄
├── handbook/         # 開發手冊（包含完整 workflow）
├── scripts/          # 自動化腳本
└── stories/          # 使用者故事和場景
```

## 使用說明

1. **開發流程**：參考 `handbook/workflow.md`
2. **票券管理**：所有開發工作都從 `make start` 開始
3. **文件歸檔**：完成的票券自動歸檔到 `archive/YYYY-MM/`

## 重要文件位置

- 工作流程手冊: `handbook/workflow.md`
- 決策記錄: `decisions/ADR-*.md`
- 自動化腳本: `scripts/`
- 使用者故事: `stories/`

## 備份位置

原始結構備份在: `../docs_backup_*`
"""
    readme_path.write_text(readme_content, encoding='utf-8')
    print("\n✅ 創建 docs/README.md")
    
    print(f"\n🎉 重組完成！")
    print(f"📦 原始結構備份在: {backup_dir}")
    print("📚 請查看 docs/README.md 了解新結構")

if __name__ == "__main__":
    main()