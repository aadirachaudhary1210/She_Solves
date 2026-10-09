"""
FoodShield - Pydantic Request & Response Schemas for Conflict System (Challenge 3)
Strict validation and typed serialization for conflict detection, OTP, and messaging.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ConflictAnalyzeRequest(BaseModel):
    """Input payload to analyze a location or custom paired readings."""
    location_id: Optional[str] = "walkin_freezer_01"
    scenario_key: Optional[str] = None # e.g. CRITICAL_DISAGREEMENT, TEMPERATURE_MISMATCH, etc.
    custom_sensor: Optional[Dict[str, Any]] = None
    custom_system: Optional[Dict[str, Any]] = None
    tolerance_c: Optional[float] = 2.5
    sensor_freshness_seconds: Optional[int] = 900
    system_freshness_seconds: Optional[int] = 1800


class ConflictIncidentSummary(BaseModel):
    """Concise representation of a conflict incident."""
    incident_id: str
    conflict_type: str
    severity: str
    sensor_status: Optional[str] = None
    system_status: Optional[str] = None
    location_id: str
    state: str
    reason: str
    requires_escalation: bool
    sensor_temp_c: Optional[float] = None
    system_temp_c: Optional[float] = None
    temp_difference_c: Optional[float] = None
    is_simulated: bool = False
    created_at: datetime
    updated_at: datetime
    authorized_role: str = "restaurant"


class EscalationEventResponse(BaseModel):
    id: int
    incident_id: str
    from_state: str
    to_state: str
    action: str
    actor_email: str
    actor_role: str
    details: Optional[str] = None
    timestamp: datetime


class NotificationLogResponse(BaseModel):
    id: int
    incident_id: str
    provider: str
    destination: str
    payload_summary: str
    status: str
    provider_response_id: Optional[str] = None
    error_message: Optional[str] = None
    sent_at: datetime


class IncidentDetailResponse(BaseModel):
    incident: ConflictIncidentSummary
    sensor_snapshot: Dict[str, Any]
    system_snapshot: Dict[str, Any]
    events: List[EscalationEventResponse]
    notifications: List[NotificationLogResponse]
    otp_active: bool
    otp_expires_in_seconds: Optional[int] = None
    otp_attempts_remaining: Optional[int] = None


class AcknowledgeRequest(BaseModel):
    notes: Optional[str] = "Incident acknowledged by on-duty supervisor."


class OTPRequestPayload(BaseModel):
    action_type: str = "ESCALATE"
    destination: Optional[str] = None


class OTPRequestResponse(BaseModel):
    incident_id: str
    action_type: str
    expires_in_seconds: int
    masked_destination: str
    message: str
    is_dev_mode: bool = False
    dev_preview_code: Optional[str] = None # Populated ONLY in development mode with clear label


class OTPVerifyPayload(BaseModel):
    otp_code: str
    action_type: str = "ESCALATE"


class OTPVerifyResponse(BaseModel):
    verified: bool
    incident_id: str
    message: str
    new_state: str


class EscalateRequest(BaseModel):
    notes: Optional[str] = "Authorized emergency food-safety escalation initiated."
    urgency: str = "HIGH" # HIGH, CRITICAL


class TestMessageRequest(BaseModel):
    incident_id: Optional[str] = None
    destination: Optional[str] = None
    custom_message: Optional[str] = None
    dry_run: Optional[bool] = None


class TestMessageResponse(BaseModel):
    success: bool
    status: str # ACCEPTED, CONFIRMED, DRY_RUN, FAILED
    provider: str
    destination: str
    payload_preview: str
    provider_response_id: Optional[str] = None
    error: Optional[str] = None
    timestamp: datetime


class ResolveIncidentRequest(BaseModel):
    resolution_notes: str = Field(..., min_length=5, description="Physical verification or corrective action log")
