import pandas as pd
import numpy as np
from datetime import datetime, date
from typing import Optional, Dict, Any, List

SNAPSHOT_ORDER = {
    "April 2026": 1,
    "May 2026": 2,
    "June 2026": 3,
    "July 2026": 4,
}

# Reference dates for each snapshot month
SNAPSHOT_REF_DATES = {
    "April 2026": date(2026, 4, 30),
    "May 2026":   date(2026, 5, 31),
    "June 2026":  date(2026, 6, 30),
    "July 2026":  date(2026, 7, 31),
}

# Comprehensive agency → sector mapping (186 PAIMANA agencies)
SECTOR_MAP = {
    # Roads & Highways
    "NHAI": "Roads & Highways",
    "NHIDCL": "Roads & Highways",
    "MoRTH": "Roads & Highways",
    "NHIDCL": "Roads & Highways",
    "Border Roads": "Roads & Highways",
    "BRO": "Roads & Highways",
    "SARDP-NE": "Roads & Highways",
    # Railways
    "Railways": "Railways",
    "DFCCIL": "Railways",
    "RVNL": "Railways",
    "IRCON": "Railways",
    "Rail Vikas": "Railways",
    "KRCL": "Railways",
    "Konkan Railway": "Railways",
    "RLDA": "Railways",
    "Indian Railway": "Railways",
    "IRCTC": "Railways",
    "IPRCL": "Railways",
    # Urban Transit
    "DMRC": "Urban Rapid Transit",
    "BMRCL": "Urban Rapid Transit",
    "MMRCL": "Urban Rapid Transit",
    "CMRL": "Urban Rapid Transit",
    "HMRL": "Urban Rapid Transit",
    "GMRC": "Urban Rapid Transit",
    "NMRCL": "Urban Rapid Transit",
    "LMRCL": "Urban Rapid Transit",
    "JMRCL": "Urban Rapid Transit",
    "Pune Metro": "Urban Rapid Transit",
    "Kochi Metro": "Urban Rapid Transit",
    "Metro Rail": "Urban Rapid Transit",
    # Power & Energy
    "NTPC": "Power & Energy",
    "SECI": "Power & Energy",
    "NHPC": "Power & Energy",
    "POWERGRID": "Power & Energy",
    "Power Grid": "Power & Energy",
    "IREDA": "Power & Energy",
    "SJVN": "Power & Energy",
    "THDC": "Power & Energy",
    "NEEPCO": "Power & Energy",
    "DVC": "Power & Energy",
    "Damodar Valley": "Power & Energy",
    "PGCIL": "Power & Energy",
    "BPCL": "Power & Energy",
    "HPCL": "Power & Energy",
    "IOCL": "Power & Energy",
    "Indian Oil": "Power & Energy",
    "ONGC": "Power & Energy",
    "Coal India": "Power & Energy",
    "CIL": "Power & Energy",
    "NLCIL": "Power & Energy",
    "GAIL": "Power & Energy",
    # Ports & Waterways
    "JNPA": "Ports & Waterways",
    "JNPT": "Ports & Waterways",
    "SMP": "Ports & Waterways",
    "IWAI": "Ports & Waterways",
    "Deendayal Port": "Ports & Waterways",
    "V.O. Chidambaranar": "Ports & Waterways",
    "Cochin Port": "Ports & Waterways",
    "Paradip Port": "Ports & Waterways",
    "Mormugao": "Ports & Waterways",
    "New Mangalore": "Ports & Waterways",
    "Kolkata Port": "Ports & Waterways",
    "Chennai Port": "Ports & Waterways",
    "Vishakhapatnam": "Ports & Waterways",
    # Civil Aviation
    "AAI": "Civil Aviation",
    "Airport Authority": "Civil Aviation",
    "DIAL": "Civil Aviation",
    "BIAL": "Civil Aviation",
    "MIAL": "Civil Aviation",
    "HIAL": "Civil Aviation",
    # Telecom
    "BSNL": "Telecom",
    "MTNL": "Telecom",
    "BBNL": "Telecom",
    "RailTel": "Telecom",
    # Urban Development
    "NMCG": "Urban Development",
    "NCRPB": "Urban Development",
    "HUDCO": "Urban Development",
    "CIDCO": "Urban Development",
    "DDA": "Urban Development",
    "Smart City": "Urban Development",
    "AMRUT": "Urban Development",
    # Water & Irrigation
    "WAPCOS": "Water & Irrigation",
    "CWC": "Water & Irrigation",
    "CWPRS": "Water & Irrigation",
    "Irrigation": "Water & Irrigation",
    # Defence
    "BEL": "Defence",
    "HAL": "Defence",
    "DRDO": "Defence",
    "Ordnance": "Defence",
}


