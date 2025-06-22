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
    
    def _get_real_time_data(self) -> Optional[Dict]:
        """檢查是否有真實時間追蹤數據"""
        # 檢查時間日誌目錄
        today = self.commit_info['time'].strftime('%Y-%m-%d')
        sessions_dir = self.project_root / "docs" / "time-logs" / "sessions" / today
        
        if sessions_dir.exists():
            # 查找最近的會話日誌
            session_files = list(sessions_dir.glob("session_*.json"))
            if session_files:
                latest_session = max(session_files, key=lambda x: x.stat().st_mtime)
                try:
                    import json
                    with open(latest_session, 'r', encoding='utf-8') as f:
                        session_data = json.load(f)
                    
                    # 檢查時間是否接近當前 commit
                    session_metrics = session_data.get('session_metrics', {})
                    if session_metrics.get('is_real_time', False):
                        return session_metrics
                except Exception as e:
                    print(f"⚠️  讀取時間日誌失敗: {e}")
        
        return None
    
    def _estimate_time_spent(self) -> Dict[str, int]:
        """優先使用真實時間，否則估算（並警告）"""
        
        # 1. 首先嘗試獲取真實時間數據
        real_time = self._get_real_time_data()
        if real_time:
            print("✅ 發現真實時間追蹤數據")
            return {
                'total': int(real_time.get('total_time_minutes', 30)),
                'ai': int(real_time.get('ai_time_minutes', 24)),
                'human': int(real_time.get('human_time_minutes', 6)),
                'source': 'real_tracking',
                'is_real': True
            }
        
        # 2. 沒有真實時間，發出警告並使用估算
        print("⚠️  沒有發現真實時間追蹤數據，使用檔案數量估算")
        print("💡 建議：下次開發前執行 start_tracking_session()")
        
        total_changes = self.commit_info['total_changes']
        
        # 簡單的時間估算規則（保持原邏輯）
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
            'human': human_time,
            'source': 'file_count_estimate',
            'is_real': False
        }
    
    def generate_dev_log(self) -> str:
        """生成開發日誌"""
        commit_type = self._analyze_commit_type()
        scope = self._extract_commit_scope()
        time_info = self._estimate_time_spent()
        
        # 生成更清楚的檔名
        date_str = self.commit_info['time'].strftime('%Y-%m-%d')
        
        # 從 commit 訊息中提取關鍵詞作為檔名
        commit_title = self.commit_info['message'].split('\n')[0]
        # 移除 conventional commit 前綴，提取核心描述
        clean_title = re.sub(r'^[^:]+:\s*', '', commit_title)
        
        # 智能關鍵詞映射
        keyword_mapping = {
            'implement': 'implementation',
            'add': 'addition', 
            'update': 'enhancement',
            'fix': 'bugfix',
            'refactor': 'refactoring',
            'improve': 'improvement',
            'enhance': 'enhancement',
            'create': 'creation',
            'setup': 'configuration',
            'config': 'configuration',
            'ui': 'user-interface',
            'api': 'application-interface',
            'db': 'database',
            'auth': 'authentication',
            'docs': 'documentation',
            'test': 'testing',
            'feat': 'feature',
            'perf': 'performance'
        }
        
        # 將描述轉換為檔名友好格式
        name_part = re.sub(r'[^\w\s-]', '', clean_title)  # 移除特殊字符
        name_part = re.sub(r'\s+', '-', name_part.strip())  # 空格轉連字符
        name_part = name_part.lower()
        
        # 應用關鍵詞映射
        for short, full in keyword_mapping.items():
            name_part = re.sub(r'\b' + short + r'\b', full, name_part)
        
        # 確保名稱有意義且不會截斷
        if len(name_part) < 15:  # 太短，需要補充
            name_part = f"{scope}-{name_part}" if name_part else f"{scope}-enhancement"
        elif len(name_part) > 40:  # 太長，智能縮減但保持清晰
            # 保留關鍵詞，移除冗餘詞語
            redundant_words = ['for', 'and', 'with', 'the', 'of', 'in', 'to', 'from', 'implementation', 'comprehensive']
            words = name_part.split('-')
            filtered_words = [w for w in words if w not in redundant_words]
            
            # 如果還是太長，保留前幾個關鍵詞
            if len('-'.join(filtered_words)) > 40:
                key_words = filtered_words[:5]  # 只保留前5個詞
                name_part = '-'.join(key_words)
            else:
                name_part = '-'.join(filtered_words)
        
        # 最終檢查：確保不以數字或特殊字符結尾
        name_part = re.sub(r'-+$', '', name_part)  # 移除末尾的連字符
        
        filename = f"{date_str}-{commit_type}-{name_part}.yml"
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
                'total_time_minutes': time_info['total'],  # 明確標示單位：分鐘
                'ai_time_minutes': time_info['ai'],
                'human_time_minutes': time_info['human'],
                'ai_percentage': round(time_info['ai'] / time_info['total'] * 100, 1),
                'human_percentage': round(time_info['human'] / time_info['total'] * 100, 1),
                'files_added': len(self.commit_info['changes']['added']),
                'files_modified': len(self.commit_info['changes']['modified']),
                'files_deleted': len(self.commit_info['changes']['deleted']),
                # 時間戳記錄
                'commit_timestamp': self.commit_info['time'].isoformat(),
                'generation_timestamp': datetime.now().isoformat(),
                # 動態標記時間來源
                'time_estimation_method': time_info.get('source', 'file_count_estimate'),
                'is_real_time': time_info.get('is_real', False),
                'time_data_quality': 'high' if time_info.get('is_real', False) else 'estimated'
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
        """嚴格判斷是否應該生成故事"""
        story_score = self._calculate_story_score()
        
        # 分數低於 60 不生成故事
        if story_score < 60:
            return False
            
        # 檢查是否為無意義的更新
        if self._is_meaningless_update():
            return False
            
        return True
    
    def _calculate_story_score(self) -> int:
        """計算故事價值分數 (0-100)"""
        score = 0
        message = self.commit_info['message'].lower()
        
        # 技術複雜度評分 (0-30分)
        if self.commit_info['total_changes'] > 15:
            score += 15
        elif self.commit_info['total_changes'] > 8:
            score += 10
        elif self.commit_info['total_changes'] > 5:
            score += 5
            
        # 涉及多個系統
        affected_systems = set()
        for file in self.commit_info['changes']['added'] + self.commit_info['changes']['modified']:
            if 'frontend' in file:
                affected_systems.add('frontend')
            elif 'backend' in file:
                affected_systems.add('backend')
            elif 'docs' in file:
                affected_systems.add('docs')
                
        if len(affected_systems) > 1:
            score += 10
            
        # 業務影響評分 (0-30分)
        business_keywords = ['feature', 'user', 'api', 'ui', 'auth', 'login', 'integrate']
        for keyword in business_keywords:
            if keyword in message:
                score += 8
                break
                
        # 性能或架構改進
        if any(word in message for word in ['optimize', 'performance', 'architecture', 'refactor']):
            score += 15
            
        # 開發洞察評分 (0-40分)
        insight_keywords = ['implement', 'solve', 'breakthrough', 'challenge', 'discovery', 'integration']
        for keyword in insight_keywords:
            if keyword in message:
                score += 15
                break
                
        # 系統性改進
        if any(word in message for word in ['system', 'workflow', 'automation', 'process']):
            score += 20
            
        # 複雜問題解決
        if any(word in message for word in ['fix complex', 'resolve issue', 'debug', 'troubleshoot']):
            score += 25
            
        return min(score, 100)  # 最高 100 分
    
    def _is_meaningless_update(self) -> bool:
        """檢查是否為無意義的更新"""
        message = self.commit_info['message'].lower()
        
        # 無意義關鍵詞
        meaningless_keywords = [
            'format', 'style', 'cleanup', 'typo', 'rename', 'move', 
            'update version', 'bump', 'merge', 'sync', 'delete',
            'filename', 'naming', 'convention', 'documentation system',
            'file naming', 'auto-generated'
        ]
        
        for keyword in meaningless_keywords:
            if keyword in message:
                return True
                
        # 如果只是文檔相關的小更新
        if 'docs' in message and self.commit_info['total_changes'] < 5:
            return True
            
        return False
    
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
        
        # 生成清楚的檔名（使用與開發日誌相同的邏輯）
        commit_title = self.commit_info['message'].split('\n')[0]
        clean_title = re.sub(r'^[^:]+:\s*', '', commit_title)
        
        # 應用關鍵詞映射
        keyword_mapping = {
            'implement': 'implementation',
            'add': 'addition', 
            'update': 'enhancement',
            'fix': 'bugfix',
            'refactor': 'refactoring',
            'improve': 'improvement',
            'enhance': 'enhancement',
            'create': 'creation',
            'setup': 'configuration',
            'config': 'configuration',
            'ui': 'user-interface',
            'api': 'application-interface',
            'db': 'database',
            'auth': 'authentication',
            'docs': 'documentation',
            'test': 'testing',
            'feat': 'feature',
            'perf': 'performance'
        }
        
        name_part = re.sub(r'[^\w\s-]', '', clean_title)
        name_part = re.sub(r'\s+', '-', name_part.strip())
        name_part = name_part.lower()
        
        # 應用關鍵詞映射
        for short, full in keyword_mapping.items():
            name_part = re.sub(r'\b' + short + r'\b', full, name_part)
        
        # 確保名稱有意義
        if len(name_part) < 15:
            scope = self._extract_commit_scope()
            name_part = f"{scope}-{name_part}" if name_part else f"{scope}-enhancement"
        elif len(name_part) > 35:  # 故事檔名稍短，為 -story 留空間
            redundant_words = ['for', 'and', 'with', 'the', 'of', 'in', 'to', 'from', 'implementation', 'comprehensive']
            words = name_part.split('-')
            filtered_words = [w for w in words if w not in redundant_words]
            
            # 如果還是太長，保留前幾個關鍵詞
            if len('-'.join(filtered_words)) > 35:
                key_words = filtered_words[:4]  # 只保留前4個詞
                name_part = '-'.join(key_words)
            else:
                name_part = '-'.join(filtered_words)
        
        name_part = re.sub(r'-+$', '', name_part)
        filename = f"{date_str}-{name_part}-story.md"
        filepath = self.project_root / "docs" / "stories" / category / filename
        
        # 生成故事內容
        title = self.commit_info['message'].split('\n')[0]
        story_content = f"""# {title}

**日期**: {date_str}  
**類型**: {commit_type}  
**Commit**: {self.commit_hash}
**變更檔案**: {self.commit_info['total_changes']} 個

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