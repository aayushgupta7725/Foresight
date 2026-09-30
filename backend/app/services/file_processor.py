import pandas as pd
from typing import List, Dict, Any
import numpy as np

def clean_value(val):
    if pd.isna(val) or val == "-":
        return None
    return val

def process_excel(file_path: str, snapshot_date: str) -> List[Dict[str, Any]]:
    df = pd.read_excel(file_path)
    
    # Expected standard mapping for MVP
    # PAIMANA_Project_ID -> project_id
    # Project_Name -> project_name
    # Agency -> agency
    # State -> state
    # Original_Start_Date -> start_date
    # Original_End_Date -> original_end_date
    # Revised_End_Date -> revised_end_date
    # Original_Cost_Cr -> original_cost
    # Revised_Cost_Cr -> revised_cost
    # Cumulative_Expenditure_Cr -> expenditure
    # Physical_Progress_Pct -> physical_progress
    
    # Check if this is the PAIMANA dataset
    if "PAIMANA_Project_ID" in df.columns:
        df = df.rename(columns={
            "PAIMANA_Project_ID": "project_id",
            "Project_Name": "project_name",
            "Agency": "agency",
            "State": "state",
            "Original_Start_Date": "start_date",
            "Original_End_Date": "original_end_date",
            "Revised_End_Date": "revised_end_date",
            "Original_Cost_Cr": "original_cost",
            "Revised_Cost_Cr": "revised_cost",
            "Cumulative_Expenditure_Cr": "expenditure",
            "Physical_Progress_Pct": "physical_progress"
        })
        
    records = []
    for _, row in df.iterrows():
        # Clean placeholders like '-'
        record = {
            "project_id": str(row.get("project_id", "")),
            "project_name": str(row.get("project_name", "")),
            "agency": str(row.get("agency", "")),
            "state": str(row.get("state", "")),
            "sector": None, # Derivable from agency later
            "snapshot_date": snapshot_date,
            "start_date": clean_value(row.get("start_date")),
            "original_end_date": clean_value(row.get("original_end_date")),
            "revised_end_date": clean_value(row.get("revised_end_date")),
            "original_cost": float(row.get("original_cost", 0)) if pd.notnull(row.get("original_cost")) else 0.0,
            "revised_cost": float(row.get("revised_cost", 0)) if pd.notnull(row.get("revised_cost")) else 0.0,
            "expenditure": float(row.get("expenditure", 0)) if pd.notnull(row.get("expenditure")) else 0.0,
            "physical_progress": float(row.get("physical_progress", 0)) if pd.notnull(row.get("physical_progress")) else 0.0
        }
        
        # Validations
        if not record["project_id"] or record["project_id"] == "nan":
            continue
            
        records.append(record)
        
    return records
