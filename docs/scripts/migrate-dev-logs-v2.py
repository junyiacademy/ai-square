#!/usr/bin/env python3
"""
Enhanced migration script for dev logs
- Better time calculation using git log
- Clearer filename generation
- Option to process specific files or all
"""

import os
import subprocess
import yaml
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional

class DevLogMigrationV2:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.dev_logs_dir = self.project_root / "docs" / "dev-logs"
        self.migrated_count = 0
        self.error_count = 0
        self.skipped_count = 0
        
    def run_command(self, cmd: List[str]) -> Tuple[int, str, str]:
        """執行命令並返回結果"""
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=self.project_root
        )
        return result.returncode, result.stdout, result.stderr
    
    def get_commit_time_by_log(self, commit_hash: str) -> Dict:
        """使用 git log 獲取更準確的時間"""
        # 獲取最近 100 個 commits 的時間資訊
        code, log_output, _ = self.run_command([
            "git", "log", 
            "--pretty=%H %ct %s",  # hash, timestamp, subject
            "-100"
        ])
        
        if code != 0:
            return self._fallback_time_estimate(commit_hash)
        
        # 解析 log
        commits = []
        for line in log_output.strip().split('\n'):
            parts = line.split(' ', 2)
            if len(parts) >= 3:
                hash_full = parts[0]
                timestamp = int(parts[1])
                subject = parts[2]
                commits.append({
                    'hash': hash_full[:8],
                    'time': datetime.fromtimestamp(timestamp),
                    'subject': subject
                })
        
        # 找到目標 commit
        target_idx = -1
        for i, commit in enumerate(commits):
            if commit['hash'] == commit_hash[:8]:
                target_idx = i
                break
        
        if target_idx == -1:
            return self._fallback_time_estimate(commit_hash)
        
        # 計算與前一個 commit 的時間差
        if target_idx < len(commits) - 1:
            current_time = commits[target_idx]['time']
            prev_time = commits[target_idx + 1]['time']
            
            duration = (current_time - prev_time).total_seconds() / 60
            
            # 合理性檢查
            if duration < 1:
                # 太短，可能是連續 commit，查看更前面的
                for j in range(target_idx + 2, min(target_idx + 5, len(commits))):
                    alt_duration = (current_time - commits[j]['time']).total_seconds() / 60
                    if 5 <= alt_duration <= 120:
                        duration = alt_duration
                        break
                else:
                    duration = 10  # 預設 10 分鐘
            elif duration > 480:  # 8 小時
                duration = 60  # 預設 1 小時
            
            return {
                'total': round(duration, 1),
                'ai': round(duration * 0.8, 1),
                'human': round(duration * 0.2, 1),
                'method': 'git_log_analysis',
                'confidence': 'high'
            }
        
        return self._fallback_time_estimate(commit_hash)
    
    def _fallback_time_estimate(self, commit_hash: str) -> Dict:
        """基於檔案數量的後備估算"""
        # 獲取變更檔案數
        code, output, _ = self.run_command([
            "git", "show", "--stat", "--format=", commit_hash
        ])
        
        if code == 0:
            lines = output.strip().split('\n')
            # 最後一行通常是統計資訊
            if lines and 'changed' in lines[-1]:
                # 提取檔案數量
                match = re.search(r'(\d+) file', lines[-1])
                if match:
                    file_count = int(match.group(1))
                    
                    if file_count <= 1:
                        duration = 5
                    elif file_count <= 3:
                        duration = 15
                    elif file_count <= 5:
                        duration = 30
                    elif file_count <= 10:
                        duration = 60
                    else:
                        duration = 90
                    
                    return {
                        'total': duration,
                        'ai': round(duration * 0.8, 1),
                        'human': round(duration * 0.2, 1),
                        'method': 'file_count_estimate',
                        'confidence': 'medium'
                    }
        
        return {
            'total': 30,
            'ai': 24,
            'human': 6,
            'method': 'default_fallback',
            'confidence': 'low'
        }
    
    def generate_clear_filename(self, log_data: Dict, commit_hash: str) -> str:
        """生成更清晰的檔名"""
        date_str = log_data.get('date', datetime.now().strftime('%Y-%m-%d'))
        commit_type = log_data.get('type', 'other')
        
        # 獲取 commit 訊息
        code, message, _ = self.run_command(["git", "log", "-1", "--pretty=%s", commit_hash])
        if code != 0:
            message = log_data.get('title', 'unknown')
        else:
            message = message.strip()
        
        # 提取關鍵詞
        clean_message = re.sub(r'^[^:()]+[(:][^:)]*[):]?\s*', '', message)
        
        # 特殊關鍵詞處理
        replacements = {
            'commit-guide.py': 'commit-guide',
            'post-commit-doc-gen.py': 'post-commit-docgen',
            'pre-commit-doc-gen.py': 'pre-commit-docgen',
            '.yml': '-yml',
            '.py': '-py',
            '.txt': '-txt',
            'fix()': 'fix',
            'feat()': 'feat',
            'docs()': 'docs',
        }
        
        for old, new in replacements.items():
            clean_message = clean_message.replace(old, new)
        
        # 轉換為檔名格式
        name_part = re.sub(r'[^\w\s-]', ' ', clean_message)
        name_part = re.sub(r'\s+', '-', name_part.strip())
        name_part = name_part.lower()
        
        # 移除重複的連字符
        name_part = re.sub(r'-+', '-', name_part)
        name_part = name_part.strip('-')
        
        # 長度控制
        if len(name_part) > 50:
            words = name_part.split('-')
            # 保留重要詞彙
            important_words = []
            for word in words:
                if len(word) > 2 and word not in ['and', 'the', 'for', 'with', 'from', 'into']:
                    important_words.append(word)
                if len('-'.join(important_words)) > 40:
                    break
            name_part = '-'.join(important_words[:6])
        
        # 確保有內容
        if not name_part or len(name_part) < 3:
            name_part = f"{commit_type}-update"
        
        return f"{date_str}-{commit_type}-{name_part}.yml"
    
    def migrate_single_file(self, log_file: Path) -> bool:
        """遷移單個檔案"""
        print(f"\n📄 處理: {log_file.name}")
        
        try:
            # 讀取現有日誌
            with open(log_file, 'r', encoding='utf-8') as f:
                log_data = yaml.safe_load(f)
            
            commit_hash = log_data.get('commit_hash')
            if not commit_hash or commit_hash == 'pending':
                print(f"  ⏭️  跳過: 沒有 commit hash")
                self.skipped_count += 1
                return False
            
            # 重新計算時間
            time_info = self.get_commit_time_by_log(commit_hash)
            old_time = log_data.get('metrics', {}).get('total_time_minutes', 0)
            
            print(f"  ⏱️  時間: {old_time} → {time_info['total']} 分鐘 ({time_info['method']})")
            
            # 更新時間資訊
            if 'timeline' in log_data and log_data['timeline']:
                log_data['timeline'][0]['duration'] = time_info['total']
                log_data['timeline'][0]['ai_time'] = time_info['ai']
                log_data['timeline'][0]['human_time'] = time_info['human']
            
            if 'metrics' not in log_data:
                log_data['metrics'] = {}
                
            log_data['metrics']['total_time_minutes'] = time_info['total']
            log_data['metrics']['ai_time_minutes'] = time_info['ai']
            log_data['metrics']['human_time_minutes'] = time_info['human']
            log_data['metrics']['time_estimation_method'] = time_info['method']
            log_data['metrics']['time_confidence'] = time_info['confidence']
            log_data['metrics']['migrated_at'] = datetime.now().isoformat()
            
            # 更新百分比
            if time_info['total'] > 0:
                log_data['metrics']['ai_percentage'] = round(time_info['ai'] / time_info['total'] * 100, 1)
                log_data['metrics']['human_percentage'] = round(time_info['human'] / time_info['total'] * 100, 1)
            
            # 生成新檔名
            new_filename = self.generate_clear_filename(log_data, commit_hash)
            new_filepath = log_file.parent / new_filename
            
            # 檢查是否需要改名
            renamed = False
            if new_filepath != log_file:
                if new_filepath.exists():
                    # 避免覆蓋，加上序號
                    base = new_filename.rsplit('.', 1)[0]
                    counter = 2
                    while new_filepath.exists():
                        new_filename = f"{base}-{counter}.yml"
                        new_filepath = log_file.parent / new_filename
                        counter += 1
                
                print(f"  📝 改名: → {new_filename}")
                renamed = True
            
            # 寫入更新內容
            with open(new_filepath, 'w', encoding='utf-8') as f:
                yaml.dump(log_data, f, allow_unicode=True, sort_keys=False)
            
            # 刪除舊檔案
            if renamed and new_filepath != log_file:
                log_file.unlink()
            
            self.migrated_count += 1
            return True
            
        except Exception as e:
            print(f"  ❌ 錯誤: {e}")
            self.error_count += 1
            return False
    
    def run(self, specific_files: Optional[List[str]] = None):
        """執行遷移"""
        print("🚀 開發日誌遷移 v2")
        print(f"📁 目錄: {self.dev_logs_dir}")
        print("=" * 50)
        
        # 決定要處理的檔案
        if specific_files:
            log_files = [self.dev_logs_dir / f for f in specific_files if (self.dev_logs_dir / f).exists()]
        else:
            log_files = list(self.dev_logs_dir.glob("*.yml"))
            # 排除 template 檔案
            log_files = [f for f in log_files if 'template' not in f.name]
        
        total = len(log_files)
        print(f"📊 將處理 {total} 個檔案\n")
        
        # 處理每個檔案
        for i, log_file in enumerate(log_files, 1):
            print(f"進度: [{i}/{total}]", end='')
            self.migrate_single_file(log_file)
        
        # 總結
        print("\n" + "=" * 50)
        print("✅ 遷移完成!")
        print(f"   成功: {self.migrated_count}")
        print(f"   跳過: {self.skipped_count}")
        print(f"   錯誤: {self.error_count}")

if __name__ == "__main__":
    migration = DevLogMigrationV2()
    
    # 如果有參數，只處理指定檔案
    if len(sys.argv) > 1:
        migration.run(sys.argv[1:])
    else:
        migration.run()