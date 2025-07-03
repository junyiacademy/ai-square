#!/usr/bin/env python3
"""
Translation Manager for AI Literacy Domains
Handles translation of YAML content using JSON intermediate format
"""
import yaml
import json
import os
import sys
from typing import Dict, Any, Optional, List
from pathlib import Path

class TranslationManager:
    def __init__(self, yaml_file: str):
        self.yaml_file = yaml_file
        self.json_file = yaml_file.replace('.yaml', '_working.json')
        self.data = None
        self.load_yaml()
    
    def load_yaml(self):
        """Load YAML file and convert to JSON"""
        print(f"Loading YAML file: {self.yaml_file}")
        with open(self.yaml_file, 'r', encoding='utf-8') as f:
            self.data = yaml.safe_load(f)
        self.save_json()
    
    def save_json(self):
        """Save current data to JSON"""
        with open(self.json_file, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)
        print(f"Working JSON saved to: {self.json_file}")
    
    def save_yaml(self, output_file: Optional[str] = None):
        """Save JSON back to YAML"""
        output = output_file or self.yaml_file
        with open(output, 'w', encoding='utf-8') as f:
            yaml.dump(self.data, f, 
                     default_flow_style=False, 
                     allow_unicode=True,
                     sort_keys=False,
                     width=1000)
        print(f"YAML saved to: {output}")
    
    def get_value(self, key_path: str) -> Optional[str]:
        """Get value by key path (e.g., 'domains.Engaging_with_AI.overview')"""
        keys = key_path.split('.')
        value = self.data
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        
        return value if isinstance(value, str) else None
    
    def set_translation(self, key_path: str, language: str, translation: str) -> bool:
        """Set translation for a specific language"""
        # Build the translation key path
        base_keys = key_path.split('.')
        field_name = base_keys[-1]
        parent_path = base_keys[:-1]
        
        # Navigate to parent object
        parent = self.data
        for key in parent_path:
            if isinstance(parent, dict) and key in parent:
                parent = parent[key]
            else:
                print(f"Error: Parent path not found: {'.'.join(parent_path)}")
                return False
        
        # Set the translation
        translation_key = f"{field_name}_{language}"
        if isinstance(parent, dict):
            parent[translation_key] = translation
            self.save_json()  # Auto-save to JSON
            return True
        
        return False
    
    def get_all_translation_tasks(self) -> List[Dict[str, Any]]:
        """Get all fields that need translation"""
        tasks = []
        languages_to_translate = ['zhCN', 'pt', 'ar', 'id', 'th']
        
        def traverse(obj, path=''):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    current_path = f"{path}.{key}" if path else key
                    
                    # Check if this is a translatable field (has English content)
                    if isinstance(value, str) and not key.endswith(('_zhTW', '_es', '_ja', '_ko', '_fr', '_de', '_ru', '_it', '_zhCN', '_pt', '_ar', '_id', '_th')):
                        # Check which translations are missing
                        for lang in languages_to_translate:
                            translation_key = f"{key}_{lang}"
                            parent = obj
                            
                            if translation_key not in parent or parent.get(translation_key, '').startswith('['):
                                tasks.append({
                                    'path': current_path,
                                    'field': key,
                                    'language': lang,
                                    'original': value,
                                    'current': parent.get(translation_key, ''),
                                    'needs_translation': True
                                })
                    
                    # Recurse
                    traverse(value, current_path)
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    traverse(item, f"{path}[{i}]")
        
        traverse(self.data)
        return tasks
    
    def get_translation_stats(self) -> Dict[str, int]:
        """Get statistics about translation progress"""
        tasks = self.get_all_translation_tasks()
        stats = {
            'total_fields': len(tasks),
            'by_language': {},
            'by_domain': {}
        }
        
        for task in tasks:
            lang = task['language']
            domain = task['path'].split('.')[1] if '.' in task['path'] else 'root'
            
            stats['by_language'][lang] = stats['by_language'].get(lang, 0) + 1
            stats['by_domain'][domain] = stats['by_domain'].get(domain, 0) + 1
        
        return stats
    
    def translate_field(self, path: str, language: str, use_llm: bool = False) -> Optional[str]:
        """Translate a specific field (placeholder for LLM integration)"""
        original = self.get_value(path)
        if not original:
            return None
        
        if use_llm:
            # TODO: Integrate with LLM API for translation
            # For now, return a placeholder
            return f"[{language.upper()} translation of: {original[:50]}...]"
        else:
            # Manual translation placeholder
            return f"[{language.upper()} translation needed]"
    
    def batch_translate(self, language: str, domain: Optional[str] = None, field_type: Optional[str] = None):
        """Batch translate multiple fields"""
        tasks = self.get_all_translation_tasks()
        
        # Filter tasks
        filtered_tasks = []
        for task in tasks:
            if task['language'] != language:
                continue
            if domain and domain not in task['path']:
                continue
            if field_type and field_type not in task['field']:
                continue
            filtered_tasks.append(task)
        
        print(f"\nFound {len(filtered_tasks)} fields to translate to {language}")
        
        for i, task in enumerate(filtered_tasks):
            print(f"\n[{i+1}/{len(filtered_tasks)}] {task['path']}")
            print(f"Original: {task['original'][:100]}...")
            
            # Here you would integrate with LLM or manual translation
            # For now, we'll skip
            
    def export_for_translation(self, language: str, output_file: str):
        """Export all text needing translation for a specific language"""
        tasks = [t for t in self.get_all_translation_tasks() if t['language'] == language]
        
        export_data = []
        for task in tasks:
            export_data.append({
                'path': task['path'],
                'original': task['original'],
                'translation': ''
            })
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)
        
        print(f"Exported {len(export_data)} items to {output_file}")
    
    def import_translations(self, language: str, input_file: str):
        """Import translations from a file"""
        with open(input_file, 'r', encoding='utf-8') as f:
            translations = json.load(f)
        
        success = 0
        for item in translations:
            if item.get('translation'):
                if self.set_translation(item['path'], language, item['translation']):
                    success += 1
        
        print(f"Imported {success} translations for {language}")
        self.save_yaml()  # Save back to YAML

