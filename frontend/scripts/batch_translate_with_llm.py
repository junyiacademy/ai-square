#!/usr/bin/env python3
"""
Batch translate YAML content using LLM
This script can be called by Claude to translate content
"""
import json
import yaml
import os
from typing import Dict, List

class BatchTranslator:
    def __init__(self):
        self.yaml_file = "/Users/young/project/ai-square/frontend/public/rubrics_data/ai_lit_domains.yaml"
        self.json_file = self.yaml_file.replace('.yaml', '.json')
        self.load_data()
    
    def load_data(self):
        """Load existing JSON or create from YAML"""
        if os.path.exists(self.json_file):
            with open(self.json_file, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
        else:
            with open(self.yaml_file, 'r', encoding='utf-8') as f:
                self.data = yaml.safe_load(f)
            self.save_json()
    
    def save_json(self):
        """Save to JSON"""
        with open(self.json_file, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)
    
    def save_yaml(self):
        """Save back to YAML"""
        with open(self.yaml_file, 'w', encoding='utf-8') as f:
            yaml.dump(self.data, f, 
                     default_flow_style=False, 
                     allow_unicode=True,
                     sort_keys=False,
                     width=1000)
    
    def find_untranslated(self, language: str, limit: int = 5) -> List[Dict]:
        """Find fields that need translation"""
        results = []
        
        def traverse(obj, path=''):
            if len(results) >= limit:
                return
                
            if isinstance(obj, dict):
                for key, value in obj.items():
                    current_path = f"{path}.{key}" if path else key
                    
                    # Check if this is a translatable field
                    if isinstance(value, str) and not key.endswith(('_zhTW', '_es', '_ja', '_ko', '_fr', '_de', '_ru', '_it', '_zhCN', '_pt', '_ar', '_id', '_th')):
                        # Check if translation exists
                        translation_key = f"{key}_{language}"
                        if translation_key not in obj or obj.get(translation_key, '').startswith('['):
                            results.append({
                                'path': current_path,
                                'original': value,
                                'field': key
                            })
                            if len(results) >= limit:
                                return
                    
                    # Recurse
                    traverse(value, current_path)
        
        traverse(self.data)
        return results
    
    def apply_translation(self, path: str, language: str, translation: str) -> bool:
        """Apply a single translation"""
        keys = path.split('.')
        field = keys[-1]
        parent_keys = keys[:-1]
        
        # Navigate to parent
        parent = self.data
        for key in parent_keys:
            if isinstance(parent, dict) and key in parent:
                parent = parent[key]
            else:
                return False
        
        # Set translation
        if isinstance(parent, dict):
            parent[f"{field}_{language}"] = translation
            self.save_json()
            return True
        
        return False
    
    def get_translation_batch(self, language: str, count: int = 5) -> str:
        """Get a batch of content to translate"""
        items = self.find_untranslated(language, count)
        
        if not items:
            return "No more items to translate"
        
        output = f"=== Translation Batch for {language} ===\n\n"
        
        for i, item in enumerate(items, 1):
            output += f"Item {i}:\n"
            output += f"Path: {item['path']}\n"
            output += f"Original: {item['original']}\n"
            output += f"---\n\n"
        
        return output
    
    def apply_translations_batch(self, language: str, translations: Dict[str, str]) -> int:
        """Apply multiple translations at once"""
        success = 0
        
        for path, translation in translations.items():
            if self.apply_translation(path, language, translation):
                success += 1
        
        self.save_json()
        return success

# Simple CLI
if __name__ == "__main__":
    translator = BatchTranslator()
    
    # Example: Get items to translate
    print(translator.get_translation_batch('zhCN', 3))
    
    # Example: Apply translations
    # translations = {
    #     'domains.Engaging_with_AI.overview': '涉及使用AI作為工具...',
    #     'domains.Engaging_with_AI.competencies.E1.description': '識別AI的角色...'
    # }
    # count = translator.apply_translations_batch('zhCN', translations)
    # print(f"Applied {count} translations")
    
    # Save back to YAML when done
    # translator.save_yaml()