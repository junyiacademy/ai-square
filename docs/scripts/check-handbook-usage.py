#!/usr/bin/env python3
"""
檢查工作流程中是否有參考 handbook
"""

import os
import subprocess
from pathlib import Path

def check_file_references(file_path, target_dirs):
    """檢查文件中是否有參考目標目錄"""
    references = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            for target in target_dirs:
                if target in content:
                    # 計算出現次數
                    count = content.count(target)
                    references.append(f"{target}: {count}次")
    except Exception as e:
        pass
    return references

def main():
    # 要檢查的目標
    targets = ['handbook', 'business-rules', 'domain-knowledge', 'CLAUDE.md']
    
    # 要檢查的腳本
    scripts_dir = Path("docs/scripts")
    important_scripts = [
        "ticket-manager.py",
        "ticket-driven-dev.py", 
        "ticket-integrity-checker.py",
        "smart-commit.py",
        "pre-commit-validator.py",
        "post-commit-updater.py",
        "checkpoint.py",
        "ai-fix.py"
    ]
    
    print("🔍 檢查工作流程腳本中的 handbook 參考...\n")
    
    found_any = False
    
    for script in important_scripts:
        script_path = scripts_dir / script
        if script_path.exists():
            refs = check_file_references(script_path, targets)
            if refs:
                print(f"📄 {script}")
                for ref in refs:
                    print(f"   ✓ {ref}")
                print()
                found_any = True
    
    if not found_any:
        print("❌ 沒有發現任何腳本參考 handbook 或業務規則！\n")
    
    # 檢查 CLAUDE.md
    claude_path = Path("CLAUDE.md")
    if claude_path.exists():
        print("\n📋 檢查 CLAUDE.md...")
        refs = check_file_references(claude_path, ['handbook', 'business-rules'])
        if refs:
            for ref in refs:
                print(f"   ✓ {ref}")
        else:
            print("   ❌ CLAUDE.md 中沒有參考 handbook")
    
    # 提出建議
    print("\n💡 建議：")
    print("1. 在 ticket-manager.py 開票時，應該提示檢查 handbook/01-context/business-rules.md")
    print("2. 在 pre-commit-validator.py 中，可以驗證程式碼是否符合業務規則")
    print("3. 在 smart-commit.py 中，可以參考 commit-guide.md 生成更好的提交訊息")
    print("4. 在 CLAUDE.md 中加入參考 handbook 的指引")

if __name__ == "__main__":
    main()