"""
Prediction and SHAP explanation module.

Loads trained XGBoost models and computes:
  - next_cycle_revision_risk   (date revision probability)
  - cost_revision_risk         (cost revision probability)
  - current_risk_label         (rule-based: High/Medium/Low)
  - shap_explanations          (top contributing factors, human-readable)
"""

import os
import json
import pickle
import warnings
import numpy as np

from datetime import date
from typing import Dict, Any, Optional, List

warnings.filterwarnings("ignore")

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR  = os.path.join(BASE_DIR, "models")
FEATURE_PATH = os.path.join(MODELS_DIR, "feature_names.json")

# Human-readable names for SHAP feature explanations
FEATURE_LABELS = {
    "schedule_drift":      "Schedule Drift",
    "spend_progress_gap":  "Spend-Progress Gap",
    "cost_escalation":     "Cost Escalation",
    "physical_progress":   "Physical Progress",
    "time_consumed_pct":   "Time Consumed %",
    "progress_velocity":   "Progress Velocity",
    "recovery_gap":        "Recovery Gap",
    "expenditure_pct":     "Expenditure %",
    "revised_cost":        "Revised Project Cost",
}


def _load_model(name: str):
    path = os.path.join(MODELS_DIR, f"{name}.pkl")
    if not os.path.exists(path):
        return None
    with open(path, "rb") as f:
        return pickle.load(f)


def _load_features() -> List[str]:
    if os.path.exists(FEATURE_PATH):
        with open(FEATURE_PATH) as f:
            return json.load(f)
    # fallback
    return [
        "schedule_drift", "spend_progress_gap", "cost_escalation",
        "physical_progress", "time_consumed_pct", "progress_velocity",
        "recovery_gap", "expenditure_pct", "revised_cost"
    ]


def _shap_explanations(model, feature_vec: np.ndarray, feature_names: List[str]) -> List[Dict]:
    """Return sorted list of {feature, value, impact, direction} dicts."""
    try:
        import shap
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(feature_vec)
        # For binary classifiers shap_values may be 2D
        if isinstance(shap_values, list):
            sv = shap_values[1][0]  # class=1 explanations
        else:
            sv = shap_values[0]

        explanations = []
        for i, (name, sv_i) in enumerate(zip(feature_names, sv)):
            explanations.append({
                "feature":    name,
                "label":      FEATURE_LABELS.get(name, name),
                "value":      round(float(feature_vec[0][i]), 3),
                "shap_value": round(float(sv_i), 4),
                "direction":  "increases risk" if sv_i > 0 else "reduces risk",
            })
        return sorted(explanations, key=lambda x: abs(x["shap_value"]), reverse=True)
    except Exception as e:
        # Graceful degradation — return empty list if SHAP fails
        print(f"SHAP error: {e}")
        return []


def _rule_based_explanations(features: Dict) -> List[str]:
    """Generate human-readable risk factors based on thresholds."""
    reasons = []
    sd = features.get("schedule_drift", 0)
    ce = features.get("cost_escalation", 0)
    spg = features.get("spend_progress_gap", 0)
    pv = features.get("progress_velocity", 0)
    rg = features.get("recovery_gap", 0)
    tc = features.get("time_consumed_pct", 0)
    pp = features.get("physical_progress", 0)

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
        reasons.append("Progress has stagnated or regressed recently")
    elif pv < 1.0:
        reasons.append(f"Progress velocity is very slow ({pv:.2f}%/month)")

    if rg > 5:
        reasons.append(f"Recovery gap of {rg:.1f}%/month — current pace insufficient to meet deadline")
    elif rg > 2:
        reasons.append(f"Moderate recovery gap ({rg:.1f}%/month needed above current pace)")

    if tc > 90 and pp < 70:
        reasons.append("Project is near its original planned end date with significant work remaining")

    if not reasons:
        reasons.append("No major risk indicators detected at this time")

    return reasons


def predict_project_risk(features: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main prediction function. Takes a pre-computed feature dict and returns
    risk probabilities, SHAP explanations, and human-readable factors.
    
    Args:
        features: dict with keys matching FEATURE_LABELS (from feature_engineering.py)
        
    Returns:
        dict with prediction output matching TDD Section 36
    """
    feature_names = _load_features()
    xgb_date  = _load_model("xgb_date_revision")
    xgb_cost  = _load_model("xgb_cost_revision")

    # Build feature vector in correct order
    fvec = np.array([[
        float(features.get(fn, 0) or 0)
        for fn in feature_names
    ]])
    # Replace inf/nan
    fvec = np.nan_to_num(fvec, nan=0.0, posinf=100.0, neginf=-100.0)

    # ── Predictions ──────────────────────────────────────────────────────────
    date_risk = 0.5   # default if model unavailable
    cost_risk = 0.3
    shap_explanations = []

    if xgb_date is not None:
        date_risk = float(xgb_date.predict_proba(fvec)[0][1])
        shap_explanations = _shap_explanations(xgb_date, fvec, feature_names)

    if xgb_cost is not None:
        cost_risk = float(xgb_cost.predict_proba(fvec)[0][1])

    # ── Current risk label (rule-based, transparent) ─────────────────────────
    current_risk = features.get("risk_label", "Unknown")
    rule_reasons = _rule_based_explanations(features)

    # ── Combined risk score ──────────────────────────────────────────────────
    combined_risk = round(0.6 * date_risk + 0.4 * cost_risk, 3)

    # ── Top SHAP factors (human readable) ────────────────────────────────────
    top_factors = []
    for ex in shap_explanations[:5]:
        if abs(ex["shap_value"]) > 0.001:
            top_factors.append(
                f"{ex['label']}: {ex['value']:.1f} ({ex['direction']})"
            )
    if not top_factors:
        top_factors = rule_reasons[:3]

    return {
        "current_risk":            current_risk,
        "next_cycle_revision_risk": round(date_risk, 3),
        "cost_revision_risk":      round(cost_risk, 3),
        "combined_risk_score":     combined_risk,
        "factors":                 rule_reasons,
        "top_shap_factors":        top_factors,
        "shap_explanations":       shap_explanations[:8],
        "model_available":         xgb_date is not None,
        "disclaimer": (
            "Near-term revision prediction. Based on 4 monthly PAIMANA snapshots. "
            "For indicative purposes only."
        ) if xgb_date is None else None,
    }
