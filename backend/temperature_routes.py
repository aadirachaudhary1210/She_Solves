"""
FoodShield TempGuard - REST API Router
Endpoints prefix: /api/temperature
Implements:
- Storage unit summaries with live status & drift analysis
- Reading ingestion from simulated/hardware sensors
- Historical measurements with trend sparkline
- Active drift and exposure alerts
- Authorized threshold configurations
- Deterministic demo scenario triggering (Scenarios A through E)
- Shared Integration Contract endpoint for Modules 2, 3, and 4
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from temperature_models import (
    StorageUnit, TemperatureReading, TemperatureExcursion,
    TemperatureAlert, SafetyStatus
)
from temperature_schemas import (
    StorageUnitSummaryResponse, StorageUnitConfigUpdate,
    TemperatureReadingCreate, TemperatureReadingResponse,
    TemperatureAlertResponse, SimulateScenarioRequest,
    SharedIntegrationContractResponse, DriftAnalysisResponse,
    ExposureSummaryResponse
)
from temperature_service import (
    classify_temperature, analyze_temperature_drift,
    process_reading_exposure, trigger_scenario_simulation,
    get_latest_temperature_contract
)

router = APIRouter(prefix="/api/temperature", tags=["Cold-Chain & TempGuard"])


@router.get("/status", response_model=List[StorageUnitSummaryResponse])
@router.get("/units", response_model=List[StorageUnitSummaryResponse])
def get_all_storage_units_status(
    restaurant_id: Optional[int] = Query(None, description="Filter by restaurant ID"),
    db: Session = Depends(get_db)
):
    """
    Returns latest cold-chain status, real-time temperature, classification reasons,
    drift indicators, and exposure intervals for all active storage units.
    """
    query = db.query(StorageUnit).filter(StorageUnit.is_active.is_(True))
    if restaurant_id is not None:
        query = query.filter(StorageUnit.restaurant_id == restaurant_id)

    units = query.all()
    results = []
    now = datetime.utcnow()

    for u in units:
        # Latest reading
        latest = (
            db.query(TemperatureReading)
            .filter(TemperatureReading.unit_id == u.id)
            .order_by(TemperatureReading.timestamp.desc())
            .first()
        )

        # Recent 10 readings for drift analysis
        recent = (
            db.query(TemperatureReading)
            .filter(TemperatureReading.unit_id == u.id)
            .order_by(TemperatureReading.timestamp.desc())
            .limit(10)
            .all()
        )

        drift = analyze_temperature_drift(recent, u)

        if latest:
            reading_age = max(0.0, (now - latest.timestamp).total_seconds())
            threshold_seconds = (u.stale_threshold_minutes or 15) * 60
            is_stale = reading_age > threshold_seconds
            heartbeat_status = "STALE" if is_stale else "CURRENT"

            current_status, reason = classify_temperature(
                latest.temperature_celsius, u, latest.timestamp, now
            )

            reading_ts = latest.timestamp.replace(tzinfo=timezone.utc) if latest.timestamp.tzinfo is None else latest.timestamp

            latest_resp = TemperatureReadingResponse(
                id=latest.id,
                unit_id=u.id,
                unit_name=u.name,
                storage_category=u.category,
                temperature_celsius=latest.temperature_celsius,
                timestamp=reading_ts,
                sensor_id=latest.sensor_id,
                sensor_source=latest.sensor_source,
                status=current_status.value if isinstance(current_status, SafetyStatus) else str(current_status),
                classification_reason=reason,
                is_simulated=latest.is_simulated,
                min_temp_celsius=u.min_temp_celsius,
                max_temp_celsius=u.max_temp_celsius,
                reading_age_seconds=round(reading_age, 1),
                is_stale=is_stale
            )
        else:
            current_status = SafetyStatus.UNKNOWN
            reason = "No sensor telemetry available. Ensure sensor probe is paired."
            latest_resp = None
            reading_age = None
            is_stale = True
            heartbeat_status = "DISCONNECTED"

        # Excursion calculations
        active_exc = (
            db.query(TemperatureExcursion)
            .filter(
                TemperatureExcursion.unit_id == u.id,
                TemperatureExcursion.end_time.is_(None)
            )
            .first()
        )

        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_excursions = (
            db.query(TemperatureExcursion)
            .filter(
                TemperatureExcursion.unit_id == u.id,
                TemperatureExcursion.start_time >= today_start
            )
            .all()
        )

        total_sec = sum(e.duration_seconds or 0 for e in today_excursions)
        active_dur_min = 0.0
        current_start = None
        peak_t = None
        if active_exc:
            active_dur_min = max(0.0, (now - active_exc.start_time).total_seconds()) / 60.0
            total_sec += max(0.0, (now - active_exc.start_time).total_seconds())
            current_start = active_exc.start_time
            peak_t = active_exc.peak_temp_celsius

        # Sparkline points (last 12 readings in chronological order)
        sparkline = [
            r.temperature_celsius for r in reversed(recent[:12])
            if r.temperature_celsius is not None
        ]

        results.append(StorageUnitSummaryResponse(
            id=u.id,
            restaurant_id=u.restaurant_id,
            name=u.name,
            category=u.category,
            description=u.description,
            sensor_id=u.sensor_id,
            sensor_source=u.sensor_source,
            min_temp_celsius=u.min_temp_celsius,
            max_temp_celsius=u.max_temp_celsius,
            warning_low_celsius=u.warning_low_celsius,
            warning_high_celsius=u.warning_high_celsius,
            stale_threshold_minutes=u.stale_threshold_minutes,
            latest_reading=latest_resp,
            safety_status=current_status.value if isinstance(current_status, SafetyStatus) else str(current_status),
            classification_reason=reason,
            drift_analysis=DriftAnalysisResponse(**drift),
            exposure_summary=ExposureSummaryResponse(
                is_in_excursion=active_exc is not None,
                active_duration_minutes=round(active_dur_min, 1),
                total_duration_today_minutes=round(total_sec / 60.0, 1),
                excursion_count_today=len(today_excursions),
                current_excursion_start=current_start,
                peak_temp_celsius=peak_t,
                requires_inspection=active_dur_min > 30.0 or len(today_excursions) >= 3
            ),
            recent_sparkline=sparkline,
            last_measurement_time=latest.timestamp.replace(tzinfo=timezone.utc) if (latest and latest.timestamp) else None,
            reading_age_seconds=round(reading_age, 1) if reading_age is not None else None,
            is_stale=is_stale,
            heartbeat_status=heartbeat_status
        ))

    return results


@router.get("/units/{unit_id}/history", response_model=List[TemperatureReadingResponse])
def get_unit_history(
    unit_id: int,
    limit: int = Query(50, ge=1, le=500),
    hours: Optional[int] = Query(None, ge=1, le=168),
    db: Session = Depends(get_db)
):
    """
    Returns chronological historical temperature readings for a selected unit.
    """
    unit = db.query(StorageUnit).filter(StorageUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Storage unit not found")

    query = db.query(TemperatureReading).filter(TemperatureReading.unit_id == unit_id)
    if hours:
        since = datetime.utcnow() - timedelta(hours=hours)
        query = query.filter(TemperatureReading.timestamp >= since)

    readings = query.order_by(TemperatureReading.timestamp.desc()).limit(limit).all()

    return [
        TemperatureReadingResponse(
            id=r.id,
            unit_id=unit.id,
            unit_name=unit.name,
            storage_category=unit.category,
            temperature_celsius=r.temperature_celsius,
            timestamp=r.timestamp.replace(tzinfo=timezone.utc) if r.timestamp.tzinfo is None else r.timestamp,
            sensor_id=r.sensor_id,
            sensor_source=r.sensor_source,
            status=r.status.value if isinstance(r.status, SafetyStatus) else str(r.status),
            classification_reason=r.classification_reason,
            is_simulated=r.is_simulated,
            min_temp_celsius=unit.min_temp_celsius,
            max_temp_celsius=unit.max_temp_celsius,
            reading_age_seconds=round(max(0.0, (datetime.utcnow() - r.timestamp).total_seconds()), 1),
            is_stale=(datetime.utcnow() - r.timestamp).total_seconds() > ((unit.stale_threshold_minutes or 15) * 60)
        )
        for r in readings
    ]


@router.post("/readings", response_model=TemperatureReadingResponse, status_code=status.HTTP_201_CREATED)
def ingest_temperature_reading(
    payload: TemperatureReadingCreate,
    db: Session = Depends(get_db)
):
    """
    Ingests a temperature reading from a simulated probe or physical IoT gateway.
    Classifies condition, detects drift, records continuous exposure intervals,
    and returns verified status.
    """
    unit = db.query(StorageUnit).filter(StorageUnit.id == payload.unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail=f"Storage unit with ID {payload.unit_id} not found")

    ts = payload.timestamp or datetime.utcnow()
    sensor_id = payload.sensor_id or unit.sensor_id
    sensor_source = payload.sensor_source or unit.sensor_source

    # Run classification service
    status_val, reason = classify_temperature(
        payload.temperature_celsius, unit, ts, datetime.utcnow()
    )

    reading = TemperatureReading(
        unit_id=unit.id,
        temperature_celsius=payload.temperature_celsius,
        timestamp=ts,
        sensor_id=sensor_id,
        sensor_source=sensor_source,
        status=status_val,
        classification_reason=reason,
        is_simulated=payload.is_simulated,
        raw_payload=payload.raw_payload
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)

    # Process exposure interval tracking
    process_reading_exposure(db, unit, reading)

    # Analyze drift over recent window
    recent = (
        db.query(TemperatureReading)
        .filter(TemperatureReading.unit_id == unit.id)
        .order_by(TemperatureReading.timestamp.desc())
        .limit(6)
        .all()
    )
    drift = analyze_temperature_drift(recent, unit)
    if drift.get("has_drift") and drift.get("trend_direction") in ("rising", "abrupt_jump"):
        # Create Drift Alert if not already created recently
        alert = TemperatureAlert(
            unit_id=unit.id,
            alert_type="DRIFT_EARLY_WARNING",
            severity="WARNING",
            title=f"Drift Early Warning: {unit.name}",
            message=drift.get("explanation"),
            slope_per_min=drift.get("slope_celsius_per_minute"),
            estimated_breach_min=drift.get("estimated_breach_minutes"),
            created_at=ts
        )
        db.add(alert)
        db.commit()

    age_s = max(0.0, (datetime.utcnow() - ts).total_seconds())
    is_s = age_s > ((unit.stale_threshold_minutes or 15) * 60)
    return TemperatureReadingResponse(
        id=reading.id,
        unit_id=unit.id,
        unit_name=unit.name,
        storage_category=unit.category,
        temperature_celsius=reading.temperature_celsius,
        timestamp=reading.timestamp.replace(tzinfo=timezone.utc) if reading.timestamp.tzinfo is None else reading.timestamp,
        sensor_id=reading.sensor_id,
        sensor_source=reading.sensor_source,
        status=reading.status.value if isinstance(reading.status, SafetyStatus) else str(reading.status),
        classification_reason=reading.classification_reason,
        is_simulated=reading.is_simulated,
        min_temp_celsius=unit.min_temp_celsius,
        max_temp_celsius=unit.max_temp_celsius,
        reading_age_seconds=round(age_s, 1),
        is_stale=is_s
    )


@router.get("/alerts", response_model=List[TemperatureAlertResponse])
def get_temperature_alerts(
    unit_id: Optional[int] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Returns active or recent cold-chain drift and exposure alerts.
    """
    query = db.query(TemperatureAlert, StorageUnit.name.label("unit_name")).join(
        StorageUnit, TemperatureAlert.unit_id == StorageUnit.id
    )

    if unit_id is not None:
        query = query.filter(TemperatureAlert.unit_id == unit_id)
    if acknowledged is not None:
        query = query.filter(TemperatureAlert.is_acknowledged == acknowledged)

    alerts = query.order_by(TemperatureAlert.created_at.desc()).limit(limit).all()

    return [
        TemperatureAlertResponse(
            id=a[0].id,
            unit_id=a[0].unit_id,
            unit_name=a[1],
            alert_type=a[0].alert_type,
            severity=a[0].severity,
            title=a[0].title,
            message=a[0].message,
            slope_per_min=a[0].slope_per_min,
            estimated_breach_min=a[0].estimated_breach_min,
            created_at=a[0].created_at,
            is_acknowledged=a[0].is_acknowledged
        )
        for a in alerts
    ]


