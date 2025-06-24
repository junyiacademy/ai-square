#!/usr/bin/env python3
"""
測試 smart-commit 與 commit-guide 的整合
"""

import subprocess
import sys
from pathlib import Path

def test_parser():
    """測試 commit guide 解析器"""
    print("🧪 測試 Commit Guide 解析器...\n")
    
    result = subprocess.run(
        [sys.executable, "docs/scripts/commit-guide-parser.py"],
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        print("✅ 解析器測試通過")
        print(result.stdout)
    else:
        print("❌ 解析器測試失敗")
        print(result.stderr)

def test_integration():
    """測試整合功能"""
    print("\n🧪 測試 Smart Commit 整合...\n")
    
    # 測試顯示功能（不實際提交）
    test_code = """
import sys
sys.path.append('docs/scripts')
from smart_commit import SmartCommit

commit = SmartCommit()
commit.print_header()
commit.show_commit_types()
commit.show_pre_commit_checklist()
commit.show_helpful_links("general")
"""
    
    result = subprocess.run(
        [sys.executable, "-c", test_code],
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        print("✅ 整合測試通過")
        print(result.stdout)
    else:
        print("❌ 整合測試失敗")
        print(result.stderr)

def main():
    print("=" * 50)
    print("🔍 測試 Commit Guide 整合")
    print("=" * 50)
    
    # 1. 測試解析器
    test_parser()
    
    # 2. 測試整合
    test_integration()
    
    print("\n✅ 測試完成！")
    print("\n💡 整合效果：")
    print("1. 提交時會顯示核心原則提醒")
    print("2. 顯示可用的 commit 類型參考")
    print("3. 顯示 pre-commit 檢查清單")
    print("4. 失敗時提供相關 handbook 連結")

if __name__ == "__main__":
    main()