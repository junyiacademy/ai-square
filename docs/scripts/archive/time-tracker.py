#!/usr/bin/env python3
"""
真實時間追蹤系統
追蹤開發會話的真實時間，而不是基於檔案數量的估算
"""

import time
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

@dataclass
class TimeEvent:
    """時間事件記錄"""
    timestamp: str
    event_type: str  # 'session_start', 'ai_start', 'ai_end', 'human_start', 'human_end', 'tool_call'
    details: str
    duration_seconds: Optional[float] = None

@dataclass
class ToolExecution:
    """工具執行記錄"""
    tool_name: str
    start_time: float
    end_time: float
    duration_seconds: float
    success: bool
    parameters: Dict

class RealTimeTracker:
    """真實時間追蹤器"""
    
    def __init__(self):
        self.session_start: Optional[datetime] = None
        self.current_operation_start: Optional[datetime] = None
        self.current_operation_type: Optional[str] = None
        self.events: List[TimeEvent] = []
        self.tool_executions: List[ToolExecution] = []
        self.project_root = Path(__file__).parent.parent.parent
        
    def start_session(self, session_type: str = "development"):
        """開始追蹤會話"""
        self.session_start = datetime.now()
        self.log_event("session_start", session_type)
        print(f"⏱️  開始追蹤 {session_type} 會話: {self.session_start.strftime('%H:%M:%S')}")
    
    def start_operation(self, operation_type: str, details: str = ""):
        """開始操作（AI 或 Human）"""
        if self.current_operation_start:
            # 自動結束上一個操作
            self.end_operation()
        
        self.current_operation_start = datetime.now()
        self.current_operation_type = operation_type
        self.log_event(f"{operation_type}_start", details)
        
    def end_operation(self):
        """結束當前操作"""
        if self.current_operation_start and self.current_operation_type:
            duration = (datetime.now() - self.current_operation_start).total_seconds()
            self.log_event(
                f"{self.current_operation_type}_end", 
                f"duration: {duration:.1f}s",
                duration
            )
            self.current_operation_start = None
            self.current_operation_type = None
    
    def log_event(self, event_type: str, details: str, duration: Optional[float] = None):
        """記錄時間事件"""
        event = TimeEvent(
            timestamp=datetime.now().isoformat(),
            event_type=event_type,
            details=details,
            duration_seconds=duration
        )
        self.events.append(event)
    
    def track_tool_execution(self, tool_name: str, start_time: float, end_time: float, 
                           success: bool, parameters: Dict = None):
        """追蹤工具執行時間"""
        execution = ToolExecution(
            tool_name=tool_name,
            start_time=start_time,
            end_time=end_time,
            duration_seconds=end_time - start_time,
            success=success,
            parameters=parameters or {}
        )
        self.tool_executions.append(execution)
    
    def calculate_metrics(self) -> Dict:
        """計算真實時間指標"""
        if not self.session_start:
            return {}
        
        # 結束當前操作（如果有）
        if self.current_operation_start:
            self.end_operation()
        
        session_end = datetime.now()
        total_duration = (session_end - self.session_start).total_seconds() / 60  # 轉為分鐘
        
        # 計算 AI 和 Human 時間
        ai_time = 0
        human_time = 0
        
        for event in self.events:
            if event.event_type.endswith('_end') and event.duration_seconds:
                if event.event_type.startswith('ai_'):
                    ai_time += event.duration_seconds
                elif event.event_type.startswith('human_'):
                    human_time += event.duration_seconds
        
        # 轉為分鐘
        ai_time_minutes = ai_time / 60
        human_time_minutes = human_time / 60
        
        # 計算工具執行時間
        total_tool_time = sum(t.duration_seconds for t in self.tool_executions)
        tool_breakdown = {}
        for execution in self.tool_executions:
            tool = execution.tool_name
            tool_breakdown[tool] = tool_breakdown.get(tool, 0) + execution.duration_seconds
        
        return {
            'total_time_minutes': round(total_duration, 1),
            'ai_time_minutes': round(ai_time_minutes, 1),
            'human_time_minutes': round(human_time_minutes, 1),
            'ai_percentage': round((ai_time_minutes / total_duration * 100) if total_duration > 0 else 0, 1),
            'human_percentage': round((human_time_minutes / total_duration * 100) if total_duration > 0 else 0, 1),
            'start_timestamp': self.session_start.isoformat(),
            'end_timestamp': session_end.isoformat(),
            'total_tool_execution_seconds': round(total_tool_time, 1),
            'tool_breakdown_seconds': {k: round(v, 1) for k, v in tool_breakdown.items()},
            'tool_execution_count': len(self.tool_executions),
            'is_real_time': True,
            'time_estimation_method': 'actual_tracking'
        }
    
    def save_session_log(self, filename: Optional[str] = None) -> Path:
        """保存會話日誌到不被 git 追蹤的 sessions 目錄"""
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"session_{timestamp}.json"
        
        # 保存到 sessions 目錄（不被 git 追蹤）
        today = datetime.now().strftime('%Y-%m-%d')
        log_dir = self.project_root / "docs" / "time-logs" / "sessions" / today
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / filename
        
        # 自動清理 30 天前的會話日誌
        self._cleanup_old_sessions()
        
        session_data = {
            'session_metrics': self.calculate_metrics(),
            'events': [asdict(event) for event in self.events],
            'tool_executions': [asdict(execution) for execution in self.tool_executions]
        }
        
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(session_data, f, indent=2, ensure_ascii=False)
        
        return log_file
    
    def _cleanup_old_sessions(self, days: int = 30):
        """清理指定天數前的會話日誌"""
        sessions_dir = self.project_root / "docs" / "time-logs" / "sessions"
        if not sessions_dir.exists():
            return
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        for date_dir in sessions_dir.iterdir():
            if date_dir.is_dir():
                try:
                    # 解析目錄名稱的日期 (YYYY-MM-DD)
                    dir_date = datetime.strptime(date_dir.name, '%Y-%m-%d')
                    if dir_date < cutoff_date:
                        # 刪除整個日期目錄
                        import shutil
                        shutil.rmtree(date_dir)
                        print(f"🗑️  清理過期會話日誌: {date_dir.name}")
                except ValueError:
                    # 如果目錄名稱不是日期格式，跳過
                    continue
    
    def save_aggregated_summary(self) -> Path:
        """保存聚合摘要到 git 追蹤的目錄"""
        metrics = self.calculate_metrics()
        today = datetime.now().strftime('%Y-%m-%d')
        
        # 簡化的聚合數據（去除敏感資訊）
        aggregated_data = {
            'date': today,
            'total_time_minutes': metrics['total_time_minutes'],
            'ai_percentage': metrics['ai_percentage'],
            'human_percentage': metrics['human_percentage'],
            'tool_execution_count': metrics['tool_execution_count'],
            'session_efficiency_score': self._calculate_efficiency_score(),
            'generation_timestamp': datetime.now().isoformat()
        }
        
        # 保存到聚合目錄（被 git 追蹤）
        aggregated_dir = self.project_root / "docs" / "time-logs" / "aggregated" / "daily"
        aggregated_dir.mkdir(parents=True, exist_ok=True)
        aggregated_file = aggregated_dir / f"{today}-summary.yml"
        
        import yaml
        with open(aggregated_file, 'w', encoding='utf-8') as f:
            yaml.dump(aggregated_data, f, allow_unicode=True, sort_keys=False)
        
        return aggregated_file
    
    def _calculate_efficiency_score(self) -> float:
        """計算會話效率分數 (0-100)"""
        if not self.tool_executions:
            return 0.0
        
        # 基於工具執行成功率和平均執行時間
        success_rate = len([t for t in self.tool_executions if t.success]) / len(self.tool_executions)
        avg_tool_time = sum(t.duration_seconds for t in self.tool_executions) / len(self.tool_executions)
        
        # 簡單的效率評分邏輯
        efficiency = (success_rate * 50) + min(50, max(0, 50 - avg_tool_time * 10))
        return round(efficiency, 1)
    
    def print_summary(self):
        """列印會話摘要"""
        metrics = self.calculate_metrics()
        
        print("\n" + "="*50)
        print("⏱️  時間追蹤摘要")
        print("="*50)
        print(f"總開發時間: {metrics.get('total_time_minutes', 0):.1f} 分鐘")
        print(f"AI 操作時間: {metrics.get('ai_time_minutes', 0):.1f} 分鐘 ({metrics.get('ai_percentage', 0):.1f}%)")
        print(f"Human 操作時間: {metrics.get('human_time_minutes', 0):.1f} 分鐘 ({metrics.get('human_percentage', 0):.1f}%)")
        
        if self.tool_executions:
            print(f"\n工具使用統計:")
            tool_breakdown = metrics.get('tool_breakdown_seconds', {})
            for tool, time_seconds in tool_breakdown.items():
                count = len([t for t in self.tool_executions if t.tool_name == tool])
                avg_time = time_seconds / count if count > 0 else 0
                print(f"  {tool}: {count} 次調用, 平均 {avg_time:.1f}s/次")
        
        print("="*50)


