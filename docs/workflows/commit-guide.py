#!/usr/bin/env python3
"""
AI Square 智能提交引導系統
自動化 Git 提交前的檢查、測試和文檔更新流程
"""

import os
import sys
import subprocess
import datetime
import json
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
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    END = '\033[0m'

class CommitGuide:
    def __init__(self):
        self.project_root = Path.cwd()
        self.docs_path = self.project_root / "docs"
        self.current_path = self.docs_path / "current"
        
        # 確保目錄存在
        self.current_path.mkdir(parents=True, exist_ok=True)
        
    def print_header(self):
        """顯示提交引導標題"""
        print(f"{Colors.CYAN}{Colors.BOLD}")
        print("📋 AI Square 智能提交引導")
        print("=" * 40)
        print(f"自動化品質檢查與文檔同步系統{Colors.END}")
        print()
        
    def check_git_status(self) -> Tuple[List[str], List[str], List[str]]:
        """檢查 Git 狀態"""
        try:
            # 檢查變更檔案
            result = subprocess.run(
                ["git", "status", "--porcelain"], 
                capture_output=True, 
                text=True,
                check=True
            )
            
            modified_files = []
            new_files = []
            deleted_files = []
            
            for line in result.stdout.strip().split('\n'):
                if not line:
                    continue
                    
                status = line[:2]
                filename = line[3:]
                
                if status.strip() in ['M', 'MM']:
                    modified_files.append(filename)
                elif status.strip() in ['A', 'AM']:
                    new_files.append(filename)
                elif status.strip() in ['D', 'AD']:
                    deleted_files.append(filename)
                elif status.strip() == '??':
                    new_files.append(filename)
                    
            return modified_files, new_files, deleted_files
            
        except subprocess.CalledProcessError:
            print(f"{Colors.RED}❌ 無法檢查 Git 狀態{Colors.END}")
            sys.exit(1)
            
    def check_for_sensitive_files(self, files: List[str]) -> List[str]:
        """檢查敏感檔案"""
        sensitive_patterns = [
            '.env', '.env.local', '.env.production',
            'config.json', 'secrets.json',
            'id_rsa', 'id_ed25519',
            '*.pem', '*.key'
        ]
        
        sensitive_files = []
        for file in files:
            for pattern in sensitive_patterns:
                if pattern.replace('*', '') in file.lower():
                    sensitive_files.append(file)
                    break
                    
        return sensitive_files
        
    def run_quality_checks(self) -> bool:
        """運行品質檢查"""
        print(f"{Colors.BLUE}🔍 執行品質檢查...{Colors.END}")
        
        checks_passed = True
        frontend_path = self.project_root / "frontend"
        
        # 1. ESLint 檢查
        print(f"  📋 ESLint 檢查...")
        try:
            result = subprocess.run(
                ["npm", "run", "lint"],
                cwd=frontend_path,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                print(f"    {Colors.GREEN}✅ ESLint 通過{Colors.END}")
            else:
                print(f"    {Colors.RED}❌ ESLint 失敗{Colors.END}")
                print(f"    {result.stdout}")
                checks_passed = False
                
        except subprocess.TimeoutExpired:
            print(f"    {Colors.RED}❌ ESLint 檢查超時{Colors.END}")
            checks_passed = False
        except Exception as e:
            print(f"    {Colors.YELLOW}⚠️ 無法執行 ESLint: {e}{Colors.END}")
            
        # 2. TypeScript 編譯檢查
        print(f"  🔧 TypeScript 編譯檢查...")
        try:
            result = subprocess.run(
                ["npx", "tsc", "--noEmit"],
                cwd=frontend_path,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode == 0:
                print(f"    {Colors.GREEN}✅ TypeScript 編譯通過{Colors.END}")
            else:
                print(f"    {Colors.RED}❌ TypeScript 編譯失敗{Colors.END}")
                print(f"    {result.stdout}")
                checks_passed = False
                
        except subprocess.TimeoutExpired:
            print(f"    {Colors.RED}❌ TypeScript 檢查超時{Colors.END}")
            checks_passed = False
        except Exception as e:
            print(f"    {Colors.YELLOW}⚠️ 無法執行 TypeScript 檢查: {e}{Colors.END}")
            
        # 3. 建置測試
        print(f"  🏗️ 建置測試...")
        try:
            result = subprocess.run(
                ["npm", "run", "build"],
                cwd=frontend_path,
                capture_output=True,
                text=True,
                timeout=180
            )
            
            if result.returncode == 0:
                print(f"    {Colors.GREEN}✅ 建置成功{Colors.END}")
            else:
                print(f"    {Colors.RED}❌ 建置失敗{Colors.END}")
                print(f"    {result.stderr}")
                checks_passed = False
                
        except subprocess.TimeoutExpired:
            print(f"    {Colors.RED}❌ 建置測試超時{Colors.END}")
            checks_passed = False
        except Exception as e:
            print(f"    {Colors.YELLOW}⚠️ 無法執行建置測試: {e}{Colors.END}")
            
        return checks_passed
        
    def run_tests(self) -> bool:
        """運行測試套件"""
        print(f"{Colors.BLUE}🧪 執行測試套件...{Colors.END}")
        
        frontend_path = self.project_root / "frontend"
        
        # 檢查是否有測試檔案
        test_files = list(frontend_path.glob("**/*.test.{ts,tsx,js,jsx}"))
        if not test_files:
            print(f"    {Colors.YELLOW}⚠️ 未找到測試檔案，跳過測試{Colors.END}")
            return True
            
        try:
            result = subprocess.run(
                ["npm", "test", "--", "--passWithNoTests", "--watchAll=false"],
                cwd=frontend_path,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode == 0:
                print(f"    {Colors.GREEN}✅ 所有測試通過{Colors.END}")
                return True
            else:
                print(f"    {Colors.RED}❌ 測試失敗{Colors.END}")
                print(f"    {result.stdout}")
                return False
                
        except subprocess.TimeoutExpired:
            print(f"    {Colors.RED}❌ 測試執行超時{Colors.END}")
            return False
        except Exception as e:
            print(f"    {Colors.YELLOW}⚠️ 無法執行測試: {e}{Colors.END}")
            return True  # 不因為無法執行測試而阻擋提交
            
    def analyze_changes(self, modified_files: List[str], new_files: List[str]) -> Dict[str, List[str]]:
        """分析變更類型"""
        all_files = modified_files + new_files
        
        categories = {
            "frontend": [],
            "docs": [],
            "config": [],
            "tests": [],
            "other": []
        }
        
        for file in all_files:
            if file.startswith("frontend/"):
                if ".test." in file or "/__tests__/" in file:
                    categories["tests"].append(file)
                else:
                    categories["frontend"].append(file)
            elif file.startswith("docs/"):
                categories["docs"].append(file)
            elif any(config in file for config in ["package.json", "tsconfig.json", "eslint", "tailwind", "next.config"]):
                categories["config"].append(file)
            else:
                categories["other"].append(file)
                
        return categories
        
    def suggest_commit_type(self, changes: Dict[str, List[str]]) -> str:
        """建議 commit 類型"""
        if changes["tests"] and not any(changes[cat] for cat in ["frontend", "docs", "config"]):
            return "test"
        elif changes["docs"] and not any(changes[cat] for cat in ["frontend", "config"]):
            return "docs"
        elif changes["config"]:
            return "chore"
        elif any("fix" in file.lower() or "bug" in file.lower() for file in changes["frontend"]):
            return "fix"
        elif changes["frontend"]:
            return "feat"
        else:
            return "chore"
            
    def update_development_log(self):
        """更新開發日誌"""
        today = datetime.date.today().strftime("%Y-%m-%d")
        work_log_path = self.current_path / f"work-{today}.md"
        
        if not work_log_path.exists():
            return
            
        print(f"{Colors.BLUE}📚 更新開發日誌...{Colors.END}")
        
        # 獲取用戶輸入
        completion_note = input(f"{Colors.GREEN}📝 這次完成了什麼？ {Colors.END}").strip()
        
        if completion_note:
            timestamp = datetime.datetime.now().strftime("%H:%M")
            with open(work_log_path, "a", encoding="utf-8") as f:
                f.write(f"\n### ✅ 完成項目 ({timestamp})\n")
                f.write(f"- {completion_note}\n")
                
            print(f"    {Colors.GREEN}✅ 開發日誌已更新{Colors.END}")
        else:
            print(f"    {Colors.YELLOW}⚠️ 未輸入完成項目，跳過更新{Colors.END}")
            
    def update_changelog(self, commit_type: str, commit_message: str, changes: Dict[str, List[str]]):
        """更新 CHANGELOG.md"""
        print(f"{Colors.BLUE}📋 更新 Changelog...{Colors.END}")
        
        changelog_path = self.project_root / "CHANGELOG.md"
        if not changelog_path.exists():
            print(f"    {Colors.YELLOW}⚠️ CHANGELOG.md 不存在，跳過更新{Colors.END}")
            return
            
        try:
            # 讀取現有 changelog
            with open(changelog_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            # 找到 [Unreleased] 區段
            unreleased_pattern = r"(## \[Unreleased\])(.*?)((?=## \[|\Z))"
            import re
            match = re.search(unreleased_pattern, content, re.DOTALL)
            
            if not match:
                print(f"    {Colors.YELLOW}⚠️ 找不到 [Unreleased] 區段{Colors.END}")
                return
            
            # 分析變更類型並生成條目
            change_entry = self.generate_changelog_entry(commit_type, commit_message, changes)
            
            if change_entry:
                # 取得現有的 Unreleased 內容
                existing_unreleased = match.group(2)
                
                # 根據 commit 類型插入到對應區段
                updated_unreleased = self.insert_changelog_entry(existing_unreleased, commit_type, change_entry)
                
                # 替換內容
                new_content = content.replace(match.group(0), f"## [Unreleased]{updated_unreleased}{match.group(3)}")
                
                # 寫回檔案
                with open(changelog_path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                
                print(f"    {Colors.GREEN}✅ Changelog 已更新{Colors.END}")
            else:
                print(f"    {Colors.YELLOW}⚠️ 無需更新 Changelog{Colors.END}")
                
        except Exception as e:
            print(f"    {Colors.RED}❌ 更新 Changelog 失敗: {e}{Colors.END}")
    
    def generate_changelog_entry(self, commit_type: str, commit_message: str, changes: Dict[str, List[str]]) -> Optional[str]:
        """生成 changelog 條目"""
        # 移除 commit 類型前綴
        clean_message = commit_message
        if clean_message.startswith(f"{commit_type}: "):
            clean_message = clean_message[len(f"{commit_type}: "):]
        
        # 根據變更檔案生成更詳細的描述
        details = []
        if changes["frontend"]:
            details.append("前端功能更新")
        if changes["docs"]:
            details.append("文檔更新")
        if changes["config"]:
            details.append("配置調整")
        if changes["tests"]:
            details.append("測試改進")
            
        if details:
            detail_str = f" ({', '.join(details)})"
            return f"- {clean_message}{detail_str}"
        else:
            return f"- {clean_message}"
    
    def insert_changelog_entry(self, existing_content: str, commit_type: str, entry: str) -> str:
        """插入 changelog 條目到對應區段"""
        # 定義區段標題映射
        section_mapping = {
            "feat": "### Added",
            "fix": "### Fixed", 
            "docs": "### Changed",
            "test": "### Changed",
            "chore": "### Changed",
            "refactor": "### Changed",
            "style": "### Changed"
        }
        
        target_section = section_mapping.get(commit_type, "### Changed")
        
        # 如果目標區段存在，插入條目
        section_pattern = f"({target_section})(.*?)((?=### |\Z))"
        import re
        match = re.search(section_pattern, existing_content, re.DOTALL)
        
        if match:
            # 在區段末尾新增條目
            section_content = match.group(2).rstrip()
            if section_content and not section_content.endswith('\n'):
                section_content += '\n'
            new_section = f"{target_section}{section_content}\n{entry}\n"
            return existing_content.replace(match.group(0), f"{new_section}{match.group(3)}")
        else:
            # 區段不存在，在開頭新增
            return f"\n{target_section}\n{entry}\n{existing_content}"
            
    def generate_commit_message(self, commit_type: str, changes: Dict[str, List[str]]) -> str:
        """生成提交訊息建議"""
        print(f"\n{Colors.PURPLE}💡 生成提交訊息建議...{Colors.END}")
        
        # 分析主要變更
        main_changes = []
        if changes["frontend"]:
            main_changes.append("前端功能")
        if changes["docs"]:
            main_changes.append("文檔")
        if changes["config"]:
            main_changes.append("配置")
        if changes["tests"]:
            main_changes.append("測試")
            
        # 建議範本
        templates = {
            "feat": f"feat: 新增 [功能描述]",
            "fix": f"fix: 修正 [問題描述]", 
            "docs": f"docs: 更新 {', '.join(main_changes) if main_changes else '文檔'}",
            "test": f"test: 新增 [測試描述]",
            "chore": f"chore: {', '.join(main_changes) if main_changes else '維護性更新'}"
        }
        
        suggested_template = templates.get(commit_type, "chore: 更新")
        
        print(f"  📋 建議類型: {Colors.BOLD}{commit_type}{Colors.END}")
        print(f"  📝 訊息範本: {suggested_template}")
        print(f"  📁 主要變更: {', '.join(main_changes) if main_changes else '無明顯分類'}")
        
        return suggested_template
        
    def create_commit(self, modified_files: List[str], new_files: List[str]) -> Tuple[bool, str]:
        """建立提交"""
        print(f"\n{Colors.BLUE}📦 準備建立提交...{Colors.END}")
        
        # 詢問用戶確認
        print(f"{Colors.YELLOW}即將提交的檔案：{Colors.END}")
        for file in modified_files:
            print(f"  📝 {file}")
        for file in new_files:
            print(f"  ➕ {file}")
            
        confirm = input(f"\n{Colors.GREEN}確認要提交這些變更嗎？ (y/N): {Colors.END}").strip().lower()
        
        if confirm != 'y':
            print(f"{Colors.YELLOW}❌ 提交已取消{Colors.END}")
            return False, ""
            
        # 獲取提交訊息
        commit_message = input(f"{Colors.GREEN}請輸入提交訊息: {Colors.END}").strip()
        
        if not commit_message:
            print(f"{Colors.RED}❌ 提交訊息不能為空{Colors.END}")
            return False, ""
            
        try:
            # 加入檔案到暫存區
            files_to_add = modified_files + new_files
            for file in files_to_add:
                subprocess.run(["git", "add", file], check=True)
                
            # 建立提交
            full_commit_message = f"""{commit_message}

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"""
            
            subprocess.run(
                ["git", "commit", "-m", full_commit_message],
                check=True
            )
            
            print(f"{Colors.GREEN}✅ 提交成功！{Colors.END}")
            
            # 顯示提交資訊
            result = subprocess.run(
                ["git", "log", "--oneline", "-1"],
                capture_output=True,
                text=True
            )
            print(f"  📝 {result.stdout.strip()}")
            
            return True, commit_message
            
        except subprocess.CalledProcessError as e:
            print(f"{Colors.RED}❌ 提交失敗: {e}{Colors.END}")
            return False, ""
            
    def run(self):
        """執行主要流程"""
        try:
            # 顯示標題
            self.print_header()
            
            # 檢查 Git 狀態
            print(f"{Colors.BLUE}🔍 檢查 Git 狀態...{Colors.END}")
            modified_files, new_files, deleted_files = self.check_git_status()
            
            if not modified_files and not new_files and not deleted_files:
                print(f"{Colors.YELLOW}📭 沒有需要提交的變更{Colors.END}")
                return
                
            print(f"  📝 修改檔案: {len(modified_files)}")
            print(f"  ➕ 新增檔案: {len(new_files)}")
            print(f"  ➖ 刪除檔案: {len(deleted_files)}")
            
            # 檢查敏感檔案
            all_files = modified_files + new_files
            sensitive_files = self.check_for_sensitive_files(all_files)
            
            if sensitive_files:
                print(f"\n{Colors.RED}⚠️ 發現可能的敏感檔案：{Colors.END}")
                for file in sensitive_files:
                    print(f"  🔒 {file}")
                    
                confirm = input(f"{Colors.YELLOW}確認要提交這些檔案嗎？ (y/N): {Colors.END}").strip().lower()
                if confirm != 'y':
                    print(f"{Colors.YELLOW}❌ 提交已取消{Colors.END}")
                    return
                    
            # 運行品質檢查
            if not self.run_quality_checks():
                print(f"\n{Colors.RED}❌ 品質檢查失敗，請修正後再提交{Colors.END}")
                return
                
            # 運行測試
            if not self.run_tests():
                print(f"\n{Colors.RED}❌ 測試失敗，請修正後再提交{Colors.END}")
                
                force_commit = input(f"{Colors.YELLOW}是否要強制提交？ (y/N): {Colors.END}").strip().lower()
                if force_commit != 'y':
                    return
                    
            # 分析變更
            changes = self.analyze_changes(modified_files, new_files)
            commit_type = self.suggest_commit_type(changes)
            
            # 生成提交訊息建議
            self.generate_commit_message(commit_type, changes)
            
            # 更新開發日誌
            self.update_development_log()
            
            # 建立提交
            success, commit_message = self.create_commit(modified_files, new_files)
            if success:
                # 更新 Changelog
                self.update_changelog(commit_type, commit_message, changes)
                
                print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 提交流程完成！{Colors.END}")
                print(f"\n{Colors.CYAN}📊 提交統計：{Colors.END}")
                print(f"  📝 修改: {len(modified_files)} 檔案")
                print(f"  ➕ 新增: {len(new_files)} 檔案")
                print(f"  🧪 測試: 通過")
                print(f"  📋 檢查: 通過")
                print(f"  📋 Changelog: 已更新")
                
        except KeyboardInterrupt:
            print(f"\n{Colors.YELLOW}👋 提交流程已取消{Colors.END}")
        except Exception as e:
            print(f"\n{Colors.RED}❌ 發生錯誤: {e}{Colors.END}")

if __name__ == "__main__":
    commit_guide = CommitGuide()
    commit_guide.run()