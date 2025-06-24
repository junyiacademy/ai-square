#!/usr/bin/env python3
"""
文件使用分析器 - 統計 handbook 文件被引用的次數
"""

import os
import yaml
from pathlib import Path
from datetime import datetime
from collections import defaultdict, Counter
from typing import Dict, List

class DocumentUsageAnalyzer:
    def __init__(self):
        self.usage_stats = defaultdict(lambda: {
            'count': 0,
            'contexts': [],
            'tickets': [],
            'dates': []
        })
    
    def scan_tickets(self, tickets_dir: Path):
        """掃描所有票券中的文件參考"""
        print(f"🔍 掃描票券目錄: {tickets_dir}")
        
        # 掃描 in_progress
        in_progress_dir = tickets_dir / 'in_progress'
        if in_progress_dir.exists():
            for ticket_file in in_progress_dir.glob('*.yml'):
                self._scan_ticket_file(ticket_file)
                
        # 掃描 completed
        completed_dir = tickets_dir / 'completed'
        if completed_dir.exists():
            for date_dir in completed_dir.iterdir():
                if date_dir.is_dir():
                    for ticket_file in date_dir.glob('*.yml'):
                        self._scan_ticket_file(ticket_file)
    
    def scan_dev_logs(self, dev_logs_dir: Path):
        """掃描開發日誌中的文件參考"""
        print(f"🔍 掃描開發日誌: {dev_logs_dir}")
        
        for log_file in dev_logs_dir.rglob('*.yml'):
            self._scan_dev_log(log_file)
    
    def _scan_ticket_file(self, ticket_file: Path):
        """掃描單個票券檔案"""
        ticket_name = ticket_file.stem.replace('-ticket-', '-')
        
        try:
            with open(ticket_file, 'r', encoding='utf-8') as f:
                ticket_data = yaml.safe_load(f)
                
            if not ticket_data:
                return
                
            # 檢查 document_references 欄位
            if 'document_references' in ticket_data:
                for ref in ticket_data['document_references']:
                    self._record_usage(
                        doc_path=ref['path'],
                        context=ref.get('stage', 'ticket_creation'),
                        ticket=ticket_data.get('name', ticket_name),
                        timestamp=ref.get('timestamp', ticket_data.get('created_at'))
                    )
                    
        except Exception as e:
            print(f"  ⚠️ 無法解析 {ticket_file}: {e}")
    
    def _scan_dev_log(self, log_file: Path, ticket_name: str = None):
        """掃描開發日誌"""
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
                
            if not data:
                return
                
            # 檢查 document_references 區段
            if 'document_references' in data:
                refs = data['document_references'].get('consulted_documents', [])
                for ref in refs:
                    self._record_usage(
                        doc_path=ref['path'],
                        context='development',
                        ticket=ticket_name or log_file.parent.name,
                        timestamp=data.get('timestamp')
                    )
        except Exception as e:
            print(f"  ⚠️ 無法解析 {log_file}: {e}")
    
    def _scan_markdown_references(self, md_file: Path, ticket_name: str):
        """掃描 Markdown 文件中的參考區段"""
        with open(md_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 尋找參考文件區段
        if '## 📚 參考文件' in content or '## 參考文件' in content:
            # 簡單解析（可以改進）
            lines = content.split('\n')
            in_ref_section = False
            current_doc = None
            
            for line in lines:
                if '參考文件' in line and line.startswith('##'):
                    in_ref_section = True
                elif line.startswith('##') and in_ref_section:
                    break
                elif in_ref_section:
                    if line.startswith('### '):
                        current_doc = line[4:].strip()
                    elif line.startswith('- ') and current_doc:
                        # 提取原因
                        reason = line[2:].strip()
                        self._record_usage(
                            doc_path=current_doc,
                            context='specification',
                            ticket=ticket_name,
                            reason=reason
                        )
    
    def _record_usage(self, doc_path: str, context: str, ticket: str, 
                     timestamp: str = None, reason: str = None):
        """記錄文件使用"""
        stats = self.usage_stats[doc_path]
        stats['count'] += 1
        stats['contexts'].append(context)
        stats['tickets'].append(ticket)
        if timestamp:
            stats['dates'].append(timestamp)
    
    def generate_report(self) -> str:
        """生成使用報告"""
        report = ["# 📊 Handbook 文件使用統計報告"]
        report.append(f"\n生成時間：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("\n## 📈 使用次數排行榜\n")
        
        # 按使用次數排序
        sorted_docs = sorted(
            self.usage_stats.items(),
            key=lambda x: x[1]['count'],
            reverse=True
        )
        
        for rank, (doc_path, stats) in enumerate(sorted_docs, 1):
            report.append(f"### {rank}. {doc_path}")
            report.append(f"- **使用次數**: {stats['count']} 次")
            
            # 統計使用情境
            context_count = Counter(stats['contexts'])
            report.append(f"- **使用情境**: {dict(context_count)}")
            
            # 相關票券
            unique_tickets = list(set(stats['tickets']))
            if len(unique_tickets) <= 5:
                report.append(f"- **相關票券**: {', '.join(unique_tickets)}")
            else:
                report.append(f"- **相關票券**: {len(unique_tickets)} 個票券")
            
            report.append("")
        
        # 分類統計
        report.append("\n## 📁 分類統計\n")
        categories = defaultdict(int)
        for doc_path, stats in self.usage_stats.items():
            if '01-context' in doc_path:
                categories['背景知識'] += stats['count']
            elif '02-development-guides' in doc_path:
                categories['開發指南'] += stats['count']
            elif '03-technical-references' in doc_path:
                categories['技術參考'] += stats['count']
            elif 'workflows' in doc_path:
                categories['工作流程'] += stats['count']
        
        for category, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
            report.append(f"- **{category}**: {count} 次")
        
        # 未使用的文件
        report.append("\n## ❌ 未被引用的文件\n")
        handbook_dir = Path("docs/handbook")
        all_docs = set()
        if handbook_dir.exists():
            for md_file in handbook_dir.rglob("*.md"):
                rel_path = str(md_file.relative_to(Path(".")))
                all_docs.add(rel_path)
        
        unused_docs = all_docs - set(self.usage_stats.keys())
        if unused_docs:
            for doc in sorted(unused_docs):
                report.append(f"- {doc}")
        else:
            report.append("*所有文件都有被引用！*")
        
        return "\n".join(report)
    
    def save_report(self, output_path: Path):
        """保存報告"""
        report = self.generate_report()
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"✅ 報告已保存到: {output_path}")

def main():
    """主函數"""
    analyzer = DocumentUsageAnalyzer()
    
    # 掃描票券
    tickets_dir = Path("docs/tickets")
    if tickets_dir.exists():
        analyzer.scan_tickets(tickets_dir)
    
    # 掃描開發日誌
    dev_logs_dir = Path("docs/dev-logs")
    if dev_logs_dir.exists():
        analyzer.scan_dev_logs(dev_logs_dir)
    
    # 生成報告
    print("\n📊 生成使用統計報告...")
    report = analyzer.generate_report()
    print(report)
    
    # 保存報告
    output_path = Path("docs/handbook/document-usage-report.md")
    analyzer.save_report(output_path)

if __name__ == "__main__":
    main()