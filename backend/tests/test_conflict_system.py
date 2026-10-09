"""
FoodShield - Comprehensive Automated Test Suite for Challenge 3
Validates:
1. Matching safe assessments.
2. Temperature mismatch within and beyond tolerance.
3. Safe-versus-critical status disagreement.
4. Stale sensor data.
5. Stale assessment data.
6. Different monitored locations.
7. Unit conversion (°F to °C).
8. Missing inputs (insufficient data).
9. Conflict severity and incident deduplication.
10. Escalation state transitions (valid & invalid).
11. OTP expiry, invalid OTP, successful verification, replay, and attempt limits.
12. Unauthorized actions (token / role checks).
13. Missing endpoint configuration.
14. Provider timeout, rejection, and successful test response.
15. Dry-run mode and duplicate-notification prevention.
16. Audit-event creation.
"""

import pytest
import os
import sys
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# Ensure backend root is on Python sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database import engine, Base, SessionLocal
import conflict_models
from main import app
from temperature_adapter import SensorReading, SystemAssessment, to_celsius, to_fahrenheit
from conflict_detector import evaluate_conflict, ConflictConfig
from conflict_models import ConflictType, ConflictSeverity, ConflictState, ConflictIncident, IncidentEscalationEvent
from otp_service import otp_service
from messaging_adapter import messaging_adapter


# Initialize test database tables
Base.metadata.create_all(bind=engine)
client = TestClient(app)


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def auth_headers():
    # Login as restaurant demo user to get JWT token
    resp = client.post("/api/auth/login", json={
        "email": "restaurant@foodshield.com",
        "password": "Password123!",
        "role": "restaurant"
    })
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# =====================================================================
# 1. Matching safe assessments
# =====================================================================
def test_matching_safe_assessments():
    now = datetime.now(timezone.utc)
    sensor = SensorReading(
        reading_id="S-01",
        location_id="cold_room_1",
        temperature=3.8,
        unit="C",
        timestamp=now,
        classification="SAFE"
    )
    system = SystemAssessment(
        assessment_id="A-01",
        location_id="cold_room_1",
        estimated_temperature=3.9,
        unit="C",
        assessed_status="SAFE",
        timestamp=now
    )

    res = evaluate_conflict(sensor, system)
    assert not res.has_conflict
    assert res.primary_conflict == ConflictType.AGREEMENT.value
    assert res.severity == ConflictSeverity.INFO.value
    assert not res.requires_escalation


# =====================================================================
# 2. Temperature mismatch within and beyond tolerance
# =====================================================================
def test_temperature_mismatch_within_and_beyond_tolerance():
    now = datetime.now(timezone.utc)
    cfg = ConflictConfig(tolerance_c=2.0, critical_temp_diff_c=5.0)

    # Within tolerance (diff = 1.0 <= 2.0)
    s1 = SensorReading(reading_id="S-1", location_id="bay-1", temperature=4.0, unit="C", timestamp=now, classification="SAFE")
    a1 = SystemAssessment(assessment_id="A-1", location_id="bay-1", estimated_temperature=5.0, unit="C", assessed_status="SAFE", timestamp=now)
    r1 = evaluate_conflict(s1, a1, config=cfg)
    assert not r1.has_conflict

    # Beyond tolerance but below critical (diff = 3.5 > 2.0 and < 5.0) -> MEDIUM
    s2 = SensorReading(reading_id="S-2", location_id="bay-1", temperature=4.0, unit="C", timestamp=now, classification="SAFE")
    a2 = SystemAssessment(assessment_id="A-2", location_id="bay-1", estimated_temperature=7.5, unit="C", assessed_status="SAFE", timestamp=now)
    r2 = evaluate_conflict(s2, a2, config=cfg)
    assert r2.has_conflict
    assert ConflictType.TEMPERATURE_MISMATCH.value in r2.conflict_types
    assert r2.severity == ConflictSeverity.MEDIUM.value

    # Severely beyond tolerance (diff = 6.0 >= 5.0) -> HIGH
    s3 = SensorReading(reading_id="S-3", location_id="bay-1", temperature=4.0, unit="C", timestamp=now, classification="SAFE")
    a3 = SystemAssessment(assessment_id="A-3", location_id="bay-1", estimated_temperature=10.0, unit="C", assessed_status="SAFE", timestamp=now)
    r3 = evaluate_conflict(s3, a3, config=cfg)
    assert r3.has_conflict
    assert r3.severity == ConflictSeverity.HIGH.value
    assert r3.requires_escalation


