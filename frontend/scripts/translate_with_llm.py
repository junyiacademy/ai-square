#!/usr/bin/env python3
"""
Translate YAML content using LLM
This script prepares content for LLM translation
"""
import yaml
import json
from pathlib import Path
from typing import Dict, List

class LLMTranslator:
    def __init__(self, yaml_file: str):
        self.yaml_file = yaml_file
        self.data = None
        self.load_yaml()
        
    def load_yaml(self):
        """Load YAML file"""
        with open(self.yaml_file, 'r', encoding='utf-8') as f:
            self.data = yaml.safe_load(f)
    
    def save_yaml(self):
        """Save YAML file"""
        with open(self.yaml_file, 'w', encoding='utf-8') as f:
            yaml.dump(self.data, f, 
                     default_flow_style=False, 
                     allow_unicode=True,
                     sort_keys=False,
                     width=1000)
    
    def find_placeholders(self, language: str, limit: int = 10) -> List[Dict]:
        """Find fields with placeholder text for a specific language"""
        placeholders = []
        
        def traverse(obj, path="", parent_obj=None):
            if len(placeholders) >= limit:
                return
                
            if isinstance(obj, dict):
                for key, value in obj.items():
                    current_path = f"{path}.{key}" if path else key
                    
                    # Check if this is a language field with placeholder
                    if key.endswith(f'_{language}') and isinstance(value, str):
                        if 'translation needed' in value or value.strip() == '':
                            # Find the base field
                            base_field = key[:-len(f'_{language}')-1]
                            base_value = obj.get(base_field, '')
                            
                            # If base value is empty, look for it without suffix
                            if not base_value:
                                # Try the simplest approach first
                                if base_field in obj:
                                    base_value = obj.get(base_field, '')
                                else:
                                    # For fields like "description", "content", "overview", "scenarios"
                                    # that don't have suffixes in the base version
                                    simple_fields = ['description', 'content', 'overview', 'scenarios', 'summary']
                                    for field in simple_fields:
                                        if base_field == field and field in obj:
                                            base_value = obj.get(field, '')
                                            break
                            
                            # Also check for zhTW version as reference
                            zhTW_value = obj.get(f'{base_field}_zhTW', '')
                            
                            # If we have a valid base value, add to placeholders
                            if base_value and isinstance(base_value, str):
                                placeholders.append({
                                    'path': current_path,
                                    'key': key,
                                    'base_field': base_field,
                                    'current': value,
                                    'original': base_value,
                                    'zhTW': zhTW_value
                                })
                                
                                if len(placeholders) >= limit:
                                    return
                    
                    # Recurse
                    if isinstance(value, dict):
                        traverse(value, current_path, obj)
                    elif isinstance(value, list):
                        for i, item in enumerate(value):
                            if isinstance(item, dict):
                                traverse(item, f"{current_path}[{i}]", obj)
        
        traverse(self.data)
        return placeholders
    
    def prepare_translation_batch(self, language: str, count: int = 5) -> str:
        """Prepare a batch for translation"""
        items = self.find_placeholders(language, count)
        
        if not items:
            return f"No items need translation for {language}"
        
        # Language names for context
        lang_names = {
            'zhCN': 'Simplified Chinese',
            'pt': 'Portuguese (Brazilian)',
            'ar': 'Arabic',
            'id': 'Indonesian',
            'th': 'Thai'
        }
        
        output = f"=== Translation Request: {lang_names.get(language, language)} ===\n\n"
        output += "Please provide professional translations for the following AI literacy content.\n"
        output += "Maintain the educational tone and technical accuracy.\n\n"
        
        for i, item in enumerate(items, 1):
            output += f"Item {i}:\n"
            output += f"Field type: {item['base_field']}\n"
            output += f"English: {item['original']}\n"
            if item['zhTW']:
                output += f"Traditional Chinese reference: {item['zhTW']}\n"
            output += f"Current value: {item['current']}\n"
            output += f"Path: {item['path']}\n"
            output += f"---\n\n"
        
        return output
    
    def apply_translation(self, path: str, translation: str) -> bool:
        """Apply a single translation"""
        keys = path.split('.')
        current = self.data
        
        # Navigate to the parent
        for key in keys[:-1]:
            if '[' in key and ']' in key:
                # Handle array notation
                array_key = key[:key.index('[')]
                index = int(key[key.index('[')+1:key.index(']')])
                current = current[array_key][index]
            else:
                current = current[key]
        
        # Set the value
        final_key = keys[-1]
        if final_key in current:
            current[final_key] = translation
            return True
        
        return False
    
    def batch_apply(self, translations: Dict[str, str]) -> int:
        """Apply multiple translations"""
        applied = 0
        
        for path, translation in translations.items():
            if self.apply_translation(path, translation):
                applied += 1
                print(f"Applied: {path}")
        
        if applied > 0:
            self.save_yaml()
            print(f"\nSaved {applied} translations to {self.yaml_file}")
        
        return applied
    
    def get_stats(self) -> Dict[str, int]:
        """Get translation statistics"""
        languages = ['zhCN', 'pt', 'ar', 'id', 'th']
        stats = {}
        
        for lang in languages:
            placeholders = self.find_placeholders(lang, limit=1000)
            stats[lang] = len(placeholders)
        
        return stats

# Example usage functions
def translate_zhCN_batch():
    """Example: Translate a batch to Simplified Chinese"""
    translator = LLMTranslator('/Users/young/project/ai-square/frontend/public/rubrics_data/ai_lit_domains.yaml')
    
    # Get items to translate
    print(translator.prepare_translation_batch('zhCN', 5))
    
    # Example translations (would come from LLM)
    translations = {
        'domains.Engaging_with_AI.overview_zhCN': '涉及使用AI作为工具来访问新内容、信息或推荐。这些情况要求学习者首先识别AI的存在，然后评估AI输出的准确性和相关性。学习者必须对AI的技术基础建立基本理解，以便批判性地分析其能力和局限性。',
        'domains.Engaging_with_AI.competencies.E1.description_zhCN': '识别AI在不同情境中的角色与影响力。',
        'domains.Engaging_with_AI.competencies.E1.content_zhCN': '学习者能识别日常工具与系统中AI的存在，并思考其在各种情境（如内容推荐、适应性学习）中的用途。他们会反思AI如何影响自己的选择、学习与观点。'
    }
    
    # Apply translations
    # translator.batch_apply(translations)

def main():
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python translate_with_llm.py <yaml_file> <language> [count]")
        print("\nExample:")
        print("  python translate_with_llm.py ai_lit_domains.yaml zhCN 5")
        print("\nSupported languages: zhCN, pt, ar, id, th")
        sys.exit(1)
    
    yaml_file = sys.argv[1]
    if not Path(yaml_file).is_absolute():
        yaml_file = Path('/Users/young/project/ai-square/frontend/public/rubrics_data') / yaml_file
    
    translator = LLMTranslator(str(yaml_file))
    
    if len(sys.argv) == 2:
        # Show stats
        stats = translator.get_stats()
        print("=== Translation Status ===")
        for lang, count in stats.items():
            print(f"{lang}: {count} items need translation")
    else:
        # Prepare batch
        language = sys.argv[2]
        count = int(sys.argv[3]) if len(sys.argv) > 3 else 5
        
        print(translator.prepare_translation_batch(language, count))

if __name__ == "__main__":
    main()