def infer_sector(agency: str) -> str:
    """Infer sector from agency name using comprehensive keyword matching."""
    if not agency:
        return "Infrastructure"
    agency_upper = agency.upper()

    # Direct keyword matches first
    for key, sector in SECTOR_MAP.items():
        if key.upper() in agency_upper:
            return sector

    # Pattern-based fallbacks
    if any(k in agency_upper for k in ["RAIL", "METRO", "RAPID TRANSIT", "DFCC"]):
        return "Railways"
    if any(k in agency_upper for k in ["ROAD", "HIGHWAY", "NH ", "NATIONAL HIG"]):
        return "Roads & Highways"
    if any(k in agency_upper for k in ["POWER", "ENERGY", "SOLAR", "WIND", "THERMAL", "HYDRO", "ELECTRIC", "GAS", "PETRO", "OIL", "COAL", "MINE", "MINING"]):
        return "Power & Energy"
    if any(k in agency_upper for k in ["PORT", "SHIP", "MARITIME", "WATERWAY", "DOCK"]):
        return "Ports & Waterways"
    if any(k in agency_upper for k in ["AIRPORT", "AVIATION", "AAI", "FLIGHT"]):
        return "Civil Aviation"
    if any(k in agency_upper for k in ["TELECOM", "TELE", "BROADBAND", "OPTICAL", "DIGITAL"]):
        return "Telecom"
    if any(k in agency_upper for k in ["IRRIGATION", "DAM", "RIVER", "CANAL", "WATER"]):
        return "Water & Irrigation"
    if any(k in agency_upper for k in ["URBAN", "CITY", "MUNICIPAL", "METRO CITY", "SMART"]):
        return "Urban Development"
    if any(k in agency_upper for k in ["DEFENCE", "MILITARY", "ARMY", "NAVY", "AIR FORCE", "DRDO", "BEL", "HAL"]):
        return "Defence"

    return "Infrastructure"


def parse_date(val) -> Optional[date]:
    """Safely parse a date from various formats, handling PAIMANA placeholders."""
    if val is None:
        return None
    if isinstance(val, (datetime, date)):
        return val.date() if isinstance(val, datetime) else val
    val_str = str(val).strip()
    # PAIMANA placeholder values
    if val_str in ("-", "--", "NA", "N/A", "nan", "NaT", "None", ""):
        return None
    try:
        return pd.to_datetime(val_str, dayfirst=True).date()
    except Exception:
        return None


