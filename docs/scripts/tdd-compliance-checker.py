#!/usr/bin/env python3
"""
TDD 合規檢查器

檢查開發流程是否遵循 TDD 原則：
1. 檢查是否先寫測試再寫實現
2. 檢查測試覆蓋率是否達標
3. 檢查是否有對應的測試文件
4. 生成 TDD 合規報告
"""

import os
import sys
import json
import subprocess
import re
from datetime import datetime
from pathlib import Path

class TDDComplianceChecker:
    def __init__(self, project_root=None):
        self.project_root = Path(project_root or os.getcwd())
        self.frontend_path = self.project_root / "frontend"
        self.issues = []
        self.stats = {
            "total_files": 0,
            "files_with_tests": 0,
            "test_coverage": 0,
            "tdd_compliant": 0
        }
    
    def check_compliance(self):
        """執行完整的 TDD 合規檢查"""
        print("🔍 開始 TDD 合規檢查...")
        
        # 1. 檢查測試覆蓋率
        self.check_test_coverage()
        
        # 2. 檢查文件是否有對應測試
        self.check_test_file_existence()
        
        # 3. 檢查 Git 提交歷史中的 TDD 合規性
        self.check_git_commit_tdd_compliance()
        
        # 4. 生成報告
        self.generate_report()
        
        return len(self.issues) == 0
    
    def check_test_coverage(self):
        """檢查測試覆蓋率"""
        try:
            # 運行測試覆蓋率檢查
            result = subprocess.run(
                ["npm", "run", "test:ci", "--", "--coverage", "--passWithNoTests"],
                cwd=self.frontend_path,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                # 解析覆蓋率報告
                coverage_report = self.parse_coverage_report()
                self.stats["test_coverage"] = coverage_report.get("total", 0)
                
                if self.stats["test_coverage"] < 80:
                    self.issues.append({
                        "type": "low_coverage",
                        "message": f"測試覆蓋率 {self.stats['test_coverage']}% 低於最低要求 80%",
                        "severity": "error"
                    })
            else:
                self.issues.append({
                    "type": "test_failure",
                    "message": "測試執行失敗",
                    "details": result.stderr,
                    "severity": "error"
                })
                
        except Exception as e:
            self.issues.append({
                "type": "coverage_check_error",
                "message": f"無法檢查測試覆蓋率: {str(e)}",
                "severity": "warning"
            })
    
    def parse_coverage_report(self):
        """解析測試覆蓋率報告"""
        coverage_file = self.frontend_path / "coverage" / "coverage-summary.json"
        
        if coverage_file.exists():
            try:
                with open(coverage_file, 'r') as f:
                    coverage_data = json.load(f)
                    return {
                        "total": coverage_data.get("total", {}).get("lines", {}).get("pct", 0),
                        "branches": coverage_data.get("total", {}).get("branches", {}).get("pct", 0),
                        "functions": coverage_data.get("total", {}).get("functions", {}).get("pct", 0),
                        "statements": coverage_data.get("total", {}).get("statements", {}).get("pct", 0)
                    }
            except Exception:
                pass
        
        return {"total": 0}
    
    def check_test_file_existence(self):
        """檢查每個源文件是否有對應的測試文件"""
        src_path = self.frontend_path / "src"
        
        if not src_path.exists():
            return
        
        # 找出所有源文件
        source_files = []
        for ext in ["*.tsx", "*.ts"]:
            source_files.extend(src_path.rglob(ext))
        
        # 排除測試文件和配置文件
        source_files = [
            f for f in source_files 
            if not any(part in str(f) for part in [
                "__tests__", ".test.", ".spec.", 
                "jest.config", "jest.setup",
                ".d.ts", "index.ts"
            ])
        ]
        
        self.stats["total_files"] = len(source_files)
        
        for source_file in source_files:
            if self.has_test_file(source_file):
                self.stats["files_with_tests"] += 1
            else:
                # 檢查是否為重要文件（組件、API 路由等）
                if self.is_important_file(source_file):
                    self.issues.append({
                        "type": "missing_test",
                        "message": f"重要文件缺少測試: {source_file.relative_to(self.frontend_path)}",
                        "severity": "error"
                    })
    
    def has_test_file(self, source_file):
        """檢查源文件是否有對應的測試文件"""
        possible_test_paths = [
            # 同目錄下的測試文件
            source_file.parent / f"{source_file.stem}.test{source_file.suffix}",
            source_file.parent / f"{source_file.stem}.spec{source_file.suffix}",
            # __tests__ 目錄下的測試文件
            source_file.parent / "__tests__" / f"{source_file.stem}.test{source_file.suffix}",
            source_file.parent / "__tests__" / f"{source_file.name}",
        ]
        
        return any(test_path.exists() for test_path in possible_test_paths)
    
    def is_important_file(self, source_file):
        """判斷是否為重要文件（需要測試的文件）"""
        file_path = str(source_file)
        
        # API 路由
        if "/api/" in file_path and source_file.name == "route.ts":
            return True
        
        # React 組件
        if source_file.suffix == ".tsx":
            return True
        
        # Hook 文件
        if source_file.name.startswith("use") and source_file.suffix == ".ts":
            return True
        
        # 工具函數
        if "/utils/" in file_path or "/lib/" in file_path:
            return True
        
        # 服務文件
        if "/services/" in file_path:
            return True
        
        return False
    
    def check_git_commit_tdd_compliance(self):
        """檢查最近的 Git 提交是否遵循 TDD"""
        try:
            # 獲取最近的提交
            result = subprocess.run(
                ["git", "log", "--oneline", "-10"],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                commits = result.stdout.strip().split('\n')
                
                for commit in commits:
                    if self.is_implementation_without_test_commit(commit):
                        self.issues.append({
                            "type": "tdd_violation",
                            "message": f"提交可能違反 TDD 原則: {commit}",
                            "severity": "warning"
                        })
                        
        except Exception as e:
            print(f"⚠️ 無法檢查 Git 提交歷史: {str(e)}")
    
    def is_implementation_without_test_commit(self, commit):
        """檢查提交是否為沒有測試的實現代碼"""
        # 這是一個簡化的檢查，實際實現會更複雜
        commit_msg = commit.lower()
        
        # 如果提交訊息包含實現相關的關鍵字，但沒有測試關鍵字
        impl_keywords = ["feat:", "feature:", "add:", "implement", "create"]
        test_keywords = ["test", "spec", "tdd"]
        
        has_impl = any(keyword in commit_msg for keyword in impl_keywords)
        has_test = any(keyword in commit_msg for keyword in test_keywords)
        
        return has_impl and not has_test
    
    def generate_report(self):
        """生成 TDD 合規報告"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "stats": self.stats,
            "issues": self.issues,
            "summary": self.generate_summary()
        }
        
        # 保存報告到文件
        report_file = self.project_root / "docs" / "reports" / "tdd-compliance-report.json"
        report_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        # 生成 Markdown 報告
        self.generate_markdown_report(report)
        
        # 打印摘要
        self.print_summary()
    
    def generate_summary(self):
        """生成摘要"""
        error_count = len([i for i in self.issues if i["severity"] == "error"])
        warning_count = len([i for i in self.issues if i["severity"] == "warning"])
        
        test_file_ratio = (
            self.stats["files_with_tests"] / self.stats["total_files"] * 100
            if self.stats["total_files"] > 0 else 0
        )
        
        compliance_score = min(100, (
            (self.stats["test_coverage"] * 0.6) +
            (test_file_ratio * 0.4)
        ))
        
        return {
            "compliance_score": round(compliance_score, 2),
            "test_file_ratio": round(test_file_ratio, 2),
            "error_count": error_count,
            "warning_count": warning_count,
            "is_compliant": error_count == 0 and self.stats["test_coverage"] >= 80
        }
    
    def generate_markdown_report(self, report):
        """生成 Markdown 格式的報告"""
        md_content = f"""# TDD 合規檢查報告

**生成時間**: {report['timestamp']}

## 📊 整體統計

- **合規分數**: {report['summary']['compliance_score']}/100
- **測試覆蓋率**: {report['stats']['test_coverage']}%
- **有測試文件的比例**: {report['summary']['test_file_ratio']}%
- **總源文件數**: {report['stats']['total_files']}
- **有測試的文件數**: {report['stats']['files_with_tests']}

## 🚨 問題總覽

- **錯誤**: {report['summary']['error_count']} 個
- **警告**: {report['summary']['warning_count']} 個

"""

        if report['issues']:
            md_content += "## 📋 詳細問題\n\n"
            
            for issue in report['issues']:
                icon = "🚨" if issue['severity'] == 'error' else "⚠️"
                md_content += f"### {icon} {issue['type']}\n\n"
                md_content += f"**訊息**: {issue['message']}\n\n"
                
                if 'details' in issue:
                    md_content += f"**詳細信息**:\n```\n{issue['details']}\n```\n\n"
        
        md_content += """## 💡 改進建議

### 提升測試覆蓋率
- 為缺少測試的重要文件添加測試
- 確保新功能都先寫測試
- 定期檢查和提升測試品質

### 遵循 TDD 流程
1. 🔴 **Red**: 先寫失敗的測試
2. 🟢 **Green**: 寫最小代碼讓測試通過
3. 🔵 **Refactor**: 重構優化代碼

### 工具和流程
- 使用 `make dev-commit` 確保提交前檢查
- 設置 IDE 插件提醒 TDD 流程
- 定期進行 TDD 培訓和 Code Review

---

*此報告由 TDD 合規檢查器自動生成*
"""
        
        md_file = self.project_root / "docs" / "reports" / "tdd-compliance-report.md"
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write(md_content)
    
    def print_summary(self):
        """打印摘要到控制台"""
        summary = self.generate_summary()
        
        print("\n" + "="*50)
        print("📊 TDD 合規檢查結果")
        print("="*50)
        
        # 合規狀態
        if summary["is_compliant"]:
            print("✅ 恭喜！項目符合 TDD 標準")
        else:
            print("❌ 項目未完全符合 TDD 標準")
        
        print(f"\n📈 合規分數: {summary['compliance_score']}/100")
        print(f"🎯 測試覆蓋率: {self.stats['test_coverage']}%")
        print(f"📁 測試文件比例: {summary['test_file_ratio']}%")
        
        if self.issues:
            print(f"\n🚨 發現 {len(self.issues)} 個問題:")
            for issue in self.issues[:5]:  # 只顯示前5個問題
                icon = "🚨" if issue['severity'] == 'error' else "⚠️"
                print(f"  {icon} {issue['message']}")
            
            if len(self.issues) > 5:
                print(f"  ... 還有 {len(self.issues) - 5} 個問題")
        
        print(f"\n📄 詳細報告: docs/reports/tdd-compliance-report.md")
        print("="*50)

def main():
    """主函數"""
    import argparse
    
    parser = argparse.ArgumentParser(description="TDD 合規檢查器")
    parser.add_argument("--project-root", help="項目根目錄路徑")
    parser.add_argument("--fail-on-issues", action="store_true", help="有問題時返回非零退出碼")
    
    args = parser.parse_args()
    
    checker = TDDComplianceChecker(args.project_root)
    is_compliant = checker.check_compliance()
    
    if args.fail_on_issues and not is_compliant:
        sys.exit(1)
    
    sys.exit(0)

if __name__ == "__main__":
    main()