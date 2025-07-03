#!/usr/bin/env python3
"""
Sync and complete translations in YAML files
This script ensures all language variants exist for each translatable field
"""
import yaml
import json
import os
from typing import Dict, List, Set, Tuple

class YAMLTranslationSync:
    def __init__(self, yaml_file: str):
        self.yaml_file = yaml_file
        self.data = None
        self.all_languages = ['zhTW', 'zhCN', 'pt', 'ar', 'id', 'th', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it']
        self.new_languages = ['zhCN', 'pt', 'ar', 'id', 'th']  # Languages that need translations
        self.load_yaml()
    
    def load_yaml(self):
        """Load YAML file"""
        with open(self.yaml_file, 'r', encoding='utf-8') as f:
            self.data = yaml.safe_load(f)
    
    def save_yaml(self, output_file: str = None):
        """Save YAML file"""
        output = output_file or self.yaml_file
        with open(output, 'w', encoding='utf-8') as f:
            yaml.dump(self.data, f, 
                     default_flow_style=False, 
                     allow_unicode=True,
                     sort_keys=False,
                     width=1000)
        print(f"Saved to: {output}")
    
    def find_translatable_fields(self) -> List[Tuple[str, Set[str], str]]:
        """Find all fields that have translations and check which languages are missing"""
        results = []
        
        def traverse(obj, path=''):
            if isinstance(obj, dict):
                # Group fields by their base name
                field_groups = {}
                
                for key, value in obj.items():
                    # Check if this is a language variant
                    base_field = key
                    for lang in self.all_languages:
                        if key.endswith(f'_{lang}'):
                            base_field = key[:-len(f'_{lang}')]
                            break
                    
                    if base_field not in field_groups:
                        field_groups[base_field] = {'languages': set(), 'has_base': False}
                    
                    # Check if it's the base field or a translation
                    if key == base_field:
                        field_groups[base_field]['has_base'] = True
                        field_groups[base_field]['base_value'] = value
                    else:
                        # Extract language code
                        for lang in self.all_languages:
                            if key.endswith(f'_{lang}'):
                                field_groups[base_field]['languages'].add(lang)
                                break
                
                # Check each field group
                for base_field, info in field_groups.items():
                    if info['has_base'] and isinstance(info.get('base_value'), str):
                        # This is a translatable field
                        field_path = f"{path}.{base_field}" if path else base_field
                        existing_languages = info['languages']
                        
                        # Find missing languages
                        missing_languages = set(self.new_languages) - existing_languages
                        
                        if missing_languages:
                            results.append((field_path, missing_languages, info['base_value']))
                
                # Recurse into nested objects
                for key, value in obj.items():
                    if isinstance(value, dict):
                        current_path = f"{path}.{key}" if path else key
                        traverse(value, current_path)
                    elif isinstance(value, list):
                        # Handle lists
                        for i, item in enumerate(value):
                            if isinstance(item, dict):
                                traverse(item, f"{path}.{key}[{i}]")
        
        traverse(self.data)
        return results
    
    def add_missing_translations(self, dry_run: bool = True) -> Dict[str, int]:
        """Add placeholder translations for missing languages"""
        missing_fields = self.find_translatable_fields()
        stats = {lang: 0 for lang in self.new_languages}
        
        if dry_run:
            print(f"\n=== DRY RUN - Found {len(missing_fields)} fields with missing translations ===\n")
        else:
            print(f"\n=== Adding translations for {len(missing_fields)} fields ===\n")
        
        for field_path, missing_langs, base_value in missing_fields:
            # Navigate to the parent object
            keys = field_path.split('.')
            parent = self.data
            
            # Handle array notation
            for i, key in enumerate(keys[:-1]):
                if '[' in key and ']' in key:
                    # Handle array index
                    array_key = key[:key.index('[')]
                    index = int(key[key.index('[')+1:key.index(']')])
                    if array_key in parent and isinstance(parent[array_key], list):
                        parent = parent[array_key][index]
                    else:
                        print(f"Warning: Cannot navigate to {field_path} - array not found")
                        continue
                else:
                    if key in parent and isinstance(parent[key], dict):
                        parent = parent[key]
                    else:
                        print(f"Warning: Cannot navigate to {field_path} - key '{key}' not found")
                        continue
            
            base_field = keys[-1]
            
            # Add missing translations
            for lang in missing_langs:
                translation_key = f"{base_field}_{lang}"
                
                if dry_run:
                    print(f"Would add: {field_path}_{lang}")
                    print(f"  Original: {base_value[:100]}{'...' if len(base_value) > 100 else ''}")
                else:
                    # Add placeholder translation
                    if isinstance(parent, dict):
                        parent[translation_key] = f"[{lang.upper()} translation needed]"
                        stats[lang] += 1
        
        if not dry_run:
            self.save_yaml()
            
        return stats
    
    def get_translation_report(self) -> str:
        """Generate a report of translation status"""
        missing_fields = self.find_translatable_fields()
        
        # Group by language
        by_language = {lang: [] for lang in self.new_languages}
        
        for field_path, missing_langs, base_value in missing_fields:
            for lang in missing_langs:
                by_language[lang].append({
                    'path': field_path,
                    'original': base_value
                })
        
        # Generate report
        report = f"=== Translation Status Report ===\n"
        report += f"File: {self.yaml_file}\n\n"
        
        for lang in self.new_languages:
            count = len(by_language[lang])
            report += f"{lang}: {count} fields need translation\n"
        
        report += f"\nTotal fields needing translation: {len(missing_fields)}\n"
        
        # Show examples
        report += "\n=== Examples of fields needing translation ===\n"
        for field_path, missing_langs, base_value in missing_fields[:5]:
            report += f"\nPath: {field_path}\n"
            report += f"Missing: {', '.join(missing_langs)}\n"
            report += f"Original: {base_value[:100]}{'...' if len(base_value) > 100 else ''}\n"
        
        return report
    
    def export_for_translation(self, language: str, output_file: str):
        """Export all missing translations for a specific language"""
        missing_fields = self.find_translatable_fields()
        
        translations_needed = []
        for field_path, missing_langs, base_value in missing_fields:
            if language in missing_langs:
                translations_needed.append({
                    'path': field_path,
                    'original': base_value,
                    'translation': ''
                })
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump({
                'language': language,
                'file': self.yaml_file,
                'translations': translations_needed
            }, f, indent=2, ensure_ascii=False)
        
        print(f"Exported {len(translations_needed)} items to {output_file}")

def main():
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python sync_yaml_translations.py <yaml_file> [command]")
        print("\nCommands:")
        print("  report    - Show translation status (default)")
        print("  dry-run   - Show what would be added")
        print("  sync      - Add missing translation fields")
        print("  export    - Export translations for a language")
        print("\nExample:")
        print("  python sync_yaml_translations.py ai_lit_domains.yaml report")
        print("  python sync_yaml_translations.py ai_lit_domains.yaml sync")
        sys.exit(1)
    
    yaml_file = sys.argv[1]
    command = sys.argv[2] if len(sys.argv) > 2 else 'report'
    
    # Handle relative paths
    if not os.path.isabs(yaml_file):
        # If the path already contains 'public/rubrics_data', use it directly from frontend
        if 'public/rubrics_data' in yaml_file:
            yaml_file = os.path.join('/Users/young/project/ai-square/frontend', yaml_file)
        else:
            yaml_file = os.path.join('/Users/young/project/ai-square/frontend/public/rubrics_data', yaml_file)
    
    syncer = YAMLTranslationSync(yaml_file)
    
    if command == 'report':
        print(syncer.get_translation_report())
    
    elif command == 'dry-run':
        syncer.add_missing_translations(dry_run=True)
    
    elif command == 'sync':
        stats = syncer.add_missing_translations(dry_run=False)
        print("\n=== Summary ===")
        for lang, count in stats.items():
            if count > 0:
                print(f"{lang}: Added {count} translation fields")
    
    elif command == 'export':
        if len(sys.argv) < 4:
            print("Error: export command requires language code")
            print("Example: python sync_yaml_translations.py file.yaml export zhCN")
            sys.exit(1)
        
        language = sys.argv[3]
        output_file = f"translations_{language}_{os.path.basename(yaml_file).replace('.yaml', '.json')}"
        syncer.export_for_translation(language, output_file)
    
    else:
        print(f"Unknown command: {command}")

if __name__ == "__main__":
    main()