#!/usr/bin/env python3
"""
文件參考追蹤器 - 記錄開發過程中參考的文件
"""

import os
import yaml
from pathlib import Path
from datetime import datetime
from typing import List, Dict

class DocumentReferenceTracker:
    def __init__(self):
        self.references = []
        self.ticket_path = None
        
    def add_reference(self, doc_path: str, context: str, reason: str):
        """添加文件參考記錄"""
        reference = {
            "document": doc_path,
            "context": context,
            "reason": reason,
            "timestamp": datetime.now().isoformat()
        }
        self.references.append(reference)
        return reference
    
    def save_to_ticket(self, ticket_path: Path):
        """保存參考記錄到票券"""
        references_file = ticket_path / "document-references.yml"
        
        data = {
            "references": self.references,
            "summary": self.generate_summary(),
            "generated_at": datetime.now().isoformat()
        }
        
        with open(references_file, 'w', encoding='utf-8') as f:
            yaml.dump(data, f, allow_unicode=True, default_flow_style=False)
        
        return references_file
    
    def save_to_dev_log(self, dev_log_path: Path):
        """添加參考記錄到開發日誌"""
        if not dev_log_path.exists():
            return
            
        with open(dev_log_path, 'r', encoding='utf-8') as f:
            dev_log = yaml.safe_load(f) or {}
        
        # 添加文件參考區段
        dev_log['document_references'] = {
            'consulted_documents': [
                {
                    'path': ref['document'],
                    'reason': ref['reason']
                }
                for ref in self.references
            ]
        }
        
        with open(dev_log_path, 'w', encoding='utf-8') as f:
            yaml.dump(dev_log, f, allow_unicode=True, default_flow_style=False)
    
    def generate_summary(self) -> Dict:
        """生成參考摘要"""
        summary = {}
        for ref in self.references:
            doc = ref['document']
            if doc not in summary:
                summary[doc] = {
                    'count': 0,
                    'contexts': []
                }
            summary[doc]['count'] += 1
            summary[doc]['contexts'].append(ref['context'])
        
        return summary
    
    def format_references_for_markdown(self) -> str:
        """格式化參考記錄為 Markdown"""
        if not self.references:
            return ""
        
        md = "\n## 📚 參考文件\n\n"
        
        # 按文件分組
        by_document = {}
        for ref in self.references:
            doc = ref['document']
            if doc not in by_document:
                by_document[doc] = []
            by_document[doc].append(ref)
        
        for doc, refs in by_document.items():
            md += f"### {doc}\n"
            for ref in refs:
                md += f"- **{ref['context']}**: {ref['reason']}\n"
            md += "\n"
        
        return md

