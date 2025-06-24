#!/usr/bin/env python3
"""
Secret 檢測器 - 防止敏感資訊洩露

檢測常見的 secrets：
- API Keys (AWS, Google, GitHub, etc.)
- Tokens (JWT, Bearer tokens)
- Passwords and credentials
- Database connection strings
- Private keys and certificates
"""

import os
import re
import sys
import json
import hashlib
import subprocess
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Tuple, Set

class SecretDetector:
    def __init__(self, project_root=None):
        self.project_root = Path(project_root or os.getcwd())
        self.secrets_found = []
        self.whitelist = self._load_whitelist()
        self.ignore_patterns = self._load_ignore_patterns()
        
        # Secret detection patterns
        self.secret_patterns = {
            'aws_access_key': {
                'pattern': r'AKIA[0-9A-Z]{16}',
                'description': 'AWS Access Key ID',
                'severity': 'high'
            },
            'aws_secret_key': {
                'pattern': r'[A-Za-z0-9/+=]{40}',
                'description': 'AWS Secret Access Key',
                'severity': 'high',
                'context_required': ['aws', 'secret', 'key']
            },
            'google_api_key': {
                'pattern': r'AIza[0-9A-Za-z\\-_]{35}',
                'description': 'Google API Key',
                'severity': 'high'
            },
            'github_token': {
                'pattern': r'ghp_[0-9A-Za-z]{36}',
                'description': 'GitHub Personal Access Token',
                'severity': 'high'
            },
            'github_oauth': {
                'pattern': r'gho_[0-9A-Za-z]{36}',
                'description': 'GitHub OAuth Token',
                'severity': 'high'
            },
            'jwt_token': {
                'pattern': r'eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*',
                'description': 'JSON Web Token (JWT)',
                'severity': 'medium'
            },
            'private_key': {
                'pattern': r'-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----',
                'description': 'Private Key',
                'severity': 'critical'
            },
            'password_in_url': {
                'pattern': r'://[^:]+:[^@]+@',
                'description': 'Password in URL',
                'severity': 'high'
            },
            'bearer_token': {
                'pattern': r'Bearer\s+[A-Za-z0-9\-._~+/]+=*',
                'description': 'Bearer Token',
                'severity': 'medium'
            },
            'slack_token': {
                'pattern': r'xox[baprs]-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24}',
                'description': 'Slack Token',
                'severity': 'high'
            },
            'stripe_key': {
                'pattern': r'sk_live_[0-9a-zA-Z]{24}',
                'description': 'Stripe Live Secret Key',
                'severity': 'critical'
            },
            'mailgun_key': {
                'pattern': r'key-[0-9a-zA-Z]{32}',
                'description': 'Mailgun API Key',
                'severity': 'high'
            },
            'twilio_key': {
                'pattern': r'SK[0-9a-fA-F]{32}',
                'description': 'Twilio API Key',
                'severity': 'high'
            },
            'generic_api_key': {
                'pattern': r'["\']?[Aa]pi[_-]?[Kk]ey["\']?\s*[:=]\s*["\']?[A-Za-z0-9_\-]{16,}["\']?',
                'description': 'Generic API Key',
                'severity': 'medium'
            },
            'generic_secret': {
                'pattern': r'["\']?[Ss]ecret["\']?\s*[:=]\s*["\']?[A-Za-z0-9_\-]{16,}["\']?',
                'description': 'Generic Secret',
                'severity': 'medium'
            },
            'generic_password': {
                'pattern': r'["\']?[Pp]assword["\']?\s*[:=]\s*["\']?[A-Za-z0-9_\-!@#$%^&*]{8,}["\']?',
                'description': 'Generic Password',
                'severity': 'medium',
                'context_required': ['=', ':', 'const', 'let', 'var']
            }
        }
        
        # File extensions to check
        self.checkable_extensions = {
            '.py', '.js', '.ts', '.jsx', '.tsx', '.json', '.yaml', '.yml',
            '.env', '.config', '.conf', '.ini', '.toml', '.md', '.txt',
            '.sh', '.bash', '.zsh', '.fish', '.dockerfile', '.sql'
        }
        
        # Binary file extensions to skip
        self.binary_extensions = {
            '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
            '.exe', '.dll', '.so', '.dylib', '.bin'
        }
    
    def _load_whitelist(self) -> Set[str]:
        """載入白名單"""
        whitelist_file = self.project_root / ".secretwhitelist"
        if whitelist_file.exists():
            with open(whitelist_file, 'r', encoding='utf-8') as f:
                return set(line.strip() for line in f if line.strip() and not line.startswith('#'))
        return set()
    
    def _load_ignore_patterns(self) -> List[str]:
        """載入忽略模式"""
        ignore_file = self.project_root / ".secretignore"
        patterns = [
            # Default ignore patterns
            '.git/',
            'node_modules/',
            '*.log',
            '*.tmp',
            '*.cache',
            '__pycache__/',
            '.pytest_cache/',
            '.coverage',
            'coverage/',
            'dist/',
            'build/',
            '.next/',
            '.nuxt/',
            # Test and example files
            '*test*',
            '*example*',
            '*demo*',
            '*mock*',
            '*fixture*'
        ]
        
        if ignore_file.exists():
            with open(ignore_file, 'r', encoding='utf-8') as f:
                patterns.extend(line.strip() for line in f if line.strip() and not line.startswith('#'))
        
        return patterns
    
    def _should_ignore_file(self, file_path: Path) -> bool:
        """檢查檔案是否應該被忽略"""
        rel_path = file_path.relative_to(self.project_root)
        rel_path_str = str(rel_path)
        
        # Check ignore patterns
        for pattern in self.ignore_patterns:
            if pattern.endswith('/'):
                # Directory pattern
                pattern_name = pattern[:-1]
                if any(part == pattern_name or part.startswith(pattern_name) for part in rel_path.parts):
                    return True
            elif '*' in pattern:
                # Wildcard pattern - use fnmatch for better matching
                import fnmatch
                if fnmatch.fnmatch(rel_path_str, pattern) or fnmatch.fnmatch(file_path.name, pattern):
                    return True
            else:
                # Exact match or substring match
                if pattern == rel_path_str or pattern in rel_path_str:
                    return True
        
        # Check file extension
        if file_path.suffix.lower() in self.binary_extensions:
            return True
        
        # Check if file is too large (> 1MB)
        try:
            if file_path.stat().st_size > 1024 * 1024:
                return True
        except OSError:
            return True
        
        return False
    
    def _calculate_entropy(self, text: str) -> float:
        """計算字串的熵值"""
        if not text:
            return 0
        
        import math
        
        char_counts = {}
        for char in text:
            char_counts[char] = char_counts.get(char, 0) + 1
        
        length = len(text)
        entropy = 0
        for count in char_counts.values():
            probability = count / length
            if probability > 0:
                entropy -= probability * math.log2(probability)
        
        return entropy
    
    def _is_high_entropy(self, text: str, min_length: int = 16) -> bool:
        """檢查是否為高熵值字串（可能是隨機生成的 secret）"""
        if len(text) < min_length:
            return False
        
        entropy = self._calculate_entropy(text)
        # Threshold based on string length and character variety
        threshold = min(4.5, len(set(text)) * 0.8)
        return entropy > threshold
    
    def _check_context(self, line: str, keywords: List[str]) -> bool:
        """檢查上下文是否包含相關關鍵字"""
        line_lower = line.lower()
        return any(keyword.lower() in line_lower for keyword in keywords)
    
    def _is_whitelisted(self, secret: str, file_path: str) -> bool:
        """檢查是否在白名單中"""
        # Check direct secret hash
        secret_hash = hashlib.sha256(secret.encode()).hexdigest()[:16]
        if secret_hash in self.whitelist:
            return True
        
        # Check file-specific whitelist
        file_specific = f"{file_path}:{secret_hash}"
        if file_specific in self.whitelist:
            return True
        
        return False
    
    def detect_secrets_in_file(self, file_path: Path) -> List[Dict]:
        """檢測單一檔案中的 secrets"""
        if self._should_ignore_file(file_path):
            return []
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
        except (UnicodeDecodeError, OSError):
            return []
        
        found_secrets = []
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            # Skip comments and obvious test data
            line_stripped = line.strip()
            if (line_stripped.startswith('#') or 
                line_stripped.startswith('//') or
                'test' in line_stripped.lower() or
                'example' in line_stripped.lower() or
                'dummy' in line_stripped.lower() or
                'fake' in line_stripped.lower()):
                continue
            
            for pattern_name, pattern_info in self.secret_patterns.items():
                pattern = pattern_info['pattern']
                matches = re.finditer(pattern, line, re.IGNORECASE)
                
                for match in matches:
                    secret = match.group(0)
                    
                    # Check context requirements
                    if 'context_required' in pattern_info:
                        if not self._check_context(line, pattern_info['context_required']):
                            continue
                    
                    # Check if whitelisted
                    if self._is_whitelisted(secret, str(file_path)):
                        continue
                    
                    # Additional validation for high-entropy patterns
                    if pattern_name in ['aws_secret_key', 'generic_api_key', 'generic_secret']:
                        if not self._is_high_entropy(secret):
                            continue
                    
                    found_secrets.append({
                        'type': pattern_name,
                        'description': pattern_info['description'],
                        'severity': pattern_info['severity'],
                        'secret': secret,
                        'file': str(file_path.relative_to(self.project_root)),
                        'line': line_num,
                        'line_content': line.strip(),
                        'start_pos': match.start(),
                        'end_pos': match.end()
                    })
        
        return found_secrets
    
    def scan_repository(self) -> bool:
        """掃描整個 repository"""
        print("🔍 開始掃描 secrets...")
        
        # Get all files to check
        files_to_check = []
        
        try:
            # Use git to get tracked files
            result = subprocess.run(
                ["git", "ls-files"],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                git_files = [
                    self.project_root / f.strip() 
                    for f in result.stdout.split('\n') 
                    if f.strip()
                ]
                files_to_check.extend(git_files)
        except Exception:
            # Fallback: scan all files
            for file_path in self.project_root.rglob('*'):
                if file_path.is_file():
                    files_to_check.append(file_path)
        
        # Remove duplicates and filter
        files_to_check = list(set(files_to_check))
        
        total_files = len(files_to_check)
        checked_files = 0
        
        for file_path in files_to_check:
            if not file_path.exists() or not file_path.is_file():
                continue
                
            secrets = self.detect_secrets_in_file(file_path)
            self.secrets_found.extend(secrets)
            checked_files += 1
            
            if checked_files % 50 == 0:
                print(f"  已檢查 {checked_files}/{total_files} 個檔案...")
        
        print(f"📊 掃描完成：檢查了 {checked_files} 個檔案")
        
        return len(self.secrets_found) == 0
    
    def generate_report(self) -> Dict:
        """生成檢查報告"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "scan_summary": {
                "secrets_found": len(self.secrets_found),
                "files_affected": len(set(s['file'] for s in self.secrets_found)),
                "severity_breakdown": {}
            },
            "secrets": self.secrets_found
        }
        
        # Calculate severity breakdown
        for secret in self.secrets_found:
            severity = secret['severity']
            report['scan_summary']['severity_breakdown'][severity] = \
                report['scan_summary']['severity_breakdown'].get(severity, 0) + 1
        
        return report
    
    def save_report(self, report: Dict):
        """保存報告到檔案"""
        report_dir = self.project_root / "docs" / "handbook" / "05-reports"
        report_dir.mkdir(parents=True, exist_ok=True)
        
        # Save JSON report
        json_file = report_dir / "secret-scan-report.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        # Generate Markdown report
        self._generate_markdown_report(report, report_dir / "secret-scan-report.md")
    
    def _generate_markdown_report(self, report: Dict, md_file: Path):
        """生成 Markdown 報告"""
        md_content = f"""# Secret 掃描報告

**生成時間**: {report['timestamp']}

## 📊 掃描摘要

- **發現的 secrets**: {report['scan_summary']['secrets_found']} 個
- **受影響檔案**: {report['scan_summary']['files_affected']} 個

### 嚴重程度分布
"""
        
        for severity, count in report['scan_summary']['severity_breakdown'].items():
            severity_icon = {'critical': '🚨', 'high': '⚠️', 'medium': '🔶', 'low': 'ℹ️'}.get(severity, '📝')
            md_content += f"- **{severity.title()}**: {count} 個 {severity_icon}\n"
        
        if report['secrets']:
            md_content += "\n## 🔍 發現的 Secrets\n\n"
            
            current_file = None
            for secret in sorted(report['secrets'], key=lambda x: (x['file'], x['line'])):
                if secret['file'] != current_file:
                    current_file = secret['file']
                    md_content += f"\n### 📁 {current_file}\n\n"
                
                severity_icon = {'critical': '🚨', 'high': '⚠️', 'medium': '🔶', 'low': 'ℹ️'}.get(secret['severity'], '📝')
                md_content += f"**{severity_icon} {secret['description']}** (第 {secret['line']} 行)\n"
                md_content += f"- **類型**: {secret['type']}\n"
                md_content += f"- **嚴重程度**: {secret['severity']}\n"
                md_content += f"- **內容**: `{secret['line_content'][:100]}{'...' if len(secret['line_content']) > 100 else ''}`\n\n"
        
        md_content += """
## 💡 修復建議

### 立即行動
1. **移除所有發現的 secrets** - 不要只是註解掉
2. **撤銷/重新生成所有洩露的憑證**
3. **檢查 git 歷史** - 使用 `git log -p` 確認是否曾經提交過

### 預防措施
1. **使用環境變數** - 所有 secrets 都應該從環境變數讀取
2. **設定 .env.example** - 提供範例但不包含真實值
3. **使用 secrets 管理工具** - 如 AWS Secrets Manager, Azure Key Vault
4. **定期輪換憑證** - 定期更新 API keys 和 tokens

### 最佳實踐
```bash
# 正確方式：使用環境變數
API_KEY = os.environ.get('API_KEY')

# 錯誤方式：硬編碼
API_KEY = 'sk_live_xxxxxxxxxxxx'  # ❌ 絕對不要這樣做
```

---

*此報告由 Secret 檢測器自動生成*
"""
        
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write(md_content)
    
    def print_results(self):
        """列印檢查結果"""
        if not self.secrets_found:
            print("✅ 太棒了！沒有發現任何 secrets")
            return
        
        print(f"\n🚨 發現 {len(self.secrets_found)} 個潛在的 secrets！")
        print("=" * 60)
        
        # Group by file
        files_with_secrets = {}
        for secret in self.secrets_found:
            file_path = secret['file']
            if file_path not in files_with_secrets:
                files_with_secrets[file_path] = []
            files_with_secrets[file_path].append(secret)
        
        for file_path, secrets in files_with_secrets.items():
            print(f"\n📁 {file_path}")
            for secret in secrets:
                severity_icon = {'critical': '🚨', 'high': '⚠️', 'medium': '🔶', 'low': 'ℹ️'}.get(secret['severity'], '📝')
                print(f"  {severity_icon} 第 {secret['line']} 行: {secret['description']}")
                print(f"     {secret['line_content'][:80]}{'...' if len(secret['line_content']) > 80 else ''}")
        
        print("\n" + "=" * 60)
        print("🛡️ 請立即修復這些問題再提交！")
        print("💡 參考報告: docs/handbook/05-reports/secret-scan-report.md")

def main():
    """主函數"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Secret 檢測器")
    parser.add_argument("--project-root", help="專案根目錄")
    parser.add_argument("--fail-on-secrets", action="store_true", help="發現 secrets 時以錯誤碼退出")
    parser.add_argument("--report-only", action="store_true", help="只生成報告，不顯示錯誤")
    
    args = parser.parse_args()
    
    detector = SecretDetector(args.project_root)
    is_clean = detector.scan_repository()
    
    # Generate and save report
    report = detector.generate_report()
    detector.save_report(report)
    
    if not args.report_only:
        detector.print_results()
    
    if args.fail_on_secrets and not is_clean:
        sys.exit(1)
    
    sys.exit(0 if is_clean else 0)

if __name__ == "__main__":
    main()