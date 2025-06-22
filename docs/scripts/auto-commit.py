#!/usr/bin/env python3
"""
非交互式自動提交系統
適用於 AI 環境和自動化場景
"""

import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime

# 複製 Colors 類定義，避免導入問題
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

class AutoCommit:
    """非交互式版本的提交系統"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.checks_passed = []
        self.checks_failed = []
        self.changes_summary = {}
        self.auto_mode = True
        
    def update_feature_log(self) -> bool:
        """更新功能日誌（自動模式）"""
        print(f"\n{Colors.BLUE}📝 檢查功能日誌...{Colors.END}")
        
        today = datetime.now().strftime("%Y-%m-%d")
        feature_logs_dir = self.project_root / "docs/dev-logs"
        
        if not feature_logs_dir.exists():
            print(f"{Colors.YELLOW}⚠️ 開發日誌目錄不存在{Colors.END}")
            return True
            
        feature_logs = list(feature_logs_dir.glob(f"{today}*.yml"))
        
        if not feature_logs:
            print(f"{Colors.YELLOW}⚠️ 今天沒有開發日誌{Colors.END}")
        else:
            print(f"{Colors.GREEN}✅ 找到 {len(feature_logs)} 個今日開發日誌{Colors.END}")
        
        return True
    
    def confirm_and_commit(self, commit_msg: str) -> bool:
        """確認並執行提交（自動模式）"""
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
            print(f"\n{Colors.YELLOW}💡 提示: 請修復錯誤後再提交{Colors.END}")
            return False
        
        # 自動執行提交
        print(f"\n{Colors.CYAN}🤖 自動執行提交...{Colors.END}")
        code, stdout, stderr = self.run_command(["git", "commit", "-m", commit_msg])
        
        if code == 0:
            print(f"\n{Colors.GREEN}✅ 提交成功！{Colors.END}")
            return True
        else:
            print(f"\n{Colors.RED}❌ 提交失敗: {stderr}{Colors.END}")
            return False

if __name__ == "__main__":
    print(f"{Colors.CYAN}{Colors.BOLD}🤖 AI Square 自動提交系統（非交互式）{Colors.END}")
    print(f"{Colors.CYAN}{'='*50}{Colors.END}\n")
    
    # 執行原始的 commit-guide.py 但跳過交互
    os.environ['CI'] = 'true'  # 設置環境變量表示非交互式
    result = subprocess.run(
        [sys.executable, str(Path(__file__).parent / 'commit-guide.py')],
        capture_output=False
    )
    sys.exit(result.returncode)