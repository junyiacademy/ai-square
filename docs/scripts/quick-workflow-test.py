#!/usr/bin/env python3
"""
快速工作流程驗證工具
檢查當前項目的流程組件是否正常運作
"""

import sys
import json
import yaml
from pathlib import Path
from datetime import datetime
from typing import Dict, List

class QuickWorkflowValidator:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.checks = []
        
    def run_validation(self) -> Dict:
        """執行快速驗證"""
        results = {"passed": 0, "failed": 0, "warnings": 0, "details": []}
        
        checks = [
            ("腳本文件完整性", self.check_script_files),
            ("票券系統結構", self.check_ticket_structure),
            ("開發日誌結構", self.check_devlog_structure),
            ("Makefile 整合", self.check_makefile_integration),
            ("最近提交的文檔", self.check_recent_docs),
            ("雙向連結完整性", self.check_bidirectional_links),
            ("時間計算方法", self.check_time_calculation_methods)
        ]
        
        for check_name, check_func in checks:
            try:
                result = check_func()
                if result["status"] == "pass":
                    results["passed"] += 1
                elif result["status"] == "warning":
                    results["warnings"] += 1
                else:
                    results["failed"] += 1
                
                results["details"].append({
                    "check": check_name,
                    "status": result["status"],
                    "message": result["message"],
                    "details": result.get("details", [])
                })
                
            except Exception as e:
                results["failed"] += 1
                results["details"].append({
                    "check": check_name,
                    "status": "fail",
                    "message": f"檢查執行錯誤: {str(e)}",
                    "details": []
                })
        
        return results
    
    def check_script_files(self) -> Dict:
        """檢查必要的腳本文件"""
        required_scripts = [
            "ticket-manager.py",
            "pre-commit-doc-gen.py", 
            "post-commit-doc-gen.py",
            "smart-commit.py"
        ]
        
        scripts_dir = self.project_root / "docs" / "scripts"
        missing = []
        
        for script in required_scripts:
            if not (scripts_dir / script).exists():
                missing.append(script)
        
        if missing:
            return {
                "status": "fail",
                "message": f"缺少必要腳本: {', '.join(missing)}",
                "details": missing
            }
        
        return {
            "status": "pass", 
            "message": "所有必要腳本文件都存在",
            "details": required_scripts
        }
    
    def check_ticket_structure(self) -> Dict:
        """檢查票券系統結構"""
        tickets_dir = self.project_root / "docs" / "tickets"
        
        if not tickets_dir.exists():
            return {
                "status": "fail",
                "message": "票券目錄不存在",
                "details": []
            }
        
        expected_dirs = ["in_progress", "completed"]
        missing_dirs = []
        
        for dir_name in expected_dirs:
            if not (tickets_dir / dir_name).exists():
                missing_dirs.append(dir_name)
        
        if missing_dirs:
            return {
                "status": "fail",
                "message": f"缺少票券狀態目錄: {', '.join(missing_dirs)}",
                "details": missing_dirs
            }
        
        # 檢查票券格式
        ticket_issues = []
        for status_dir in expected_dirs:
            status_path = tickets_dir / status_dir
            for ticket_file in status_path.glob("*.yml"):
                try:
                    with open(ticket_file, 'r') as f:
                        ticket_data = yaml.safe_load(f)
                    
                    required_fields = ["id", "name", "status", "created_at"]
                    missing_fields = [field for field in required_fields if field not in ticket_data]
                    
                    if missing_fields:
                        ticket_issues.append(f"{ticket_file.name}: 缺少字段 {missing_fields}")
                        
                except Exception as e:
                    ticket_issues.append(f"{ticket_file.name}: YAML 解析錯誤 - {e}")
        
        if ticket_issues:
            return {
                "status": "warning",
                "message": "部分票券格式有問題", 
                "details": ticket_issues
            }
        
        return {
            "status": "pass",
            "message": "票券系統結構正常",
            "details": expected_dirs
        }
    
    def check_devlog_structure(self) -> Dict:
        """檢查開發日誌結構"""
        devlogs_dir = self.project_root / "docs" / "dev-logs"
        
        if not devlogs_dir.exists():
            return {
                "status": "warning",
                "message": "開發日誌目錄不存在（可能尚未生成）",
                "details": []
            }
        
        # 檢查最近的開發日誌
        recent_logs = []
        for date_dir in sorted(devlogs_dir.iterdir(), reverse=True)[:3]:
            if date_dir.is_dir():
                logs_in_date = list(date_dir.glob("*.yml"))
                recent_logs.extend(logs_in_date)
        
        log_issues = []
        for log_file in recent_logs[:5]:  # 檢查最近5個日誌
            try:
                with open(log_file, 'r') as f:
                    log_data = yaml.safe_load(f)
                
                required_fields = ["type", "title", "date", "status"]
                missing_fields = [field for field in required_fields if field not in log_data]
                
                if missing_fields:
                    log_issues.append(f"{log_file.name}: 缺少字段 {missing_fields}")
                    
            except Exception as e:
                log_issues.append(f"{log_file.name}: YAML 解析錯誤 - {e}")
        
        if log_issues:
            return {
                "status": "warning",
                "message": "部分開發日誌格式有問題",
                "details": log_issues
            }
        
        return {
            "status": "pass",
            "message": f"開發日誌結構正常，檢查了 {len(recent_logs)} 個文件",
            "details": [f.name for f in recent_logs]
        }
    
    def check_makefile_integration(self) -> Dict:
        """檢查 Makefile 整合"""
        makefile = self.project_root / "Makefile"
        
        if not makefile.exists():
            return {
                "status": "fail",
                "message": "Makefile 不存在",
                "details": []
            }
        
        makefile_content = makefile.read_text()
        expected_targets = ["commit-ticket", "merge-ticket", "dev-status"]
        missing_targets = []
        
        for target in expected_targets:
            if f"{target}:" not in makefile_content:
                missing_targets.append(target)
        
        if missing_targets:
            return {
                "status": "warning",
                "message": f"Makefile 缺少目標: {', '.join(missing_targets)}",
                "details": missing_targets
            }
        
        return {
            "status": "pass",
            "message": "Makefile 整合完整",
            "details": expected_targets
        }
    
    def check_recent_docs(self) -> Dict:
        """檢查最近的文檔生成"""
        # 檢查最近的 commits 是否有對應的開發日誌
        import subprocess
        
        try:
            result = subprocess.run(
                ["git", "log", "--oneline", "-5"],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            recent_commits = result.stdout.strip().split('\n')
            
            if not recent_commits or recent_commits == ['']: 
                return {
                    "status": "warning",
                    "message": "沒有找到最近的提交",
                    "details": []
                }
            
            # 檢查最近的開發日誌
            devlogs_dir = self.project_root / "docs" / "dev-logs"
            if devlogs_dir.exists():
                today = datetime.now().strftime('%Y-%m-%d')
                today_dir = devlogs_dir / today
                if today_dir.exists():
                    today_logs = list(today_dir.glob("*.yml"))
                    return {
                        "status": "pass",
                        "message": f"今日已生成 {len(today_logs)} 個開發日誌",
                        "details": [f.name for f in today_logs]
                    }
            
            return {
                "status": "warning", 
                "message": "今日尚未生成開發日誌",
                "details": recent_commits
            }
            
        except Exception as e:
            return {
                "status": "warning",
                "message": f"無法檢查最近提交: {e}",
                "details": []
            }
    
    def check_bidirectional_links(self) -> Dict:
        """檢查雙向連結完整性"""
        issues = []
        checked_pairs = 0
        
        # 檢查完成的票券
        completed_dir = self.project_root / "docs" / "tickets" / "completed"
        if completed_dir.exists():
            for ticket_file in completed_dir.glob("*.yml"):
                try:
                    with open(ticket_file, 'r') as f:
                        ticket_data = yaml.safe_load(f)
                    
                    dev_log_path = ticket_data.get('dev_log_path')
                    if dev_log_path:
                        dev_log_file = self.project_root / dev_log_path
                        if dev_log_file.exists():
                            with open(dev_log_file, 'r') as f:
                                log_data = yaml.safe_load(f)
                            
                            # 檢查反向連結
                            if log_data.get('ticket_name') != ticket_data.get('name'):
                                issues.append(f"{ticket_file.name}: 票券名稱不匹配")
                            
                            checked_pairs += 1
                        else:
                            issues.append(f"{ticket_file.name}: 開發日誌不存在 - {dev_log_path}")
                    else:
                        issues.append(f"{ticket_file.name}: 缺少開發日誌連結")
                        
                except Exception as e:
                    issues.append(f"{ticket_file.name}: 處理錯誤 - {e}")
        
        if issues:
            return {
                "status": "warning",
                "message": f"發現 {len(issues)} 個連結問題",
                "details": issues
            }
        
        if checked_pairs == 0:
            return {
                "status": "warning",
                "message": "沒有找到可檢查的票券-日誌對",
                "details": []
            }
        
        return {
            "status": "pass",
            "message": f"檢查了 {checked_pairs} 個票券-日誌對，連結完整",
            "details": []
        }
    
    def check_time_calculation_methods(self) -> Dict:
        """檢查時間計算方法"""
        issues = []
        methods_used = set()
        
        # 檢查最近的開發日誌
        devlogs_dir = self.project_root / "docs" / "dev-logs"
        if devlogs_dir.exists():
            recent_logs = []
            # 只選擇符合日期格式的目錄
            date_dirs = [d for d in devlogs_dir.iterdir() if d.is_dir() and d.name.startswith('2')]
            for date_dir in sorted(date_dirs, reverse=True)[:3]:
                recent_logs.extend(list(date_dir.glob("*.yml")))
            
            for log_file in recent_logs[:10]:  # 檢查最近10個
                try:
                    with open(log_file, 'r') as f:
                        log_data = yaml.safe_load(f)
                    
                    # 檢查多個可能的位置
                    method = (log_data.get('metrics', {}).get('time_calculation_method') or 
                             log_data.get('time_calculation_method') or
                             log_data.get('metrics', {}).get('time_estimation_method'))
                    
                    if method:
                        methods_used.add(method)
                        
                        # 檢查是否使用了被禁止的方法
                        if method == 'file_count_estimate':
                            issues.append(f"{log_file.name}: 使用了禁止的 file_count_estimate 方法")
                    
                except Exception as e:
                    issues.append(f"{log_file.name}: 處理錯誤 - {e}")
        
        if issues:
            return {
                "status": "fail",
                "message": f"發現時間計算問題: {len(issues)} 個",
                "details": issues
            }
        
        if not methods_used:
            return {
                "status": "warning",
                "message": "沒有找到時間計算方法記錄",
                "details": []
            }
        
        return {
            "status": "pass",
            "message": f"時間計算方法正常，使用方法: {', '.join(methods_used)}",
            "details": list(methods_used)
        }
    
    def generate_report(self, results: Dict) -> str:
        """生成驗證報告"""
        total = results["passed"] + results["failed"] + results["warnings"]
        
        report = f"""# 工作流程快速驗證報告
時間: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 摘要
- ✅ 通過: {results["passed"]} / {total}
- ⚠️  警告: {results["warnings"]} / {total}  
- ❌ 失敗: {results["failed"]} / {total}

## 詳細結果
"""
        
        for detail in results["details"]:
            if detail["status"] == "pass":
                icon = "✅"
            elif detail["status"] == "warning":
                icon = "⚠️"
            else:
                icon = "❌"
            
            report += f"\n### {icon} {detail['check']}\n"
            report += f"**狀態**: {detail['status']}\n"
            report += f"**訊息**: {detail['message']}\n"
            
            if detail["details"]:
                report += f"**詳細信息**:\n"
                for item in detail["details"]:
                    report += f"- {item}\n"
        
        return report

def main():
    """主執行函數"""
    print("🔍 開始快速工作流程驗證...")
    
    validator = QuickWorkflowValidator()
    results = validator.run_validation()
    
    # 生成報告
    report = validator.generate_report(results)
    print(report)
    
    # 保存報告
    reports_dir = Path(__file__).parent.parent / "test-reports"
    reports_dir.mkdir(exist_ok=True)
    
    report_file = reports_dir / f"workflow-validation-{datetime.now().strftime('%Y%m%d-%H%M%S')}.md"
    report_file.write_text(report)
    print(f"\n📄 驗證報告已保存: {report_file}")
    
    # 返回狀態
    if results["failed"] > 0:
        print("\n❌ 驗證發現嚴重問題，需要修復")
        return False
    elif results["warnings"] > 0:
        print("\n⚠️ 驗證完成，有警告項目需要注意")
        return True
    else:
        print("\n✅ 所有檢查都通過！")
        return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)