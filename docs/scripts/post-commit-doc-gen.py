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
        
        # 優先檢查 commit-guide 保存的時間指標
        commit_time_file = self.project_root / ".git" / "last_commit_time_metrics.json"
        if commit_time_file.exists():
            try:
                with open(commit_time_file, 'r', encoding='utf-8') as f:
                    time_data = json.load(f)
                print("✅ 發現 commit-guide 時間數據")
                # 使用完後刪除暫存檔案
                commit_time_file.unlink()
                return time_data
            except Exception as e:
                print(f"⚠️  讀取 commit 時間數據失敗: {e}")
        
        # 檢查時間日誌目錄
        today = self.commit_info['time'].strftime('%Y-%m-%d')
        sessions_dir = self.project_root / "docs" / "time-logs" / "sessions" / today
        
        if sessions_dir.exists():
            # 查找最近的會話日誌
            session_files = list(sessions_dir.glob("session_*.json"))
            if session_files:
                latest_session = max(session_files, key=lambda x: x.stat().st_mtime)
                try:
                    with open(latest_session, 'r', encoding='utf-8') as f:
                        session_data = json.load(f)
                    
                    # 檢查時間是否接近當前 commit
                    session_metrics = session_data.get('session_metrics', {})
                    if session_metrics.get('is_real_time', False):
                        print("✅ 發現時間追蹤會話數據")
                        return session_metrics
                except Exception as e:
                    print(f"⚠️  讀取時間日誌失敗: {e}")
        
        return None
    
    def _analyze_commit_time(self) -> Dict:
        """基於 ADR-016 的 commit-based 時間分析，使用 git 歷史而非檔案系統時間"""
        try:
            # 1. 獲取當前 commit 的變更檔案（排除自動生成的檔案）
            code, stdout, _ = self._run_command(["git", "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"])
            if code != 0:
                return {}
                
            all_files = [f.strip() for f in stdout.strip().split('\n') if f.strip()]
            
            # 排除自動生成的檔案
            exclude_patterns = ['dev-logs/', 'CHANGELOG.md', '.yml', 'auto-generated']
            meaningful_files = [
                f for f in all_files 
                if not any(pattern in f for pattern in exclude_patterns)
            ]
            
            # 如果沒有有意義的檔案，使用所有檔案
            files_to_analyze = meaningful_files if meaningful_files else all_files
            
            # 2. 使用 git 歷史獲取檔案的首次和最後修改時間
            earliest_time = None
            latest_time = None
            
            for file_path in files_to_analyze[:10]:  # 最多分析 10 個檔案以提高效能
                # 獲取檔案的 git 歷史時間戳
                # 使用 git log 獲取檔案的修改歷史
                code, stdout, _ = self._run_command([
                    "git", "log", "--follow", "--format=%ct", "--", file_path
                ])
                
                if code == 0 and stdout:
                    timestamps = [int(ts) for ts in stdout.strip().split('\n') if ts]
                    if timestamps:
                        file_earliest = min(timestamps)
                        file_latest = max(timestamps)
                        
                        if earliest_time is None or file_earliest < earliest_time:
                            earliest_time = file_earliest
                        if latest_time is None or file_latest > latest_time:
                            latest_time = file_latest
            
            # 3. 如果無法從檔案歷史獲取，使用 commit 間隔
            if earliest_time is None or latest_time is None:
                # 獲取最近幾個 commit 的時間
                code, stdout, _ = self._run_command(["git", "log", "-5", "--pretty=%ct"])
                if code == 0:
                    timestamps = [int(ts) for ts in stdout.strip().split('\n') if ts]
                    if len(timestamps) >= 2:
                        # 使用當前和上一個 commit 的時間差
                        duration_minutes = (timestamps[0] - timestamps[1]) / 60
                        
                        # 檢查是否為連續工作（間隔小於 2 小時）
                        if 0 < duration_minutes < 120:
                            return {
                                'total_time_minutes': round(duration_minutes, 1),
                                'ai_time_minutes': round(duration_minutes * 0.8, 1),
                                'human_time_minutes': round(duration_minutes * 0.2, 1),
                                'time_calculation_method': 'git_commit_interval'
                            }
            else:
                # 計算時間範圍
                duration_minutes = (latest_time - earliest_time) / 60
                
                # 驗證合理性
                if 0.5 <= duration_minutes <= 240:  # 30秒到4小時
                    return {
                        'total_time_minutes': round(duration_minutes, 1),
                        'ai_time_minutes': round(duration_minutes * 0.8, 1),
                        'human_time_minutes': round(duration_minutes * 0.2, 1),
                        'time_calculation_method': 'git_file_history'
                    }
            
            # 4. 如果都失敗，返回空
            return {}
            
        except Exception as e:
            print(f"⚠️ Commit 時間分析失敗: {e}")
            return {}
    
    def _estimate_time_spent(self) -> Dict[str, int]:
        """優先使用真實時間，其次 commit-based 分析，最後才估算"""
        
        # 1. 首先嘗試獲取真實時間數據
        real_time = self._get_real_time_data()
        if real_time and real_time.get('total_time_minutes', 0) > 0:
            print("✅ 發現真實時間追蹤數據")
            # 使用 round 而不是 int，避免小於 1 的時間變成 0
            total_time = real_time.get('total_time_minutes', 30)
            ai_time = real_time.get('ai_time_minutes', total_time * 0.8)
            human_time = real_time.get('human_time_minutes', total_time * 0.2)
            
            return {
                'total': round(total_time, 1),  # 保留小數點
                'ai': round(ai_time, 1),
                'human': round(human_time, 1),
                'source': real_time.get('time_estimation_method', 'real_tracking'),
                'is_real': True
            }
        elif real_time:
            print("⚠️ 時間數據無效（總時間為 0）")
        
        # 2. 使用 commit-based 時間分析（ADR-016）
        print("📊 使用 Commit 邊界時間分析...")
        commit_time = self._analyze_commit_time()
        if commit_time and commit_time.get('total_time_minutes', 0) > 0:
            print(f"✅ Commit 時間分析完成: {commit_time['total_time_minutes']} 分鐘")
            return {
                'total': commit_time['total_time_minutes'],
                'ai': commit_time.get('ai_time_minutes', commit_time['total_time_minutes'] * 0.8),
                'human': commit_time.get('human_time_minutes', commit_time['total_time_minutes'] * 0.2),
                'source': 'commit_based_analysis',
                'is_real': False
            }
        
        # 3. 最後才使用檔案數量估算
        print("⚠️  無法進行 commit 時間分析，使用檔案數量估算")
        print("💡 建議：檢查 git 配置和檔案權限")
        
        total_changes = self.commit_info['total_changes']
        
        # 更合理的時間估算規則
        if total_changes == 1:
            # 單檔案修改：根據 commit 類型估算
            commit_type = self._analyze_commit_type()
            if commit_type == 'bug':
                time_spent = 5  # bug 修復通常較快
            elif commit_type == 'docs':
                time_spent = 3  # 文檔更新更快
            else:
                time_spent = 10  # 一般單檔案修改
        elif total_changes <= 3:
            time_spent = 15  # 15分鐘
        elif total_changes <= 5:
            time_spent = 30  # 30分鐘
        elif total_changes <= 10:
            time_spent = 60  # 1小時
        elif total_changes <= 20:
            time_spent = 120  # 2小時
        else:
            time_spent = 180  # 3小時
        
        # AI 通常占 80% 的時間
        ai_time = round(time_spent * 0.8, 1)
        human_time = round(time_spent * 0.2, 1)
        
        return {
            'total': time_spent,
            'ai': ai_time,
            'human': human_time,
            'source': 'file_count_estimate',
            'is_real': False
        }
    
    def update_or_generate_dev_log(self) -> str:
        """更新現有日誌或生成新日誌"""
        # 先檢查是否應該生成 dev log
        if not self._should_generate_dev_log():
            return ""
        
        commit_type = self._analyze_commit_type()
        scope = self._extract_commit_scope()
        time_info = self._estimate_time_spent()
        
        # 生成更清楚的檔名
        date_str = self.commit_info['time'].strftime('%Y-%m-%d')
        
        # 先檢查是否有 pre-commit 生成的日誌
        # 檢查日期資料夾和根目錄（兼容舊格式）
        date_folder = self.project_root / "docs" / "dev-logs" / date_str
        root_folder = self.project_root / "docs" / "dev-logs"
        
        existing_logs = []
        if date_folder.exists():
            existing_logs.extend(list(date_folder.glob(f"{date_str}-*.yml")))
        # 也檢查根目錄以兼容舊格式
        existing_logs.extend(list(root_folder.glob(f"{date_str}-*.yml")))
        
        # 查找 pre-commit 生成的日誌
        pre_commit_log = None
        print(f"🔍 檢查 {len(existing_logs)} 個現有日誌檔案...")
        for log_file in existing_logs:
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    content = yaml.safe_load(f)
                    if content.get('pre_commit_generated') and content.get('status') == 'in_progress':
                        pre_commit_log = log_file
                        print(f"✅ 發現 pre-commit 生成的日誌: {log_file.name}")
                        break
            except Exception as e:
                print(f"⚠️  無法讀取 {log_file.name}: {e}")
                continue
        
        if pre_commit_log:
            # 更新現有日誌
            print(f"📝 更新現有日誌: {pre_commit_log.name}")
            return self._update_existing_log(pre_commit_log, commit_type, scope, time_info)
        else:
            # 生成新日誌
            print(f"📝 未找到 pre-commit 日誌，生成新日誌...")
            return self._generate_new_log(commit_type, scope, time_info, date_str)
    
    def _update_existing_log(self, log_file: Path, commit_type: str, scope: str, time_info: Dict) -> str:
        print(f"📝 開始更新日誌: {log_file.name}")
        """更新現有的 pre-commit 日誌"""
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                log_content = yaml.safe_load(f)
            
            # 更新資訊
            log_content['status'] = 'completed'
            log_content['commit_hash'] = self.commit_hash
            log_content['title'] = self.commit_info['message'].split('\n')[0]
            log_content['description'] = self.commit_info['message']
            
            # 如果有更準確的時間資訊，更新它
            if time_info.get('source') != 'file_count_estimate' or not log_content.get('metrics'):
                log_content['timeline'][0]['duration'] = time_info['total']
                log_content['timeline'][0]['ai_time'] = time_info['ai']
                log_content['timeline'][0]['human_time'] = time_info['human']
                
                log_content['metrics']['total_time_minutes'] = time_info['total']
                log_content['metrics']['ai_time_minutes'] = time_info['ai']
                log_content['metrics']['human_time_minutes'] = time_info['human']
                log_content['metrics']['time_estimation_method'] = time_info.get('source', 'post_commit_update')
                log_content['metrics']['is_real_time'] = time_info.get('is_real', False)
            
            # 更新時間戳
            log_content['metrics']['commit_timestamp'] = self.commit_info['time'].isoformat()
            log_content['metrics']['post_commit_update_timestamp'] = datetime.now().isoformat()
            
            # 更新檔案變更資訊
            log_content['changes'] = self.commit_info['changes']
            log_content['metrics']['files_added'] = len(self.commit_info['changes']['added'])
            log_content['metrics']['files_modified'] = len(self.commit_info['changes']['modified'])
            log_content['metrics']['files_deleted'] = len(self.commit_info['changes']['deleted'])
            
            # 寫回檔案
            with open(log_file, 'w', encoding='utf-8') as f:
                yaml.dump(log_content, f, allow_unicode=True, sort_keys=False)
            
            print(f"✅ 已更新開發日誌: {log_file}")
            return str(log_file)
            
        except Exception as e:
            print(f"⚠️ 無法更新現有日誌: {e}")
            # 如果更新失敗，生成新的
            return self._generate_new_log(commit_type, scope, time_info, log_file.parent.name)
    
    def _get_active_ticket_info(self) -> Optional[Dict]:
        """獲取當前 active ticket 資訊"""
        try:
            # 使用 ticket-manager.py 獲取 active ticket
            ticket_manager_path = self.project_root / "docs" / "scripts" / "ticket-manager.py"
            if not ticket_manager_path.exists():
                return None
            
            result = subprocess.run(
                [sys.executable, str(ticket_manager_path), "active"],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            if result.returncode == 0 and "Active ticket:" in result.stdout:
                # 簡單解析輸出
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    if "Active ticket:" in line:
                        ticket_name = line.split("Active ticket:")[1].strip()
                        # 嘗試讀取 ticket 檔案獲取完整資訊
                        tickets_dir = self.project_root / "docs" / "tickets"
                        for date_dir in tickets_dir.iterdir():
                            if date_dir.is_dir():
                                ticket_file = date_dir / f"{ticket_name}.json"
                                if ticket_file.exists():
                                    with open(ticket_file, 'r', encoding='utf-8') as f:
                                        return json.load(f)
            
            return None
            
        except Exception as e:
            print(f"⚠️ 無法獲取 active ticket: {e}")
            return None
    
    def _should_generate_dev_log(self) -> bool:
        """判斷是否應該生成 dev log，避免遞迴追蹤"""
        # 檢查 commit 訊息是否為自動生成的
        auto_generated_patterns = [
            'docs: add commit hash',
            'docs: auto-generated',
            'auto-commit',
            'Update dev log',
            'Update CHANGELOG'
        ]
        
        for pattern in auto_generated_patterns:
            if pattern.lower() in self.commit_info['message'].lower():
                print(f"⏭️ 跳過自動生成的 commit: {pattern}")
                return False
        
        # 檢查變更的檔案是否都是自動生成的
        all_files = (self.commit_info['changes']['added'] + 
                    self.commit_info['changes']['modified'])
        
        if not all_files:
            return False
        
        # 如果所有檔案都是 dev-logs 或 CHANGELOG，跳過
        auto_files = ['dev-logs/', 'CHANGELOG.md', 'dev log', 'changelog']
        non_auto_files = [
            f for f in all_files 
            if not any(auto in f.lower() for auto in auto_files)
        ]
        
        if not non_auto_files:
            print("⏭️ 只有自動生成的檔案變更，跳過 dev log 生成")
            return False
        
        return True
    
    def _generate_new_log(self, commit_type: str, scope: str, time_info: Dict, date_str: str) -> str:
        """生成新的開發日誌"""
        
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
        
        # 生成包含時間戳的檔名
        time_str = self.commit_info['time'].strftime('%H-%M-%S')
        filename = f"{date_str}-{time_str}-{commit_type}-{name_part}.yml"
        
        # 確保日期資料夾存在
        date_folder = self.project_root / "docs" / "dev-logs" / date_str
        date_folder.mkdir(parents=True, exist_ok=True)
        filepath = date_folder / filename
        
        # 檢查是否有 active ticket
        ticket_info = self._get_active_ticket_info()
        
        # 準備日誌內容
        log_content = {
            'type': commit_type,
            'title': self.commit_info['message'].split('\n')[0],
            'date': date_str,
            'developer': 'AI + Human',
            'status': 'completed',
            'commit_hash': self.commit_hash,
            'description': self.commit_info['message'],
            'ticket_id': ticket_info.get('id') if ticket_info else None,
            'ticket_name': ticket_info.get('name') if ticket_info else None,
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
                'ai_percentage': round(time_info['ai'] / time_info['total'] * 100, 1) if time_info['total'] > 0 else 0,
                'human_percentage': round(time_info['human'] / time_info['total'] * 100, 1) if time_info['total'] > 0 else 0,
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
    
    def update_changelog(self) -> bool:
        """更新 CHANGELOG.md"""
        print(f"📝 更新 CHANGELOG.md...")
        
        # 檢查是否需要更新 changelog
        commit_type = self._analyze_commit_type()
        if commit_type not in ['feature', 'bug', 'other']:  # other 包含 perf
            print(f"ℹ️  {commit_type} 類型不需要更新 changelog")
            return False
            
        # 使用 update-changelog.py 腳本
        try:
            update_script = self.project_root / "docs" / "scripts" / "update-changelog.py"
            if not update_script.exists():
                print(f"⚠️  找不到 update-changelog.py")
                return False
                
            result = subprocess.run(
                [sys.executable, str(update_script)],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            if result.returncode == 0:
                print(f"✅ Changelog 已更新")
                return True
            else:
                print(f"⚠️  Changelog 更新失敗: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"⚠️  無法更新 changelog: {e}")
            return False
    
    def run(self):
        """執行文檔生成流程"""
        print(f"\n📝 Post-commit 文檔生成系統")
        print(f"📌 Commit: {self.commit_hash}")
        first_line = self.commit_info['message'].split('\n')[0]
        print(f"💬 訊息: {first_line}")
        print(f"📊 變更: {self.commit_info['total_changes']} 個檔案\n")
        
        # 更新 changelog
        changelog_updated = self.update_changelog()
        
        # 更新或生成開發日誌
        dev_log = self.update_or_generate_dev_log()
        
        # 根據條件生成故事
        story = None
        if dev_log:  # 只有在生成了 dev log 時才考慮生成 story
            story = self.generate_story()
        
        print(f"\n✨ 文檔生成完成！")
        
        # 如果有更新文檔，自動執行補充 commit
        files_to_commit = []
        if dev_log:
            files_to_commit.append(dev_log)
        if story:
            files_to_commit.append(story)
        if changelog_updated:
            files_to_commit.append(str(self.project_root / "docs" / "CHANGELOG.md"))
            
        if files_to_commit:
            print(f"📝 準備自動提交更新的文檔...")
            self._auto_commit_updates(files_to_commit)
        else:
            print(f"ℹ️  沒有需要更新的文檔")
        
        # 提示下一步
        print(f"\n💡 提示：")
        print(f"   - 可以執行 'make reflect' 進行深度分析")
        print(f"   - 可以手動編輯生成的文檔添加更多細節")
    
    def _auto_commit_updates(self, files_to_commit: List[str]):
        """自動提交文檔更新"""
        print(f"\n📤 自動提交文檔更新...")
        
        # 加入 git
        for file in files_to_commit:
            code, _, _ = self._run_command(["git", "add", file])
            if code != 0:
                print(f"⚠️  無法加入檔案: {file}")
                return
        
        # 檢查是否有變更
        code, stdout, _ = self._run_command(["git", "status", "--porcelain"])
        if not stdout.strip():
            print("ℹ️  沒有需要提交的變更")
            return
        
        # 執行補充 commit
        commit_msg = f"docs: add commit hash {self.commit_hash} to dev log"
        
        # 設置環境變數避免無限循環
        env = os.environ.copy()
        env['SKIP_POST_COMMIT'] = '1'
        
        result = subprocess.run(
            ["git", "commit", "-m", commit_msg],
            capture_output=True,
            text=True,
            cwd=self.project_root,
            env=env
        )
        
        if result.returncode == 0:
            # 獲取新的 commit hash
            _, new_hash, _ = self._run_command(["git", "rev-parse", "--short", "HEAD"])
            new_hash = new_hash.strip()
            print(f"✅ 已自動提交文檔更新: {new_hash}")
        else:
            print(f"⚠️  自動提交失敗: {result.stderr}")

if __name__ == "__main__":
    # 檢查是否應該跳過（避免無限循環）
    if os.environ.get('SKIP_POST_COMMIT') == '1':
        print("🔇 跳過文檔生成（文檔補充 commit）")
        sys.exit(0)
    
    generator = PostCommitDocGenerator()
    generator.run()