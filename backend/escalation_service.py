"""
FoodShield - Escalation Workflow State Machine & Incident Service (Challenge 3)
Manages incident lifecycle, validates allowable state transitions, records audit events,
and coordinates OTP and notification flows.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from conflict_models import (
    ConflictIncident, IncidentEscalationEvent, ConflictState, ConflictSeverity, ConflictType
)
from conflict_detector import ConflictEvaluationResult
from temperature_adapter import SensorReading, SystemAssessment


VALID_TRANSITIONS: Dict[str, List[str]] = {
    ConflictState.DETECTED.value: [
        ConflictState.ACKNOWLEDGEMENT_PENDING.value,
        ConflictState.OTP_PENDING.value,
        ConflictState.RESOLVED.value
    ],
    ConflictState.ACKNOWLEDGEMENT_PENDING.value: [
        ConflictState.OTP_PENDING.value,
        ConflictState.NOTIFICATION_PENDING.value,
        ConflictState.RESOLVED.value
    ],
    ConflictState.OTP_PENDING.value: [
        ConflictState.VERIFIED.value,
        ConflictState.ACKNOWLEDGEMENT_PENDING.value,
        ConflictState.DETECTED.value
    ],
    ConflictState.VERIFIED.value: [
        ConflictState.NOTIFICATION_PENDING.value,
        ConflictState.NOTIFICATION_SENT.value,
        ConflictState.NOTIFICATION_FAILED.value,
        ConflictState.RESOLVED.value
    ],
    ConflictState.NOTIFICATION_PENDING.value: [
        ConflictState.NOTIFICATION_SENT.value,
        ConflictState.NOTIFICATION_FAILED.value
    ],
    ConflictState.NOTIFICATION_SENT.value: [
        ConflictState.NOTIFICATION_PENDING.value, # Optional follow-up
        ConflictState.RESOLVED.value
    ],
    ConflictState.NOTIFICATION_FAILED.value: [
        ConflictState.NOTIFICATION_PENDING.value, # Safe retry
        ConflictState.NOTIFICATION_SENT.value,
        ConflictState.RESOLVED.value
    ],
    ConflictState.RESOLVED.value: [
        ConflictState.DETECTED.value # Re-opened on new conflicting telemetry
    ]
}


class EscalationService:
    @staticmethod
    def create_or_update_incident(
        db: Session,
        evaluation: ConflictEvaluationResult,
        sensor: Optional[SensorReading],
        system: Optional[SystemAssessment],
        restaurant_id: int = 1,
        actor_email: str = "system",
        actor_role: str = "system"
    ) -> Tuple[ConflictIncident, bool]:
        """
        Deduplication rule: If an active (unresolved) incident already exists
        for the same (restaurant_id, location_id, primary_conflict), update it.
        Otherwise create a new incident.
        Returns (incident, is_new).
        """
        now = datetime.utcnow()

        # Check for open incident with same deduplication key
        existing = (
            db.query(ConflictIncident)
            .filter(
                ConflictIncident.deduplication_key == evaluation.deduplication_key,
                ConflictIncident.state != ConflictState.RESOLVED.value
            )
            .first()
        )

        if existing:
            # Update existing incident telemetry
            existing.severity = evaluation.severity
            existing.reason = evaluation.reason
            existing.requires_escalation = evaluation.requires_escalation
            if sensor:
                existing.sensor_reading_id = sensor.reading_id
                existing.sensor_temp_c = evaluation.normalized_sensor_temp_c
                existing.sensor_raw_temp = sensor.temperature
                existing.sensor_unit = sensor.unit
                existing.sensor_status = sensor.classification
                existing.sensor_timestamp = sensor.timestamp.replace(tzinfo=None) if sensor.timestamp else None
                existing.sensor_source = sensor.source
                existing.is_simulated = sensor.is_simulated
            if system:
                existing.system_assessment_id = system.assessment_id
                existing.system_temp_c = evaluation.normalized_system_temp_c
                existing.system_status = system.assessed_status
                existing.system_timestamp = system.timestamp.replace(tzinfo=None) if system.timestamp else None
                existing.system_model = system.model_version
                existing.system_confidence = system.confidence
            existing.temp_difference_c = evaluation.temp_difference_c
            existing.updated_at = now

            # Append audit event for update
            event = IncidentEscalationEvent(
                incident_id=existing.incident_id,
                from_state=existing.state,
                to_state=existing.state,
                action="TELEMETRY_UPDATED",
                actor_email=actor_email,
                actor_role=actor_role,
                details=f"Subsequent readings updated incident. Severity: {existing.severity}. Variance: {existing.temp_difference_c}°C.",
                timestamp=now
            )
            db.add(event)
            db.commit()
            db.refresh(existing)
            return existing, False

        # Generate unique incident ID
        uid_snippet = uuid.uuid4().hex[:6].upper()
        date_str = now.strftime("%Y%m%d")
        incident_id = f"INC-{date_str}-{uid_snippet}"

        incident = ConflictIncident(
            incident_id=incident_id,
            restaurant_id=restaurant_id,
            location_id=evaluation.location_id,
            conflict_type=evaluation.primary_conflict,
            severity=evaluation.severity,
            state=ConflictState.DETECTED.value,
            requires_escalation=evaluation.requires_escalation,
            reason=evaluation.reason,
            deduplication_key=evaluation.deduplication_key,
            authorized_role="restaurant" if actor_role != "officer" else "officer",
            temp_difference_c=evaluation.temp_difference_c,
            is_simulated=sensor.is_simulated if sensor else False,
            created_at=now,
            updated_at=now
        )

        if sensor:
            incident.sensor_reading_id = sensor.reading_id
            incident.sensor_temp_c = evaluation.normalized_sensor_temp_c
            incident.sensor_raw_temp = sensor.temperature
            incident.sensor_unit = sensor.unit
            incident.sensor_status = sensor.classification
            incident.sensor_timestamp = sensor.timestamp.replace(tzinfo=None) if sensor.timestamp else None
            incident.sensor_source = sensor.source

        if system:
            incident.system_assessment_id = system.assessment_id
            incident.system_temp_c = evaluation.normalized_system_temp_c
            incident.system_status = system.assessed_status
            incident.system_timestamp = system.timestamp.replace(tzinfo=None) if system.timestamp else None
            incident.system_model = system.model_version
            incident.system_confidence = system.confidence

        db.add(incident)
        db.commit()
        db.refresh(incident)

        # Initial detection event
        event = IncidentEscalationEvent(
            incident_id=incident.incident_id,
            from_state="NONE",
            to_state=ConflictState.DETECTED.value,
            action="CONFLICT_DETECTED",
            actor_email=actor_email,
            actor_role=actor_role,
            details=f"Detected {incident.conflict_type} ({incident.severity}): {incident.reason}",
            timestamp=now
        )
        db.add(event)
        db.commit()

        return incident, True

    @staticmethod
    def transition_state(
        db: Session,
        incident: ConflictIncident,
        new_state: str,
        action: str,
        actor_email: str,
        actor_role: str,
        details: Optional[str] = None
    ) -> ConflictIncident:
        """
        Validates and executes a state transition.
        Records an immutable EscalationEvent.
        """
        current_state = incident.state
        allowed = VALID_TRANSITIONS.get(current_state, [])

        if new_state not in allowed:
            raise ValueError(
                f"Illegal state transition from '{current_state}' to '{new_state}'. Allowed transitions: {allowed}."
            )

        now = datetime.utcnow()
        incident.state = new_state
        incident.updated_at = now

        if new_state == ConflictState.RESOLVED.value:
            incident.resolved_at = now
            incident.resolved_by = actor_email
            if details:
                incident.resolution_notes = details

        event = IncidentEscalationEvent(
            incident_id=incident.incident_id,
            from_state=current_state,
            to_state=new_state,
            action=action,
            actor_email=actor_email,
            actor_role=actor_role,
            details=details,
            timestamp=now
        )
        db.add(event)
        db.commit()
        db.refresh(incident)

        return incident


escalation_service = EscalationService()
