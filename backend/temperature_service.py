"""
FoodShield — Cold-Chain Telemetry, Predictive Spoilage & Incident Escalation Engine
Challenge 2: Real-time temperature evaluation, degree-hour thermal abuse kinetics,
predictive shelf-life decay, and 3-tier automated incident escalation workflow.
"""

from datetime import datetime, timedelta
import math
import random
from typing import Dict, Any, List, Optional, Tuple

# Statutory FSSAI Safe Operating Ranges (°C)
STORAGE_STANDARDS: Dict[str, Dict[str, Any]] = {
    "walk_in_chiller": {
        "display_name": "Walk-in Dairy & Cold Chiller",
        "min_temp": 0.5,
        "max_temp": 4.0,
        "target_temp": 2.5,
        "target_humidity": 75.0,
        "high_risk_threshold": 8.0,
        "description": "FSSAI Mandatory Cold Chain for Dairy, Paneer, Cut Fruits & Deli."
    },
    "deep_freezer": {
        "display_name": "Deep Meat & Seafood Freezer",
        "min_temp": -22.0,
        "max_temp": -18.0,
        "target_temp": -20.0,
        "target_humidity": 60.0,
        "high_risk_threshold": -12.0,
        "description": "Frozen Poultry, Meat, Butter & Ice Cream Cold Chain Storage."
    },
    "prep_refrigerator": {
        "display_name": "Kitchen Line Prep Refrigerator",
        "min_temp": 1.0,
        "max_temp": 5.0,
        "target_temp": 3.5,
        "target_humidity": 70.0,
        "high_risk_threshold": 9.0,
        "description": "Active Chef Line Cooked Base Gravies, Marinated Meats & Cheeses."
    },
    "display_counter": {
        "display_name": "Salad & Dessert Display Counter",
        "min_temp": 2.0,
        "max_temp": 6.0,
        "target_temp": 4.0,
        "target_humidity": 65.0,
        "high_risk_threshold": 10.0,
        "description": "Customer-facing Chilled Bakery, Desserts & Fresh Salad Bar."
    },
    "hot_holding": {
        "display_name": "Hot Holding Service Station",
        "min_temp": 63.0,
        "max_temp": 85.0,
        "target_temp": 68.0,
        "target_humidity": 40.0,
        "high_risk_threshold": 58.0,
        "description": "FSSAI Cooked Hot Buffet, Rice & Curries holding standard."
    }
}

# Category Spoilage Sensitivity Multipliers (higher = faster degradation under thermal abuse)
CATEGORY_SENSITIVITY: Dict[str, float] = {
    "dairy": 1.45,
    "meat": 1.50,
    "seafood": 1.60,
    "vegetables": 0.90,
    "cooking oil": 0.30,
    "dry grains": 0.20,
    "spices": 0.15,
    "default": 1.00
}


def evaluate_temperature(
    min_temp: float,
    max_temp: float,
    current_temp: float,
    is_hot_holding: bool = False
) -> Tuple[str, bool, str]:
    """
    Evaluates temperature against safe statutory boundaries.
    Returns: (status, is_breach, narrative)
    status: 'normal' | 'warning' | 'critical_breach'
    """
    if is_hot_holding:
        # Hot holding must stay ABOVE min_temp (e.g. >= 63°C)
        if current_temp < min_temp:
            return (
                "critical_breach",
                True,
                f"Critical Fall Below Hot-Holding Safety Standard ({current_temp:.1f}°C < {min_temp:.1f}°C). Rapid bacterial incubation risk."
            )
        elif current_temp < (min_temp + 3.0):
            return (
                "warning",
                False,
                f"Hot Holding temperature hovering near statutory threshold ({current_temp:.1f}°C)."
            )
        return ("normal", False, "Normal hot holding thermal range maintained.")

    # Cold chain: must stay BELOW max_temp (e.g. <= 4.0°C) and above freeze limit if applicable
    if current_temp > max_temp:
        severity = "Severe" if (current_temp - max_temp) >= 4.0 else "Critical"
        return (
            "critical_breach",
            True,
            f"{severity} Cold-Chain Excursion: {current_temp:.1f}°C exceeds safe statutory maximum ({max_temp:.1f}°C)."
        )
    elif current_temp < (min_temp - 4.0) and min_temp > -10.0:
        # Unintended freezing in chiller
        return (
            "warning",
            False,
            f"Sub-zero chill detected ({current_temp:.1f}°C); risk of ice crystallization & texture damage."
        )
    elif current_temp >= (max_temp - 0.8):
        return (
            "warning",
            False,
            f"Temperature elevated near threshold ({current_temp:.1f}°C / max {max_temp:.1f}°C). Compressor under load."
        )

    return ("normal", False, "Storage temperature fully compliant within statutory parameters.")


