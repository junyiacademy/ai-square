#!/usr/bin/env python3
"""
Merge split domain files back into a single optimized YAML file
"""
import yaml
import json
import os
from pathlib import Path

def merge_domains(domains_dir, output_file):
    """Merge split domain files into a single file"""
    
    # Read index file
    index_path = os.path.join(domains_dir, 'index.yaml')
    with open(index_path, 'r', encoding='utf-8') as f:
        index_data = yaml.safe_load(f)
    
    domains = {}
    
    # Load each domain file
    for domain_name in index_data['domains']:
        domain_file = os.path.join(domains_dir, f"{domain_name.lower()}.yaml")
        print(f"Loading {domain_file}")
        
        with open(domain_file, 'r', encoding='utf-8') as f:
            domain_data = yaml.safe_load(f)
        
        # Remove the 'domain' field and use the original key
        if 'domain' in domain_data:
            del domain_data['domain']
        
        domains[domain_name] = domain_data
    
    # Create the final structure
    final_data = {'domains': domains}
    
    # Write the merged YAML
    with open(output_file, 'w', encoding='utf-8') as f:
        yaml.dump(final_data, f, 
                  default_flow_style=False, 
                  allow_unicode=True,
                  sort_keys=False,
                  width=1000)  # Prevent line wrapping
    
    print(f"\nMerged file created: {output_file}")
    print(f"File size: {os.path.getsize(output_file):,} bytes ({os.path.getsize(output_file)//1024}KB)")

def optimize_yaml(input_file, output_file):
    """Optimize YAML by removing empty fields and compacting structure"""
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)
    
    def clean_dict(d):
        """Recursively remove None values and empty strings"""
        if not isinstance(d, dict):
            return d
        
        cleaned = {}
        for k, v in d.items():
            if v is None or v == '' or v == [] or v == {}:
                continue
            if isinstance(v, dict):
                v = clean_dict(v)
                if v:  # Only add if not empty after cleaning
                    cleaned[k] = v
            elif isinstance(v, list):
                cleaned_list = [clean_dict(item) if isinstance(item, dict) else item for item in v if item]
                if cleaned_list:
                    cleaned[k] = cleaned_list
            else:
                cleaned[k] = v
        
        return cleaned
    
    cleaned_data = clean_dict(data)
    
    # Write optimized YAML
    with open(output_file, 'w', encoding='utf-8') as f:
        yaml.dump(cleaned_data, f, 
                  default_flow_style=False, 
                  allow_unicode=True,
                  sort_keys=False,
                  width=1000)
    
    print(f"Optimized file created: {output_file}")
    print(f"File size: {os.path.getsize(output_file):,} bytes ({os.path.getsize(output_file)//1024}KB)")

def main():
    base_dir = Path("/Users/young/project/ai-square/frontend")
    domains_dir = base_dir / "public/rubrics_data/domains"
    merged_file = base_dir / "public/rubrics_data/ai_lit_domains_merged.yaml"
    optimized_file = base_dir / "public/rubrics_data/ai_lit_domains_optimized.yaml"
    
    # Step 1: Merge split files
    print("=== Merging split domain files ===")
    merge_domains(domains_dir, merged_file)
    
    # Step 2: Optimize the merged file
    print("\n=== Optimizing YAML structure ===")
    optimize_yaml(merged_file, optimized_file)
    
    # Show size comparison
    original_file = base_dir / "public/rubrics_data/ai_lit_domains.yaml"
    if original_file.exists():
        print(f"\n=== Size Comparison ===")
        print(f"Original: {os.path.getsize(original_file):,} bytes")
        print(f"Merged: {os.path.getsize(merged_file):,} bytes")
        print(f"Optimized: {os.path.getsize(optimized_file):,} bytes")
        
        reduction = (1 - os.path.getsize(optimized_file) / os.path.getsize(original_file)) * 100
        print(f"Size reduction: {reduction:.1f}%")

if __name__ == "__main__":
    main()