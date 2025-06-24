#!/usr/bin/env python3
"""
分析和修復 dev logs 的準確性
1. 檢查檔名格式問題
2. 檢查開發時間的合理性
3. 從 dev logs 回推建立遺失的 tickets
"""

import os
import sys
import yaml
import re
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional

class DevLogsAnalyzer:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.dev_logs_path = self.project_root / "docs" / "dev-logs"
        self.tickets_path = self.project_root / "docs" / "tickets"
        self.issues = []
        self.tickets_to_create = []
        
    def analyze(self):
        """執行完整分析"""
        print("🔍 開始分析 dev logs...\n")
        
        # 1. 分析檔名問題
        self.analyze_filenames()
        
        # 2. 分析時間合理性
        self.analyze_time_data()
        
        # 3. 檢查對應的 tickets
        self.check_tickets()
        
        # 4. 顯示分析結果
        self.show_results()
        
    def analyze_filenames(self):
        """分析檔名格式問題"""
        print("📁 檢查檔名格式...")
        
        # 標準格式: YYYY-MM-DD-HH-MM-SS-type-description.yml
        standard_pattern = r'^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}-[a-z]+-[\w-]+\.yml$'
        
        for root, dirs, files in os.walk(self.dev_logs_path):
            # 跳過根目錄的模板文件
            if root == str(self.dev_logs_path):
                continue
                
            for file in files:
                if not file.endswith('.yml'):
                    continue
                    
                # 檢查格式
                if not re.match(standard_pattern, file):
                    filepath = Path(root) / file
                    relative_path = filepath.relative_to(self.project_root)
                    
                    # 分析具體問題
                    if file.count('-') < 6:
                        issue = f"缺少時間戳: {relative_path}"
                    elif file.count('2025-06-') > 1:
                        issue = f"日期重複: {relative_path}"
                    else:
                        issue = f"格式不正確: {relative_path}"
                        
                    self.issues.append(('filename', issue, filepath))
                    
    def analyze_time_data(self):
        """分析時間數據的合理性"""
        print("⏱️ 檢查時間數據...")
        
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
                        
                    # 檢查時間相關欄位
                    self._check_time_fields(data, filepath)
                    
                except Exception as e:
                    self.issues.append(('parse_error', f"無法解析 {filepath}: {e}", filepath))
                    
    def _check_time_fields(self, data: Dict, filepath: Path):
        """檢查單個文件的時間欄位"""
        if not isinstance(data, dict):
            return
            
        # 檢查 metrics 部分
        if 'metrics' in data:
            metrics = data['metrics']
            
            # 檢查總時間
            total_time = metrics.get('total_time_minutes', 0)
            if total_time > 480:  # 超過 8 小時
                self.issues.append(('unrealistic_time', 
                                  f"開發時間不合理 ({total_time} 分鐘): {filepath.name}", 
                                  filepath))
                                  
            # 檢查時間計算方法
            method = metrics.get('time_estimation_method') or metrics.get('time_calculation_method')
            if method == 'file_count_estimate':
                self.issues.append(('estimated_time', 
                                  f"使用推估時間方法: {filepath.name}", 
                                  filepath))
                                  
            # 檢查時間計算細節
            if 'time_calculation_details' in metrics:
                details = metrics['time_calculation_details']
                if 'start_time' in details and 'end_time' in details:
                    try:
                        start = datetime.fromisoformat(details['start_time'])
                        end = datetime.fromisoformat(details['end_time'])
                        duration = (end - start).total_seconds() / 60
                        
                        # 檢查是否跨多天
                        if duration > 1440:  # 24 小時
                            self.issues.append(('long_duration', 
                                              f"時間跨度超過一天 ({duration:.1f} 分鐘): {filepath.name}", 
                                              filepath))
                    except:
                        pass
                        
    def check_tickets(self):
        """檢查 dev logs 對應的 tickets"""
        print("🎫 檢查對應的 tickets...")
        
        # 收集所有 dev logs
        dev_logs = {}
        for root, dirs, files in os.walk(self.dev_logs_path):
            if root == str(self.dev_logs_path):
                continue
                
            for file in files:
                if not file.endswith('.yml'):
                    continue
                    
                # 從檔名提取信息
                match = re.match(r'(\d{4}-\d{2}-\d{2})(?:-(\d{2}-\d{2}-\d{2}))?-(\w+)-(.+)\.yml', file)
                if match:
                    date, time, type_, name = match.groups()
                    key = f"{date}-{type_}-{name}"
                    filepath = Path(root) / file
                    
                    if key not in dev_logs:
                        dev_logs[key] = []
                    dev_logs[key].append(filepath)
                    
        # 檢查是否有對應的 ticket
        for key, log_files in dev_logs.items():
            # 尋找對應的 ticket
            ticket_found = False
            for status in ['in_progress', 'completed']:
                ticket_dir = self.tickets_path / status
                if ticket_dir.exists():
                    for ticket_file in ticket_dir.glob('*.yml'):
                        if key.split('-', 3)[-1] in ticket_file.name:
                            ticket_found = True
                            break
                            
            if not ticket_found:
                self.tickets_to_create.append((key, log_files))
                
    def show_results(self):
        """顯示分析結果"""
        print("\n" + "="*60)
        print("📊 分析結果")
        print("="*60)
        
        # 按類型分組顯示問題
        issue_types = {}
        for issue_type, message, filepath in self.issues:
            if issue_type not in issue_types:
                issue_types[issue_type] = []
            issue_types[issue_type].append((message, filepath))
            
        # 顯示檔名問題
        if 'filename' in issue_types:
            print(f"\n❌ 檔名格式問題 ({len(issue_types['filename'])} 個):")
            for msg, _ in issue_types['filename'][:10]:  # 最多顯示10個
                print(f"   - {msg}")
            if len(issue_types['filename']) > 10:
                print(f"   ... 還有 {len(issue_types['filename']) - 10} 個")
                
        # 顯示時間問題
        if 'unrealistic_time' in issue_types:
            print(f"\n⚠️ 不合理的開發時間 ({len(issue_types['unrealistic_time'])} 個):")
            for msg, _ in issue_types['unrealistic_time']:
                print(f"   - {msg}")
                
        if 'estimated_time' in issue_types:
            print(f"\n⏱️ 使用推估時間 ({len(issue_types['estimated_time'])} 個):")
            for msg, _ in issue_types['estimated_time']:
                print(f"   - {msg}")
                
        # 顯示缺少的 tickets
        if self.tickets_to_create:
            print(f"\n🎫 缺少對應 ticket 的 dev logs ({len(self.tickets_to_create)} 組):")
            for key, logs in self.tickets_to_create[:10]:
                print(f"   - {key} ({len(logs)} 個 dev log)")
            if len(self.tickets_to_create) > 10:
                print(f"   ... 還有 {len(self.tickets_to_create) - 10} 組")
                
        # 統計摘要
        print(f"\n📈 統計摘要:")
        print(f"   - 總共檢查了 {sum(len(files) for _, _, files in os.walk(self.dev_logs_path) if files)} 個文件")
        print(f"   - 發現 {len(self.issues)} 個問題")
        print(f"   - 需要創建 {len(self.tickets_to_create)} 個 ticket")
        
    def generate_fix_script(self):
        """生成修復腳本"""
        print("\n💡 生成修復建議...")
        
        fix_script_path = self.project_root / "docs" / "scripts" / "fix-dev-logs.sh"
        
        with open(fix_script_path, 'w') as f:
            f.write("#!/bin/bash\n")
            f.write("# Dev logs 修復腳本\n")
            f.write("# 生成時間: " + datetime.now().isoformat() + "\n\n")
            
            # 修復檔名問題
            f.write("# === 修復檔名問題 ===\n")
            for issue_type, message, filepath in self.issues:
                if issue_type == 'filename':
                    # 嘗試生成修復命令
                    old_name = filepath.name
                    if '2025-06-23-docs-2025-06-23' in old_name:
                        # 移除重複日期
                        new_name = re.sub(r'2025-06-23-docs-2025-06-23-docs-', '2025-06-23-XX-XX-XX-docs-', old_name)
                        f.write(f"# mv '{filepath}' '{filepath.parent}/{new_name}'\n")
                        
            # 修復時間數據
            f.write("\n# === 修復時間數據 ===\n")
            f.write("# 需要手動檢查和修改以下文件的時間數據:\n")
            for issue_type, message, filepath in self.issues:
                if issue_type in ['unrealistic_time', 'estimated_time']:
                    f.write(f"# - {filepath}\n")
                    
        print(f"✅ 修復腳本已生成: {fix_script_path}")
        
def main():
    analyzer = DevLogsAnalyzer()
    analyzer.analyze()
    analyzer.generate_fix_script()
    
if __name__ == "__main__":
    main()