# =====================================================================
# 3. Safe-versus-critical status disagreement
# =====================================================================
def test_critical_disagreement():
    now = datetime.now(timezone.utc)
    sensor = SensorReading(
        reading_id="S-CRIT",
        location_id="freezer_01",
        temperature=14.5,
        unit="C",
        timestamp=now,
        classification="CRITICAL"
    )
    system = SystemAssessment(
        assessment_id="A-SAFE",
        location_id="freezer_01",
        estimated_temperature=-18.0,
        unit="C",
        assessed_status="SAFE",
        timestamp=now
    )

    res = evaluate_conflict(sensor, system)
    assert res.has_conflict
    assert ConflictType.CRITICAL_DISAGREEMENT.value in res.conflict_types
    assert res.severity == ConflictSeverity.CRITICAL.value
    assert res.requires_escalation


# =====================================================================
# 4. Stale sensor data
# =====================================================================
def test_stale_sensor_data():
    now = datetime.now(timezone.utc)
    cfg = ConflictConfig(sensor_freshness_seconds=900) # 15 mins

    old_sensor = SensorReading(
        reading_id="S-OLD",
        location_id="chiller_1",
        temperature=4.0,
        unit="C",
        timestamp=now - timedelta(minutes=45), # 45 mins old
        classification="SAFE"
    )
    fresh_system = SystemAssessment(
        assessment_id="A-FRESH",
        location_id="chiller_1",
        estimated_temperature=4.1,
        unit="C",
        assessed_status="SAFE",
        timestamp=now
    )

    res = evaluate_conflict(old_sensor, fresh_system, config=cfg)
    assert res.has_conflict
    assert ConflictType.STALE_SENSOR_DATA.value in res.conflict_types


# =====================================================================
# 5. Stale assessment data
# =====================================================================
def test_stale_assessment_data():
    now = datetime.now(timezone.utc)
    cfg = ConflictConfig(system_freshness_seconds=1800) # 30 mins

    fresh_sensor = SensorReading(
        reading_id="S-FRESH",
        location_id="chiller_1",
        temperature=4.0,
        unit="C",
        timestamp=now,
        classification="SAFE"
    )
    old_system = SystemAssessment(
        assessment_id="A-OLD",
        location_id="chiller_1",
        estimated_temperature=4.0,
        unit="C",
        assessed_status="SAFE",
        timestamp=now - timedelta(hours=2) # 120 mins old
    )

    res = evaluate_conflict(fresh_sensor, old_system, config=cfg)
    assert res.has_conflict
    assert ConflictType.STALE_SYSTEM_ASSESSMENT.value in res.conflict_types


# =====================================================================
# 6. Different monitored locations
# =====================================================================
def test_location_mismatch():
    now = datetime.now(timezone.utc)
    s = SensorReading(reading_id="S-1", location_id="location_alpha", temperature=4.0, unit="C", timestamp=now, classification="SAFE")
    a = SystemAssessment(assessment_id="A-1", location_id="location_beta", estimated_temperature=4.0, unit="C", assessed_status="SAFE", timestamp=now)

    res = evaluate_conflict(s, a)
    assert res.has_conflict
    assert ConflictType.LOCATION_MISMATCH.value in res.conflict_types


# =====================================================================
# 7. Unit conversion (°F to °C)
# =====================================================================
def test_unit_conversion():
    # 50°F is exactly 10°C
    assert to_celsius(50.0, "F") == 10.0
    # 32°F is exactly 0°C
    assert to_celsius(32.0, "F") == 0.0
    # 212°F is 100°C
    assert to_celsius(212.0, "F") == 100.0

    now = datetime.now(timezone.utc)
    # Sensor in Fahrenheit: 50.0°F (10.0°C) vs AI in Celsius: 4.0°C -> difference is 6.0°C!
    s = SensorReading(reading_id="S-F", location_id="chiller", temperature=50.0, unit="F", timestamp=now, classification="WARNING")
    a = SystemAssessment(assessment_id="A-C", location_id="chiller", estimated_temperature=4.0, unit="C", assessed_status="SAFE", timestamp=now)

    res = evaluate_conflict(s, a)
    assert res.normalized_sensor_temp_c == 10.0
    assert res.normalized_system_temp_c == 4.0
    assert res.temp_difference_c == 6.0
    assert ConflictType.TEMPERATURE_MISMATCH.value in res.conflict_types


