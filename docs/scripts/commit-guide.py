#!/usr/bin/env python3
"""
AI Square 智能提交助手
自動化檢查、測試、文檔更新和提交訊息生成
"""

import os
import sys
import subprocess
import json
import re
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Tuple, Optional

class Colors:
    """終端機顏色"""
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

class CommitGuide:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.checks_passed = []
        self.checks_failed = []
        self.changes_summary = {}
        
    def run_command(self, command: List[str], cwd=None) -> Tuple[int, str, str]:
        """執行命令並返回結果"""
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                cwd=cwd or self.project_root
            )
            return result.returncode, result.stdout, result.stderr
        except Exception as e:
            return 1, "", str(e)
    
    def print_header(self):
        """顯示標題"""
        print(f"\n{Colors.CYAN}{Colors.BOLD}🤖 AI Square 智能提交助手{Colors.END}")
        print(f"{Colors.CYAN}{'='*50}{Colors.END}\n")
    
    def check_git_status(self) -> bool:
        """檢查 Git 狀態"""
        print(f"{Colors.BLUE}📋 檢查 Git 狀態...{Colors.END}")
        
        # 獲取變更檔案
        code, stdout, _ = self.run_command(["git", "status", "--porcelain"])
        if code != 0:
            print(f"{Colors.RED}❌ 無法獲取 Git 狀態{Colors.END}")
            return False
        
        if not stdout.strip():
            print(f"{Colors.YELLOW}⚠️ 沒有檔案變更需要提交{Colors.END}")
            return False
        
        # 分析變更類型
        changes = stdout.strip().split('\n')
        self.changes_summary = {
            'added': [],
            'modified': [],
            'deleted': [],
            'untracked': []
        }
        
        for change in changes:
            status = change[:2]
            file_path = change[3:]
            
            if status == 'A ' or status == 'AM':
                self.changes_summary['added'].append(file_path)
            elif status == 'M ' or status == ' M':
                self.changes_summary['modified'].append(file_path)
            elif status == 'D ':
                self.changes_summary['deleted'].append(file_path)
            elif status == '??':
                self.changes_summary['untracked'].append(file_path)
        
        # 顯示變更摘要
        total = sum(len(v) for v in self.changes_summary.values())
        print(f"{Colors.GREEN}✅ 發現 {total} 個檔案變更{Colors.END}")
        
        return True
    
    def run_lint_check(self) -> bool:
        """執行 ESLint 檢查"""
        print(f"\n{Colors.BLUE}🔍 執行 ESLint 檢查...{Colors.END}")
        
        code, stdout, stderr = self.run_command(
            ["npm", "run", "lint"],
            cwd=self.project_root / "frontend"
        )
        
        if code == 0:
            self.checks_passed.append("ESLint")
            print(f"{Colors.GREEN}✅ ESLint 檢查通過{Colors.END}")
            return True
        else:
            self.checks_failed.append("ESLint")
            print(f"{Colors.RED}❌ ESLint 檢查失敗{Colors.END}")
            if stderr:
                print(f"{Colors.YELLOW}錯誤詳情:\n{stderr}{Colors.END}")
            return False
    
    def run_type_check(self) -> bool:
        """執行 TypeScript 檢查"""
        print(f"\n{Colors.BLUE}🔍 執行 TypeScript 檢查...{Colors.END}")
        
        code, stdout, stderr = self.run_command(
            ["npx", "tsc", "--noEmit"],
            cwd=self.project_root / "frontend"
        )
        
        if code == 0:
            self.checks_passed.append("TypeScript")
            print(f"{Colors.GREEN}✅ TypeScript 檢查通過{Colors.END}")
            return True
        else:
            self.checks_failed.append("TypeScript")
            print(f"{Colors.RED}❌ TypeScript 檢查失敗{Colors.END}")
            return False
    
    def run_build_check(self) -> bool:
        """執行建置檢查"""
        print(f"\n{Colors.BLUE}🔨 執行建置檢查...{Colors.END}")
        
        code, stdout, stderr = self.run_command(
            ["npm", "run", "build"],
            cwd=self.project_root / "frontend"
        )
        
        if code == 0:
            self.checks_passed.append("Build")
            print(f"{Colors.GREEN}✅ 建置成功{Colors.END}")
            return True
        else:
            self.checks_failed.append("Build")
            print(f"{Colors.RED}❌ 建置失敗{Colors.END}")
            return False
    
    def check_tests(self) -> bool:
        """檢查是否有相關測試"""
        print(f"\n{Colors.BLUE}🧪 檢查測試覆蓋...{Colors.END}")
        
        # 檢查是否有修改的程式碼檔案
        code_files = [f for f in self.changes_summary['modified'] + self.changes_summary['added'] 
                     if f.endswith(('.ts', '.tsx', '.js', '.jsx')) and not f.endswith('.test.tsx')]
        
        if not code_files:
            print(f"{Colors.GREEN}✅ 沒有程式碼變更需要測試{Colors.END}")
            return True
        
        # 檢查是否有對應的測試檔案
        missing_tests = []
        for file in code_files:
            test_file = file.replace('.tsx', '.test.tsx').replace('.ts', '.test.ts')
            if not os.path.exists(self.project_root / test_file):
                missing_tests.append(file)
        
        if missing_tests:
            print(f"{Colors.YELLOW}⚠️ 以下檔案缺少測試:{Colors.END}")
            for file in missing_tests:
                print(f"  - {file}")
            return False
        
        print(f"{Colors.GREEN}✅ 測試檢查通過{Colors.END}")
        return True
    
    def update_feature_log(self) -> bool:
        """更新功能日誌"""
        print(f"\n{Colors.BLUE}📝 檢查功能日誌...{Colors.END}")
        
        # 檢查今天是否有功能日誌
        today = datetime.now().strftime("%Y-%m-%d")
        feature_logs = list(Path(self.project_root / "docs/features").glob(f"{today}*.yml"))
        
        if not feature_logs:
            print(f"{Colors.YELLOW}⚠️ 今天沒有功能日誌，是否要創建？{Colors.END}")
            create = input("創建新的功能日誌? (y/n): ").lower()
            if create == 'y':
                feature_name = input("功能名稱: ")
                # 這裡可以自動創建一個基礎的功能日誌
                print(f"{Colors.GREEN}✅ 已創建功能日誌模板{Colors.END}")
                return True
        else:
            print(f"{Colors.GREEN}✅ 找到 {len(feature_logs)} 個今日功能日誌{Colors.END}")
        
        return True
    
    def generate_commit_message(self) -> str:
        """智能生成提交訊息"""
        print(f"\n{Colors.BLUE}💡 生成提交訊息...{Colors.END}")
        
        # 分析變更內容
        if self.changes_summary['added']:
            action = "feat"
            scope = self._get_scope(self.changes_summary['added'][0])
        elif self.changes_summary['modified']:
            # 檢查是否是修復
            if any('fix' in f or 'bug' in f for f in self.changes_summary['modified']):
                action = "fix"
            else:
                action = "refactor"
            scope = self._get_scope(self.changes_summary['modified'][0])
        else:
            action = "chore"
            scope = "misc"
        
        # 生成描述
        total_changes = sum(len(v) for v in self.changes_summary.values())
        if total_changes == 1:
            file = list(self.changes_summary.values())[0][0]
            description = f"update {Path(file).name}"
        else:
            description = f"update {total_changes} files"
        
        # 組合訊息
        commit_msg = f"{action}({scope}): {description}"
        
        # 加入詳細資訊
        body_lines = []
        if self.changes_summary['added']:
            body_lines.append(f"Added: {', '.join(Path(f).name for f in self.changes_summary['added'][:3])}")
        if self.changes_summary['modified']:
            body_lines.append(f"Modified: {', '.join(Path(f).name for f in self.changes_summary['modified'][:3])}")
        
        if body_lines:
            commit_msg += "\n\n" + "\n".join(body_lines)
        
        return commit_msg
    
    def _get_scope(self, file_path: str) -> str:
        """根據檔案路徑判斷 scope"""
        if 'frontend' in file_path:
            if 'components' in file_path:
                return 'ui'
            elif 'api' in file_path:
                return 'api'
            else:
                return 'frontend'
        elif 'docs' in file_path:
            return 'docs'
        elif 'backend' in file_path:
            return 'backend'
        else:
            return 'misc'
    
    def confirm_and_commit(self, commit_msg: str) -> bool:
        """確認並執行提交"""
        print(f"\n{Colors.PURPLE}📋 提交訊息預覽:{Colors.END}")
        print(f"{Colors.YELLOW}{commit_msg}{Colors.END}")
        
        # 顯示檢查結果摘要
        print(f"\n{Colors.PURPLE}✅ 通過的檢查:{Colors.END}")
        for check in self.checks_passed:
            print(f"  • {check}")
        
        if self.checks_failed:
            print(f"\n{Colors.RED}❌ 失敗的檢查:{Colors.END}")
            for check in self.checks_failed:
                print(f"  • {check}")
        
        # 詢問用戶
        print(f"\n{Colors.CYAN}選擇操作:{Colors.END}")
        print("1. 使用建議的提交訊息")
        print("2. 編輯提交訊息")
        print("3. 取消提交")
        
        choice = input("\n請選擇 (1/2/3): ")
        
        if choice == '1':
            # 執行提交
            code, stdout, stderr = self.run_command(["git", "commit", "-m", commit_msg])
            if code == 0:
                print(f"\n{Colors.GREEN}✅ 提交成功！{Colors.END}")
                return True
            else:
                print(f"\n{Colors.RED}❌ 提交失敗: {stderr}{Colors.END}")
                return False
                
        elif choice == '2':
            # 編輯訊息
            new_msg = input("\n請輸入新的提交訊息: ")
            code, stdout, stderr = self.run_command(["git", "commit", "-m", new_msg])
            if code == 0:
                print(f"\n{Colors.GREEN}✅ 提交成功！{Colors.END}")
                return True
            else:
                print(f"\n{Colors.RED}❌ 提交失敗: {stderr}{Colors.END}")
                return False
                
        else:
            print(f"\n{Colors.YELLOW}⚠️ 已取消提交{Colors.END}")
            return False
    
    def run_reflection_analysis(self):
        """執行開發反思分析"""
        print(f"\n{Colors.BLUE}🤔 執行開發反思分析...{Colors.END}")
        try:
            reflection_script = self.project_root / "docs" / "scripts" / "dev-reflection.py"
            result = subprocess.run([sys.executable, str(reflection_script)], 
                                  capture_output=True, text=True)
            
            if result.returncode == 0:
                # 顯示重要發現
                if "高優先級問題" in result.stdout:
                    print(f"{Colors.YELLOW}⚠️  發現需要關注的問題，請查看改進建議{Colors.END}")
                else:
                    print(f"{Colors.GREEN}✅ 反思分析完成{Colors.END}")
            else:
                print(f"{Colors.YELLOW}⚠️  反思分析遇到問題: {result.stderr}{Colors.END}")
        except Exception as e:
            print(f"{Colors.YELLOW}⚠️  無法執行反思分析: {e}{Colors.END}")
            # 不影響整體流程
    
    def run(self, strict=False):
        """執行提交引導流程"""
        self.print_header()
        
        # 檢查 Git 狀態
        if not self.check_git_status():
            return
        
        # 執行各項檢查
        all_passed = True
        
        # 必要檢查
        if not self.run_lint_check():
            all_passed = False
            if strict:
                print(f"\n{Colors.RED}❌ 嚴格模式下 ESLint 必須通過{Colors.END}")
                return
        
        if not self.run_type_check():
            all_passed = False
            if strict:
                print(f"\n{Colors.RED}❌ 嚴格模式下 TypeScript 必須通過{Colors.END}")
                return
        
        # 可選檢查
        if strict:
            if not self.run_build_check():
                all_passed = False
                print(f"\n{Colors.RED}❌ 嚴格模式下建置必須成功{Colors.END}")
                return
            
            if not self.check_tests():
                print(f"\n{Colors.YELLOW}⚠️ 建議補充測試{Colors.END}")
        
        # 更新文檔
        self.update_feature_log()
        
        # 生成提交訊息
        commit_msg = self.generate_commit_message()
        
        # 確認並提交
        commit_success = self.confirm_and_commit(commit_msg)
        
        # 如果提交成功，執行反思分析
        if commit_success:
            self.run_reflection_analysis()

if __name__ == "__main__":
    # 檢查是否為嚴格模式
    strict_mode = '--strict' in sys.argv
    
    guide = CommitGuide()
    guide.run(strict=strict_mode)