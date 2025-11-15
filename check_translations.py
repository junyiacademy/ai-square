#!/usr/bin/env python3
"""
PBL Scenarios Translation Status Checker
檢查所有PBL場景的翻譯狀況
"""

import os
import yaml
import json
from pathlib import Path

# 目標語言列表
LANGUAGES = ['en', 'zhTW', 'zhCN', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'th', 'id']

# 需要檢查的關鍵欄位
KEY_FIELDS = [
    'scenario_info.title',
    'scenario_info.description',
    'scenario_info.prerequisites',
    'scenario_info.learning_objectives'
]

TASK_FIELDS = [
    'title',
    'description',
    'instructions',
    'expected_outcome'
]

def load_yaml_file(file_path):
    """載入YAML文件"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return None

def get_nested_value(data, path):
    """取得嵌套字典的值"""
    keys = path.split('.')
    current = data
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return None
    return current

def compare_field_values(en_data, other_data, field_path):
    """比較欄位值是否相同"""
    en_value = get_nested_value(en_data, field_path)
    other_value = get_nested_value(other_data, field_path)

    if en_value is None or other_value is None:
        return False, "Field missing"

    # 對於字串比較，忽略空白字元差異
    if isinstance(en_value, str) and isinstance(other_value, str):
        return en_value.strip() == other_value.strip(), f"EN: '{en_value[:50]}...' vs OTHER: '{other_value[:50]}...'"

    # 對於列表比較
    if isinstance(en_value, list) and isinstance(other_value, list):
        if len(en_value) != len(other_value):
            return False, f"Different list lengths: EN={len(en_value)}, OTHER={len(other_value)}"

        # 比較列表內容
        for i, (en_item, other_item) in enumerate(zip(en_value, other_value)):
            if isinstance(en_item, str) and isinstance(other_item, str):
                if en_item.strip() != other_item.strip():
                    return False, f"Different at index {i}: EN='{en_item}' vs OTHER='{other_item}'"
            elif en_item != other_item:
                return False, f"Different at index {i}: EN={en_item} vs OTHER={other_item}"

        return True, "Lists are identical"

    return en_value == other_value, f"EN: {en_value} vs OTHER: {other_value}"

def check_scenario_translations(scenarios_dir):
    """檢查所有場景的翻譯狀況"""
    scenarios_dir = Path(scenarios_dir)
    results = {}

    # 取得所有場景目錄
    scenario_dirs = [d for d in scenarios_dir.iterdir() if d.is_dir() and not d.name.startswith('_')]

    for scenario_dir in sorted(scenario_dirs):
        scenario_name = scenario_dir.name
        print(f"\n=== 檢查場景: {scenario_name} ===")

        # 載入英文版本作為基準
        en_file = scenario_dir / f"{scenario_name}_en.yaml"
        if not en_file.exists():
            print(f"  ❌ 英文版本不存在: {en_file}")
            continue

        en_data = load_yaml_file(en_file)
        if not en_data:
            print(f"  ❌ 無法載入英文版本: {en_file}")
            continue

        scenario_results = {
            'translation_status': {},
            'untranslated_fields': {},
            'missing_files': []
        }

        # 檢查每種語言
        for lang in LANGUAGES:
            if lang == 'en':
                continue

            lang_file = scenario_dir / f"{scenario_name}_{lang}.yaml"

            if not lang_file.exists():
                print(f"  ❌ 缺少語言文件: {lang}")
                scenario_results['missing_files'].append(lang)
                continue

            lang_data = load_yaml_file(lang_file)
            if not lang_data:
                print(f"  ❌ 無法載入語言文件: {lang}")
                continue

            # 檢查基本欄位
            untranslated_fields = []

            for field_path in KEY_FIELDS:
                is_different, details = compare_field_values(en_data, lang_data, field_path)
                if not is_different:
                    untranslated_fields.append(field_path)
                    print(f"    🔄 {lang} - {field_path}: 未翻譯")

            # 檢查任務欄位
            en_tasks = en_data.get('tasks', [])
            lang_tasks = lang_data.get('tasks', [])

            if len(en_tasks) != len(lang_tasks):
                print(f"    ⚠️  {lang} - 任務數量不匹配: EN={len(en_tasks)}, {lang}={len(lang_tasks)}")

            for i, (en_task, lang_task) in enumerate(zip(en_tasks, lang_tasks)):
                for field in TASK_FIELDS:
                    en_value = en_task.get(field)
                    lang_value = lang_task.get(field)

                    if en_value and lang_value:
                        # 處理字串欄位
                        if isinstance(en_value, str) and isinstance(lang_value, str):
                            if en_value.strip() == lang_value.strip():
                                task_field = f"tasks[{i}].{field}"
                                untranslated_fields.append(task_field)
                                print(f"    🔄 {lang} - {task_field}: 未翻譯")
                        # 處理其他類型欄位
                        elif en_value == lang_value:
                            task_field = f"tasks[{i}].{field}"
                            untranslated_fields.append(task_field)
                            print(f"    🔄 {lang} - {task_field}: 未翻譯")

            scenario_results['untranslated_fields'][lang] = untranslated_fields

            # 計算翻譯狀況
            total_fields = len(KEY_FIELDS) + len(en_tasks) * len(TASK_FIELDS)
            translated_fields = total_fields - len(untranslated_fields)
            translation_rate = (translated_fields / total_fields * 100) if total_fields > 0 else 0

            scenario_results['translation_status'][lang] = {
                'total_fields': total_fields,
                'translated_fields': translated_fields,
                'untranslated_fields': len(untranslated_fields),
                'translation_rate': round(translation_rate, 1)
            }

            status_icon = "✅" if translation_rate == 100 else "🔄" if translation_rate > 50 else "❌"
            print(f"  {status_icon} {lang}: {translation_rate}% 翻譯完成 ({translated_fields}/{total_fields})")

        results[scenario_name] = scenario_results

    return results

def generate_summary_report(results):
    """生成摘要報告"""
    print("\n" + "="*80)
    print("📊 PBL場景翻譯狀況摘要報告")
    print("="*80)

    # 統計概要
    total_scenarios = len(results)
    language_stats = {lang: {'total': 0, 'completed': 0, 'partial': 0, 'missing': 0} for lang in LANGUAGES if lang != 'en'}

    for scenario_name, scenario_data in results.items():
        for lang in LANGUAGES:
            if lang == 'en':
                continue

            if lang in scenario_data['missing_files']:
                language_stats[lang]['missing'] += 1
            elif lang in scenario_data['translation_status']:
                rate = scenario_data['translation_status'][lang]['translation_rate']
                language_stats[lang]['total'] += 1
                if rate == 100:
                    language_stats[lang]['completed'] += 1
                else:
                    language_stats[lang]['partial'] += 1

    print(f"\n📈 總體統計 (共 {total_scenarios} 個場景):")
    print("-" * 60)
    for lang, stats in language_stats.items():
        total = stats['total'] + stats['missing']
        completed_rate = (stats['completed'] / total * 100) if total > 0 else 0
        print(f"{lang:5s}: ✅完成 {stats['completed']:2d} | 🔄部分 {stats['partial']:2d} | ❌缺失 {stats['missing']:2d} | 完成率 {completed_rate:5.1f}%")

    # 詳細場景報告
    print(f"\n📋 詳細場景報告:")
    print("-" * 60)

    for scenario_name, scenario_data in results.items():
        print(f"\n🎯 {scenario_name}:")

        if scenario_data['missing_files']:
            print(f"   ❌ 缺失語言文件: {', '.join(scenario_data['missing_files'])}")

        for lang, status in scenario_data['translation_status'].items():
            rate = status['translation_rate']
            icon = "✅" if rate == 100 else "🔄" if rate > 50 else "❌"
            print(f"   {icon} {lang}: {rate}% ({status['translated_fields']}/{status['total_fields']})")

            # 顯示未翻譯的欄位
            if scenario_data['untranslated_fields'].get(lang):
                untranslated = scenario_data['untranslated_fields'][lang][:3]  # 只顯示前3個
                remaining = len(scenario_data['untranslated_fields'][lang]) - 3
                fields_str = ', '.join(untranslated)
                if remaining > 0:
                    fields_str += f" (+{remaining} more)"
                print(f"      🔄 未翻譯欄位: {fields_str}")

def main():
    scenarios_dir = "/Users/young/project/ai-square/frontend/public/pbl_data/scenarios"

    print("🔍 開始檢查PBL場景翻譯狀況...")
    print(f"📁 場景目錄: {scenarios_dir}")
    print(f"🌐 檢查語言: {', '.join(LANGUAGES)}")

    results = check_scenario_translations(scenarios_dir)
    generate_summary_report(results)

    # 保存詳細結果到JSON文件
    output_file = "/Users/young/project/ai-square/translation_report.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n💾 詳細報告已保存到: {output_file}")
    print("\n✅ 翻譯狀況檢查完成！")

if __name__ == "__main__":
    main()
