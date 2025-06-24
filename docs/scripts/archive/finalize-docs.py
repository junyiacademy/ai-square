#!/usr/bin/env python3
"""
完成文檔提交工具
在 post-commit 生成文檔後，自動創建一個補充 commit
避免文檔永遠落後一個 commit 的問題
"""

import os
import sys
import subprocess
from pathlib import Path
from datetime import datetime

class DocsFinalizer:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        
    def run_command(self, cmd):
        """執行命令"""
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=self.project_root
        )
        return result.returncode, result.stdout, result.stderr
    
    def check_pending_docs(self):
        """檢查是否有待提交的文檔"""
        # 檢查 git status
        returncode, stdout, _ = self.run_command(["git", "status", "--porcelain"])
        if returncode != 0:
            return False
        
        # 檢查是否有未追蹤的 dev-logs
        untracked_files = []
        for line in stdout.strip().split('\n'):
            if line.startswith('?? ') and 'dev-logs' in line:
                untracked_files.append(line[3:])
        
        return untracked_files
    
    def get_last_commit_info(self):
        """獲取最後一次 commit 的信息"""
        returncode, stdout, _ = self.run_command([
            "git", "log", "-1", "--pretty=format:%h %s"
        ])
        if returncode == 0:
            parts = stdout.strip().split(' ', 1)
            return parts[0], parts[1] if len(parts) > 1 else ""
        return None, None
    
    def create_docs_commit(self, doc_files):
        """創建文檔補充 commit"""
        # 添加文檔檔案
        for file in doc_files:
            returncode, _, _ = self.run_command(["git", "add", file])
            if returncode != 0:
                print(f"❌ 無法添加檔案: {file}")
                return False
        
        # 獲取上次 commit 信息
        last_hash, last_msg = self.get_last_commit_info()
        
        # 構建 commit 訊息
        commit_msg = f"docs: auto-generated documentation for {last_hash}\n\n"
        commit_msg += f"Documentation for: {last_msg}\n"
        commit_msg += f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        commit_msg += "🤖 Auto-generated documentation commit (no post-commit trigger)"
        
        # 使用環境變數標記這是文檔 commit，避免觸發 post-commit
        env = os.environ.copy()
        env['SKIP_POST_COMMIT'] = '1'
        
        # 執行 commit
        result = subprocess.run(
            ["git", "commit", "-m", commit_msg],
            capture_output=True,
            text=True,
            cwd=self.project_root,
            env=env
        )
        
        return result.returncode == 0
    
    def run(self):
        """主流程"""
        print("📄 檢查是否有待提交的文檔...")
        
        # 檢查待提交文檔
        pending_docs = self.check_pending_docs()
        if not pending_docs:
            print("✅ 沒有待提交的文檔")
            return True
        
        print(f"📋 發現 {len(pending_docs)} 個待提交文檔:")
        for doc in pending_docs:
            print(f"   - {doc}")
        
        # 創建補充 commit
        print("\n🔧 創建文檔補充 commit...")
        if self.create_docs_commit(pending_docs):
            print("✅ 文檔已成功提交！")
            
            # 顯示新的 commit
            returncode, stdout, _ = self.run_command([
                "git", "log", "-1", "--oneline"
            ])
            if returncode == 0:
                print(f"\n📌 新 commit: {stdout.strip()}")
            
            return True
        else:
            print("❌ 文檔提交失敗")
            return False

if __name__ == "__main__":
    finalizer = DocsFinalizer()
    success = finalizer.run()
    sys.exit(0 if success else 1)