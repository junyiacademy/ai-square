#!/usr/bin/env python3
"""
Fix typo: desciption -> description in YAML files
"""
import yaml
import os
from pathlib import Path

def fix_description_typo(yaml_file):
    """Fix desciption -> description typo in YAML file"""
    
    print(f"Processing: {yaml_file}")
    
    # Load YAML
    with open(yaml_file, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    
    # Track changes
    changes_made = 0
    
    def fix_typo_in_dict(obj, path=""):
        nonlocal changes_made
        
        if not isinstance(obj, dict):
            return obj
        
        # Create new dict to avoid modifying during iteration
        new_obj = {}
        
        for key, value in obj.items():
            # Check if key contains the typo
            if 'desciption' in key:
                # Fix the typo
                new_key = key.replace('desciption', 'description')
                new_obj[new_key] = value
                changes_made += 1
                print(f"  Fixed: {path}.{key} -> {path}.{new_key}")
            else:
                new_obj[key] = value
            
            # Recursively fix in nested structures
            if isinstance(value, dict):
                new_path = f"{path}.{key}" if path else key
                final_key = new_key if 'desciption' in key else key
                new_obj[final_key] = fix_typo_in_dict(value, new_path)
            elif isinstance(value, list):
                new_list = []
                for i, item in enumerate(value):
                    if isinstance(item, dict):
                        new_list.append(fix_typo_in_dict(item, f"{path}.{key}[{i}]"))
                    else:
                        new_list.append(item)
                new_obj[key if key not in new_obj else new_key] = new_list
        
        return new_obj
    
    # Fix the typo
    fixed_data = fix_typo_in_dict(data)
    
    # Save if changes were made
    if changes_made > 0:
        # Backup original
        backup_file = f"{yaml_file}.backup_before_typo_fix"
        with open(yaml_file, 'r', encoding='utf-8') as f:
            original_content = f.read()
        with open(backup_file, 'w', encoding='utf-8') as f:
            f.write(original_content)
        print(f"  Created backup: {backup_file}")
        
        # Save fixed version
        with open(yaml_file, 'w', encoding='utf-8') as f:
            yaml.dump(fixed_data, f, 
                     default_flow_style=False, 
                     allow_unicode=True,
                     sort_keys=False,
                     width=1000)
        
        print(f"  Total fixes: {changes_made}")
        print(f"  Saved to: {yaml_file}")
    else:
        print("  No typos found")
    
    return changes_made

def check_files_for_typo():
    """Check which files have the typo"""
    base_path = Path("/Users/young/project/ai-square/frontend")
    
    # Files to check
    files_to_check = [
        "public/rubrics_data/ksa_codes.yaml",
        "public/rubrics_data/ai_lit_domains.yaml",
    ]
    
    # Also check TypeScript files
    ts_files = list(base_path.glob("src/**/*.ts")) + list(base_path.glob("src/**/*.tsx"))
    
    print("=== Checking for 'desciption' typo ===\n")
    
    # Check YAML files
    yaml_files_with_typo = []
    for file_path in files_to_check:
        full_path = base_path / file_path
        if full_path.exists():
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
                if 'desciption' in content:
                    count = content.count('desciption')
                    yaml_files_with_typo.append((full_path, count))
                    print(f"Found in {file_path}: {count} occurrences")
    
    # Check TypeScript files
    ts_files_with_typo = []
    for ts_file in ts_files:
        try:
            with open(ts_file, 'r', encoding='utf-8') as f:
                content = f.read()
                if 'desciption' in content:
                    count = content.count('desciption')
                    ts_files_with_typo.append((ts_file, count))
                    print(f"Found in {ts_file.relative_to(base_path)}: {count} occurrences")
        except:
            pass
    
    return yaml_files_with_typo, ts_files_with_typo

def main():
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "check":
        # Just check for typos
        yaml_files, ts_files = check_files_for_typo()
        
        print(f"\nSummary:")
        print(f"YAML files with typo: {len(yaml_files)}")
        print(f"TypeScript files with typo: {len(ts_files)}")
        
    else:
        # Fix typos in YAML files
        yaml_files, ts_files = check_files_for_typo()
        
        if yaml_files:
            print("\n=== Fixing YAML files ===\n")
            for file_path, _ in yaml_files:
                fix_description_typo(file_path)
        
        if ts_files:
            print("\n=== TypeScript files with typo ===")
            print("These files need manual review:")
            for file_path, count in ts_files:
                print(f"  {file_path}: {count} occurrences")
            print("\nUse your IDE's find/replace function to fix these.")

if __name__ == "__main__":
    main()