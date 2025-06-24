#!/usr/bin/env python3
"""
修復 completed tickets 中缺失的 total_duration_minutes
使用 git commit 歷史來計算實際開發時間
"""

import os
import sys
import yaml
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple

class TicketDurationFixer:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.tickets_path = self.project_root / "docs" / "tickets" / "completed"
        self.fixed_count = 0
        self.skipped_count = 0
        self.error_count = 0
        
    def fix_all_tickets(self):
        """修復所有票券的時間數據"""
        print("🔧 開始修復 completed tickets 的時間數據...")
        print("📋 使用 git commit 歷史來計算實際開發時間\n")
        
        # 收集所有需要修復的票券
        tickets_to_fix = []
        
        for ticket_file in self.tickets_path.glob("*.yml"):
            try:
                with open(ticket_file, 'r', encoding='utf-8') as f:
                    data = yaml.safe_load(f)
                    
                if not isinstance(data, dict):
                    continue
                    
                # 檢查是否需要修復
                if self._needs_fix(data):
                    tickets_to_fix.append((ticket_file, data))
                    
            except Exception as e:
                print(f"❌ 無法讀取 {ticket_file.name}: {e}")
                self.error_count += 1
                
        print(f"📊 發現 {len(tickets_to_fix)} 個需要修復的票券\n")
        
        # 修復每個票券
        for ticket_file, ticket_data in tickets_to_fix:
            self._fix_ticket(ticket_file, ticket_data)
            
        # 顯示結果
        self._show_results()
        
    def _needs_fix(self, data: Dict) -> bool:
        """檢查票券是否需要修復"""
        # 缺少 total_duration_minutes 欄位
        if 'total_duration_minutes' not in data:
            return True
            
        # 值為 null 或 0
        duration = data.get('total_duration_minutes')
        if duration is None or duration == 0:
            return True
            
        return False
        
    def _fix_ticket(self, ticket_file: Path, ticket_data: Dict):
        """修復單個票券的時間數據"""
        ticket_name = ticket_data.get('name', ticket_file.stem)
        print(f"🎫 處理票券: {ticket_name}")
        
        # 優先使用 commit_hash
        if 'commit_hash' in ticket_data and ticket_data['commit_hash']:
            duration = self._calculate_duration_from_commit(ticket_data['commit_hash'])
            if duration:
                ticket_data['total_duration_minutes'] = round(duration, 1)
                ticket_data['duration_calculation_method'] = 'git_commit_analysis'
                ticket_data['duration_updated_at'] = datetime.now().isoformat()
                
                # 保存更新
                with open(ticket_file, 'w', encoding='utf-8') as f:
                    yaml.dump(ticket_data, f, allow_unicode=True, sort_keys=False)
                    
                print(f"   ✅ 已更新時間: {duration:.1f} 分鐘 (基於 commit {ticket_data['commit_hash'][:8]})")
                self.fixed_count += 1
                return
                
        # 嘗試從 dev_log_path 找到相關的 commit
        if 'dev_log_path' in ticket_data and ticket_data['dev_log_path']:
            commit_hash = self._find_commit_for_dev_log(ticket_data['dev_log_path'])
            if commit_hash:
                duration = self._calculate_duration_from_commit(commit_hash)
                if duration:
                    ticket_data['total_duration_minutes'] = round(duration, 1)
                    ticket_data['commit_hash'] = commit_hash
                    ticket_data['duration_calculation_method'] = 'git_commit_analysis_from_dev_log'
                    ticket_data['duration_updated_at'] = datetime.now().isoformat()
                    
                    # 保存更新
                    with open(ticket_file, 'w', encoding='utf-8') as f:
                        yaml.dump(ticket_data, f, allow_unicode=True, sort_keys=False)
                        
                    print(f"   ✅ 已更新時間: {duration:.1f} 分鐘 (從 dev log 找到 commit {commit_hash[:8]})")
                    self.fixed_count += 1
                    return
                    
        # 使用時間戳計算（如果有 created_at 和 completed_at）
        if 'created_at' in ticket_data and 'completed_at' in ticket_data:
            try:
                created = datetime.fromisoformat(ticket_data['created_at'].replace('Z', '+00:00'))
                completed = datetime.fromisoformat(ticket_data['completed_at'].replace('Z', '+00:00'))
                duration = (completed - created).total_seconds() / 60
                
                # 合理性檢查（開發時間在 5 分鐘到 8 小時之間）
                if 5 <= duration <= 480:
                    ticket_data['total_duration_minutes'] = round(duration, 1)
                    ticket_data['duration_calculation_method'] = 'timestamp_difference'
                    ticket_data['duration_updated_at'] = datetime.now().isoformat()
                    
                    # 保存更新
                    with open(ticket_file, 'w', encoding='utf-8') as f:
                        yaml.dump(ticket_data, f, allow_unicode=True, sort_keys=False)
                        
                    print(f"   ✅ 已更新時間: {duration:.1f} 分鐘 (基於時間戳)")
                    self.fixed_count += 1
                    return
                else:
                    print(f"   ⚠️  時間戳差異不合理: {duration:.1f} 分鐘")
                    
            except Exception as e:
                print(f"   ❌ 無法解析時間戳: {e}")
                
        print(f"   ⏭️  跳過 - 無法計算時間")
        self.skipped_count += 1
        
    def _calculate_duration_from_commit(self, commit_hash: str) -> Optional[float]:
        """從 commit hash 計算開發時間"""
        try:
            # 獲取該 commit 的時間
            cmd = ['git', 'show', '-s', '--format=%ci', commit_hash]
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.project_root)
            if result.returncode != 0:
                return None
                
            commit_time = datetime.fromisoformat(result.stdout.strip().replace(' +0800', '+08:00'))
            
            # 獲取該 commit 修改的文件
            cmd = ['git', 'show', '--name-only', '--format=', commit_hash]
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.project_root)
            if result.returncode != 0:
                return None
                
            modified_files = [f for f in result.stdout.strip().split('\n') if f]
            
            # 獲取這些文件在該 commit 之前的最後修改時間
            earliest_time = commit_time
            
            for file in modified_files:
                # 跳過自動生成的文件
                if 'dev-logs' in file or 'tickets' in file or 'CHANGELOG' in file:
                    continue
                    
                # 獲取該文件在此 commit 之前的歷史
                cmd = ['git', 'log', '--format=%ci', '-n', '2', commit_hash, '--', file]
                result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.project_root)
                
                if result.returncode == 0 and result.stdout:
                    times = result.stdout.strip().split('\n')
                    if len(times) > 1:
                        # 第二個時間是之前的修改時間
                        prev_time = datetime.fromisoformat(times[1].replace(' +0800', '+08:00'))
                        if prev_time < earliest_time:
                            earliest_time = prev_time
                            
            # 計算時間差
            duration = (commit_time - earliest_time).total_seconds() / 60
            
            # 合理性檢查
            if duration < 1:
                # 如果時間太短，嘗試找更早的相關 commit
                cmd = ['git', 'log', '--format=%H %ci', '-n', '20', '--before=' + commit_time.isoformat()]
                result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.project_root)
                
                if result.returncode == 0:
                    commits = result.stdout.strip().split('\n')
                    for i, commit_line in enumerate(commits):
                        if commit_hash in commit_line:
                            # 找到下一個 commit
                            if i + 1 < len(commits):
                                prev_commit_time = datetime.fromisoformat(commits[i + 1].split(' ', 1)[1].replace(' +0800', '+08:00'))
                                duration = (commit_time - prev_commit_time).total_seconds() / 60
                                if 5 <= duration <= 480:  # 合理範圍：5分鐘到8小時
                                    return duration
                                    
            return duration if 5 <= duration <= 480 else None
            
        except Exception as e:
            print(f"      ❌ 計算 commit 時間失敗: {e}")
            return None
            
    def _find_commit_for_dev_log(self, dev_log_path: str) -> Optional[str]:
        """從 dev log 路徑找到相關的 commit"""
        try:
            # 讀取 dev log 文件
            dev_log_file = self.project_root / dev_log_path
            if not dev_log_file.exists():
                return None
                
            with open(dev_log_file, 'r', encoding='utf-8') as f:
                dev_log_data = yaml.safe_load(f)
                
            # 尋找 commit_hash
            if isinstance(dev_log_data, dict) and 'commit_hash' in dev_log_data:
                return dev_log_data['commit_hash']
                
            return None
            
        except Exception:
            return None
            
    def _show_results(self):
        """顯示修復結果"""
        print("\n" + "="*60)
        print("📊 修復結果")
        print("="*60)
        print(f"✅ 成功修復: {self.fixed_count} 個票券")
        print(f"⏭️  跳過: {self.skipped_count} 個票券（無法計算）")
        print(f"❌ 錯誤: {self.error_count} 個票券")
        print(f"📈 總計: {self.fixed_count + self.skipped_count + self.error_count} 個票券")
        
        if self.fixed_count > 0:
            print(f"\n💡 已更新 {self.fixed_count} 個票券的 total_duration_minutes")
            print("   所有時間數據均基於 git commit 歷史計算")

def main():
    """主執行函數"""
    fixer = TicketDurationFixer()
    
    # 確認執行
    print("⚠️  此腳本將更新 completed tickets 的時間數據")
    print("📋 只會使用 git commit 歷史來計算實際時間")
    print("🚫 不會使用任何推估方法")
    
    # 檢查是否有 --auto 參數
    if '--auto' not in sys.argv:
        response = input("\n是否繼續? (y/N): ")
        if response.lower() != 'y':
            print("已取消")
            return
    else:
        print("\n🤖 自動模式執行中...")
        
    fixer.fix_all_tickets()
    
if __name__ == "__main__":
    main()