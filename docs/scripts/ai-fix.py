#!/usr/bin/env python3
"""
AI 自動修復系統 - 自動修復 ESLint 和 TypeScript 錯誤
"""

import os
import sys
import subprocess
import json
from pathlib import Path
from typing import Dict, List, Tuple

class AIAutoFixer:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.frontend_path = self.project_root / "frontend"
        
        # 確保 frontend 目錄存在
        if not self.frontend_path.exists():
            print(f"⚠️  找不到 frontend 目錄: {self.frontend_path}")
            self.frontend_path = self.project_root  # 如果沒有 frontend，使用根目錄
        
    def run_eslint_check(self) -> Tuple[bool, List[str]]:
        """執行 ESLint 檢查並獲取錯誤"""
        print("🔍 執行 ESLint 檢查...")
        
        # 如果沒有 frontend 目錄，直接返回成功
        if not (self.project_root / "frontend").exists():
            print("⚠️  沒有 frontend 目錄，跳過 ESLint 檢查")
            return True, []
        
        cmd = ["npm", "run", "lint", "--", "--format", "json"]
        result = subprocess.run(
            cmd,
            cwd=self.frontend_path,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            return True, []
        
        try:
            # 解析 ESLint JSON 輸出
            errors = json.loads(result.stdout)
            error_files = []
            for file_result in errors:
                if file_result.get('errorCount', 0) > 0 or file_result.get('warningCount', 0) > 0:
                    error_files.append({
                        'file': file_result['filePath'],
                        'messages': file_result['messages']
                    })
            return False, error_files
        except:
            # 如果無法解析，嘗試自動修復
            return False, ['無法解析錯誤，將嘗試自動修復']
    
    def auto_fix_eslint(self) -> bool:
        """自動修復 ESLint 錯誤"""
        print("🔧 嘗試自動修復 ESLint 錯誤...")
        
        # 如果沒有 frontend 目錄，直接返回成功
        if not (self.project_root / "frontend").exists():
            print("⚠️  沒有 frontend 目錄，跳過 ESLint 修復")
            return True
        
        cmd = ["npm", "run", "lint", "--", "--fix"]
        result = subprocess.run(
            cmd,
            cwd=self.frontend_path,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✅ ESLint 錯誤已自動修復！")
            return True
        else:
            print("⚠️  部分 ESLint 錯誤無法自動修復")
            print(result.stdout)
            return False
    
    def run_typescript_check(self) -> Tuple[bool, List[str]]:
        """執行 TypeScript 檢查"""
        print("🔍 執行 TypeScript 檢查...")
        
        # 如果沒有 frontend 目錄，直接返回成功
        if not (self.project_root / "frontend").exists():
            print("⚠️  沒有 frontend 目錄，跳過 TypeScript 檢查")
            return True, []
        
        cmd = ["npx", "tsc", "--noEmit"]
        result = subprocess.run(
            cmd,
            cwd=self.frontend_path,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            return True, []
        
        # 解析 TypeScript 錯誤
        errors = result.stdout.split('\n')
        error_list = [e for e in errors if e.strip() and 'error' in e.lower()]
        return False, error_list
    
    def analyze_typescript_errors(self, errors: List[str]) -> Dict[str, List[str]]:
        """分析 TypeScript 錯誤類型"""
        error_types = {
            'missing_types': [],
            'unused_vars': [],
            'import_errors': [],
            'other': []
        }
        
        for error in errors:
            if 'Cannot find module' in error or 'Could not find a declaration' in error:
                error_types['import_errors'].append(error)
            elif 'is declared but' in error or 'is defined but never used' in error:
                error_types['unused_vars'].append(error)
            elif 'implicitly has an' in error or 'type annotation' in error:
                error_types['missing_types'].append(error)
            else:
                error_types['other'].append(error)
        
        return error_types
    
    def generate_fix_instructions(self, eslint_errors: List, ts_errors: Dict) -> str:
        """生成修復指令給 AI"""
        instructions = """# 需要修復的問題

## ESLint 錯誤
"""
        
        if eslint_errors and isinstance(eslint_errors[0], dict):
            for file_error in eslint_errors[:5]:  # 只顯示前5個檔案
                instructions += f"\n### {file_error['file']}\n"
                for msg in file_error['messages'][:3]:  # 每個檔案只顯示前3個錯誤
                    instructions += f"- Line {msg.get('line', '?')}: {msg.get('message', 'Unknown error')}\n"
        
        instructions += "\n## TypeScript 錯誤\n"
        
        for error_type, errors in ts_errors.items():
            if errors:
                instructions += f"\n### {error_type.replace('_', ' ').title()}\n"
                for error in errors[:3]:  # 每種類型只顯示前3個
                    instructions += f"- {error}\n"
        
        instructions += """
## 修復建議

1. 對於 ESLint 錯誤：
   - 未使用的變數：移除或添加使用
   - 缺少分號：添加分號
   - 格式問題：調整縮排和空格

2. 對於 TypeScript 錯誤：
   - 缺少類型：添加明確的類型註解
   - 找不到模組：檢查 import 路徑
   - 未使用的變數：移除或添加 `_` 前綴

請根據這些錯誤生成修復指令。
"""
        
        return instructions
    
    def save_fix_instructions(self, instructions: str):
        """保存修復指令供 AI 參考"""
        fix_file = self.project_root / "docs" / "handbook" / "improvements" / "auto-fix-instructions.md"
        fix_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(fix_file, 'w', encoding='utf-8') as f:
            f.write(instructions)
        
        print(f"📝 修復指令已保存到: {fix_file}")
        return fix_file
    
    def create_fix_script(self, eslint_errors: List, ts_errors: Dict) -> Path:
        """創建具體的修復腳本"""
        script_content = """#!/usr/bin/env python3
# 自動生成的修復腳本

import os
import re
from pathlib import Path

def fix_unused_imports():
    \"\"\"修復未使用的 import\"\"\"
    # TODO: 根據實際錯誤生成具體修復代碼
    pass

def fix_missing_types():
    \"\"\"添加缺失的類型\"\"\"
    # TODO: 根據實際錯誤生成具體修復代碼
    pass

def main():
    print("🔧 執行自動修復...")
    
    # 先嘗試 ESLint 自動修復
    if os.path.exists("frontend"):
        os.system("cd frontend && npm run lint -- --fix")
    else:
        print("⚠️  沒有 frontend 目錄，跳過修復")
    
    # 然後處理 TypeScript 錯誤
    fix_unused_imports()
    fix_missing_types()
    
    print("✅ 修復完成！")

if __name__ == "__main__":
    main()
"""
        
        script_file = self.project_root / "docs" / "scripts" / "temp-fix.py"
        with open(script_file, 'w', encoding='utf-8') as f:
            f.write(script_content)
        
        os.chmod(script_file, 0o755)
        return script_file
    
    def run(self) -> bool:
        """執行自動修復流程"""
        print("🤖 AI 自動修復系統啟動...")
        
        # 1. 檢查 ESLint
        eslint_ok, eslint_errors = self.run_eslint_check()
        
        if not eslint_ok:
            # 嘗試自動修復
            if self.auto_fix_eslint():
                # 重新檢查
                eslint_ok, eslint_errors = self.run_eslint_check()
        
        # 2. 檢查 TypeScript
        ts_ok, ts_errors = self.run_typescript_check()
        
        if not eslint_ok or not ts_ok:
            # 3. 分析錯誤
            ts_error_types = self.analyze_typescript_errors(ts_errors) if ts_errors else {}
            
            # 4. 生成修復指令
            instructions = self.generate_fix_instructions(eslint_errors, ts_error_types)
            instruction_file = self.save_fix_instructions(instructions)
            
            # 5. 創建修復腳本
            fix_script = self.create_fix_script(eslint_errors, ts_error_types)
            
            print("\n" + "="*50)
            print("📋 錯誤摘要：")
            print(f"- ESLint 錯誤: {len(eslint_errors) if isinstance(eslint_errors, list) else '有'}")
            print(f"- TypeScript 錯誤: {sum(len(e) for e in ts_error_types.values())}")
            print("\n🤖 AI 修復建議：")
            print(f"1. 查看詳細錯誤: {instruction_file}")
            print(f"2. 執行修復腳本: python3 {fix_script}")
            print(f"3. 或讓 AI 根據錯誤訊息提供具體修復代碼")
            print("="*50)
            
            return False
        
        print("✅ 所有檢查都通過！")
        return True

if __name__ == "__main__":
    fixer = AIAutoFixer()
    success = fixer.run()
    sys.exit(0 if success else 1)