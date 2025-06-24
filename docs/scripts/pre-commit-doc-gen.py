#!/usr/bin/env python3
"""
Pre-commit 文檔生成系統
在 commit 前生成開發日誌，使用檔案修改時間計算開發時間
commit 後再補上 hash
"""

import os
import sys
import subprocess
import json
import yaml
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# 加入文件參考追蹤
sys.path.append(str(Path(__file__).parent))
try:
    from document_reference_tracker import DocumentReferenceTracker
except ImportError:
    DocumentReferenceTracker = None

class PreCommitDocGenerator:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.staged_files = self._get_staged_files()
        self.time_metrics = self._calculate_time_from_files()
        self.active_ticket = self._get_active_ticket()
        self.doc_tracker = DocumentReferenceTracker() if DocumentReferenceTracker else None
        
    def _run_command(self, cmd: List[str]) -> Tuple[int, str, str]:
        """執行命令並返回結果"""
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=self.project_root
        )
        return result.returncode, result.stdout, result.stderr
    
    def _get_staged_files(self) -> List[Dict]:
        """獲取 staged 檔案列表"""
        code, stdout, _ = self._run_command(["git", "diff", "--cached", "--name-status"])
        if code != 0:
            return []
        
        files = []
        for line in stdout.strip().split('\n'):
            if line:
                parts = line.split('\t')
                if len(parts) >= 2:
                    status, filepath = parts[0], parts[1]
                    files.append({
                        'path': filepath,
                        'status': status  # A=Added, M=Modified, D=Deleted
                    })
        return files
    
    def _get_active_ticket(self) -> Optional[Dict]:
        """獲取當前 active ticket"""
        tickets_dir = self.project_root / "docs" / "tickets"
        if not tickets_dir.exists():
            return None
            
        # 從最新日期開始尋找
        for date_dir in sorted(tickets_dir.iterdir(), reverse=True):
            if date_dir.is_dir():
                # 先找新格式 (YAML)
                for yml_file in date_dir.glob("*-ticket-*.yml"):
                    try:
                        with open(yml_file, 'r', encoding='utf-8') as f:
                            ticket_data = yaml.safe_load(f)
                        if ticket_data.get('status') == 'in_progress':
                            ticket_data['_file_path'] = str(yml_file)
                            return ticket_data
                    except Exception:
                        pass
                # 再找舊格式 (JSON)
                for json_file in date_dir.glob("*.json"):
                    try:
                        with open(json_file, 'r', encoding='utf-8') as f:
                            ticket_data = json.load(f)
                        if ticket_data.get('status') == 'in_progress':
                            ticket_data['_file_path'] = str(json_file)
                            return ticket_data
                    except Exception:
                        pass
        return None
    
    def _calculate_time_from_files(self) -> Dict:
        """基於 git 歷史計算開發時間（參考 ADR-016）"""
        if not self.staged_files:
            return {
                'total_time_minutes': 0,
                'method': 'no_files'
            }
        
        # 排除自動生成的檔案
        exclude_patterns = ['dev-logs/', 'CHANGELOG.md', '.yml', 'auto-generated']
        meaningful_files = [
            f for f in self.staged_files 
            if not any(pattern in f['path'] for pattern in exclude_patterns)
        ]
        
        # 如果沒有有意義的檔案，使用所有檔案
        files_to_analyze = meaningful_files if meaningful_files else self.staged_files
        
        # 使用 git 歷史獲取檔案的修改時間
        earliest_time = None
        latest_time = None
        
        for file_info in files_to_analyze[:10]:  # 最多分析 10 個檔案
            # 獲取檔案的 git 歷史時間戳
            code, stdout, _ = self._run_command([
                "git", "log", "--follow", "--format=%ct", "--", file_info['path']
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
        
        # 如果無法從檔案歷史獲取，使用 commit 間隔
        now = datetime.now()
        if earliest_time is None or latest_time is None:
            # 獲取上一個 commit 時間
            code, stdout, _ = self._run_command(["git", "log", "-1", "--pretty=%ct"])
            if code == 0 and stdout.strip():
                last_commit_time = int(stdout.strip())
                duration_minutes = (now.timestamp() - last_commit_time) / 60
                return {
                    'total_time_minutes': max(round(duration_minutes, 1), 1),
                    'method': 'commit_interval',
                    'start_time': datetime.fromtimestamp(last_commit_time).isoformat(),
                    'end_time': now.isoformat()
                }
        
        # 計算時間差
        if earliest_time and latest_time:
            duration_minutes = (latest_time - earliest_time) / 60
            # 如果太短，使用當前時間
            if duration_minutes < 1:
                duration_minutes = (now.timestamp() - latest_time) / 60
            
            return {
                'total_time_minutes': max(round(duration_minutes, 1), 1),
                'method': 'git_history',
                'start_time': datetime.fromtimestamp(earliest_time).isoformat(),
                'end_time': datetime.fromtimestamp(latest_time).isoformat(),
                'file_count': len(files_to_analyze)
            }
        
        # 如果無法計算準確時間，記錄為未知
        print("⚠️  無法計算準確的開發時間")
        print("💡 建議：使用 ticket 系統追蹤時間")
        
        return {
            'total_time_minutes': 0,  # 標記為未知時間
            'method': 'unknown_time',
            'note': '無法準確計算時間，建議使用 ticket 系統追蹤'
        }
    
    def _analyze_commit_type(self) -> str:
        """分析 commit 類型（從 staged 檔案推測）"""
        # 檢查是否有 bug 修復相關檔案
        for file_info in self.staged_files:
            path = file_info['path'].lower()
            if 'fix' in path or 'bug' in path:
                return 'bug'
            elif 'test' in path:
                return 'test'
            elif 'doc' in path or 'readme' in path:
                return 'docs'
        
        # 根據變更類型判斷
        if any(f['status'] == 'A' for f in self.staged_files):
            return 'feature'
        elif any(f['status'] == 'D' for f in self.staged_files):
            return 'refactor'
        else:
            return 'update'
    
    def generate_pre_commit_log(self) -> str:
        """生成 pre-commit 開發日誌"""
        commit_type = self._analyze_commit_type()
        date_str = datetime.now().strftime('%Y-%m-%d')
        
        # 生成檔名（包含時間）
        now = datetime.now()
        time_str = now.strftime('%H-%M-%S')
        task_desc = self._generate_task_description()
        filename = f"{date_str}-{time_str}-{commit_type}-{task_desc}.yml"
        # 確保日期資料夾存在
        date_folder = self.project_root / "docs" / "dev-logs" / date_str
        date_folder.mkdir(parents=True, exist_ok=True)
        filepath = date_folder / filename
        
        # 準備檔案變更資訊
        changes = {
            'added': [],
            'modified': [],
            'deleted': []
        }
        
        for file_info in self.staged_files:
            if file_info['status'] == 'A':
                changes['added'].append(file_info['path'])
            elif file_info['status'] == 'M':
                changes['modified'].append(file_info['path'])
            elif file_info['status'] == 'D':
                changes['deleted'].append(file_info['path'])
        
        # 生成任務列表
        tasks = []
        for file in changes['added'][:3]:
            tasks.append(f"創建 {Path(file).name}")
        for file in changes['modified'][:3]:
            tasks.append(f"更新 {Path(file).name}")
        for file in changes['deleted'][:2]:
            tasks.append(f"移除 {Path(file).name}")
        
        if not tasks:
            tasks.append("程式碼優化和改進")
        
        # 收集文件參考（如果有票券）
        document_references = None
        if self.active_ticket and self.doc_tracker:
            # 找到票券目錄
            ticket_path = self.active_ticket.get('_file_path')
            if ticket_path:
                ticket_dir = Path(ticket_path).parent
                ref_file = ticket_dir / "document-references.yml"
                if ref_file.exists():
                    with open(ref_file, 'r', encoding='utf-8') as f:
                        ref_data = yaml.safe_load(f)
                        if ref_data and 'references' in ref_data:
                            # 轉換格式以符合 dev log 結構
                            document_references = {
                                'consulted_documents': [
                                    {
                                        'path': ref['document'],
                                        'reason': ref['reason']
                                    }
                                    for ref in ref_data['references']
                                ]
                            }
        
        # 準備日誌內容
        log_content = {
            'type': commit_type,
            'title': f'[待補充 commit 訊息]',
            'date': date_str,
            'developer': 'AI + Human',
            'status': 'in_progress',  # 標記為進行中
            'commit_hash': 'pending',  # 待補充
            'description': '[待補充 commit 描述]',
            'ticket_id': self.active_ticket['id'] if self.active_ticket else None,
            'ticket_name': self.active_ticket['name'] if self.active_ticket else None,
            'ticket_path': self.active_ticket.get('_file_path') if self.active_ticket else None,
            'timeline': [{
                'phase': '實現',
                'duration': self.time_metrics['total_time_minutes'],
                'ai_time': self.time_metrics.get('ai_time_minutes', self.time_metrics['total_time_minutes'] * 0.8),
                'human_time': self.time_metrics.get('human_time_minutes', self.time_metrics['total_time_minutes'] * 0.2),
                'tasks': tasks
            }],
            'metrics': {
                'total_time_minutes': self.time_metrics['total_time_minutes'],
                'ai_time_minutes': self.time_metrics.get('ai_time_minutes', self.time_metrics['total_time_minutes'] * 0.8),
                'human_time_minutes': self.time_metrics.get('human_time_minutes', self.time_metrics['total_time_minutes'] * 0.2),
                'ai_percentage': 80.0,
                'human_percentage': 20.0,
                'files_added': len(changes['added']),
                'files_modified': len(changes['modified']),
                'files_deleted': len(changes['deleted']),
                'time_calculation_method': self.time_metrics['method'],
                'time_calculation_details': {
                    'start_time': self.time_metrics.get('start_time'),
                    'end_time': self.time_metrics.get('end_time'),
                    'file_count': self.time_metrics.get('file_count', 0)
                }
            },
            'changes': changes,
            'pre_commit_generated': True,
            'generation_time': datetime.now().isoformat()
        }
        
        # 加入文件參考（如果有）
        if document_references:
            log_content['document_references'] = document_references
        
        # 寫入檔案
        with open(filepath, 'w', encoding='utf-8') as f:
            yaml.dump(log_content, f, allow_unicode=True, sort_keys=False)
        
        print(f"✅ 已生成 pre-commit 開發日誌: {filepath}")
        return str(filepath)
    
    def _generate_task_description(self) -> str:
        """生成任務描述，避免使用 dev-log 和自動生成的檔案名稱"""
        # 基於檔案名稱生成描述
        if not self.staged_files:
            return "changes"
        
        # 排除不應該用作描述的檔案
        exclude_patterns = [
            'dev-logs/',      # dev log 檔案
            'CHANGELOG',      # changelog 檔案
            '.yml',           # YAML 設定檔
            '.yaml',          # YAML 設定檔
            'test-',          # 測試檔案
            '.test.',         # 測試檔案
            '.spec.',         # 測試檔案
            'auto-generated', # 自動生成的檔案
        ]
        
        # 找第一個有意義的檔案
        for file_info in self.staged_files:
            file_path = file_info['path']
            
            # 檢查是否應該排除
            should_exclude = any(pattern in file_path for pattern in exclude_patterns)
            if should_exclude:
                continue
                
            name = Path(file_path).stem
            # 過濾一些通用檔案名
            if name not in ['index', 'main', 'app', 'config', 'setup', 'init']:
                # 轉換為 kebab-case
                desc = re.sub(r'[^a-zA-Z0-9]+', '-', name).lower()
                desc = re.sub(r'-+', '-', desc).strip('-')
                if len(desc) > 3:
                    return desc[:40]  # 限制長度
        
        # 如果沒有找到合適的檔案，使用提交類型或預設描述
        commit_type = self._analyze_commit_type()
        if commit_type != 'update':
            return f"{commit_type}-implementation"
        
        # 最終預設描述
        return f"update-{len(self.staged_files)}-files"
    
    def run(self):
        """執行 pre-commit 文檔生成"""
        print("📝 Pre-commit 文檔生成系統")
        print(f"📊 發現 {len(self.staged_files)} 個 staged 檔案")
        
        if not self.staged_files:
            print("⚠️  沒有 staged 檔案，跳過文檔生成")
            return
        
        print(f"⏱️  計算開發時間: {self.time_metrics['total_time_minutes']} 分鐘")
        print(f"   方法: {self.time_metrics['method']}")
        
        # 生成日誌
        log_path = self.generate_pre_commit_log()
        
        # 將生成的日誌加入 staged
        code, _, _ = self._run_command(["git", "add", log_path])
        if code == 0:
            print(f"✅ 開發日誌已加入 staged，將包含在此次 commit 中")
        else:
            print(f"⚠️  無法將日誌加入 staged")

if __name__ == "__main__":
    generator = PreCommitDocGenerator()
    generator.run()