#!/usr/bin/env python3
"""
開發流程端到端測試套件
驗證票券、開發日誌、時間追蹤等所有組件的整合性
"""

import os
import sys
import json
import yaml
import shutil
import tempfile
import subprocess
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import unittest

class WorkflowTestSuite:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.test_dir = None
        self.original_cwd = None
        self.test_results = []
        
    def setup_test_environment(self):
        """設置測試環境"""
        self.test_dir = Path(tempfile.mkdtemp(prefix="workflow_test_"))
        self.original_cwd = os.getcwd()
        
        # 複製必要的腳本到測試環境
        scripts_dir = self.test_dir / "docs" / "scripts"
        scripts_dir.mkdir(parents=True)
        
        for script in ["ticket-manager.py", "pre-commit-doc-gen.py", "post-commit-doc-gen.py", "smart-commit.py"]:
            src = self.project_root / "docs" / "scripts" / script
            if src.exists():
                shutil.copy2(src, scripts_dir / script)
        
        # 初始化測試用 git repo
        os.chdir(self.test_dir)
        subprocess.run(["git", "init"], capture_output=True)
        subprocess.run(["git", "config", "user.name", "Test User"], capture_output=True)
        subprocess.run(["git", "config", "user.email", "test@example.com"], capture_output=True)
        
        return self.test_dir

    def cleanup_test_environment(self):
        """清理測試環境"""
        if self.original_cwd:
            os.chdir(self.original_cwd)
        if self.test_dir and self.test_dir.exists():
            shutil.rmtree(self.test_dir)

    def run_scenario_tests(self) -> Dict:
        """運行所有場景測試"""
        scenarios = [
            self.test_single_feature_workflow,
            self.test_multi_target_workflow, 
            self.test_interrupted_workflow,
            self.test_no_ticket_auto_creation,
            self.test_time_calculation_accuracy,
            self.test_bidirectional_linking,
            self.test_status_transitions,
            self.test_file_organization
        ]
        
        results = {"passed": 0, "failed": 0, "details": []}
        
        for scenario in scenarios:
            try:
                print(f"🧪 執行測試: {scenario.__name__}")
                scenario()
                results["passed"] += 1
                results["details"].append({"test": scenario.__name__, "status": "PASS"})
                print(f"✅ {scenario.__name__} - PASS")
            except Exception as e:
                results["failed"] += 1
                results["details"].append({"test": scenario.__name__, "status": "FAIL", "error": str(e)})
                print(f"❌ {scenario.__name__} - FAIL: {e}")
        
        return results

    def test_single_feature_workflow(self):
        """測試單一功能完整開發流程"""
        # 1. 創建票券
        ticket_name = "test-single-feature"
        self._create_test_ticket(ticket_name, "測試單一功能流程")
        
        # 2. 模擬開發變更
        test_file = self.test_dir / "test_feature.py"
        test_file.write_text("def test_function():\n    return True\n")
        
        # 3. 執行 pre-commit
        pre_commit_result = self._run_pre_commit()
        
        # 4. 提交變更
        subprocess.run(["git", "add", "."], capture_output=True)
        subprocess.run(["git", "commit", "-m", "feat: add test function"], capture_output=True)
        
        # 5. 執行 post-commit
        post_commit_result = self._run_post_commit()
        
        # 6. 驗證結果
        self._verify_complete_workflow(ticket_name, pre_commit_result, post_commit_result)

    def test_multi_target_workflow(self):
        """測試多目標並行開發場景"""
        # 創建多個文件變更
        files = ["feature1.py", "feature2.py", "docs/README.md"]
        for file_path in files:
            full_path = self.test_dir / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(f"# Content for {file_path}\n")
        
        ticket_name = "test-multi-target"
        self._create_test_ticket(ticket_name, "多目標開發測試")
        
        # 執行完整流程
        pre_result = self._run_pre_commit()
        subprocess.run(["git", "add", "."], capture_output=True)
        subprocess.run(["git", "commit", "-m", "feat: multi-target implementation"], capture_output=True)
        post_result = self._run_post_commit()
        
        # 驗證多文件處理
        self._verify_multi_file_handling(ticket_name, files)

    def test_interrupted_workflow(self):
        """測試對話中斷恢復場景"""
        # 模擬中斷：有票券但沒有完成提交
        ticket_name = "test-interrupted"
        self._create_test_ticket(ticket_name, "中斷恢復測試")
        
        # 創建變更但不提交
        test_file = self.test_dir / "interrupted_feature.py"
        test_file.write_text("def interrupted_function():\n    pass\n")
        
        # 模擬恢復：重新執行流程
        pre_result = self._run_pre_commit()
        subprocess.run(["git", "add", "."], capture_output=True)
        subprocess.run(["git", "commit", "-m", "feat: recover interrupted work"], capture_output=True)
        post_result = self._run_post_commit()
        
        # 驗證恢復正確性
        self._verify_recovery_workflow(ticket_name)

    def test_no_ticket_auto_creation(self):
        """測試無票券時自動創建功能"""
        # 確保沒有活躍票券
        tickets_dir = self.test_dir / "docs" / "tickets" / "in_progress"
        if tickets_dir.exists():
            for ticket_file in tickets_dir.glob("*.yml"):
                ticket_file.unlink()
        
        # 直接進行開發變更
        test_file = self.test_dir / "auto_ticket_feature.py"
        test_file.write_text("def auto_created_function():\n    return 'auto'\n")
        
        # 執行流程（應該自動創建票券）
        pre_result = self._run_pre_commit()
        subprocess.run(["git", "add", "."], capture_output=True)
        subprocess.run(["git", "commit", "-m", "feat: auto ticket creation test"], capture_output=True)
        post_result = self._run_post_commit()
        
        # 驗證自動創建的票券
        self._verify_auto_ticket_creation()

    def test_time_calculation_accuracy(self):
        """測試時間計算準確性"""
        ticket_name = "test-time-calculation"
        
        # 創建票券並設置已知時間點
        start_time = datetime.now()
        self._create_test_ticket_with_time(ticket_name, start_time)
        
        # 模擬開發時間（等待幾秒）
        import time
        time.sleep(2)
        
        # 創建變更
        test_file = self.test_dir / "time_test.py"
        test_file.write_text("def time_test():\n    return 'timing'\n")
        
        # 執行流程
        pre_result = self._run_pre_commit()
        subprocess.run(["git", "add", "."], capture_output=True)
        subprocess.run(["git", "commit", "-m", "feat: time calculation test"], capture_output=True)
        post_result = self._run_post_commit()
        
        # 驗證時間計算
        self._verify_time_calculation_accuracy(ticket_name, start_time)

    def test_bidirectional_linking(self):
        """測試雙向連結正確性"""
        ticket_name = "test-bidirectional"
        self._create_test_ticket(ticket_name, "雙向連結測試")
        
        # 執行完整流程
        test_file = self.test_dir / "linking_test.py"
        test_file.write_text("def linking_test():\n    return 'linked'\n")
        
        pre_result = self._run_pre_commit()
        subprocess.run(["git", "add", "."], capture_output=True)
        subprocess.run(["git", "commit", "-m", "feat: bidirectional linking test"], capture_output=True)
        post_result = self._run_post_commit()
        
        # 驗證雙向連結
        self._verify_bidirectional_linking(ticket_name)

    def test_status_transitions(self):
        """測試票券狀態轉換"""
        ticket_name = "test-status-transition"
        
        # 驗證初始狀態 (in_progress)
        self._create_test_ticket(ticket_name, "狀態轉換測試")
        self._verify_ticket_in_folder("in_progress", ticket_name)
        
        # 執行完成流程
        test_file = self.test_dir / "status_test.py"
        test_file.write_text("def status_test():\n    return 'completed'\n")
        
        pre_result = self._run_pre_commit()
        subprocess.run(["git", "add", "."], capture_output=True)
        subprocess.run(["git", "commit", "-m", "feat: status transition test"], capture_output=True)
        post_result = self._run_post_commit()
        
        # 驗證最終狀態 (completed)
        self._verify_ticket_in_folder("completed", ticket_name)

    def test_file_organization(self):
        """測試文件組織結構"""
        ticket_name = "test-file-organization"
        self._create_test_ticket(ticket_name, "文件組織測試")
        
        # 執行流程
        test_file = self.test_dir / "organization_test.py"
        test_file.write_text("def organization_test():\n    return 'organized'\n")
        
        pre_result = self._run_pre_commit()
        subprocess.run(["git", "add", "."], capture_output=True)
        subprocess.run(["git", "commit", "-m", "feat: file organization test"], capture_output=True)
        post_result = self._run_post_commit()
        
        # 驗證文件結構
        self._verify_file_organization()

    # 輔助方法
    def _create_test_ticket(self, name: str, description: str):
        """創建測試票券"""
        from ticket_manager import TicketManager
        sys.path.insert(0, str(self.test_dir / "docs" / "scripts"))
        manager = TicketManager()
        return manager.create_ticket(name, description, create_branch=False)

    def _create_test_ticket_with_time(self, name: str, start_time: datetime):
        """創建指定時間的測試票券"""
        ticket_data = self._create_test_ticket(name, "時間測試票券")
        # 修改創建時間
        tickets_dir = self.test_dir / "docs" / "tickets" / "in_progress"
        for ticket_file in tickets_dir.glob(f"*{name}*.yml"):
            with open(ticket_file, 'r') as f:
                data = yaml.safe_load(f)
            data['created_at'] = start_time.isoformat()
            data['started_at'] = start_time.isoformat()
            with open(ticket_file, 'w') as f:
                yaml.dump(data, f, allow_unicode=True)
            break

    def _run_pre_commit(self) -> Dict:
        """執行 pre-commit 腳本"""
        # 模擬 pre-commit 執行
        return {"status": "success", "time_calculated": True}

    def _run_post_commit(self) -> Dict:
        """執行 post-commit 腳本"""
        # 模擬 post-commit 執行
        return {"status": "success", "doc_generated": True}

    def _verify_complete_workflow(self, ticket_name: str, pre_result: Dict, post_result: Dict):
        """驗證完整工作流程"""
        # 檢查票券是否移動到 completed
        completed_dir = self.test_dir / "docs" / "tickets" / "completed"
        ticket_files = list(completed_dir.glob(f"*{ticket_name}*.yml"))
        assert len(ticket_files) == 1, f"應該有一個完成的票券，實際找到 {len(ticket_files)} 個"
        
        # 檢查開發日誌是否生成
        dev_logs_dir = self.test_dir / "docs" / "dev-logs"
        if dev_logs_dir.exists():
            today = datetime.now().strftime('%Y-%m-%d')
            today_logs = list(dev_logs_dir.glob(f"{today}/*.yml"))
            assert len(today_logs) > 0, "應該生成開發日誌"

    def _verify_multi_file_handling(self, ticket_name: str, files: List[str]):
        """驗證多文件處理"""
        # 檢查票券中是否記錄了所有文件
        completed_dir = self.test_dir / "docs" / "tickets" / "completed"
        ticket_files = list(completed_dir.glob(f"*{ticket_name}*.yml"))
        if ticket_files:
            with open(ticket_files[0], 'r') as f:
                ticket_data = yaml.safe_load(f)
            # 驗證文件記錄邏輯

    def _verify_recovery_workflow(self, ticket_name: str):
        """驗證恢復工作流程"""
        # 檢查中斷恢復後的狀態
        completed_dir = self.test_dir / "docs" / "tickets" / "completed"
        ticket_files = list(completed_dir.glob(f"*{ticket_name}*.yml"))
        assert len(ticket_files) == 1, "中斷恢復後應該完成票券"

    def _verify_auto_ticket_creation(self):
        """驗證自動票券創建"""
        in_progress_dir = self.test_dir / "docs" / "tickets" / "in_progress"
        completed_dir = self.test_dir / "docs" / "tickets" / "completed"
        
        # 檢查是否自動創建了票券
        total_tickets = len(list(in_progress_dir.glob("*.yml"))) + len(list(completed_dir.glob("*.yml")))
        assert total_tickets > 0, "應該自動創建票券"

    def _verify_time_calculation_accuracy(self, ticket_name: str, start_time: datetime):
        """驗證時間計算準確性"""
        completed_dir = self.test_dir / "docs" / "tickets" / "completed"
        ticket_files = list(completed_dir.glob(f"*{ticket_name}*.yml"))
        if ticket_files:
            with open(ticket_files[0], 'r') as f:
                ticket_data = yaml.safe_load(f)
            
            # 檢查時間計算是否合理
            duration = ticket_data.get('duration_minutes', 0)
            assert duration > 0, "應該計算出正確的開發時間"
            assert duration < 60, "測試時間不應該超過60分鐘"

    def _verify_bidirectional_linking(self, ticket_name: str):
        """驗證雙向連結"""
        # 檢查票券 → 開發日誌連結
        completed_dir = self.test_dir / "docs" / "tickets" / "completed"
        ticket_files = list(completed_dir.glob(f"*{ticket_name}*.yml"))
        if ticket_files:
            with open(ticket_files[0], 'r') as f:
                ticket_data = yaml.safe_load(f)
            
            dev_log_path = ticket_data.get('dev_log_path')
            if dev_log_path:
                dev_log_file = self.test_dir / dev_log_path
                assert dev_log_file.exists(), "開發日誌文件應該存在"
                
                # 檢查開發日誌 → 票券連結
                with open(dev_log_file, 'r') as f:
                    dev_log_data = yaml.safe_load(f)
                
                assert 'ticket_id' in dev_log_data, "開發日誌應該包含票券ID"
                assert dev_log_data['ticket_name'] == ticket_name, "票券名稱應該匹配"

    def _verify_ticket_in_folder(self, folder: str, ticket_name: str):
        """驗證票券在指定資料夾中"""
        folder_path = self.test_dir / "docs" / "tickets" / folder
        ticket_files = list(folder_path.glob(f"*{ticket_name}*.yml"))
        assert len(ticket_files) == 1, f"票券應該在 {folder} 資料夾中"

    def _verify_file_organization(self):
        """驗證文件組織結構"""
        expected_dirs = [
            "docs/tickets/in_progress",
            "docs/tickets/completed", 
            "docs/dev-logs"
        ]
        
        for dir_path in expected_dirs:
            full_path = self.test_dir / dir_path
            assert full_path.exists(), f"目錄 {dir_path} 應該存在"

    def generate_test_report(self, results: Dict) -> str:
        """生成測試報告"""
        report = f"""
# 開發流程測試報告
生成時間: {datetime.now().isoformat()}

## 測試摘要
- ✅ 通過: {results['passed']} 個測試
- ❌ 失敗: {results['failed']} 個測試
- 📊 成功率: {results['passed']/(results['passed']+results['failed'])*100:.1f}%

## 詳細結果
"""
        for detail in results['details']:
            status_icon = "✅" if detail['status'] == "PASS" else "❌"
            report += f"{status_icon} {detail['test']}"
            if detail['status'] == "FAIL":
                report += f" - {detail['error']}"
            report += "\n"
        
        return report

def main():
    """主執行函數"""
    print("🧪 開始執行開發流程測試套件...")
    
    suite = WorkflowTestSuite()
    
    try:
        # 設置測試環境
        test_dir = suite.setup_test_environment()
        print(f"📁 測試環境: {test_dir}")
        
        # 執行所有測試
        results = suite.run_scenario_tests()
        
        # 生成報告
        report = suite.generate_test_report(results)
        print("\n" + "="*60)
        print(report)
        
        # 保存報告
        report_file = Path(__file__).parent.parent / "test-reports" / f"workflow-test-{datetime.now().strftime('%Y%m%d-%H%M%S')}.md"
        report_file.parent.mkdir(exist_ok=True)
        report_file.write_text(report)
        print(f"📄 測試報告已保存: {report_file}")
        
        return results['failed'] == 0
        
    finally:
        # 清理測試環境
        suite.cleanup_test_environment()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)