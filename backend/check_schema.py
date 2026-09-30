import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "foresight.db")
c = sqlite3.connect(db_path)

tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("All tables:", tables)
print()
for t in tables:
    cols = [r[1] for r in c.execute(f"PRAGMA table_info({t})").fetchall()]
    print(f"  {t}: {cols}")
c.close()
