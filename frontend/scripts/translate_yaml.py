#!/usr/bin/env python3
"""
Simple translation API for YAML files
"""
import yaml
import json
import sys
from typing import Optional

class YAMLTranslator:
    def __init__(self, yaml_file: str):
        self.yaml_file = yaml_file
        self.json_file = yaml_file.replace('.yaml', '.json')
        self.data = None
        self._load()
    
    def _load(self):
        """Load YAML and save as JSON"""
        with open(self.yaml_file, 'r', encoding='utf-8') as f:
            self.data = yaml.safe_load(f)
        with open(self.json_file, 'w', encoding='utf-8') as f:
            json.dump(self.data, f, indent=2, ensure_ascii=False)
    
    def _save(self):
        """Save JSON back to YAML"""
        with open(self.yaml_file, 'w', encoding='utf-8') as f:
            yaml.dump(self.data, f, 
                     default_flow_style=False, 
                     allow_unicode=True,
                     sort_keys=False,
                     width=1000)
    
    def get(self, path: str) -> Optional[str]:
        """Get value by path (e.g., 'domains.Engaging_with_AI.overview')"""
        keys = path.split('.')
        value = self.data
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        
        return value if isinstance(value, str) else str(value)
    
    def translate(self, path: str, language: str, translation: str) -> bool:
        """Set translation for a field"""
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
            # Save to JSON immediately
            with open(self.json_file, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
            return True
        
        return False
    
    def commit(self):
        """Save all changes back to YAML"""
        self._save()
        print(f"Changes saved to {self.yaml_file}")

# Command line interface
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage:")
        print("  Get value: python translate_yaml.py get <path>")
        print("  Translate: python translate_yaml.py translate <path> <language> <translation>")
        print("  Commit:    python translate_yaml.py commit")
        print("\nExample:")
        print("  python translate_yaml.py get domains.Engaging_with_AI.overview")
        print("  python translate_yaml.py translate domains.Engaging_with_AI.overview zhCN '涉及使用AI作為工具...'")
        sys.exit(1)
    
    yaml_file = "/Users/young/project/ai-square/frontend/public/rubrics_data/ai_lit_domains.yaml"
    translator = YAMLTranslator(yaml_file)
    
    command = sys.argv[1]
    
    if command == "get":
        path = sys.argv[2]
        value = translator.get(path)
        if value:
            print(value)
        else:
            print(f"Path not found: {path}")
    
    elif command == "translate":
        if len(sys.argv) < 5:
            print("Error: translate requires path, language, and translation")
            sys.exit(1)
        
        path = sys.argv[2]
        language = sys.argv[3]
        translation = sys.argv[4]
        
        if translator.translate(path, language, translation):
            print(f"Translation saved for {path}_{language}")
        else:
            print(f"Failed to save translation")
    
    elif command == "commit":
        translator.commit()
    
    else:
        print(f"Unknown command: {command}")