def tool_execution_timer(tool_name: str):
    """裝飾器：自動追蹤工具執行時間"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # 假設有全域的 time_tracker 實例
            if hasattr(wrapper, '_time_tracker'):
                start_time = time.time()
                success = True
                result = None
                
                try:
                    result = func(*args, **kwargs)
                except Exception as e:
                    success = False
                    raise e
                finally:
                    end_time = time.time()
                    wrapper._time_tracker.track_tool_execution(
                        tool_name=tool_name,
                        start_time=start_time,
                        end_time=end_time,
                        success=success,
                        parameters={'args_count': len(args), 'kwargs_keys': list(kwargs.keys())}
                    )
                
                return result
            else:
                # 如果沒有 tracker，正常執行
                return func(*args, **kwargs)
        
        return wrapper
    return decorator


# 全域 tracker 實例
_global_tracker: Optional[RealTimeTracker] = None

def get_tracker() -> RealTimeTracker:
    """獲取全域時間追蹤器"""
    global _global_tracker
    if _global_tracker is None:
        _global_tracker = RealTimeTracker()
    return _global_tracker

def start_tracking_session(session_type: str = "development"):
    """開始追蹤會話"""
    tracker = get_tracker()
    tracker.start_session(session_type)
    return tracker

def end_tracking_session() -> Dict:
    """結束追蹤會話並返回指標"""
    tracker = get_tracker()
    metrics = tracker.calculate_metrics()
    tracker.print_summary()
    
    # 保存詳細日誌（不被 git 追蹤）
    log_file = tracker.save_session_log()
    print(f"\n📁 詳細會話日誌已保存（本地 30 天）: {log_file}")
    
    # 保存聚合摘要（被 git 追蹤）
    try:
        summary_file = tracker.save_aggregated_summary()
        print(f"📊 聚合摘要已保存（git 追蹤）: {summary_file}")
    except Exception as e:
        print(f"⚠️  聚合摘要保存失敗: {e}")
    
    return metrics


if __name__ == "__main__":
    # 測試用途
    print("🧪 測試時間追蹤系統...")
    
    tracker = start_tracking_session("test")
    
    # 模擬 AI 操作
    tracker.start_operation("ai", "analyzing code")
    time.sleep(2)  # 模擬 2 秒操作
    tracker.end_operation()
    
    # 模擬 Human 操作
    tracker.start_operation("human", "providing feedback")
    time.sleep(1)  # 模擬 1 秒操作
    tracker.end_operation()
    
    # 模擬工具執行
    start_time = time.time()
    time.sleep(0.5)  # 模擬工具執行
    tracker.track_tool_execution("Read", start_time, time.time(), True, {"file": "test.py"})
    
    # 結束會話
    metrics = end_tracking_session()
    print(f"\n📊 測試結果: {metrics}")