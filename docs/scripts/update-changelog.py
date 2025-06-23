#!/usr/bin/env python3
"""
Changelog 更新腳本
根據 commit 訊息和 dev logs 自動更新 CHANGELOG.md

規則：
1. 檢查今天有沒有 log
2. 如果沒有就從 dev logs 找
3. 如果已經有了，就整理進去
4. 盡量 aggregate 相同的功能
5. 如果有矛盾以最後的 commit 為主
"""

import subprocess
import os
import sys
from datetime import datetime
import re
import yaml
from pathlib import Path
from typing import List, Dict, Optional, Tuple


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


def collect_today_dev_logs():
    """收集今天的 dev logs"""
    today = datetime.now().strftime('%Y-%m-%d')
    project_root = Path(__file__).parent.parent.parent
    dev_logs_path = project_root / "docs" / "dev-logs" / today
    
    changes = {
        'feat': [],
        'fix': [],
        'refactor': [],
        'perf': [],
        'docs': [],
        'test': [],
        'chore': []
    }
    
    if dev_logs_path.exists():
        for log_file in dev_logs_path.glob("*.yml"):
            try:
                with open(log_file, 'r', encoding='utf-8') as f:
                    log_data = yaml.safe_load(f)
                    
                if log_data and log_data.get('status') == 'completed':
                    commit_type = log_data.get('type', 'other')
                    title = log_data.get('title', '')
                    commit_hash = log_data.get('commit_hash', '')
                    
                    # 解析 commit message
                    commit_type_parsed, _, desc = parse_commit_type(title)
                    
                    if commit_type_parsed:
                        changes[commit_type_parsed].append({
                            'description': desc,
                            'commit_hash': commit_hash,
                            'full_title': title
                        })
            except Exception as e:
                print(f"⚠️ 無法讀取 {log_file.name}: {e}")
    
    return changes


def check_today_section_exists(lines):
    """檢查今天的 section 是否存在"""
    today = datetime.now().strftime('%Y-%m-%d')
    pattern = rf'## \[{today}\]'
    
    for line in lines:
        if re.match(pattern, line.strip()):
            return True
    return False


