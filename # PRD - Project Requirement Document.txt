
# PRD - Project Requirement Document 

## 1. Project Overview

**Infrastructure Project Risk Monitoring** is an AI-powered infrastructure project monitoring system that helps identify projects that are drifting toward delays or cost problems.

The system will:
> **Detect → Predict → Explain → Simulate → Monitor**

It uses **PAIMANA data** (Ministry of Statistics & Programme Implementation's infrastructure monitoring dataset) as its initial and primary data source, and will also support data from private organizations through **Excel and CSV uploads**.

For the current prototype, four real monthly PAIMANA snapshots are available — **April, May, June, and July 2026** — covering approximately 1,700–2,000 Central Sector infrastructure projects per month, with **1,668 projects common across all four months**.

---

## 2. Objective

The system aims to:
- Monitor infrastructure projects
- Detect early warning signs
- Identify schedule and cost problems
- Track project progress over time
- Predict future project risks
- Explain why a project is becoming risky
- Compare projects with similar projects
- Simulate **What-If** scenarios
- Help monitoring teams decide which projects need attention

---

## 3. Target Users

### Primary Users
- Government monitoring authorities
- Ministries and agencies
- Infrastructure project managers
- Project monitoring teams

### Future Users
- Private infrastructure companies
- Construction companies
- Large project management organizations

---

## 4. Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React + Vite |
| Backend | Python FastAPI |
| Database | PostgreSQL |
| Data Processing | Pandas + NumPy |
| Machine Learning | Scikit-learn + XGBoost/LightGBM |
| Explainability | SHAP |
| Charts | Recharts / ECharts |
| Deployment | Docker |
| Optional Assistant | LLM |

---

## 5. Data Input

The system accepts:
- Excel files (.xlsx)
- CSV files

Each uploaded file represents a **project snapshot**, defined by the reporting period the organization chooses:
- Month-wise
- Quarter-wise
- Year-wise
- Custom date

**Current prototype data:** Four monthly PAIMANA snapshots — April, May, June, July 2026 — each with approximately 1,700–2,000 projects and 12 fields: Project ID, Project Name, Agency, State, Original Start Date, Revised Start Date, Original End Date, Revised End Date, Original Cost, Revised Cost, Cumulative Expenditure, and Physical Progress %. This real 4-month panel is what makes month-over-month features (Section 11) computable for the prototype, rather than relying on a single hypothetical snapshot.

---

## 6. Flexible Data Mapping

Different organizations may use different column names.

For example:
```
Project Code      → Project ID
Progress %        → Physical Progress
Revised Amount    → Revised Cost
Amount Spent      → Expenditure
```

The user can map their uploaded columns to the system's standard fields. This allows the platform to work with **PAIMANA as well as private-company data**.

---

## 7. Data Cleaning and Validation

Before analysis, the system will:
- Check missing values
- Remove duplicate records
- Standardize dates
- Standardize numerical formats
- Check invalid progress values
- Check invalid costs
- Check duplicate Project IDs
- Validate required fields
- **Check for placeholder/dummy values in date fields** (e.g., a literal "-" character instead of a true blank) — real PAIMANA extracts contain these, and a simple null-check will not catch them
- Show data-quality errors to the user

The original uploaded data will remain unchanged.

---

## 8. Project History and Snapshots

Every uploaded snapshot is stored separately.

The system will maintain:
```
Project
   │
   ├── April Snapshot
   ├── May Snapshot
   ├── June Snapshot
   └── July Snapshot
```

Historical snapshots will **not overwrite each other**. This allows the system to understand how a project changes over time.

---

## 9. Project Matching

Projects appearing in different snapshots will be matched using their **Project ID**.

The system will identify:
- Existing projects
- Newly added projects
- Projects missing from the latest snapshot

Based on real PAIMANA data across April–July 2026, month-to-month churn in the tracked project list is expected and routine, not a rare edge case — for example, April and May shared 1,940 of their combined projects while each month independently listed roughly 1,970–1,987, and June to July saw as many as 116 projects added or dropped between the two months. This typically reflects a project moving into or out of "Under Implementation" status in the source system.

New projects will be added to the system rather than being ignored. Historical records will remain available even when a project disappears from a later ongoing-project snapshot. The system should **not automatically assume that the project was cancelled or completed** unless the source data provides that information.

---

## 10. Standard Project Data

The system will work with fields such as:
- Project ID
- Project Name
- Agency
- State
- Sector/category
- Start Date
- Original End Date
- Revised End Date
- Original Cost
- Revised Cost
- Expenditure
- Physical Progress %

**Note on Sector/Category:** the raw PAIMANA extract does **not** include an explicit Sector/Category field — only Agency and State are directly present. Sector must therefore be derived from the Agency name (e.g., "Airport Authority of India" → Aviation, "Damodar Valley Corporation" → Power/Mining) via a lookup table, or supplied through manual mapping, before it can be used for peer benchmarking (Section 19).

Additional fields can be added for organizations with different requirements.

---

## 11. Feature Engineering and Drift Analysis

The system will calculate useful indicators from the raw data.

### Schedule Drift
Compares the amount of project time consumed with physical progress.
```
Time consumed = 70%
Progress = 45%
Schedule Drift = +25%
```

### Spend–Progress Gap
Compares financial expenditure with physical progress.
```
Expenditure = 65%
Progress = 40%
Gap = +25%
```

### Cost Escalation
Compares original and revised project cost.
```
Original Cost = ₹1,000 Cr
Revised Cost = ₹1,250 Cr
Cost Escalation = 25%
```

### Progress Velocity
With four real monthly snapshots now available, this is computed using **actual month-over-month change** in physical progress, not an assumption of future availability.

Example, drawn from real project data:
```
April → 40%
May   → 43%
June  → 44%
July  → 45%
```

Across the real April–July 2026 dataset, the average change was +3.7 progress points over the four-month window, but **32% of tracked projects (538 of 1,668) showed flat or negative progress** over the same period — a real, usable stagnation signal for the risk engine and early-warning alerts.

This can indicate slowing or stagnating progress.

---

## 12. Pace-Adjusted Completion Forecast

The system will estimate completion based on the project's current progress pace.

For example:
```
Time elapsed = 40 months
Progress = 50%
Estimated duration ≈ 40 / 0.50 = 80 months
```

The estimated completion is then compared with the current planned/revised completion date. This provides a transparent baseline forecast.

---

## 13. Recovery Gap

The system will calculate how much additional progress may be required to meet the current completion target.

Example:
```
Remaining work = 45%
Remaining time = 9 months
Required pace = 45 / 9 = 5% per month
Current pace = 2.8% per month
Recovery Gap = 2.2% per month
```

This answers: **How much faster does the project need to progress to meet the current target?**

---

## 14. Current Risk Detection

The system will identify current warning signals such as:
- Schedule drift
- Cost escalation
- Low progress
- Progress stagnation
- Spend–progress gap
- Deadline pressure
- Recovery gap

The system can combine these indicators into an overall risk level:
```
Low
Medium
High
```

The exact thresholds will be determined and validated using the real PAIMANA data distribution (April–July 2026) rather than assumed generically.

---

## 15. Future Risk Prediction

The system will use historical snapshots to predict future risks **when a defined, observable outcome exists in the data**.

With only four monthly snapshots currently available, a full long-horizon forecast (e.g., "will finish 7 months late") is not yet reliably supportable — very few projects have reached a clean, long-term completion outcome within this window (only 61 of 1,775 projects reached 100% progress by July 2026).

For the current prototype, **Future Risk is therefore defined as a near-term, observable event**, drawn directly from real data rather than an idealized delay-magnitude forecast:
- Did the project's **Revised End Date change** (a recorded schedule slip) in the following month? Across the real dataset, 974 of 1,668 tracked projects showed at least one such change over the 4-month window.
- Did the project's **Revised Cost increase** (a recorded cost re-baselining) in the following month? 95 of 1,668 projects showed this.

This will be presented to users as **"Risk of schedule/cost revision in the next reporting cycle,"** not as a delay-magnitude forecast such as "will finish X months late." Long-horizon delay-magnitude prediction remains a stated future goal, gated on accumulating more monthly snapshots over time (see Section 22, Data Sufficiency Analyzer).

The system will clearly distinguish:

**Current Risk** — What is happening now?
**Future Risk** — What may happen next (in the near-term, revision-event sense described above)?

---

## 16. Statistical Baseline and ML Model

The system will compare conventional statistical approaches with machine-learning approaches.

### Statistical Baseline
- Logistic Regression
- Linear Regression

### ML Models
- XGBoost
- LightGBM
- Random Forest

**Training data construction:** each training example is built by taking a project's indicators (schedule drift, spend-progress gap, cost escalation, progress velocity) from an earlier month's snapshot, and labeling that example using whether a real, observable event — a Revised End Date change or a Revised Cost increase, as defined in Section 15 — occurred in a later month's snapshot for the same project. This is a concrete, data-grounded construction process, demonstrated on real PAIMANA data (e.g., Project 400192, "Tubed Coal Mine," showed flat progress and rising expenditure across April–June, followed by a 7-month deadline push recorded in July — one real positive training example).

The final model will be selected based on actual measured performance rather than assuming that a more complex model is automatically better.

---

## 17. Model Evaluation

The system will evaluate prediction quality using appropriate metrics such as:
- Precision
- Recall
- F1 Score
- ROC-AUC
- PR-AUC
- Calibration
- MAE/RMSE for numeric predictions
- **Early-warning lead time**

Given the current 4-month data window, the number of positive examples available for training is limited (approximately 95 cost-escalation events and 974 date-revision events out of 1,668 tracked projects, using only one clean before/after transition). Reported metrics at this stage should be understood as demonstrating that the end-to-end pipeline works correctly, not as production-grade accuracy — reliability is expected to improve materially as more monthly snapshots accumulate.

### Early-Warning Lead Time
The system will measure: **How early was a future problem identified?**
```
Actual problem:       December
Warning generated:    April
Early warning lead time: 8 months
```

---

## 18. Explainable AI

The system will explain why a project has been identified as risky.

Example:
```
Project Risk: HIGH

Main contributing factors:
• High schedule drift
• Slow progress
• Large spend–progress gap
• Cost escalation
• High deadline pressure
```

SHAP or similar explainability methods will be used for ML predictions. The objective is to make the model's output understandable rather than simply displaying a risk number.

---

## 19. Peer Benchmarking

Projects can be compared with similar projects.

Possible comparison factors include:
- Sector/category (derived from Agency per Section 10, since it is not present directly in the raw PAIMANA extract)
- Project size
- Project stage
- State/geography
- Agency

Example:
> Project progress is below the typical progress of similar projects.

The system will show the comparison as supporting context, not as proof that a project is failing.

---

## 20. What-If / Intervention Simulator

This is one of the main innovative features. Users can change selected project conditions and see the modeled effect.

### Example
```
Current progress: 50%
What if progress improves by 10%?
             ↓
         Simulate
             ↓
Projected completion
Projected risk
```

Other scenarios may include:
- Increase execution pace
- Additional project delay
- Additional cost increase
- Change in expenditure pace
- Timeline adjustment

The simulator will show the difference between Current Situation and Scenario Situation.

---

## 21. Scenario Comparison

Users can compare multiple scenarios.

Example:

| Indicator | Current | Scenario A | Scenario B |
| --- | --- | --- | --- |
| Progress | 50% | 60% | 55% |
| Delay | 0 months | +3 months | +6 months |
| Cost Increase | 0% | +5% | +15% |
| Projected Risk | High | Medium | High |

This allows users to explore possible outcomes before taking action.

---

## 22. Data Sufficiency Analyzer

The system will also examine whether the available project data is sufficient for reliable prediction. It can identify:
- Missing important variables
- Insufficient historical snapshots
- Limited project outcomes
- Fields with excessive missing values
- Data required for improved prediction

This module is directly responsible for the current scoping limit described in Section 15: with only four months of history, long-horizon delay prediction is not yet supported, and the system should surface this explicitly to users (e.g., "insufficient historical snapshots for long-horizon forecasting; near-term revision-risk prediction is available") rather than silently attempting an unreliable forecast.

Potential future variables may include:
- Land acquisition status
- Clearances
- Contractor performance
- Utility shifting
- Litigation
- Milestone delays
- Payment delays

These variables will only be used if reliable data becomes available.

---

## 23. Dashboard

The main dashboard will show:

### Portfolio Summary
```
Total Projects
High Risk
Medium Risk
Low Risk
New Projects
```

### Risk Indicators
- Projects with high schedule drift
- Projects with major cost escalation
- Projects with stagnating progress
- Projects approaching deadlines
- Projects requiring review

---

## 24. Project Filtering

Users can filter projects by:
- Risk level
- State
- Agency
- Sector/category
- Progress
- Deadline
- Cost escalation
- New projects
- Projects requiring attention

Users can also search by project name or Project ID.

---

## 25. Project Detail Page

Each project will have a dedicated page showing:

### Project Information
Project name, Project ID, Agency, State, Sector.

### Current Status
Physical progress, Expenditure, Original cost, Revised cost, Completion date.

### Risk Indicators
Schedule drift, Spend–progress gap, Cost escalation, Recovery gap, Progress trend.

### Prediction
Near-term revision risk (schedule and/or cost), as defined in Section 15.

### Explanation
Main risk drivers (via SHAP).

### History
```
April → Risk
May   → Risk
June  → Risk
July  → Risk
```

### What-If
Users can run scenarios for the selected project.

---

## 26. Early-Warning Alerts

The system will highlight projects requiring attention.

Examples:
```
⚠ Schedule drift increasing
⚠ Progress stagnating
⚠ Cost escalation detected
⚠ Recovery gap increasing
⚠ Future delay risk increasing
```

The initial prototype can display these alerts inside the dashboard. External email/SMS alerts can be added later.

---

## 27. Optional LLM Assistant

An LLM assistant can provide natural-language explanations of the analytical results.

For example:
> "Why is this project high risk?"
> "Show projects with high schedule drift."
> "Summarize the history of this project."

The LLM will **not independently calculate the core risk score or make autonomous decisions**. It will work as an interface to the existing analytical results.

---

## 28. Private Sector Adaptability

Although PAIMANA is the initial and primary data source, the system will not be permanently tied to it.

A private company can:
```
Upload Excel/CSV → Map Columns → Create Snapshot → Store Project History → Analyze Projects
```

Therefore, the same platform can be adapted for different organizations and project datasets.

---

## 29. Security

The system will provide:
- User authentication
- Role-based access
- Secure file uploads
- Input validation
- Secure database access
- Protected project data
- HTTPS in production

Private-company project data should only be accessible to authorized users.

---

## 30. MVP Deliverables

The first working prototype should include:

### Data
Excel/CSV upload, column mapping (including sector derivation from Agency), data cleaning (including placeholder-value checks), data validation, snapshot management, project matching, historical storage.

### Analytics
Schedule drift, spend–progress gap, cost escalation, progress velocity, pace-adjusted completion forecast, recovery gap, current risk level, peer benchmarking.

### AI/ML
Statistical baseline, ML prediction model for near-term revision risk (per Section 15/16), future-risk prediction, model evaluation, explainability.

### Decision Support
What-If simulator, scenario comparison, early-warning indicators, data sufficiency analysis.

### Dashboard
Portfolio overview, risk distribution, project filtering, project details, historical timeline.

---

## 31. Future Enhancements

- Automatic API-based data ingestion
- Automated data updates
- Additional project information sources
- **Long-horizon delay/cost-overrun magnitude prediction, once sufficient monthly snapshots accumulate**
- Milestone-level prediction
- Text extraction from project reports
- Geospatial risk analysis
- Automated model retraining
- Model drift monitoring
- Email/SMS alerts
- Advanced intervention optimization
- Natural-language portfolio queries

---

## 32. Overall System Flow

```
             EXCEL / CSV
                  │
                  ▼
          DATA MAPPING
                  │
                  ▼
       CLEANING & VALIDATION
                  │
                  ▼
        SNAPSHOT MANAGEMENT
                  │
                  ▼
        PROJECT ID MATCHING
                  │
                  ▼
         PROJECT HISTORY
                  │
                  ▼
      FEATURE ENGINEERING
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
 CURRENT RISK          HISTORICAL DATA
        │                   │
        │                   ▼
        │             ML PREDICTION
        │                   │
        └─────────┬─────────┘
                  ▼
          EXPLAINABLE RISK
                  │
                  ▼
          PEER BENCHMARKING
                  │
                  ▼
        WHAT-IF SIMULATION
                  │
                  ▼
         EARLY-WARNING UI
                  │
                  ▼
             DASHBOARD
```

---

## 33. Key Innovation

The system is not simply an AI dashboard that gives a risk score. It combines:

**1. Drift Detection** — Find where projects are moving away from expected progress, now validated against real, multi-month PAIMANA data.

**2. Predictive Analytics** — Estimate near-term revision risk using historical project data, with a scope that honestly reflects available history (Section 15).

**3. Explainable AI** — Show the factors contributing to the prediction.

**4. Peer Benchmarking** — Compare projects with relevant similar projects.

**5. Intervention Simulation** — Test what may happen if project conditions change.

**6. Data Sufficiency Analysis** — Determine whether the available data is enough for reliable prediction and identify potentially useful additional variables.

**7. Historical Monitoring** — Maintain project-by-project snapshots, now genuinely populated with four real consecutive months of PAIMANA data.

**8. Flexible Deployment** — Allow the same system to work with PAIMANA data or uploaded private-sector project data.

---

## 34. Final Product Vision

The system should answer five questions:

> **What is happening?** — Current project status and drift.
> **Why is it happening?** — Risk factors and explainable drivers.
> **What may happen next?** — Near-term revision-risk prediction.
> **How does this project compare?** — Peer benchmarking.
> **What if we change something?** — What-If / intervention simulation.

---
---

