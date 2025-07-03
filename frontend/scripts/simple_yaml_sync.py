#!/usr/bin/env python3
"""
Simple YAML translation sync - just add missing language fields
"""
import yaml
import re

def sync_yaml_translations(yaml_file):
    """Add missing translation fields for new languages"""
    
    # Load YAML
    with open(yaml_file, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    
    # Languages to check/add
    new_languages = ['zhCN', 'pt', 'ar', 'id', 'th']
    
    # Track changes
    changes_made = 0
    
    def process_dict(obj, path=""):
        nonlocal changes_made
        
        if not isinstance(obj, dict):
            return
        
        # Find translatable fields by looking for existing translations
        field_groups = {}
        
        for key in list(obj.keys()):
            # Check if this looks like a translation field
            base_name = key
            is_translation = False
            
            # Check common patterns
            for suffix in ['_zhTW', '_zh', '_es', '_ja', '_ko', '_fr', '_de', '_ru', '_it', '_zhCN', '_pt', '_ar', '_id', '_th']:
                if key.endswith(suffix):
                    base_name = key[:-len(suffix)]
                    is_translation = True
                    break
            
            if base_name not in field_groups:
                field_groups[base_name] = set()
            
            if is_translation:
                # Extract the language suffix
                suffix = key[len(base_name)+1:]
                field_groups[base_name].add(suffix)
        
        # Now check each field group
        for base_name, existing_langs in field_groups.items():
            # Skip if no translations exist
            if not existing_langs:
                continue
                
            # Check if base field exists and is a string
            if base_name in obj and isinstance(obj[base_name], str):
                # Add missing language fields
                for lang in new_languages:
                    field_key = f"{base_name}_{lang}"
                    
                    # Skip if already exists
                    if field_key in obj:
                        continue
                    
                    # Add placeholder
                    obj[field_key] = f"[{lang.upper()} translation needed]"
                    changes_made += 1
                    print(f"Added: {path}.{field_key}")
        
        # Recurse into nested dicts
        for key, value in obj.items():
            if isinstance(value, dict):
                new_path = f"{path}.{key}" if path else key
                process_dict(value, new_path)
            elif isinstance(value, list):
                for i, item in enumerate(value):
                    if isinstance(item, dict):
                        process_dict(item, f"{path}.{key}[{i}]")
    
    # Process the data
    process_dict(data)
    
    # Save if changes were made
    if changes_made > 0:
        with open(yaml_file, 'w', encoding='utf-8') as f:
            yaml.dump(data, f, 
                     default_flow_style=False, 
                     allow_unicode=True,
                     sort_keys=False,
                     width=1000)
        print(f"\nTotal changes: {changes_made}")
        print(f"Saved to: {yaml_file}")
    else:
        print("No changes needed")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python simple_yaml_sync.py <yaml_file>")
        sys.exit(1)
    
    yaml_file = sys.argv[1]
    sync_yaml_translations(yaml_file)