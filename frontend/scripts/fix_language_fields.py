#!/usr/bin/env python3
"""
Fix language field names in YAML files
1. content_zh -> content_zhTW
2. content_zh_XX -> content_XX (remove redundant zh_)
3. description_zh -> description_zhTW
4. Add missing language fields
"""
import yaml
import re
from pathlib import Path

def fix_language_fields(yaml_file):
    """Fix language field naming issues"""
    
    print(f"Processing: {yaml_file}")
    
    # Load YAML
    with open(yaml_file, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    
    # Languages to ensure exist
    all_languages = ['zhTW', 'zhCN', 'pt', 'ar', 'id', 'th', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it']
    new_languages = ['zhCN', 'pt', 'ar', 'id', 'th']
    
    # Track changes
    changes_made = 0
    fields_added = 0
    
    def fix_field_names(obj, path=""):
        nonlocal changes_made, fields_added
        
        if not isinstance(obj, dict):
            return obj
        
        # First pass: fix field names
        keys_to_fix = []
        for key in obj.keys():
            # Fix _zh to _zhTW
            if key.endswith('_zh') and not key.endswith('_zh_'):
                new_key = key[:-3] + '_zhTW'
                keys_to_fix.append((key, new_key))
            
            # Fix _zh_XX to _XX
            elif '_zh_' in key:
                # Extract the pattern fieldname_zh_language
                match = re.match(r'^(.+?)_zh_(\w+)$', key)
                if match:
                    base_field = match.group(1)
                    lang_code = match.group(2)
                    new_key = f"{base_field}_{lang_code}"
                    keys_to_fix.append((key, new_key))
        
        # Apply fixes
        for old_key, new_key in keys_to_fix:
            if old_key in obj:
                obj[new_key] = obj.pop(old_key)
                changes_made += 1
                print(f"  Fixed: {path}.{old_key} -> {path}.{new_key}")
        
        # Second pass: add missing language fields
        # Identify translatable fields
        field_groups = {}
        for key in list(obj.keys()):
            base_field = key
            
            # Check if this is a language variant
            for lang in all_languages:
                if key.endswith(f'_{lang}'):
                    base_field = key[:-len(f'_{lang}') - 1]
                    if base_field not in field_groups:
                        field_groups[base_field] = set()
                    field_groups[base_field].add(lang)
                    break
        
        # Add missing fields
        for base_field, existing_langs in field_groups.items():
            # Check if base field exists and is a string
            if base_field in obj and isinstance(obj[base_field], str):
                # Add missing language fields
                for lang in new_languages:
                    if lang not in existing_langs:
                        field_key = f"{base_field}_{lang}"
                        obj[field_key] = f"[{lang.upper()} translation needed]"
                        fields_added += 1
                        print(f"  Added: {path}.{field_key}")
        
        # Recurse into nested structures
        for key, value in list(obj.items()):
            if isinstance(value, dict):
                new_path = f"{path}.{key}" if path else key
                obj[key] = fix_field_names(value, new_path)
            elif isinstance(value, list):
                new_list = []
                for i, item in enumerate(value):
                    if isinstance(item, dict):
                        new_list.append(fix_field_names(item, f"{path}.{key}[{i}]"))
                    else:
                        new_list.append(item)
                obj[key] = new_list
        
        return obj
    
    # Fix the fields
    data = fix_field_names(data)
    
    # Save
    if changes_made > 0 or fields_added > 0:
        # Backup original
        backup_file = f"{yaml_file}.backup_before_field_fix"
        with open(yaml_file, 'r', encoding='utf-8') as f:
            original_content = f.read()
        with open(backup_file, 'w', encoding='utf-8') as f:
            f.write(original_content)
        print(f"  Created backup: {backup_file}")
        
        # Save fixed version
        with open(yaml_file, 'w', encoding='utf-8') as f:
            yaml.dump(data, f, 
                     default_flow_style=False, 
                     allow_unicode=True,
                     sort_keys=False,
                     width=1000)
        
        print(f"  Total field name fixes: {changes_made}")
        print(f"  Total fields added: {fields_added}")
        print(f"  Saved to: {yaml_file}")
    else:
        print("  No changes needed")
    
    return changes_made, fields_added

def main():
    base_path = Path("/Users/young/project/ai-square/frontend/public/rubrics_data")
    
    # Files to process
    files = [
        base_path / "ai_lit_domains.yaml",
        base_path / "ksa_codes.yaml"
    ]
    
    total_fixes = 0
    total_added = 0
    
    for yaml_file in files:
        if yaml_file.exists():
            fixes, added = fix_language_fields(yaml_file)
            total_fixes += fixes
            total_added += added
        else:
            print(f"File not found: {yaml_file}")
    
    print(f"\n=== Summary ===")
    print(f"Total field name fixes: {total_fixes}")
    print(f"Total fields added: {total_added}")

if __name__ == "__main__":
    main()