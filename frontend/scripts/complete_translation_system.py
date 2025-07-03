#!/usr/bin/env python3
"""
Complete Translation System
1. Check if language keys exist, add if missing
2. Translate empty values
3. Replace placeholder text like [PT translation needed]
"""
import yaml
import json
import re
from pathlib import Path
from typing import Dict, List, Set, Tuple, Any

class CompleteTranslationSystem:
    def __init__(self, yaml_file: str):
        self.yaml_file = yaml_file
        self.data = None
        # All supported languages
        self.all_languages = ['zhTW', 'zhCN', 'pt', 'ar', 'id', 'th', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it']
        # Languages that need translation
        self.target_languages = ['zhCN', 'pt', 'ar', 'id', 'th']
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
    
    def is_placeholder(self, value: Any) -> bool:
        """Check if value is a placeholder that needs translation"""
        if not isinstance(value, str):
            return False
        
        # Check for placeholder patterns
        placeholder_patterns = [
            r'\[(ZHCN|PT|AR|ID|TH|zhCN|pt|ar|id|th) translation needed\]',
            r'\[.*translation needed.*\]',
            r'^$',  # Empty string
        ]
        
        for pattern in placeholder_patterns:
            if re.match(pattern, value.strip(), re.IGNORECASE):
                return True
        
        return False
    
    def analyze_translation_needs(self) -> Dict[str, List[Dict]]:
        """Analyze what needs translation"""
        needs_translation = {lang: [] for lang in self.all_languages}
        
        def traverse(obj, path=""):
            if isinstance(obj, dict):
                # Group fields by base name
                field_groups = {}
                
                for key, value in obj.items():
                    # Determine base field name
                    base_field = key
                    lang_suffix = None
                    
                    for lang in self.all_languages:
                        if key.endswith(f'_{lang}'):
                            base_field = key[:-len(f'_{lang}')-1]
                            lang_suffix = lang
                            break
                    
                    if base_field not in field_groups:
                        field_groups[base_field] = {
                            'base_value': None,
                            'translations': {},
                            'path': path
                        }
                    
                    if lang_suffix:
                        field_groups[base_field]['translations'][lang_suffix] = value
                    elif key == base_field and isinstance(value, str):
                        field_groups[base_field]['base_value'] = value
                
                # Check each field group
                for base_field, info in field_groups.items():
                    if info['base_value']:  # Only process translatable fields
                        # Check all languages
                        for lang in self.all_languages:
                            field_path = f"{path}.{base_field}" if path else base_field
                            
                            # Check if translation exists and is valid
                            if lang not in info['translations']:
                                # Missing translation
                                needs_translation[lang].append({
                                    'path': field_path,
                                    'base_field': base_field,
                                    'original': info['base_value'],
                                    'current': None,
                                    'status': 'missing'
                                })
                            elif self.is_placeholder(info['translations'][lang]):
                                # Has placeholder
                                needs_translation[lang].append({
                                    'path': field_path,
                                    'base_field': base_field,
                                    'original': info['base_value'],
                                    'current': info['translations'][lang],
                                    'status': 'placeholder'
                                })
                            elif not info['translations'][lang].strip():
                                # Empty value
                                needs_translation[lang].append({
                                    'path': field_path,
                                    'base_field': base_field,
                                    'original': info['base_value'],
                                    'current': info['translations'][lang],
                                    'status': 'empty'
                                })
                
                # Recurse
                for key, value in obj.items():
                    if isinstance(value, dict):
                        new_path = f"{path}.{key}" if path else key
                        traverse(value, new_path)
                    elif isinstance(value, list):
                        for i, item in enumerate(value):
                            if isinstance(item, dict):
                                traverse(item, f"{path}.{key}[{i}]")
        
        traverse(self.data)
        return needs_translation
    
    def add_missing_fields(self, dry_run: bool = False) -> int:
        """Add missing translation fields"""
        added = 0
        
        def process_dict(obj, path=""):
            nonlocal added
            
            if not isinstance(obj, dict):
                return
            
            # Find translatable fields
            translatable_fields = []
            
            for key, value in list(obj.items()):
                # Check if this is a base field (no language suffix)
                is_base = True
                for lang in self.all_languages:
                    if key.endswith(f'_{lang}'):
                        is_base = False
                        break
                
                if is_base and isinstance(value, str) and value.strip():
                    translatable_fields.append(key)
            
            # Add missing translations
            for base_field in translatable_fields:
                for lang in self.all_languages:
                    field_key = f"{base_field}_{lang}"
                    
                    if field_key not in obj:
                        if not dry_run:
                            obj[field_key] = f"[{lang.upper()} translation needed]"
                        added += 1
                        print(f"  {'Would add' if dry_run else 'Added'}: {path}.{field_key}")
            
            # Recurse
            for key, value in list(obj.items()):
                if isinstance(value, dict):
                    new_path = f"{path}.{key}" if path else key
                    process_dict(value, new_path)
                elif isinstance(value, list):
                    for i, item in enumerate(value):
                        if isinstance(item, dict):
                            process_dict(item, f"{path}.{key}[{i}]")
        
        print(f"\n=== {'Checking' if dry_run else 'Adding'} missing fields ===")
        process_dict(self.data)
        
        if not dry_run and added > 0:
            self.save_yaml()
        
        return added
    
    def generate_translation_report(self) -> str:
        """Generate detailed translation report"""
        needs = self.analyze_translation_needs()
        
        report = "=== Translation Status Report ===\n"
        report += f"File: {self.yaml_file}\n\n"
        
        # Summary by language
        report += "Summary by language:\n"
        for lang in self.all_languages:
            total = len(needs[lang])
            if total > 0:
                missing = sum(1 for item in needs[lang] if item['status'] == 'missing')
                placeholder = sum(1 for item in needs[lang] if item['status'] == 'placeholder')
                empty = sum(1 for item in needs[lang] if item['status'] == 'empty')
                
                report += f"\n{lang}:\n"
                report += f"  Total issues: {total}\n"
                report += f"  - Missing fields: {missing}\n"
                report += f"  - Placeholders: {placeholder}\n"
                report += f"  - Empty values: {empty}\n"
        
        # Target languages details
        report += "\n\n=== Target Languages Details ===\n"
        for lang in self.target_languages:
            if needs[lang]:
                report += f"\n{lang} - {len(needs[lang])} items need translation:\n"
                
                # Group by type
                by_type = {}
                for item in needs[lang]:
                    field_type = item['base_field'].split('_')[0] if '_' in item['base_field'] else item['base_field']
                    if field_type not in by_type:
                        by_type[field_type] = []
                    by_type[field_type].append(item)
                
                for field_type, items in sorted(by_type.items()):
                    report += f"\n  {field_type} fields ({len(items)}):\n"
                    for item in items[:3]:  # Show first 3 examples
                        report += f"    - {item['path']} [{item['status']}]\n"
                    if len(items) > 3:
                        report += f"    ... and {len(items)-3} more\n"
        
        return report
    
    def export_for_translation(self, language: str, output_file: str = None):
        """Export translation needs for a specific language"""
        needs = self.analyze_translation_needs()
        
        if output_file is None:
            output_file = f"translation_needs_{language}_{Path(self.yaml_file).stem}.json"
        
        export_data = {
            'language': language,
            'source_file': self.yaml_file,
            'total_items': len(needs[language]),
            'items': []
        }
        
        for item in needs[language]:
            export_data['items'].append({
                'path': item['path'],
                'field': item['base_field'],
                'original': item['original'],
                'current': item['current'],
                'status': item['status'],
                'translation': ''  # To be filled
            })
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)
        
        print(f"Exported {len(needs[language])} items to {output_file}")
    
    def apply_translations(self, language: str, translations: Dict[str, str]) -> int:
        """Apply translations from a dictionary"""
        applied = 0
        
        def navigate_and_set(path: str, value: str):
            nonlocal applied
            
            # Parse the path
            keys = path.split('.')
            base_field = keys[-1]
            parent_keys = keys[:-1]
            
            # Navigate to parent
            current = self.data
            for key in parent_keys:
                if '[' in key and ']' in key:
                    # Handle array notation
                    array_key = key[:key.index('[')]
                    index = int(key[key.index('[')+1:key.index(']')])
                    current = current[array_key][index]
                else:
                    current = current[key]
            
            # Set the translation
            translation_key = f"{base_field}_{language}"
            if isinstance(current, dict):
                current[translation_key] = value
                applied += 1
                return True
            
            return False
        
        # Apply each translation
        for path, translation in translations.items():
            if translation and not self.is_placeholder(translation):
                navigate_and_set(path, translation)
        
        if applied > 0:
            self.save_yaml()
        
        return applied