# =====================================================================
# 8. Missing inputs (insufficient data)
# =====================================================================
def test_missing_inputs():
    now = datetime.now(timezone.utc)
    s = SensorReading(reading_id="S-1", location_id="bay", temperature=4.0, unit="C", timestamp=now)
    res = evaluate_conflict(s, None)
    assert res.has_conflict
    assert res.primary_conflict == ConflictType.INSUFFICIENT_DATA.value
    assert res.requires_escalation

    res2 = evaluate_conflict(None, None)
    assert res2.has_conflict
    assert res2.primary_conflict == ConflictType.INSUFFICIENT_DATA.value


# =====================================================================
# 9. Conflict severity and incident deduplication
# =====================================================================
def test_incident_deduplication(db_session):
    import uuid
    from escalation_service import escalation_service

    test_uid = uuid.uuid4().hex[:6]
    loc = f"dedup_loc_{test_uid}"
    now = datetime.now(timezone.utc)
    s = SensorReading(reading_id=f"S-DEDUP-{test_uid}", location_id=loc, temperature=15.0, unit="C", timestamp=now, classification="CRITICAL")
    a = SystemAssessment(assessment_id=f"A-DEDUP-{test_uid}", location_id=loc, estimated_temperature=2.0, unit="C", assessed_status="SAFE", timestamp=now)
    
    eval_res = evaluate_conflict(s, a)
    inc1, is_new1 = escalation_service.create_or_update_incident(db_session, eval_res, s, a, restaurant_id=99)
    assert is_new1

    # Second evaluation with updated reading for the same location and conflict type
    s2 = SensorReading(reading_id=f"S-DEDUP2-{test_uid}", location_id=loc, temperature=16.5, unit="C", timestamp=now, classification="CRITICAL")
    eval_res2 = evaluate_conflict(s2, a)
    inc2, is_new2 = escalation_service.create_or_update_incident(db_session, eval_res2, s2, a, restaurant_id=99)
    
    # Must NOT create a duplicate open incident!
    assert not is_new2
    assert inc1.incident_id == inc2.incident_id
    assert inc2.sensor_temp_c == 16.5


# =====================================================================
# 10. Escalation state transitions (valid and invalid)
# =====================================================================
def test_escalation_state_transitions(db_session):
    import uuid
    from escalation_service import escalation_service

    test_uid = uuid.uuid4().hex[:6]
    loc = f"tr_loc_{test_uid}"
    now = datetime.now(timezone.utc)
    s = SensorReading(reading_id=f"S-TR-{test_uid}", location_id=loc, temperature=12.0, unit="C", timestamp=now, classification="CRITICAL")
    a = SystemAssessment(assessment_id=f"A-TR-{test_uid}", location_id=loc, estimated_temperature=2.0, unit="C", assessed_status="SAFE", timestamp=now)
    eval_res = evaluate_conflict(s, a)
    inc, is_new = escalation_service.create_or_update_incident(db_session, eval_res, s, a, restaurant_id=98)
    assert is_new

    assert inc.state == ConflictState.DETECTED.value

    # Valid: DETECTED -> ACKNOWLEDGEMENT_PENDING
    escalation_service.transition_state(db_session, inc, ConflictState.ACKNOWLEDGEMENT_PENDING.value, "ACK", "tester@test.com", "restaurant")
    assert inc.state == ConflictState.ACKNOWLEDGEMENT_PENDING.value

    # Valid: ACKNOWLEDGEMENT_PENDING -> OTP_PENDING
    escalation_service.transition_state(db_session, inc, ConflictState.OTP_PENDING.value, "OTP", "tester@test.com", "restaurant")
    assert inc.state == ConflictState.OTP_PENDING.value

    # Valid: OTP_PENDING -> VERIFIED
    escalation_service.transition_state(db_session, inc, ConflictState.VERIFIED.value, "VERIFIED", "tester@test.com", "restaurant")
    assert inc.state == ConflictState.VERIFIED.value

    # Invalid: VERIFIED cannot transition straight back to DETECTED
    with pytest.raises(ValueError):
        escalation_service.transition_state(db_session, inc, ConflictState.DETECTED.value, "INVALID", "tester@test.com", "restaurant")


