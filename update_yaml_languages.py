#!/usr/bin/env python3
"""
Script to add new language fields (zhCN, pt, ar, id, th) to all YAML files
"""
import os
import re
import yaml
from pathlib import Path

# Define the new languages to add
NEW_LANGUAGES = ['zhCN', 'pt', 'ar', 'id', 'th']

# Language names for placeholder text
LANGUAGE_NAMES = {
    'zhCN': 'Simplified Chinese',
    'pt': 'Portuguese',
    'ar': 'Arabic',
    'id': 'Indonesian',
    'th': 'Thai'
}

# Existing languages (to identify language fields)
EXISTING_LANGUAGES = ['zhTW', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it']

def find_language_fields(data, path=""):
    """Recursively find all fields that have language variants"""
    language_fields = {}
    
    if isinstance(data, dict):
        for key, value in data.items():
            current_path = f"{path}.{key}" if path else key
            
            # Check if this key ends with any existing language suffix
            for lang in EXISTING_LANGUAGES:
                if key.endswith(f"_{lang}"):
                    base_field = key[:-len(f"_{lang}")]
                    if base_field not in language_fields:
                        language_fields[base_field] = set()
                    language_fields[base_field].add(lang)
            
            # Recurse into nested structures
            if isinstance(value, (dict, list)):
                nested_fields = find_language_fields(value, current_path)
                for field, langs in nested_fields.items():
                    if field not in language_fields:
                        language_fields[field] = set()
                    language_fields[field].update(langs)
    
    elif isinstance(data, list):
        for i, item in enumerate(data):
            current_path = f"{path}[{i}]"
            if isinstance(item, dict):
                nested_fields = find_language_fields(item, current_path)
                for field, langs in nested_fields.items():
                    if field not in language_fields:
                        language_fields[field] = set()
                    language_fields[field].update(langs)
    
    return language_fields

def add_new_language_fields(data, language_fields, path=""):
    """Recursively add new language fields to the data structure"""
    if isinstance(data, dict):
        # First, collect fields to add (to avoid modifying dict during iteration)
        fields_to_add = []
        
        for key, value in list(data.items()):
            current_path = f"{path}.{key}" if path else key
            
            # Check if this is a base field that has language variants
            for base_field in language_fields:
                if key == f"{base_field}_zhTW" or key == f"{base_field}_es":
                    # Found a language field, check which new languages to add
                    for new_lang in NEW_LANGUAGES:
                        new_key = f"{base_field}_{new_lang}"
                        if new_key not in data:
                            # Determine the type of placeholder based on the original value
                            if isinstance(value, list):
                                placeholder = [f"[{LANGUAGE_NAMES[new_lang]} translation needed]"]
                            elif isinstance(value, str):
                                placeholder = f"[{LANGUAGE_NAMES[new_lang]} translation needed]"
                            else:
                                placeholder = f"[{LANGUAGE_NAMES[new_lang]} translation needed]"
                            
                            fields_to_add.append((new_key, placeholder, key))
            
            # Recurse into nested structures
            if isinstance(value, (dict, list)):
                add_new_language_fields(value, language_fields, current_path)
        
        # Add the new fields in the correct position
        if fields_to_add:
            # Rebuild the dictionary to maintain order
            new_data = {}
            for key, value in data.items():
                new_data[key] = value
                # Add new language fields after each existing language field
                for new_key, placeholder, ref_key in fields_to_add:
                    if key == ref_key and new_key not in new_data:
                        # Find the last existing language field for this base
                        base = new_key.rsplit('_', 1)[0]
                        last_lang_key = None
                        for existing_lang in reversed(EXISTING_LANGUAGES):
                            existing_key = f"{base}_{existing_lang}"
                            if existing_key in data:
                                last_lang_key = existing_key
                                break
                        
                        if last_lang_key == key:
                            new_data[new_key] = placeholder
            
            # Update the original dict
            data.clear()
            data.update(new_data)
    
    elif isinstance(data, list):
        for i, item in enumerate(data):
            current_path = f"{path}[{i}]"
            if isinstance(item, dict):
                add_new_language_fields(item, language_fields, current_path)

def process_yaml_file(file_path):
    """Process a single YAML file to add new language fields"""
    print(f"Processing: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            data = yaml.safe_load(content)
        
        if data is None:
            print(f"  Skipping empty file: {file_path}")
            return
        
        # Find all language fields
        language_fields = find_language_fields(data)
        
        if not language_fields:
            print(f"  No language fields found in: {file_path}")
            return
        
        print(f"  Found language fields: {', '.join(sorted(language_fields.keys()))}")
        
        # Add new language fields
        add_new_language_fields(data, language_fields)
        
        # Write back to file preserving structure
        with open(file_path, 'w', encoding='utf-8') as f:
            yaml.dump(data, f, default_flow_style=False, allow_unicode=True, sort_keys=False, width=120)
        
        print(f"  ✓ Updated successfully")
        
    except Exception as e:
        print(f"  ✗ Error processing {file_path}: {e}")

def main():
    """Main function to process all YAML files"""
    directories = [
        '/Users/young/project/ai-square/frontend/public/rubrics_data/',
        '/Users/young/project/ai-square/frontend/public/pbl_data/',
        '/Users/young/project/ai-square/frontend/public/assessment_data/'
    ]
    
    for directory in directories:
        print(f"\nProcessing directory: {directory}")
        
        if not os.path.exists(directory):
            print(f"  Directory not found: {directory}")
            continue
        
        yaml_files = list(Path(directory).glob('*.yaml'))
        
        if not yaml_files:
            print(f"  No YAML files found in: {directory}")
            continue
        
        for yaml_file in yaml_files:
            process_yaml_file(yaml_file)

if __name__ == "__main__":
    main()