def calculate_degree_hours_abuse(
    telemetry_logs: List[Dict[str, Any]],
    max_safe_temp: float
) -> float:
    """
    Calculates cumulative Degree-Hours of thermal abuse from time-series logs:
    Degree-Hours = sum(max(0, T_i - T_safe) * delta_t_hours)
    """
    if not telemetry_logs or len(telemetry_logs) < 2:
        return 0.0

    # Ensure sorted by timestamp ascending
    sorted_logs = sorted(telemetry_logs, key=lambda x: x.get("recorded_at") or datetime.utcnow())
    total_degree_hours = 0.0

    for i in range(1, len(sorted_logs)):
        prev = sorted_logs[i - 1]
        curr = sorted_logs[i]

        prev_time = prev.get("recorded_at")
        curr_time = curr.get("recorded_at")
        if not isinstance(prev_time, datetime) or not isinstance(curr_time, datetime):
            continue

        delta_hours = max(0.0, (curr_time - prev_time).total_seconds() / 3600.0)
        # Cap delta to 6 hours max per reading interval to avoid skew from outages
        delta_hours = min(6.0, delta_hours)

        avg_temp = (prev.get("temperature", 0.0) + curr.get("temperature", 0.0)) / 2.0
        excursion = max(0.0, avg_temp - max_safe_temp)

        total_degree_hours += excursion * delta_hours

    return round(total_degree_hours, 2)


