#!/usr/bin/env python3
"""
故事萃取器 - 從票券中提取有價值的經驗和知識
"""

import os
import yaml
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List

class StoryExtractor:
    """從開發過程中萃取故事和經驗"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.docs_dir = self.project_root / "docs"
        
    def extract_story(self, ticket_path: Path) -> Dict:
        """從票券萃取故事"""
        
        with open(ticket_path, 'r', encoding='utf-8') as f:
            ticket_data = yaml.safe_load(f)
        
        # 從整合式票券中直接讀取
        devlog_data = ticket_data.get('dev_log', {})
        test_data = ticket_data.get('test_report', {})
        
        # 萃取故事元素
        story = {
            'ticket_id': ticket_data['id'],
            'ticket_name': ticket_data['name'],
            'type': ticket_data['type'],
            'created_at': datetime.now().isoformat(),
            
            # 1. 產品洞察
            'product_insights': {
                'feature': ticket_data.get('spec', {}).get('feature'),
                'purpose': ticket_data.get('spec', {}).get('purpose'),
                'user_value': self._extract_user_value(ticket_data),
                'acceptance_criteria': ticket_data.get('spec', {}).get('acceptance_criteria', [])
            },
            
            # 2. 技術挑戰和解決方案
            'technical_insights': {
                'challenges': self._extract_challenges(devlog_data),
                'solutions': self._extract_solutions(devlog_data),
                'decisions': self._extract_decisions(devlog_data),
                'patterns_used': self._extract_patterns(ticket_data)
            },
            
            # 3. 開發效率指標
            'efficiency_metrics': {
                'duration_minutes': ticket_data.get('time_tracking', {}).get('actual_duration_minutes', 0),
                'ai_time_minutes': ticket_data.get('time_tracking', {}).get('ai_time_minutes', 0),
                'human_time_minutes': ticket_data.get('time_tracking', {}).get('human_time_minutes', 0),
                'ai_efficiency_ratio': self._calculate_ai_efficiency(ticket_data),
                'test_coverage': test_data.get('coverage', {}),
                'files_changed': len(ticket_data.get('development', {}).get('files_changed', []))
            },
            
            # 4. AI 協作經驗
            'ai_collaboration': {
                'total_interactions': ticket_data.get('ai_usage', {}).get('total_interactions', 0),
                'estimated_cost': ticket_data.get('ai_usage', {}).get('estimated_cost_usd', 0),
                'complexity_breakdown': ticket_data.get('ai_usage', {}).get('complexity_breakdown', {}),
                'cost_per_feature': self._calculate_cost_per_feature(ticket_data)
            },
            
            # 5. 學習要點
            'learnings': {
                'what_worked_well': [],
                'what_could_improve': [],
                'reusable_patterns': [],
                'avoid_in_future': []
            },
            
            # 6. 可重用資產
            'reusable_assets': {
                'code_snippets': self._extract_code_snippets(ticket_data),
                'test_patterns': self._extract_test_patterns(test_data),
                'configuration': self._extract_config_patterns(ticket_data)
            }
        }
        
        # 基於數據自動填充學習要點
        story['learnings'] = self._auto_extract_learnings(story)
        
        return story
    
    def _extract_user_value(self, ticket_data: Dict) -> str:
        """提取用戶價值"""
        purpose = ticket_data.get('spec', {}).get('purpose', '')
        if purpose and purpose != '[請描述目的]':
            return purpose
        return "待分析"
    
    def _extract_challenges(self, devlog_data: Dict) -> List[Dict]:
        """提取技術挑戰"""
        challenges = []
        for session in devlog_data.get('sessions', []):
            for challenge in session.get('challenges', []):
                challenges.append({
                    'description': challenge.get('description', challenge) if isinstance(challenge, dict) else challenge,
                    'session': session.get('session_id')
                })
        return challenges
    
    def _extract_solutions(self, devlog_data: Dict) -> List[Dict]:
        """提取解決方案"""
        solutions = []
        for session in devlog_data.get('sessions', []):
            for activity in session.get('activities', []):
                # 處理 dict 或 string 格式
                activity_text = activity.get('action', '') if isinstance(activity, dict) else str(activity)
                if any(keyword in activity_text.lower() for keyword in ['解決', '修復', 'fix', 'solve', '實作', '完成']):
                    solutions.append({
                        'description': activity_text,
                        'session': session.get('session_id')
                    })
        return solutions
    
    def _extract_decisions(self, devlog_data: Dict) -> List[Dict]:
        """提取關鍵決策"""
        decisions = []
        for session in devlog_data.get('sessions', []):
            for decision in session.get('decisions', []):
                decisions.append({
                    'description': decision.get('description', decision) if isinstance(decision, dict) else decision,
                    'session': session.get('session_id')
                })
        return decisions
    
    def _extract_patterns(self, ticket_data: Dict) -> List[str]:
        """提取使用的設計模式"""
        patterns = []
        files_changed = ticket_data.get('development', {}).get('files_changed', [])
        
        # 基於文件類型推測模式
        for file in files_changed:
            if 'context' in file.lower():
                patterns.append('React Context Pattern')
            if 'hook' in file.lower():
                patterns.append('Custom Hook Pattern')
            if 'provider' in file.lower():
                patterns.append('Provider Pattern')
            if 'factory' in file.lower():
                patterns.append('Factory Pattern')
            if 'singleton' in file.lower():
                patterns.append('Singleton Pattern')
        
        return list(set(patterns))
    
    def _calculate_ai_efficiency(self, ticket_data: Dict) -> float:
        """計算 AI 效率比"""
        ai_time = ticket_data.get('time_tracking', {}).get('ai_time_minutes', 0)
        total_time = ticket_data.get('time_tracking', {}).get('actual_duration_minutes', 1)
        if total_time > 0:
            return round(ai_time / total_time, 2)
        return 0.0
    
    def _calculate_cost_per_feature(self, ticket_data: Dict) -> float:
        """計算每個功能的成本"""
        total_cost = ticket_data.get('ai_usage', {}).get('estimated_cost_usd', 0)
        criteria_count = len(ticket_data.get('spec', {}).get('acceptance_criteria', [1]))
        return round(total_cost / criteria_count, 4)
    
    def _extract_code_snippets(self, ticket_data: Dict) -> List[Dict]:
        """提取可重用的代碼片段"""
        # 這裡可以進一步分析 git diff 來提取實際代碼
        return []
    
    def _extract_test_patterns(self, test_data: Dict) -> List[str]:
        """提取測試模式"""
        patterns = []
        if test_data.get('summary', {}).get('total_tests', 0) > 0:
            patterns.append('Unit Testing')
        return patterns
    
    def _extract_config_patterns(self, ticket_data: Dict) -> List[str]:
        """提取配置模式"""
        patterns = []
        files_changed = ticket_data.get('development', {}).get('files_changed', [])
        
        for file in files_changed:
            if 'config' in file.lower() or '.json' in file or '.yml' in file:
                patterns.append(f'Configuration: {Path(file).name}')
        
        return patterns
    
    def _auto_extract_learnings(self, story: Dict) -> Dict:
        """自動提取學習要點"""
        learnings = {
            'what_worked_well': [],
            'what_could_improve': [],
            'reusable_patterns': [],
            'avoid_in_future': []
        }
        
        # 基於效率指標
        efficiency = story['efficiency_metrics']
        if efficiency['ai_efficiency_ratio'] > 0.5:
            learnings['what_worked_well'].append('高效的 AI 協作（AI 時間佔比 > 50%）')
        
        if efficiency['test_coverage'].get('lines', 0) > 80:
            learnings['what_worked_well'].append('優秀的測試覆蓋率（> 80%）')
        
        # 基於成本
        ai_collab = story['ai_collaboration']
        if ai_collab['cost_per_feature'] < 0.1:
            learnings['what_worked_well'].append('成本效益高（每功能 < $0.10）')
        elif ai_collab['cost_per_feature'] > 1.0:
            learnings['what_could_improve'].append('降低 AI 使用成本')
        
        # 基於挑戰
        if len(story['technical_insights']['challenges']) > 3:
            learnings['what_could_improve'].append('減少技術債務和複雜度')
        
        # 可重用模式
        if story['technical_insights']['patterns_used']:
            learnings['reusable_patterns'].extend(story['technical_insights']['patterns_used'])
        
        return learnings
    
    def save_story(self, story: Dict, ticket_path: Path) -> Path:
        """保存故事"""
        ticket_name = Path(ticket_path).stem
        story_dir = self.docs_dir / "stories" / datetime.now().strftime('%Y-%m')
        story_dir.mkdir(parents=True, exist_ok=True)
        
        story_file = story_dir / f"{ticket_name}-story.yml"
        
        with open(story_file, 'w', encoding='utf-8') as f:
            yaml.dump(story, f, default_flow_style=False, allow_unicode=True)
        
        # 同時生成 Markdown 版本
        md_file = story_file.with_suffix('.md')
        self._generate_markdown_story(story, md_file)
        
        return story_file
    
    def _generate_markdown_story(self, story: Dict, output_path: Path):
        """生成 Markdown 格式的故事"""
        content = f"""# {story['ticket_name']} 開發故事

