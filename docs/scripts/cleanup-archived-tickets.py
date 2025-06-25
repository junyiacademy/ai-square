#!/usr/bin/env python3
"""
Cleanup script for archived tickets data quality issues.

This script addresses the following issues:
1. Inconsistent filename formats
2. Empty sessions (found in 70%+ of tickets)
3. Missing or incorrect duration calculations
4. Missing required fields (id, type, status)
5. Data validation and reporting
"""

import os
import sys
import yaml
import json
import shutil
import argparse
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Tuple
import re

class TicketCleaner:
    def __init__(self, archive_path: str, backup_path: str, dry_run: bool = True):
        self.archive_path = Path(archive_path)
        self.backup_path = Path(backup_path)
        self.dry_run = dry_run
        self.report = {
            'total_files': 0,
            'files_processed': 0,
            'files_with_issues': 0,
            'issues_fixed': {
                'filename_format': 0,
                'empty_sessions': 0,
                'duration_calculations': 0,
                'missing_fields': 0,
                'empty_ids': 0
            },
            'errors': [],
            'details': []
        }
        
    def run(self):
        """Main execution method."""
        print(f"🧹 Starting ticket cleanup (dry_run={self.dry_run})")
        
        # Create backup directory if not in dry run
        if not self.dry_run:
            self.backup_path.mkdir(parents=True, exist_ok=True)
            
        # Process all YAML files
        yaml_files = list(self.archive_path.rglob("*.yml"))
        self.report['total_files'] = len(yaml_files)
        
        for yaml_file in yaml_files:
            self.process_ticket(yaml_file)
            
        # Generate and save report
        self.generate_report()
        
    def process_ticket(self, file_path: Path):
        """Process a single ticket file."""
        try:
            # Read ticket data
            with open(file_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
                
            if not data:
                self.report['errors'].append(f"Empty file: {file_path}")
                return
                
            original_data = yaml.dump(data, allow_unicode=True)
            issues_found = []
            
            # Check and fix filename format
            new_filename = self.check_filename_format(file_path)
            if new_filename != file_path.name:
                issues_found.append('filename_format')
                
            # Fix empty sessions
            if self.fix_empty_sessions(data):
                issues_found.append('empty_sessions')
                
            # Fix duration calculations
            if self.fix_duration_calculations(data):
                issues_found.append('duration_calculations')
                
            # Fix missing fields
            if self.fix_missing_fields(data, file_path):
                issues_found.append('missing_fields')
                
            # Fix empty IDs
            if self.fix_empty_id(data, file_path):
                issues_found.append('empty_ids')
                
            # If issues were found, process the file
            if issues_found:
                self.report['files_with_issues'] += 1
                
                # Update issue counts
                for issue in issues_found:
                    self.report['issues_fixed'][issue] += 1
                    
                # Save details
                self.report['details'].append({
                    'file': str(file_path.relative_to(self.archive_path)),
                    'issues': issues_found,
                    'changes_made': not self.dry_run
                })
                
                if not self.dry_run:
                    # Backup original file
                    backup_file = self.backup_path / file_path.relative_to(self.archive_path)
                    backup_file.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(file_path, backup_file)
                    
                    # Write cleaned data
                    with open(file_path, 'w', encoding='utf-8') as f:
                        yaml.dump(data, f, allow_unicode=True, sort_keys=False)
                        
                    # Rename file if needed
                    if new_filename != file_path.name:
                        new_path = file_path.parent / new_filename
                        file_path.rename(new_path)
                        
            self.report['files_processed'] += 1
            
        except Exception as e:
            self.report['errors'].append(f"Error processing {file_path}: {str(e)}")
            
    def check_filename_format(self, file_path: Path) -> str:
        """Check and return corrected filename format."""
        filename = file_path.name
        
        # Expected format: YYYYMMDD_HHMMSS-ticket-name.yml
        pattern = r'^(\d{8})_(\d{6})-(.+)\.yml$'
        
        if re.match(pattern, filename):
            return filename
            
        # Try to extract date and name from various formats
        # Format 1: YYYY-MM-DD-HH-MM-SS-name.yml
        pattern1 = r'^(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(.+)\.yml$'
        match1 = re.match(pattern1, filename)
        if match1:
            date = f"{match1.group(1)}{match1.group(2)}{match1.group(3)}"
            time = f"{match1.group(4)}{match1.group(5)}{match1.group(6)}"
            name = match1.group(7)
            return f"{date}_{time}-{name}.yml"
            
        # Format 2: YYYYMMDD_000000-name.yml (placeholder time)
        pattern2 = r'^(\d{8})_000000-(.+)\.yml$'
        match2 = re.match(pattern2, filename)
        if match2:
            # Keep the same format but note it has placeholder time
            return filename
            
        # Default: keep original
        return filename
        
    def fix_empty_sessions(self, data: Dict) -> bool:
        """Remove empty sessions and fix session structure."""
        if 'dev_log' not in data or 'sessions' not in data['dev_log']:
            return False
            
        sessions = data['dev_log']['sessions']
        original_count = len(sessions)
        
        # Filter out completely empty sessions
        cleaned_sessions = []
        for session in sessions:
            # Check if session has any meaningful content
            has_content = (
                session.get('activities', []) or
                session.get('challenges', []) or
                session.get('decisions', []) or
                session.get('files_modified', []) or
                session.get('ai_interactions', []) or
                session.get('duration_minutes', 0) > 0
            )
            
            # Fix placeholder dates
            if session.get('date') == 'YYYY-MM-DD':
                session['date'] = data.get('created_at', '2025-06-20')[:10]
                
            if has_content:
                cleaned_sessions.append(session)
                
        # Ensure at least one session exists
        if not cleaned_sessions and original_count > 0:
            # Create a minimal session from ticket metadata
            cleaned_sessions.append({
                'session_id': 1,
                'date': data.get('created_at', '2025-06-20')[:10],
                'start_time': data.get('created_at', '00:00:00')[-8:],
                'end_time': data.get('completed_at', '00:00:00')[-8:] if data.get('completed_at') else None,
                'duration_minutes': data.get('time_tracking', {}).get('actual_duration_minutes', 0),
                'activities': ['Ticket completed'],
                'challenges': [],
                'decisions': [],
                'files_modified': data.get('development', {}).get('files_changed', []),
                'ai_interactions': [],
                'next_steps': []
            })
            
        data['dev_log']['sessions'] = cleaned_sessions
        return original_count != len(cleaned_sessions)
        
    def fix_duration_calculations(self, data: Dict) -> bool:
        """Fix duration calculations based on timestamps."""
        if 'time_tracking' not in data:
            return False
            
        time_tracking = data['time_tracking']
        fixed = False
        
        # Calculate actual duration from timestamps
        started_at = data.get('created_at') or time_tracking.get('started_at')
        completed_at = data.get('completed_at') or time_tracking.get('completed_at')
        
        if started_at and completed_at and completed_at != 'null':
            try:
                start = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
                end = datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
                duration_minutes = int((end - start).total_seconds() / 60)
                
                if time_tracking.get('actual_duration_minutes', 0) != duration_minutes:
                    time_tracking['actual_duration_minutes'] = duration_minutes
                    fixed = True
            except:
                pass
                
        # Ensure other time fields exist
        if 'ai_time_minutes' not in time_tracking:
            time_tracking['ai_time_minutes'] = 0
            fixed = True
            
        if 'human_time_minutes' not in time_tracking:
            time_tracking['human_time_minutes'] = time_tracking.get('actual_duration_minutes', 0)
            fixed = True
            
        return fixed
        
    def fix_missing_fields(self, data: Dict, file_path: Path) -> bool:
        """Fix missing required fields."""
        fixed = False
        
        # Check and fix type
        if 'type' not in data or data['type'] == 'other':
            # Try to infer from name or description
            name = data.get('name', '').lower()
            if 'feature' in name:
                data['type'] = 'feature'
            elif 'bug' in name or 'fix' in name:
                data['type'] = 'bug'
            elif 'refactor' in name:
                data['type'] = 'refactor'
            else:
                data['type'] = 'feature'  # default
            fixed = True
            
        # Check status
        if 'status' not in data:
            # All archived tickets should be completed
            data['status'] = 'completed'
            fixed = True
            
        return fixed
        
    def fix_empty_id(self, data: Dict, file_path: Path) -> bool:
        """Fix empty ID fields."""
        if 'id' in data and (not data['id'] or data['id'] == ''):
            # Generate ID from filename
            filename = file_path.stem
            data['id'] = filename
            return True
        return False
        
    def generate_report(self):
        """Generate and save the cleanup report."""
        # Calculate summary statistics
        self.report['summary'] = {
            'success_rate': f"{(self.report['files_processed'] / max(self.report['total_files'], 1)) * 100:.1f}%",
            'files_with_issues_rate': f"{(self.report['files_with_issues'] / max(self.report['total_files'], 1)) * 100:.1f}%",
            'total_issues_fixed': sum(self.report['issues_fixed'].values()),
            'mode': 'DRY RUN' if self.dry_run else 'EXECUTED'
        }
        
        # Print summary
        print("\n📊 Cleanup Report Summary")
        print("=" * 50)
        print(f"Total files: {self.report['total_files']}")
        print(f"Files processed: {self.report['files_processed']}")
        print(f"Files with issues: {self.report['files_with_issues']}")
        print(f"\nIssues fixed:")
        for issue, count in self.report['issues_fixed'].items():
            print(f"  - {issue}: {count}")
        print(f"\nErrors encountered: {len(self.report['errors'])}")
        
        # Save detailed report
        report_path = Path('docs/reports/ticket-cleanup-report.json')
        report_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, indent=2, ensure_ascii=False)
            
        print(f"\n📄 Detailed report saved to: {report_path}")
        
        # Also save as YAML for readability
        yaml_report_path = Path('docs/reports/ticket-cleanup-report.yml')
        with open(yaml_report_path, 'w', encoding='utf-8') as f:
            yaml.dump(self.report, f, allow_unicode=True, sort_keys=False)
            
        if self.dry_run:
            print("\n⚠️  This was a DRY RUN. No files were modified.")
            print("Run with --execute to apply changes.")

def main():
    parser = argparse.ArgumentParser(description='Clean up archived tickets data quality issues')
    parser.add_argument('--execute', action='store_true', help='Execute changes (default is dry run)')
    parser.add_argument('--archive-path', default='docs/tickets/archive', help='Path to archive directory')
    parser.add_argument('--backup-path', default='docs/tickets/backup', help='Path to backup directory')
    
    args = parser.parse_args()
    
    cleaner = TicketCleaner(
        archive_path=args.archive_path,
        backup_path=args.backup_path,
        dry_run=not args.execute
    )
    
    cleaner.run()

if __name__ == '__main__':
    main()