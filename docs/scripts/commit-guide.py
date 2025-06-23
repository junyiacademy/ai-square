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
        # 時間追蹤相關
        self.time_metrics = None
        
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
    
    def get_time_metrics(self) -> Dict:
        """基於 ADR-016 的 commit-based 時間分析"""
        print(f"\n{Colors.BLUE}⏱️ 計算開發時間 (基於 Commit 邊界分析)...{Colors.END}")
        
        try:
            # 嘗試從時間追蹤系統獲取真實時間（優先，但不依賴）
            time_tracker_path = self.project_root / "docs" / "scripts" / "time-tracker.py"
            if time_tracker_path.exists():
                import importlib.util
                spec = importlib.util.spec_from_file_location("time_tracker", time_tracker_path)
                time_tracker = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(time_tracker)
                
                # 嘗試獲取全域 tracker
                tracker = time_tracker.get_tracker()
                if tracker.session_start:
                    # 有活躍的時間追蹤會話
                    metrics = tracker.calculate_metrics()
                    if metrics.get('total_time_minutes', 0) > 0.5:  # 過濾測試數據
                        print(f"✅ 發現活躍時間追蹤會話")
                        print(f"   總時間: {metrics['total_time_minutes']:.1f} 分鐘")
                        print(f"   AI 時間: {metrics['ai_time_minutes']:.1f} 分鐘")
                        print(f"   Human 時間: {metrics['human_time_minutes']:.1f} 分鐘")
                        return metrics
                    
        except Exception as e:
            print(f"⚠️ 無法讀取即時時間追蹤: {e}")
        
        # 使用 ADR-016 的 commit-based 分析方法
        print(f"📊 使用 Commit 邊界時間分析")
        
        try:
            # 1. 獲取這次 commit 的檔案列表 (staged files)
            returncode, stdout, _ = self.run_command(["git", "diff", "--cached", "--name-only"])
            if returncode != 0 or not stdout.strip():
                print(f"⚠️ 無法獲取 staged 檔案")
                return self._fallback_estimation()
            
            staged_files = [f.strip() for f in stdout.strip().split('\n') if f.strip()]
            print(f"   分析檔案: {len(staged_files)} 個")
            
            # 2. 獲取每個檔案的修改時間戳
            file_timestamps = []
            for file_path in staged_files:
                file_full_path = self.project_root / file_path
                if file_full_path.exists():
                    mtime = datetime.fromtimestamp(file_full_path.stat().st_mtime)
                    file_timestamps.append({
                        'file': file_path,
                        'timestamp': mtime
                    })
            
            if not file_timestamps:
                print(f"⚠️ 無法獲取檔案時間戳")
                return self._fallback_estimation()
            
            # 3. 計算時間範圍
            start_time = min(ts['timestamp'] for ts in file_timestamps)
            end_time = max(ts['timestamp'] for ts in file_timestamps)
            duration_minutes = (end_time - start_time).total_seconds() / 60
            
            # 4. 檢查上個 commit 時間作為參考
            returncode, stdout, _ = self.run_command(["git", "log", "-1", "--pretty=%ct"])
            if returncode == 0 and stdout.strip():
                last_commit_time = datetime.fromtimestamp(int(stdout.strip()))
                # 如果檔案時間範圍很小，使用 commit 間隔時間
                if duration_minutes < 1:
                    commit_interval = (datetime.now() - last_commit_time).total_seconds() / 60
                    if commit_interval > 0 and commit_interval < 180:  # 最多 3 小時
                        duration_minutes = commit_interval
                        print(f"   使用 commit 間隔時間: {duration_minutes:.1f} 分鐘")
                    else:
                        duration_minutes = max(duration_minutes, 2)  # 最少 2 分鐘
                else:
                    print(f"   基於檔案時間戳: {duration_minutes:.1f} 分鐘")
            
            # 5. 驗證合理性
            if duration_minutes > 180:  # 超過 3 小時
                print(f"⚠️ 時間過長 ({duration_minutes:.1f}分鐘)，使用檔案數量估算")
                return self._fallback_estimation()
            
            if duration_minutes < 0.5:  # 少於 30 秒
                duration_minutes = len(staged_files) * 2  # 每個檔案 2 分鐘
                print(f"   調整為檔案數量估算: {duration_minutes:.1f} 分鐘")
            
            print(f"✅ Commit 時間分析完成")
            print(f"   開發時間: {duration_minutes:.1f} 分鐘")
            print(f"   時間範圍: {start_time.strftime('%H:%M:%S')} → {end_time.strftime('%H:%M:%S')}")
            
            return {
                'total_time_minutes': round(duration_minutes, 1),
                'ai_time_minutes': round(duration_minutes * 0.8, 1),
                'human_time_minutes': round(duration_minutes * 0.2, 1),
                'time_estimation_method': 'commit_based_file_timestamp_analysis',
                'is_real_time': False,
                'data_quality': 'high',
                'confidence_level': 'high',
                'evidence': {
                    'file_timestamps': file_timestamps,
                    'start_time': start_time.isoformat(),
                    'end_time': end_time.isoformat()
                }
            }
            
        except Exception as e:
            print(f"⚠️ Commit 分析失敗: {e}")
            return self._fallback_estimation()
    
    def _fallback_estimation(self) -> Dict:
        """後備估算方法"""
        print(f"⚠️ 使用檔案變更數量估算")
        
        # 獲取變更統計
        returncode, stdout, _ = self.run_command(["git", "diff", "--cached", "--numstat"])
        if returncode == 0:
            lines = stdout.strip().split('\n')
            total_changes = len([line for line in lines if line.strip()])
        else:
            total_changes = 1
        
        # 簡單估算邏輯
        if total_changes <= 1:
            estimated_time = 5
        elif total_changes <= 3:
            estimated_time = 15
        elif total_changes <= 10:
            estimated_time = 30
        else:
            estimated_time = 60
            
        return {
            'total_time_minutes': estimated_time,
            'ai_time_minutes': int(estimated_time * 0.8),
            'human_time_minutes': int(estimated_time * 0.2),
            'time_estimation_method': 'file_count_estimate',
            'is_real_time': False,
            'data_quality': 'estimated',
            'confidence_level': 'medium'
        }
    
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
    
    def run_test_check(self) -> bool:
        """執行測試套件"""
        print(f"\n{Colors.BLUE}🧪 執行測試...{Colors.END}")
        
        # 檢查是否有 frontend 目錄
        frontend_path = self.project_root / "frontend"
        if not frontend_path.exists():
            print(f"{Colors.YELLOW}⚠️ 沒有 frontend 目錄，跳過測試{Colors.END}")
            return True
        
        # 執行 Jest 測試 (CI 模式，不使用 watch)
        code, stdout, stderr = self.run_command(
            ["npm", "run", "test:ci"],
            cwd=frontend_path
        )
        
        if code == 0:
            self.checks_passed.append("Tests")
            print(f"{Colors.GREEN}✅ 測試通過{Colors.END}")
            return True
        else:
            self.checks_failed.append("Tests")
            print(f"{Colors.RED}❌ 測試失敗{Colors.END}")
            if stderr:
                print(f"{Colors.YELLOW}錯誤詳情:\n{stderr}{Colors.END}")
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
        
        # 分析變更內容以產生有意義的描述
        all_files = (self.changes_summary['added'] + 
                    self.changes_summary['modified'] + 
                    self.changes_summary['deleted'])
        
        # 檢測主要變更類型
        primary_action = ""
        primary_scope = ""
        description = ""
        
        # 特殊檔案模式識別
        if any('migrate' in f for f in all_files):
            if any('dev-logs' in f for f in all_files):
                primary_action = "refactor"
                primary_scope = "dev-logs"
                description = "migrate dev logs with accurate time calculation and clear filenames"
            else:
                primary_action = "refactor"
                primary_scope = "migration"
                description = "migrate files"
        
        elif any('time' in f and ('tracker' in f or 'tracking' in f or 'calculation' in f) for f in all_files):
            primary_action = "fix" if self.changes_summary['modified'] else "feat"
            primary_scope = "time-tracking"
            description = "improve time tracking accuracy"
        
        elif any('pre-commit' in f or 'post-commit' in f for f in all_files):
            primary_action = "feat"
            primary_scope = "docs"
            description = "implement pre-commit and post-commit documentation generation"
        
        elif any('commit-guide' in f for f in all_files):
            primary_action = "improve"
            primary_scope = "commit"
            description = "enhance commit message generation"
        
        elif any('test' in f for f in all_files):
            primary_action = "test"
            primary_scope = "test"
            description = "add tests"
        
        # 檢查檔案內容模式
        elif len(self.changes_summary['added']) > 10:
            # 大量新增檔案
            primary_action = "feat"
            primary_scope = self._detect_common_scope(self.changes_summary['added'])
            description = f"add {len(self.changes_summary['added'])} new files"
        
        elif len(self.changes_summary['deleted']) > 5:
            # 大量刪除檔案
            primary_action = "chore"
            primary_scope = "cleanup"
            description = f"remove {len(self.changes_summary['deleted'])} obsolete files"
        
        # 預設情況：基於檔案分析
        else:
            # 分析主要變更
            if self.changes_summary['added']:
                primary_action = "feat"
                first_added = self.changes_summary['added'][0]
                primary_scope = self._get_scope(first_added)
                
                # 根據檔案名稱生成描述
                filename = Path(first_added).stem
                if 'config' in filename:
                    description = "add configuration"
                elif 'component' in filename:
                    description = f"add {filename} component"
                elif 'script' in filename:
                    description = f"add {filename} script"
                elif 'doc' in filename or 'log' in filename:
                    description = "add documentation"
                else:
                    description = f"add {filename}"
                    
            elif self.changes_summary['modified']:
                # 檢查是否是修復
                modified_files = self.changes_summary['modified']
                if any('fix' in f or 'bug' in f for f in modified_files):
                    primary_action = "fix"
                    description = "fix bugs"
                elif any('improve' in f or 'enhance' in f or 'optimize' in f for f in modified_files):
                    primary_action = "improve"
                    description = "enhance functionality"
                else:
                    primary_action = "refactor"
                    description = "refactor code"
                
                primary_scope = self._get_scope(modified_files[0])
                
            else:
                primary_action = "chore"
                primary_scope = "misc"
                description = "cleanup"
        
        # 組合訊息
        commit_msg = f"{primary_action}({primary_scope}): {description}"
        
        # 加入詳細資訊（如果需要）
        body_lines = []
        
        # 只在有多個檔案時才加入檔案列表
        total_changes = sum(len(v) for v in self.changes_summary.values())
        if total_changes > 3:
            if self.changes_summary['added'] and len(self.changes_summary['added']) > 1:
                body_lines.append(f"\nAdded {len(self.changes_summary['added'])} files:")
                for f in self.changes_summary['added'][:5]:
                    body_lines.append(f"  - {Path(f).name}")
                if len(self.changes_summary['added']) > 5:
                    body_lines.append(f"  ... and {len(self.changes_summary['added']) - 5} more")
                    
            if self.changes_summary['modified'] and len(self.changes_summary['modified']) > 1:
                body_lines.append(f"\nModified {len(self.changes_summary['modified'])} files:")
                for f in self.changes_summary['modified'][:5]:
                    body_lines.append(f"  - {Path(f).name}")
                if len(self.changes_summary['modified']) > 5:
                    body_lines.append(f"  ... and {len(self.changes_summary['modified']) - 5} more")
        
        if body_lines:
            commit_msg += "\n" + "\n".join(body_lines)
        
        return commit_msg
    
    def _detect_common_scope(self, files: List[str]) -> str:
        """檢測檔案的共同 scope"""
        scopes = [self._get_scope(f) for f in files]
        # 找出最常見的 scope
        from collections import Counter
        scope_counts = Counter(scopes)
        return scope_counts.most_common(1)[0][0] if scope_counts else "misc"
    
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

    def run_pre_commit_doc_gen(self):
        """執行 pre-commit 文檔生成"""
        print(f"\n{Colors.BLUE}📝 生成開發文檔 (Pre-commit)...{Colors.END}")
        try:
            doc_gen_script = Path(__file__).parent / "pre-commit-doc-gen.py"
            result = subprocess.run([sys.executable, str(doc_gen_script)], 
                                  capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"{Colors.GREEN}✅ Pre-commit 文檔生成完成{Colors.END}")
                # 顯示生成的文件
                if "已生成 pre-commit 開發日誌:" in result.stdout:
                    for line in result.stdout.split('\n'):
                        if "已生成" in line or "✅" in line:
                            print(f"   {line.strip()}")
            else:
                print(f"{Colors.YELLOW}⚠️  Pre-commit 文檔生成遇到問題: {result.stderr}{Colors.END}")
        except Exception as e:
            print(f"{Colors.YELLOW}⚠️  無法生成 pre-commit 文檔: {e}{Colors.END}")
    
    def run_post_commit_doc_gen(self):
        """執行 post-commit 文檔生成"""
        print(f"\n{Colors.BLUE}📝 更新開發文檔 (Post-commit)...{Colors.END}")
        try:
            doc_gen_script = Path(__file__).parent / "post-commit-doc-gen.py"
            result = subprocess.run([sys.executable, str(doc_gen_script)], 
                                  capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"{Colors.GREEN}✅ Post-commit 文檔更新完成{Colors.END}")
                # 顯示生成的文件
                if "已更新" in result.stdout or "已生成" in result.stdout:
                    for line in result.stdout.split('\n'):
                        if "已更新" in line or "已生成" in line:
                            print(f"   {line.strip()}")
            else:
                print(f"{Colors.YELLOW}⚠️  Post-commit 文檔更新遇到問題: {result.stderr}{Colors.END}")
        except Exception as e:
            print(f"{Colors.YELLOW}⚠️  無法更新文檔: {e}{Colors.END}")
    
    def run_post_commit_tasks(self):
        """執行所有 post-commit 任務"""
        # 1. 生成文檔
        self.run_post_commit_doc_gen()
        
        # 2. 執行反思分析
        self.run_reflection_analysis()
    
    def run(self, strict=False):
        """執行提交引導流程"""
        self.print_header()
        print(f"\n{Colors.YELLOW}[步驟 1/8] 初始化...{Colors.END}")
        
        # 檢查 Git 狀態
        print(f"\n{Colors.YELLOW}[步驟 2/8] 檢查 Git 狀態...{Colors.END}")
        if not self.check_git_status():
            return
        
        # 執行各項檢查
        print(f"\n{Colors.YELLOW}[步驟 3/8] 執行程式碼檢查...{Colors.END}")
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
        
        # 執行測試
        if not self.run_test_check():
            all_passed = False
            print(f"\n{Colors.RED}❌ 測試失敗，請修正後再提交{Colors.END}")
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
        print(f"\n{Colors.YELLOW}[步驟 4/8] 檢查一次性腳本...{Colors.END}")
        self.check_one_time_scripts()
        
        # 計算時間指標
        print(f"\n{Colors.YELLOW}[步驟 5/8] 計算開發時間...{Colors.END}")
        self.time_metrics = self.get_time_metrics()
        
        # 更新文檔
        self.update_feature_log()
        
        # 生成 pre-commit 文檔（在 commit 前生成，包含在 commit 中）
        print(f"\n{Colors.YELLOW}[步驟 6/8] 生成 Pre-commit 文檔...{Colors.END}")
        self.run_pre_commit_doc_gen()
        
        # 生成提交訊息
        print(f"\n{Colors.YELLOW}[步驟 7/8] 生成提交訊息...{Colors.END}")
        commit_msg = self.generate_commit_message()
        
        # 確認並提交
        print(f"\n{Colors.YELLOW}[步驟 8/8] 確認並提交...{Colors.END}")
        commit_success = self.confirm_and_commit(commit_msg)
        
        # 如果提交成功，執行後續分析
        if commit_success:
            print(f"\n{Colors.YELLOW}[Post-commit] 執行後續任務...{Colors.END}")
            # 保存時間指標供 post-commit 使用
            if self.time_metrics:
                self.save_time_metrics_for_post_commit()
            self.run_post_commit_tasks()
    
    def save_time_metrics_for_post_commit(self):
        """保存時間指標供 post-commit-doc-gen.py 使用"""
        try:
            time_data_file = self.project_root / ".git" / "last_commit_time_metrics.json"
            
            # 處理 datetime 序列化問題 - 遞歸處理嵌套結構
            def make_serializable(obj):
                if isinstance(obj, datetime):
                    return obj.isoformat()
                elif isinstance(obj, dict):
                    return {k: make_serializable(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [make_serializable(item) for item in obj]
                else:
                    return obj
            
            serializable_metrics = make_serializable(self.time_metrics)
            
            with open(time_data_file, 'w', encoding='utf-8') as f:
                json.dump(serializable_metrics, f, indent=2, ensure_ascii=False)
            print(f"{Colors.GREEN}📊 時間指標已保存供文檔生成使用{Colors.END}")
        except Exception as e:
            print(f"{Colors.YELLOW}⚠️ 無法保存時間指標: {e}{Colors.END}")

if __name__ == "__main__":
    # 檢查是否為嚴格模式
    strict_mode = '--strict' in sys.argv
    
    guide = CommitGuide()
    guide.run(strict=strict_mode)