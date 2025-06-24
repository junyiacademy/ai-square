#!/usr/bin/env python3
"""
解析 commit-guide.md 的規範內容
"""

import re
from pathlib import Path
from typing import Dict, List

class CommitGuideParser:
    def __init__(self):
        self.guide_path = Path("docs/handbook/02-development-guides/commit-guide.md")
        self.content = self._load_guide()
        
    def _load_guide(self) -> str:
        """載入指南內容"""
        if self.guide_path.exists():
            with open(self.guide_path, 'r', encoding='utf-8') as f:
                return f.read()
        return ""
    
    def get_commit_types(self) -> Dict[str, str]:
        """提取 commit 類型定義"""
        types = {}
        
        # 尋找 Type 類型區段
        type_section = re.search(r'### Type 類型\n(.*?)(?=###|\Z)', self.content, re.DOTALL)
        if type_section:
            lines = type_section.group(1).strip().split('\n')
            for line in lines:
                match = re.match(r'- `(\w+)`: (.+)', line)
                if match:
                    types[match.group(1)] = match.group(2)
        
        return types
    
    def get_core_principles(self) -> List[str]:
        """提取核心原則"""
        principles = []
        
        # 尋找核心原則區段
        principles_section = re.search(r'## 🎯 核心原則\n\n(.*?)(?=##|\Z)', self.content, re.DOTALL)
        if principles_section:
            lines = principles_section.group(1).strip().split('\n')
            for line in lines:
                if line.startswith(('1.', '2.', '3.', '4.', '5.')):
                    principles.append(line[3:].strip('* '))
        
        return principles
    
    def get_commit_format(self) -> str:
        """提取 commit message 格式"""
        format_section = re.search(r'### 基本格式\n```\n(.*?)\n```', self.content, re.DOTALL)
        if format_section:
            return format_section.group(1).strip()
        return "<type>(<scope>): <subject>"
    
    def get_checklist(self) -> List[str]:
        """提取檢查清單"""
        checklist = []
        
        # 從自動執行的動作區段提取
        auto_section = re.search(r'### 3\. 自動執行的動作\n\n(.*?)(?=##|\Z)', self.content, re.DOTALL)
        if auto_section:
            content = auto_section.group(1)
            # 提取主要檢查項目
            checks = re.findall(r'\d+\. \*\*(.*?)\*\*', content)
            checklist.extend([f"✓ {check}" for check in checks])
        
        return checklist

def main():
    """測試解析器"""
    parser = CommitGuideParser()
    
    print("📚 從 commit-guide.md 提取的規範：\n")
    
    print("1. Commit 類型：")
    types = parser.get_commit_types()
    for type_name, desc in types.items():
        print(f"   • {type_name}: {desc}")
    
    print("\n2. 核心原則：")
    for principle in parser.get_core_principles():
        print(f"   • {principle}")
    
    print("\n3. Commit 格式：")
    print(f"   {parser.get_commit_format()}")
    
    print("\n4. 檢查清單：")
    for item in parser.get_checklist():
        print(f"   {item}")

if __name__ == "__main__":
    main()