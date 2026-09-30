"""
Dashboard API — serves from in-memory cache for instant responses.
Cache is built on startup and invalidated after each upload.
"""
from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database import connection, schema
from app.services.feature_engineering import (
    compute_features, infer_sector, build_risk_reasons, SNAPSHOT_ORDER
)
from app.services.cache import get_cached_projects, get_cached_summary, is_stale
from app.services.cache_builder import build_cache, _get_latest_snapshot_date

router = APIRouter()


def _ensure_cache(db: Session):
    """Build cache if missing or stale. Called on every request (cheap if warm)."""
    latest = _get_latest_snapshot_date(db)
    if latest and is_stale(latest):
        build_cache(db)


# ─────────────────────────────────────────────────────────────────────────────
# Dashboard Summary  →  instant from cache
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/dashboard/summary")
def get_dashboard_summary(db: Session = Depends(connection.get_db)):
    _ensure_cache(db)
    summary = get_cached_summary()
    if not summary:
        return {
            "total_projects": 0, "high_risk": 0, "medium_risk": 0, "low_risk": 0,
            "stagnating": 0, "high_schedule_drift": 0, "high_cost_escalation": 0,
            "deadline_pressure": 0, "total_capex": 0.0, "high_risk_capex": 0.0,
            "high_risk_capex_pct": 0.0, "active_snapshot": "No Data", "sector_breakdown": [],
        }
    return summary


# ─────────────────────────────────────────────────────────────────────────────
# Project List  →  filter/sort in-memory from cache
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/projects")
def get_projects(
    db: Session = Depends(connection.get_db),
    risk_level:   Optional[str]   = Query(None),
    sector:       Optional[str]   = Query(None),
    state:        Optional[str]   = Query(None),
    search:       Optional[str]   = Query(None),
    min_progress: Optional[float] = Query(None),
    max_progress: Optional[float] = Query(None),
    min_drift:    Optional[float] = Query(None),
    stagnating:   Optional[bool]  = Query(None),
    sort_by:      str             = Query("risk_score"),
    sort_dir:     str             = Query("desc"),
    limit:        int             = Query(50, le=500),
    offset:       int             = Query(0),
):
    _ensure_cache(db)
    all_projects = get_cached_projects()
    if all_projects is None:
        return {"projects": [], "total": 0}

    # ── Filter ────────────────────────────────────────────────────────────────
    results = all_projects  # list already sorted by risk_score desc from cache

    if search:
        s = search.lower()
        results = [p for p in results if
                   s in (p["project_name"] or "").lower() or
                   s in (p["project_id"] or "").lower() or
                   s in (p["agency"] or "").lower()]

    if risk_level and risk_level not in ("All", ""):
        results = [p for p in results if p["risk_label"] == risk_level]

    if sector and sector not in ("All Sectors", ""):
        results = [p for p in results if p["sector"] == sector]

    if state and state not in ("All 28 States & UTs", ""):
        results = [p for p in results if p["state"] == state]

    if min_progress is not None:
        results = [p for p in results if p["physical_progress"] >= min_progress]

    if max_progress is not None:
        results = [p for p in results if p["physical_progress"] <= max_progress]

    if min_drift is not None:
        results = [p for p in results if p["schedule_drift"] >= min_drift]

    if stagnating:
        results = [p for p in results if p["progress_velocity"] <= 0]

    # ── Sort ──────────────────────────────────────────────────────────────────
    key_fns = {
        "risk_score":      lambda x: x["risk_score"],
        "schedule_drift":  lambda x: x["schedule_drift"],
        "cost_escalation": lambda x: x["cost_escalation"],
        "progress":        lambda x: x["physical_progress"],
        "project_name":    lambda x: (x["project_name"] or "").lower(),
    }
    key_fn  = key_fns.get(sort_by, lambda x: x["risk_score"])
    reverse = sort_dir == "desc"

    # Only re-sort if not default (cache is already sorted by risk_score desc)
    if sort_by != "risk_score" or sort_dir != "desc":
        results = sorted(results, key=key_fn, reverse=reverse)

    total = len(results)
    return {"projects": results[offset: offset + limit], "total": total}


