#!/usr/bin/env python3
"""
重新組織 handbook 目錄結構，使其更清晰
"""

import os
import shutil
from pathlib import Path

def reorganize_handbook():
    handbook_dir = Path("docs/handbook")
    
    print("📚 重新組織 handbook 目錄...")
    
    # 1. 創建更清晰的目錄結構
    new_structure = {
        "01-getting-started": [
            "PLAYBOOK.md",
            "quick-reference.md", 
            "workflow.md",
            "README.md"
        ],
        "02-development-guides": [
            "guides/",
            "development-logs-guide.md",
            "commit-guide.md"
        ],
        "03-technical-references": [
            "core-practices/",
            "design-patterns/",
            "technical/"
        ],
        "04-project-docs": [
            "product/",
            "planning/",
            "legacy/"
        ],
        "05-reports": [
            "CHANGELOG.md",
            "migration-report.md",
            "simplification-summary.md",
            "improvements/"
        ],
        "workflows": [
            "workflows/"
        ]
    }
    
    # 2. 移動文件到新結構
    for new_dir, items in new_structure.items():
        target_dir = handbook_dir / new_dir
        target_dir.mkdir(exist_ok=True)
        
        for item in items:
            source = handbook_dir / item
            if source.exists():
                dest = target_dir / source.name
                
                if source.is_dir():
                    if dest.exists():
                        shutil.rmtree(dest)
                    shutil.move(str(source), str(dest))
                    print(f"  📁 {item} → {new_dir}/")
                else:
                    shutil.move(str(source), str(dest))
                    print(f"  📄 {item} → {new_dir}/")
    
    # 3. 創建新的 README 索引
    create_new_readme(handbook_dir)
    
    print("\n✅ 重組完成！")

def create_new_readme(handbook_dir):
    """創建新的 README 索引"""
    readme_content = """# 📚 開發手冊目錄

## 🚀 01-getting-started - 快速開始
- [PLAYBOOK.md](01-getting-started/PLAYBOOK.md) - 專案開發指南
- [quick-reference.md](01-getting-started/quick-reference.md) - 常用命令速查
- [workflow.md](01-getting-started/workflow.md) - 三階段開發流程
- [README.md](01-getting-started/README.md) - 原始索引文件

## 📖 02-development-guides - 開發指南
- [guides/](02-development-guides/guides/) - 各類操作指南
  - [frontend-guide.md](02-development-guides/guides/frontend-guide.md) - 前端開發指南
  - [onboarding.md](02-development-guides/guides/onboarding.md) - 新人入門
- [development-logs-guide.md](02-development-guides/development-logs-guide.md) - 開發日誌指南
- [commit-guide.md](02-development-guides/commit-guide.md) - 提交規範

## 🔧 03-technical-references - 技術參考
- [core-practices/](03-technical-references/core-practices/) - 核心實踐
  - TDD、BDD、Git 工作流程
- [design-patterns/](03-technical-references/design-patterns/) - 設計模式
  - DDD、前端架構、系統架構
- [technical/](03-technical-references/technical/) - 技術文檔
  - 測試策略

## 📋 04-project-docs - 專案文檔
- [product/](04-project-docs/product/) - 產品相關
  - 願景、Epic、用戶畫像
- [planning/](04-project-docs/planning/) - 規劃文檔
- [legacy/](04-project-docs/legacy/) - 歷史文檔

## 📊 05-reports - 報告與記錄
- [CHANGELOG.md](05-reports/CHANGELOG.md) - 變更歷史
- [migration-report.md](05-reports/migration-report.md) - 遷移報告
- [simplification-summary.md](05-reports/simplification-summary.md) - 簡化總結
- [improvements/](05-reports/improvements/) - 改進建議

## 🔄 workflows - 工作流程
- [TICKET_DRIVEN_DEVELOPMENT.md](workflows/workflows/TICKET_DRIVEN_DEVELOPMENT.md) - 票券驅動開發

---

## 快速導航

### 新手入門
1. 先看 [workflow.md](01-getting-started/workflow.md) 了解開發流程
2. 查看 [quick-reference.md](01-getting-started/quick-reference.md) 熟悉常用命令
3. 閱讀 [onboarding.md](02-development-guides/guides/onboarding.md) 完成環境設置

### 日常開發
- 開發規範：[commit-guide.md](02-development-guides/commit-guide.md)
- 前端開發：[frontend-guide.md](02-development-guides/guides/frontend-guide.md)
- 核心實踐：[core-practices/](03-technical-references/core-practices/)

### 查找資料
- 專案願景：[product/vision.md](04-project-docs/product/vision.md)
- 技術決策：[/docs/decisions/](../decisions/)
- 變更歷史：[CHANGELOG.md](05-reports/CHANGELOG.md)
"""
    
    readme_path = handbook_dir / "README.md"
    readme_path.write_text(readme_content, encoding='utf-8')
    print("\n📄 創建新的 README.md 索引")

def main():
    reorganize_handbook()
    
    print("\n📁 新的 handbook 結構：")
    os.system("ls -la docs/handbook/")

if __name__ == "__main__":
    main()