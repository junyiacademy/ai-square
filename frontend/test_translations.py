#!/usr/bin/env python3
"""
PBL 場景翻譯驗證測試腳本
自動檢查所有場景的翻譯狀況，避免手動逐個確認
"""

import os
import yaml
import json
from pathlib import Path
import sys

class TranslationValidator:
    def __init__(self):
        self.scenarios_dir = Path("public/pbl_data/scenarios")
        self.languages = ["en", "zhTW", "zhCN", "ja", "ko", "es", "fr", "de", "it", "pt", "ru", "ar", "th", "id"]
        self.critical_fields = [
            "scenario_info.title",
            "scenario_info.description", 
            "scenario_info.prerequisites",
            "scenario_info.learning_objectives"
        ]
        self.task_fields = [
            "title",
            "description",
            "instructions", 
            "expected_outcome"
        ]
        
    def load_yaml_safe(self, file_path):
        """安全載入YAML文件"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return yaml.safe_load(f)
        except Exception as e:
            return None
            
    def extract_field_value(self, data, field_path):
        """提取YAML中的欄位值"""
        try:
            keys = field_path.split('.')
            value = data
            for key in keys:
                value = value[key]
            return value
        except (KeyError, TypeError):
            return None
            
    def is_translated(self, en_value, target_value):
        """檢查是否已翻譯（不等於英文原文）"""
        if en_value is None or target_value is None:
            return False
        
        # 如果是列表，檢查每個元素
        if isinstance(en_value, list) and isinstance(target_value, list):
            if len(en_value) != len(target_value):
                return True  # 長度不同，假設已翻譯
            return not all(en_item == target_item for en_item, target_item in zip(en_value, target_value))
        
        # 字符串比較
        return str(en_value).strip() != str(target_value).strip()
        
    def check_scenario_translation(self, scenario_name):
        """檢查單個場景的翻譯狀況"""
        scenario_dir = self.scenarios_dir / scenario_name
        if not scenario_dir.exists():
            return None
            
        # 載入英文版本作為基準
        en_file = scenario_dir / f"{scenario_name}_en.yaml"
        if not en_file.exists():
            return None
            
        en_data = self.load_yaml_safe(en_file)
        if not en_data:
            return None
            
        results = {
            "scenario": scenario_name,
            "languages": {},
            "summary": {}
        }
        
        for lang in self.languages:
            if lang == "en":
                continue
                
            lang_file = scenario_dir / f"{scenario_name}_{lang}.yaml"
            if not lang_file.exists():
                results["languages"][lang] = {"status": "missing", "details": {}}
                continue
                
            lang_data = self.load_yaml_safe(lang_file)
            if not lang_data:
                results["languages"][lang] = {"status": "corrupted", "details": {}}
                continue
                
            # 檢查關鍵欄位
            lang_result = {
                "status": "partial",
                "critical_fields": {},
                "tasks": {},
                "translated_count": 0,
                "total_count": 0
            }
            
            # 檢查scenario_info欄位
            for field in self.critical_fields:
                en_value = self.extract_field_value(en_data, field)
                lang_value = self.extract_field_value(lang_data, field)
                
                is_trans = self.is_translated(en_value, lang_value)
                lang_result["critical_fields"][field] = {
                    "translated": is_trans,
                    "en_value": str(en_value)[:100] if en_value else None,
                    "lang_value": str(lang_value)[:100] if lang_value else None
                }
                
                if is_trans:
                    lang_result["translated_count"] += 1
                lang_result["total_count"] += 1
                
            # 檢查任務欄位
            if "tasks" in en_data and "tasks" in lang_data:
                for i, (en_task, lang_task) in enumerate(zip(en_data["tasks"], lang_data.get("tasks", []))):
                    task_result = {}
                    
                    for field in self.task_fields:
                        en_value = en_task.get(field)
                        lang_value = lang_task.get(field)
                        
                        is_trans = self.is_translated(en_value, lang_value)
                        task_result[field] = {
                            "translated": is_trans,
                            "en_value": str(en_value)[:50] if en_value else None,
                            "lang_value": str(lang_value)[:50] if lang_value else None
                        }
                        
                        if is_trans:
                            lang_result["translated_count"] += 1
                        lang_result["total_count"] += 1
                        
                    lang_result["tasks"][f"task_{i+1}"] = task_result
                    
            # 計算完成率
            completion_rate = (lang_result["translated_count"] / lang_result["total_count"] * 100) if lang_result["total_count"] > 0 else 0
            lang_result["completion_rate"] = round(completion_rate, 1)
            
            # 決定狀態
            if completion_rate == 100:
                lang_result["status"] = "complete"
            elif completion_rate > 75:
                lang_result["status"] = "mostly_complete"
            elif completion_rate > 25:
                lang_result["status"] = "partial"
            else:
                lang_result["status"] = "minimal"
                
            results["languages"][lang] = lang_result
            
        return results
        
    def run_full_validation(self):
        """執行完整翻譯驗證"""
        print("🔍 開始PBL場景翻譯驗證...")
        print("=" * 80)
        
        all_results = {}
        summary_stats = {
            "total_scenarios": 0,
            "language_stats": {lang: {"complete": 0, "partial": 0, "minimal": 0, "missing": 0} for lang in self.languages if lang != "en"}
        }
        
        # 獲取所有場景目錄
        if not self.scenarios_dir.exists():
            print(f"❌ 場景目錄不存在: {self.scenarios_dir}")
            return None
            
        scenario_dirs = [d for d in self.scenarios_dir.iterdir() if d.is_dir() and not d.name.startswith('_')]
        
        for scenario_dir in scenario_dirs:
            scenario_name = scenario_dir.name
            print(f"\n📂 檢查場景: {scenario_name}")
            
            result = self.check_scenario_translation(scenario_name)
            if result:
                all_results[scenario_name] = result
                summary_stats["total_scenarios"] += 1
                
                # 更新統計
                for lang, lang_data in result["languages"].items():
                    status = lang_data.get("status", "missing")
                    if status in summary_stats["language_stats"][lang]:
                        summary_stats["language_stats"][lang][status] += 1
                        
                # 顯示簡要結果
                for lang in ["zhCN", "zhTW"]:  # 重點語言
                    if lang in result["languages"]:
                        lang_data = result["languages"][lang]
                        rate = lang_data.get("completion_rate", 0)
                        status = lang_data.get("status", "unknown")
                        
                        status_emoji = {
                            "complete": "✅",
                            "mostly_complete": "🟡", 
                            "partial": "🟠",
                            "minimal": "❌",
                            "missing": "💔",
                            "corrupted": "💥"
                        }.get(status, "❓")
                        
                        print(f"  {status_emoji} {lang}: {rate}% ({status})")
                        
        print("\n" + "=" * 80)        
        print("📊 總體統計摘要:")
        print(f"檢查場景數: {summary_stats['total_scenarios']}")
        
        for lang in ["zhCN", "zhTW", "ja", "ko"]:  # 重點語言
            stats = summary_stats["language_stats"][lang]
            total = sum(stats.values())
            if total > 0:
                complete_rate = stats["complete"] / total * 100
                print(f"{lang}: {complete_rate:.1f}% 完全翻譯 ({stats['complete']}/{total})")
                
        # 保存詳細報告
        report_file = "translation_validation_report.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump({
                "summary": summary_stats,
                "detailed_results": all_results
            }, f, indent=2, ensure_ascii=False)
            
        print(f"\n💾 詳細報告已保存: {report_file}")
        
        return all_results, summary_stats
        
    def validate_specific_scenario(self, scenario_name, language):
        """驗證特定場景和語言"""
        print(f"🔍 驗證 {scenario_name} - {language}")
        
        result = self.check_scenario_translation(scenario_name)
        if not result or language not in result["languages"]:
            print(f"❌ 找不到場景或語言: {scenario_name}/{language}")
            return False
            
        lang_data = result["languages"][language]
        rate = lang_data.get("completion_rate", 0)
        status = lang_data.get("status", "unknown")
        
        print(f"翻譯完成率: {rate}%")
        print(f"狀態: {status}")
        
        # 顯示未翻譯的關鍵欄位
        critical_untranslated = []
        for field, field_data in lang_data.get("critical_fields", {}).items():
            if not field_data.get("translated", False):
                critical_untranslated.append(field)
                
        if critical_untranslated:
            print("❌ 未翻譯的關鍵欄位:")
            for field in critical_untranslated:
                print(f"  - {field}")
        else:
            print("✅ 所有關鍵欄位已翻譯")
            
        return rate >= 90  # 90%以上視為通過

def main():
    validator = TranslationValidator()
    
    if len(sys.argv) > 1:
        # 驗證特定場景
        if len(sys.argv) >= 3:
            scenario = sys.argv[1]
            language = sys.argv[2]
            success = validator.validate_specific_scenario(scenario, language)
            sys.exit(0 if success else 1)
        else:
            print("用法: python test_translations.py [scenario_name] [language]")
            sys.exit(1)
    else:
        # 完整驗證
        results, stats = validator.run_full_validation()
        
        # 檢查是否有嚴重問題
        critical_issues = 0
        for lang in ["zhCN", "zhTW"]:  # 重點語言
            lang_stats = stats["language_stats"][lang]
            if lang_stats["minimal"] + lang_stats["missing"] > 0:
                critical_issues += lang_stats["minimal"] + lang_stats["missing"]
                
        if critical_issues > 0:
            print(f"\n⚠️  發現 {critical_issues} 個嚴重翻譯問題")
            sys.exit(1)
        else:
            print("\n✅ 翻譯驗證通過")
            sys.exit(0)

if __name__ == "__main__":
    main()