@router.post("/alerts/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    """Acknowledge a temperature warning or alert."""
    alert = db.query(TemperatureAlert).filter(TemperatureAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_acknowledged = True
    db.commit()
    return {"message": "Alert acknowledged", "alert_id": alert_id}


@router.get("/units/{unit_id}/config")
def get_unit_config(unit_id: int, db: Session = Depends(get_db)):
    """Reads configured safety limits and parameters for a unit."""
    unit = db.query(StorageUnit).filter(StorageUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Storage unit not found")
    return {
        "unit_id": unit.id,
        "name": unit.name,
        "category": unit.category,
        "min_temp_celsius": unit.min_temp_celsius,
        "max_temp_celsius": unit.max_temp_celsius,
        "warning_low_celsius": unit.warning_low_celsius,
        "warning_high_celsius": unit.warning_high_celsius,
        "stale_threshold_minutes": unit.stale_threshold_minutes,
        "sensor_id": unit.sensor_id,
        "sensor_source": unit.sensor_source
    }


@router.put("/units/{unit_id}/config")
def update_unit_config(
    unit_id: int,
    config: StorageUnitConfigUpdate,
    db: Session = Depends(get_db)
):
    """
    Updates authorized food safety temperature thresholds without rewriting code.
    Validates boundary logic (min < warning_low < warning_high < max).
    """
    unit = db.query(StorageUnit).filter(StorageUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Storage unit not found")

    new_min = config.min_temp_celsius if config.min_temp_celsius is not None else unit.min_temp_celsius
    new_max = config.max_temp_celsius if config.max_temp_celsius is not None else unit.max_temp_celsius
    new_w_low = config.warning_low_celsius if config.warning_low_celsius is not None else unit.warning_low_celsius
    new_w_high = config.warning_high_celsius if config.warning_high_celsius is not None else unit.warning_high_celsius

    if new_min >= new_max:
        raise HTTPException(status_code=400, detail="Minimum safe limit must be strictly less than maximum safe limit.")
    if new_w_low < new_min or new_w_high > new_max:
        raise HTTPException(status_code=400, detail="Warning limits must reside within minimum and maximum critical boundaries.")
    if new_w_low >= new_w_high:
        raise HTTPException(status_code=400, detail="Lower warning threshold must be less than upper warning threshold.")

    if config.name is not None:
        unit.name = config.name
    if config.category is not None:
        unit.category = config.category
    unit.min_temp_celsius = new_min
    unit.max_temp_celsius = new_max
    unit.warning_low_celsius = new_w_low
    unit.warning_high_celsius = new_w_high
    if config.stale_threshold_minutes is not None:
        unit.stale_threshold_minutes = config.stale_threshold_minutes

    unit.updated_at = datetime.utcnow()
    db.commit()

    return {
        "message": "Storage unit configuration updated successfully",
        "unit_id": unit.id,
        "min_temp_celsius": unit.min_temp_celsius,
        "max_temp_celsius": unit.max_temp_celsius,
        "warning_low_celsius": unit.warning_low_celsius,
        "warning_high_celsius": unit.warning_high_celsius,
        "stale_threshold_minutes": unit.stale_threshold_minutes
    }


@router.post("/simulate")
def simulate_scenario(
    req: SimulateScenarioRequest,
    db: Session = Depends(get_db)
):
    """
    Triggers repeatable demo scenarios for judges:
    - A_NORMAL: Safe baseline operating condition
    - B_DRIFT_WARNING: Gradual warming trajectory triggering drift early warning
    - C_CRITICAL_BREACH: Upper limit violation with continuous exposure tracking
    - D_SENSOR_FAILURE: Stale sensor disconnect producing UNKNOWN safety status
    - E_RECOVERY: Temperature cooling down to safe band and closing excursion
    """
    try:
        result = trigger_scenario_simulation(db, req.scenario, req.unit_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/integration/latest", response_model=SharedIntegrationContractResponse)
def get_shared_integration_contract(
    unit_id: Optional[int] = Query(None),
    restaurant_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Structured, read-only integration contract designed for:
    - Module 2: Sales Forecasting & Spoilage Impact
    - Module 3: AI-versus-Sensor Conflict Detection
    - Module 4: Spoilage-Risk Prediction
    Provides consistent Celsius units, shared status values (SAFE, WARNING, CRITICAL, UNKNOWN),
    drift indicators, and exposure intervals.
    """
    contract_data = get_latest_temperature_contract(db, unit_id, restaurant_id)
    return contract_data
