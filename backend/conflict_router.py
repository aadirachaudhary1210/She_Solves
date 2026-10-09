"""
FoodShield - Conflict Detection & Escalation REST Router (Challenge 3)
Provides complete API endpoints for:
- AI-Sensor Conflict Analysis & Scoring
- Incident Lifecycle State Machine Transitions
- Cryptographic OTP Request & Verification
- Real / Dry-Run Test Messaging & Audit Logging
"""

import os
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserRole, Restaurant, AuditLog
from auth import decode_access_token
from conflict_models import (
    ConflictIncident, IncidentEscalationEvent, IncidentOTP, IncidentNotification,
    ConflictState, ConflictSeverity, ConflictType
)
from conflict_schemas import (
    ConflictAnalyzeRequest, ConflictIncidentSummary, IncidentDetailResponse,
    EscalationEventResponse, NotificationLogResponse, AcknowledgeRequest,
    OTPRequestPayload, OTPRequestResponse, OTPVerifyPayload, OTPVerifyResponse,
    EscalateRequest, TestMessageRequest, TestMessageResponse, ResolveIncidentRequest
)
from temperature_adapter import (
    temperature_adapter, SensorReading, SystemAssessment, DemoTemperatureAdapter
)
from conflict_detector import evaluate_conflict, ConflictConfig
from escalation_service import escalation_service
from otp_service import otp_service, IS_DEV_MODE
from messaging_adapter import messaging_adapter


conflict_router = APIRouter()


# -------------------------------------------------------------
# AUTHENTICATION & ACCESS CONTROL HELPER
# -------------------------------------------------------------

