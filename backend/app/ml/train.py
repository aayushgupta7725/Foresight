"""
ML Training Pipeline for Infrastructure Project Risk Prediction.

Label construction:
  - Features: computed from each project's April-June snapshots 
    (schedule_drift, spend_progress_gap, cost_escalation, progress_velocity)
  - Label = 1 if Revised_End_Date changed OR Revised_Cost increased in the 
    following snapshot (July), else 0.

Models:
  1. Logistic Regression (statistical baseline)
  2. Random Forest
  3. XGBoost (primary model)

Outputs:
  - models/xgb_date_revision.pkl  (predicts date revision risk)
  - models/xgb_cost_revision.pkl  (predicts cost revision risk)
  - models/logreg_baseline.pkl    (logistic regression baseline)
  - models/model_metrics.json     (evaluation metrics)
  - models/feature_names.json     (feature list for SHAP)
"""

import os
import json
import pickle
import warnings
import numpy as np
import pandas as pd

from datetime import date
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

warnings.filterwarnings("ignore")

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

# BASE_DIR = .../backend/app/ml  →  go up 2 levels to reach .../backend/
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(BASE_DIR)), "foresight.db")
ENGINE = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
Session = sessionmaker(bind=ENGINE)

SNAPSHOT_ORDER = {
    "April 2026": 1, "May 2026": 2, "June 2026": 3, "July 2026": 4
}

REF_DATE = {
    "April 2026": date(2026, 4, 30),
    "May 2026":   date(2026, 5, 31),
    "June 2026":  date(2026, 6, 30),
    "July 2026":  date(2026, 7, 31),
}

FEATURES = [
    "schedule_drift",
    "spend_progress_gap",
    "cost_escalation",
    "physical_progress",
    "time_consumed_pct",
    "progress_velocity",
    "recovery_gap",
    "expenditure_pct",
    "revised_cost",
]


# ── Helpers ──────────────────────────────────────────────────────────────────

def _parse_date(val):
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    try:
        return pd.to_datetime(str(val), dayfirst=True).date()
    except Exception:
        return None


def _compute_row_features(row, ref_dt: date, prev_progress=None, months_between=1.0):
    """Compute all engineered features for one snapshot row."""
    f = {}

    # Cost escalation
    orig = row.get("original_cost") or 0.0
    rev  = row.get("revised_cost")  or 0.0
    f["cost_escalation"] = ((rev - orig) / orig * 100) if orig > 0 else 0.0

    # Expenditure %
    exp = row.get("expenditure") or 0.0
    f["expenditure_pct"] = (exp / rev * 100) if rev > 0 else 0.0

    # Physical progress
    phys = float(row.get("physical_progress") or 0.0)
    f["physical_progress"] = phys

    # Time consumed % & schedule drift
    start_dt = _parse_date(row.get("start_date"))
    end_dt   = _parse_date(row.get("original_end_date"))
    if start_dt and end_dt and end_dt > start_dt:
        total_days   = (end_dt - start_dt).days
        elapsed_days = (ref_dt - start_dt).days
        tc = min(max(elapsed_days / total_days * 100, 0), 150)
    else:
        tc = 50.0  # fallback
    f["time_consumed_pct"] = tc
    f["schedule_drift"] = tc - phys

    # Spend-progress gap
    f["spend_progress_gap"] = f["expenditure_pct"] - phys

    # Progress velocity (change per month since previous snapshot)
    if prev_progress is not None and months_between > 0:
        f["progress_velocity"] = (phys - prev_progress) / months_between
    else:
        f["progress_velocity"] = 0.0

    # Recovery gap
    rev_end = _parse_date(row.get("revised_end_date"))
    if rev_end and ref_dt < rev_end:
        months_left  = max((rev_end - ref_dt).days / 30.44, 0.1)
        work_left    = max(100.0 - phys, 0.0)
        req_pace     = work_left / months_left
        cur_pace     = max(f["progress_velocity"], 0.01)
        f["recovery_gap"] = max(req_pace - cur_pace, 0.0)
    else:
        f["recovery_gap"] = 10.0  # overdue projects get high recovery gap

    f["revised_cost"] = rev
    return f


# ── Dataset Builder ───────────────────────────────────────────────────────────