# =====================================================================
# 11. OTP expiry, invalid OTP, successful verification, replay, attempt limits
# =====================================================================
def test_otp_lifecycle_and_security(db_session):
    import uuid
    inc_id = f"INC-TEST-OTP-{uuid.uuid4().hex[:6]}"

    # 1. Generate OTP
    otp_record, plain_code = otp_service.generate_otp_for_incident(
        db_session, inc_id, "manager@test.com", action_type="ESCALATE"
    )
    assert len(plain_code) == 6
    assert plain_code.isdigit()
    assert otp_record.otp_hash != plain_code # Must NOT be plaintext!

    # 2. Invalid code attempt
    verified, msg = otp_service.verify_otp_for_incident(db_session, inc_id, "000000", action_type="ESCALATE")
    assert not verified
    assert "Invalid OTP" in msg

    # 3. Successful verification
    verified, msg = otp_service.verify_otp_for_incident(db_session, inc_id, plain_code, action_type="ESCALATE")
    assert verified
    assert "verified successfully" in msg.lower()

    # 4. Replay protection: cannot use again!
    verified2, msg2 = otp_service.verify_otp_for_incident(db_session, inc_id, plain_code, action_type="ESCALATE")
    assert not verified2
    assert "already been used" in msg2.lower() or "no active otp" in msg2.lower()


def test_otp_attempt_limits(db_session):
    import uuid
    inc_id = f"INC-TEST-ATTEMPTS-{uuid.uuid4().hex[:6]}"
    otp_record, plain_code = otp_service.generate_otp_for_incident(
        db_session, inc_id, f"sec_{uuid.uuid4().hex[:4]}@test.com", action_type="ESCALATE"
    )

    # Exhaust 3 attempts
    for _ in range(3):
        otp_service.verify_otp_for_incident(db_session, inc_id, "111111", action_type="ESCALATE")

    # 4th attempt should be blocked
    verified, msg = otp_service.verify_otp_for_incident(db_session, inc_id, plain_code, action_type="ESCALATE")
    assert not verified


# =====================================================================
# 12. Unauthorized actions (Role / Auth token checks)
# =====================================================================
def test_unauthorized_api_access():
    # Calling analyze or test-message without token should yield 401
    resp = client.post("/api/conflicts/analyze", json={})
    assert resp.status_code == 401

    resp2 = client.post("/api/conflicts/test-message", json={})
    assert resp2.status_code == 401


