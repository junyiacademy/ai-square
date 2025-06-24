#!/usr/bin/env python3
"""
智能提交分析器
分析變更並合理分組，自動補齊文檔
"""

import os
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple, Set
from datetime import datetime

class SmartCommitAnalyzer:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        
    def get_changes(self) -> Dict[str, List[str]]:
        """獲取所有變更檔案"""
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True, text=True, cwd=self.project_root
        )
        
        changes = {
            'modified': [],
            'added': [],
            'deleted': [],
            'untracked': []
        }
        
        for line in result.stdout.strip().split('\n'):
            if line:
                status = line[:2]
                filepath = line[3:]
                
                if status == 'M ' or status == ' M':
                    changes['modified'].append(filepath)
                elif status == 'A ':
                    changes['added'].append(filepath)
                elif status == 'D ':
                    changes['deleted'].append(filepath)
                elif status == '??':
                    changes['untracked'].append(filepath)
        
        return changes
    
    def categorize_files(self, files: List[str]) -> Dict[str, List[str]]:
        """將檔案按類型分類"""
        categories = {
            'core_system': [],      # 核心系統檔案
            'documentation': [],    # 文檔檔案
            'auto_generated': [],   # 自動生成的檔案
            'config': [],          # 配置檔案
            'frontend': [],        # 前端代碼
            'backend': [],         # 後端代碼
            'tests': [],           # 測試檔案
        }
        
        for file in files:
            if any(pattern in file for pattern in [
                'docs/scripts/', 'Makefile', 'CLAUDE.md', '.gitignore'
            ]):
                categories['core_system'].append(file)
            elif any(pattern in file for pattern in [
                'docs/dev-logs/', 'docs/stories/', 'auto-fix-instructions.md'
            ]):
                categories['auto_generated'].append(file)
            elif file.startswith('docs/'):
                categories['documentation'].append(file)
            elif any(pattern in file for pattern in [
                'package.json', '.config', 'eslint', 'jest.config'
            ]):
                categories['config'].append(file)
            elif file.startswith('frontend/'):
                if 'test' in file or 'spec' in file:
                    categories['tests'].append(file)
                else:
                    categories['frontend'].append(file)
            elif file.startswith('backend/'):
                categories['backend'].append(file)
            elif 'test' in file or 'spec' in file:
                categories['tests'].append(file)
            else:
                categories['core_system'].append(file)  # 預設歸類
        
        # 移除空分類
        return {k: v for k, v in categories.items() if v}
    
    def suggest_commit_groups(self, changes: Dict[str, List[str]]) -> List[Dict]:
        """建議提交分組"""
        all_files = (
            changes['modified'] + changes['added'] + 
            changes['deleted'] + changes['untracked']
        )
        
        categories = self.categorize_files(all_files)
        groups = []
        
        # 1. 核心系統變更（優先提交）
        if categories.get('core_system'):
            groups.append({
                'name': '核心系統更新',
                'type': 'feat',
                'priority': 1,
                'files': categories['core_system'],
                'description': '更新核心開發工具和系統配置'
            })
        
        # 2. 前端/後端功能變更
        if categories.get('frontend'):
            groups.append({
                'name': '前端功能更新',
                'type': 'feat',
                'priority': 2,
                'files': categories['frontend'],
                'description': '前端代碼功能實現'
            })
        
        if categories.get('backend'):
            groups.append({
                'name': '後端功能更新',
                'type': 'feat',
                'priority': 2,
                'files': categories['backend'],
                'description': '後端代碼功能實現'
            })
        
        # 3. 測試檔案
        if categories.get('tests'):
            groups.append({
                'name': '測試更新',
                'type': 'test',
                'priority': 3,
                'files': categories['tests'],
                'description': '測試檔案更新和新增'
            })
        
        # 4. 配置檔案
        if categories.get('config'):
            groups.append({
                'name': '配置更新',
                'type': 'chore',
                'priority': 4,
                'files': categories['config'],
                'description': '配置檔案更新'
            })
        
        # 5. 文檔更新
        if categories.get('documentation'):
            groups.append({
                'name': '文檔更新',
                'type': 'docs',
                'priority': 5,
                'files': categories['documentation'],
                'description': '文檔內容更新'
            })
        
        # 6. 自動生成的檔案（最後提交）
        if categories.get('auto_generated'):
            groups.append({
                'name': '自動生成文檔',
                'type': 'docs',
                'priority': 6,
                'files': categories['auto_generated'],
                'description': '系統自動生成的開發日誌和故事'
            })
        
        return sorted(groups, key=lambda x: x['priority'])
    
    def check_missing_docs(self, commit_group: Dict) -> List[str]:
        """檢查是否需要補齊文檔"""
        missing_docs = []
        files = commit_group['files']
        
        # 檢查是否需要開發日誌
        has_code_changes = any(
            f.endswith(('.py', '.ts', '.tsx', '.js', '.jsx')) 
            for f in files
        )
        
        if has_code_changes:
            today = datetime.now().strftime('%Y-%m-%d')
            dev_logs_dir = self.project_root / 'docs' / 'dev-logs'
            
            # 檢查今天是否有相關的開發日誌
            existing_logs = list(dev_logs_dir.glob(f'{today}*.yml'))
            if not existing_logs:
                missing_docs.append('開發日誌')
        
        # 檢查重要決策是否需要 ADR
        if any('script' in f or 'Makefile' in f for f in files):
            missing_docs.append('可能需要決策記錄 (ADR)')
        
        return missing_docs
    
    def auto_generate_docs(self, commit_group: Dict):
        """自動生成缺失的文檔"""
        print(f"🤖 為 '{commit_group['name']}' 自動生成文檔...")
        
        try:
            # 執行 post-commit 文檔生成（針對暫存的變更）
            doc_gen_script = self.project_root / "docs" / "scripts" / "post-commit-doc-gen.py"
            result = subprocess.run(
                [sys.executable, str(doc_gen_script)],
                capture_output=True, text=True
            )
            
            if result.returncode == 0:
                print("✅ 文檔生成完成")
            else:
                print(f"⚠️ 文檔生成失敗: {result.stderr}")
                
        except Exception as e:
            print(f"⚠️ 無法生成文檔: {e}")
    
    def run_analysis(self):
        """執行完整分析"""
        print("🔍 分析當前變更...")
        
        changes = self.get_changes()
        total_files = sum(len(files) for files in changes.values())
        
        if total_files == 0:
            print("✅ 沒有檔案變更需要提交")
            return
        
        print(f"📊 發現 {total_files} 個檔案變更")
        
        groups = self.suggest_commit_groups(changes)
        
        print(f"\n💡 建議分成 {len(groups)} 個提交:")
        for i, group in enumerate(groups, 1):
            print(f"\n{i}. {group['name']} ({group['type']})")
            print(f"   檔案: {len(group['files'])} 個")
            for file in group['files'][:3]:  # 只顯示前3個
                print(f"   - {file}")
            if len(group['files']) > 3:
                print(f"   ... 還有 {len(group['files']) - 3} 個檔案")
            
            # 檢查缺失的文檔
            missing = self.check_missing_docs(group)
            if missing:
                print(f"   📝 建議補充: {', '.join(missing)}")
        
        return groups

if __name__ == "__main__":
    import sys
    
    analyzer = SmartCommitAnalyzer()
    groups = analyzer.run_analysis()
    
    if groups:
        print(f"\n🚀 使用建議:")
        print(f"   make commit-group GROUP_NUMBER  # 提交指定分組")
        print(f"   make commit-smart              # 交互式提交")
        print(f"   make commit-auto               # 自動提交所有")