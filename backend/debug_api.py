import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database.connection import SessionLocal
from app.database import schema
from app.services.feature_engineering import compute_features, infer_sector, SNAPSHOT_ORDER

db = SessionLocal()

# 1. Check distinct snapshot dates
dates = db.query(schema.ProjectSnapshot.snapshot_date).distinct().all()
date_list = [d[0] for d in dates]
print("Distinct snapshot dates:", date_list)

# 2. Latest date
latest = max(date_list, key=lambda x: SNAPSHOT_ORDER.get(x, 0))
print("Latest snapshot:", latest)
print("SNAPSHOT_ORDER value:", SNAPSHOT_ORDER.get(latest, "NOT IN ORDER MAP"))

# 3. Count snapshots for latest
snaps = db.query(schema.ProjectSnapshot).filter(
    schema.ProjectSnapshot.snapshot_date == latest
).all()
print(f"Snapshots for '{latest}':", len(snaps))

# 4. Test first snapshot
if snaps:
    snap = snaps[0]
    proj = db.query(schema.Project).filter(
        schema.Project.project_id == snap.project_id
    ).first()
    print("\nSample project_id:", snap.project_id)
    print("Project record found:", proj is not None)
    if proj:
        print("  name:", proj.project_name)
        print("  agency:", proj.agency)
        print("  state:", proj.state)
    print("Snapshot data:")
    print("  physical_progress:", snap.physical_progress)
    print("  revised_cost:", snap.revised_cost)
    print("  start_date:", snap.start_date)
    print("  original_end_date:", snap.original_end_date)
    print("  revised_end_date:", snap.revised_end_date)
    feats = compute_features(snap)
    print("Features computed:", feats)

# 5. Test the dashboard summary query path
print("\n--- Dashboard summary simulation ---")
total_projects = db.query(schema.Project).count()
print("Total projects in DB:", total_projects)

count = 0
for snap in snaps[:5]:
    proj = db.query(schema.Project).filter(
        schema.Project.project_id == snap.project_id
    ).first()
    if not proj:
        print(f"  MISSING project for snap {snap.project_id}")
        continue
    feats = compute_features(snap)
    count += 1
    print(f"  [{count}] {snap.project_id[:12]} -> risk={feats['risk_label']}")

db.close()
print("\nDone.")