def compute_features(
    snapshot,
    previous_snapshot=None,
    reference_date: Optional[date] = None,
) -> Dict[str, Any]:
    """
    Compute all engineered risk features for a single project snapshot.

    Args:
        snapshot: ProjectSnapshot ORM object (or dict-like)
        previous_snapshot: Optional prior snapshot for velocity calculation
        reference_date: Override the reference date (defaults to snapshot month)

    Returns:
        dict with all computed features and risk_score / risk_label
    """
    snap_date_str = getattr(snapshot, "snapshot_date", None)
    if reference_date is None:
        reference_date = SNAPSHOT_REF_DATES.get(snap_date_str, date(2026, 7, 31))

    features: Dict[str, Any] = {
        "schedule_drift": 0.0,
        "cost_escalation": 0.0,
        "spend_progress_gap": 0.0,
        "time_consumed_pct": 0.0,
        "expenditure_pct": 0.0,
        "progress_velocity": 0.0,
        "recovery_gap": 0.0,
        "pace_adjusted_completion_months": None,
        "required_pace": 0.0,
    }

    # ── Cost Escalation ────────────────────────────────────────────────────────
    orig = float(getattr(snapshot, "original_cost", 0) or 0.0)
    rev  = float(getattr(snapshot, "revised_cost", 0) or 0.0)
    if orig > 0:
        features["cost_escalation"] = round((rev - orig) / orig * 100, 2)

    # ── Expenditure % ─────────────────────────────────────────────────────────
    exp = float(getattr(snapshot, "expenditure", 0) or 0.0)
    if rev > 0:
        features["expenditure_pct"] = round(exp / rev * 100, 2)

    # ── Physical Progress ─────────────────────────────────────────────────────
    phys = float(getattr(snapshot, "physical_progress", 0) or 0.0)

    # ── Time Consumed % & Schedule Drift ─────────────────────────────────────
    start_dt = parse_date(getattr(snapshot, "start_date", None))
    end_dt   = parse_date(getattr(snapshot, "original_end_date", None))

    if start_dt and end_dt and end_dt > start_dt:
        total_days   = max((end_dt - start_dt).days, 1)
        elapsed_days = (reference_date - start_dt).days
        tc = min(max(elapsed_days / total_days * 100, 0), 150)
        features["time_consumed_pct"] = round(tc, 2)
        features["schedule_drift"]    = round(tc - phys, 2)
    else:
        # Fallback if dates missing
        features["time_consumed_pct"] = 50.0
        features["schedule_drift"]    = round(50.0 - phys, 2)

    # ── Spend-Progress Gap ────────────────────────────────────────────────────
    features["spend_progress_gap"] = round(features["expenditure_pct"] - phys, 2)

    # ── Progress Velocity ─────────────────────────────────────────────────────
    if previous_snapshot is not None:
        prev_phys = float(getattr(previous_snapshot, "physical_progress", 0) or 0.0)
        prev_snap_date = getattr(previous_snapshot, "snapshot_date", None)
        # Assume monthly snapshots (1 month between each)
        months_between = abs(
            SNAPSHOT_ORDER.get(snap_date_str, 1) -
            SNAPSHOT_ORDER.get(prev_snap_date, 1)
        ) or 1
        features["progress_velocity"] = round((phys - prev_phys) / months_between, 3)
    else:
        features["progress_velocity"] = 0.0

    # ── Pace-Adjusted Completion Forecast ─────────────────────────────────────
    if start_dt and features["progress_velocity"] > 0.1 and phys > 0:
        # Estimate months to reach 100% at current velocity
        remaining_work = max(100.0 - phys, 0.0)
        months_to_complete = remaining_work / features["progress_velocity"]
        features["pace_adjusted_completion_months"] = round(months_to_complete, 1)
    elif phys > 0:
        # Fallback: use time-based extrapolation
        if start_dt:
            elapsed_months = max((reference_date - start_dt).days / 30.44, 0.1)
            est_total = elapsed_months / (phys / 100.0)
            features["pace_adjusted_completion_months"] = round(
                est_total - elapsed_months, 1
            )

    # ── Recovery Gap ──────────────────────────────────────────────────────────
    rev_end = parse_date(getattr(snapshot, "revised_end_date", None))
    if rev_end and reference_date < rev_end:
        months_left  = max((rev_end - reference_date).days / 30.44, 0.1)
        work_left    = max(100.0 - phys, 0.0)
        req_pace     = work_left / months_left
        features["required_pace"] = round(req_pace, 2)
        cur_pace     = max(abs(features["progress_velocity"]), 0.01)
        features["recovery_gap"] = round(max(req_pace - cur_pace, 0.0), 2)
    elif rev_end and reference_date >= rev_end:
        # Project is overdue
        features["recovery_gap"]   = round(max(100.0 - phys, 0.0), 2)
        features["required_pace"]  = 0.0
    else:
        # No revised end date — use original
        if end_dt and reference_date < end_dt:
            months_left = max((end_dt - reference_date).days / 30.44, 0.1)
            work_left   = max(100.0 - phys, 0.0)
            req_pace    = work_left / months_left
            features["required_pace"] = round(req_pace, 2)
            cur_pace    = max(abs(features["progress_velocity"]), 0.01)
            features["recovery_gap"] = round(max(req_pace - cur_pace, 0.0), 2)
        else:
            features["recovery_gap"]  = round(max(100.0 - phys, 0.0), 2)

    # ── Rule-Based Risk Scoring ────────────────────────────────────────────────
    score = 0.0

    sd = features["schedule_drift"]
    if   sd > 30: score += 0.50
    elif sd > 20: score += 0.35
    elif sd > 10: score += 0.20
    elif sd >  5: score += 0.10

    ce = features["cost_escalation"]
    if   ce > 30: score += 0.25
    elif ce > 20: score += 0.18
    elif ce > 10: score += 0.12
    elif ce >  5: score += 0.05

    spg = features["spend_progress_gap"]
    if   spg > 25: score += 0.20
    elif spg > 15: score += 0.15
    elif spg >  5: score += 0.08

    pv = features["progress_velocity"]
    if   pv <= 0:   score += 0.15
    elif pv <  0.5: score += 0.10
    elif pv <  1.0: score += 0.05

    rg = features["recovery_gap"]
    if   rg > 10: score += 0.20
    elif rg >  5: score += 0.12
    elif rg >  2: score += 0.06

    features["risk_score"] = round(min(score, 1.0), 3)

    if   features["risk_score"] >= 0.50: features["risk_label"] = "High Risk"
    elif features["risk_score"] >= 0.25: features["risk_label"] = "Medium Risk"
    else:                                features["risk_label"] = "Low Risk"

    return features


