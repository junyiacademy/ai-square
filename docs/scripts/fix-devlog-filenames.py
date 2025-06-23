#!/usr/bin/env python3
"""
修復 dev log 檔名問題
1. 確保所有檔名都有時間戳記
2. 使用 git 歷史來獲取正確的時間
"""

import os
import re
import subprocess
import yaml
from pathlib import Path
from datetime import datetime

def run_command(cmd):
    """執行命令並返回結果"""
    result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
    return result.returncode, result.stdout, result.stderr

def get_commit_time(commit_hash):
    """獲取 commit 的時間"""
    if not commit_hash:
        return None
        
    code, stdout, _ = run_command(f"git show -s --format=%ct {commit_hash}")
    if code == 0 and stdout.strip():
        return datetime.fromtimestamp(int(stdout.strip()))
    return None

def fix_filename(old_path):
    """修復檔名，加入時間戳記"""
    filename = old_path.name
    parent = old_path.parent
    
    # 檢查是否已有時間戳記 (HH-MM-SS 格式)
    time_pattern = r'\d{2}-\d{2}-\d{2}'
    if re.search(f'-{time_pattern}-', filename):
        print(f"✅ 已有時間戳記: {filename}")
        return None
    
    # 讀取檔案內容以獲取 commit_hash 或其他時間資訊
    try:
        with open(old_path, 'r', encoding='utf-8') as f:
            content = yaml.safe_load(f)
    except Exception as e:
        print(f"❌ 無法讀取 {filename}: {e}")
        return None
    
    # 嘗試從內容獲取時間
    commit_time = None
    
    # 1. 從 commit_hash 獲取
    if 'commit_hash' in content and content['commit_hash']:
        commit_time = get_commit_time(content['commit_hash'])
    
    # 2. 從 commit_timestamp 獲取
    if not commit_time and 'commit_timestamp' in content:
        try:
            commit_time = datetime.fromisoformat(content['commit_timestamp'].replace('Z', '+00:00'))
        except:
            pass
    
    # 3. 從 generation_timestamp 獲取
    if not commit_time and 'generation_timestamp' in content:
        try:
            commit_time = datetime.fromisoformat(content['generation_timestamp'])
        except:
            pass
    
    # 4. 使用檔案修改時間作為最後手段
    if not commit_time:
        commit_time = datetime.fromtimestamp(old_path.stat().st_mtime)
        print(f"⚠️  使用檔案修改時間: {filename}")
    
    # 生成新檔名
    time_str = commit_time.strftime('%H-%M-%S')
    
    # 解析原始檔名格式: YYYY-MM-DD-type-description.yml
    match = re.match(r'^(\d{4}-\d{2}-\d{2})-(.+)\.yml$', filename)
    if match:
        date_part = match.group(1)
        rest_part = match.group(2)
        new_filename = f"{date_part}-{time_str}-{rest_part}.yml"
        new_path = parent / new_filename
        
        print(f"📝 修復: {filename}")
        print(f"   → {new_filename}")
        
        return (old_path, new_path)
    
    return None

def main():
    """主函式"""
    project_root = Path(__file__).parent.parent.parent
    dev_logs_dir = project_root / "docs" / "dev-logs"
    
    print("🔍 掃描 dev logs 目錄...")
    
    fixes_needed = []
    
    # 掃描所有日期資料夾
    for date_dir in dev_logs_dir.iterdir():
        if date_dir.is_dir() and re.match(r'\d{4}-\d{2}-\d{2}', date_dir.name):
            print(f"\n📅 檢查 {date_dir.name}")
            
            for yml_file in date_dir.glob("*.yml"):
                fix = fix_filename(yml_file)
                if fix:
                    fixes_needed.append(fix)
    
    # 執行修復
    if fixes_needed:
        print(f"\n🔧 需要修復 {len(fixes_needed)} 個檔案")
        # 非互動式模式，直接執行
        print("🔧 開始自動修復...")
        
        for old_path, new_path in fixes_needed:
            try:
                # 使用 git mv 保留歷史
                code, _, stderr = run_command(f"git mv '{old_path}' '{new_path}'")
                if code != 0:
                    # 如果 git mv 失敗，使用普通 mv
                    old_path.rename(new_path)
                    print(f"✅ 已重命名: {old_path.name} → {new_path.name}")
                else:
                    print(f"✅ 已使用 git mv: {old_path.name} → {new_path.name}")
            except Exception as e:
                print(f"❌ 重命名失敗 {old_path.name}: {e}")
        
        print("\n✅ 修復完成！")
        print("💡 請記得 commit 這些變更")
    else:
        print("\n✅ 所有檔名都正確！")

if __name__ == "__main__":
    main()