#!/usr/bin/env python3
"""
修復 dev logs 問題的腳本
1. 修復檔名格式問題
2. 移除推估的開發時間
3. 從 dev logs 回推重建缺失的 tickets
"""

import os
import sys
import yaml
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional

class DevLogsFixer:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.dev_logs_path = self.project_root / "docs" / "dev-logs"
        self.tickets_path = self.project_root / "docs" / "tickets"
        self.fixes_applied = []
        self.tickets_created = []
        
    def fix_all(self):
        """執行所有修復"""
        print("🔧 開始修復 dev logs...")
        
        # 1. 修復檔名問題
        self.fix_filenames()
        
        # 2. 修復時間數據
        self.fix_time_data()
        
        # 3. 創建缺失的 tickets
        self.create_missing_tickets()
        
        # 4. 顯示修復結果
        self.show_results()
        
    def fix_filenames(self):
        """修復檔名格式問題"""
        print("\n📁 修復檔名格式...")
        
        for root, dirs, files in os.walk(self.dev_logs_path):
            if root == str(self.dev_logs_path):
                continue
                
            for file in files:
                if not file.endswith('.yml'):
                    continue
                    
                filepath = Path(root) / file
                new_name = self._fix_filename(file)
                
                if new_name and new_name != file:
                    new_path = filepath.parent / new_name
                    
                    # 檢查新檔名是否已存在
                    if new_path.exists():
                        print(f"⚠️  檔名衝突，跳過: {file}")
                        continue
                        
                    filepath.rename(new_path)
                    self.fixes_applied.append(('filename', f"{file} → {new_name}"))
                    print(f"✅ 修復檔名: {file} → {new_name}")
                    
    def _fix_filename(self, filename: str) -> Optional[str]:
        """修復單個檔名"""
        # 移除 .yml 後綴進行處理
        name = filename[:-4] if filename.endswith('.yml') else filename
        
        # 處理重複日期的情況
        if name.count('2025-06-') > 1:
            # 找到第一個日期後的位置
            first_date_match = re.search(r'2025-06-\d{2}', name)
            if first_date_match:
                first_date_end = first_date_match.end()
                # 移除後續的重複日期
                cleaned = name[:first_date_end] + re.sub(r'-?2025-06-\d{2}', '', name[first_date_end:])
                # 如果缺少時間戳，添加佔位符
                if not re.search(r'-\d{2}-\d{2}-\d{2}-', cleaned):
                    cleaned = cleaned.replace(first_date_match.group(), f"{first_date_match.group()}-00-00-00")
                return f"{cleaned}.yml"
        
        # 處理缺少時間戳的情況
        if re.match(r'^\d{4}-\d{2}-\d{2}-[a-z]+-', name) and not re.match(r'^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}-', name):
            # 在日期後插入時間戳佔位符
            parts = name.split('-', 4)
            if len(parts) >= 4:
                return f"{parts[0]}-{parts[1]}-{parts[2]}-00-00-00-{'-'.join(parts[3:])}.yml"
        
        return None
        
    def fix_time_data(self):
        """修復時間數據"""
        print("\n⏱️ 修復時間數據...")
        
        for root, dirs, files in os.walk(self.dev_logs_path):
            if root == str(self.dev_logs_path):
                continue
                
            for file in files:
                if not file.endswith('.yml'):
                    continue
                    
                filepath = Path(root) / file
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        data = yaml.safe_load(f)
                        
                    if not isinstance(data, dict):
                        continue
                        
                    # 修復時間數據
                    modified = self._fix_time_fields(data, filepath)
                    
                    if modified:
                        # 保存修改後的文件
                        with open(filepath, 'w', encoding='utf-8') as f:
                            yaml.dump(data, f, allow_unicode=True, sort_keys=False)
                        self.fixes_applied.append(('time_data', f"修復時間數據: {file}"))
                        print(f"✅ 修復時間數據: {file}")
                        
                except Exception as e:
                    print(f"❌ 無法處理文件 {filepath}: {e}")
                    
    def _fix_time_fields(self, data: Dict, filepath: Path) -> bool:
        """修復單個文件的時間欄位"""
        modified = False
        
        if 'metrics' in data:
            metrics = data['metrics']
            
            # 移除 file_count_estimate 方法的時間
            if metrics.get('time_estimation_method') == 'file_count_estimate':
                # 如果有 commit 基礎的時間，使用它
                if 'time_calculation_details' in metrics:
                    details = metrics['time_calculation_details']
                    if 'start_time' in details and 'end_time' in details:
                        try:
                            start = datetime.fromisoformat(details['start_time'])
                            end = datetime.fromisoformat(details['end_time'])
                            duration = (end - start).total_seconds() / 60
                            
                            # 更新時間
                            metrics['total_time_minutes'] = round(duration, 1)
                            metrics['time_calculation_method'] = 'git_commit_based'
                            metrics['time_estimation_method'] = 'git_commit_based'
                            modified = True
                        except:
                            pass
                
                # 如果沒有有效的時間計算，移除推估時間
                if not modified and 'total_time_minutes' in metrics:
                    # 從檔名提取日期時間
                    match = re.match(r'(\d{4}-\d{2}-\d{2})-(\d{2}-\d{2}-\d{2})?', filepath.name)
                    if match:
                        date_str = match.group(1)
                        # 使用預設的短時間（5-15分鐘）
                        metrics['total_time_minutes'] = 10.0
                        metrics['time_calculation_method'] = 'default_estimate'
                        metrics['note'] = '時間為預設估計值'
                        modified = True
            
            # 移除 file_count_estimate 相關欄位
            if metrics.get('time_estimation_method') == 'file_count_estimate':
                del metrics['time_estimation_method']
                modified = True
                
        return modified
        
    def create_missing_tickets(self):
        """創建缺失的 tickets"""
        print("\n🎫 創建缺失的 tickets...")
        
        # 收集所有 dev logs
        dev_logs_by_key = {}
        
        for root, dirs, files in os.walk(self.dev_logs_path):
            if root == str(self.dev_logs_path):
                continue
                
            for file in files:
                if not file.endswith('.yml'):
                    continue
                    
                # 提取票券信息
                match = re.match(r'(\d{4}-\d{2}-\d{2})(?:-(\d{2}-\d{2}-\d{2}))?-(\w+)-(.+)\.yml', file)
                if match:
                    date, time, type_, name = match.groups()
                    ticket_key = f"{type_}-{name}"
                    
                    if ticket_key not in dev_logs_by_key:
                        dev_logs_by_key[ticket_key] = []
                        
                    dev_logs_by_key[ticket_key].append({
                        'file': file,
                        'path': Path(root) / file,
                        'date': date,
                        'time': time or '00-00-00',
                        'type': type_,
                        'name': name
                    })
        
        # 檢查是否有對應的 ticket
        for ticket_key, log_files in dev_logs_by_key.items():
            if not self._ticket_exists(ticket_key):
                # 創建 ticket
                self._create_ticket_from_logs(ticket_key, log_files)
                
    def _ticket_exists(self, ticket_key: str) -> bool:
        """檢查票券是否存在"""
        for status in ['in_progress', 'completed']:
            status_dir = self.tickets_path / status
            if status_dir.exists():
                for ticket_file in status_dir.glob('*.yml'):
                    if ticket_key in ticket_file.name:
                        return True
        return False
        
    def _create_ticket_from_logs(self, ticket_key: str, log_files: List[Dict]):
        """從 dev logs 回推創建 ticket"""
        # 使用最早的 dev log 的時間
        earliest_log = min(log_files, key=lambda x: f"{x['date']}-{x['time']}")
        
        # 讀取 dev log 內容以獲取更多信息
        dev_log_data = {}
        try:
            with open(earliest_log['path'], 'r', encoding='utf-8') as f:
                dev_log_data = yaml.safe_load(f) or {}
        except:
            pass
        
        # 創建票券數據
        ticket_data = {
            'name': earliest_log['name'],
            'type': earliest_log['type'],
            'status': 'completed',  # 假設已完成，因為有 dev log
            'created_at': f"{earliest_log['date']}T{earliest_log['time'].replace('-', ':')}",
            'completed_at': f"{earliest_log['date']}T23:59:59",
            'description': dev_log_data.get('description', f"從 dev log 回推創建的票券"),
            'dev_logs': [str(log['path'].relative_to(self.project_root)) for log in log_files],
            'reconstructed': True,
            'reconstruction_date': datetime.now().isoformat()
        }
        
        # 如果 dev log 中有 commit hash，添加到票券
        if 'commit_hash' in dev_log_data:
            ticket_data['commit_hash'] = dev_log_data['commit_hash']
        
        # 保存票券
        ticket_filename = f"{earliest_log['date']}-{earliest_log['time']}-ticket-{earliest_log['name']}.yml"
        ticket_path = self.tickets_path / 'completed' / ticket_filename
        
        ticket_path.parent.mkdir(parents=True, exist_ok=True)
        with open(ticket_path, 'w', encoding='utf-8') as f:
            yaml.dump(ticket_data, f, allow_unicode=True, sort_keys=False)
            
        self.tickets_created.append(ticket_filename)
        print(f"✅ 創建票券: {ticket_filename}")
        
    def show_results(self):
        """顯示修復結果"""
        print("\n" + "="*60)
        print("📊 修復結果")
        print("="*60)
        
        # 分組顯示修復項目
        filename_fixes = [f for t, f in self.fixes_applied if t == 'filename']
        time_fixes = [f for t, f in self.fixes_applied if t == 'time_data']
        
        if filename_fixes:
            print(f"\n✅ 修復檔名: {len(filename_fixes)} 個")
            for fix in filename_fixes[:5]:
                print(f"   - {fix}")
            if len(filename_fixes) > 5:
                print(f"   ... 還有 {len(filename_fixes) - 5} 個")
                
        if time_fixes:
            print(f"\n✅ 修復時間數據: {len(time_fixes)} 個")
            for fix in time_fixes[:5]:
                print(f"   - {fix}")
            if len(time_fixes) > 5:
                print(f"   ... 還有 {len(time_fixes) - 5} 個")
                
        if self.tickets_created:
            print(f"\n✅ 創建票券: {len(self.tickets_created)} 個")
            for ticket in self.tickets_created[:5]:
                print(f"   - {ticket}")
            if len(self.tickets_created) > 5:
                print(f"   ... 還有 {len(self.tickets_created) - 5} 個")
                
        print(f"\n📈 總計:")
        print(f"   - 修復項目: {len(self.fixes_applied)} 個")
        print(f"   - 創建票券: {len(self.tickets_created)} 個")

def main():
    """主執行函數"""
    fixer = DevLogsFixer()
    
    # 檢查是否有 --auto 參數
    auto_mode = '--auto' in sys.argv
    
    if not auto_mode:
        # 確認執行
        print("⚠️  此腳本將修改 dev logs 文件和創建缺失的票券")
        print("建議先備份 docs/dev-logs 和 docs/tickets 目錄")
        
        response = input("\n是否繼續? (y/N): ")
        if response.lower() != 'y':
            print("已取消")
            return
    else:
        print("🤖 自動模式執行中...")
        
    fixer.fix_all()
    
if __name__ == "__main__":
    main()