# TDD - Technical Design Document 

## 1. System Overview

The system will allow an organization to upload infrastructure project data through **Excel/CSV files**. The system converts different organization-specific formats into a common structure and then:

**Upload → Validate → Map → Store Snapshot → Calculate Features → Detect Risk → Predict Future Risk → Explain → Benchmark → Simulate → Monitor**

The system will maintain multiple snapshots of the same project so that its progress can be analyzed over time. For the current prototype, this is backed by real data: PAIMANA snapshots for **April, May, June, and July 2026**, with 1,668 projects tracked across all four months.

Example:
```
Project A
April 2026 → May 2026 → June 2026 → July 2026
```

This allows the system to detect whether a project is improving, slowing down, or moving toward delay/cost problems — and, with four real months now available, to do so using actual observed month-over-month change rather than a single static reading.

---

## 2. High-Level Architecture

```
                  ┌─────────────────────┐
                  │     User / Admin    │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ React + Vite        │
                  │ Frontend            │
                  └──────────┬──────────┘
                             │ REST API
                             ▼
                  ┌─────────────────────┐
                  │ FastAPI Backend     │
                  └──────────┬──────────┘
                             │
          ┌──────────────────┼───────────────────┐
          ▼                  ▼                   ▼
 ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
 │ Data Processing│  │ Risk Engine    │  │ ML Prediction  │
 │ Pandas/NumPy   │  │ Rules/Formulas │  │ Models         │
 └───────┬────────┘  └───────┬────────┘  └───────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             ▼
                  ┌─────────────────────┐
                  │ PostgreSQL Database │
                  └─────────────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Dashboard / Reports │
                  └─────────────────────┘
```

---

## 3. Main System Modules

1. Authentication & User Management
2. File Upload
3. Data Validation
4. Flexible Column Mapping
5. Snapshot Management
6. Project Matching
7. Feature Engineering
8. Current Risk Detection
9. Future Risk Prediction
10. Explainable AI
11. Peer Benchmarking
12. What-If / Intervention Simulator
13. Data Sufficiency Analyzer
14. Dashboard
15. Project Details & History
16. Alerts & Monitoring
17. Optional LLM Assistant

---

## 4. Frontend Architecture

### Technology
```
React
Vite
JavaScript / TypeScript
Recharts or ECharts
Axios
React Router
```

### Suggested structure
```
frontend/
│
├── src/
│   ├── components/
│   │   ├── Dashboard/
│   │   ├── ProjectTable/
│   │   ├── RiskCard/
│   │   ├── Charts/
│   │   ├── Filters/
│   │   └── Simulator/
│   │
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Upload.jsx
│   │   ├── Mapping.jsx
│   │   ├── Projects.jsx
│   │   ├── ProjectDetails.jsx
│   │   └── Simulator.jsx
│   │
│   ├── services/
│   │   └── api.js
│   │
│   ├── hooks/
│   ├── utils/
│   └── App.jsx
│
└── package.json
```

---

## 5. Backend Architecture

### Technology
```
Python
FastAPI
Pandas
NumPy
Scikit-learn
XGBoost / LightGBM
SHAP
SQLAlchemy
PostgreSQL
```

### Suggested structure
```
backend/
│
├── app/
│   ├── main.py
│   │
│   ├── api/
│   │   ├── auth.py
│   │   ├── upload.py
│   │   ├── projects.py
│   │   ├── risk.py
│   │   ├── prediction.py
│   │   ├── benchmark.py
│   │   └── simulator.py
│   │
│   ├── models/
│   │   ├── project.py
│   │   ├── snapshot.py
│   │   ├── risk.py
│   │   └── user.py
│   │
│   ├── services/
│   │   ├── file_processor.py
│   │   ├── validator.py
│   │   ├── mapper.py
│   │   ├── feature_engineering.py
│   │   ├── risk_engine.py
│   │   ├── predictor.py
│   │   ├── benchmark.py
│   │   └── simulator.py
│   │
│   ├── ml/
│   │   ├── train.py
│   │   ├── predict.py
│   │   └── evaluate.py
│   │
│   └── database/
│       ├── connection.py
│       └── schema.py
│
└── requirements.txt
```

---

## 6. Data Input Design

The MVP accepts:
```
.xlsx
.csv
```

The original uploaded file is never modified. The system creates a processed representation separately.

### Actual schema (from real PAIMANA extracts)

