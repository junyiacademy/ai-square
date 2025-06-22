#!/usr/bin/env python3
"""
重新命名不符合命名規範的舊檔案
"""

import os
import shutil
from pathlib import Path

class LegacyFileRenamer:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.rename_mapping = {
            # 開發日誌重新命名
            'docs/dev-logs/2025-06-23-bug-misc-840cecf9.yml': 
                'docs/dev-logs/2025-06-23-bug-miscellaneous-fixes.yml',
            'docs/dev-logs/2025-06-23-docs-auto-d8cd84c3.yml': 
                'docs/dev-logs/2025-06-23-docs-automation-setup.yml',
            'docs/dev-logs/2025-06-23-docs-decisions-1d6388cc.yml': 
                'docs/dev-logs/2025-06-23-docs-architecture-decisions.yml',
            'docs/dev-logs/2025-06-23-feature-core-dc21387f.yml': 
                'docs/dev-logs/2025-06-23-feature-core-system-enhancement.yml',
            'docs/dev-logs/2025-06-23-feature-docs-98b02a16.yml': 
                'docs/dev-logs/2025-06-23-feature-documentation-system.yml',
                
            # 開發故事重新命名
            'docs/stories/features/2025-06-23-core-dc21387f.md': 
                'docs/stories/features/2025-06-23-core-system-enhancement-story.md',
            'docs/stories/features/2025-06-23-docs-98b02a16.md': 
                'docs/stories/features/2025-06-23-documentation-system-story.md',
                
            # 改進建議重新命名
            'docs/handbook/improvements/improvement-2025-06-23-0117.md': 
                'docs/handbook/improvements/improvement-2025-06-23-early-morning-fixes.md',
            'docs/handbook/improvements/improvement-2025-06-23-0117.yml': 
                'docs/handbook/improvements/improvement-2025-06-23-early-morning-fixes.yml',
                
            # 其他問題檔案
            'docs/stories/features/2025-06-22-unknown-insight.md': 
                'docs/stories/features/2025-06-22-development-insights.md',
        }
        
    def rename_files(self):
        """執行檔案重新命名"""
        print("🔄 開始重新命名不符合規範的檔案...")
        
        renamed_count = 0
        failed_count = 0
        
        for old_path, new_path in self.rename_mapping.items():
            old_file = self.project_root / old_path
            new_file = self.project_root / new_path
            
            if old_file.exists():
                try:
                    # 確保目標目錄存在
                    new_file.parent.mkdir(parents=True, exist_ok=True)
                    
                    # 重新命名檔案
                    shutil.move(str(old_file), str(new_file))
                    print(f"✅ {old_file.name} → {new_file.name}")
                    renamed_count += 1
                    
                except Exception as e:
                    print(f"❌ 重新命名失敗 {old_file.name}: {e}")
                    failed_count += 1
            else:
                print(f"⚠️  檔案不存在: {old_file}")
        
        print(f"\n📊 重新命名完成:")
        print(f"   ✅ 成功: {renamed_count} 個檔案")
        print(f"   ❌ 失敗: {failed_count} 個檔案")
        
        if renamed_count > 0:
            print(f"\n💡 建議:")
            print(f"   - 檢查重新命名的檔案是否正確")
            print(f"   - 更新任何引用這些檔案的連結")
            print(f"   - 提交這些變更")
    
    def check_remaining_issues(self):
        """檢查是否還有其他命名問題"""
        print("\n🔍 檢查剩餘的命名問題...")
        
        docs_dir = self.project_root / "docs"
        issue_patterns = [
            r'[a-f0-9]{8}',  # commit hash 模式
            r'-fo\.', r'-xx\.', r'-\w{2}\.', # 截斷模式
            r'misc', r'temp', r'unknown'  # 無意義詞語
        ]
        
        import re
        
        issues_found = []
        for file_path in docs_dir.rglob('*'):
            if file_path.is_file():
                filename = file_path.name
                for pattern in issue_patterns:
                    if re.search(pattern, filename):
                        issues_found.append(str(file_path.relative_to(self.project_root)))
                        break
        
        if issues_found:
            print(f"⚠️  發現 {len(issues_found)} 個可能的命名問題:")
            for issue in issues_found:
                print(f"   - {issue}")
        else:
            print("✅ 沒有發現明顯的命名問題")
    
    def run(self):
        """執行完整的重新命名流程"""
        self.rename_files()
        self.check_remaining_issues()

if __name__ == "__main__":
    renamer = LegacyFileRenamer()
    renamer.run()