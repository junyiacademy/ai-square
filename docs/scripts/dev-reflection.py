#!/usr/bin/env python3
"""
開發反思系統 - 自動分析問題並提出改進建議
"""

import os
import yaml
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

class DevReflection:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.dev_logs_path = self.project_root / "docs" / "dev-logs"
        self.improvements_path = self.project_root / "docs" / "handbook" / "improvements"
        self.improvements_path.mkdir(parents=True, exist_ok=True)
        
    def get_recent_log(self) -> Optional[Dict]:
        """獲取最新的開發日誌"""
        logs = []
        for file in self.dev_logs_path.glob("*.yml"):
            if not file.name.endswith('-template.yml'):
                with open(file, 'r', encoding='utf-8') as f:
                    log = yaml.safe_load(f)
                    log['filename'] = file.name
                    logs.append(log)
        
        if not logs:
            return None
            
        # 按日期排序，獲取最新的
        logs.sort(key=lambda x: x.get('date', ''), reverse=True)
        return logs[0]
    
    def analyze_problems(self, log: Dict) -> List[Dict]:
        """分析開發過程中的問題"""
        problems = []
        
        # 1. 時間分析
        if 'timeline' in log:
            for phase in log['timeline']:
                if phase.get('duration', 0) > phase.get('expected_duration', 60):
                    problems.append({
                        'type': 'time_overrun',
                        'phase': phase['phase'],
                        'actual': phase['duration'],
                        'expected': phase.get('expected_duration', 60),
                        'severity': 'medium'
                    })
        
        # 2. 測試覆蓋率分析
        if 'metrics' in log:
            coverage = log['metrics'].get('test_coverage', 100)
            if coverage < 80:
                problems.append({
                    'type': 'low_coverage',
                    'coverage': coverage,
                    'target': 80,
                    'severity': 'high'
                })
        
        # 3. 學習點分析
        if 'learnings' in log:
            for learning in log['learnings']:
                if any(word in learning.lower() for word in ['問題', 'issue', 'error', '錯誤', 'fail']):
                    problems.append({
                        'type': 'recurring_issue',
                        'description': learning,
                        'severity': 'low'
                    })
        
        return problems
    
    def generate_improvements(self, problems: List[Dict]) -> Dict:
        """根據問題生成改進建議"""
        improvements = {
            'documentation': [],
            'tooling': [],
            'process': [],
            'training': []
        }
        
        for problem in problems:
            if problem['type'] == 'time_overrun':
                improvements['process'].append({
                    'issue': f"{problem['phase']} 階段超時",
                    'suggestion': f"考慮拆分 {problem['phase']} 為更小的步驟",
                    'action': 'update_dev_template'
                })
            
            elif problem['type'] == 'low_coverage':
                improvements['tooling'].append({
                    'issue': f"測試覆蓋率只有 {problem['coverage']}%",
                    'suggestion': "加入 pre-commit hook 檢查覆蓋率",
                    'action': 'enhance_commit_guide'
                })
            
            elif problem['type'] == 'recurring_issue':
                improvements['documentation'].append({
                    'issue': problem['description'],
                    'suggestion': "將此問題加入 troubleshooting 指南",
                    'action': 'create_troubleshooting_doc'
                })
        
        return improvements
    
    def check_patterns(self) -> Dict:
        """檢查跨多個開發日誌的模式"""
        all_logs = []
        for file in self.dev_logs_path.glob("*.yml"):
            if not file.name.endswith('-template.yml'):
                with open(file, 'r', encoding='utf-8') as f:
                    all_logs.append(yaml.safe_load(f))
        
        patterns = {
            'common_issues': {},
            'time_trends': {},
            'ai_effectiveness': []
        }
        
        # 統計常見問題
        for log in all_logs:
            if 'learnings' in log:
                for learning in log['learnings']:
                    key_words = ['mock', 'test', 'state', 'sync', 'i18n', 'type']
                    for word in key_words:
                        if word in learning.lower():
                            patterns['common_issues'][word] = patterns['common_issues'].get(word, 0) + 1
        
        # AI 效率趨勢
        ai_percentages = [log['metrics'].get('ai_percentage', 0) for log in all_logs if 'metrics' in log]
        if ai_percentages:
            patterns['ai_effectiveness'] = {
                'average': sum(ai_percentages) / len(ai_percentages),
                'trend': 'improving' if ai_percentages[-3:] > ai_percentages[:3] else 'stable'
            }
        
        return patterns
    
    def generate_story_if_needed(self, log: Dict, problems: List[Dict], patterns: Dict) -> bool:
        """如果有值得分享的洞察，生成故事"""
        # 判斷是否值得寫成故事的條件
        story_triggers = {
            'first_time_problem': False,  # 首次遇到的問題類型
            'efficiency_breakthrough': False,  # 效率突破
            'pattern_discovery': False,  # 發現新模式
            'collaboration_insight': False,  # 協作洞察
            'creative_solution': False  # 創意解決方案
        }
        
        # 檢查觸發條件
        if problems:
            # 檢查是否有新類型的問題
            known_problems = ['mock', 'test', 'state', 'sync', 'type']
            for problem in problems:
                desc = problem.get('description', '').lower()
                if not any(known in desc for known in known_problems):
                    story_triggers['first_time_problem'] = True
                    break
        
        # 檢查效率突破
        if log.get('metrics', {}).get('ai_percentage', 0) > 85:
            story_triggers['efficiency_breakthrough'] = True
        
        # 檢查是否發現新模式
        if patterns.get('common_issues'):
            new_pattern_threshold = 3
            for issue, count in patterns['common_issues'].items():
                if count == new_pattern_threshold:  # 剛好達到閾值
                    story_triggers['pattern_discovery'] = True
                    break
        
        # 檢查協作洞察
        if 'learnings' in log:
            collaboration_keywords = ['配對', 'pair', '協作', 'collaboration', '互補']
            for learning in log['learnings']:
                if any(keyword in learning for keyword in collaboration_keywords):
                    story_triggers['collaboration_insight'] = True
                    break
        
        # 如果有任何觸發條件，生成故事
        if any(story_triggers.values()):
            self.create_story(log, problems, patterns, story_triggers)
            return True
        return False
    
    def create_story(self, log: Dict, problems: List[Dict], patterns: Dict, triggers: Dict):
        """創建開發故事"""
        date = log.get('date', datetime.now().strftime('%Y-%m-%d'))
        title = log.get('title', 'unknown')
        story_type = self.determine_story_type(log, triggers)
        
        # 生成檔名
        filename = f"{date}-{title.lower().replace(' ', '-')}-insight.md"
        story_path = self.project_root / "docs" / "stories" / story_type / filename
        story_path.parent.mkdir(exist_ok=True)
        
        # 生成故事內容
        story = f"""# {title}：一個關於{self.get_story_theme(triggers)}的故事

## 📅 背景
- **日期**: {date}
- **開發者**: {log.get('developer', 'AI + Human')}
- **類型**: {log.get('type', 'feature')}

## 🎭 故事緣起

"""
        
        # 根據觸發器生成不同的故事開頭
        if triggers['first_time_problem']:
            story += f"""今天遇到了一個前所未見的問題。在開發「{title}」時，我們發現...\n\n"""
        elif triggers['efficiency_breakthrough']:
            story += f"""這次開發創下了新紀錄！AI 貢獻度達到 {log.get('metrics', {}).get('ai_percentage', 0)}%，讓我們回顧這次高效協作的秘訣...\n\n"""
        elif triggers['collaboration_insight']:
            story += f"""人機協作的美妙之處，就在於互補。這次開發完美詮釋了這一點...\n\n"""
        
        # 詳細描述
        story += "## 💡 關鍵洞察\n\n"
        
        # 從學習中提取洞察
        if 'learnings' in log:
            for i, learning in enumerate(log['learnings'], 1):
                story += f"{i}. **{learning}**\n"
                # 為每個學習點添加詳細說明
                if '測試' in learning or 'test' in learning.lower():
                    story += "   - 這提醒我們測試環境的特殊性需要額外注意\n"
                elif 'AI' in learning:
                    story += "   - AI 在這方面展現了獨特的優勢\n"
                elif '效率' in learning or 'efficiency' in learning.lower():
                    story += "   - 效率的提升來自於正確的任務分配\n"
                story += "\n"
        
        # 問題分析
        if problems:
            story += "## 🔍 遇到的挑戰\n\n"
            for problem in problems[:3]:  # 只取前3個重要問題
                story += f"### {problem['type']}\n"
                story += f"{problem.get('description', '詳見分析')}\n\n"
                story += "**解決過程**：\n"
                
                # 根據問題類型給出解決過程
                if problem['type'] == 'time_overrun':
                    story += f"- 原計劃 {problem.get('expected')} 分鐘，實際花了 {problem.get('actual')} 分鐘\n"
                    story += "- 分析發現是因為低估了複雜度\n"
                    story += "- 未來會將此類任務預估時間 × 1.5\n"
                elif problem['type'] == 'low_coverage':
                    story += f"- 測試覆蓋率只有 {problem.get('coverage')}%\n"
                    story += "- 補充了邊界條件和錯誤處理的測試\n"
                    story += "- 最終達到目標覆蓋率\n"
                story += "\n"
        
        # 模式發現
        if patterns and triggers['pattern_discovery']:
            story += "## 📊 模式發現\n\n"
            story += "通過分析多個專案，我們發現了一些有趣的模式：\n\n"
            for issue, count in sorted(patterns['common_issues'].items(), key=lambda x: x[1], reverse=True)[:3]:
                story += f"- **{issue}** 問題出現了 {count} 次\n"
            story += "\n這告訴我們需要建立標準解決方案。\n\n"
        
        # 效率分析
        if triggers['efficiency_breakthrough']:
            story += "## 🚀 效率突破\n\n"
            metrics = log.get('metrics', {})
            story += f"""這次開發的效率指標：
- 總時間：{metrics.get('total_time', 0)} 分鐘
- AI 貢獻：{metrics.get('ai_percentage', 0)}%
- 程式碼行數：{metrics.get('lines_of_code', 0)}

成功的關鍵在於：
1. 明確的任務劃分
2. AI 處理重複性工作
3. 人類專注於業務邏輯
"""
        
        # 人機協作的反思
        story += "\n## 🤝 人機協作反思\n\n"
        
        # 根據數據生成反思
        ai_percentage = log.get('metrics', {}).get('ai_percentage', 0)
        if ai_percentage > 80:
            story += "### AI 主導的開發\n"
            story += "這次開發中，AI 承擔了大部分工作。這種模式適合：\n"
            story += "- 標準化的功能實作\n- 大量重複的程式碼生成\n- 文檔和測試編寫\n\n"
        elif ai_percentage > 50:
            story += "### 平衡的協作\n"
            story += "AI 和人類各司其職，達到了理想的平衡：\n"
            story += "- AI：快速實作和測試\n- 人類：架構設計和業務邏輯\n\n"
        else:
            story += "### 人類主導的開發\n"
            story += "這次開發更依賴人類的創造力：\n"
            story += "- 複雜的業務邏輯需要人類把關\n- AI 作為輔助工具提供支援\n\n"
        
        # 未來建議
        story += "## 📝 給未來的建議\n\n"
        story += "基於這次經驗，我們建議：\n\n"
        
        suggestions = []
        if triggers['first_time_problem']:
            suggestions.append("1. 將新發現的問題類型加入檢查清單")
        if triggers['efficiency_breakthrough']:
            suggestions.append("2. 複製這次的成功模式到類似功能")
        if triggers['pattern_discovery']:
            suggestions.append("3. 建立工具庫解決重複出現的問題")
        if triggers['collaboration_insight']:
            suggestions.append("4. 優化人機任務分配策略")
        
        story += '\n'.join(suggestions) if suggestions else "- 保持現有的開發模式\n- 持續優化協作流程\n"
        
        # 結語
        story += f"""

---

## 🎬 故事結語

每一次開發都是一次學習機會。{'這次的效率突破' if triggers['efficiency_breakthrough'] else '這次的經歷'}證明了人機協作的潛力。

重要的不是 AI 能做多少，而是人類和 AI 如何互補，創造出 1+1>2 的效果。

**關鍵詞**: #{log.get('type', 'feature')} #人機協作 #{self.get_story_theme(triggers)}

---

*由開發反思系統自動生成於 {datetime.now().strftime('%Y-%m-%d %H:%M')}*
"""
        
        # 寫入檔案
        with open(story_path, 'w', encoding='utf-8') as f:
            f.write(story)
        
        print(f"📖 已生成開發故事: {story_path}")
    
    def determine_story_type(self, log: Dict, triggers: Dict) -> str:
        """決定故事類型"""
        if log.get('type') == 'bug':
            return 'debugging'
        elif log.get('type') == 'refactor':
            return 'refactoring'
        else:
            return 'features'
    
    def get_story_theme(self, triggers: Dict) -> str:
        """獲取故事主題"""
        if triggers['efficiency_breakthrough']:
            return '效率突破'
        elif triggers['first_time_problem']:
            return '首次挑戰'
        elif triggers['pattern_discovery']:
            return '模式發現'
        elif triggers['collaboration_insight']:
            return '協作智慧'
        else:
            return '開發洞察'
    
    def create_improvement_doc(self, log: Dict, problems: List[Dict], improvements: Dict, patterns: Dict):
        """創建改進文檔"""
        timestamp = datetime.now().strftime("%Y-%m-%d-%H%M")
        
        doc = f"""# 開發改進建議 - {timestamp}

## 📊 本次開發分析

**專案**: {log.get('title', 'Unknown')}  
**日期**: {log.get('date', 'Unknown')}  
**總時間**: {log.get('metrics', {}).get('total_time', 0)} 分鐘  
**AI 貢獻**: {log.get('metrics', {}).get('ai_percentage', 0)}%

## 🔍 發現的問題

"""
        
        for i, problem in enumerate(problems, 1):
            doc += f"{i}. **{problem['type']}** (嚴重度: {problem['severity']})\n"
            doc += f"   - {problem.get('description', '詳見分析')}\n\n"
        
        doc += """## 💡 改進建議

### 文檔改進
"""
        for item in improvements['documentation']:
            doc += f"- **問題**: {item['issue']}\n"
            doc += f"  **建議**: {item['suggestion']}\n"
            doc += f"  **行動**: `{item['action']}`\n\n"
        
        doc += """### 工具改進
"""
        for item in improvements['tooling']:
            doc += f"- **問題**: {item['issue']}\n"
            doc += f"  **建議**: {item['suggestion']}\n"
            doc += f"  **行動**: `{item['action']}`\n\n"
        
        doc += """### 流程改進
"""
        for item in improvements['process']:
            doc += f"- **問題**: {item['issue']}\n"
            doc += f"  **建議**: {item['suggestion']}\n"
            doc += f"  **行動**: `{item['action']}`\n\n"
        
        doc += """## 📈 跨專案模式分析

### 常見問題頻率
"""
        for issue, count in sorted(patterns['common_issues'].items(), key=lambda x: x[1], reverse=True):
            doc += f"- {issue}: {count} 次\n"
        
        if patterns.get('ai_effectiveness'):
            doc += f"""
### AI 效率分析
- 平均 AI 貢獻度: {patterns['ai_effectiveness']['average']:.1f}%
- 趨勢: {patterns['ai_effectiveness']['trend']}
"""
        
        doc += """
## 🎯 建議的立即行動

1. **短期** (本週)
   - 更新最常見問題的文檔
   - 調整開發模板減少超時

2. **中期** (本月)  
   - 建立問題模式庫
   - 優化 AI 提示詞

3. **長期** (季度)
   - 開發自動化改進工具
   - 建立知識圖譜

---

*此文檔由開發反思系統自動生成*
"""
        
        # 保存文檔
        output_file = self.improvements_path / f"improvement-{timestamp}.md"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(doc)
        
        print(f"✅ 改進建議已生成: {output_file}")
        
        # 同時更新 YAML 格式供程式讀取
        yaml_data = {
            'timestamp': timestamp,
            'source_log': log['filename'],
            'problems': problems,
            'improvements': improvements,
            'patterns': patterns
        }
        
        yaml_file = self.improvements_path / f"improvement-{timestamp}.yml"
        with open(yaml_file, 'w', encoding='utf-8') as f:
            yaml.dump(yaml_data, f, allow_unicode=True, default_flow_style=False)
    
    def run(self):
        """執行反思流程"""
        print("🤔 開始開發反思分析...")
        
        # 獲取最新日誌
        recent_log = self.get_recent_log()
        if not recent_log:
            print("❌ 沒有找到開發日誌")
            return
        
        print(f"📋 分析日誌: {recent_log['filename']}")
        
        # 分析問題
        problems = self.analyze_problems(recent_log)
        print(f"🔍 發現 {len(problems)} 個潛在問題")
        
        # 生成改進建議
        improvements = self.generate_improvements(problems)
        
        # 檢查模式
        patterns = self.check_patterns()
        
        # 生成故事（如果有洞察）
        story_generated = self.generate_story_if_needed(recent_log, problems, patterns)
        if story_generated:
            print("📖 發現有價值的洞察，已生成開發故事")
        
        # 創建改進文檔
        self.create_improvement_doc(recent_log, problems, improvements, patterns)
        
        # 如果有高優先級問題，提示人類
        high_priority = [p for p in problems if p['severity'] == 'high']
        if high_priority:
            print("\n⚠️  發現高優先級問題需要關注！")
            for problem in high_priority:
                print(f"   - {problem['type']}: {problem.get('description', '見詳細分析')}")

if __name__ == "__main__":
    reflection = DevReflection()
    reflection.run()