| Column | Notes |
| --- | --- |
| PAIMANA_Project_ID | Unique identifier |
| Project_Name | Free text |
| Agency | 186 distinct agencies observed |
| State | 115 distinct states/regions observed |
| Original_Start_Date | MM/YYYY format |
| Revised_Start_Date | MM/YYYY format |
| Original_End_Date | MM/YYYY format |
| Revised_End_Date | MM/YYYY format; approximately 15–18% missing or containing placeholder values ("-") |
| Original_Cost_Cr | In ₹ Crore |
| Revised_Cost_Cr | In ₹ Crore |
| Cumulative_Expenditure_Cr | In ₹ Crore |
| Physical_Progress_Pct | 0–100 |

No explicit Sector/Category column exists in the raw extract — this must be derived rather than assumed present (see Section 7).

---

## 7. Flexible Column Mapping

Different organizations may use different column names.

For example:
```
"Project ID"
"Project_ID"
"Project Code"
"Project Number"
```
can all be mapped to:
```
project_id
```

### Standard schema
```
project_id
project_name
agency
state
sector
start_date
original_end_date
revised_end_date
original_cost
revised_cost
expenditure
physical_progress
```

The mapping interface will allow the user to select, for example:
```
Project Code     →    Project ID
Name             →    Project Name
State Name       →    State
Completion Date  →    Revised End Date
% Complete       →    Physical Progress
```

**Sector handling:** since `sector` is not present in the raw PAIMANA data, the mapping interface must support either (a) an Agency → Sector lookup table maintained by the system (e.g., "Airport Authority of India" → Aviation), or (b) leaving sector unmapped and excluding it from peer-benchmarking filters until it is supplied.

---

## 8. Data Validation

Before processing, the backend validates the uploaded data.

### Validation checks
```
Project ID missing
Duplicate Project ID
Invalid date
Start Date > End Date
Progress < 0
Progress > 100
Negative cost
Negative expenditure
Original Cost missing
Invalid numerical values
Duplicate snapshot
Placeholder/dummy date values (e.g., "-" instead of a true blank)
```

The system should display errors clearly.

Example:
```
Upload Validation

✓ 950 valid records

⚠ 25 records require attention

Errors:
- 8 missing Project IDs
- 5 invalid progress values
- 7 invalid dates
- 5 duplicate Project IDs
```

---

## 9. Snapshot Architecture

Each uploaded dataset is treated as a **snapshot**.

Example:
```
Dataset
 ├── April 2026
 ├── May 2026
 ├── June 2026
 └── July 2026
```

Database relationship:
```
Project
   │
   ├── Snapshot 1
   ├── Snapshot 2
   ├── Snapshot 3
   └── Snapshot 4
```

A snapshot contains the project's state at that point in time.

---

## 10. Project Matching

The primary matching key is:
```
Project ID
```

Example:
```
April: P001
May:   P001
June:  P001
```
These are treated as the same project.

**Observed real churn:** across the real April–July 2026 data, month-to-month churn in the tracked project list is expected and routine, not an exceptional condition. April and May shared 1,940 of their combined roughly 1,970–1,987 projects; June to July saw up to 116 projects added or dropped between consecutive months. This typically reflects a project moving into or out of "Under Implementation" status in the source system. The matching logic should log adds/drops for review rather than flagging them as anomalies by default.

### New project
If a Project ID does not exist previously, the system creates a new project.

### Missing project
If a project existed previously but is absent from a later snapshot, its previous history is retained. The system should **not automatically assume that the project was cancelled or completed** unless the source data provides that information.

---

## 11. Database Design

Core tables:
```
users
projects
project_snapshots
risk_results
predictions
alerts
data_sources
column_mappings
benchmark_results
simulation_results
agency_sector_map
```

The `agency_sector_map` table is a new addition, needed to support the derived Sector field described in Sections 6–7, since sector is not present directly in the raw PAIMANA data.

---

## 12. Projects Table

```
projects
-------------------------
id
project_id
project_name
agency
state
sector
created_at
updated_at
```

`project_id` should be unique within the relevant organization/data source.

---

## 13. Project Snapshots Table

```
project_snapshots
-------------------------
id
project_id
snapshot_date
snapshot_label

start_date
original_end_date
revised_end_date

original_cost
revised_cost
expenditure

physical_progress

created_at
```

Example (real data):
```
400192 | April 2026 | 36.0% | ₹1581 Cr revised cost
400192 | May 2026   | 36.0% | ₹1581 Cr revised cost
400192 | June 2026  | 36.5% | ₹1581 Cr revised cost
400192 | July 2026  | 37.0% | ₹1581 Cr revised cost (Revised End Date pushed from 05/2026 to 12/2026)
```

---

## 14. Derived Feature Layer

Derived values should **not overwrite the original data**.

