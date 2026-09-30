"""
Builds the in-memory cache from the database.
Called once on startup and after each upload.
"""
from sqlalchemy.orm import Session
from app.database import schema
from app.services.feature_engineering import (
    compute_features, infer_sector, build_risk_reasons, SNAPSHOT_ORDER
)
from app.services.cache import set_cache, is_stale, get_cached_snapshot_date
from typing import Optional, Dict


def _get_latest_snapshot_date(db: Session) -> Optional[str]:
    dates = db.query(schema.ProjectSnapshot.snapshot_date).distinct().all()
    if not dates:
        return None
    return max([d[0] for d in dates], key=lambda x: SNAPSHOT_ORDER.get(x, 0))


def _get_prev_month(latest_date: str) -> Optional[str]:
    current_order = SNAPSHOT_ORDER.get(latest_date, 0)
    for name, order in SNAPSHOT_ORDER.items():
        if order == current_order - 1:
            return name
    return None


def build_cache(db: Session, force: bool = False) -> bool:
    """
    Builds the full project list + summary and stores in memory.
    Returns True if cache was (re)built, False if already up to date.
    """
    latest_date = _get_latest_snapshot_date(db)
    if not latest_date:
        return False

    if not force and not is_stale(latest_date):
        return False   # already current

    # ── Load all data in 3 bulk queries ──────────────────────────────────────
    latest_snaps = db.query(schema.ProjectSnapshot).filter(
        schema.ProjectSnapshot.snapshot_date == latest_date
    ).all()

    prev_month = _get_prev_month(latest_date)
    prev_snaps = []
    if prev_month:
        prev_snaps = db.query(schema.ProjectSnapshot).filter(
            schema.ProjectSnapshot.snapshot_date == prev_month
        ).all()
    prev_map: Dict[str, object] = {s.project_id: s for s in prev_snaps}

    all_projects = db.query(schema.Project).all()
    proj_map: Dict[str, object] = {p.project_id: p for p in all_projects}

    # ── Compute features for every project ───────────────────────────────────
    projects_list = []
    total_capex = high_risk_capex = 0.0
    high_risk = medium_risk = low_risk = 0
    stagnating = high_sched = high_cost = deadline_p = 0
    sector_data: Dict[str, dict] = {}

    for snap in latest_snaps:
        project = proj_map.get(snap.project_id)
        if not project:
            continue

        prev     = prev_map.get(snap.project_id)
        features = compute_features(snap, previous_snapshot=prev)
        sector   = project.sector or infer_sector(project.agency)
        label    = features["risk_label"]
        rev_cost = snap.revised_cost or 0.0

        # summary counters
        total_capex += rev_cost
        if label == "High Risk":
            high_risk      += 1
            high_risk_capex += rev_cost
        elif label == "Medium Risk":
            medium_risk += 1
        else:
            low_risk += 1

        if features["progress_velocity"] <= 0:     stagnating += 1
        if features["schedule_drift"]    > 20:     high_sched += 1
        if features["cost_escalation"]   > 15:     high_cost  += 1
        if features["recovery_gap"]      > 5:      deadline_p += 1

        if sector not in sector_data:
            sector_data[sector] = {"high": 0, "medium": 0, "low": 0, "total": 0}
        sector_data[sector]["total"] += 1
        sector_data[sector][{"High Risk": "high",
                             "Medium Risk": "medium",
                             "Low Risk": "low"}[label]] += 1

        projects_list.append({
            "project_id":         project.project_id,
            "project_name":       project.project_name,
            "agency":             project.agency,
            "state":              project.state,
            "sector":             sector,
            "physical_progress":  round(snap.physical_progress or 0.0, 1),
            "time_consumed_pct":  features["time_consumed_pct"],
            "schedule_drift":     features["schedule_drift"],
            "cost_escalation":    features["cost_escalation"],
            "spend_progress_gap": features["spend_progress_gap"],
            "progress_velocity":  features["progress_velocity"],
            "recovery_gap":       features["recovery_gap"],
            "risk_score":         features["risk_score"],
            "risk_label":         label,
            "original_cost":      snap.original_cost,
            "revised_cost":       snap.revised_cost,
            "expenditure":        snap.expenditure,
            "revised_end_date":   snap.revised_end_date,
            "snapshot_date":      snap.snapshot_date,
        })

    # Sort by risk_score desc (default order)
    projects_list.sort(key=lambda x: x["risk_score"], reverse=True)

    # ── Build summary ─────────────────────────────────────────────────────────
    sector_list = sorted(
        [{"sector": k, **v} for k, v in sector_data.items()],
        key=lambda x: x["total"], reverse=True
    )

    summary = {
        "total_projects":       len(projects_list),
        "high_risk":            high_risk,
        "medium_risk":          medium_risk,
        "low_risk":             low_risk,
        "stagnating":           stagnating,
        "high_schedule_drift":  high_sched,
        "high_cost_escalation": high_cost,
        "deadline_pressure":    deadline_p,
        "total_capex":          round(total_capex / 100_000, 2),
        "high_risk_capex":      round(high_risk_capex / 100_000, 2),
        "high_risk_capex_pct":  round(high_risk_capex / total_capex * 100, 1) if total_capex > 0 else 0,
        "active_snapshot":      latest_date,
        "sector_breakdown":     sector_list[:8],
    }

    set_cache(latest_date, projects_list, summary)
    print(f"[cache] Built: {len(projects_list)} projects for {latest_date}")
    return True