def main():
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python complete_translation_system.py <yaml_file> <command>")
        print("\nCommands:")
        print("  report     - Show translation status")
        print("  add        - Add missing language fields")
        print("  export     - Export needs for a language")
        print("  check      - Check what would be added (dry run)")
        print("\nExamples:")
        print("  python complete_translation_system.py ai_lit_domains.yaml report")
        print("  python complete_translation_system.py ai_lit_domains.yaml add")
        print("  python complete_translation_system.py ai_lit_domains.yaml export zhCN")
        sys.exit(1)
    
    yaml_file = sys.argv[1]
    command = sys.argv[2] if len(sys.argv) > 2 else 'report'
    
    # Handle paths
    if not Path(yaml_file).is_absolute():
        yaml_file = Path('/Users/young/project/ai-square/frontend/public/rubrics_data') / yaml_file
    
    translator = CompleteTranslationSystem(str(yaml_file))
    
    if command == 'report':
        print(translator.generate_translation_report())
    
    elif command == 'add':
        added = translator.add_missing_fields()
        print(f"\nTotal fields added: {added}")
    
    elif command == 'check':
        added = translator.add_missing_fields(dry_run=True)
        print(f"\nTotal fields that would be added: {added}")
    
    elif command == 'export':
        if len(sys.argv) < 4:
            print("Error: export requires language code")
            sys.exit(1)
        
        language = sys.argv[3]
        translator.export_for_translation(language)
    
    else:
        print(f"Unknown command: {command}")

if __name__ == "__main__":
    main()