def get_conflict_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    """Validates JWT bearer token or falls back to demo manager if in dev mode with mock token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required to access conflict escalation module."
        )
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        # Check if local frontend mock session token
        if IS_DEV_MODE and token.startswith("demo-"):
            user = db.query(User).filter(User.email == "restaurant@foodshield.com").first()
            if user:
                return user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid authentication token."
        )
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")
    return user


def log_conflict_audit(db: Session, user: Optional[User], action: str, incident_id: str, details: str, restaurant_id: int = 1):
    audit = AuditLog(
        user_id=user.id if user else None,
        user_email=user.email if user else "system",
        user_role=user.role.value if user else "system",
        restaurant_id=restaurant_id,
        action=action,
        entity_type="ConflictIncident",
        entity_id=None,
        details=f"Incident {incident_id}: {details}",
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()


# -------------------------------------------------------------
# 1. SCENARIOS & CONFLICT ANALYSIS
# -------------------------------------------------------------

@conflict_router.get("/simulation-scenarios")
def get_simulation_scenarios():
    """List available pre-configured test scenarios for demonstration."""
    scenarios = []
    for key, sc in DemoTemperatureAdapter.SCENARIOS.items():
        scenarios.append({
            "key": key,
            "title": sc["title"],
            "description": sc["description"],
            "location_id": sc["location_id"]
        })
    return {
        "scenarios": scenarios,
        "active_adapter": "DemoTemperatureAdapter (Challenge 1 & AI simulation feed)"
    }


@conflict_router.post("/analyze")
def analyze_conflict(
    req: ConflictAnalyzeRequest,
    current_user: User = Depends(get_conflict_user),
    db: Session = Depends(get_db)
):
    """
    Evaluates temperature sensor reading against system assessment.
    Detects conflicts, applies deduplication, and records incident state.
    """
    cfg = ConflictConfig(
        tolerance_c=req.tolerance_c or 2.5,
        sensor_freshness_seconds=req.sensor_freshness_seconds or 900,
        system_freshness_seconds=req.system_freshness_seconds or 1800
    )

    sensor: Optional[SensorReading] = None
    system: Optional[SystemAssessment] = None

    if req.custom_sensor:
        sensor = SensorReading(**req.custom_sensor)
    elif req.scenario_key:
        sc_data = DemoTemperatureAdapter().get_scenario_data(req.scenario_key)
        sensor = sc_data["sensor"]
        system = sc_data["system"]
    else:
        sensor = temperature_adapter.get_latest_sensor_reading(req.location_id or "walkin_freezer_01")

    if req.custom_system:
        system = SystemAssessment(**req.custom_system)
    elif system is None:
        system = temperature_adapter.get_latest_system_assessment(req.location_id or "walkin_freezer_01")

    eval_result = evaluate_conflict(sensor, system, config=cfg)

    # If conflict detected, create or update an incident in the database
    incident_record = None
    is_new = False
    if eval_result.has_conflict:
        incident_record, is_new = escalation_service.create_or_update_incident(
            db=db,
            evaluation=eval_result,
            sensor=sensor,
            system=system,
            restaurant_id=1,
            actor_email=current_user.email,
            actor_role=current_user.role.value
        )
        log_conflict_audit(
            db, current_user,
            "CONFLICT_ANALYSIS_DISCREPANCY",
            incident_record.incident_id,
            f"Detected {eval_result.primary_conflict} ({eval_result.severity}). Escalation required: {eval_result.requires_escalation}"
        )

    return {
        "incident_id": incident_record.incident_id if incident_record else None,
        "conflict_type": eval_result.primary_conflict,
        "severity": eval_result.severity,
        "sensor_status": eval_result.sensor_status,
        "system_status": eval_result.system_status,
        "location_id": eval_result.location_id,
        "state": incident_record.state if incident_record else "NORMAL",
        "reason": eval_result.reason,
        "requires_escalation": eval_result.requires_escalation,
        "has_conflict": eval_result.has_conflict,
        "is_new_incident": is_new,
        "temp_difference_c": eval_result.temp_difference_c,
        "sensor_temp_c": eval_result.normalized_sensor_temp_c,
        "system_temp_c": eval_result.normalized_system_temp_c,
        "conflict_types": eval_result.conflict_types
    }


@conflict_router.post("/simulate")
def simulate_scenario(
    scenario_key: str = Query(..., description="Scenario key from /simulation-scenarios"),
    current_user: User = Depends(get_conflict_user),
    db: Session = Depends(get_db)
):
    """One-click trigger for realistic simulated conflict scenarios."""
    sc_data = DemoTemperatureAdapter().get_scenario_data(scenario_key)
    sensor = sc_data["sensor"]
    system = sc_data["system"]

    eval_result = evaluate_conflict(sensor, system)
    incident_record, is_new = escalation_service.create_or_update_incident(
        db=db,
        evaluation=eval_result,
        sensor=sensor,
        system=system,
        restaurant_id=1,
        actor_email=current_user.email,
        actor_role=current_user.role.value
    )

    log_conflict_audit(
        db, current_user,
        "SIMULATION_TRIGGERED",
        incident_record.incident_id,
        f"Simulated scenario '{scenario_key}': {eval_result.reason}"
    )

    return {
        "scenario": sc_data["title"],
        "incident_id": incident_record.incident_id,
        "conflict_type": incident_record.conflict_type,
        "severity": incident_record.severity,
        "location_id": incident_record.location_id,
        "state": incident_record.state,
        "reason": incident_record.reason,
        "requires_escalation": incident_record.requires_escalation,
        "sensor_temp_c": incident_record.sensor_temp_c,
        "system_temp_c": incident_record.system_temp_c,
        "temp_difference_c": incident_record.temp_difference_c,
        "sensor_status": incident_record.sensor_status,
        "system_status": incident_record.system_status,
        "is_simulated": True
    }


# -------------------------------------------------------------
# 2. INCIDENTS DIRECTORY & DETAILS
# -------------------------------------------------------------

@conflict_router.get("")
def list_conflicts(
    state_filter: Optional[str] = Query(None),
    severity_filter: Optional[str] = Query(None),
    location_id: Optional[str] = Query(None),
    limit: int = 50,
    current_user: User = Depends(get_conflict_user),
    db: Session = Depends(get_db)
):
    """Retrieve list of conflict incidents with filtering."""
    q = db.query(ConflictIncident)
    if state_filter and state_filter != "all":
        q = q.filter(ConflictIncident.state == state_filter)
    if severity_filter and severity_filter != "all":
        q = q.filter(ConflictIncident.severity == severity_filter)
    if location_id:
        q = q.filter(ConflictIncident.location_id == location_id)

    incidents = q.order_by(ConflictIncident.updated_at.desc()).limit(limit).all()

    results = []
    for inc in incidents:
        results.append({
            "incident_id": inc.incident_id,
            "conflict_type": inc.conflict_type,
            "severity": inc.severity,
            "sensor_status": inc.sensor_status,
            "system_status": inc.system_status,
            "location_id": inc.location_id,
            "state": inc.state,
            "reason": inc.reason,
            "requires_escalation": inc.requires_escalation,
            "sensor_temp_c": inc.sensor_temp_c,
            "system_temp_c": inc.system_temp_c,
            "temp_difference_c": inc.temp_difference_c,
            "is_simulated": inc.is_simulated,
            "created_at": inc.created_at.isoformat(),
            "updated_at": inc.updated_at.isoformat(),
            "authorized_role": inc.authorized_role
        })

    return results


@conflict_router.get("/{incident_id}")
def get_conflict_detail(
    incident_id: str,
    current_user: User = Depends(get_conflict_user),
    db: Session = Depends(get_db)
):
    """Full detail view of an incident, including timeline events and notifications."""
    inc = db.query(ConflictIncident).filter(ConflictIncident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Conflict incident not found.")

    events = (
        db.query(IncidentEscalationEvent)
        .filter(IncidentEscalationEvent.incident_id == incident_id)
        .order_by(IncidentEscalationEvent.timestamp.asc())
        .all()
    )

    notifications = (
        db.query(IncidentNotification)
        .filter(IncidentNotification.incident_id == incident_id)
        .order_by(IncidentNotification.sent_at.desc())
        .all()
    )

    otp_status = otp_service.get_active_otp_status(db, incident_id)

    return {
        "incident": {
            "incident_id": inc.incident_id,
            "conflict_type": inc.conflict_type,
            "severity": inc.severity,
            "sensor_status": inc.sensor_status,
            "system_status": inc.system_status,
            "location_id": inc.location_id,
            "state": inc.state,
            "reason": inc.reason,
            "requires_escalation": inc.requires_escalation,
            "sensor_temp_c": inc.sensor_temp_c,
            "system_temp_c": inc.system_temp_c,
            "temp_difference_c": inc.temp_difference_c,
            "is_simulated": inc.is_simulated,
            "created_at": inc.created_at.isoformat(),
            "updated_at": inc.updated_at.isoformat(),
            "authorized_role": inc.authorized_role,
            "acknowledged_by": inc.acknowledged_by,
            "acknowledged_at": inc.acknowledged_at.isoformat() if inc.acknowledged_at else None,
            "verified_by": inc.verified_by,
            "verified_at": inc.verified_at.isoformat() if inc.verified_at else None,
            "resolved_by": inc.resolved_by,
            "resolved_at": inc.resolved_at.isoformat() if inc.resolved_at else None,
            "resolution_notes": inc.resolution_notes
        },
        "sensor_snapshot": {
            "reading_id": inc.sensor_reading_id,
            "temp_c": inc.sensor_temp_c,
            "raw_temp": inc.sensor_raw_temp,
            "unit": inc.sensor_unit,
            "status": inc.sensor_status,
            "source": inc.sensor_source,
            "timestamp": inc.sensor_timestamp.isoformat() if inc.sensor_timestamp else None
        },
        "system_snapshot": {
            "assessment_id": inc.system_assessment_id,
            "temp_c": inc.system_temp_c,
            "status": inc.system_status,
            "model": inc.system_model,
            "confidence": inc.system_confidence,
            "timestamp": inc.system_timestamp.isoformat() if inc.system_timestamp else None
        },
        "events": [
            {
                "id": ev.id,
                "incident_id": ev.incident_id,
                "from_state": ev.from_state,
                "to_state": ev.to_state,
                "action": ev.action,
                "actor_email": ev.actor_email,
                "actor_role": ev.actor_role,
                "details": ev.details,
                "timestamp": ev.timestamp.isoformat()
            } for ev in events
        ],
        "notifications": [
            {
                "id": notif.id,
                "incident_id": notif.incident_id,
                "provider": notif.provider,
                "destination": notif.destination,
                "payload_summary": notif.payload_summary,
                "status": notif.status,
                "provider_response_id": notif.provider_response_id,
                "error_message": notif.error_message,
                "sent_at": notif.sent_at.isoformat()
            } for notif in notifications
        ],
        "otp": otp_status
    }


# -------------------------------------------------------------
# 3. ACKNOWLEDGEMENT & ESCALATION WORKFLOW
# -------------------------------------------------------------

@conflict_router.post("/{incident_id}/acknowledge")
def acknowledge_conflict(
    incident_id: str,
    payload: AcknowledgeRequest,
    current_user: User = Depends(get_conflict_user),
    db: Session = Depends(get_db)
):
    """Supervisor acknowledges detection of conflict."""
    inc = db.query(ConflictIncident).filter(ConflictIncident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")

    try:
        updated = escalation_service.transition_state(
            db=db,
            incident=inc,
            new_state=ConflictState.ACKNOWLEDGEMENT_PENDING.value,
            action="ACKNOWLEDGED",
            actor_email=current_user.email,
            actor_role=current_user.role.value,
            details=payload.notes
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    inc.acknowledged_by = current_user.email
    inc.acknowledged_at = datetime.utcnow()
    db.commit()

    log_conflict_audit(db, current_user, "INCIDENT_ACKNOWLEDGED", incident_id, payload.notes or "Acknowledged")
    return {"message": "Incident acknowledged successfully.", "state": updated.state}


@conflict_router.post("/{incident_id}/otp/request", response_model=OTPRequestResponse)
def request_escalation_otp(
    incident_id: str,
    payload: OTPRequestPayload,
    current_user: User = Depends(get_conflict_user),
    db: Session = Depends(get_db)
):
    """
    Generates a secure random 6-digit OTP tied to the incident and user.
    Enforces rate-limits and stores only salted cryptographic hash.
    """
    inc = db.query(ConflictIncident).filter(ConflictIncident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")

    dest = payload.destination or current_user.phone or "Official Security Contact"

    try:
        otp_rec, plain_code = otp_service.generate_otp_for_incident(
            db=db,
            incident_id=incident_id,
            user_email=current_user.email,
            action_type=payload.action_type,
            destination=dest
        )
    except ValueError as e:
        raise HTTPException(status_code=429, detail=str(e))

    # Move incident state to OTP_PENDING if not already
    if inc.state in (ConflictState.DETECTED.value, ConflictState.ACKNOWLEDGEMENT_PENDING.value):
        escalation_service.transition_state(
            db=db,
            incident=inc,
            new_state=ConflictState.OTP_PENDING.value,
            action="OTP_GENERATED",
            actor_email=current_user.email,
            actor_role=current_user.role.value,
            details=f"Secure OTP generated for {payload.action_type}. Awaiting verification."
        )

    log_conflict_audit(
        db, current_user,
        "OTP_REQUESTED",
        incident_id,
        f"OTP issued for action {payload.action_type} (hash stored, plaintext discarded)"
    )

    # In development mode, provide a labeled dev preview to allow testing without SMS gateway
    masked_dest = dest[:4] + "****" + dest[-2:] if len(dest) > 6 else "****"
    dev_preview = plain_code if IS_DEV_MODE else None

    return {
        "incident_id": incident_id,
        "action_type": payload.action_type,
        "expires_in_seconds": 300,
        "masked_destination": masked_dest,
        "message": "OTP generated and dispatched to authorized contact. Code valid for 5 minutes.",
        "is_dev_mode": IS_DEV_MODE,
        "dev_preview_code": dev_preview
    }


@conflict_router.post("/{incident_id}/otp/verify", response_model=OTPVerifyResponse)
def verify_escalation_otp(
    incident_id: str,
    payload: OTPVerifyPayload,
    current_user: User = Depends(get_conflict_user),
    db: Session = Depends(get_db)
):
    """
    Verifies the user's OTP code server-side against salted hash.
    Upon success, marks token used and advances incident state to VERIFIED.
    """
    inc = db.query(ConflictIncident).filter(ConflictIncident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")

    verified, msg = otp_service.verify_otp_for_incident(
        db=db,
        incident_id=incident_id,
        plain_code=payload.otp_code,
        action_type=payload.action_type
    )

    if not verified:
        log_conflict_audit(db, current_user, "OTP_VERIFICATION_FAILED", incident_id, f"Attempt failed: {msg}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)

    # Success: transition incident state to VERIFIED
    try:
        updated = escalation_service.transition_state(
            db=db,
            incident=inc,
            new_state=ConflictState.VERIFIED.value,
            action="OTP_VERIFIED",
            actor_email=current_user.email,
            actor_role=current_user.role.value,
            details=f"Identity confirmed via cryptographic OTP for {payload.action_type}."
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    inc.verified_by = current_user.email
    inc.verified_at = datetime.utcnow()
    db.commit()

    log_conflict_audit(db, current_user, "OTP_VERIFIED_SUCCESS", incident_id, "User successfully authorized escalation")

    return {
        "verified": True,
        "incident_id": incident_id,
        "message": "OTP verified successfully. Escalation action authorized.",
        "new_state": updated.state
    }


@conflict_router.post("/{incident_id}/escalate")
def escalate_conflict(
    incident_id: str,
    payload: EscalateRequest,
    current_user: User = Depends(get_conflict_user),
    db: Session = Depends(get_db)
):
    """
    Triggers emergency alert dispatch.
    Requires that the incident has been VERIFIED via OTP.
    """
    inc = db.query(ConflictIncident).filter(ConflictIncident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")

    if inc.state != ConflictState.VERIFIED.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot escalate incident in '{inc.state}' state. Protected escalation requires prior OTP verification."
        )

    # Transition to NOTIFICATION_PENDING
    escalation_service.transition_state(
        db=db,
        incident=inc,
        new_state=ConflictState.NOTIFICATION_PENDING.value,
        action="ESCALATION_QUEUED",
        actor_email=current_user.email,
        actor_role=current_user.role.value,
        details=f"Escalation queued (Urgency: {payload.urgency}): {payload.notes}"
    )

    # Dispatch notification via messaging adapter
    dispatch_res = messaging_adapter.send_notification(
        db=db,
        incident_id=incident_id,
        severity=inc.severity,
        location_id=inc.location_id
    )

    new_state = (
        ConflictState.NOTIFICATION_SENT.value
        if dispatch_res["success"]
        else ConflictState.NOTIFICATION_FAILED.value
    )

    escalation_service.transition_state(
        db=db,
        incident=inc,
        new_state=new_state,
        action="NOTIFICATION_DISPATCHED" if dispatch_res["success"] else "NOTIFICATION_FAILED",
        actor_email=current_user.email,
        actor_role=current_user.role.value,
        details=f"Provider {dispatch_res['provider']}: Status {dispatch_res['status']}. ID: {dispatch_res.get('provider_response_id')}"
    )

    log_conflict_audit(
        db, current_user,
        "ESCALATION_DISPATCHED",
        incident_id,
        f"Result: {dispatch_res['status']}. Destination: {dispatch_res['destination']}"
    )

    return {
        "incident_id": incident_id,
        "state": inc.state,
        "dispatch_result": dispatch_res
    }


# -------------------------------------------------------------
# 4. REAL TEST MESSAGING & DRY-RUN
# -------------------------------------------------------------

@conflict_router.get("/messaging/config")
def get_messaging_configuration(current_user: User = Depends(get_conflict_user)):
    """Inspect current external messaging endpoint and environment variables without exposing secrets."""
    return messaging_adapter.check_configuration()


@conflict_router.post("/test-message", response_model=TestMessageResponse)
def send_controlled_test_message(
    payload: TestMessageRequest,
    current_user: User = Depends(get_conflict_user),
    db: Session = Depends(get_db)
):
    """
    Sends a controlled test notification to configured communication endpoint or dry-run.
    Records delivery metadata, response IDs, and handles timeout/rejection safely.
    """
    inc_id = payload.incident_id or "TEST-INCIDENT-DEMO-01"
    
    result = messaging_adapter.send_notification(
        db=db,
        incident_id=inc_id,
        severity="TEST_ALERT",
        location_id="quality_assurance_lab",
        destination=payload.destination,
        custom_message=payload.custom_message,
        dry_run=payload.dry_run
    )

    log_conflict_audit(
        db, current_user,
        "TEST_MESSAGE_SENT",
        inc_id,
        f"Test dispatch to {result['destination']}. Status: {result['status']}"
    )

    return {
        "success": result["success"],
        "status": result["status"],
        "provider": result["provider"],
        "destination": result["destination"],
        "payload_preview": result["payload_preview"],
        "provider_response_id": result.get("provider_response_id"),
        "error": result.get("error"),
        "timestamp": datetime.fromisoformat(result["timestamp"])
    }


# -------------------------------------------------------------
# 5. RESOLUTION
# -------------------------------------------------------------

@conflict_router.post("/{incident_id}/resolve")
def resolve_incident(
    incident_id: str,
    payload: ResolveIncidentRequest,
    current_user: User = Depends(get_conflict_user),
    db: Session = Depends(get_db)
):
    """Closes an incident after physical on-site verification and corrective action."""
    inc = db.query(ConflictIncident).filter(ConflictIncident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail="Incident not found.")

    try:
        updated = escalation_service.transition_state(
            db=db,
            incident=inc,
            new_state=ConflictState.RESOLVED.value,
            action="RESOLVED",
            actor_email=current_user.email,
            actor_role=current_user.role.value,
            details=payload.resolution_notes
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    log_conflict_audit(db, current_user, "INCIDENT_RESOLVED", incident_id, payload.resolution_notes)

    return {
        "message": "Incident marked as RESOLVED.",
        "incident_id": incident_id,
        "state": updated.state,
        "resolved_at": updated.resolved_at.isoformat()
    }
