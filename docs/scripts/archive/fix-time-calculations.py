#!/usr/bin/env python3
"""
修復 dev log 中的時間計算錯誤
重新計算 time_calculation_details 中的實際時間
"""

import yaml
from pathlib import Path
from datetime import datetime

def fix_time_in_log(log_file):
    """修復單個 log 檔案的時間計算"""
    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            content = yaml.safe_load(f)
        
        metrics = content.get('metrics', {})
        details = metrics.get('time_calculation_details', {})
        
        # 檢查是否有需要修復的時間計算
        if not details:
            return False
            
        start_time = details.get('start_time')
        end_time = details.get('end_time')
        
        if not start_time or not end_time:
            return False
        
        # 計算實際時間差
        try:
            start = datetime.fromisoformat(start_time)
            end = datetime.fromisoformat(end_time)
            actual_minutes = (end - start).total_seconds() / 60
            
            # 檢查是否需要修復（原始時間與計算時間差異太大）
            current_total = metrics.get('total_time_minutes', 0)
            if abs(current_total - actual_minutes) < 0.1:  # 差異小於 0.1 分鐘，不需要修復
                return False
            
            print(f"📝 修復: {log_file.name}")
            print(f"   原始時間: {current_total} 分鐘")
            print(f"   實際時間: {round(actual_minutes, 1)} 分鐘")
            
            # 更新時間
            metrics['total_time_minutes'] = round(actual_minutes, 1)
            metrics['ai_time_minutes'] = round(actual_minutes * 0.8, 1)
            metrics['human_time_minutes'] = round(actual_minutes * 0.2, 1)
            
            # 更新 timeline
            if 'timeline' in content and content['timeline']:
                content['timeline'][0]['duration'] = round(actual_minutes, 1)
                content['timeline'][0]['ai_time'] = round(actual_minutes * 0.8, 1)
                content['timeline'][0]['human_time'] = round(actual_minutes * 0.2, 1)
            
            # 加入修復標記
            metrics['time_calculation_fixed'] = True
            metrics['time_calculation_fix_date'] = datetime.now().isoformat()
            
            # 寫回檔案
            with open(log_file, 'w', encoding='utf-8') as f:
                yaml.dump(content, f, allow_unicode=True, sort_keys=False)
            
            return True
            
        except Exception as e:
            print(f"❌ 無法處理 {log_file.name}: {e}")
            return False
            
    except Exception as e:
        print(f"❌ 無法讀取 {log_file.name}: {e}")
        return False

def main():
    """主函式"""
    project_root = Path(__file__).parent.parent.parent
    dev_logs_dir = project_root / "docs" / "dev-logs"
    
    print("🔍 掃描需要修復時間計算的 dev logs...")
    
    fixed_count = 0
    
    # 掃描所有日期資料夾
    for date_dir in dev_logs_dir.iterdir():
        if date_dir.is_dir() and date_dir.name.startswith('20'):
            for yml_file in date_dir.glob("*.yml"):
                if fix_time_in_log(yml_file):
                    fixed_count += 1
    
    if fixed_count > 0:
        print(f"\n✅ 已修復 {fixed_count} 個檔案的時間計算")
    else:
        print("\n✅ 沒有需要修復的檔案")

if __name__ == "__main__":
    main()