def build_dataset():
    """
    Build the training dataframe from the SQLite database.
    Strategy:
      - For each project, take its June snapshot as the feature window.
      - Label_date  = 1 if Revised_End_Date changed between June and July.
      - Label_cost  = 1 if Revised_Cost increased between June and July.
      - Also include April→May window for more training examples.
    """
    db = Session()
    rows = db.execute(text(
        "SELECT p.project_id, p.agency, p.state, "
        "s.snapshot_date, s.start_date, s.original_end_date, s.revised_end_date, "
        "s.original_cost, s.revised_cost, s.expenditure, s.physical_progress "
        "FROM projects p JOIN project_snapshots s ON p.project_id = s.project_id "
        "ORDER BY p.project_id, s.snapshot_date"
    )).fetchall()
    db.close()

    # Organise by project
    projects = {}
    for r in rows:
        pid = r[0]
        if pid not in projects:
            projects[pid] = {}
        projects[pid][r[3]] = dict(zip(
            ["project_id","agency","state","snapshot_date",
             "start_date","original_end_date","revised_end_date",
             "original_cost","revised_cost","expenditure","physical_progress"],
            r
        ))

    records = []
    WINDOWS = [
        ("June 2026", "July 2026"),
        ("May 2026",  "June 2026"),
        ("April 2026","May 2026"),
    ]

    for pid, snaps in projects.items():
        for feat_month, label_month in WINDOWS:
            if feat_month not in snaps or label_month not in snaps:
                continue

            feat_snap  = snaps[feat_month]
            label_snap = snaps[label_month]

            # Previous snapshot for velocity
            prev_months = sorted([m for m in snaps if SNAPSHOT_ORDER.get(m,0) < SNAPSHOT_ORDER[feat_month]],
                                  key=lambda m: SNAPSHOT_ORDER[m])
            prev_snap = snaps[prev_months[-1]] if prev_months else None
            prev_progress = float(prev_snap["physical_progress"] or 0) if prev_snap else None

            f = _compute_row_features(feat_snap, REF_DATE[feat_month], prev_progress, months_between=1.0)

            # Labels
            f_rev_end  = _parse_date(feat_snap.get("revised_end_date"))
            l_rev_end  = _parse_date(label_snap.get("revised_end_date"))
            f_rev_cost = feat_snap.get("revised_cost") or 0.0
            l_rev_cost = label_snap.get("revised_cost") or 0.0

            label_date = 0
            if f_rev_end and l_rev_end and l_rev_end != f_rev_end:
                label_date = 1
            elif f_rev_end is None and l_rev_end is not None:
                label_date = 1

            label_cost = 1 if l_rev_cost > f_rev_cost * 1.01 else 0  # >1% increase

            f["project_id"]  = pid
            f["label_date"]  = label_date
            f["label_cost"]  = label_cost
            f["window"]      = f"{feat_month} → {label_month}"
            records.append(f)

    df = pd.DataFrame(records)
    print(f"Dataset: {len(df)} training windows")
    print(f"Date revision events: {df['label_date'].sum()} ({df['label_date'].mean()*100:.1f}%)")
    print(f"Cost revision events: {df['label_cost'].sum()} ({df['label_cost'].mean()*100:.1f}%)")
    return df


# ── Model Training ────────────────────────────────────────────────────────────

def train():
    from sklearn.linear_model import LogisticRegression
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import StratifiedKFold, cross_validate
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline
    from sklearn.metrics import (
        roc_auc_score, average_precision_score, f1_score,
        precision_score, recall_score
    )
    import xgboost as xgb

    df = build_dataset()

    X = df[FEATURES].fillna(0).replace([np.inf, -np.inf], 0)
    y_date = df["label_date"]
    y_cost = df["label_cost"]

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    metrics = {}

    # ── Train and evaluate each target ──────────────────────────────────────
    for target_name, y in [("date_revision", y_date), ("cost_revision", y_cost)]:
        print(f"\n{'='*50}")
        print(f"Training for: {target_name} (pos={y.sum()}, neg={(1-y).sum()})")

        # XGBoost
        scale_pos = max((y == 0).sum() / (y == 1).sum(), 1.0) if y.sum() > 0 else 1.0
        xgb_model = xgb.XGBClassifier(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            scale_pos_weight=scale_pos,
            subsample=0.8,
            colsample_bytree=0.8,
            use_label_encoder=False,
            eval_metric="logloss",
            random_state=42,
            verbosity=0,
        )

        logreg = Pipeline([
            ("scaler", StandardScaler()),
            ("lr", LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42))
        ])

        rf = RandomForestClassifier(
            n_estimators=200, max_depth=6, class_weight="balanced",
            random_state=42, n_jobs=-1
        )

        model_metrics = {}
        for name, mdl in [("xgboost", xgb_model), ("logreg", logreg), ("rf", rf)]:
            if y.sum() < 5:
                print(f"  Skipping {name} — not enough positive examples")
                continue
            cv_res = cross_validate(
                mdl, X, y, cv=cv,
                scoring=["roc_auc", "average_precision", "f1"],
                return_train_score=False
            )
            model_metrics[name] = {
                "roc_auc":  round(float(np.mean(cv_res["test_roc_auc"])), 4),
                "pr_auc":   round(float(np.mean(cv_res["test_average_precision"])), 4),
                "f1":       round(float(np.mean(cv_res["test_f1"])), 4),
            }
            print(f"  {name}: ROC-AUC={model_metrics[name]['roc_auc']:.4f}  "
                  f"PR-AUC={model_metrics[name]['pr_auc']:.4f}  "
                  f"F1={model_metrics[name]['f1']:.4f}")

        metrics[target_name] = model_metrics

        # Fit final models on all data and save
        if y.sum() > 0:
            xgb_model.fit(X, y)
            logreg.fit(X, y)

            xgb_path  = os.path.join(MODELS_DIR, f"xgb_{target_name}.pkl")
            lr_path   = os.path.join(MODELS_DIR, "logreg_baseline.pkl")
            with open(xgb_path, "wb") as f:
                pickle.dump(xgb_model, f)
            if target_name == "date_revision":
                with open(lr_path, "wb") as f:
                    pickle.dump(logreg, f)
            print(f"  Saved: {xgb_path}")

    # Save metadata
    meta = {
        "feature_names": FEATURES,
        "model_metrics": metrics,
        "training_size": len(df),
        "positive_date_revision": int(y_date.sum()),
        "positive_cost_revision": int(y_cost.sum()),
        "disclaimer": (
            "With only 4 monthly snapshots, model is demonstrative. "
            "Production-grade reliability requires longer history."
        )
    }
    meta_path = os.path.join(MODELS_DIR, "model_metrics.json")
    feature_path = os.path.join(MODELS_DIR, "feature_names.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    with open(feature_path, "w") as f:
        json.dump(FEATURES, f)

    print(f"\n✅ Training complete. Metrics saved to {meta_path}")
    return meta


if __name__ == "__main__":
    train()
