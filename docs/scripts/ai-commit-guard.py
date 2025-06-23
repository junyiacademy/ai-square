#!/usr/bin/env python3
"""
AI Commit Guard
防止 AI 助手未經授權自動提交的守護程序
"""

import os
import sys
import subprocess
from datetime import datetime
from pathlib import Path

class AICommitGuard:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.guard_file = self.project_root / ".ai-commit-guard"
        self.log_file = self.project_root / "docs" / "logs" / "ai-commit-violations.log"
        
    def check_authorization(self) -> bool:
        """檢查是否有明確的提交授權"""
        # 檢查環境變數
        if os.environ.get('AI_COMMIT_AUTHORIZED') == 'true':
            return True
            
        # 檢查臨時授權檔案
        if self.guard_file.exists():
            # 讀取授權時間
            with open(self.guard_file, 'r') as f:
                auth_time = datetime.fromisoformat(f.read().strip())
                
            # 授權有效期 5 分鐘
            if (datetime.now() - auth_time).seconds < 300:
                return True
            else:
                # 過期則刪除
                self.guard_file.unlink()
                
        return False
    
    def create_authorization(self):
        """創建臨時授權"""
        with open(self.guard_file, 'w') as f:
            f.write(datetime.now().isoformat())
        print("✅ 已創建 5 分鐘的提交授權")
    
    def log_violation(self, command: str):
        """記錄違規行為"""
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(self.log_file, 'a') as f:
            f.write(f"\n[{datetime.now().isoformat()}] 違規嘗試: {command}\n")
            f.write(f"工作目錄: {os.getcwd()}\n")
            f.write(f"環境: {'CI' if os.environ.get('CI') else 'Local'}\n")
            
    def intercept_commit(self) -> bool:
        """攔截未授權的提交"""
        if self.check_authorization():
            return True
            
        # 記錄違規
        command = ' '.join(sys.argv)
        self.log_violation(command)
        
        print("\n" + "="*60)
        print("🚨 AI COMMIT GUARD - 未授權的提交嘗試 🚨")
        print("="*60)
        print("\n❌ 偵測到 AI 助手嘗試自動提交！")
        print("\n📋 違反規則:")
        print("  - CLAUDE.md 第18條: NEVER execute commit without explicit instruction")
        print("  - CLAUDE.md 第19條: ONLY commit when user says 'commit'")
        print("\n💡 正確流程:")
        print("  1. AI 完成修改")
        print("  2. AI 報告完成內容")
        print("  3. 等待用戶明確指示 'commit'")
        print("  4. 用戶授權後才能提交")
        print("\n🛡️ 此次提交已被阻止")
        print("="*60)
        
        return False
    
    def check_ai_environment(self) -> bool:
        """檢查是否在 AI 環境中執行"""
        # 檢查各種 AI 環境標記
        ai_indicators = [
            os.environ.get('CLAUDE_CODE'),
            os.environ.get('AI_ASSISTANT'),
            os.environ.get('COPILOT_ACTIVE'),
            # 檢查是否從特定腳本調用
            'commit-guide.py' in ' '.join(sys.argv),
            'commit-ticket' in ' '.join(sys.argv)
        ]
        
        # 如果有明確的 AI 標記，返回 True
        if any(ai_indicators):
            return True
            
        # 預設假設在 AI 環境中（更安全的做法）
        # 除非明確設置為非 AI 環境
        if os.environ.get('NOT_AI_ENVIRONMENT') == 'true':
            return False
            
        # 預設認為是 AI 環境
        return True


def main():
    """主函式"""
    guard = AICommitGuard()
    
    # 如果是授權模式
    if len(sys.argv) > 1 and sys.argv[1] == '--authorize':
        guard.create_authorization()
        return
    
    # 如果在 AI 環境中且沒有授權
    if guard.check_ai_environment() and not guard.intercept_commit():
        sys.exit(1)
    
    print("✅ Commit 授權檢查通過")


if __name__ == "__main__":
    main()