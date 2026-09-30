import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.connection import SessionLocal
from app.services.cache_builder import build_cache
from app.services.cache import get_cached_projects, get_cached_summary

db = SessionLocal()

start = time.time()
build_cache(db, force=True)
elapsed = time.time() - start

db.close()

p = get_cached_projects()
s = get_cached_summary()

print(f"Cache build time : {elapsed:.2f}s")
print(f"Cached projects  : {len(p)}")
print(f"Summary          : {s['total_projects']} total, {s['high_risk']} high risk")
print(f"First project    : {p[0]['project_name'][:60] if p else 'none'}")

# Simulate the API serving from cache (should be ~0ms)
start2 = time.time()
results = [x for x in p if x['risk_label'] == 'High Risk'][:25]
elapsed2 = time.time() - start2
print(f"Filter+slice time: {elapsed2*1000:.1f}ms  ({len(results)} results)")