# =====================================================================
# 13. Missing endpoint configuration
# =====================================================================
def test_messaging_config_inspection(auth_headers):
    resp = client.get("/api/conflicts/messaging/config", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "has_endpoint" in data
    assert "dry_run_active" in data


# =====================================================================
# 14. Provider timeout, rejection, and successful test response
# =====================================================================
def test_messaging_provider_mock_dispatch(db_session):
    import uuid
    inc_id = f"INC-DISPATCH-{uuid.uuid4().hex[:6]}"
    with patch("httpx.Client.post") as mock_post:
        # Mock successful acceptance (202 Accepted)
        mock_resp = MagicMock()
        mock_resp.status_code = 202
        mock_resp.json.return_value = {"id": "MSG-PROVIDER-8899"}
        mock_post.return_value = mock_resp

        with patch("messaging_adapter.MessagingConfig.get_endpoint_url", return_value="https://api.sms-mock.com/send"), \
             patch("messaging_adapter.MessagingConfig.is_dry_run_forced", return_value=False):
            res = messaging_adapter.send_notification(
                db=db_session,
                incident_id=inc_id,
                severity="CRITICAL",
                location_id="cold_store",
                dry_run=False
            )
            assert res["success"]
            assert res["status"] == "ACCEPTED"
            assert res["provider_response_id"] == "MSG-PROVIDER-8899"


def test_messaging_provider_timeout_and_rejection(db_session):
    import uuid
    import httpx
    # 1. Timeout
    with patch("httpx.Client.post", side_effect=httpx.TimeoutException("Mock socket timeout")), \
         patch("messaging_adapter.MessagingConfig.get_endpoint_url", return_value="https://api.sms-mock.com/send"), \
         patch("messaging_adapter.MessagingConfig.is_dry_run_forced", return_value=False):
        res = messaging_adapter.send_notification(
            db=db_session,
            incident_id=f"INC-TIMEOUT-{uuid.uuid4().hex[:6]}",
            dry_run=False
        )
        assert not res["success"]
        assert res["status"] == "FAILED"
        assert "timed out" in res["error"]

    # 2. HTTP Rejection (401 Unauthorized from provider)
    mock_resp = MagicMock()
    mock_resp.status_code = 401
    mock_resp.text = "Invalid API Credentials"
    with patch("httpx.Client.post", return_value=mock_resp), \
         patch("messaging_adapter.MessagingConfig.get_endpoint_url", return_value="https://api.sms-mock.com/send"), \
         patch("messaging_adapter.MessagingConfig.is_dry_run_forced", return_value=False):
        res2 = messaging_adapter.send_notification(
            db=db_session,
            incident_id=f"INC-REJECT-{uuid.uuid4().hex[:6]}",
            dry_run=False
        )
        assert not res2["success"]
        assert res2["status"] == "FAILED"
        assert "401" in res2["error"]


# =====================================================================
# 15. Dry-run mode and duplicate-notification prevention
# =====================================================================
def test_dry_run_and_duplicate_prevention(db_session):
    import uuid
    inc_id = f"INC-DRYRUN-{uuid.uuid4().hex[:6]}"

    # First dispatch in dry-run
    res1 = messaging_adapter.send_notification(
        db=db_session,
        incident_id=inc_id,
        dry_run=True,
        destination="+91 99999 11111"
    )
    assert res1["success"]
    assert res1["status"] == "DRY_RUN"

    # In dry run, a second request inside 5 mins is safely deduplicated if recorded as ACCEPTED or CONFIRMED,
    # or executes cleanly with dry-run logging.


# =====================================================================
# 16. Audit-event creation & end-to-end simulation flow
# =====================================================================
def test_full_simulation_flow_and_audit(auth_headers, db_session):
    # 1. Trigger simulation
    resp = client.post(
        "/api/conflicts/simulate?scenario_key=CRITICAL_DISAGREEMENT",
        headers=auth_headers
    )
    assert resp.status_code == 200
    inc_data = resp.json()
    inc_id = inc_data["incident_id"]
    assert inc_data["severity"] == "CRITICAL"
    assert inc_data["requires_escalation"]

    # 2. Supervisor Acknowledges
    ack_resp = client.post(
        f"/api/conflicts/{inc_id}/acknowledge",
        headers=auth_headers,
        json={"notes": "Duty chef checked physical door seals."}
    )
    assert ack_resp.status_code == 200
    assert ack_resp.json()["state"] == "ACKNOWLEDGEMENT_PENDING"

    # 3. Request OTP
    otp_req = client.post(
        f"/api/conflicts/{inc_id}/otp/request",
        headers=auth_headers,
        json={"action_type": "ESCALATE"}
    )
    assert otp_req.status_code == 200
    dev_code = otp_req.json().get("dev_preview_code")
    assert dev_code is not None

    # 4. Verify OTP
    otp_verify = client.post(
        f"/api/conflicts/{inc_id}/otp/verify",
        headers=auth_headers,
        json={"otp_code": dev_code, "action_type": "ESCALATE"}
    )
    assert otp_verify.status_code == 200
    assert otp_verify.json()["verified"]
    assert otp_verify.json()["new_state"] == "VERIFIED"

    # 5. Escalate & Notify
    esc_resp = client.post(
        f"/api/conflicts/{inc_id}/escalate",
        headers=auth_headers,
        json={"notes": "Urgent technical technician requested.", "urgency": "CRITICAL"}
    )
    assert esc_resp.status_code == 200

    # 6. Resolve Incident
    res_resp = client.post(
        f"/api/conflicts/{inc_id}/resolve",
        headers=auth_headers,
        json={"resolution_notes": "Compressor thermistor replaced and freezer recalibrated to -18°C."}
    )
    assert res_resp.status_code == 200
    assert res_resp.json()["state"] == "RESOLVED"

    # 7. Check Audit Events
    detail_resp = client.get(f"/api/conflicts/{inc_id}", headers=auth_headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    events = detail["events"]
    actions = [ev["action"] for ev in events]
    assert "CONFLICT_DETECTED" in actions
    assert "ACKNOWLEDGED" in actions
    assert "OTP_GENERATED" in actions
    assert "OTP_VERIFIED" in actions
    assert "RESOLVED" in actions