def build_risk_reasons(features: Dict[str, Any]) -> List[str]:
    """Return human-readable list of risk factors from feature values."""
    reasons = []
    sd  = features.get("schedule_drift", 0)
    ce  = features.get("cost_escalation", 0)
    spg = features.get("spend_progress_gap", 0)
    pv  = features.get("progress_velocity", 0)
    rg  = features.get("recovery_gap", 0)
    tc  = features.get("time_consumed_pct", 0)
    pp  = features.get("physical_progress", 0)

    if sd > 30:
        reasons.append(f"Very high schedule drift ({sd:.1f}pp — time consumed far exceeds physical progress)")
    elif sd > 15:
        reasons.append(f"High schedule drift ({sd:.1f}pp behind schedule)")
    elif sd > 5:
        reasons.append(f"Moderate schedule drift ({sd:.1f}pp)")

    if ce > 30:
        reasons.append(f"Severe cost escalation ({ce:.1f}% above original estimate)")
    elif ce > 15:
        reasons.append(f"Significant cost escalation ({ce:.1f}%)")
    elif ce > 5:
        reasons.append(f"Moderate cost escalation ({ce:.1f}%)")

    if spg > 20:
        reasons.append(f"Large spend-progress gap ({spg:.1f}pp — expenditure ahead of physical output)")
    elif spg > 10:
        reasons.append(f"Spend-progress gap of {spg:.1f}pp")

    if pv <= 0:
        reasons.append("Progress has stagnated or regressed since last snapshot")
    elif pv < 0.5:
        reasons.append(f"Progress velocity is very slow ({pv:.2f}%/month)")
    elif pv < 1.0:
        reasons.append(f"Progress velocity is below average ({pv:.2f}%/month)")

    if rg > 10:
        reasons.append(f"Critical recovery gap: {rg:.1f}%/month needed above current pace to meet deadline")
    elif rg > 5:
        reasons.append(f"High recovery gap ({rg:.1f}%/month above current pace)")
    elif rg > 2:
        reasons.append(f"Moderate recovery gap ({rg:.1f}%/month needed)")

    if tc > 90 and pp < 70:
        reasons.append("Project is near or past its planned end date with significant work remaining")

    if not reasons:
        reasons.append("No major risk indicators detected at this time")

    return reasons
