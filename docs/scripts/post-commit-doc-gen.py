#!/usr/bin/env python3
"""
Post-commit 自動文檔生成系統
在每次提交後自動生成開發日誌、故事和決策記錄
"""

import os
import sys
import subprocess
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# 確保可以導入 yaml
try:
    import yaml
except ImportError:
    print("⚠️ 需要安裝 PyYAML: pip install pyyaml")
    sys.exit(1)

class PostCommitDocGenerator:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.commit_hash = self._get_latest_commit_hash()
        self.commit_info = self._get_commit_info()
        
    def _run_command(self, cmd: List[str]) -> Tuple[int, str, str]:
        """執行命令並返回結果"""
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=self.project_root
        )
        return result.returncode, result.stdout, result.stderr
    
    def _get_latest_commit_hash(self) -> str:
        """獲取最新的 commit hash"""
        _, stdout, _ = self._run_command(["git", "rev-parse", "HEAD"])
        return stdout.strip()[:8]
    
    def _get_commit_info(self) -> Dict:
        """獲取 commit 詳細信息"""
        # 獲取 commit 訊息
        _, message, _ = self._run_command(["git", "log", "-1", "--pretty=%B"])
        
        # 獲取變更的檔案
        _, files, _ = self._run_command(["git", "diff-tree", "--no-commit-id", "--name-status", "-r", "HEAD"])
        
        # 解析檔案變更
        changes = {
            'added': [],
            'modified': [],
            'deleted': []
        }
        
        for line in files.strip().split('\n'):
            if line:
                parts = line.split('\t')
                if len(parts) >= 2:
                    status, filepath = parts[0], parts[1]
                    if status == 'A':
                        changes['added'].append(filepath)
                    elif status == 'M':
                        changes['modified'].append(filepath)
                    elif status == 'D':
                        changes['deleted'].append(filepath)
        
        # 獲取 commit 時間
        _, timestamp, _ = self._run_command(["git", "log", "-1", "--pretty=%ct"])
        commit_time = datetime.fromtimestamp(int(timestamp.strip()))
        
        return {
            'hash': self.commit_hash,
            'message': message.strip(),
            'time': commit_time,
            'changes': changes,
            'total_changes': len(changes['added']) + len(changes['modified']) + len(changes['deleted'])
        }
    
    def _analyze_commit_type(self) -> str:
        """分析 commit 類型"""
        message = self.commit_info['message'].lower()
        
        if message.startswith('feat'):
            return 'feature'
        elif message.startswith('fix'):
            return 'bug'
        elif message.startswith('refactor'):
            return 'refactor'
        elif message.startswith('docs'):
            return 'docs'
        elif message.startswith('test'):
            return 'test'
        else:
            return 'other'
    
    def _extract_commit_scope(self) -> str:
        """從 commit 訊息中提取 scope"""
        match = re.match(r'^[^(]+\(([^)]+)\)', self.commit_info['message'])
        if match:
            return match.group(1)
        return 'general'
    
    def _estimate_time_spent(self) -> Dict[str, int]:
        """估算開發時間（基於變更大小）"""
        total_changes = self.commit_info['total_changes']
        
        # 簡單的時間估算規則
        if total_changes <= 3:
            time_spent = 30  # 30分鐘
        elif total_changes <= 10:
            time_spent = 60  # 1小時
        elif total_changes <= 20:
            time_spent = 120  # 2小時
        else:
            time_spent = 180  # 3小時
        
        # AI 通常占 80% 的時間
        ai_time = int(time_spent * 0.8)
        human_time = time_spent - ai_time
        
        return {
            'total': time_spent,
            'ai': ai_time,
            'human': human_time
        }
    
    def generate_dev_log(self) -> str:
        """生成開發日誌"""
        commit_type = self._analyze_commit_type()
        scope = self._extract_commit_scope()
        time_info = self._estimate_time_spent()
        
        # 生成檔名
        date_str = self.commit_info['time'].strftime('%Y-%m-%d')
        filename = f"{date_str}-{commit_type}-{scope}-{self.commit_hash}.yml"
        filepath = self.project_root / "docs" / "dev-logs" / filename
        
        # 準備日誌內容
        log_content = {
            'type': commit_type,
            'title': self.commit_info['message'].split('\n')[0],
            'date': date_str,
            'developer': 'AI + Human',
            'status': 'completed',
            'commit_hash': self.commit_hash,
            'description': self.commit_info['message'],
            'timeline': [{
                'phase': '實現',
                'duration': time_info['total'],
                'ai_time': time_info['ai'],
                'human_time': time_info['human'],
                'tasks': self._generate_task_list()
            }],
            'metrics': {
                'total_time': time_info['total'],
                'ai_percentage': round(time_info['ai'] / time_info['total'] * 100, 1),
                'human_percentage': round(time_info['human'] / time_info['total'] * 100, 1),
                'files_added': len(self.commit_info['changes']['added']),
                'files_modified': len(self.commit_info['changes']['modified']),
                'files_deleted': len(self.commit_info['changes']['deleted'])
            },
            'changes': self.commit_info['changes'],
            'auto_generated': True,
            'generation_time': datetime.now().isoformat()
        }
        
        # 寫入檔案
        with open(filepath, 'w', encoding='utf-8') as f:
            yaml.dump(log_content, f, allow_unicode=True, sort_keys=False)
        
        print(f"✅ 已生成開發日誌: {filepath}")
        return str(filepath)
    
    def _generate_task_list(self) -> List[str]:
        """根據變更生成任務列表"""
        tasks = []
        
        # 分析新增檔案
        for file in self.commit_info['changes']['added'][:3]:  # 最多列出3個
            tasks.append(f"創建 {Path(file).name}")
        
        # 分析修改檔案
        for file in self.commit_info['changes']['modified'][:3]:
            tasks.append(f"更新 {Path(file).name}")
        
        # 分析刪除檔案
        for file in self.commit_info['changes']['deleted'][:2]:
            tasks.append(f"移除 {Path(file).name}")
        
        if not tasks:
            tasks.append("程式碼優化和改進")
        
        return tasks
    
    def should_generate_story(self) -> bool:
        """判斷是否應該生成故事"""
        # 生成故事的條件
        conditions = [
            self.commit_info['total_changes'] > 10,  # 大量變更
            'feat' in self.commit_info['message'].lower(),  # 新功能
            'fix' in self.commit_info['message'].lower() and self.commit_info['total_changes'] > 5,  # 重要修復
            'refactor' in self.commit_info['message'].lower() and self.commit_info['total_changes'] > 8,  # 大重構
        ]
        return any(conditions)
    
    def generate_story(self) -> Optional[str]:
        """生成開發故事"""
        if not self.should_generate_story():
            return None
        
        commit_type = self._analyze_commit_type()
        date_str = self.commit_info['time'].strftime('%Y-%m-%d')
        
        # 決定故事類別
        if commit_type == 'feature':
            category = 'features'
        elif commit_type == 'bug':
            category = 'debugging'
        elif commit_type == 'refactor':
            category = 'refactoring'
        else:
            category = 'collaboration-insights'
        
        # 生成檔名
        scope = self._extract_commit_scope()
        filename = f"{date_str}-{scope}-{self.commit_hash}.md"
        filepath = self.project_root / "docs" / "stories" / category / filename
        
        # 生成故事內容
        title = self.commit_info['message'].split('\n')[0]
        story_content = f"""# {title}

**日期**: {date_str}  
**類型**: {commit_type}  
**Commit**: {self.commit_hash}

## 背景

這次提交包含了 {self.commit_info['total_changes']} 個檔案的變更。

## 主要變更

"""
        
        # 列出主要變更
        if self.commit_info['changes']['added']:
            story_content += "### 新增檔案\n"
            for file in self.commit_info['changes']['added'][:5]:
                story_content += f"- `{file}`\n"
            story_content += "\n"
        
        if self.commit_info['changes']['modified']:
            story_content += "### 修改檔案\n"
            for file in self.commit_info['changes']['modified'][:5]:
                story_content += f"- `{file}`\n"
            story_content += "\n"
        
        story_content += """## 學到的經驗

1. **自動化的重要性**: 透過自動生成文檔，可以確保每次開發都有完整記錄
2. **持續改進**: 每次提交都是改進流程的機會

## 後續改進

- [ ] 持續優化文檔生成品質
- [ ] 收集更多使用反饋
- [ ] 改進時間估算準確度

---
*此故事由 post-commit 自動生成*
"""
        
        # 確保目錄存在
        filepath.parent.mkdir(parents=True, exist_ok=True)
        
        # 寫入檔案
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(story_content)
        
        print(f"✅ 已生成開發故事: {filepath}")
        return str(filepath)
    
    def run(self):
        """執行文檔生成流程"""
        print(f"\n📝 Post-commit 文檔生成系統")
        print(f"📌 Commit: {self.commit_hash}")
        first_line = self.commit_info['message'].split('\n')[0]
        print(f"💬 訊息: {first_line}")
        print(f"📊 變更: {self.commit_info['total_changes']} 個檔案\n")
        
        # 生成開發日誌
        dev_log = self.generate_dev_log()
        
        # 根據條件生成故事
        story = self.generate_story()
        
        print(f"\n✨ 文檔生成完成！")
        
        # 提示下一步
        print(f"\n💡 提示：")
        print(f"   - 可以執行 'make reflect' 進行深度分析")
        print(f"   - 可以手動編輯生成的文檔添加更多細節")

if __name__ == "__main__":
    generator = PostCommitDocGenerator()
    generator.run()