def main():
    # Example usage
    manager = TranslationManager('/Users/young/project/ai-square/frontend/public/rubrics_data/ai_lit_domains.yaml')
    
    while True:
        print("\n=== Translation Manager ===")
        print("1. Show translation statistics")
        print("2. Get value by path")
        print("3. Set translation")
        print("4. Export for translation")
        print("5. Import translations")
        print("6. Save to YAML")
        print("7. List untranslated fields")
        print("8. Exit")
        
        choice = input("\nChoose option: ").strip()
        
        if choice == '1':
            stats = manager.get_translation_stats()
            print("\n=== Translation Statistics ===")
            print(f"Total fields needing translation: {stats['total_fields']}")
            print("\nBy language:")
            for lang, count in stats['by_language'].items():
                print(f"  {lang}: {count} fields")
            print("\nBy domain:")
            for domain, count in stats['by_domain'].items():
                print(f"  {domain}: {count} fields")
        
        elif choice == '2':
            path = input("Enter key path (e.g., domains.Engaging_with_AI.overview): ")
            value = manager.get_value(path)
            print(f"\nValue: {value}")
        
        elif choice == '3':
            path = input("Enter key path: ")
            lang = input("Enter language code (zhCN/pt/ar/id/th): ")
            trans = input("Enter translation: ")
            if manager.set_translation(path, lang, trans):
                print("Translation saved!")
            else:
                print("Failed to save translation")
        
        elif choice == '4':
            lang = input("Enter language code to export: ")
            output = f"translations_{lang}.json"
            manager.export_for_translation(lang, output)
        
        elif choice == '5':
            lang = input("Enter language code to import: ")
            input_file = input("Enter input file name: ")
            manager.import_translations(lang, input_file)
        
        elif choice == '6':
            output = input("Enter output file name (press Enter for original): ").strip()
            manager.save_yaml(output if output else None)
        
        elif choice == '7':
            lang = input("Enter language code: ")
            tasks = [t for t in manager.get_all_translation_tasks() if t['language'] == lang]
            for i, task in enumerate(tasks[:10]):  # Show first 10
                print(f"\n{i+1}. {task['path']}")
                print(f"   Original: {task['original'][:80]}...")
            print(f"\n... and {len(tasks)-10} more") if len(tasks) > 10 else None
        
        elif choice == '8':
            break
        
        else:
            print("Invalid option")

if __name__ == "__main__":
    main()