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

    # ── Physical Progress ─────────────────────────────────────────────────────
    phys = float(getattr(snapshot, "physical_progress", 0) or 0.0)
    features["physical_progress"] = phys

    # ── Cost Escalation ────────────────────────────────────────────────────────
    orig = float(getattr(snapshot, "original_cost", 0) or 0.0)
    rev  = float(getattr(snapshot, "revised_cost", 0) or 0.0)
    features["revised_cost"] = rev
    if orig > 0 and rev > 0:
        features["cost_escalation"] = round(max(0.0, (rev - orig) / orig * 100), 2)

    # ── Expenditure % ─────────────────────────────────────────────────────────
    exp = float(getattr(snapshot, "expenditure", 0) or 0.0)
    if rev > 0:
        features["expenditure_pct"] = round(min(max(exp / rev * 100, 0.0), 200.0), 2)

    # ── Spend-Progress Gap ────────────────────────────────────────────────────
    features["spend_progress_gap"] = round(max(0.0, features["expenditure_pct"] - phys), 2)

    # ── Dates & Timeline (Active Target Baseline) ─────────────────────────────
    start_dt = parse_date(getattr(snapshot, "start_date", None))
    orig_end = parse_date(getattr(snapshot, "original_end_date", None))
    rev_end  = parse_date(getattr(snapshot, "revised_end_date", None))
    target_end = rev_end if rev_end else orig_end

    elapsed_months = max((reference_date - start_dt).days / 30.44, 1.0) if start_dt else 12.0

    if start_dt and target_end and target_end > start_dt:
        total_days   = max((target_end - start_dt).days, 1)
        elapsed_days = (reference_date - start_dt).days
        tc = min(max(elapsed_days / total_days * 100, 0.0), 150.0)
        features["time_consumed_pct"] = round(tc, 2)
        if phys >= 100.0:
            features["schedule_drift"] = 0.0
        else:
            features["schedule_drift"] = round(max(0.0, tc - phys), 2)
    else:
        features["time_consumed_pct"] = 50.0
        features["schedule_drift"] = 0.0 if phys >= 100.0 else round(max(0.0, 50.0 - phys), 2)

    # Date extension slippage (extension beyond original sanctioned end date)
    slippage_pct = 0.0
    if start_dt and orig_end and rev_end and rev_end > orig_end and orig_end > start_dt:
        orig_dur = max((orig_end - start_dt).days, 1)
        ext_days = (rev_end - orig_end).days
        slippage_pct = min(ext_days / orig_dur * 100, 100.0)

    # ── Progress Velocity ─────────────────────────────────────────────────────
    if previous_snapshot is not None:
        prev_phys = float(getattr(previous_snapshot, "physical_progress", 0) or 0.0)
        prev_snap_date = getattr(previous_snapshot, "snapshot_date", None)
        months_between = abs(
            SNAPSHOT_ORDER.get(snap_date_str, 1) -
            SNAPSHOT_ORDER.get(prev_snap_date, 1)
        ) or 1
        features["progress_velocity"] = round((phys - prev_phys) / months_between, 3)
    else:
        # Single snapshot: calculate average historical monthly velocity
        features["progress_velocity"] = round(phys / elapsed_months, 3)

    # ── Pace-Adjusted Completion Forecast ─────────────────────────────────────
    work_left = max(100.0 - phys, 0.0)
    effective_velocity = max(features["progress_velocity"], 0.1)

    if phys >= 100.0:
        features["pace_adjusted_completion_months"] = 0.0
    elif effective_velocity > 0:
        features["pace_adjusted_completion_months"] = round(work_left / effective_velocity, 1)

    # ── Recovery Gap & Required Pace ──────────────────────────────────────────
    if phys >= 100.0:
        features["required_pace"] = 0.0
        features["recovery_gap"]  = 0.0
    elif target_end and reference_date < target_end:
        months_left = max((target_end - reference_date).days / 30.44, 0.5)
        req_pace    = work_left / months_left
        features["required_pace"] = round(req_pace, 2)
        cur_pace    = max(features["progress_velocity"], 0.5)
        features["recovery_gap"] = round(max(req_pace - cur_pace, 0.0), 2)
    elif target_end and reference_date >= target_end:
        # Project is overdue
        features["required_pace"] = round(work_left, 2)
        features["recovery_gap"]  = round(work_left, 2)
    else:
        features["required_pace"] = round(work_left / 12.0, 2)
        features["recovery_gap"]  = round(work_left / 12.0, 2)

    # ── Completed Projects Fast-Path ─────────────────────────────────────────
    if phys >= 100.0:
        score = 0.05 if features["cost_escalation"] > 20 else 0.0
        features["risk_score"] = round(score, 3)
        features["risk_label"] = "Low Risk"
        return features

    # ── Multi-Factor Rule-Based Risk Scoring ───────────────────────────────────
    score = 0.0

    # 1. Schedule Drift (against active approved target)
    sd = features["schedule_drift"]
    if   sd > 40: score += 0.30
    elif sd > 25: score += 0.22
    elif sd > 15: score += 0.14
    elif sd >  5: score += 0.06

    # 2. Cost Escalation
    ce = features["cost_escalation"]
    if   ce > 40: score += 0.25
    elif ce > 20: score += 0.18
    elif ce > 10: score += 0.10
    elif ce >  5: score += 0.05

    # 3. Spend-Progress Gap
    spg = features["spend_progress_gap"]
    if   spg > 30: score += 0.15
    elif spg > 15: score += 0.10
    elif spg >  5: score += 0.05

    # 4. Recovery Gap & Overdue Pressure
    rg = features["recovery_gap"]
    if target_end and reference_date >= target_end and phys < 90:
        score += 0.20  # Overdue with incomplete physical progress
    elif rg > 10: score += 0.18
    elif rg >  5: score += 0.10
    elif rg >  2: score += 0.05

    # 5. Stagnation / Velocity
    pv = features["progress_velocity"]
    if previous_snapshot is not None:
        if   pv <= 0:   score += 0.15
        elif pv <  0.5: score += 0.10
        elif pv <  1.0: score += 0.05
    else:
        # Single snapshot: penalize if running for long with negligible progress
        if phys == 0.0 and elapsed_months >= 12:
            score += 0.15
        elif pv < 0.3 and phys < 50:
            score += 0.10
        elif pv < 0.8 and phys < 70:
            score += 0.05

    # 6. Milestone Slippage (extension of deadline beyond original)
    if   slippage_pct > 50: score += 0.10
    elif slippage_pct > 20: score += 0.05

    # Near-completion discount: projects at 90-99% have low execution uncertainty
    completion_discount = 0.20 if phys >= 95.0 else (0.10 if phys >= 90.0 else 0.0)
    score = max(0.0, score - completion_discount)

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

    if pp >= 100.0:
        return ["Project is physically complete"]

    if sd > 30 and pp < 100:
        reasons.append(f"Very high schedule drift ({sd:.1f}pp — time consumed far exceeds physical progress)")
    elif sd > 15 and pp < 100:
        reasons.append(f"High schedule drift ({sd:.1f}pp behind schedule)")
    elif sd > 5 and pp < 100:
        reasons.append(f"Moderate schedule drift ({sd:.1f}pp)")

    if ce > 30:
        reasons.append(f"Severe cost escalation ({ce:.1f}% above original estimate)")
    elif ce > 15:
        reasons.append(f"Significant cost escalation ({ce:.1f}%)")
    elif ce > 5:
        reasons.append(f"Moderate cost escalation ({ce:.1f}%)")

    if spg > 20 and pp < 90:
        reasons.append(f"Large spend-progress gap ({spg:.1f}pp — expenditure ahead of physical output)")
    elif spg > 10 and pp < 90:
        reasons.append(f"Spend-progress gap of {spg:.1f}pp")

    if pv <= 0 and pp < 100:
        reasons.append("Progress has stagnated or regressed since last snapshot")
    elif pv < 0.5 and pp < 50:
        reasons.append(f"Progress velocity is very slow ({pv:.2f}%/month)")

    if rg > 10 and pp < 90:
        reasons.append(f"Critical recovery gap: {rg:.1f}%/month needed above current pace to meet deadline")
    elif rg > 5 and pp < 90:
        reasons.append(f"High recovery gap ({rg:.1f}%/month above current pace)")
    elif rg > 2 and pp < 90:
        reasons.append(f"Moderate recovery gap ({rg:.1f}%/month needed)")

    if tc > 90 and pp < 70:
        reasons.append("Project is near or past its planned end date with significant work remaining")

    if not reasons:
        reasons.append("Project is progressing within normal risk parameters")

    return reasons
