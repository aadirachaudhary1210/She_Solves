"""
FoodShield TempGuard - Comprehensive Test Suite
Tests:
1. Safety classification service (safe, warning, critical, unknown)
2. Boundary threshold transitions and buffer margins
3. Stale reading detection and missing/null telemetry rejection
4. Novel temperature-drift early warning and boundary breach estimation
5. Interval-based exposure tracking and state transitions
6. Configuration validation (min/max boundary rules)
7. REST API routes and Shared Integration Contract
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
import models # Load all foreign key models
from temperature_models import (
    StorageUnit, TemperatureReading, TemperatureExcursion,
    TemperatureAlert, SafetyStatus
)
from temperature_service import (
    classify_temperature, analyze_temperature_drift,
    process_reading_exposure, trigger_scenario_simulation,
    get_latest_temperature_contract
)
from main import app

client = TestClient(app)

# Helper fixture / dummy unit
def create_dummy_chiller():
    return StorageUnit(
        id=999,
        restaurant_id=1,
        name="Test Chiller Unit",
        category="Dairy & Pastry Chiller (1-4Â°C)",
        sensor_id="SEN-TEST-99",
        sensor_source="SIMULATED_IOT_PROBE",
        min_temp_celsius=1.0,
        max_temp_celsius=4.0,
        warning_low_celsius=1.5,
        warning_high_celsius=3.5,
        stale_threshold_minutes=15
    )


# -------------------------------------------------------------
# 1. CLASSIFICATION & BOUNDARY TESTS
# -------------------------------------------------------------

def test_classification_safe_operating_range():
    unit = create_dummy_chiller()
    now = datetime.utcnow()
    status, reason = classify_temperature(2.4, unit, now, now)
    assert status == SafetyStatus.SAFE
    assert "within target operating range" in reason

def test_classification_warning_high_threshold():
    unit = create_dummy_chiller()
    now = datetime.utcnow()
    # 3.6 is >= warning_high (3.5) and <= max (4.0)
    status, reason = classify_temperature(3.6, unit, now, now)
    assert status == SafetyStatus.WARNING
    assert "High temperature warning" in reason

def test_classification_warning_low_threshold():
    unit = create_dummy_chiller()
    now = datetime.utcnow()
    # 1.2 is <= warning_low (1.5) and >= min (1.0)
    status, reason = classify_temperature(1.2, unit, now, now)
    assert status == SafetyStatus.WARNING
    assert "Low temperature warning" in reason

def test_classification_critical_high_breach():
    unit = create_dummy_chiller()
    now = datetime.utcnow()
    # 4.8 exceeds max_temp (4.0)
    status, reason = classify_temperature(4.8, unit, now, now)
    assert status == SafetyStatus.CRITICAL
    assert "exceeds safe upper limit" in reason

def test_classification_critical_low_breach():
    unit = create_dummy_chiller()
    now = datetime.utcnow()
    # 0.2 is below min_temp (1.0)
    status, reason = classify_temperature(0.2, unit, now, now)
    assert status == SafetyStatus.CRITICAL
    assert "below safe lower limit" in reason


# -------------------------------------------------------------
# 2. STALE & INVALID TELEMETRY TESTS
# -------------------------------------------------------------

def test_classification_stale_reading_rejected():
    unit = create_dummy_chiller()
    now = datetime.utcnow()
    stale_ts = now - timedelta(minutes=25) # 25 mins > 15 mins threshold
    status, reason = classify_temperature(2.4, unit, stale_ts, now)
    assert status == SafetyStatus.UNKNOWN
    assert "Sensor heartbeat stale" in reason

def test_classification_null_or_disconnected_reading():
    unit = create_dummy_chiller()
    now = datetime.utcnow()
    status, reason = classify_temperature(None, unit, now, now)
    assert status == SafetyStatus.UNKNOWN
    assert "probe disconnected" in reason

def test_classification_anomalous_physical_reading():
    unit = create_dummy_chiller()
    now = datetime.utcnow()
    # -99Â°C is anomalous physical reading
    status, reason = classify_temperature(-99.0, unit, now, now)
    assert status == SafetyStatus.UNKNOWN
    assert "anomalous reading" in reason


# -------------------------------------------------------------
# 3. NOVEL FEATURE: DRIFT EARLY WARNING & BREACH ESTIMATION
# -------------------------------------------------------------

def test_drift_detection_insufficient_history():
    unit = create_dummy_chiller()
    now = datetime.utcnow()
    # Only 2 readings (< 3)
    readings = [
        TemperatureReading(unit_id=unit.id, temperature_celsius=2.2, timestamp=now - timedelta(minutes=4), sensor_id="S1"),
        TemperatureReading(unit_id=unit.id, temperature_celsius=2.4, timestamp=now - timedelta(minutes=2), sensor_id="S1"),
    ]
    drift = analyze_temperature_drift(readings, unit)
    assert drift["has_drift"] is False
    assert drift["trend_direction"] == "insufficient_data"
    assert "Insufficient history" in drift["explanation"]

def test_drift_detection_steady_warming_trajectory():
    unit = create_dummy_chiller()
    now = datetime.utcnow()
    # Progressive warming over 10 minutes from 2.4 to 3.6 (slope ~ +0.12 C/min)
    readings = [
        TemperatureReading(unit_id=unit.id, temperature_celsius=2.4, timestamp=now - timedelta(minutes=8), sensor_id="S1"),
        TemperatureReading(unit_id=unit.id, temperature_celsius=2.7, timestamp=now - timedelta(minutes=6), sensor_id="S1"),
        TemperatureReading(unit_id=unit.id, temperature_celsius=3.0, timestamp=now - timedelta(minutes=4), sensor_id="S1"),
        TemperatureReading(unit_id=unit.id, temperature_celsius=3.3, timestamp=now - timedelta(minutes=2), sensor_id="S1"),
        TemperatureReading(unit_id=unit.id, temperature_celsius=3.6, timestamp=now, sensor_id="S1"),
    ]
    drift = analyze_temperature_drift(readings, unit)
    assert drift["has_drift"] is True
    assert drift["trend_direction"] == "rising"
    assert drift["slope_celsius_per_minute"] > 0.05
    assert drift["estimated_breach_minutes"] is not None
    assert drift["estimated_breach_minutes"] > 0
    assert "Linear trajectory" in drift["assumptions"]

def test_drift_detection_abrupt_step_jump():
    unit = create_dummy_chiller()
    now = datetime.utcnow()
    readings = [
        TemperatureReading(unit_id=unit.id, temperature_celsius=2.2, timestamp=now - timedelta(minutes=6), sensor_id="S1"),
        TemperatureReading(unit_id=unit.id, temperature_celsius=2.3, timestamp=now - timedelta(minutes=4), sensor_id="S1"),
        TemperatureReading(unit_id=unit.id, temperature_celsius=4.0, timestamp=now, sensor_id="S1"), # Jump of +1.7Â°C
    ]
    drift = analyze_temperature_drift(readings, unit)
    assert drift["has_drift"] is True
    assert drift["trend_direction"] == "abrupt_jump"
    assert "Abrupt temperature change" in drift["explanation"]


# -------------------------------------------------------------
# 4. EXPOSURE TRACKING INTERVALS
# -------------------------------------------------------------

def test_exposure_lifecycle():
    from database import SessionLocal
    db = SessionLocal()
    unit = db.query(StorageUnit).first()
    assert unit is not None

    now = datetime.utcnow()

    # Reading 1: Critical breach -> starts excursion
    reading_breach = TemperatureReading(
        unit_id=unit.id,
        temperature_celsius=5.2, # > 4.0
        timestamp=now - timedelta(minutes=15),
        sensor_id=unit.sensor_id,
        sensor_source="SIMULATED_IOT_PROBE",
        status=SafetyStatus.CRITICAL,
        classification_reason="High breach test",
        is_simulated=True
    )
    db.add(reading_breach)
    db.commit()

    summary1 = process_reading_exposure(db, unit, reading_breach)
    assert summary1["is_in_excursion"] is True
    assert summary1["current_excursion_start"] is not None

    # Reading 2: Still out of bounds -> updates active duration without creating duplicate excursion
    reading_breach_2 = TemperatureReading(
        unit_id=unit.id,
        temperature_celsius=5.6,
        timestamp=now - timedelta(minutes=5),
        sensor_id=unit.sensor_id,
        sensor_source="SIMULATED_IOT_PROBE",
        status=SafetyStatus.CRITICAL,
        classification_reason="High breach test 2",
        is_simulated=True
    )
    db.add(reading_breach_2)
    db.commit()

    summary2 = process_reading_exposure(db, unit, reading_breach_2)
    assert summary2["is_in_excursion"] is True
    assert summary2["peak_temp_celsius"] == 5.6

    # Reading 3: Recovery -> resolves excursion
    reading_recovery = TemperatureReading(
        unit_id=unit.id,
        temperature_celsius=2.4, # back in safe bounds
        timestamp=now,
        sensor_id=unit.sensor_id,
        sensor_source="SIMULATED_IOT_PROBE",
        status=SafetyStatus.SAFE,
        classification_reason="Recovered",
        is_simulated=True
    )
    db.add(reading_recovery)
    db.commit()

    summary3 = process_reading_exposure(db, unit, reading_recovery)
    assert summary3["is_in_excursion"] is False
    assert summary3["total_duration_today_minutes"] > 0
    db.close()


# -------------------------------------------------------------
# 5. REST API ENDPOINTS & SHARED CONTRACT
# -------------------------------------------------------------

def test_api_status_endpoint():
    res = client.get("/api/temperature/status")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    unit = data[0]
    assert "name" in unit
    assert "min_temp_celsius" in unit
    assert "max_temp_celsius" in unit
    assert "safety_status" in unit
    assert "drift_analysis" in unit
    assert "exposure_summary" in unit
    assert "recent_sparkline" in unit

def test_api_history_endpoint():
    # Fetch first unit ID
    unit_id = client.get("/api/temperature/status").json()[0]["id"]
    res = client.get(f"/api/temperature/units/{unit_id}/history?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) <= 10
    if len(data) > 0:
        assert "temperature_celsius" in data[0]
        assert "status" in data[0]

def test_api_reading_ingestion():
    unit_id = client.get("/api/temperature/status").json()[0]["id"]
    payload = {
        "unit_id": unit_id,
        "temperature_celsius": 2.7,
        "sensor_source": "SIMULATED_IOT_PROBE"
    }
    res = client.post("/api/temperature/readings", json=payload)
    assert res.status_code == 201
    reading = res.json()
    assert reading["temperature_celsius"] == 2.7
    assert reading["status"] == "SAFE"

def test_api_config_update_validation():
    unit_id = client.get("/api/temperature/status").json()[0]["id"]

    # Invalid: min >= max
    invalid_payload = {
        "min_temp_celsius": 10.0,
        "max_temp_celsius": 5.0
    }
    res = client.put(f"/api/temperature/units/{unit_id}/config", json=invalid_payload)
    assert res.status_code == 400

    # Valid update
    valid_payload = {
        "min_temp_celsius": 0.5,
        "max_temp_celsius": 4.5,
        "warning_low_celsius": 1.0,
        "warning_high_celsius": 4.0
    }
    res_valid = client.put(f"/api/temperature/units/{unit_id}/config", json=valid_payload)
    assert res_valid.status_code == 200
    # Restore original config so DB remains pristine
    restore_payload = {
        "min_temp_celsius": 1.0,
        "max_temp_celsius": 4.0,
        "warning_low_celsius": 1.5,
        "warning_high_celsius": 3.5,
        "stale_threshold_minutes": 15
    }
    res_restore = client.put(f"/api/temperature/units/{unit_id}/config", json=restore_payload)
    assert res_restore.status_code == 200

def test_api_demo_scenarios():
    for scenario in ["A_NORMAL", "B_DRIFT_WARNING", "C_CRITICAL_BREACH", "D_SENSOR_FAILURE", "E_RECOVERY"]:
        res = client.post("/api/temperature/simulate", json={"scenario": scenario})
        assert res.status_code == 200
        data = res.json()
        assert "scenario" in data
        assert "status" in data

    # Reset back to A_NORMAL
    client.post("/api/temperature/simulate", json={"scenario": "A_NORMAL"})

def test_shared_integration_contract():
    res = client.get("/api/temperature/integration/latest")
    assert res.status_code == 200
    contract = res.json()
    assert contract["module"] == "FoodShield TempGuard (Cold-Chain Module 1)"
    assert contract["version"] == "1.0.0"
    assert "timestamp" in contract
    assert "units_monitored" in contract
    assert "system_health" in contract
    assert isinstance(contract["units"], list)
    assert len(contract["units"]) >= 1

    unit_contract = contract["units"][0]
    assert "unit_id" in unit_contract
    assert "unit_name" in unit_contract
    assert "storage_category" in unit_contract
    assert "safety_limits" in unit_contract
    assert "safety_status" in unit_contract
    assert unit_contract["safety_status"] in ["SAFE", "WARNING", "CRITICAL", "UNKNOWN"]
    assert "drift_analysis" in unit_contract
    assert "exposure_summary" in unit_contract


# -------------------------------------------------------------
# 6. SAFETY BOUNDARY VERIFICATION & HOT HOLDING FIX TESTS
# -------------------------------------------------------------

def test_safety_boundaries_all_units():
    """Verify below, at, within, and above configured limits for all storage units."""
    test_cases = [
        # (name, min, w_low, w_high, max, below, at_min, at_w_low, within, at_w_high, at_max, above)
        ("Main Dairy & Pastry Chiller", 1.0, 1.5, 3.5, 4.0, 0.5, 1.0, 1.5, 2.4, 3.5, 4.0, 4.5),
        ("Walk-in Deep Freezer A", -22.0, -21.0, -18.5, -18.0, -23.0, -22.0, -21.0, -19.6, -18.5, -18.0, -17.0),
        ("Raw Butchery Cold Locker", -1.0, -0.5, 1.5, 2.0, -1.5, -1.0, -0.5, 0.8, 1.5, 2.0, 2.5),
        ("Fresh Produce & Prep Walk-in", 3.0, 3.5, 6.5, 7.0, 2.5, 3.0, 3.5, 4.8, 6.5, 7.0, 7.5),
        ("Banquet Hot Holding Display", 63.0, 65.0, 78.0, 80.0, 60.0, 63.0, 65.0, 71.5, 78.0, 80.0, 82.0),
    ]

    now = datetime.utcnow()
    for name, min_t, w_low, w_high, max_t, below_val, at_min_val, at_w_low_val, within_val, at_w_high_val, at_max_val, above_val in test_cases:
        unit = StorageUnit(
            id=100,
            restaurant_id=1,
            name=name,
            category=name,
            sensor_id="TEST-SEN",
            min_temp_celsius=min_t,
            max_temp_celsius=max_t,
            warning_low_celsius=w_low,
            warning_high_celsius=w_high,
            stale_threshold_minutes=15
        )

        # 1. Below minimum -> CRITICAL
        s, r = classify_temperature(below_val, unit, now, now)
        assert s == SafetyStatus.CRITICAL, f"{name}: {below_val} should be CRITICAL, got {s}"
        assert "below safe lower limit" in r

        # 2. At minimum -> WARNING (lower boundary)
        s, r = classify_temperature(at_min_val, unit, now, now)
        assert s == SafetyStatus.WARNING, f"{name}: {at_min_val} should be WARNING, got {s}"

        # 3. At lower warning threshold -> WARNING
        s, r = classify_temperature(at_w_low_val, unit, now, now)
        assert s == SafetyStatus.WARNING, f"{name}: {at_w_low_val} should be WARNING, got {s}"

        # 4. Within target safe range -> SAFE with unified configured range in reason
        s, r = classify_temperature(within_val, unit, now, now)
        assert s == SafetyStatus.SAFE, f"{name}: {within_val} should be SAFE, got {s}"
        assert f"within target operating range ({min_t:.1f}Â°C to {max_t:.1f}Â°C)" in r

        # 5. At upper warning threshold -> WARNING
        s, r = classify_temperature(at_w_high_val, unit, now, now)
        assert s == SafetyStatus.WARNING, f"{name}: {at_w_high_val} should be WARNING, got {s}"

        # 6. At maximum -> WARNING (upper boundary)
        s, r = classify_temperature(at_max_val, unit, now, now)
        assert s == SafetyStatus.WARNING, f"{name}: {at_max_val} should be WARNING, got {s}"

        # 7. Above maximum -> CRITICAL
        s, r = classify_temperature(above_val, unit, now, now)
        assert s == SafetyStatus.CRITICAL, f"{name}: {above_val} should be CRITICAL, got {s}"
        assert "exceeds safe upper limit" in r


def test_hot_holding_71_5_classification_and_safe_status():
    """Confirms Banquet Hot Holding Display at 71.5Â°C is SAFE and not falsely marked as WARNING."""
    hot_unit = StorageUnit(
        id=5,
        restaurant_id=1,
        name="Banquet Hot Holding Display",
        category="Hot Holding Station (>63Â°C)",
        sensor_id="SEN-HOT-05",
        min_temp_celsius=63.0,
        max_temp_celsius=80.0,
        warning_low_celsius=65.0,
        warning_high_celsius=78.0,
        stale_threshold_minutes=15
    )

    now = datetime.utcnow()
    status, reason = classify_temperature(71.5, hot_unit, now, now)
    assert status == SafetyStatus.SAFE
    assert "within target operating range (63.0Â°C to 80.0Â°C)" in reason

    # Readings with slight natural fluctuation around 71.5Â°C
    readings = [
        TemperatureReading(unit_id=5, temperature_celsius=71.2, timestamp=now - timedelta(minutes=10), sensor_id="SEN-HOT-05"),
        TemperatureReading(unit_id=5, temperature_celsius=71.4, timestamp=now - timedelta(minutes=5), sensor_id="SEN-HOT-05"),
        TemperatureReading(unit_id=5, temperature_celsius=71.5, timestamp=now, sensor_id="SEN-HOT-05"),
    ]
    drift = analyze_temperature_drift(readings, hot_unit)
    assert drift["has_drift"] is False
    assert drift["trend_direction"] == "stable"


def test_telemetry_freshness_fields():
    """Verify heartbeat and freshness fields returned by API."""
    res = client.get("/api/temperature/status")
    assert res.status_code == 200
    units = res.json()
    assert len(units) >= 1

    for u in units:
        assert "heartbeat_status" in u
        assert u["heartbeat_status"] in ["CURRENT", "STALE", "DISCONNECTED"]
        assert "reading_age_seconds" in u
        assert "is_stale" in u
        if u["latest_reading"]:
            assert "reading_age_seconds" in u["latest_reading"]
            assert "is_stale" in u["latest_reading"]
            assert "timestamp" in u["latest_reading"]
            # ISO timestamp ends with Z or has timezone
            ts = u["latest_reading"]["timestamp"]
            assert "Z" in ts or "+" in ts
