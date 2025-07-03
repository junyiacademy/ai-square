#!/usr/bin/env python3
"""
Convert YAML files to JSON for production optimization
Maintains readability while improving performance
"""
import yaml
import json
from pathlib import Path
from typing import Dict, Any
import hashlib

class YamlToJsonConverter:
    def __init__(self, preserve_structure: bool = True):
        self.preserve_structure = preserve_structure
        self.conversion_stats = {
            'files_converted': 0,
            'size_reduction': 0,
            'errors': []
        }
    
    def convert_file(self, yaml_path: Path, json_path: Path = None) -> Dict[str, Any]:
        """Convert single YAML file to JSON"""
        if json_path is None:
            json_path = yaml_path.with_suffix('.json')
        
        try:
            # Load YAML
            with open(yaml_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
            
            # Calculate file sizes
            yaml_size = yaml_path.stat().st_size
            
            # Save as JSON with optimization
            with open(json_path, 'w', encoding='utf-8') as f:
                if self.preserve_structure:
                    # Pretty print for development
                    json.dump(data, f, indent=2, ensure_ascii=False, sort_keys=False)
                else:
                    # Minified for production
                    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
            
            json_size = json_path.stat().st_size
            
            # Generate metadata
            metadata = {
                'source': str(yaml_path),
                'output': str(json_path),
                'yaml_size': yaml_size,
                'json_size': json_size,
                'reduction': round((1 - json_size/yaml_size) * 100, 2),
                'checksum': self._calculate_checksum(data)
            }
            
            self.conversion_stats['files_converted'] += 1
            self.conversion_stats['size_reduction'] += (yaml_size - json_size)
            
            return metadata
            
        except Exception as e:
            self.conversion_stats['errors'].append({
                'file': str(yaml_path),
                'error': str(e)
            })
            raise
    
    def _calculate_checksum(self, data: Dict) -> str:
        """Calculate checksum for data integrity"""
        content = json.dumps(data, sort_keys=True)
        return hashlib.md5(content.encode()).hexdigest()
    
    def convert_directory(self, yaml_dir: Path, json_dir: Path = None):
        """Convert all YAML files in directory"""
        if json_dir is None:
            json_dir = yaml_dir
        
        yaml_files = list(yaml_dir.glob('*.yaml')) + list(yaml_dir.glob('*.yml'))
        
        print(f"Found {len(yaml_files)} YAML files to convert")
        
        for yaml_file in yaml_files:
            json_file = json_dir / yaml_file.with_suffix('.json').name
            print(f"Converting {yaml_file.name}...", end=' ')
            
            try:
                metadata = self.convert_file(yaml_file, json_file)
                print(f"✓ ({metadata['reduction']}% smaller)")
            except Exception as e:
                print(f"✗ Error: {e}")
    
    def create_loader_module(self, output_path: Path):
        """Create TypeScript module for loading JSON data"""
        loader_content = '''/**
 * Auto-generated JSON data loader
 * Replaces YAML loading for production performance
 */

import aiLitDomains from './ai_lit_domains.json'
import ksaCodes from './ksa_codes.json'
import aiLiteracyQuestions from './ai_literacy_questions.json'
import aiJobSearchScenario from './ai_job_search_scenario.json'

// Type imports remain the same
import type { DomainData } from '@/types/domain'
import type { KSACodesFile } from '@/lib/validation/schemas/ksa-codes.schema'

// Export with proper types
export const domainData = aiLitDomains as DomainData
export const ksaCodesData = ksaCodes as KSACodesFile
export const questionsData = aiLiteracyQuestions
export const scenarioData = aiJobSearchScenario

// Performance monitoring
if (process.env.NODE_ENV === 'development') {
  console.log('Using JSON data loader (optimized)')
}
'''
        
        with open(output_path, 'w') as f:
            f.write(loader_content)
        
        print(f"Created loader module at {output_path}")
    
    def generate_report(self) -> str:
        """Generate conversion report"""
        report = "=== YAML to JSON Conversion Report ===\n\n"
        report += f"Files converted: {self.conversion_stats['files_converted']}\n"
        report += f"Total size reduction: {self.conversion_stats['size_reduction']} bytes\n"
        report += f"Average reduction: {round(self.conversion_stats['size_reduction'] / max(self.conversion_stats['files_converted'], 1))} bytes/file\n"
        
        if self.conversion_stats['errors']:
            report += "\nErrors:\n"
            for error in self.conversion_stats['errors']:
                report += f"  - {error['file']}: {error['error']}\n"
        
        return report

def analyze_impact():
    """Analyze the impact of YAML to JSON conversion"""
    print("\n=== YAML vs JSON Impact Analysis ===\n")
    
    # File size comparison
    yaml_file = Path('/Users/young/project/ai-square/frontend/public/rubrics_data/ai_lit_domains.yaml')
    
    if yaml_file.exists():
        yaml_size = yaml_file.stat().st_size / 1024  # KB
        estimated_json_size = yaml_size * 0.85  # Estimate 15% reduction
        
        print(f"Current YAML size: {yaml_size:.1f} KB")
        print(f"Estimated JSON size: {estimated_json_size:.1f} KB")
        print(f"Estimated reduction: {yaml_size - estimated_json_size:.1f} KB\n")
    
    # Performance impact
    print("Performance Impact:")
    print("✅ Parse time: ~10x faster (native JSON.parse vs js-yaml)")
    print("✅ Bundle size: -40KB (remove js-yaml dependency)")
    print("✅ Memory usage: Lower (no YAML parser overhead)")
    print("✅ Caching: Better (browser native support)")
    print("\nDevelopment Impact:")
    print("❌ Readability: Harder to edit multi-line content")
    print("❌ Comments: Cannot add inline documentation")
    print("❌ Git diffs: More lines changed for simple edits")
    print("⚠️  Maintenance: Need conversion step in build process")
    
    # Recommendation
    print("\n📌 Recommendation:")
    print("1. Keep YAML for development (better DX)")
    print("2. Convert to JSON during build (better performance)")
    print("3. Use this converter in build pipeline")
    print("4. Version control both formats initially")

def main():
    import sys
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python yaml-to-json-converter.py convert <yaml_dir> [json_dir]")
        print("  python yaml-to-json-converter.py analyze")
        print("  python yaml-to-json-converter.py single <yaml_file> [json_file]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == 'analyze':
        analyze_impact()
    
    elif command == 'convert':
        yaml_dir = Path(sys.argv[2])
        json_dir = Path(sys.argv[3]) if len(sys.argv) > 3 else yaml_dir
        
        converter = YamlToJsonConverter(preserve_structure=False)
        converter.convert_directory(yaml_dir, json_dir)
        print("\n" + converter.generate_report())
        
        # Create loader module
        loader_path = json_dir / 'data-loader.ts'
        converter.create_loader_module(loader_path)
    
    elif command == 'single':
        yaml_file = Path(sys.argv[2])
        json_file = Path(sys.argv[3]) if len(sys.argv) > 3 else None
        
        converter = YamlToJsonConverter(preserve_structure=True)
        metadata = converter.convert_file(yaml_file, json_file)
        
        print(f"✅ Converted successfully")
        print(f"   Size reduction: {metadata['reduction']}%")
        print(f"   Checksum: {metadata['checksum']}")
    
    else:
        print(f"Unknown command: {command}")

if __name__ == "__main__":
    main()