## 📋 概述
- **類型**: {story['type']}
- **功能**: {story['product_insights']['feature']}
- **目的**: {story['product_insights']['purpose']}

## 🎯 產品價值
{story['product_insights']['user_value']}

### 驗收標準
{chr(10).join(f"- {c}" for c in story['product_insights']['acceptance_criteria'])}

## 💡 技術洞察

### 遇到的挑戰
{chr(10).join(f"- {c['description']}" for c in story['technical_insights']['challenges'])}

### 解決方案
{chr(10).join(f"- {s['description']}" for s in story['technical_insights']['solutions'])}

### 關鍵決策
{chr(10).join(f"- {d['description']}" for d in story['technical_insights']['decisions'])}

### 使用的模式
{chr(10).join(f"- {p}" for p in story['technical_insights']['patterns_used'])}

## 📊 效率指標
- **總時長**: {story['efficiency_metrics']['duration_minutes']} 分鐘
- **AI 時間**: {story['efficiency_metrics']['ai_time_minutes']} 分鐘
- **AI 效率**: {story['efficiency_metrics']['ai_efficiency_ratio'] * 100:.1f}%
- **文件變更**: {story['efficiency_metrics']['files_changed']} 個

## 🤖 AI 協作
- **互動次數**: {story['ai_collaboration']['total_interactions']}
- **估算成本**: ${story['ai_collaboration']['estimated_cost']:.2f}
- **每功能成本**: ${story['ai_collaboration']['cost_per_feature']:.4f}

