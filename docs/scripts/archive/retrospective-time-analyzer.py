#!/usr/bin/env python3
"""
事後時間分析工具 - 基於實際時間戳證據分析開發時間
避免編造，只使用可驗證的數據
"""

import os
import sys
import subprocess
import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import argparse

class RetrospectiveTimeAnalyzer:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        
    def run_command(self, command: List[str]) -> Tuple[int, str, str]:
        """執行命令並返回結果"""
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            return result.returncode, result.stdout, result.stderr
        except Exception as e:
            return 1, "", str(e)
    
    def get_related_commits(self, keywords: List[str], hours: int = 2) -> List[Dict]:
        """獲取相關的 git commits"""
        print(f"🔍 搜尋相關 commits（關鍵詞: {keywords}，時間窗口: {hours}小時）")
        
        # 獲取最近的 commits
        since_time = (datetime.now() - timedelta(hours=hours)).strftime('%Y-%m-%d %H:%M')
        code, stdout, stderr = self.run_command([
            "git", "log", f"--since={since_time}",
            "--pretty=format:%h|%ct|%s", "--no-merges"
        ])
        
        if code != 0:
            print(f"❌ Git log 失敗: {stderr}")
            return []
        
        commits = []
        for line in stdout.strip().split('\n'):
            if not line:
                continue
                
            try:
                hash_short, timestamp, message = line.split('|', 2)
                commit_time = datetime.fromtimestamp(int(timestamp))
                
                # 檢查是否與關鍵詞相關
                message_lower = message.lower()
                if any(keyword.lower() in message_lower for keyword in keywords):
                    commits.append({
                        'hash': hash_short,
                        'timestamp': commit_time,
                        'message': message,
                        'time_str': commit_time.strftime('%H:%M:%S')
                    })
            except ValueError:
                continue
        
        commits.sort(key=lambda x: x['timestamp'])
        print(f"📋 發現 {len(commits)} 個相關 commits")
        for commit in commits:
            print(f"   {commit['hash']} {commit['time_str']} {commit['message']}")
        
        return commits
    
    def get_related_file_changes(self, keywords: List[str], hours: int = 2) -> List[Dict]:
        """獲取相關的檔案變更"""
        print(f"📁 搜尋相關檔案變更")
        
        file_changes = []
        
        # 搜尋包含關鍵詞的檔案
        for keyword in keywords:
            # 在 docs 目錄中搜尋相關檔案
            for pattern in [f"*{keyword}*", f"*{keyword.upper()}*", f"*{keyword.lower()}*"]:
                code, stdout, stderr = self.run_command([
                    "find", "docs", "-name", pattern, "-type", "f"
                ])
                
                if code == 0:
                    for file_path in stdout.strip().split('\n'):
                        if file_path and Path(file_path).exists():
                            # 獲取檔案修改時間
                            stat_result = os.stat(file_path)
                            mod_time = datetime.fromtimestamp(stat_result.st_mtime)
                            
                            # 檢查是否在時間窗口內
                            cutoff = datetime.now() - timedelta(hours=hours)
                            if mod_time > cutoff:
                                file_changes.append({
                                    'path': file_path,
                                    'modified_time': mod_time,
                                    'time_str': mod_time.strftime('%H:%M:%S'),
                                    'keyword': keyword
                                })
        
        # 去重和排序
        unique_files = {}
        for change in file_changes:
            path = change['path']
            if path not in unique_files or change['modified_time'] > unique_files[path]['modified_time']:
                unique_files[path] = change
        
        file_changes = list(unique_files.values())
        file_changes.sort(key=lambda x: x['modified_time'])
        
        print(f"📄 發現 {len(file_changes)} 個相關檔案")
        for change in file_changes:
            print(f"   {change['time_str']} {change['path']}")
        
        return file_changes
    
    def get_session_logs(self, hours: int = 2) -> List[Dict]:
        """檢查時間追蹤日誌"""
        print("⏰ 檢查時間追蹤日誌")
        
        today = datetime.now().strftime('%Y-%m-%d')
        sessions_dir = self.project_root / "docs" / "time-logs" / "sessions" / today
        
        session_logs = []
        if sessions_dir.exists():
            for session_file in sessions_dir.glob("session_*.json"):
                try:
                    with open(session_file, 'r', encoding='utf-8') as f:
                        session_data = json.load(f)
                    
                    metrics = session_data.get('session_metrics', {})
                    start_time = metrics.get('start_timestamp')
                    if start_time:
                        session_start = datetime.fromisoformat(start_time.replace('Z', '+00:00').replace('+00:00', ''))
                        cutoff = datetime.now() - timedelta(hours=hours)
                        
                        if session_start > cutoff:
                            session_logs.append({
                                'file': str(session_file),
                                'start_time': session_start,
                                'metrics': metrics
                            })
                except Exception as e:
                    print(f"⚠️  無法讀取 {session_file}: {e}")
        
        print(f"📊 發現 {len(session_logs)} 個時間追蹤日誌")
        return session_logs
    
    def calculate_time_range(self, commits: List[Dict], file_changes: List[Dict]) -> Dict:
        """計算時間範圍"""
        print("📐 計算時間範圍")
        
        all_timestamps = []
        
        # 添加 commit 時間戳
        for commit in commits:
            all_timestamps.append({
                'time': commit['timestamp'],
                'source': f"commit {commit['hash']}",
                'type': 'commit'
            })
        
        # 添加檔案變更時間戳
        for change in file_changes:
            all_timestamps.append({
                'time': change['modified_time'], 
                'source': f"file {Path(change['path']).name}",
                'type': 'file'
            })
        
        if not all_timestamps:
            return {
                'duration_minutes': None,
                'start_time': None,
                'end_time': None,
                'reliable': False,
                'evidence_count': 0
            }
        
        # 排序時間戳
        all_timestamps.sort(key=lambda x: x['time'])
        
        start_time = all_timestamps[0]['time']
        end_time = all_timestamps[-1]['time']
        duration = end_time - start_time
        duration_minutes = duration.total_seconds() / 60
        
        print(f"⏱️  時間範圍:")
        print(f"   開始: {start_time.strftime('%H:%M:%S')} ({all_timestamps[0]['source']})")
        print(f"   結束: {end_time.strftime('%H:%M:%S')} ({all_timestamps[-1]['source']})")
        print(f"   總時間: {duration_minutes:.1f} 分鐘")
        print(f"   證據數量: {len(all_timestamps)} 個時間戳")
        
        return {
            'duration_minutes': round(duration_minutes, 1),
            'start_time': start_time,
            'end_time': end_time,
            'reliable': len(all_timestamps) >= 2,
            'evidence_count': len(all_timestamps),
            'evidence': all_timestamps
        }
    
    def validate_consistency(self, commits: List[Dict], file_changes: List[Dict], 
                           session_logs: List[Dict]) -> str:
        """驗證數據一致性"""
        print("🔍 驗證數據一致性")
        
        evidence_count = len(commits) + len(file_changes) + len(session_logs)
        
        if evidence_count >= 3:
            confidence = "high"
        elif evidence_count >= 2:
            confidence = "medium"
        elif evidence_count >= 1:
            confidence = "low"
        else:
            confidence = "none"
        
        print(f"🎯 信心等級: {confidence}")
        print(f"   Commits: {len(commits)}")
        print(f"   檔案變更: {len(file_changes)}")
        print(f"   時間日誌: {len(session_logs)}")
        
        return confidence
    
    def get_verification_commands(self, keywords: List[str]) -> List[str]:
        """生成驗證命令"""
        commands = [
            'git log --pretty=format:"%h %cd %s" --date=format:"%H:%M:%S" -10',
        ]
        
        for keyword in keywords:
            commands.append(f'find docs -name "*{keyword}*" -exec stat -f "%N: %Sm" -t "%H:%M:%S" {{}} \\;')
        
        return commands
    
    def analyze_task_time(self, keywords: List[str], hours: int = 2) -> Dict:
        """分析特定任務的開發時間"""
        print(f"🕒 開始事後時間分析")
        print(f"📋 任務關鍵詞: {keywords}")
        print(f"⏰ 時間窗口: {hours} 小時")
        print("="*50)
        
        # 1. 收集證據
        commits = self.get_related_commits(keywords, hours)
        file_changes = self.get_related_file_changes(keywords, hours)
        session_logs = self.get_session_logs(hours)
        
        # 2. 計算時間範圍
        time_range = self.calculate_time_range(commits, file_changes)
        
        # 3. 驗證一致性
        confidence = self.validate_consistency(commits, file_changes, session_logs)
        
        # 4. 生成報告
        if session_logs and confidence != "none":
            # 優先使用真實時間追蹤
            latest_session = max(session_logs, key=lambda x: x['start_time'])
            metrics = latest_session['metrics']
            
            result = {
                'total_time_minutes': metrics.get('total_time_minutes'),
                'ai_time_minutes': metrics.get('ai_time_minutes'),
                'human_time_minutes': metrics.get('human_time_minutes'),
                'time_estimation_method': 'retrospective_real_time_logs',
                'is_real_time': True,
                'data_quality': 'high',
                'confidence_level': confidence,
                'evidence': {
                    'session_logs': session_logs,
                    'git_commits': commits,
                    'file_changes': file_changes
                }
            }
        elif time_range['reliable']:
            # 使用時間戳分析
            result = {
                'total_time_minutes': time_range['duration_minutes'],
                'time_estimation_method': 'retrospective_timestamp_analysis',
                'is_real_time': False,
                'data_quality': 'high' if confidence in ['high', 'medium'] else 'medium',
                'confidence_level': confidence,
                'evidence': {
                    'git_commits': commits,
                    'file_changes': file_changes,
                    'time_range': time_range
                }
            }
        else:
            # 數據不足
            result = {
                'total_time_minutes': None,
                'time_estimation_method': 'insufficient_evidence',
                'is_real_time': False,
                'data_quality': 'insufficient',
                'confidence_level': 'none',
                'evidence': {
                    'git_commits': commits,
                    'file_changes': file_changes
                },
                'recommendation': 'use_file_count_estimate_with_warning'
            }
        
        # 5. 添加驗證信息
        result['verification_commands'] = self.get_verification_commands(keywords)
        result['analysis_timestamp'] = datetime.now().isoformat()
        
        return result
    
    def print_analysis_report(self, result: Dict, keywords: List[str]):
        """列印分析報告"""
        print("\n" + "="*50)
        print("📊 事後時間分析報告")
        print("="*50)
        
        print(f"🎯 任務: {', '.join(keywords)}")
        print(f"⏰ 開發時間: {result.get('total_time_minutes', '無法確定')} 分鐘")
        print(f"📊 數據品質: {result.get('data_quality', 'unknown')}")
        print(f"🎯 信心等級: {result.get('confidence_level', 'unknown')}")
        print(f"📋 分析方法: {result.get('time_estimation_method', 'unknown')}")
        
        if result.get('verification_commands'):
            print(f"\n🔍 驗證命令:")
            for cmd in result['verification_commands']:
                print(f"   {cmd}")
        
        print("="*50)

def main():
    parser = argparse.ArgumentParser(description='事後時間分析工具')
    parser.add_argument('--task', required=True, help='任務關鍵詞（逗號分隔）')
    parser.add_argument('--hours', type=int, default=2, help='時間窗口（小時）')
    parser.add_argument('--output', help='輸出檔案路徑')
    
    args = parser.parse_args()
    
    keywords = [k.strip() for k in args.task.split(',')]
    
    analyzer = RetrospectiveTimeAnalyzer()
    result = analyzer.analyze_task_time(keywords, args.hours)
    analyzer.print_analysis_report(result, keywords)
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False, default=str)
        print(f"\n💾 結果已保存到: {args.output}")

if __name__ == "__main__":
    main()