The system calculates additional features such as:
```
time_consumed_pct
schedule_drift
expenditure_pct
spend_progress_gap
cost_escalation_pct
progress_velocity
progress_change
time_remaining
pace_adjusted_completion
required_recovery_pace
recovery_gap
```

These can be stored in a separate analytics table or calculated when required. All of the above are now computable and have been validated against real data — for example, mean progress_velocity of +3.7 points over April–July 2026, with 32% of tracked projects showing flat or negative velocity over the same window.

---

## 15. Feature Engineering

### 15.1 Time Consumed
```
Time Consumed % = Elapsed Project Time / Total Planned Time × 100
```

### 15.2 Schedule Drift
```
Schedule Drift = Time Consumed % - Physical Progress %
```
Example: Time consumed = 70%, Progress = 45% → Schedule Drift = 25 percentage points. A large positive value indicates that time is being consumed faster than physical progress.

---

## 16. Spend–Progress Gap

```
Expenditure % = Expenditure / Revised Cost × 100
Spend–Progress Gap = Expenditure % - Physical Progress %
```
Example: Expenditure = 65%, Progress = 40% → Gap = 25 percentage points.

---

## 17. Cost Escalation

```
Cost Escalation % = (Revised Cost - Original Cost) / Original Cost × 100
```
Example: Original = ₹1000 Cr, Revised = ₹1250 Cr → Cost escalation = 25%.

---

## 18. Progress Velocity

When multiple snapshots exist (now confirmed available — four real monthly snapshots):
```
Progress Velocity = (Current Progress - Previous Progress) / Time Between Snapshots
```
Example: May = 40%, June = 44% → Progress velocity = 4 percentage points/month.

This allows the system to identify:
```
Improving
Stable
Slowing
Stagnating
```

Real-data validation: 32% of tracked projects (538 of 1,668) showed flat or negative velocity across April–July 2026.

---

## 19. Pace-Adjusted Completion Forecast

The system estimates completion based on the project's current pace.

Example: Elapsed time = 40 months, Progress = 50% → Estimated total duration = 40 / 0.50 = 80 months.

The estimated completion date can then be compared with the current target completion date. This is a **forecasting calculation**, not necessarily the ML prediction.

---

## 20. Recovery Gap

The system determines how quickly the project must progress to meet the target.

Example: Remaining work = 45%, Remaining time = 9 months → Required pace = 45/9 = 5%/month; Current pace = 2.8%/month → Recovery Gap = 5 - 2.8 = 2.2%/month.

This identifies projects that may require acceleration.

---

## 21. Current Risk Engine

Current risk should initially use transparent rules rather than ML.

Possible risk factors:
```
Schedule Drift
Spend–Progress Gap
Cost Escalation
Progress Velocity
Stagnation
Deadline Pressure
Recovery Gap
```

Each factor produces a normalized risk contribution. Example:
```
Schedule Drift       → High
Cost Escalation      → Medium
Progress Velocity    → High
Deadline Pressure    → High
```

The system combines these into LOW / MEDIUM / HIGH. Thresholds should be configurable and validated against the real April–July 2026 PAIMANA data distribution, rather than treated as universally correct.

---

## 22. Risk Explanation

For every risk result, the system stores the contributing factors.

Example:
```
HIGH RISK

Reasons:
• Schedule drift is high
• Progress has slowed
• Cost increased significantly
• Expenditure is ahead of physical progress
• Required recovery pace is above current pace
```

This makes the result understandable to users.

---

## 23. Future Risk Prediction

ML will be used for **future risk**, not simply for calculating the current risk score.

**Updated scope:** given only four real monthly snapshots are currently available, the system predicts a **near-term, observable event** rather than a long-horizon delay magnitude.

**Label construction method:**
1. For each project, take its indicators (schedule drift, spend-progress gap, cost escalation, progress velocity) computed from an earlier snapshot (e.g., April–June).
2. Check the project's later snapshot (e.g., July) for a real recorded outcome: did Revised_End_Date change, or did Revised_Cost increase, relative to the earlier snapshot?
3. Label = 1 if such a change occurred, 0 otherwise.
4. Train the candidate models (Logistic Regression baseline; XGBoost, LightGBM, Random Forest) on this feature/label table.

**Worked example from real data:** Project 400192 ("Tubed Coal Mine," Damodar Valley Corporation, Jharkhand) showed flat progress (36.0% → 36.0% → 36.5%) and rising expenditure (₹601 Cr → ₹617 Cr) across April–June, while its Revised_End_Date stayed at 05/2026 — then in July, the Revised_End_Date was pushed to 12/2026, a 7-month slip. This project is one positive-labeled training example: features from April–June, label = 1, since a revision event occurred in the following month.

