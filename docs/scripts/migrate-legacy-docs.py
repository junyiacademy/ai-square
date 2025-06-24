#!/usr/bin/env python3
"""
將舊目錄中的重要文件遷移到新結構
"""

import os
import shutil
from pathlib import Path
from datetime import datetime

# 定義遷移規則
MIGRATION_RULES = {
    # 架構和技術文檔 → handbook
    'archive/legacy/development-standards.md': 'handbook/legacy/development-standards.md',
    'archive/legacy/technical/test-strategy.md': 'handbook/technical/test-strategy.md',
    'archive/legacy/technical/implementation/frontend-guide.md': 'handbook/guides/frontend-guide.md',
    'archive/planning/FILE_STRUCTURE_PLAN.md': 'handbook/planning/FILE_STRUCTURE_PLAN.md',
    'archive/planning/MIGRATION_PLAN.md': 'handbook/planning/MIGRATION_PLAN.md',
    
    # 開發日誌 → dev-logs (按日期組織)
    'archive/2025-06/development-logs': 'dev-logs/archive',
    'dev-logs/2025-06-20': 'dev-logs/2025-06-20',
    'dev-logs/2025-06-21': 'dev-logs/2025-06-21',
    'dev-logs/2025-06-22': 'dev-logs/2025-06-22',
    'dev-logs/2025-06-23': 'dev-logs/2025-06-23',
    'dev-logs/2025-06-24': 'dev-logs/2025-06-24',
    
    # Bug 分析 → specs 或 decisions
    'bugs': 'specs/bug-analysis',
    
    # Feature 規格 → specs
    'features': 'specs/features',
    
    # 重構文檔 → specs
    'refactoring': 'specs/refactoring',
    
    # 測試相關 → test-reports
    'testing': 'test-reports/legacy',
    'reports': 'test-reports/reports',
    
    # 工作流程 → handbook
    'workflows/TICKET_DRIVEN_DEVELOPMENT.md': 'handbook/workflows/TICKET_DRIVEN_DEVELOPMENT.md',
    
    # 時間日誌 → 歸檔（可選）
    'time-logs': 'archive/time-logs',
}

def migrate_files():
    backup_dir = Path("docs_backup_20250624_110210")
    docs_dir = Path("docs")
    
    print("📂 開始遷移重要文件到新結構...")
    migrated_count = 0
    
    for old_path, new_path in MIGRATION_RULES.items():
        source = backup_dir / old_path
        dest = docs_dir / new_path
        
        if source.exists():
            if source.is_dir():
                # 遷移整個目錄
                dest.parent.mkdir(parents=True, exist_ok=True)
                if dest.exists():
                    # 如果目標已存在，合併內容
                    for item in source.rglob("*"):
                        if item.is_file():
                            rel_path = item.relative_to(source)
                            dest_file = dest / rel_path
                            dest_file.parent.mkdir(parents=True, exist_ok=True)
                            shutil.copy2(item, dest_file)
                            migrated_count += 1
                else:
                    shutil.copytree(source, dest)
                    migrated_count += len(list(source.rglob("*")))
                print(f"  ✅ 目錄 {old_path} → {new_path}")
            else:
                # 遷移單個文件
                dest.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, dest)
                migrated_count += 1
                print(f"  ✅ 文件 {old_path} → {new_path}")
    
    # 特殊處理：ADR 決策記錄保持原位
    print("\n📋 保留的文件（已在正確位置）:")
    print("  ✅ decisions/ - ADR 決策記錄")
    print("  ✅ scripts/ - 自動化腳本")
    print("  ✅ stories/ - 使用者故事")
    
    print(f"\n✅ 遷移完成！共遷移 {migrated_count} 個文件")
    
    # 生成遷移報告
    generate_migration_report()

def generate_migration_report():
    """生成遷移報告"""
    report_path = Path("docs/handbook/migration-report.md")
    
    report_content = f"""# 📋 文檔遷移報告

生成時間：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 遷移規則

### 1. 技術文檔 → handbook/
- 開發標準、測試策略、實作指南
- 規劃文件、架構文檔

### 2. 開發日誌 → dev-logs/
- 保持日期結構
- 歷史日誌歸檔到 dev-logs/archive

### 3. 規格文檔 → specs/
- Bug 分析報告
- Feature 規格書
- 重構計畫

### 4. 測試相關 → test-reports/
- 測試策略文檔
- 測試報告

### 5. 工作流程 → handbook/workflows/
- 票券驅動開發流程
- 其他工作流程文檔

## 不需遷移的內容

### 1. 已在正確位置
- decisions/ - ADR 決策記錄
- scripts/ - 自動化腳本  
- stories/ - 使用者故事

### 2. 純歸檔性質
- time-logs/ - 時間記錄（歸檔但不主動使用）
- archive/ - 歷史歸檔文件

## 建議後續行動

1. **檢視遷移結果**：確認重要文件都已妥善安置
2. **更新索引**：在 handbook/README.md 中建立文件索引
3. **清理備份**：確認無誤後可刪除 docs_backup_* 目錄

## 文件組織原則

- **handbook/** - 主動參考的指南和手冊
- **specs/** - 功能規格和分析文檔
- **dev-logs/** - 開發過程記錄
- **test-reports/** - 測試相關文檔
- **archive/** - 純歸檔，不常查閱
"""
    
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report_content, encoding='utf-8')
    print(f"\n📄 遷移報告已生成：{report_path}")

def main():
    migrate_files()
    
    # 列出可能遺漏的重要文件
    print("\n🔍 檢查可能遺漏的文件...")
    backup_dir = Path("docs_backup_20250624_110210")
    
    important_extensions = ['.md', '.yml', '.yaml']
    important_files = []
    
    for ext in important_extensions:
        for file in backup_dir.rglob(f"*{ext}"):
            # 排除已知的歸檔和不重要的文件
            rel_path = file.relative_to(backup_dir)
            if not any(str(rel_path).startswith(ignore) for ignore in [
                'tickets/', 'handbook/', 'scripts/', 'stories/', 'decisions/',
                '.git/', '__pycache__/', 'archive/2025-06/current/'
            ]):
                important_files.append(rel_path)
    
    if important_files:
        print("\n⚠️  以下文件可能需要手動檢查：")
        for f in important_files[:10]:  # 只顯示前10個
            print(f"  - {f}")
        if len(important_files) > 10:
            print(f"  ... 還有 {len(important_files) - 10} 個文件")

if __name__ == "__main__":
    main()