def update_changelog(message, commit_hash, aggregate_today=False):
    """Update CHANGELOG.md with new entry"""
    changelog_path = os.path.join(os.path.dirname(__file__), '..', 'CHANGELOG.md')
    
    if not os.path.exists(changelog_path):
        print(f"Error: {changelog_path} not found")
        return False
    
    # Parse commit type
    commit_type, scope, description = parse_commit_type(message)
    
    # Skip certain commit types that shouldn't go in changelog
    skip_types = ['style', 'test', 'ci', 'chore', 'docs']
    if commit_type in skip_types and '--force' not in sys.argv:
        print(f"Skipping {commit_type} commit for changelog")
        return True
    
    # Read current changelog
    with open(changelog_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # 如果要求 aggregate 今天的變更
    if aggregate_today:
        today = datetime.now().strftime('%Y-%m-%d')
        
        # 檢查是否已有今天的 section
        if not check_today_section_exists(lines):
            print(f"📊 創建今天 ({today}) 的 changelog section...")
            
            # 收集今天的所有變更
            today_changes = collect_today_dev_logs()
            
            # 也從 git log 獲取今天的 commits
            result = subprocess.run([
                "git", "log", 
                f"--since={today} 00:00:00",
                f"--until={today} 23:59:59",
                "--pretty=format:%H|%s"
            ], capture_output=True, text=True)
            
            if result.returncode == 0 and result.stdout:
                for line in result.stdout.strip().split('\n'):
                    if '|' in line:
                        commit_h, msg = line.split('|', 1)
                        ct, _, desc = parse_commit_type(msg)
                        
                        if ct and ct not in skip_types:
                            # 檢查是否已經在 dev logs 中
                            already_exists = any(
                                item['commit_hash'] == commit_h[:7]
                                for items in today_changes.values()
                                for item in items
                            )
                            
                            if not already_exists:
                                today_changes[ct].append({
                                    'description': desc,
                                    'commit_hash': commit_h[:7],
                                    'full_title': msg
                                })
            
            # 生成今天的 section
            lines = insert_today_section(lines, today, today_changes)
        else:
            print(f"📝 更新今天 ({today}) 的 changelog...")
    
    # Find the appropriate place to insert the current commit
    # Check if entry already exists
    changelog_content = ''.join(lines)
    if commit_hash[:7] in changelog_content:
        print(f"Entry for commit {commit_hash[:7]} already exists in changelog")
        return True
    
    # Get the appropriate section
    section = get_changelog_section(commit_type) if commit_type else 'Changed'
    
    # 如果有今天的 section，添加到那裡
    today = datetime.now().strftime('%Y-%m-%d')
    today_section_pattern = rf'## \[{today}\]'
    today_section_idx = None
    
    for i, line in enumerate(lines):
        if re.match(today_section_pattern, line.strip()):
            today_section_idx = i
            break
    
    if today_section_idx is not None:
        # 在今天的 section 中添加
        lines = add_entry_to_section(lines, today_section_idx, section, description, commit_hash[:7])
    else:
        # 在 [Unreleased] section 中添加
        unreleased_idx = None
        for i, line in enumerate(lines):
            if line.strip() == '## [Unreleased]':
                unreleased_idx = i
                break
        
        if unreleased_idx is not None:
            lines = add_entry_to_section(lines, unreleased_idx, section, description, commit_hash[:7])
        else:
            print("Warning: Neither [Unreleased] nor today's section found")
            return False
    
    # Write back to file
    with open(changelog_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print(f"✅ Changelog updated: {section} - {description}")
    return True


def insert_today_section(lines, today, changes):
    """插入今天的 section"""
    # 生成 section 標題
    section_title = f"\n## [{today}] - 今日開發總結\n\n"
    
    # 生成內容
    content = []
    
    if changes['feat']:
        content.append("### Added\n")
        for item in sorted(changes['feat'], key=lambda x: x['commit_hash']):
            content.append(f"- {item['description']} ({item['commit_hash']})\n")
        content.append("\n")
    
    if changes['fix']:
        content.append("### Fixed\n")
        for item in sorted(changes['fix'], key=lambda x: x['commit_hash']):
            content.append(f"- {item['description']} ({item['commit_hash']})\n")
        content.append("\n")
    
    if changes['refactor'] or changes['perf']:
        content.append("### Changed\n")
        for item in sorted(changes['refactor'] + changes['perf'], key=lambda x: x['commit_hash']):
            content.append(f"- {item['description']} ({item['commit_hash']})\n")
        content.append("\n")
    
    # Find [Unreleased] section
    unreleased_idx = None
    for i, line in enumerate(lines):
        if line.strip() == '## [Unreleased]':
            unreleased_idx = i
            break
    
    if unreleased_idx is not None:
        # Insert after [Unreleased]
        insert_pos = unreleased_idx + 1
        while insert_pos < len(lines) and lines[insert_pos].strip() == '':
            insert_pos += 1
        
        lines[insert_pos:insert_pos] = [section_title] + content
    else:
        # Insert at the beginning after the header
        header_end = 0
        for i, line in enumerate(lines):
            if line.strip() and not line.startswith('#'):
                header_end = i
                break
        
        lines[header_end:header_end] = [section_title] + content
    
    return lines


def add_entry_to_section(lines, section_start_idx, subsection_name, description, commit_hash):
    """在指定 section 中添加 entry"""
    # Find the end of this section
    section_end_idx = len(lines)
    for i in range(section_start_idx + 1, len(lines)):
        if lines[i].strip().startswith('## ['):
            section_end_idx = i
            break
    
    # Find or create subsection
    subsection_idx = None
    for i in range(section_start_idx + 1, section_end_idx):
        if lines[i].strip() == f'### {subsection_name}':
            subsection_idx = i
            break
    
    entry = f"- {description} ({commit_hash})\n"
    
    if subsection_idx is not None:
        # Find where to insert in existing subsection
        insert_at = subsection_idx + 1
        for i in range(subsection_idx + 1, section_end_idx):
            if lines[i].strip().startswith('###') or lines[i].strip().startswith('## ['):
                insert_at = i - 1
                break
            elif lines[i].strip():
                insert_at = i + 1
        
        lines.insert(insert_at, entry)
    else:
        # Create new subsection
        # Find appropriate position (maintain subsection order)
        subsection_order = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security']
        
        insert_at = section_start_idx + 1
        # Skip empty lines after section header
        while insert_at < section_end_idx and not lines[insert_at].strip():
            insert_at += 1
        
        # Find correct position based on order
        for ordered_section in subsection_order:
            if ordered_section == subsection_name:
                break
            
            # Check if this ordered section exists
            for i in range(section_start_idx + 1, section_end_idx):
                if lines[i].strip() == f'### {ordered_section}':
                    # Skip to after this subsection
                    insert_at = i + 1
                    while insert_at < section_end_idx:
                        if lines[insert_at].strip().startswith('###') or lines[insert_at].strip().startswith('## ['):
                            break
                        insert_at += 1
                    break
        
        # Insert new subsection
        if insert_at < section_end_idx and lines[insert_at - 1].strip():
            lines.insert(insert_at, '\n')
            insert_at += 1
        
        lines.insert(insert_at, f"### {subsection_name}\n")
        lines.insert(insert_at + 1, entry)
        
        if insert_at + 2 < section_end_idx and lines[insert_at + 2].strip():
            lines.insert(insert_at + 2, '\n')
    
    return lines


def main():
    """Main function"""
    # Check if we should update
    if '--check' in sys.argv:
        # Just check if we would update
        message, commit_hash = get_commit_info()
        if message:
            commit_type, _, _ = parse_commit_type(message)
            skip_types = ['style', 'test', 'ci', 'chore', 'docs']
            if commit_type in skip_types:
                print("No changelog update needed for this commit type")
            else:
                print("Changelog update recommended for this commit")
        return
    
    # Check if we should aggregate today's changes
    aggregate_today = '--aggregate' in sys.argv or '--today' in sys.argv
    
    # Get commit info
    message, commit_hash = get_commit_info()
    if not message:
        print("Error: Could not get commit information")
        sys.exit(1)
    
    # Update changelog
    if update_changelog(message, commit_hash, aggregate_today=aggregate_today):
        print("Changelog update completed successfully")
    else:
        print("Changelog update failed")
        sys.exit(1)


if __name__ == "__main__":
    main()