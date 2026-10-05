"""
FoodShield - Dynamic Compliance Scoring Engine
Calculates transparent, real-time compliance score for restaurants based on verified inputs across:
1. Hygiene & Daily Checklists (25%)
2. Stock Traceability & Expiry Management (20%)
3. Regulatory & Safety Documentation (20%)
4. Pest Control Currency (15%)
5. Staff Food Safety Certification (10%)
6. Corrective Actions & Inspection History (10%)
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List

def calculate_restaurant_compliance(
    hygiene_completion_rate: float, # 0.0 to 100.0%
    expired_stock_count: int,
    total_stock_count: int,
    valid_docs_count: int,
    total_required_docs: int,
    days_since_pest_control: int,
    pest_control_frequency_days: int,
    certified_staff_ratio: float, # 0.0 to 1.0
    pending_corrective_actions: int,
    overdue_corrective_actions: int
) -> Dict[str, Any]:
    """
    Computes weighted compliance metrics and generates human-readable alerts.
    """
    # 1. Hygiene Sub-Score (Max 25 points)
    hygiene_sub = min(25.0, (hygiene_completion_rate / 100.0) * 25.0)

    # 2. Stock Freshness & Traceability (Max 20 points)
    if total_stock_count == 0:
        stock_sub = 15.0 # Neutral baseline
    else:
        fresh_ratio = max(0.0, (total_stock_count - expired_stock_count) / total_stock_count)
        stock_sub = fresh_ratio * 20.0

    # 3. Compliance Documentation (Max 20 points)
    if total_required_docs == 0:
        doc_sub = 20.0
    else:
        doc_ratio = min(1.0, valid_docs_count / max(1, total_required_docs))
        doc_sub = doc_ratio * 20.0

    # 4. Pest Control Currency (Max 15 points)
    if days_since_pest_control <= pest_control_frequency_days:
        pest_sub = 15.0
    elif days_since_pest_control <= (pest_control_frequency_days + 14):
        pest_sub = 9.0 # Grace period warning
    else:
        pest_sub = 3.0 # Overdue penalty

    # 5. Staff Certification & Training (Max 10 points)
    staff_sub = min(10.0, certified_staff_ratio * 10.0)

    # 6. Corrective Actions Penalty (Max 10 points baseline)
    corrective_sub = 10.0
    corrective_sub -= (pending_corrective_actions * 2.0)
    corrective_sub -= (overdue_corrective_actions * 4.0)
    corrective_sub = max(0.0, corrective_sub)

    # Total Score Calculation
    total_score = round(hygiene_sub + stock_sub + doc_sub + pest_sub + staff_sub + corrective_sub, 1)
    total_score = min(100.0, max(0.0, total_score))

    # Rating Tier
    if total_score >= 88.0:
        grade = "Excellent"
        status_label = "🟢 Compliant"
        risk_level = "Low Risk"
    elif total_score >= 70.0:
        grade = "Good / Attention Required"
        status_label = "🟡 Attention Required"
        risk_level = "Moderate Risk"
    else:
        grade = "Non-Compliant"
        status_label = "🔴 Action Required"
        risk_level = "High Risk"

    # Actionable Alerts Generation
    alerts: List[Dict[str, str]] = []
    if expired_stock_count > 0:
        alerts.append({
            "type": "error",
            "title": "Expired Stock Detected",
            "message": f"{expired_stock_count} item(s) have passed their safe consumption date. Immediate disposal required."
        })
    if days_since_pest_control > pest_control_frequency_days:
        alerts.append({
            "type": "warning",
            "title": "Pest Control Overdue",
            "message": f"Last treatment was {days_since_pest_control} days ago. Mandatory service is due."
        })
    if overdue_corrective_actions > 0:
        alerts.append({
            "type": "error",
            "title": "Overdue Inspection Corrective Action",
            "message": f"{overdue_corrective_actions} inspector findings past resolution deadline."
        })
    if (total_required_docs - valid_docs_count) > 0:
        alerts.append({
            "type": "warning",
            "title": "Regulatory Renewal Required",
            "message": f"{total_required_docs - valid_docs_count} statutory compliance certificates require immediate renewal."
        })

    return {
        "overall_score": total_score,
        "grade": grade,
        "status_label": status_label,
        "risk_level": risk_level,
        "breakdown": {
            "hygiene": round(hygiene_sub, 1),
            "stock_traceability": round(stock_sub, 1),
            "documentation": round(doc_sub, 1),
            "pest_control": round(pest_sub, 1),
            "staff_training": round(staff_sub, 1),
            "corrective_actions": round(corrective_sub, 1)
        },
        "alerts": alerts
    }