## 📚 學習要點

### ✅ 做得好的地方
{chr(10).join(f"- {item}" for item in story['learnings']['what_worked_well'])}

### 📈 可以改進的地方
{chr(10).join(f"- {item}" for item in story['learnings']['what_could_improve'])}

### 🔄 可重用模式
{chr(10).join(f"- {item}" for item in story['learnings']['reusable_patterns'])}

### ⚠️ 未來要避免
{chr(10).join(f"- {item}" for item in story['learnings']['avoid_in_future'])}

---
*自動生成於 {story['created_at']}*
"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)


def main():
    """主程式"""
    import argparse
    
    parser = argparse.ArgumentParser(description='故事萃取器')
    parser.add_argument('--ticket', help='票券路徑')
    parser.add_argument('--format', choices=['yaml', 'markdown', 'both'], 
                       default='both', help='輸出格式')
    
    args = parser.parse_args()
    
    extractor = StoryExtractor()
    
    # 找到活躍票券
    if not args.ticket:
        active_dir = extractor.docs_dir / "tickets" / "active"
        tickets = list(active_dir.glob("*.yml"))
        if tickets:
            args.ticket = tickets[0]
        else:
            print("❌ 沒有找到活躍的票券")
            return
    
    # 萃取故事
    story = extractor.extract_story(Path(args.ticket))
    
    # 保存故事
    story_file = extractor.save_story(story, Path(args.ticket))
    
    print(f"✅ 故事已萃取並保存到:")
    print(f"   - YAML: {story_file}")
    print(f"   - Markdown: {story_file.with_suffix('.md')}")
    
    # 顯示摘要
    print(f"\n📊 摘要:")
    print(f"   - AI 效率: {story['efficiency_metrics']['ai_efficiency_ratio'] * 100:.1f}%")
    print(f"   - 總成本: ${story['ai_collaboration']['estimated_cost']:.2f}")
    print(f"   - 學到 {len(story['learnings']['reusable_patterns'])} 個可重用模式")


if __name__ == '__main__':
    main()