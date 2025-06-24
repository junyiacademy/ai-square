#!/usr/bin/env python3
"""
示範文件追蹤系統的完整流程
"""

import sys
import subprocess
from pathlib import Path
from datetime import datetime

def run_command(cmd: list, description: str):
    """執行命令並顯示結果"""
    print(f"\n{'='*60}")
    print(f"🔧 {description}")
    print(f"📍 命令: {' '.join(cmd)}")
    print(f"{'='*60}")
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(f"⚠️ 錯誤: {result.stderr}")
    
    return result.returncode == 0

def main():
    print("""
╔═══════════════════════════════════════════════════════════╗
║          📚 文件追蹤系統示範 Demo                           ║
╚═══════════════════════════════════════════════════════════╝

這個示範將展示如何：
1. 創建票券時自動記錄參考文件
2. 開發過程中追蹤文件使用
3. 生成文件使用統計報告
""")

    scripts_dir = Path(__file__).parent
    
    # 1. 創建示範票券
    print("\n" + "="*60)
    print("📋 步驟 1: 創建新的功能票券")
    print("="*60)
    
    ticket_name = f"demo-tracking-{datetime.now().strftime('%H%M%S')}"
    
    run_command(
        [sys.executable, str(scripts_dir / "ticket-manager-enhanced.py"), 
         "create", ticket_name, "feature", "示範文件追蹤功能"],
        "創建功能票券"
    )
    
    # 2. 模擬開發階段
    print("\n" + "="*60)
    print("📋 步驟 2: 追蹤開發階段的文件參考")
    print("="*60)
    
    # 前端開發階段
    run_command(
        [sys.executable, str(scripts_dir / "ticket-manager-enhanced.py"),
         "track", "frontend_development", "frontend/components/Demo.tsx"],
        "記錄前端開發階段"
    )
    
    # 測試撰寫階段
    run_command(
        [sys.executable, str(scripts_dir / "ticket-manager-enhanced.py"),
         "track", "test_writing"],
        "記錄測試撰寫階段"
    )
    
    # 3. 查看當前票券
    print("\n" + "="*60)
    print("📋 步驟 3: 查看當前活動票券")
    print("="*60)
    
    run_command(
        [sys.executable, str(scripts_dir / "ticket-manager-enhanced.py"), "active"],
        "顯示活動票券資訊"
    )
    
    # 4. 生成使用報告
    print("\n" + "="*60)
    print("📋 步驟 4: 生成文件使用統計報告")
    print("="*60)
    
    run_command(
        [sys.executable, str(scripts_dir / "document-usage-analyzer.py")],
        "分析所有票券的文件參考"
    )
    
    # 5. 顯示報告摘要
    print("\n" + "="*60)
    print("📋 步驟 5: 查看生成的報告")
    print("="*60)
    
    report_file = Path("docs/handbook/document-usage-report.md")
    if report_file.exists():
        with open(report_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            # 顯示前 50 行
            print("📊 報告內容（前 50 行）：")
            print("-" * 60)
            for line in lines[:50]:
                print(line.rstrip())
            if len(lines) > 50:
                print("\n... (還有更多內容)")
    
    # 總結
    print("\n" + "="*60)
    print("✅ 示範完成！")
    print("="*60)
    print("""
💡 重點總結：
1. 票券創建時會自動記錄相關的 handbook 文件
2. 開發過程中可以追蹤不同階段參考的文件
3. 系統會統計每個文件的使用次數和使用情境
4. 可以識別未被使用的文件，幫助優化文檔

📚 下一步：
- 使用 'make dev-start TICKET=xxx TYPE=feature' 創建票券
- 在 CLAUDE.md 中會提醒 AI 記錄參考的文件
- 定期執行 'make doc-usage-report' 查看統計
""")

if __name__ == "__main__":
    main()