def predict_spoilage_risk(
    batch_number: str,
    item_name: str,
    category: str,
    nominal_expiry: datetime,
    current_unit_temp: float,
    max_safe_temp: float,
    cumulative_degree_hours: float,
    current_time: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Predictive Spoilage Risk Model:
    Combines Q10 microbial kinetics, degree-hour thermal abuse, and calendar expiry
    to project accelerated shelf-life decay and remaining safe consumption hours.
    """
    now = current_time or datetime.utcnow()
    hours_to_calendar_expiry = max(0.0, (nominal_expiry - now).total_seconds() / 3600.0)

    # Food category biological sensitivity coefficient
    cat_key = category.strip().lower()
    sensitivity = CATEGORY_SENSITIVITY.get(cat_key, CATEGORY_SENSITIVITY["default"])

    # Delta above safe limit
    temp_excess = max(0.0, current_unit_temp - max_safe_temp)

    # Q10 kinetic acceleration: bacterial growth roughly doubles every 2.8°C above safe cold chain
    if temp_excess > 0:
        thermal_growth_factor = math.pow(2.0, temp_excess / 2.8) * sensitivity
    else:
        thermal_growth_factor = 1.0

    # Impact of historical thermal abuse (degree-hours)
    # 10 degree-hours reduces nominal perishable shelf life significantly
    abuse_penalty_hours = cumulative_degree_hours * 4.5 * sensitivity

    # Effective remaining shelf life
    effective_hours_remaining = max(0.0, (hours_to_calendar_expiry - abuse_penalty_hours) / thermal_growth_factor)

    # Percentage degradation
    if hours_to_calendar_expiry > 0:
        degradation_pct = min(100.0, max(0.0, (1.0 - (effective_hours_remaining / hours_to_calendar_expiry)) * 100.0))
    else:
        degradation_pct = 100.0

    # Determine risk tier & recommended action
    if degradation_pct >= 80.0 or effective_hours_remaining <= 6.0:
        risk_level = "Critical / Unsafe"
        action = "Mandatory Quarantine: High bacterial proliferation suspected. Immediate disposal protocol required."
        badge = "badge-danger"
    elif degradation_pct >= 40.0 or effective_hours_remaining <= 24.0:
        risk_level = "Warning"
        action = "Accelerated Usage: Cook or serve within 12 hours. Sensory inspection mandatory before prep."
        badge = "badge-warning"
    else:
        risk_level = "Safe"
        action = "Standard cold storage integrity maintained. Safe for normal recipe allocation."
        badge = "badge-compliant"

    return {
        "batch_number": batch_number,
        "item_name": item_name,
        "category": category,
        "current_temp": round(current_unit_temp, 1),
        "max_safe_temp": round(max_safe_temp, 1),
        "nominal_expiry": nominal_expiry.strftime("%Y-%m-%d %H:%M"),
        "cumulative_degree_hours": round(cumulative_degree_hours, 2),
        "degradation_pct": round(degradation_pct, 1),
        "predicted_safe_hours_remaining": round(effective_hours_remaining, 1),
        "risk_level": risk_level,
        "badge_class": badge,
        "recommended_action": action
    }


def advance_escalation_lifecycle(
    detected_at: datetime,
    breach_temp: float,
    max_safe_temp: float,
    is_acknowledged: bool,
    current_time: Optional[datetime] = None
) -> Tuple[int, str, str]:
    """
    Automated 3-Tier Incident Escalation progression:
    - Level 1: Shift Kitchen Alert (0 to 1 hour unacknowledged)
    - Level 2: Store Manager Escalation (1 to 3 hours unacknowledged)
    - Level 3: Food Safety Officer Non-Compliance Notice (>3 hours or delta >= 5.0°C)
    Returns: (escalation_level, status_label, notification_channel)
    """
    if is_acknowledged:
        return (
            0,
            "resolved_acknowledged",
            "Breach acknowledged and corrective action logged by kitchen personnel."
        )

    now = current_time or datetime.utcnow()
    elapsed_hours = max(0.0, (now - detected_at).total_seconds() / 3600.0)
    delta_excursion = breach_temp - max_safe_temp

    # Severe acute breach (> 5°C excursion) immediately elevates to Level 2 or 3
    if elapsed_hours >= 3.0 or delta_excursion >= 6.0:
        return (
            3,
            "level_3_officer_escalated",
            "🔴 Level 3 Escalation: Unresolved critical cold-chain breach queued for Government Food-Safety Officer statutory inspection."
        )
    elif elapsed_hours >= 1.0 or delta_excursion >= 3.5:
        return (
            2,
            "level_2_manager_escalated",
            "🟡 Level 2 Escalation: Shift staff failed to acknowledge breach within 60 mins. Escalated to Store General Manager."
        )
    else:
        return (
            1,
            "level_1_kitchen_alert",
            "⚠️ Level 1 Alert: Active cold-chain excursion broadcast to Kitchen Hygiene & Store Team."
        )


def generate_simulation_stream(
    unit_name: str,
    unit_type: str,
    scenario: str = "normal",
    count: int = 10,
    base_time: Optional[datetime] = None
) -> List[Dict[str, Any]]:
    """
    Generates realistic sensor telemetry streams for demonstration and hardware simulation.
    Prominently labels simulated records to ensure full regulatory audit transparency.
    Scenarios:
      - 'normal': Stable operation within target range
      - 'door_ajar': Rising temperature curve breach
      - 'compressor_failure': Severe rapid temperature spike
      - 'restoration': Cool-down recovery curve
    """
    now = base_time or datetime.utcnow()
    standards = STORAGE_STANDARDS.get(unit_type, STORAGE_STANDARDS["walk_in_chiller"])
    target = standards["target_temp"]
    max_safe = standards["max_temp"]

    stream = []
    for i in range(count):
        step_time = now - timedelta(minutes=(count - 1 - i) * 15)

        if scenario == "normal":
            temp = target + (math.sin(i * 0.8) * 0.6) + (random.random() * 0.3 - 0.15)
            humidity = standards["target_humidity"] + (random.random() * 4.0 - 2.0)
        elif scenario == "door_ajar":
            # Progressive rise from target to above max
            fraction = i / float(max(1, count - 1))
            temp = target + (fraction * (max_safe - target + 3.2)) + (random.random() * 0.2)
            humidity = standards["target_humidity"] + (fraction * 15.0)
        elif scenario == "compressor_failure":
            # Rapid failure climbing into danger zone
            fraction = i / float(max(1, count - 1))
            temp = target + (fraction * 9.5) + (random.random() * 0.3)
            humidity = max(40.0, standards["target_humidity"] - (fraction * 25.0))
        elif scenario == "restoration":
            # Cool down curve back to target
            fraction = (count - 1 - i) / float(max(1, count - 1))
            temp = target + (fraction * 4.5) + (random.random() * 0.2)
            humidity = standards["target_humidity"]
        else:
            temp = target
            humidity = standards["target_humidity"]

        status, is_breach, narrative = evaluate_temperature(
            standards["min_temp"], standards["max_temp"], temp
        )

        stream.append({
            "unit_name": unit_name,
            "unit_type": unit_type,
            "temperature": round(temp, 2),
            "humidity": round(humidity, 1),
            "status": status,
            "is_breach": is_breach,
            "narrative": narrative,
            "recorded_at": step_time,
            "is_simulation": True,
            "simulation_label": "[Simulated Hardware Stream — Proof of Concept Demonstration]"
        })

    return stream
