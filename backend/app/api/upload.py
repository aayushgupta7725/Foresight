from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
import shutil
import os
from app.database import connection, schema
from app.services.file_processor import process_excel

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/api/upload")
async def upload_file(
    snapshot_date: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(connection.get_db)
):
    if not file.filename.endswith(('.xlsx', '.csv')):
        raise HTTPException(status_code=400, detail="Only Excel and CSV files are supported.")
        
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        records = process_excel(file_path, snapshot_date)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
        
    # Ingest into database
    new_projects = 0
    new_snapshots = 0
    
    for r in records:
        # Check if project exists
        project = db.query(schema.Project).filter(schema.Project.project_id == r["project_id"]).first()
        if not project:
            project = schema.Project(
                project_id=r["project_id"],
                project_name=r["project_name"],
                agency=r["agency"],
                state=r["state"],
                sector=r["sector"]
            )
            db.add(project)
            new_projects += 1
            
        # Check if snapshot exists for this project and date
        snapshot = db.query(schema.ProjectSnapshot).filter(
            schema.ProjectSnapshot.project_id == r["project_id"],
            schema.ProjectSnapshot.snapshot_date == snapshot_date
        ).first()
        
        if not snapshot:
            snapshot = schema.ProjectSnapshot(
                project_id=r["project_id"],
                snapshot_date=r["snapshot_date"],
                start_date=r["start_date"],
                original_end_date=r["original_end_date"],
                revised_end_date=r["revised_end_date"],
                original_cost=r["original_cost"],
                revised_cost=r["revised_cost"],
                expenditure=r["expenditure"],
                physical_progress=r["physical_progress"]
            )
            db.add(snapshot)
            new_snapshots += 1
            
    db.commit()

    # Invalidate and rebuild cache so new data appears immediately
    try:
        from app.services.cache import invalidate
        from app.services.cache_builder import build_cache
        invalidate()
        build_cache(db, force=True)
    except Exception as e:
        print(f"[upload] Cache rebuild failed (non-fatal): {e}")

    return {
        "message": "File processed successfully",
        "total_records": len(records),
        "new_projects": new_projects,
        "new_snapshots": new_snapshots
    }
