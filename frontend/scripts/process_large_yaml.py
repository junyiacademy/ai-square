#!/usr/bin/env python3
"""
Process large YAML files by converting to JSON for easier manipulation
"""
import yaml
import json
import os
from pathlib import Path

def yaml_to_json(yaml_file_path, json_file_path):
    """Convert YAML to JSON"""
    print(f"Reading YAML file: {yaml_file_path}")
    
    # Read YAML with safe loader
    with open(yaml_file_path, 'r', encoding='utf-8') as yaml_file:
        data = yaml.safe_load(yaml_file)
    
    # Write JSON with pretty formatting
    with open(json_file_path, 'w', encoding='utf-8') as json_file:
        json.dump(data, json_file, indent=2, ensure_ascii=False)
    
    print(f"JSON saved to: {json_file_path}")
    return data

def json_to_yaml(json_file_path, yaml_file_path):
    """Convert JSON back to YAML"""
    print(f"Reading JSON file: {json_file_path}")
    
    # Read JSON
    with open(json_file_path, 'r', encoding='utf-8') as json_file:
        data = json.load(json_file)
    
    # Write YAML with proper formatting
    with open(yaml_file_path, 'w', encoding='utf-8') as yaml_file:
        yaml.dump(data, yaml_file, 
                  default_flow_style=False, 
                  allow_unicode=True,
                  sort_keys=False,
                  width=1000)  # Prevent line wrapping
    
    print(f"YAML saved to: {yaml_file_path}")
    return data

def split_domains_to_separate_files(data, output_dir):
    """Split domains into separate files"""
    os.makedirs(output_dir, exist_ok=True)
    
    if 'domains' in data:
        domains = data['domains']
        
        # Save each domain to a separate file
        for domain_key, domain_data in domains.items():
            domain_file = os.path.join(output_dir, f"{domain_key.lower()}.yaml")
            
            # Create a structure with just this domain
            single_domain_data = {
                'domain': domain_key,
                'emoji': domain_data.get('emoji', ''),
                'overview': domain_data.get('overview', ''),
                'overview_zhTW': domain_data.get('overview_zhTW', ''),
                'overview_zhCN': domain_data.get('overview_zhCN', ''),
                'overview_pt': domain_data.get('overview_pt', ''),
                'overview_ar': domain_data.get('overview_ar', ''),
                'overview_id': domain_data.get('overview_id', ''),
                'overview_th': domain_data.get('overview_th', ''),
                'overview_es': domain_data.get('overview_es', ''),
                'overview_ja': domain_data.get('overview_ja', ''),
                'overview_ko': domain_data.get('overview_ko', ''),
                'overview_fr': domain_data.get('overview_fr', ''),
                'overview_de': domain_data.get('overview_de', ''),
                'overview_ru': domain_data.get('overview_ru', ''),
                'overview_it': domain_data.get('overview_it', ''),
                'competencies': domain_data.get('competencies', {})
            }
            
            # Remove empty fields
            single_domain_data = {k: v for k, v in single_domain_data.items() if v}
            
            with open(domain_file, 'w', encoding='utf-8') as f:
                yaml.dump(single_domain_data, f, 
                         default_flow_style=False, 
                         allow_unicode=True,
                         sort_keys=False,
                         width=1000)
            
            print(f"Created: {domain_file}")
            
            # Also save as JSON for easier processing
            json_file = os.path.join(output_dir, f"{domain_key.lower()}.json")
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(single_domain_data, f, indent=2, ensure_ascii=False)
                
        # Create an index file that lists all domains
        index_file = os.path.join(output_dir, 'index.yaml')
        index_data = {
            'domains': list(domains.keys()),
            'description': 'AI Literacy Domains - Split into separate files for better management'
        }
        
        with open(index_file, 'w', encoding='utf-8') as f:
            yaml.dump(index_data, f, default_flow_style=False, allow_unicode=True)
        
        print(f"\nCreated index file: {index_file}")

def analyze_file_structure(data):
    """Analyze the structure and size of the data"""
    print("\n=== File Structure Analysis ===")
    
    def get_size_info(obj, path=""):
        if isinstance(obj, dict):
            for key, value in obj.items():
                current_path = f"{path}.{key}" if path else key
                if isinstance(value, (dict, list)):
                    get_size_info(value, current_path)
                else:
                    # Estimate size
                    size = len(str(value)) if value else 0
                    if size > 1000:  # Only show large fields
                        print(f"{current_path}: ~{size} chars")
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                get_size_info(item, f"{path}[{i}]")
    
    # Count domains and competencies
    if 'domains' in data:
        domains = data['domains']
        print(f"\nTotal domains: {len(domains)}")
        
        for domain_name, domain_data in domains.items():
            competencies = domain_data.get('competencies', {})
            print(f"\n{domain_name}:")
            print(f"  - Competencies: {len(competencies)}")
            
            # Count language fields
            lang_fields = [k for k in domain_data.keys() if '_' in k]
            print(f"  - Language fields: {len(lang_fields)}")
            
            # Show total size estimate
            domain_size = len(json.dumps(domain_data, ensure_ascii=False))
            print(f"  - Estimated size: {domain_size:,} bytes ({domain_size//1024}KB)")

def main():
    # Paths
    base_dir = Path("/Users/young/project/ai-square/frontend")
    yaml_path = base_dir / "public/rubrics_data/ai_lit_domains.yaml"
    json_path = base_dir / "public/rubrics_data/ai_lit_domains.json"
    split_dir = base_dir / "public/rubrics_data/domains"
    
    # Convert YAML to JSON
    print("=== Converting YAML to JSON ===")
    data = yaml_to_json(yaml_path, json_path)
    
    # Analyze structure
    analyze_file_structure(data)
    
    # Automatically split domains into separate files
    print("\n=== Splitting domains into separate files ===")
    split_domains_to_separate_files(data, split_dir)
    print(f"\nDomains split into separate files in: {split_dir}")
    
    print("\n=== File Summary ===")
    print(f"Original YAML: {yaml_path} ({os.path.getsize(yaml_path):,} bytes)")
    print(f"JSON version: {json_path} ({os.path.getsize(json_path):,} bytes)")
    print(f"Split files: {split_dir}/")

if __name__ == "__main__":
    main()