**Known limitation:** with only one clean before/after transition window (June→July) currently available, the number of positive examples is limited (approximately 95 for cost-escalation events, 974 for date-revision events, out of 1,668 tracked projects). This is sufficient to demonstrate the pipeline end-to-end but not yet sufficient for production-grade reliability — this should be stated explicitly wherever model metrics are reported.

Possible prediction outputs:
```
Future Delay Risk (near-term revision risk)
        ↓
      82%
```

The system will clearly distinguish Current Risk (what is happening now) from Future Risk (what may happen next, in the near-term revision-event sense described above).

---

## 24. Statistical Baseline and ML Model

The system will compare conventional statistical approaches with machine-learning approaches, per PRD Section 16 — Logistic/Linear Regression as baseline, XGBoost/LightGBM/Random Forest as ML candidates, selected on measured performance using the training data constructed as described in Section 23 above.

---

## 25. Model Evaluation

Metrics: Precision, Recall, F1 Score, ROC-AUC, PR-AUC, Calibration, MAE/RMSE, Early-Warning Lead Time — as specified in PRD Section 17, interpreted cautiously given the current limited number of positive training examples.

---

## 26. Explainable AI

SHAP is applied on top of the winning ML model to produce per-project contributing-factor explanations, as specified in PRD Section 18. TreeSHAP is the specific SHAP variant applicable here, since it provides fast, exact attributions for the tree-ensemble models (XGBoost, LightGBM, Random Forest) used in this system.

---

## 27. Peer Benchmarking

Implements PRD Section 19. Comparison factors: sector (derived, per Sections 6–7 and 11), agency, state, project size, project stage. Presented as supporting context, not as proof of failure.

---

## 28. What-If / Intervention Simulator

Implements PRD Section 20. Recalculates pace-adjusted completion forecast and recovery gap under user-specified hypothetical changes (e.g., increased execution pace, additional delay, cost increase), and displays Current Situation vs. Scenario Situation.

---

## 29. Scenario Comparison

Implements PRD Section 21 — side-by-side comparison table of Current vs. multiple named scenarios across Progress, Delay, Cost Increase, and Projected Risk.

---

## 30. Data Sufficiency Analyzer

Implements PRD Section 22. Directly responsible for surfacing the current scoping limit: with only four months of history, long-horizon delay prediction is not yet supported; the system should state this explicitly (e.g., "insufficient historical snapshots for long-horizon forecasting; near-term revision-risk prediction available") rather than silently attempting an unreliable forecast. Also flags the absence of a native Sector field and other potential future variables (land acquisition status, clearances, contractor performance, utility shifting, litigation, milestone delays, payment delays).

---

## 31. Dashboard

Implements PRD Sections 23–24: Portfolio Summary (Total Projects, High/Medium/Low Risk, New Projects), Risk Indicators, and Project Filtering (Risk, State, Agency, Sector, Progress, Deadline, Cost Escalation, New Projects, Project ID/Name search).

---

## 32. Project Detail Page — Layout Flow

```
Project Information
        ↓
Current Status
        ↓
Risk Indicators
        ↓
Future Prediction (near-term revision risk)
        ↓
Risk Explanation
        ↓
Peer Benchmark
        ↓
Historical Timeline
        ↓
What-If Simulator
```

---

## 33. Historical Timeline

Example, using the real trajectory of Project 400192:
```
April
Progress: 36.0%
Expenditure: ₹601 Cr
Revised End Date: 05/2026
       ↓
May
Progress: 36.0%
Expenditure: ₹602 Cr
Revised End Date: 05/2026
       ↓
June
Progress: 36.5%
Expenditure: ₹617 Cr
Revised End Date: 05/2026
       ↓
July
Progress: 37.0%
Expenditure: ₹625 Cr
Revised End Date: 12/2026  ← slipped 7 months
```

This makes project deterioration or improvement visible using real, not illustrative, data.

---

## 34. Alert Engine

Alerts can be generated when:
```
Schedule drift increases
Progress stagnates
Cost escalation increases
Recovery gap increases
Future risk increases
Deadline approaches
```

Example:
> ⚠ Project 400192: Progress increased by only 1 percentage point over three snapshots (April–June) while expenditure rose by ₹16 Cr, ahead of the July revision that pushed the deadline back 7 months.

---

## 35. API Design

### Upload
```
POST /api/upload
```
### Validate
```
POST /api/upload/validate
```
### Column Mapping
```
POST /api/mapping
```
### Create Snapshot
```
POST /api/snapshots
```
### Projects
```
GET /api/projects
GET /api/projects/{project_id}
```
### Risk
```
GET /api/projects/{project_id}/risk
```
### Prediction
```
GET /api/projects/{project_id}/prediction
```
### History
```
GET /api/projects/{project_id}/history
```
### Benchmark
```
GET /api/projects/{project_id}/benchmark
```
### Simulator
```
POST /api/projects/{project_id}/simulate
```
### Dashboard
```
GET /api/dashboard/summary
```

