#!/usr/bin/env python3
"""
JSON-First Development Workflow
1. Developers work with JSON (better tooling, validation)
2. Auto-convert to YAML for non-technical users
3. Sync changes back to JSON
"""
import json
import yaml
from pathlib import Path
from typing import Dict, Any, List
import datetime
import difflib

class JsonYamlWorkflow:
    def __init__(self):
        self.json_dir = Path('/Users/young/project/ai-square/frontend/public/rubrics_data/json')
        self.yaml_dir = Path('/Users/young/project/ai-square/frontend/public/rubrics_data/yaml')
        self.config = {
            'preserve_order': True,
            'add_comments': True,
            'format_multiline': True
        }
    
    def json_to_yaml(self, json_path: Path, yaml_path: Path = None) -> Path:
        """Convert JSON to human-friendly YAML"""
        if yaml_path is None:
            yaml_path = self.yaml_dir / json_path.with_suffix('.yaml').name
        
        # Load JSON
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Create YAML with better formatting
        yaml_content = self._create_readable_yaml(data, json_path.stem)
        
        # Ensure directory exists
        yaml_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save YAML
        with open(yaml_path, 'w', encoding='utf-8') as f:
            f.write(yaml_content)
        
        print(f"✅ Converted {json_path.name} → {yaml_path.name}")
        return yaml_path
    
    def _create_readable_yaml(self, data: Dict, filename: str) -> str:
        """Create YAML with comments and formatting for non-technical users"""
        
        # Add metadata comment
        header = f"""# {filename.replace('_', ' ').title()}
# 最後更新: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}
# 
# 🔍 編輯指南:
# - 保持縮排一致（使用空格，不要用 Tab）
# - 多語言欄位格式: field_語言代碼 (如 description_zhTW)
# - 支援的語言: en, zhTW, zhCN, pt, ar, id, th, es, ja, ko, fr, de, ru, it
# - 多行文字請使用 | 符號
#
"""
        
        # Custom YAML dumper for better formatting
        class ReadableYAMLDumper(yaml.Dumper):
            def increase_indent(self, flow=False, indentless=False):
                return super().increase_indent(flow, False)
        
        def str_presenter(dumper, data):
            """Format multi-line strings nicely"""
            if len(data) > 80 or '\n' in data:
                return dumper.represent_scalar('tag:yaml.org,2002:str', data, style='|')
            return dumper.represent_scalar('tag:yaml.org,2002:str', data)
        
        ReadableYAMLDumper.add_representer(str, str_presenter)
        
        # Convert to YAML with custom formatting
        yaml_content = yaml.dump(
            data,
            Dumper=ReadableYAMLDumper,
            default_flow_style=False,
            allow_unicode=True,
            sort_keys=False,
            width=1000
        )
        
        # Add section comments for better navigation
        if 'domains' in data:
            yaml_content = yaml_content.replace('domains:', '\n# 🎯 AI 素養領域\ndomains:')
        if 'knowledge_codes' in data:
            yaml_content = yaml_content.replace('knowledge_codes:', '\n# 📚 知識代碼 (Knowledge)\nknowledge_codes:')
        if 'skills_codes' in data:
            yaml_content = yaml_content.replace('skills_codes:', '\n# 🛠️ 技能代碼 (Skills)\nskills_codes:')
        if 'attitudes_codes' in data:
            yaml_content = yaml_content.replace('attitudes_codes:', '\n# 💡 態度代碼 (Attitudes)\nattitudes_codes:')
        
        return header + yaml_content
    
    def yaml_to_json(self, yaml_path: Path, json_path: Path = None) -> Path:
        """Convert YAML back to JSON after editing"""
        if json_path is None:
            json_path = self.json_dir / yaml_path.with_suffix('.json').name
        
        # Load YAML
        with open(yaml_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
        
        # Validate before saving
        validation_errors = self._validate_structure(data)
        if validation_errors:
            print(f"⚠️  Validation errors in {yaml_path.name}:")
            for error in validation_errors:
                print(f"   - {error}")
            raise ValueError("YAML validation failed")
        
        # Save as JSON
        json_path.parent.mkdir(parents=True, exist_ok=True)
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        print(f"✅ Converted {yaml_path.name} → {json_path.name}")
        return json_path
    
    def _validate_structure(self, data: Dict) -> List[str]:
        """Validate data structure integrity"""
        errors = []
        
        # Check for required language fields
        required_languages = ['zhTW', 'es', 'ja', 'ko', 'fr', 'de', 'ru', 'it']
        
        def check_translations(obj, path=""):
            if isinstance(obj, dict):
                # Check if this object has translatable fields
                base_fields = [k for k in obj.keys() if not any(k.endswith(f'_{lang}') for lang in required_languages)]
                
                for base_field in base_fields:
                    if isinstance(obj.get(base_field), str) and len(obj[base_field]) > 0:
                        # This is a translatable field
                        for lang in required_languages:
                            lang_field = f"{base_field}_{lang}"
                            if lang_field not in obj:
                                errors.append(f"{path}.{lang_field} is missing")
                
                # Recurse
                for key, value in obj.items():
                    new_path = f"{path}.{key}" if path else key
                    check_translations(value, new_path)
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    check_translations(item, f"{path}[{i}]")
        
        check_translations(data)
        return errors[:10]  # Limit to first 10 errors
    
    def sync_changes(self, watch_yaml: bool = True):
        """Sync changes between JSON and YAML"""
        print("🔄 Starting sync process...")
        
        if watch_yaml:
            # Check for YAML changes and update JSON
            yaml_files = list(self.yaml_dir.glob('*.yaml'))
            for yaml_file in yaml_files:
                json_file = self.json_dir / yaml_file.with_suffix('.json').name
                
                if not json_file.exists() or yaml_file.stat().st_mtime > json_file.stat().st_mtime:
                    print(f"📝 YAML changed: {yaml_file.name}")
                    try:
                        self.yaml_to_json(yaml_file)
                    except Exception as e:
                        print(f"❌ Error: {e}")
        else:
            # Check for JSON changes and update YAML
            json_files = list(self.json_dir.glob('*.json'))
            for json_file in json_files:
                yaml_file = self.yaml_dir / json_file.with_suffix('.yaml').name
                
                if not yaml_file.exists() or json_file.stat().st_mtime > yaml_file.stat().st_mtime:
                    print(f"📝 JSON changed: {json_file.name}")
                    self.json_to_yaml(json_file)
    
    def create_development_setup(self):
        """Setup development environment for JSON-first workflow"""
        print("🚀 Setting up JSON-first development workflow...\n")
        
        # Create directories
        self.json_dir.mkdir(parents=True, exist_ok=True)
        self.yaml_dir.mkdir(parents=True, exist_ok=True)
        
        # Create VS Code settings for better JSON editing
        vscode_settings = {
            "json.schemas": [
                {
                    "fileMatch": ["*/rubrics_data/json/ai_lit_domains.json"],
                    "schema": {
                        "$schema": "http://json-schema.org/draft-07/schema#",
                        "type": "object",
                        "properties": {
                            "domains": {
                                "type": "object",
                                "patternProperties": {
                                    "^[A-Za-z_]+$": {
                                        "type": "object",
                                        "required": ["emoji", "overview", "competencies"],
                                        "properties": {
                                            "emoji": {"type": "string", "pattern": "^.{1,2}$"},
                                            "overview": {"type": "string"},
                                            "competencies": {"type": "object"}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ]
        }
        
        vscode_path = Path('.vscode/settings.json')
        vscode_path.parent.mkdir(exist_ok=True)
        
        # Update or create VS Code settings
        if vscode_path.exists():
            with open(vscode_path, 'r') as f:
                existing = json.load(f)
            existing.update(vscode_settings)
            settings = existing
        else:
            settings = vscode_settings
        
        with open(vscode_path, 'w') as f:
            json.dump(settings, f, indent=2)
        
        print("✅ Created VS Code settings for JSON schema validation")
        
        # Create README for the workflow
        readme_content = """# JSON-First Development Workflow

## 概覽
此專案採用 JSON-First 開發流程：
1. 開發者使用 JSON 格式（更好的工具支援）
2. 自動轉換成 YAML 給非技術人員編輯
3. 變更同步回 JSON

## 目錄結構
```
rubrics_data/
├── json/          # 開發者編輯（原始檔案）
│   ├── ai_lit_domains.json
│   ├── ksa_codes.json
│   └── ...
└── yaml/          # 非技術人員編輯（自動生成）
    ├── ai_lit_domains.yaml
    ├── ksa_codes.yaml
    └── ...
```

## 工作流程

### 開發者
1. 編輯 `json/` 目錄下的檔案
2. 執行 `npm run sync:json-to-yaml` 生成 YAML
3. 提交兩種格式到版本控制

### 內容編輯者
1. 編輯 `yaml/` 目錄下的檔案
2. 執行 `npm run sync:yaml-to-json` 同步回 JSON
3. 如有錯誤會顯示驗證訊息

## 指令
```bash
# JSON → YAML（開發後執行）
npm run sync:json-to-yaml

# YAML → JSON（編輯後執行）
npm run sync:yaml-to-json

# 監控檔案變更並自動同步
npm run sync:watch
```

## 優點
- ✅ 開發者：更好的 IDE 支援、型別檢查、自動完成
- ✅ 編輯者：更友善的 YAML 格式、中文註解
- ✅ 雙向同步：確保資料一致性
- ✅ 驗證機制：防止結構錯誤
"""
        
        readme_path = self.yaml_dir.parent / 'README.md'
        with open(readme_path, 'w', encoding='utf-8') as f:
            f.write(readme_content)
        
        print("✅ Created workflow README")
        print("\n📌 Next steps:")
        print("1. Move existing YAML files to yaml/ directory")
        print("2. Run: python json-to-yaml-workflow.py init")
        print("3. Update imports to use json/ directory")

def main():
    import sys
    
    workflow = JsonYamlWorkflow()
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python json-to-yaml-workflow.py setup     # Setup development environment")
        print("  python json-to-yaml-workflow.py j2y       # Convert all JSON to YAML")
        print("  python json-to-yaml-workflow.py y2j       # Convert all YAML to JSON")
        print("  python json-to-yaml-workflow.py sync      # Sync changes")
        print("  python json-to-yaml-workflow.py watch     # Watch and sync")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'setup':
        workflow.create_development_setup()
    
    elif command == 'j2y':
        # Convert all JSON files to YAML
        json_files = list(workflow.json_dir.glob('*.json'))
        for json_file in json_files:
            workflow.json_to_yaml(json_file)
    
    elif command == 'y2j':
        # Convert all YAML files to JSON
        yaml_files = list(workflow.yaml_dir.glob('*.yaml'))
        for yaml_file in yaml_files:
            try:
                workflow.yaml_to_json(yaml_file)
            except Exception as e:
                print(f"❌ Failed {yaml_file.name}: {e}")
    
    elif command == 'sync':
        workflow.sync_changes()
    
    elif command == 'watch':
        print("👀 Watching for changes... (Ctrl+C to stop)")
        import time
        while True:
            workflow.sync_changes()
            time.sleep(2)

if __name__ == "__main__":
    main()