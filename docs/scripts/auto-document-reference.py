#!/usr/bin/env python3
"""
自動文件參考系統 - 在開發過程中自動記錄參考的文件
"""

import os
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Dict

# 加入 document reference tracker
sys.path.append(str(Path(__file__).parent))
from document_reference_tracker import DocumentReferenceTracker, SmartReferenceTracker

class AutoDocumentReference:
    """自動追蹤和記錄文件參考"""
    
    def __init__(self):
        self.tracker = DocumentReferenceTracker()
        self.ticket_path = None
        
    def setup_for_ticket(self, ticket_path: Path):
        """為特定票券設置追蹤"""
        self.ticket_path = ticket_path
        self.tracker = DocumentReferenceTracker()
        
    def auto_track_ticket_creation(self, ticket_type: str):
        """票券創建時自動追蹤相關文件"""
        refs = SmartReferenceTracker.get_references_for_task('ticket_creation', ticket_type)
        
        for ref in refs:
            self.tracker.add_reference(
                doc_path=ref['doc'],
                context='ticket_creation',
                reason=ref['reason']
            )
        
        # 根據票券類型添加額外參考
        if ticket_type == 'feature':
            self.tracker.add_reference(
                'docs/handbook/01-context/product-vision.md',
                'feature_planning',
                '理解產品願景和功能目標'
            )
        elif ticket_type == 'bug':
            self.tracker.add_reference(
                'docs/handbook/03-technical-references/technical/test-strategy.md',
                'bug_analysis',
                '參考測試策略設計重現步驟'
            )
            
    def track_development_stage(self, stage: str, files: List[str] = None):
        """追蹤開發階段的文件參考"""
        
        # 根據開發階段推薦文件
        stage_references = {
            'frontend_development': [
                ('docs/handbook/02-development-guides/guides/frontend-guide.md', '遵循前端開發規範'),
                ('docs/handbook/03-technical-references/design-patterns/frontend/frontend-patterns.md', '應用前端設計模式')
            ],
            'api_development': [
                ('docs/handbook/03-technical-references/design-patterns/architecture/current/api-design.md', '遵循 API 設計規範'),
                ('docs/handbook/01-context/business-rules.md', '確保 API 符合業務規則')
            ],
            'test_writing': [
                ('docs/handbook/03-technical-references/core-practices/tdd.md', '應用 TDD 原則'),
                ('docs/handbook/03-technical-references/technical/test-strategy.md', '遵循測試策略')
            ],
            'refactoring': [
                ('docs/handbook/03-technical-references/design-patterns/', '參考設計模式'),
                ('docs/handbook/03-technical-references/core-practices/', '遵循核心實踐')
            ]
        }
        
        if stage in stage_references:
            for doc, reason in stage_references[stage]:
                self.tracker.add_reference(doc, stage, reason)
                
        # 根據修改的文件類型添加參考
        if files:
            for file in files:
                if 'frontend/' in file:
                    self.tracker.add_reference(
                        'docs/handbook/02-development-guides/guides/frontend-guide.md',
                        'file_modification',
                        f'修改前端文件 {file}'
                    )
                elif 'backend/' in file:
                    self.tracker.add_reference(
                        'docs/handbook/03-technical-references/design-patterns/architecture/current/api-design.md',
                        'file_modification', 
                        f'修改後端文件 {file}'
                    )
                    
    def save_references(self):
        """保存參考記錄"""
        if not self.ticket_path:
            print("⚠️ 未設置票券路徑")
            return
            
        # 保存到票券
        ref_file = self.tracker.save_to_ticket(self.ticket_path)
        print(f"✅ 文件參考已保存到: {ref_file}")
        
        # 更新 spec.md
        spec_file = self.ticket_path / "spec.md"
        if spec_file.exists():
            with open(spec_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # 檢查是否已有參考區段
            if '## 📚 參考文件' not in content:
                references_md = self.tracker.format_references_for_markdown()
                content += "\n" + references_md
                
                with open(spec_file, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ 已更新 spec.md 的參考文件區段")
                
    def generate_usage_report(self):
        """生成文件使用報告"""
        from document_usage_analyzer import DocumentUsageAnalyzer
        
        analyzer = DocumentUsageAnalyzer()
        analyzer.scan_tickets(Path("docs/tickets"))
        analyzer.scan_dev_logs(Path("docs/dev-logs"))
        
        report_path = Path("docs/handbook/document-usage-report.md")
        analyzer.save_report(report_path)
        print(f"📊 使用報告已生成: {report_path}")

def main():
    """示範自動文件參考系統"""
    auto_ref = AutoDocumentReference()
    
    print("🤖 自動文件參考系統示範")
    print("=" * 50)
    
    # 模擬票券創建
    print("\n1️⃣ 創建功能票券時自動追蹤：")
    auto_ref.auto_track_ticket_creation('feature')
    
    # 模擬開發階段
    print("\n2️⃣ 前端開發階段：")
    auto_ref.track_development_stage('frontend_development', ['frontend/components/Header.tsx'])
    
    print("\n3️⃣ 編寫測試階段：")
    auto_ref.track_development_stage('test_writing')
    
    # 顯示追蹤結果
    print("\n📊 文件參考摘要：")
    summary = auto_ref.tracker.generate_summary()
    for doc, info in summary.items():
        print(f"\n📄 {doc}")
        print(f"   被參考 {info['count']} 次")
        print(f"   使用情境：{', '.join(set(info['contexts']))}")
    
    # 顯示 Markdown 格式
    print("\n📝 Markdown 格式：")
    print(auto_ref.tracker.format_references_for_markdown())

if __name__ == "__main__":
    main()