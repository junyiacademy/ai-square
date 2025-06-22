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

class PreCommitDocGenerator:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.staged_files = self._get_staged_files()
        self.time_metrics = self._calculate_time_from_files()
        
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
    
    def _calculate_time_from_files(self) -> Dict:
        """基於檔案修改時間計算開發時間"""
        if not self.staged_files:
            return {
                'total_time_minutes': 0,
                'method': 'no_files'
            }
        
        # 收集所有檔案的修改時間
        timestamps = []
        for file_info in self.staged_files:
            file_path = self.project_root / file_info['path']
            if file_path.exists() and file_info['status'] != 'D':
                mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
                timestamps.append({
                    'file': file_info['path'],
                    'time': mtime
                })
        
        if not timestamps:
            return {
                'total_time_minutes': 5,  # 刪除檔案的預設時間
                'method': 'deletion_estimate'
            }
        
        # 計算時間範圍
        timestamps.sort(key=lambda x: x['time'])
        start_time = timestamps[0]['time']
        end_time = timestamps[-1]['time']
        
        # 加上當前時間作為結束時間（正在準備 commit）
        now = datetime.now()
        if (now - end_time).total_seconds() < 300:  # 5分鐘內
            end_time = now
        
        duration_minutes = (end_time - start_time).total_seconds() / 60
        
        # 如果太短，使用最小值
        if duration_minutes < 1:
            # 檢查上個 commit 時間
            code, stdout, _ = self._run_command(["git", "log", "-1", "--pretty=%ct"])
            if code == 0 and stdout.strip():
                last_commit_time = datetime.fromtimestamp(int(stdout.strip()))
                interval = (now - last_commit_time).total_seconds() / 60
                if 0 < interval < 180:  # 3小時內
                    duration_minutes = interval
        
        # 合理性檢查
        if duration_minutes < 0.5:
            duration_minutes = len(self.staged_files) * 2
        elif duration_minutes > 480:  # 8小時
            duration_minutes = 60  # 預設1小時
        
        return {
            'total_time_minutes': round(duration_minutes, 1),
            'ai_time_minutes': round(duration_minutes * 0.8, 1),
            'human_time_minutes': round(duration_minutes * 0.2, 1),
            'method': 'file_timestamp_analysis',
            'start_time': start_time.isoformat(),
            'end_time': end_time.isoformat(),
            'file_count': len(timestamps)
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
        
        # 生成檔名
        task_desc = self._generate_task_description()
        filename = f"{date_str}-{commit_type}-{task_desc}.yml"
        filepath = self.project_root / "docs" / "dev-logs" / filename
        
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
        
        # 準備日誌內容
        log_content = {
            'type': commit_type,
            'title': f'[待補充 commit 訊息]',
            'date': date_str,
            'developer': 'AI + Human',
            'status': 'in_progress',  # 標記為進行中
            'commit_hash': 'pending',  # 待補充
            'description': '[待補充 commit 描述]',
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
        
        # 寫入檔案
        with open(filepath, 'w', encoding='utf-8') as f:
            yaml.dump(log_content, f, allow_unicode=True, sort_keys=False)
        
        print(f"✅ 已生成 pre-commit 開發日誌: {filepath}")
        return str(filepath)
    
    def _generate_task_description(self) -> str:
        """生成任務描述"""
        # 基於檔案名稱生成描述
        if not self.staged_files:
            return "changes"
        
        # 取第一個重要檔案的名稱
        for file_info in self.staged_files:
            name = Path(file_info['path']).stem
            # 過濾一些通用檔案
            if name not in ['index', 'main', 'app', 'config']:
                # 轉換為 kebab-case
                desc = re.sub(r'[^a-zA-Z0-9]+', '-', name).lower()
                desc = re.sub(r'-+', '-', desc).strip('-')
                if len(desc) > 3:
                    return desc[:40]  # 限制長度
        
        # 預設描述
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