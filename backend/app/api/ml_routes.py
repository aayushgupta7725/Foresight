"""
ML training and model-management routes.
"""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import connection
import os
import json

router = APIRouter()

BASE_DIR   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "ml", "models")


def _run_training():
    """Import and run the training pipeline."""
    try:
        from app.ml.train import train
        train()
    except Exception as e:
        print(f"Training error: {e}")
        raise


@router.post("/api/ml/train")
def trigger_training(background_tasks: BackgroundTasks):
    """
    Kick off ML model training in the background.
    Uses the SQLite DB to build the training dataset from stored snapshots.
    """
    os.makedirs(MODELS_DIR, exist_ok=True)
    background_tasks.add_task(_run_training)
    return {
        "status": "started",
        "message": (
            "Model training started in background. "
            "Check GET /api/ml/metrics once training completes (~30 seconds)."
        ),
    }


@router.post("/api/ml/train/sync")
def trigger_training_sync():
    """Synchronous training (blocks until done — useful for small datasets)."""
    os.makedirs(MODELS_DIR, exist_ok=True)
    try:
        from app.ml.train import train
        train()
        return {"status": "complete", "message": "Training finished successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.get("/api/ml/metrics")
def get_model_metrics():
    """Return saved model evaluation metrics."""
    metrics_path = os.path.join(MODELS_DIR, "model_metrics.json")
    if not os.path.exists(metrics_path):
        return {
            "status": "no_model",
            "message": "No trained model found. POST /api/ml/train to train.",
        }
    with open(metrics_path) as f:
        metrics = json.load(f)
    return {"status": "available", "metrics": metrics}


@router.get("/api/ml/status")
def get_model_status():
    """Check which model files exist."""
    model_files = ["xgb_date_revision.pkl", "xgb_cost_revision.pkl",
                   "logreg_baseline.pkl", "feature_names.json", "model_metrics.json"]
    status = {}
    for fname in model_files:
        path = os.path.join(MODELS_DIR, fname)
        status[fname] = os.path.exists(path)
    any_model = any(status.values())
    return {
        "models_trained": any_model,
        "files": status,
        "models_dir": MODELS_DIR,
    }
