#!/usr/bin/env python3
"""
完整工作流程示範 - 包含文件追蹤統計
"""

import subprocess
import sys
from pathlib import Path

def run_command(cmd: str, description: str):
    """執行命令並顯示結果"""
    print(f"\n{'='*60}")
    print(f"🔧 {description}")
    print(f"📍 命令: {cmd}")
    print(f"{'='*60}")
    
    # 使用 shell=True 來執行完整的命令字串
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(f"⚠️ 錯誤: {result.stderr}")
    
    return result.returncode == 0

def main():
    print("""
╔═══════════════════════════════════════════════════════════╗
║          📚 完整工作流程示範（含文件追蹤）                   ║
╚═══════════════════════════════════════════════════════════╝

這個示範展示完整的開發流程：
1. 創建票券（自動記錄初始文件參考）
2. 開發過程中追蹤文件使用
3. 提交時自動收集文件參考到 dev-log
4. 生成文件使用統計報告
""")

    # 1. 創建新票券
    print("\n" + "="*60)
    print("📋 步驟 1: 創建新的功能票券")
    print("="*60)
    
    print("""
當使用 make dev-start 創建票券時：
- ticket-manager-enhanced.py 會自動記錄初始文件參考
- 例如：TICKET_DRIVEN_DEVELOPMENT.md、business-rules.md
""")
    
    # 2. 開發階段
    print("\n" + "="*60)
    print("📋 步驟 2: 開發過程中的文件追蹤")
    print("="*60)
    
    print("""
在開發過程中，AI 應該：
1. 查閱 handbook 文件時，使用 make dev-track 記錄
2. 在 dev-log 中加入 document_references 區段
3. 例如：
   make dev-track STAGE=frontend_development
   make dev-track STAGE=test_writing
""")
    
    # 3. Pre-commit 階段
    print("\n" + "="*60)
    print("📋 步驟 3: Pre-commit 自動收集文件參考")
    print("="*60)
    
    print("""
當執行 make dev-commit 時：
1. smart-commit.py 呼叫 pre-commit-doc-gen.py
2. pre-commit-doc-gen.py 會：
   - 從票券的 document-references.yml 讀取文件參考
   - 將參考資訊加入到生成的 dev-log 中
   - 格式：
     document_references:
       consulted_documents:
         - path: docs/handbook/xxx.md
           reason: 參考原因
""")
    
    # 4. 統計分析
    print("\n" + "="*60)
    print("📋 步驟 4: 生成使用統計報告")
    print("="*60)
    
    print("""
執行 make doc-usage-report 時：
1. document-usage-analyzer.py 會掃描：
   - 所有票券的 document-references.yml
   - 所有 dev-logs 的 document_references 區段
2. 生成統計報告包含：
   - 使用次數排行榜
   - 分類統計（背景知識、開發指南、技術參考）
   - 未被引用的文件清單
""")
    
    # 5. 實際執行示範
    print("\n" + "="*60)
    print("📋 步驟 5: 實際執行示範")
    print("="*60)
    
    response = input("\n是否要執行實際的示範流程？(y/n): ")
    if response.lower() == 'y':
        # 執行簡化的示範
        run_command(
            "python3 docs/scripts/document-usage-analyzer.py",
            "執行文件使用分析（基於現有數據）"
        )
    
    # 總結
    print("\n" + "="*60)
    print("✅ 流程總結")
    print("="*60)
    print("""
完整的文件追蹤流程：

1. **票券創建** → 自動記錄初始參考文件
2. **開發過程** → AI 主動使用 dev-track 記錄
3. **Pre-commit** → 自動收集文件參考到 dev-log
4. **定期分析** → 生成使用統計報告

這樣可以：
- 了解哪些文件最有價值
- 發現未使用的文件
- 優化文檔結構
- 改進開發流程
""")

if __name__ == "__main__":
    main()