class SmartReferenceTracker:
    """智能參考追蹤 - 根據操作自動記錄參考"""
    
    # 預定義的參考規則
    REFERENCE_RULES = {
        'ticket_creation': [
            {
                'doc': 'docs/handbook/workflows/TICKET_DRIVEN_DEVELOPMENT.md',
                'reason': '遵循票券驅動開發流程，了解票券結構與流程'
            },
            {
                'doc': 'docs/handbook/01-context/business-rules.md',
                'reason': '確保遵守必要的業務規則和限制'
            },
            {
                'doc': 'docs/handbook/01-getting-started/workflow.md',
                'reason': '了解整體開發工作流程'
            }
        ],
        'feature_development': [
            {
                'doc': 'docs/handbook/01-context/product-vision.md',
                'reason': '理解產品目標和方向'
            },
            {
                'doc': 'docs/handbook/01-context/domain-knowledge.md',
                'reason': '參考 AI 素養領域知識'
            },
            {
                'doc': 'docs/handbook/02-development-guides/guides/frontend-guide.md',
                'reason': '遵循前端開發規範'
            }
        ],
        'test_design': [
            {
                'doc': 'docs/handbook/03-technical-references/core-practices/tdd.md',
                'reason': '應用測試驅動開發原則'
            },
            {
                'doc': 'docs/handbook/03-technical-references/technical/test-strategy.md',
                'reason': '遵循測試策略指南'
            }
        ],
        'commit_process': [
            {
                'doc': 'docs/handbook/02-development-guides/commit-guide.md',
                'reason': '遵循提交規範'
            }
        ],
        'refactoring': [
            {
                'doc': 'docs/handbook/03-technical-references/design-patterns/',
                'reason': '參考設計模式最佳實踐'
            }
        ]
    }
    
    @classmethod
    def get_references_for_task(cls, task_type: str, ticket_type: str = None) -> List[Dict]:
        """根據任務類型獲取應該參考的文件"""
        references = []
        
        # 基礎參考
        if task_type == 'ticket_creation':
            references.extend(cls.REFERENCE_RULES['ticket_creation'])
        
        # 根據票券類型添加特定參考
        if ticket_type == 'feature':
            references.extend(cls.REFERENCE_RULES['feature_development'])
        elif ticket_type == 'bug':
            references.append({
                'doc': 'docs/handbook/03-technical-references/core-practices/tdd.md',
                'reason': '編寫測試用例重現 bug'
            })
            references.append({
                'doc': 'docs/handbook/03-technical-references/technical/test-strategy.md',
                'reason': '參考測試策略設計回歸測試'
            })
        elif ticket_type == 'refactor':
            references.extend(cls.REFERENCE_RULES['refactoring'])
            references.append({
                'doc': 'docs/handbook/03-technical-references/core-practices/',
                'reason': '參考核心實踐確保重構品質'
            })
        
        # 測試相關
        if 'test' in task_type:
            references.extend(cls.REFERENCE_RULES['test_design'])
        
        return references

def integrate_with_ticket_creation(ticket_path: Path, ticket_type: str):
    """整合到票券創建流程"""
    tracker = DocumentReferenceTracker()
    
    # 獲取應該參考的文件
    refs = SmartReferenceTracker.get_references_for_task('ticket_creation', ticket_type)
    
    # 記錄參考
    for ref in refs:
        tracker.add_reference(
            doc_path=ref['doc'],
            context='ticket_creation',
            reason=ref['reason']
        )
    
    # 保存到票券
    tracker.save_to_ticket(ticket_path)
    
    # 更新 spec.md
    spec_file = ticket_path / "spec.md"
    if spec_file.exists():
        with open(spec_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 添加參考文件區段
        references_md = tracker.format_references_for_markdown()
        content += references_md
        
        with open(spec_file, 'w', encoding='utf-8') as f:
            f.write(content)

def main():
    """測試參考追蹤器"""
    tracker = DocumentReferenceTracker()
    
    # 模擬開發過程
    print("🔍 模擬開發過程中的文件參考...\n")
    
    # 1. 創建票券時
    tracker.add_reference(
        "docs/handbook/workflows/TICKET_DRIVEN_DEVELOPMENT.md",
        "ticket_creation",
        "遵循票券驅動開發流程"
    )
    
    # 2. 開發功能時
    tracker.add_reference(
        "docs/handbook/01-context/business-rules.md",
        "feature_development",
        "確保支援 9 種語言規則"
    )
    
    tracker.add_reference(
        "docs/handbook/01-context/domain-knowledge.md",
        "feature_development",
        "理解 AI 素養四大領域結構"
    )
    
    # 3. 設計測試時
    tracker.add_reference(
        "docs/handbook/03-technical-references/core-practices/tdd.md",
        "test_design",
        "應用 TDD 原則設計測試案例"
    )
    
    # 顯示摘要
    print("📊 文件參考摘要：")
    summary = tracker.generate_summary()
    for doc, info in summary.items():
        print(f"\n📄 {doc}")
        print(f"   被參考 {info['count']} 次")
        print(f"   使用情境：{', '.join(info['contexts'])}")
    
    # 顯示 Markdown 格式
    print("\n📝 Markdown 格式：")
    print(tracker.format_references_for_markdown())

if __name__ == "__main__":
    main()