#!/usr/bin/env python3
"""
Update CHANGELOG.md based on commit messages
"""

import subprocess
import os
import sys
from datetime import datetime
import re


def get_commit_info():
    """Get the latest commit information"""
    try:
        # Get commit message
        message = subprocess.check_output(
            ["git", "log", "-1", "--pretty=%B"],
            text=True
        ).strip()
        
        # Get commit hash
        commit_hash = subprocess.check_output(
            ["git", "log", "-1", "--pretty=%H"],
            text=True
        ).strip()[:7]
        
        return message, commit_hash
    except subprocess.CalledProcessError:
        return None, None


def parse_commit_type(message):
    """Parse commit type from conventional commit message"""
    # Match conventional commit format
    match = re.match(r'^(feat|fix|docs|style|refactor|test|chore|perf|build|ci)(\(.+\))?: (.+)', message)
    if match:
        commit_type = match.group(1)
        scope = match.group(2)
        description = match.group(3)
        return commit_type, scope, description
    return None, None, message


def get_changelog_section(commit_type):
    """Map commit type to changelog section"""
    mapping = {
        'feat': 'Added',
        'fix': 'Fixed',
        'docs': 'Documentation',
        'perf': 'Performance',
        'refactor': 'Changed',
        'test': 'Testing',
        'build': 'Build',
        'ci': 'CI/CD',
        'chore': 'Maintenance',
        'style': 'Style'
    }
    return mapping.get(commit_type, 'Changed')


def update_changelog(message, commit_hash):
    """Update CHANGELOG.md with new entry"""
    changelog_path = os.path.join(os.path.dirname(__file__), '..', 'CHANGELOG.md')
    
    if not os.path.exists(changelog_path):
        print(f"Error: {changelog_path} not found")
        return False
    
    # Parse commit type
    commit_type, scope, description = parse_commit_type(message)
    
    # Skip certain commit types that shouldn't go in changelog
    skip_types = ['style', 'test', 'ci', 'chore']
    if commit_type in skip_types and '--force' not in sys.argv:
        print(f"Skipping {commit_type} commit for changelog")
        return True
    
    # Read current changelog
    with open(changelog_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find the Unreleased section
    unreleased_idx = None
    for i, line in enumerate(lines):
        if line.strip() == '## [Unreleased]':
            unreleased_idx = i
            break
    
    if unreleased_idx is None:
        print("Warning: [Unreleased] section not found in CHANGELOG.md")
        return False
    
    # Get the appropriate section
    section = get_changelog_section(commit_type) if commit_type else 'Changed'
    
    # Find or create the appropriate subsection
    section_idx = None
    insert_idx = None
    
    # Look for the section after [Unreleased]
    for i in range(unreleased_idx + 1, len(lines)):
        line = lines[i].strip()
        
        # Stop at the next version header
        if line.startswith('## ['):
            insert_idx = i - 1
            break
            
        # Found our section
        if line == f'### {section}':
            section_idx = i
            # Find where to insert (before the next ### or ##)
            for j in range(i + 1, len(lines)):
                if lines[j].strip().startswith('###') or lines[j].strip().startswith('## ['):
                    insert_idx = j - 1
                    break
            break
    
    # Format the entry
    if scope:
        entry = f"- {description} {scope} ({commit_hash})\n"
    else:
        entry = f"- {description} ({commit_hash})\n"
    
    # Check if entry already exists
    changelog_content = ''.join(lines)
    if commit_hash in changelog_content:
        print(f"Entry for commit {commit_hash} already exists in changelog")
        return True
    
    # Insert the entry
    if section_idx is not None:
        # Section exists, add entry after it
        lines.insert(insert_idx, entry)
    else:
        # Section doesn't exist, create it
        # Find where to insert the new section (in alphabetical order)
        sections_order = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security', 
                         'Documentation', 'Performance', 'Testing', 'Build', 'CI/CD', 'Maintenance', 'Style']
        
        current_sections = []
        for i in range(unreleased_idx + 1, len(lines)):
            match = re.match(r'^### (.+)$', lines[i].strip())
            if match:
                current_sections.append((match.group(1), i))
            elif lines[i].strip().startswith('## ['):
                break
        
        # Find insertion point
        insert_at = None
        for idx, s in enumerate(sections_order):
            if s == section:
                # This is our section
                if idx == 0:
                    # First section
                    if current_sections:
                        insert_at = current_sections[0][1]
                    else:
                        insert_at = unreleased_idx + 2
                else:
                    # Find the previous section that exists
                    for prev_idx in range(idx - 1, -1, -1):
                        prev_section = sections_order[prev_idx]
                        for cs, line_idx in current_sections:
                            if cs == prev_section:
                                # Insert after this section
                                for j in range(line_idx + 1, len(lines)):
                                    if lines[j].strip().startswith('###') or lines[j].strip().startswith('## ['):
                                        insert_at = j
                                        break
                                break
                        if insert_at:
                            break
                    
                    if not insert_at:
                        # No previous section found, insert at beginning
                        if current_sections:
                            insert_at = current_sections[0][1]
                        else:
                            insert_at = unreleased_idx + 2
                break
        
        if insert_at:
            lines.insert(insert_at, f"\n### {section}\n")
            lines.insert(insert_at + 2, entry)
        else:
            # Fallback: insert before the next version
            for i in range(unreleased_idx + 1, len(lines)):
                if lines[i].strip().startswith('## ['):
                    lines.insert(i, f"\n### {section}\n")
                    lines.insert(i + 2, entry)
                    lines.insert(i + 3, "\n")
                    break
    
    # Write back to file
    with open(changelog_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print(f"Changelog updated: {section} - {description}")
    return True


def main():
    """Main function"""
    # Check if we should update
    if '--check' in sys.argv:
        # Just check if we would update
        message, commit_hash = get_commit_info()
        if message:
            commit_type, _, _ = parse_commit_type(message)
            skip_types = ['style', 'test', 'ci', 'chore']
            if commit_type in skip_types:
                print("No changelog update needed for this commit type")
            else:
                print("Changelog update recommended for this commit")
        return
    
    # Get commit info
    message, commit_hash = get_commit_info()
    if not message:
        print("Error: Could not get commit information")
        sys.exit(1)
    
    # Update changelog
    if update_changelog(message, commit_hash):
        print("Changelog update completed successfully")
    else:
        print("Changelog update failed")
        sys.exit(1)


if __name__ == "__main__":
    main()