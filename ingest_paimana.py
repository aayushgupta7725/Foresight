import requests
import os

snapshots = [
    ("PAIMANA_May_2026.xlsx", "May 2026"),
    ("PAIMANA_June_2026.xlsx", "June 2026"),
    ("PAIMANA_July_2026.xlsx", "July 2026"),
]

url = "http://localhost:8000/api/upload"

for filename, date in snapshots:
    if not os.path.exists(filename):
        print(f"Skipping {filename} - not found")
        continue
    print(f"Ingesting {filename} ({date})...")
    with open(filename, "rb") as f:
        files = {"file": (filename, f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        data = {"snapshot_date": date}
        r = requests.post(url, files=files, data=data)
        print(r.json())
