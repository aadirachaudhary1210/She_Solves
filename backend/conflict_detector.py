"""
FoodShield - Conflict Detection Engine (Challenge 3)
Dedicated, testable service that compares sensor telemetry with AI/system assessment.
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel

from temperature_adapter import SensorReading, SystemAssessment, to_celsius
from conflict_models import ConflictType, ConflictSeverity


class ConflictConfig(BaseModel):
    """Configurable thresholds for tolerance and freshness."""
    tolerance_c: float = 2.5 # Allowable variance before triggering TEMPERATURE_MISMATCH
    sensor_freshness_seconds: int = 900 # 15 minutes
    system_freshness_seconds: int = 1800 # 30 minutes
    critical_temp_diff_c: float = 5.0 # Difference threshold for HIGH/CRITICAL severity


class ConflictEvaluationResult(BaseModel):
    """Comprehensive outcome of conflict analysis."""
    has_conflict: bool
    conflict_types: List[str]
    primary_conflict: str
    severity: str # CRITICAL, HIGH, MEDIUM, LOW, INFO
    requires_escalation: bool
    reason: str
    location_id: str
    normalized_sensor_temp_c: Optional[float] = None
    normalized_system_temp_c: Optional[float] = None
    temp_difference_c: Optional[float] = None
    sensor_status: Optional[str] = None
    system_status: Optional[str] = None
    sensor_age_seconds: Optional[float] = None
    system_age_seconds: Optional[float] = None
    deduplication_key: str


def evaluate_conflict(
    sensor: Optional[SensorReading],
    system: Optional[SystemAssessment],
    config: Optional[ConflictConfig] = None,
    restaurant_id: int = 1,
    current_time: Optional[datetime] = None
) -> ConflictEvaluationResult:
    """
    Pure, testable evaluation of sensor vs AI assessment.
    Applies strict food-safety rules and generates structured conflict results.
    """
    cfg = config or ConflictConfig()
    now = current_time or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    # 1. Missing Data Check (INSUFFICIENT_DATA)
    if sensor is None or system is None:
        loc = sensor.location_id if sensor else (system.location_id if system else "unknown_location")
        missing_source = "sensor reading" if sensor is None else "system assessment"
        if sensor is None and system is None:
            missing_source = "both sensor reading and system assessment"
        
        dedup = f"{restaurant_id}:{loc}:{ConflictType.INSUFFICIENT_DATA.value}"
        return ConflictEvaluationResult(
            has_conflict=True,
            conflict_types=[ConflictType.INSUFFICIENT_DATA.value],
            primary_conflict=ConflictType.INSUFFICIENT_DATA.value,
            severity=ConflictSeverity.MEDIUM.value,
            requires_escalation=True,
            reason=f"Insufficient telemetry: Missing {missing_source} for location '{loc}'. Unable to verify thermal safety.",
            location_id=loc,
            deduplication_key=dedup
        )

    loc = sensor.location_id
    detected_conflicts: List[str] = []
    reasons: List[str] = []

    # 2. Location Mismatch Check (LOCATION_MISMATCH)
    if sensor.location_id.strip().lower() != system.location_id.strip().lower():
        detected_conflicts.append(ConflictType.LOCATION_MISMATCH.value)
        reasons.append(
            f"Location mismatch: Sensor tagged for '{sensor.location_id}', while system assessment refers to '{system.location_id}'."
        )

    # 3. Data Freshness Checks (STALE_SENSOR_DATA & STALE_SYSTEM_ASSESSMENT)
    # Ensure sensor timestamp is timezone-aware
    sens_ts = sensor.timestamp if sensor.timestamp.tzinfo else sensor.timestamp.replace(tzinfo=timezone.utc)
    sys_ts = system.timestamp if system.timestamp.tzinfo else system.timestamp.replace(tzinfo=timezone.utc)

    sensor_age = (now - sens_ts).total_seconds()
    system_age = (now - sys_ts).total_seconds()

    if sensor_age > cfg.sensor_freshness_seconds:
        detected_conflicts.append(ConflictType.STALE_SENSOR_DATA.value)
        reasons.append(
            f"Sensor telemetry is stale: Last recorded {int(sensor_age // 60)} minutes ago (limit {cfg.sensor_freshness_seconds // 60}m)."
        )

    if system_age > cfg.system_freshness_seconds:
        detected_conflicts.append(ConflictType.STALE_SYSTEM_ASSESSMENT.value)
        reasons.append(
            f"AI assessment is stale: Generated {int(system_age // 60)} minutes ago (limit {cfg.system_freshness_seconds // 60}m)."
        )

    # 4. Temperature Normalization & Difference (TEMPERATURE_MISMATCH)
    sensor_c = sensor.normalized_celsius()
    system_c = system.normalized_celsius()
    temp_diff: Optional[float] = None

    if system_c is not None:
        temp_diff = round(abs(sensor_c - system_c), 2)
        if temp_diff > cfg.tolerance_c:
            detected_conflicts.append(ConflictType.TEMPERATURE_MISMATCH.value)
            reasons.append(
                f"Temperature variance beyond tolerance: Sensor {sensor_c}°C ({sensor.temperature}{sensor.unit}) differs from AI assessment {system_c}°C by {temp_diff}°C (tolerance: ±{cfg.tolerance_c}°C)."
            )

    # 5. Status & Critical Disagreement Checks
    sens_status = (sensor.classification or "UNKNOWN").upper()
    sys_status = (system.assessed_status or "UNKNOWN").upper()

    is_critical_disagreement = False
    # CRITICAL DISAGREEMENT: One indicates CRITICAL, other indicates SAFE
    if (sens_status == "CRITICAL" and sys_status == "SAFE") or (sens_status == "SAFE" and sys_status == "CRITICAL"):
        is_critical_disagreement = True
        detected_conflicts.append(ConflictType.CRITICAL_DISAGREEMENT.value)
        reasons.append(
            f"Critical hazard disagreement: Sensor reports status '{sens_status}' while AI assessment reports '{sys_status}'. One source indicates a severe safety hazard."
        )
    elif sens_status != sys_status and sens_status != "UNKNOWN" and sys_status != "UNKNOWN":
        detected_conflicts.append(ConflictType.STATUS_MISMATCH.value)
        reasons.append(
            f"Safety status mismatch: Sensor classified condition as '{sens_status}' while AI assessment evaluated '{sys_status}'."
        )

    # 6. Determine Severity and Primary Conflict
    if not detected_conflicts:
        # Agreement!
        return ConflictEvaluationResult(
            has_conflict=False,
            conflict_types=[ConflictType.AGREEMENT.value],
            primary_conflict=ConflictType.AGREEMENT.value,
            severity=ConflictSeverity.INFO.value,
            requires_escalation=False,
            reason=f"Sensor ({sensor_c}°C, {sens_status}) and AI assessment ({system_c}°C, {sys_status}) agree within acceptable tolerances.",
            location_id=loc,
            normalized_sensor_temp_c=sensor_c,
            normalized_system_temp_c=system_c,
            temp_difference_c=temp_diff,
            sensor_status=sens_status,
            system_status=sys_status,
            sensor_age_seconds=sensor_age,
            system_age_seconds=system_age,
            deduplication_key=f"{restaurant_id}:{loc}:AGREEMENT"
        )

    # Prioritize primary conflict
    if ConflictType.CRITICAL_DISAGREEMENT.value in detected_conflicts:
        primary = ConflictType.CRITICAL_DISAGREEMENT.value
        severity = ConflictSeverity.CRITICAL.value
        requires_escalation = True
    elif ConflictType.LOCATION_MISMATCH.value in detected_conflicts:
        primary = ConflictType.LOCATION_MISMATCH.value
        severity = ConflictSeverity.MEDIUM.value
        requires_escalation = True
    elif sens_status == "CRITICAL" or sys_status == "CRITICAL":
        primary = detected_conflicts[0]
        severity = ConflictSeverity.CRITICAL.value
        requires_escalation = True
    elif ConflictType.STATUS_MISMATCH.value in detected_conflicts:
        primary = ConflictType.STATUS_MISMATCH.value
        severity = ConflictSeverity.HIGH.value
        requires_escalation = True
    elif ConflictType.TEMPERATURE_MISMATCH.value in detected_conflicts:
        primary = ConflictType.TEMPERATURE_MISMATCH.value
        if temp_diff and temp_diff >= cfg.critical_temp_diff_c:
            severity = ConflictSeverity.HIGH.value
            requires_escalation = True
        else:
            severity = ConflictSeverity.MEDIUM.value
            requires_escalation = False
    elif ConflictType.STALE_SENSOR_DATA.value in detected_conflicts:
        primary = ConflictType.STALE_SENSOR_DATA.value
        severity = ConflictSeverity.MEDIUM.value
        requires_escalation = True
    else:
        primary = detected_conflicts[0]
        severity = ConflictSeverity.LOW.value
        requires_escalation = False

    # Never suppress critical safety disagreement if sensor flagged critical!
    if sens_status == "CRITICAL":
        severity = ConflictSeverity.CRITICAL.value
        requires_escalation = True

    dedup = f"{restaurant_id}:{loc}:{primary}"

    return ConflictEvaluationResult(
        has_conflict=True,
        conflict_types=detected_conflicts,
        primary_conflict=primary,
        severity=severity,
        requires_escalation=requires_escalation,
        reason="; ".join(reasons),
        location_id=loc,
        normalized_sensor_temp_c=sensor_c,
        normalized_system_temp_c=system_c,
        temp_difference_c=temp_diff,
        sensor_status=sens_status,
        system_status=sys_status,
        sensor_age_seconds=sensor_age,
        system_age_seconds=system_age,
        deduplication_key=dedup
    )
