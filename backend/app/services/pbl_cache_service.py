"""
PBL Cache Service for optimizing GCS reads
Implements server-side caching for PBL data
"""

import json
import time
from typing import Any, Dict, Optional
from functools import lru_cache
import hashlib

class PBLCacheService:
    """
    In-memory cache service for PBL data
    Future: Can be extended to use Redis
    """

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._default_ttl = 300  # 5 minutes
        self._max_entries = 1000

    def _generate_key(self, prefix: str, *args) -> str:
        """Generate a cache key from prefix and arguments"""
        key_parts = [prefix] + [str(arg) for arg in args]
        return ":".join(key_parts)

    def _is_expired(self, entry: Dict[str, Any]) -> bool:
        """Check if cache entry is expired"""
        if 'expires_at' not in entry:
            return True
        return time.time() > entry['expires_at']

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if key not in self._cache:
            return None

        entry = self._cache[key]
        if self._is_expired(entry):
            del self._cache[key]
            return None

        return entry.get('value')

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache with TTL"""
        # Implement simple LRU eviction
        if len(self._cache) >= self._max_entries:
            # Remove oldest entry
            oldest_key = min(self._cache.keys(),
                           key=lambda k: self._cache[k].get('created_at', 0))
            del self._cache[oldest_key]

        ttl = ttl or self._default_ttl
        self._cache[key] = {
            'value': value,
            'created_at': time.time(),
            'expires_at': time.time() + ttl
        }

    def delete(self, key: str) -> None:
        """Delete key from cache"""
        if key in self._cache:
            del self._cache[key]

    def clear_pattern(self, pattern: str) -> None:
        """Clear all keys matching pattern"""
        keys_to_delete = [k for k in self._cache.keys() if pattern in k]
        for key in keys_to_delete:
            del self._cache[key]

    def get_or_set(self, key: str, getter_func, ttl: Optional[int] = None) -> Any:
        """Get from cache or compute and cache"""
        value = self.get(key)
        if value is not None:
            return value

        value = getter_func()
        self.set(key, value, ttl)
        return value

# Global cache instance
pbl_cache = PBLCacheService()

# Cache key generators
def get_program_key(user_email: str, scenario_id: str, program_id: str) -> str:
    """Generate cache key for program data"""
    return f"pbl:program:{user_email}:{scenario_id}:{program_id}"

def get_task_key(user_email: str, scenario_id: str, program_id: str, task_id: str) -> str:
    """Generate cache key for task data"""
    return f"pbl:task:{user_email}:{scenario_id}:{program_id}:{task_id}"

def get_completion_key(user_email: str, scenario_id: str, program_id: str) -> str:
    """Generate cache key for completion data"""
    return f"pbl:completion:{user_email}:{scenario_id}:{program_id}"

def get_scenario_key(scenario_id: str, lang: str) -> str:
    """Generate cache key for scenario data"""
    return f"pbl:scenario:{scenario_id}:{lang}"
