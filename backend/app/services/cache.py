"""
In-memory cache for computed project features.
Computed once after startup / after each upload, served instantly on every request.
Thread-safe via a simple lock.
"""
import threading
import time
from typing import Optional, Dict, Any, List

_lock   = threading.Lock()
_cache: Dict[str, Any] = {
    "snapshot_date": None,        # which snapshot this cache covers
    "projects":      [],          # list of enriched project dicts
    "summary":       None,        # dashboard summary dict
    "built_at":      None,        # unix timestamp
}


def get_cached_snapshot_date() -> Optional[str]:
    return _cache["snapshot_date"]


def get_cached_projects() -> Optional[List[dict]]:
    """Returns None if cache is empty, otherwise the full project list."""
    with _lock:
        if _cache["snapshot_date"] is None:
            return None
        return _cache["projects"]


def get_cached_summary() -> Optional[dict]:
    with _lock:
        return _cache["summary"]


def set_cache(snapshot_date: str, projects: List[dict], summary: dict):
    with _lock:
        _cache["snapshot_date"] = snapshot_date
        _cache["projects"]      = projects
        _cache["summary"]       = summary
        _cache["built_at"]      = time.time()


def invalidate():
    """Call this after a new snapshot is uploaded."""
    with _lock:
        _cache["snapshot_date"] = None
        _cache["projects"]      = []
        _cache["summary"]       = None
        _cache["built_at"]      = None


def is_stale(current_snapshot_date: str) -> bool:
    """Returns True if the cache needs to be rebuilt."""
    with _lock:
        return _cache["snapshot_date"] != current_snapshot_date