---

## 36. Example Prediction API Response

Updated field names to reflect the near-term prediction scope:

```json
{
  "project_id": "400192",
  "current_risk": "HIGH",
  "next_cycle_revision_risk": 0.78,
  "cost_revision_risk": 0.64,
  "factors": [
    "High schedule drift",
    "Low progress velocity",
    "High recovery gap"
  ]
}
```

(renamed from `delay_probability` / `estimated_delay_months` to `next_cycle_revision_risk`, reflecting the actual, currently supportable prediction target given four months of real data)

---

## 37. Security Architecture

The system should implement:
```
User Authentication
Role-Based Access
Secure File Upload
File Type Validation
Input Validation
SQL Injection Protection
Password Hashing
HTTPS
Database Access Control
Organization-Level Data Isolation
```

For private companies, uploaded project data should only be accessible to authorized users from that organization.

---

## 38. Processing Flow

```
User uploads Excel/CSV
        ↓
File Validation
        ↓
Column Mapping
        ↓
Data Cleaning
        ↓
Create Snapshot
        ↓
Match Project IDs
        ↓
Store Raw/Normalized Data
        ↓
Feature Engineering
        ↓
Current Risk Engine
        ↓
ML Prediction
        ↓
Explainability
        ↓
Peer Benchmarking
        ↓
Dashboard
        ↓
Alerts
        ↓
What-If Simulation
```

---

## 39. Important Separation of Responsibilities

The system should keep these components separate:
```
RAW DATA
   ↓
NORMALIZED DATA
   ↓
DERIVED FEATURES
   ↓
CURRENT RISK ENGINE
   ↓
ML PREDICTION
   ↓
EXPLANATION
```

This is important because a risk score should never overwrite the organization's original data.

---

## 40. MVP Implementation

### Phase 1 — Data
Excel/CSV upload, column mapping (including sector derivation from Agency), validation (including placeholder-value checks), snapshot creation, project matching.

### Phase 2 — Analytics
Schedule drift, spend–progress gap, cost escalation, progress velocity, pace-adjusted completion, recovery gap.

### Phase 3 — Risk
Current risk engine, risk explanations, dashboard.

### Phase 4 — ML
Historical dataset preparation — specifically, pairing each project's early-month feature values with a later month's real recorded outcome (Revised End Date change or Revised Cost increase), as demonstrated using the real April–July 2026 PAIMANA panel — followed by baseline model, advanced ML model, near-term revision-risk prediction, and model evaluation.

### Phase 5 — Advanced Features
Peer benchmarking, What-If simulator, Data Sufficiency Analyzer, historical monitoring, alerts.

### Phase 6 — Optional
LLM assistant.

---

## 41. Optional LLM Assistant Architecture

The LLM should sit **on top of the existing system**, not replace the analytical engine.

```
User Question
      ↓
LLM Assistant
      ↓
Query existing APIs/data
      ↓
Risk / Project / History results
      ↓
LLM explains result
```

Examples:
> "Why is Project 400192 high risk?"
> "Show projects with high schedule drift."
> "Summarize the history of Project 400192."

The LLM should not independently decide the project's risk.

---

## 42. Deployment Architecture

For the prototype:
```
                  Internet
                     │
                     ▼
              React Frontend
                     │
                     ▼
               FastAPI Backend
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
     PostgreSQL              ML Models
```

Docker can be used to package the Frontend container, Backend container, and Database container.

---

## 43. Key Technical Innovation

The system is not simply:
```
Excel → Dashboard
```

It is:
```
Excel/CSV
    ↓
Historical Project Timeline (now real, 4 months deep)
    ↓
Drift Detection
    ↓
Current Risk
    ↓
Near-Term Revision-Risk Prediction
    ↓
Explain Why
    ↓
Compare With Peers
    ↓
Simulate Interventions
    ↓
Early Warning
```

The strongest technical idea is that the platform moves from **static project monitoring to continuous, explainable, predictive project monitoring**, now demonstrably grounded in real PAIMANA data rather than a hypothetical example.

---

## 44. Final Technical Flow

```
Excel/CSV Data → Validation & Column Mapping → Snapshot Management
→ Project History → Feature Engineering → [Current Risk Detection | Future ML Prediction]
→ Explainability → Peer Benchmark → What-If/Intervention → Dashboard + Early Warnings
```