#!/usr/bin/env python3
"""
自動改進系統 - 根據反思分析自動優化文檔和流程
"""

import os
import yaml
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

class AutoImprover:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.improvements_path = self.project_root / "docs" / "handbook" / "improvements"
        self.handbook_path = self.project_root / "docs" / "handbook"
        
    def get_latest_improvement(self) -> Optional[Dict]:
        """獲取最新的改進建議"""
        yml_files = list(self.improvements_path.glob("improvement-*.yml"))
        if not yml_files:
            return None
            
        latest = max(yml_files, key=lambda x: x.stat().st_mtime)
        with open(latest, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    def apply_documentation_improvements(self, improvements: List[Dict]):
        """應用文檔改進"""
        troubleshooting_path = self.handbook_path / "guides" / "troubleshooting.md"
        
        # 讀取現有內容或創建新檔案
        if troubleshooting_path.exists():
            with open(troubleshooting_path, 'r', encoding='utf-8') as f:
                content = f.read()
        else:
            content = """# 故障排除指南

本指南收集了開發過程中常見的問題和解決方案。

## 🔧 常見問題

"""
        
        # 添加新問題
        for improvement in improvements:
            if improvement.get('action') == 'create_troubleshooting_doc':
                issue = improvement['issue']
                suggestion = improvement['suggestion']
                
                # 檢查是否已存在
                if issue not in content:
                    new_section = f"""
### {issue}

**解決方案**：
{suggestion}

**相關日誌**：
- {datetime.now().strftime('%Y-%m-%d')} - 自動添加

---
"""
                    content += new_section
        
        # 寫回檔案
        with open(troubleshooting_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ 已更新故障排除指南: {troubleshooting_path}")
    
    def enhance_dev_templates(self, improvements: List[Dict]):
        """改進開發模板"""
        for improvement in improvements:
            if improvement.get('action') == 'update_dev_template':
                # 根據超時階段，調整模板中的預期時間
                template_path = self.project_root / "docs" / "dev-logs" / "feature-log-template.yml"
                
                with open(template_path, 'r', encoding='utf-8') as f:
                    template = yaml.safe_load(f)
                
                # 添加提示
                if 'tips' not in template:
                    template['tips'] = []
                
                template['tips'].append(f"注意：{improvement['issue']}")
                
                with open(template_path, 'w', encoding='utf-8') as f:
                    yaml.dump(template, f, allow_unicode=True, default_flow_style=False)
                
                print(f"✅ 已更新開發模板")
    
    def create_pattern_library(self, patterns: Dict):
        """創建問題模式庫"""
        pattern_lib_path = self.handbook_path / "patterns" / "common-issues.md"
        pattern_lib_path.parent.mkdir(exist_ok=True)
        
        content = f"""# 常見問題模式庫

更新時間：{datetime.now().strftime('%Y-%m-%d')}

## 📊 問題頻率統計

| 問題類型 | 出現次數 | 建議優先級 |
|---------|---------|----------|
"""
        
        for issue, count in sorted(patterns['common_issues'].items(), key=lambda x: x[1], reverse=True):
            priority = "高" if count > 5 else "中" if count > 2 else "低"
            content += f"| {issue} | {count} | {priority} |\n"
        
        content += f"""

## 🚀 AI 效率趨勢

- 平均 AI 貢獻度：{patterns.get('ai_effectiveness', {}).get('average', 0):.1f}%
- 趨勢：{patterns.get('ai_effectiveness', {}).get('trend', 'unknown')}

## 💡 改進建議

基於以上模式，建議：
"""
        
        # 根據最常見問題生成建議
        top_issues = list(patterns['common_issues'].keys())[:3]
        for issue in top_issues:
            if issue == 'mock':
                content += "\n1. **Mock 工具庫**：建立統一的測試 mock 工具"
            elif issue == 'test':
                content += "\n2. **測試模板**：創建常用測試場景的模板"
            elif issue == 'state':
                content += "\n3. **狀態管理**：標準化狀態管理方案"
            elif issue == 'i18n':
                content += "\n4. **多語言檢查**：自動化多語言檔案檢查"
        
        with open(pattern_lib_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ 已創建問題模式庫: {pattern_lib_path}")
    
    def generate_ai_prompt_improvements(self, data: Dict):
        """生成 AI 提示詞改進建議"""
        prompt_file = self.handbook_path / "guides" / "ai-prompt-optimization.md"
        
        content = f"""# AI 提示詞優化指南

基於開發數據分析，以下是優化 AI 協作的建議。

## 📈 當前效率指標

- 平均 AI 貢獻度：{data.get('patterns', {}).get('ai_effectiveness', {}).get('average', 0):.1f}%
- 最常遇到的問題：{', '.join(list(data.get('patterns', {}).get('common_issues', {}).keys())[:3])}

## 🎯 優化建議

### 1. 針對常見問題的提示詞

"""
        
        # 根據問題生成提示詞建議
        for problem in data.get('problems', [])[:5]:
            if problem['type'] == 'low_coverage':
                content += """
**測試覆蓋率問題**
```
提示詞：請為這個功能寫完整的測試，包括：
- 正常情況測試
- 邊界條件測試  
- 錯誤處理測試
確保覆蓋率達到 85% 以上
```
"""
            elif problem['type'] == 'time_overrun':
                content += f"""
**{problem.get('phase', '開發')}階段超時**
```
提示詞：請快速實現{problem.get('phase', '功能')}，專注於：
- 核心功能實現
- 避免過度設計
- 使用現有模式
```
"""
        
        content += """
### 2. 通用優化原則

1. **明確約束條件**
   - 始終指定時間限制
   - 明確技術棧限制
   - 指出必須遵循的模式

2. **分階段執行**
   - 將大任務拆分為小步驟
   - 每步驟有明確產出
   - 及時驗證和調整

3. **利用現有資源**
   - 提醒 AI 查看 handbook/
   - 參考 stories/ 中的案例
   - 遵循 decisions/ 中的架構

---

*基於實際開發數據生成*
"""
        
        with open(prompt_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ 已生成 AI 提示詞優化指南: {prompt_file}")
    
    def run(self):
        """執行自動改進"""
        print("🔧 開始自動改進流程...")
        
        # 獲取最新改進建議
        latest = self.get_latest_improvement()
        if not latest:
            print("❌ 沒有找到改進建議")
            return
        
        # 應用各類改進
        if latest.get('improvements', {}).get('documentation'):
            self.apply_documentation_improvements(latest['improvements']['documentation'])
        
        if latest.get('improvements', {}).get('process'):
            self.enhance_dev_templates(latest['improvements']['process'])
        
        if latest.get('patterns'):
            self.create_pattern_library(latest['patterns'])
        
        # 生成 AI 優化建議
        self.generate_ai_prompt_improvements(latest)
        
        print("\n✨ 自動改進完成！")
        print("📚 請查看更新的文檔：")
        print("   - handbook/guides/troubleshooting.md")
        print("   - handbook/patterns/common-issues.md")
        print("   - handbook/guides/ai-prompt-optimization.md")

if __name__ == "__main__":
    improver = AutoImprover()
    improver.run()