# ─────────────────────────────────────────────────────────────────────────────
# Filters  →  derived from cache
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/filters/states")
def get_states(db: Session = Depends(connection.get_db)):
    _ensure_cache(db)
    projects = get_cached_projects() or []
    states   = sorted({p["state"] for p in projects if p.get("state")})
    return states


@router.get("/api/filters/sectors")
def get_sectors(db: Session = Depends(connection.get_db)):
    _ensure_cache(db)
    projects = get_cached_projects() or []
    sectors  = sorted({p["sector"] for p in projects if p.get("sector")})
    return sectors


# ─────────────────────────────────────────────────────────────────────────────
# Project Detail  (not cached — only one project, fast enough)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/projects/{project_id}")
def get_project_detail(project_id: str, db: Session = Depends(connection.get_db)):
    project = db.query(schema.Project).filter(
        schema.Project.project_id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    all_snaps = sorted(
        db.query(schema.ProjectSnapshot).filter(
            schema.ProjectSnapshot.project_id == project_id
        ).all(),
        key=lambda s: SNAPSHOT_ORDER.get(s.snapshot_date, 0)
    )

    snapshot_history = []
    for i, snap in enumerate(all_snaps):
        prev     = all_snaps[i - 1] if i > 0 else None
        features = compute_features(snap, previous_snapshot=prev)
        reasons  = build_risk_reasons(features)
        snapshot_history.append({
            "snapshot_date":     snap.snapshot_date,
            "physical_progress": snap.physical_progress,
            "revised_cost":      snap.revised_cost,
            "original_cost":     snap.original_cost,
            "expenditure":       snap.expenditure,
            "revised_end_date":  snap.revised_end_date,
            "original_end_date": snap.original_end_date,
            "start_date":        snap.start_date,
            **features,
            "risk_reasons": reasons,
        })

    sector = project.sector or infer_sector(project.agency)
    latest = snapshot_history[-1] if snapshot_history else {}

    return {
        "project_id":       project.project_id,
        "project_name":     project.project_name,
        "agency":           project.agency,
        "state":            project.state,
        "sector":           sector,
        "snapshot_history": snapshot_history,
        "latest":           latest,
        "total_snapshots":  len(snapshot_history),
    }


@router.get("/api/projects/{project_id}/history")
def get_project_history(project_id: str, db: Session = Depends(connection.get_db)):
    project = db.query(schema.Project).filter(
        schema.Project.project_id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    all_snaps = sorted(
        db.query(schema.ProjectSnapshot).filter(
            schema.ProjectSnapshot.project_id == project_id
        ).all(),
        key=lambda s: SNAPSHOT_ORDER.get(s.snapshot_date, 0)
    )
    history = []
    for i, snap in enumerate(all_snaps):
        prev     = all_snaps[i - 1] if i > 0 else None
        features = compute_features(snap, previous_snapshot=prev)
        history.append({
            "snapshot_date":     snap.snapshot_date,
            "physical_progress": snap.physical_progress,
            "revised_cost":      snap.revised_cost,
            "expenditure":       snap.expenditure,
            "revised_end_date":  snap.revised_end_date,
            **features,
        })
    return {"project_id": project_id, "history": history}


# ─────────────────────────────────────────────────────────────────────────────
# Prediction
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/projects/{project_id}/prediction")
def get_project_prediction(project_id: str, db: Session = Depends(connection.get_db)):
    project = db.query(schema.Project).filter(
        schema.Project.project_id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    all_snaps = sorted(
        db.query(schema.ProjectSnapshot).filter(
            schema.ProjectSnapshot.project_id == project_id
        ).all(),
        key=lambda s: SNAPSHOT_ORDER.get(s.snapshot_date, 0)
    )
    if not all_snaps:
        raise HTTPException(status_code=404, detail="No snapshots found")

    latest   = all_snaps[-1]
    prev     = all_snaps[-2] if len(all_snaps) > 1 else None
    features = compute_features(latest, previous_snapshot=prev)
    features["physical_progress"] = latest.physical_progress or 0.0
    features["revised_cost"]      = latest.revised_cost or 0.0

    try:
        from app.ml.predict import predict_project_risk
        prediction = predict_project_risk(features)
    except Exception:
        reasons    = build_risk_reasons(features)
        risk_score = features["risk_score"]
        prediction = {
            "current_risk":             features["risk_label"],
            "next_cycle_revision_risk": min(risk_score * 1.1, 0.99),
            "cost_revision_risk":       min(risk_score * 0.7, 0.99),
            "combined_risk_score":      risk_score,
            "factors":                  reasons,
            "top_shap_factors":         reasons[:3],
            "shap_explanations":        [],
            "model_available":          False,
            "disclaimer": "ML model not yet trained. Run POST /api/ml/train to train.",
        }
    return {"project_id": project_id, **prediction}


# ─────────────────────────────────────────────────────────────────────────────
# Benchmark
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/projects/{project_id}/benchmark")
def get_project_benchmark(project_id: str, db: Session = Depends(connection.get_db)):
    project = db.query(schema.Project).filter(
        schema.Project.project_id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    sector = project.sector or infer_sector(project.agency)

    # Get target project features
    all_snaps = sorted(
        db.query(schema.ProjectSnapshot).filter(
            schema.ProjectSnapshot.project_id == project_id
        ).all(),
        key=lambda s: SNAPSHOT_ORDER.get(s.snapshot_date, 0)
    )
    if not all_snaps:
        raise HTTPException(status_code=404, detail="No snapshots found")

    target_snap     = all_snaps[-1]
    target_prev     = all_snaps[-2] if len(all_snaps) > 1 else None
    target_features = compute_features(target_snap, previous_snapshot=target_prev)

    # Use cache for peers — already computed
    _ensure_cache(db)
    all_projects = get_cached_projects() or []
    peers = [p for p in all_projects
             if p["project_id"] != project_id and p["sector"] == sector]

    def avg(lst): return round(sum(lst) / len(lst), 2) if lst else 0.0
    def pct_rank(val, lst):
        return round(sum(1 for x in lst if x <= val) / len(lst) * 100, 1) if lst else 50.0

    peer_progress  = [p["physical_progress"]  for p in peers]
    peer_drift     = [p["schedule_drift"]      for p in peers]
    peer_cost      = [p["cost_escalation"]     for p in peers]
    peer_velocity  = [p["progress_velocity"]   for p in peers]
    peer_risk      = [p["risk_score"]          for p in peers]

    target_prog = target_snap.physical_progress or 0.0
    ap = avg(peer_progress)

    insights = []
    if target_prog < ap:
        insights.append(f"Progress is {round(ap - target_prog, 1)}pp below the sector average ({ap:.1f}%)")
    else:
        insights.append(f"Progress is {round(target_prog - ap, 1)}pp above the sector average ({ap:.1f}%)")
    ad = avg(peer_drift)
    if target_features["schedule_drift"] > ad:
        insights.append(
            f"Schedule drift ({target_features['schedule_drift']:.1f}pp) exceeds "
            f"sector average ({ad:.1f}pp)"
        )
    ac = avg(peer_cost)
    if target_features["cost_escalation"] > ac:
        insights.append(
            f"Cost escalation ({target_features['cost_escalation']:.1f}%) above "
            f"sector peers ({ac:.1f}%)"
        )

    return {
        "project_id": project_id,
        "sector":     sector,
        "n_peers":    len(peers),
        "target": {
            "physical_progress": round(target_prog, 1),
            "schedule_drift":    target_features["schedule_drift"],
            "cost_escalation":   target_features["cost_escalation"],
            "progress_velocity": target_features["progress_velocity"],
            "risk_score":        target_features["risk_score"],
            "risk_label":        target_features["risk_label"],
        },
        "sector_averages": {
            "physical_progress": avg(peer_progress),
            "schedule_drift":    avg(peer_drift),
            "cost_escalation":   avg(peer_cost),
            "progress_velocity": avg(peer_velocity),
            "risk_score":        avg(peer_risk),
        },
        "percentile_ranks": {
            "progress_rank": pct_rank(target_prog, peer_progress),
            "drift_rank":    100 - pct_rank(target_features["schedule_drift"], peer_drift),
        },
        "insights":     insights,
        "sample_peers": peers[:5],
    }


# ─────────────────────────────────────────────────────────────────────────────
# What-If Simulator
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/api/projects/{project_id}/simulate")
def simulate_project(project_id: str, body: dict, db: Session = Depends(connection.get_db)):
    project = db.query(schema.Project).filter(
        schema.Project.project_id == project_id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    all_snaps = sorted(
        db.query(schema.ProjectSnapshot).filter(
            schema.ProjectSnapshot.project_id == project_id
        ).all(),
        key=lambda s: SNAPSHOT_ORDER.get(s.snapshot_date, 0)
    )
    if not all_snaps:
        raise HTTPException(status_code=404, detail="No snapshots found")

    from app.services.feature_engineering import parse_date
    from datetime import timedelta

    latest_snap = all_snaps[-1]
    prev_snap   = all_snaps[-2] if len(all_snaps) > 1 else None
    baseline_f  = compute_features(latest_snap, previous_snapshot=prev_snap)

    class MockSnap:
        pass

    sim = MockSnap()
    sim.snapshot_date     = latest_snap.snapshot_date
    sim.start_date        = latest_snap.start_date
    sim.original_end_date = latest_snap.original_end_date
    sim.physical_progress = latest_snap.physical_progress or 0.0
    sim.original_cost     = latest_snap.original_cost or 0.0
    sim.revised_cost      = latest_snap.revised_cost  or 0.0
    sim.expenditure       = latest_snap.expenditure   or 0.0
    sim.revised_end_date  = latest_snap.revised_end_date

    additional_progress = float(body.get("additional_progress_pct", 0))
    new_pace            = body.get("new_pace_per_month")
    delay_months        = float(body.get("additional_delay_months", 0))
    cost_increase_pct   = float(body.get("cost_increase_pct", 0))
    extra_spend_pct     = float(body.get("additional_expenditure_pct", 0))

    sim.physical_progress = min(sim.physical_progress + additional_progress, 100.0)
    if cost_increase_pct:
        sim.revised_cost *= (1 + cost_increase_pct / 100)
    if extra_spend_pct:
        sim.expenditure += sim.revised_cost * extra_spend_pct / 100
    if delay_months and sim.revised_end_date:
        rev_end_dt = parse_date(sim.revised_end_date)
        if rev_end_dt:
            try:
                from dateutil.relativedelta import relativedelta
                new_end = rev_end_dt + relativedelta(months=int(delay_months))
            except Exception:
                new_end = rev_end_dt + timedelta(days=int(delay_months * 30.44))
            sim.revised_end_date = new_end.strftime("%Y-%m-%d")

    class MockPrev:
        pass

    if new_pace is not None:
        mp = MockPrev()
        mp.snapshot_date     = prev_snap.snapshot_date if prev_snap else "June 2026"
        mp.physical_progress = max(sim.physical_progress - float(new_pace), 0.0)
        scenario_prev = mp
    else:
        scenario_prev = prev_snap

    scenario_f       = compute_features(sim, previous_snapshot=scenario_prev)
    scenario_reasons = build_risk_reasons(scenario_f)

    return {
        "project_id": project_id,
        "baseline": {
            **baseline_f,
            "physical_progress": latest_snap.physical_progress,
            "revised_cost":      latest_snap.revised_cost,
            "expenditure":       latest_snap.expenditure,
            "revised_end_date":  latest_snap.revised_end_date,
        },
        "scenario": {
            **scenario_f,
            "physical_progress": sim.physical_progress,
            "revised_cost":      sim.revised_cost,
            "expenditure":       sim.expenditure,
            "revised_end_date":  sim.revised_end_date,
            "risk_reasons":      scenario_reasons,
        },
        "parameters_applied": body,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Alerts  →  derived from cache instantly
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/alerts")
def get_alerts(
    db: Session = Depends(connection.get_db),
    limit:    int           = Query(100, le=1000),
    offset:   int           = Query(0),
    severity: Optional[str] = Query(None),
):
    _ensure_cache(db)
    projects = get_cached_projects() or []

    alerts = []
    for p in projects:
        sd = p["schedule_drift"]
        ce = p["cost_escalation"]
        pv = p["progress_velocity"]
        rg = p["recovery_gap"]

        project_info = {
            "project_id":   p["project_id"],
            "project_name": p["project_name"],
            "agency":       p["agency"],
            "state":        p["state"],
            "sector":       p["sector"],
            "risk_label":   p["risk_label"],
            "features":     p,
            "snapshot_date": p["snapshot_date"],
        }

        def add(alert_type, sev, msg):
            if severity and severity != sev:
                return
            alerts.append({**project_info, "alert_type": alert_type,
                           "severity": sev, "message": msg})

        if sd > 30:
            add("schedule_drift", "high",
                f"Very high schedule drift: {sd:.1f}pp.")
        elif sd > 20:
            add("schedule_drift", "medium",
                f"High schedule drift: {sd:.1f}pp behind schedule.")

        if ce > 30:
            add("cost_escalation", "high",
                f"Severe cost escalation: {ce:.1f}% above original estimate.")
        elif ce > 15:
            add("cost_escalation", "medium",
                f"Significant cost escalation: {ce:.1f}%.")

        if pv <= 0:
            add("stagnation", "high",
                "Progress has stagnated or regressed since last snapshot.")
        elif pv < 0.5:
            add("stagnation", "medium",
                f"Very slow progress: {pv:.2f}%/month.")

        if rg > 10:
            add("recovery_gap", "high",
                f"Critical recovery gap: {rg:.1f}%/month above current pace needed.")
        elif rg > 5:
            add("recovery_gap", "medium",
                f"High recovery gap: {rg:.1f}%/month needed to meet deadline.")

    sev_order = {"high": 0, "medium": 1, "low": 2}
    alerts.sort(key=lambda x: (sev_order.get(x["severity"], 9),
                                -abs(x["features"].get("schedule_drift", 0))))
    total = len(alerts)
    return {"alerts": alerts[offset: offset + limit], "total": total}


# ─────────────────────────────────────────────────────────────────────────────
# Data Sufficiency
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/api/data-sufficiency")
def get_data_sufficiency(db: Session = Depends(connection.get_db)):
    from sqlalchemy import func
    snapshot_dates = [
        d[0] for d in db.query(schema.ProjectSnapshot.snapshot_date).distinct().all()
    ]
    n_snapshots    = len(snapshot_dates)
    total_projects = db.query(schema.Project).count()
    common_projects = db.query(schema.ProjectSnapshot.project_id)\
        .group_by(schema.ProjectSnapshot.project_id)\
        .having(func.count(schema.ProjectSnapshot.snapshot_date) >= min(n_snapshots, 4))\
        .count()

    issues = []
    if n_snapshots < 2:
        issues.append({"issue": "Progress velocity cannot be computed",
                       "detail": "At least 2 snapshots required.", "severity": "error"})
    if n_snapshots < 6:
        issues.append({"issue": "Insufficient snapshots for long-horizon forecasting",
                       "detail": f"Only {n_snapshots} snapshot(s) available. Need 12+.",
                       "severity": "warning"})

    total_snaps = db.query(schema.ProjectSnapshot).count()
    missing_end = db.query(schema.ProjectSnapshot).filter(
        schema.ProjectSnapshot.revised_end_date.is_(None)
    ).count()
    if total_snaps > 0 and round(missing_end / total_snaps * 100, 1) > 10:
        issues.append({
            "issue": f"Revised End Date missing for {round(missing_end/total_snaps*100,1)}% of snapshots",
            "detail": "Recovery gap cannot be computed for these projects.",
            "severity": "warning",
        })

    return {
        "n_snapshots":                    n_snapshots,
        "snapshot_dates":                 sorted(snapshot_dates, key=lambda x: SNAPSHOT_ORDER.get(x, 0)),
        "total_projects":                 total_projects,
        "common_projects":                common_projects,
        "long_horizon_supported":         n_snapshots >= 12,
        "near_term_prediction_supported": n_snapshots >= 2,
        "issues":                         issues,
        "message": (
            "Near-term revision-risk prediction available. Need 12+ snapshots for long-horizon."
        ) if n_snapshots < 12 else "Sufficient data for all prediction modes.",
    }
