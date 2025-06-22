#!/usr/bin/env python3
"""
Reorganize dev logs:
1. Add commit timestamp to filename
2. Improve titles and filenames
3. Group similar logs by date into folders
"""

import os
import subprocess
import yaml
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from collections import defaultdict

class DevLogReorganizer:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.dev_logs_dir = self.project_root / "docs" / "dev-logs"
        self.processed_count = 0
        self.error_count = 0
        
    def run_command(self, cmd: List[str]) -> Tuple[int, str, str]:
        """執行命令並返回結果"""
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=self.project_root
        )
        return result.returncode, result.stdout, result.stderr
    
    def get_commit_details(self, commit_hash: str) -> Optional[Dict]:
        """獲取 commit 的詳細資訊包括時間"""
        # 獲取 commit 時間和訊息
        code, output, _ = self.run_command([
            "git", "show", 
            "--no-patch",
            "--format=%ct|%s|%b",
            commit_hash
        ])
        
        if code != 0:
            return None
            
        parts = output.strip().split('|', 2)
        if len(parts) < 2:
            return None
            
        timestamp = int(parts[0])
        subject = parts[1]
        body = parts[2] if len(parts) > 2 else ""
        
        commit_time = datetime.fromtimestamp(timestamp)
        
        return {
            'time': commit_time,
            'subject': subject,
            'body': body,
            'full_message': f"{subject}\n{body}".strip()
        }
    
    def improve_title(self, log_data: Dict, commit_info: Dict) -> str:
        """生成更好的標題"""
        # 從 commit 訊息提取核心內容
        subject = commit_info['subject']
        
        # 移除 conventional commit 前綴
        clean_subject = re.sub(r'^(feat|fix|docs|refactor|test|chore|improve)\([^)]*\):\s*', '', subject)
        
        # 特殊情況處理
        if 'migration' in clean_subject.lower() or 'migrate' in clean_subject.lower():
            if 'dev logs' in clean_subject.lower():
                return "Migrate dev logs with accurate time calculation"
            else:
                return clean_subject
        
        # 如果訊息已經很清楚，直接使用
        if len(clean_subject) > 10 and len(clean_subject) < 80:
            return clean_subject
        
        # 否則基於檔案變更生成
        changes = log_data.get('changes', {})
        total_files = (len(changes.get('added', [])) + 
                      len(changes.get('modified', [])) + 
                      len(changes.get('deleted', [])))
        
        if total_files == 1:
            # 單檔案，使用檔名
            if changes.get('added'):
                filename = Path(changes['added'][0]).stem
                return f"Add {filename}"
            elif changes.get('modified'):
                filename = Path(changes['modified'][0]).stem
                return f"Update {filename}"
            elif changes.get('deleted'):
                filename = Path(changes['deleted'][0]).stem
                return f"Remove {filename}"
        
        return clean_subject
    
    def generate_improved_filename(self, log_data: Dict, commit_info: Dict) -> str:
        """生成包含時間戳的改進檔名"""
        commit_time = commit_info['time']
        date_str = commit_time.strftime('%Y-%m-%d')
        time_str = commit_time.strftime('%H-%M-%S')
        
        commit_type = log_data.get('type', 'other')
        
        # 從標題生成簡潔的名稱部分
        title = self.improve_title(log_data, commit_info)
        
        # 轉換為檔名格式
        name_part = re.sub(r'[^\w\s-]', ' ', title)
        name_part = re.sub(r'\s+', '-', name_part.strip())
        name_part = name_part.lower()
        
        # 移除冗餘詞
        redundant_words = ['the', 'and', 'for', 'with', 'from', 'into', 'update', 'add', 'remove']
        words = name_part.split('-')
        filtered_words = [w for w in words if w and w not in redundant_words]
        
        # 限制長度
        if len('-'.join(filtered_words)) > 40:
            name_part = '-'.join(filtered_words[:5])
        else:
            name_part = '-'.join(filtered_words)
        
        name_part = re.sub(r'-+', '-', name_part).strip('-')
        
        # 確保有內容
        if not name_part:
            name_part = commit_type
        
        return f"{date_str}-{time_str}-{commit_type}-{name_part}.yml"
    
    def categorize_logs(self, logs_by_date: Dict[str, List[Dict]]) -> Dict[str, Dict[str, List[Dict]]]:
        """將同一天的日誌按類型分組"""
        categorized = {}
        
        for date_str, logs in logs_by_date.items():
            categories = defaultdict(list)
            
            for log_info in logs:
                log_data = log_info['data']
                commit_type = log_data.get('type', 'other')
                
                # 特殊分類
                if 'time' in str(log_info['path']).lower() or 'tracking' in str(log_info['path']).lower():
                    category = 'time-tracking'
                elif 'migration' in str(log_info['path']).lower() or 'migrate' in str(log_info['path']).lower():
                    category = 'migrations'
                elif 'auto-generated' in log_data.get('description', '').lower():
                    category = 'auto-documentation'
                elif commit_type == 'docs':
                    category = 'documentation'
                elif commit_type == 'bug' or commit_type == 'fix':
                    category = 'bugfixes'
                elif commit_type == 'feat' or commit_type == 'feature':
                    category = 'features'
                elif commit_type == 'refactor':
                    category = 'refactoring'
                else:
                    category = 'misc'
                
                categories[category].append(log_info)
            
            categorized[date_str] = dict(categories)
        
        return categorized
    
    def process_log_file(self, log_file: Path) -> Optional[Dict]:
        """處理單個日誌檔案"""
        try:
            # 讀取日誌
            with open(log_file, 'r', encoding='utf-8') as f:
                log_data = yaml.safe_load(f)
            
            commit_hash = log_data.get('commit_hash')
            if not commit_hash or commit_hash == 'pending':
                print(f"⏭️  跳過 {log_file.name}: 沒有 commit hash")
                return None
            
            # 獲取 commit 詳細資訊
            commit_info = self.get_commit_details(commit_hash)
            if not commit_info:
                print(f"⚠️  無法獲取 commit 資訊: {log_file.name}")
                return None
            
            # 改進標題
            improved_title = self.improve_title(log_data, commit_info)
            log_data['title'] = improved_title
            
            # 生成新檔名
            new_filename = self.generate_improved_filename(log_data, commit_info)
            
            return {
                'path': log_file,
                'data': log_data,
                'new_filename': new_filename,
                'commit_info': commit_info,
                'date': commit_info['time'].strftime('%Y-%m-%d')
            }
            
        except Exception as e:
            print(f"❌ 處理錯誤 {log_file.name}: {e}")
            self.error_count += 1
            return None
    
    def run(self):
        """執行重組"""
        print("🚀 開始重組開發日誌...")
        print(f"📁 目錄: {self.dev_logs_dir}")
        print("=" * 50)
        
        # 獲取所有 yml 檔案
        log_files = list(self.dev_logs_dir.glob("*.yml"))
        # 排除 template 和 README
        log_files = [f for f in log_files if 'template' not in f.name.lower() and f.name != 'README.md']
        
        total = len(log_files)
        print(f"📊 找到 {total} 個日誌檔案\n")
        
        # 處理每個檔案
        logs_by_date = defaultdict(list)
        
        for i, log_file in enumerate(log_files, 1):
            print(f"處理進度: [{i}/{total}] {log_file.name}")
            result = self.process_log_file(log_file)
            if result:
                logs_by_date[result['date']].append(result)
        
        print("\n" + "=" * 50)
        print("📂 開始組織檔案...")
        
        # 按日期和類別組織
        categorized = self.categorize_logs(logs_by_date)
        
        # 創建目錄結構並移動檔案
        for date_str, categories in categorized.items():
            date_dir = self.dev_logs_dir / date_str
            
            # 如果只有一個類別且檔案少於3個，不創建子目錄
            total_files = sum(len(logs) for logs in categories.values())
            if len(categories) == 1 and total_files <= 3:
                # 直接放在 dev-logs 目錄
                for category, logs in categories.items():
                    for log_info in logs:
                        self._move_log_file(log_info, self.dev_logs_dir)
            else:
                # 創建日期目錄
                date_dir.mkdir(exist_ok=True)
                print(f"\n📅 {date_str} ({total_files} 個檔案)")
                
                for category, logs in categories.items():
                    if len(logs) >= 2:  # 只有2個或以上才創建子目錄
                        category_dir = date_dir / category
                        category_dir.mkdir(exist_ok=True)
                        print(f"  📁 {category} ({len(logs)} 個檔案)")
                        
                        for log_info in logs:
                            self._move_log_file(log_info, category_dir)
                    else:
                        # 單個檔案直接放在日期目錄
                        for log_info in logs:
                            self._move_log_file(log_info, date_dir)
        
        # 總結
        print("\n" + "=" * 50)
        print("✅ 重組完成!")
        print(f"   處理: {self.processed_count} 個檔案")
        print(f"   錯誤: {self.error_count} 個")
    
    def _move_log_file(self, log_info: Dict, target_dir: Path):
        """移動並更新日誌檔案"""
        try:
            old_path = log_info['path']
            new_path = target_dir / log_info['new_filename']
            
            # 檢查是否需要避免覆蓋
            if new_path.exists() and new_path != old_path:
                base = log_info['new_filename'].rsplit('.', 1)[0]
                counter = 2
                while new_path.exists():
                    new_filename = f"{base}-{counter}.yml"
                    new_path = target_dir / new_filename
                    counter += 1
            
            # 更新檔案內容
            with open(new_path, 'w', encoding='utf-8') as f:
                yaml.dump(log_info['data'], f, allow_unicode=True, sort_keys=False)
            
            # 如果是不同路徑，刪除舊檔案
            if new_path != old_path:
                old_path.unlink()
                print(f"    ✅ {old_path.name} → {new_path.relative_to(self.dev_logs_dir)}")
            
            self.processed_count += 1
            
        except Exception as e:
            print(f"    ❌ 移動失敗: {e}")
            self.error_count += 1

if __name__ == "__main__":
    reorganizer = DevLogReorganizer()
    reorganizer.run()