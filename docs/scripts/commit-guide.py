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
        # 修正路徑：從 docs/scripts/ 往上兩層到專案根目錄
        self.project_root = Path(__file__).parent.parent.parent
        self.checks_passed = []
        self.checks_failed = []
        self.changes_summary = {}
        # 檢測是否在 CI 或非交互式環境
        self.is_ci = os.environ.get('CI', '').lower() in ('true', '1', 'yes')
        
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
        
        # 檢查是否有 frontend 目錄
        frontend_path = self.project_root / "frontend"
        if not frontend_path.exists():
            print(f"{Colors.YELLOW}⚠️ 沒有 frontend 目錄，跳過 ESLint 檢查{Colors.END}")
            return True
        
        code, stdout, stderr = self.run_command(
            ["npm", "run", "lint"],
            cwd=frontend_path
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
        
        # 檢查是否有 frontend 目錄
        frontend_path = self.project_root / "frontend"
        if not frontend_path.exists():
            print(f"{Colors.YELLOW}⚠️ 沒有 frontend 目錄，跳過 TypeScript 檢查{Colors.END}")
            return True
        
        code, stdout, stderr = self.run_command(
            ["npx", "tsc", "--noEmit"],
            cwd=frontend_path
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
        
        # 檢查是否有 frontend 目錄
        frontend_path = self.project_root / "frontend"
        if not frontend_path.exists():
            print(f"{Colors.YELLOW}⚠️ 沒有 frontend 目錄，跳過建置檢查{Colors.END}")
            return True
        
        code, stdout, stderr = self.run_command(
            ["npm", "run", "build"],
            cwd=frontend_path
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
        print(f"\n{Colors.BLUE}📝 檢查並自動補齊文檔...{Colors.END}")
        
        # 檢查今天是否有功能日誌
        today = datetime.now().strftime("%Y-%m-%d")
        feature_logs_dir = self.project_root / "docs/dev-logs"
        
        if not feature_logs_dir.exists():
            print(f"{Colors.YELLOW}⚠️ 開發日誌目錄不存在{Colors.END}")
            return True
            
        feature_logs = list(feature_logs_dir.glob(f"{today}*.yml"))
        
        # 檢查是否有代碼變更需要文檔
        has_code_changes = any(
            f.endswith(('.py', '.ts', '.tsx', '.js', '.jsx')) 
            for f in self.changes_summary['modified'] + self.changes_summary['added']
        )
        
        if not feature_logs and has_code_changes:
            print(f"{Colors.BLUE}🤖 偵測到代碼變更，將在提交後自動生成開發日誌{Colors.END}")
        elif feature_logs:
            print(f"{Colors.GREEN}✅ 找到 {len(feature_logs)} 個今日開發日誌{Colors.END}")
        else:
            print(f"{Colors.GREEN}✅ 無需額外文檔{Colors.END}")
        
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
            print(f"\n{Colors.YELLOW}💡 提示: 請修復錯誤後再提交，或使用 'make ai-fix' 獲取修復建議{Colors.END}")
            return False
        
        # 如果在 CI 環境，自動使用建議的提交訊息
        if self.is_ci:
            print(f"\n{Colors.CYAN}🤖 CI 模式：自動使用建議的提交訊息{Colors.END}")
            code, stdout, stderr = self.run_command(["git", "commit", "-m", commit_msg])
            if code == 0:
                print(f"\n{Colors.GREEN}✅ 提交成功！{Colors.END}")
                return True
            else:
                print(f"\n{Colors.RED}❌ 提交失敗: {stderr}{Colors.END}")
                return False
        
        # 檢查是否在交互式環境
        try:
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
                
        except (EOFError, KeyboardInterrupt):
            # 非交互式環境或用戶中斷
            print(f"\n{Colors.YELLOW}⚠️ 非交互式環境，自動使用建議的提交訊息{Colors.END}")
            code, stdout, stderr = self.run_command(["git", "commit", "-m", commit_msg])
            if code == 0:
                print(f"\n{Colors.GREEN}✅ 提交成功！{Colors.END}")
                return True
            else:
                print(f"\n{Colors.RED}❌ 提交失敗: {stderr}{Colors.END}")
                return False
    
    def run_reflection_analysis(self):
        """執行開發反思分析"""
        print(f"\n{Colors.BLUE}🤔 執行開發反思分析...{Colors.END}")
        try:
            # 修正路徑問題
            reflection_script = Path(__file__).parent / "dev-reflection.py"
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
    
    def check_one_time_scripts(self):
        """檢查是否有應該清理的一次性腳本"""
        scripts_dir = Path(__file__).parent
        one_time_patterns = [
            r'rename.*legacy',
            r'emergency.*fix',
            r'temp.*fix',
            r'cleanup.*\w+',
            r'migrate.*\w+',
            r'convert.*\w+'
        ]
        
        import re
        potential_cleanup = []
        
        for script_file in scripts_dir.glob("*.py"):
            # 跳過核心腳本
            if script_file.name in ['commit-guide.py', 'post-commit-doc-gen.py', 'dev-reflection.py', 'analytics.py', 'smart-commit-analyzer.py', 'auto-improve.py']:
                continue
                
            script_name = script_file.name.lower()
            for pattern in one_time_patterns:
                if re.search(pattern, script_name):
                    potential_cleanup.append(script_file.name)
                    break
        
        if potential_cleanup:
            print(f"\n{Colors.YELLOW}⚠️  發現可能需要清理的一次性腳本：{Colors.END}")
            for script in potential_cleanup:
                print(f"   - {script}")
            print(f"   💡 提示：根據 ADR-009，確認任務完成後請刪除這些腳本")

    def run_post_commit_doc_gen(self):
        """執行 post-commit 文檔生成"""
        print(f"\n{Colors.BLUE}📝 生成開發文檔...{Colors.END}")
        try:
            doc_gen_script = Path(__file__).parent / "post-commit-doc-gen.py"
            result = subprocess.run([sys.executable, str(doc_gen_script)], 
                                  capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"{Colors.GREEN}✅ 文檔生成完成{Colors.END}")
                # 顯示生成的文件
                if "已生成開發日誌:" in result.stdout:
                    for line in result.stdout.split('\n'):
                        if "已生成" in line:
                            print(f"   {line.strip()}")
            else:
                print(f"{Colors.YELLOW}⚠️  文檔生成遇到問題: {result.stderr}{Colors.END}")
        except Exception as e:
            print(f"{Colors.YELLOW}⚠️  無法生成文檔: {e}{Colors.END}")
    
    def run_post_commit_tasks(self):
        """執行所有 post-commit 任務"""
        # 1. 生成文檔
        self.run_post_commit_doc_gen()
        
        # 2. 執行反思分析
        self.run_reflection_analysis()
    
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
        
        # 檢查一次性腳本
        self.check_one_time_scripts()
        
        # 更新文檔
        self.update_feature_log()
        
        # 生成提交訊息
        commit_msg = self.generate_commit_message()
        
        # 確認並提交
        commit_success = self.confirm_and_commit(commit_msg)
        
        # 如果提交成功，執行後續分析
        if commit_success:
            self.run_post_commit_tasks()

if __name__ == "__main__":
    # 檢查是否為嚴格模式
    strict_mode = '--strict' in sys.argv
    
    guide = CommitGuide()
    guide.run(strict=strict_mode)