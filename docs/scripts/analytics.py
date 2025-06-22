#!/usr/bin/env python3
"""
AI Square 開發指標分析系統
用於分析開發日誌並生成統計報告
"""

import os
import yaml
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple
import statistics

class DevelopmentAnalytics:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.features_path = self.project_root / "docs" / "dev-logs"
        self.reports_path = self.project_root / "docs"  # 報告直接保存在 docs/
        
    def load_feature_logs(self) -> List[Dict]:
        """載入所有功能開發日誌"""
        logs = []
        for file in self.features_path.glob("*.yml"):
            if not file.name.endswith('-template.yml'):
                with open(file, 'r', encoding='utf-8') as f:
                    logs.append(yaml.safe_load(f))
        return logs
    
    def calculate_statistics(self, logs: List[Dict]) -> Dict:
        """計算開發統計數據"""
        if not logs:
            return {}
            
        total_features = len(logs)
        total_time = sum(log['metrics']['total_time'] for log in logs)
        total_ai_time = sum(
            sum(phase['ai_time'] for phase in log['timeline'])
            for log in logs
        )
        total_human_time = sum(
            sum(phase['human_time'] for phase in log['timeline'])
            for log in logs
        )
        
        total_cost = sum(log['cost_estimation']['total_cost'] for log in logs)
        total_savings = sum(log['cost_estimation']['cost_saving'] for log in logs)
        
        avg_ai_percentage = statistics.mean(
            log['metrics']['ai_percentage'] for log in logs
        )
        
        return {
            "summary": {
                "total_features": total_features,
                "total_time_minutes": total_time,
                "total_time_hours": round(total_time / 60, 2),
                "ai_time_minutes": total_ai_time,
                "human_time_minutes": total_human_time,
                "ai_percentage": round(avg_ai_percentage, 1),
            },
            "cost": {
                "total_cost_usd": round(total_cost, 2),
                "total_savings_usd": round(total_savings, 2),
                "roi_percentage": round((total_savings / total_cost) * 100, 1) if total_cost > 0 else 0
            },
            "productivity": {
                "avg_time_per_feature_minutes": round(total_time / total_features, 1),
                "ai_acceleration_factor": round(
                    (total_ai_time + total_human_time) / total_human_time, 1
                ) if total_human_time > 0 else 0
            }
        }
    
    def analyze_by_phase(self, logs: List[Dict]) -> Dict:
        """分析各階段的時間分配"""
        phases = {}
        for log in logs:
            for phase in log['timeline']:
                phase_name = phase['phase']
                if phase_name not in phases:
                    phases[phase_name] = {
                        'total_time': 0,
                        'ai_time': 0,
                        'human_time': 0,
                        'count': 0
                    }
                phases[phase_name]['total_time'] += phase['duration']
                phases[phase_name]['ai_time'] += phase['ai_time']
                phases[phase_name]['human_time'] += phase['human_time']
                phases[phase_name]['count'] += 1
        
        # 計算平均值和百分比
        for phase_name, data in phases.items():
            data['avg_time'] = round(data['total_time'] / data['count'], 1)
            data['ai_percentage'] = round(
                (data['ai_time'] / data['total_time']) * 100, 1
            ) if data['total_time'] > 0 else 0
            
        return phases
    
    def generate_insights(self, logs: List[Dict]) -> List[str]:
        """生成洞察和建議"""
        insights = []
        
        # AI 優勢分析
        ai_strengths = {}
        for log in logs:
            for strength in log['learnings']['ai_strengths']:
                if strength not in ai_strengths:
                    ai_strengths[strength] = 0
                ai_strengths[strength] += 1
        
        if ai_strengths:
            top_strength = max(ai_strengths, key=ai_strengths.get)
            insights.append(f"AI 最常展現的優勢: {top_strength}")
        
        # 成本效益分析
        stats = self.calculate_statistics(logs)
        if stats:
            roi = stats['cost']['roi_percentage']
            if roi > 500:
                insights.append(f"極高的投資報酬率 ({roi}%)，AI 協作模式非常成功")
            elif roi > 200:
                insights.append(f"良好的投資報酬率 ({roi}%)，建議擴大 AI 應用")
            
        return insights
    
    def generate_report(self) -> Dict:
        """生成完整報告"""
        logs = self.load_feature_logs()
        
        report = {
            "generated_at": datetime.now().isoformat(),
            "statistics": self.calculate_statistics(logs),
            "phase_analysis": self.analyze_by_phase(logs),
            "insights": self.generate_insights(logs),
            "features": [
                {
                    "name": log['feature'],
                    "date": log['date'],
                    "total_time": log['metrics']['total_time'],
                    "ai_percentage": log['metrics']['ai_percentage'],
                    "cost_saving": log['cost_estimation']['cost_saving']
                }
                for log in logs
            ]
        }
        
        return report
    
    def save_report(self, report: Dict):
        """儲存報告"""
        # 報告直接保存在 docs/ 目錄
        
        # 儲存 JSON 格式
        with open(self.reports_path / "metrics-dashboard.json", 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        
        # 生成 Markdown 報告
        self.generate_markdown_report(report)
    
    def generate_markdown_report(self, report: Dict):
        """生成 Markdown 格式報告"""
        md_content = f"""# AI Square 開發指標報告

生成時間: {report['generated_at']}

## 📊 總體統計

- **完成功能數**: {report['statistics']['summary']['total_features']}
- **總開發時間**: {report['statistics']['summary']['total_time_hours']} 小時
- **AI 平均貢獻**: {report['statistics']['summary']['ai_percentage']}%
- **總成本**: ${report['statistics']['cost']['total_cost_usd']}
- **節省成本**: ${report['statistics']['cost']['total_savings_usd']}
- **投資報酬率**: {report['statistics']['cost']['roi_percentage']}%

## 🚀 生產力分析

- **平均功能開發時間**: {report['statistics']['productivity']['avg_time_per_feature_minutes']} 分鐘
- **AI 加速係數**: {report['statistics']['productivity']['ai_acceleration_factor']}x

## 📈 階段分析

| 階段 | 平均時間 | AI 貢獻 |
|------|----------|---------|
"""
        
        for phase, data in report['phase_analysis'].items():
            md_content += f"| {phase} | {data['avg_time']} 分鐘 | {data['ai_percentage']}% |\n"
        
        md_content += "\n## 💡 洞察與建議\n\n"
        for insight in report['insights']:
            md_content += f"- {insight}\n"
        
        md_content += "\n## 📋 功能清單\n\n"
        md_content += "| 功能 | 日期 | 時間 | AI% | 節省成本 |\n"
        md_content += "|------|------|------|-----|----------|\n"
        
        for feature in report['features']:
            md_content += f"| {feature['name']} | {feature['date']} | {feature['total_time']}分 | {feature['ai_percentage']}% | ${feature['cost_saving']} |\n"
        
        with open(self.reports_path / "metrics-report.md", 'w', encoding='utf-8') as f:
            f.write(md_content)

if __name__ == "__main__":
    analytics = DevelopmentAnalytics()
    report = analytics.generate_report()
    analytics.save_report(report)
    print("📊 開發指標報告已生成！")
    print(f"- JSON: docs/metrics-dashboard.json")
    print(f"- Markdown: docs/metrics-report.md")