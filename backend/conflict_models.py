"""
FoodShield - Relational Database Models for Conflict Detection & Escalation (Challenge 3)
Tracks AI-Sensor conflicts, state transitions, cryptographic OTPs, and external notifications.
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from database import Base
import enum


class ConflictState(str, enum.Enum):
    DETECTED = "DETECTED"
    ACKNOWLEDGEMENT_PENDING = "ACKNOWLEDGEMENT_PENDING"
    OTP_PENDING = "OTP_PENDING"
    VERIFIED = "VERIFIED"
    NOTIFICATION_PENDING = "NOTIFICATION_PENDING"
    NOTIFICATION_SENT = "NOTIFICATION_SENT"
    NOTIFICATION_FAILED = "NOTIFICATION_FAILED"
    RESOLVED = "RESOLVED"


class ConflictSeverity(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class ConflictType(str, enum.Enum):
    TEMPERATURE_MISMATCH = "TEMPERATURE_MISMATCH"
    STATUS_MISMATCH = "STATUS_MISMATCH"
    CRITICAL_DISAGREEMENT = "CRITICAL_DISAGREEMENT"
    STALE_SENSOR_DATA = "STALE_SENSOR_DATA"
    STALE_SYSTEM_ASSESSMENT = "STALE_SYSTEM_ASSESSMENT"
    LOCATION_MISMATCH = "LOCATION_MISMATCH"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"
    AGREEMENT = "AGREEMENT"


class ConflictIncident(Base):
    __tablename__ = "conflict_incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(100), unique=True, index=True, nullable=False)
    restaurant_id = Column(Integer, nullable=True, default=1)
    location_id = Column(String(100), index=True, nullable=False)
    conflict_type = Column(String(100), nullable=False)
    severity = Column(String(50), nullable=False) # CRITICAL, HIGH, MEDIUM, LOW, INFO
    state = Column(String(50), default=ConflictState.DETECTED.value, nullable=False)
    
    # Sensor Reading Snapshot
    sensor_reading_id = Column(String(100), nullable=True)
    sensor_temp_c = Column(Float, nullable=True)
    sensor_raw_temp = Column(Float, nullable=True)
    sensor_unit = Column(String(10), default="C")
    sensor_status = Column(String(50), nullable=True)
    sensor_timestamp = Column(DateTime, nullable=True)
    sensor_source = Column(String(100), nullable=True)
    
    # System Assessment Snapshot
    system_assessment_id = Column(String(100), nullable=True)
    system_temp_c = Column(Float, nullable=True)
    system_status = Column(String(50), nullable=True)
    system_timestamp = Column(DateTime, nullable=True)
    system_model = Column(String(100), nullable=True)
    system_confidence = Column(Float, nullable=True)
    
    # Evaluation Notes
    temp_difference_c = Column(Float, nullable=True)
    requires_escalation = Column(Boolean, default=False)
    reason = Column(Text, nullable=False)
    is_simulated = Column(Boolean, default=False)
    
    # Deduplication Key: (restaurant_id, location_id, conflict_type)
    deduplication_key = Column(String(255), index=True, nullable=False)
    
    # Authorization & Escalation Tracking
    authorized_role = Column(String(50), default="restaurant")
    acknowledged_by = Column(String(255), nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    verified_by = Column(String(255), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(255), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    events = relationship("IncidentEscalationEvent", back_populates="incident", cascade="all, delete-orphan")
    otps = relationship("IncidentOTP", back_populates="incident", cascade="all, delete-orphan")
    notifications = relationship("IncidentNotification", back_populates="incident", cascade="all, delete-orphan")


class IncidentEscalationEvent(Base):
    __tablename__ = "incident_escalation_events"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(100), ForeignKey("conflict_incidents.incident_id"), nullable=False, index=True)
    from_state = Column(String(50), nullable=False)
    to_state = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)
    actor_email = Column(String(255), nullable=False)
    actor_role = Column(String(50), nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    incident = relationship("ConflictIncident", back_populates="events")


class IncidentOTP(Base):
    __tablename__ = "incident_otps"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(100), ForeignKey("conflict_incidents.incident_id"), nullable=False, index=True)
    otp_hash = Column(String(128), nullable=False)
    salt = Column(String(64), nullable=False)
    action_type = Column(String(100), default="ESCALATE")
    requested_by_email = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=True) # Masked target (e.g. +91 98***)
    expires_at = Column(DateTime, nullable=False)
    attempt_count = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)
    is_used = Column(Boolean, default=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("ConflictIncident", back_populates="otps")


class IncidentNotification(Base):
    __tablename__ = "incident_notifications"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(100), ForeignKey("conflict_incidents.incident_id"), nullable=False, index=True)
    provider = Column(String(100), nullable=False) # "webhook", "sms", "mock", "console"
    destination = Column(String(255), nullable=False)
    payload_summary = Column(Text, nullable=False)
    status = Column(String(50), default="ACCEPTED") # ACCEPTED, CONFIRMED, FAILED, DRY_RUN
    provider_response_id = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    sent_at = Column(DateTime, default=datetime.utcnow)

    incident = relationship("ConflictIncident", back_populates="notifications")
