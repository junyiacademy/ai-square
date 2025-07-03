#!/usr/bin/env python3
"""
Sync all locale JSON files to ensure every language has the same set of files as English
"""
import json
import os
from pathlib import Path
import shutil

class LocaleFileSync:
    def __init__(self):
        self.base_path = Path("/Users/young/project/ai-square/frontend/public/locales")
        self.base_language = "en"
        self.all_languages = ["zhTW", "zhCN", "pt", "ar", "id", "th", "es", "ja", "ko", "fr", "de", "ru", "it"]
        
    def get_base_files(self):
        """Get all JSON files from the base language (English)"""
        en_path = self.base_path / self.base_language
        return [f.name for f in en_path.glob("*.json")]
    
    def check_missing_files(self):
        """Check which files are missing in each language"""
        base_files = self.get_base_files()
        missing_report = {}
        
        for lang in self.all_languages:
            lang_path = self.base_path / lang
            
            # Create language directory if it doesn't exist
            if not lang_path.exists():
                lang_path.mkdir(parents=True)
                print(f"Created directory: {lang_path}")
            
            # Check which files are missing
            existing_files = [f.name for f in lang_path.glob("*.json")]
            missing_files = set(base_files) - set(existing_files)
            
            if missing_files:
                missing_report[lang] = list(missing_files)
        
        return missing_report, base_files
    
    def create_placeholder_content(self, source_content, target_lang):
        """Create placeholder content for a language"""
        def replace_text(obj, lang):
            if isinstance(obj, str):
                # Don't replace certain technical strings
                if obj in ['', ' ', '\n', '\t'] or obj.isdigit() or len(obj) <= 2:
                    return obj
                # Check if it's a key or technical term (contains underscores or is uppercase)
                if '_' in obj or obj.isupper() or obj.startswith('$') or obj.startswith('{'):
                    return obj
                return f"[{lang.upper()}] translation needed"
            elif isinstance(obj, dict):
                return {k: replace_text(v, lang) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [replace_text(item, lang) for item in obj]
            else:
                return obj
        
        return replace_text(source_content, target_lang)
    
    def sync_files(self, dry_run=False):
        """Sync all missing files"""
        missing_report, base_files = self.check_missing_files()
        
        if not missing_report:
            print("All languages have complete file sets!")
            return
        
        print(f"\n{'DRY RUN - ' if dry_run else ''}Missing files report:")
        total_missing = 0
        
        for lang, files in missing_report.items():
            print(f"\n{lang}: {len(files)} missing files")
            for file in files:
                print(f"  - {file}")
            total_missing += len(files)
        
        print(f"\nTotal missing files: {total_missing}")
        
        if dry_run:
            return
        
        # Create missing files
        created_count = 0
        for lang, missing_files in missing_report.items():
            lang_path = self.base_path / lang
            
            for file_name in missing_files:
                source_file = self.base_path / self.base_language / file_name
                target_file = lang_path / file_name
                
                try:
                    # Read source content
                    with open(source_file, 'r', encoding='utf-8') as f:
                        source_content = json.load(f)
                    
                    # Create placeholder content
                    target_content = self.create_placeholder_content(source_content, lang)
                    
                    # Write target file
                    with open(target_file, 'w', encoding='utf-8') as f:
                        json.dump(target_content, f, indent=2, ensure_ascii=False)
                    
                    created_count += 1
                    print(f"Created: {target_file}")
                    
                except Exception as e:
                    print(f"Error creating {target_file}: {e}")
        
        print(f"\nCreated {created_count} files successfully!")
    
    def generate_report(self):
        """Generate a detailed report of file coverage"""
        base_files = self.get_base_files()
        
        print("=== Locale File Coverage Report ===")
        print(f"Base language: {self.base_language}")
        print(f"Base files: {len(base_files)}")
        print(f"Languages to check: {len(self.all_languages)}")
        
        print("\nFile coverage by language:")
        
        coverage_data = []
        for lang in self.all_languages:
            lang_path = self.base_path / lang
            if lang_path.exists():
                existing_files = [f.name for f in lang_path.glob("*.json")]
                coverage = len(existing_files) / len(base_files) * 100
                coverage_data.append((lang, len(existing_files), coverage))
            else:
                coverage_data.append((lang, 0, 0))
        
        # Sort by coverage
        coverage_data.sort(key=lambda x: x[2], reverse=True)
        
        for lang, count, coverage in coverage_data:
            status = "✓" if coverage == 100 else "✗"
            print(f"{status} {lang}: {count}/{len(base_files)} files ({coverage:.1f}%)")
        
        print("\nBase files list:")
        for file in sorted(base_files):
            print(f"  - {file}")

def main():
    import sys
    
    syncer = LocaleFileSync()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "report":
            syncer.generate_report()
        elif command == "check":
            missing_report, _ = syncer.check_missing_files()
            if not missing_report:
                print("All languages have complete file sets!")
            else:
                syncer.sync_files(dry_run=True)
        elif command == "sync":
            syncer.sync_files(dry_run=False)
        else:
            print(f"Unknown command: {command}")
            print("Available commands: report, check, sync")
    else:
        print("Usage:")
        print("  python sync_all_locale_files.py report  - Show file coverage report")
        print("  python sync_all_locale_files.py check   - Check missing files (dry run)")
        print("  python sync_all_locale_files.py sync    - Create missing files")

if __name__ == "__main__":
    main()