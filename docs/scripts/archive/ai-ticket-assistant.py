#!/usr/bin/env python3
"""
AI Ticket 助手
提供更智能的 ticket 管理，減少人類介入
"""

import subprocess
import json
import re
from pathlib import Path
from typing import Dict, Optional, Tuple

class AITicketAssistant:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.context_patterns = {
            'new_feature': [
                r'(implement|add|create|build)\s+(\w+)',
                r'(功能|特性|feature)',
                r'(請|幫我|help\s+me)'
            ],
            'bug_fix': [
                r'(fix|resolve|修復|修正)',
                r'(bug|issue|問題|錯誤)',
                r'(broken|壞了|不工作|doesn\'t work)'
            ],
            'continuation': [
                r'(continue|繼續|回到|back to)',
                r'(resume|恢復)',
                r'剛才的'
            ]
        }
    
    def analyze_user_intent(self, message: str) -> Dict:
        """分析用戶意圖"""
        message_lower = message.lower()
        
        # 檢查是否要繼續之前的工作
        for pattern in self.context_patterns['continuation']:
            if re.search(pattern, message_lower):
                return {
                    'intent': 'resume',
                    'confidence': 0.9,
                    'action': 'resume_previous'
                }
        
        # 檢查是否是新功能
        for pattern in self.context_patterns['new_feature']:
            match = re.search(pattern, message_lower)
            if match:
                return {
                    'intent': 'new_feature',
                    'confidence': 0.8,
                    'action': 'create_ticket',
                    'suggested_name': self._extract_feature_name(message)
                }
        
        # 檢查是否是 bug
        for pattern in self.context_patterns['bug_fix']:
            if re.search(pattern, message_lower):
                return {
                    'intent': 'bug_fix',
                    'confidence': 0.85,
                    'action': 'create_ticket',
                    'suggested_name': self._extract_bug_name(message)
                }
        
        return {
            'intent': 'unclear',
            'confidence': 0.3,
            'action': 'ask_user'
        }
    
    def smart_context_switch(self, message: str, current_ticket: Optional[str]) -> Dict:
        """智能處理 context 切換"""
        intent = self.analyze_user_intent(message)
        
        # 如果沒有 current ticket，直接處理
        if not current_ticket:
            if intent['intent'] in ['new_feature', 'bug_fix']:
                return {
                    'decision': 'create_new',
                    'ticket_name': intent.get('suggested_name', 'new-task'),
                    'reason': '沒有進行中的工作'
                }
        
        # 有 current ticket 時的處理
        if intent['confidence'] > 0.7:
            if intent['intent'] == 'resume':
                return {
                    'decision': 'resume',
                    'reason': '用戶想繼續之前的工作'
                }
            elif intent['intent'] in ['new_feature', 'bug_fix']:
                # 自動判斷是否需要暫停
                if self._is_urgent(message):
                    return {
                        'decision': 'pause_and_switch',
                        'ticket_name': intent.get('suggested_name'),
                        'reason': '偵測到緊急任務'
                    }
                else:
                    return {
                        'decision': 'ask_user',
                        'reason': '需要確認是否切換',
                        'options': [
                            '暫停當前工作，處理新任務',
                            '作為當前工作的一部分',
                            '記錄下來，稍後處理'
                        ]
                    }
        
        return {
            'decision': 'continue_current',
            'reason': '繼續當前工作'
        }
    
    def auto_handle_conflicts(self) -> bool:
        """自動處理簡單的衝突"""
        # 檢查是否有衝突
        result = subprocess.run(
            ['git', 'status', '--porcelain'],
            capture_output=True,
            text=True
        )
        
        if 'UU' in result.stdout:  # 有衝突
            conflicted_files = [
                line.split()[1] for line in result.stdout.split('\n')
                if line.startswith('UU')
            ]
            
            # 嘗試自動解決簡單衝突
            for file in conflicted_files:
                if self._can_auto_resolve(file):
                    self._auto_resolve_conflict(file)
                    print(f"✅ 自動解決衝突: {file}")
                else:
                    print(f"❌ 需要人工解決衝突: {file}")
                    return False
            
            # 如果都解決了，完成合併
            subprocess.run(['git', 'add', '-A'])
            return True
        
        return True
    
    def _can_auto_resolve(self, file_path: str) -> bool:
        """判斷是否可以自動解決衝突"""
        # 簡單規則：
        # 1. package-lock.json - 總是使用 --theirs
        # 2. 只有格式差異的檔案
        # 3. 只有 import 順序不同
        
        if file_path.endswith('package-lock.json'):
            return True
        
        # 其他情況暫時不自動處理
        return False
    
    def _auto_resolve_conflict(self, file_path: str):
        """自動解決衝突"""
        if file_path.endswith('package-lock.json'):
            # 使用他們的版本
            subprocess.run(['git', 'checkout', '--theirs', file_path])
    
    def _extract_feature_name(self, message: str) -> str:
        """從訊息中提取功能名稱"""
        # 嘗試提取關鍵詞
        patterns = [
            r'(implement|add|create)\s+(\w+)\s+(\w+)',
            r'(實作|新增|加入)\s*(\w+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, message.lower())
            if match:
                words = [g for g in match.groups() if g and g not in ['implement', 'add', 'create', '實作', '新增', '加入']]
                if words:
                    return '-'.join(words[:2])
        
        return 'new-feature'
    
    def _extract_bug_name(self, message: str) -> str:
        """從訊息中提取 bug 名稱"""
        # 嘗試提取問題描述
        patterns = [
            r'(fix|修復)\s+(\w+)\s+(\w+)',
            r'(\w+)\s+(broken|壞了|不工作)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, message.lower())
            if match:
                words = [g for g in match.groups() if g and g not in ['fix', '修復', 'broken', '壞了', '不工作']]
                if words:
                    return f"fix-{'-'.join(words[:2])}"
        
        return 'fix-issue'
    
    def _is_urgent(self, message: str) -> bool:
        """判斷是否緊急"""
        urgent_keywords = [
            'urgent', '緊急', 'asap', '馬上',
            'broken', '壞了', 'critical', '嚴重',
            'blocking', '阻塞'
        ]
        
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in urgent_keywords)
    
    def suggest_commit_message(self, changes: Dict) -> str:
        """智能生成 commit message"""
        # 分析變更類型
        added = len(changes.get('added', []))
        modified = len(changes.get('modified', []))
        deleted = len(changes.get('deleted', []))
        
        # 分析主要變更檔案
        all_files = changes.get('added', []) + changes.get('modified', [])
        
        # 判斷 commit 類型
        if any('test' in f for f in all_files):
            commit_type = 'test'
        elif any('fix' in f or 'bug' in f for f in all_files):
            commit_type = 'fix'
        elif added > modified:
            commit_type = 'feat'
        elif deleted > 0:
            commit_type = 'refactor'
        else:
            commit_type = 'update'
        
        # 生成描述
        if len(all_files) == 1:
            scope = Path(all_files[0]).stem
            return f"{commit_type}({scope}): update implementation"
        else:
            # 找共同 scope
            paths = [Path(f).parts for f in all_files]
            if paths and all(len(p) > 0 for p in paths):
                common = paths[0][0]
                if all(p[0] == common for p in paths):
                    return f"{commit_type}({common}): update multiple files"
        
        return f"{commit_type}: update {len(all_files)} files"


def main():
    """測試 AI 助手功能"""
    assistant = AITicketAssistant()
    
    # 測試意圖分析
    test_messages = [
        "幫我實作搜尋功能",
        "登入按鈕壞了",
        "繼續剛才的工作",
        "這個 bug 很緊急，馬上修"
    ]
    
    for msg in test_messages:
        intent = assistant.analyze_user_intent(msg)
        print(f"\n訊息: {msg}")
        print(f"意圖: {intent}")
        
        # 測試 context switch
        decision = assistant.smart_context_switch(msg, "current-feature")
        print(f"決策: {decision}")


if __name__ == "__main__":
    main()